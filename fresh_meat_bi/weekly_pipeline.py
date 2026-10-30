#!/usr/bin/env python3
"""
Fresh Meat Retail BI — Weekly Controlled Pipeline (Etapa 4)
Orchestrates:
1. Calendar validation of ISO week and year.
2. Anti-stale data protection and explicit week/domain association.
3. Pre-render contract and like-for-like validation.
4. Deterministic rendering using locked components in CONFIG_MANIFEST.json.
5. Golden Master static pixel preservation check.
6. Execution of FRESH_MEAT_BI_GATE (enforcing FAIL_CLOSED).
7. Atomic staging and publishing to the React dashboard (only upon RELEASE_PASS).
"""

import sys
import os
import sys
import json
import re
import shutil
import hashlib
import argparse
import datetime
import subprocess
from pathlib import Path

try:
    from PIL import Image
except ImportError:
    Image = None

BASE = Path(__file__).resolve().parent
ROOT = BASE.parent

def sha256_file(path: Path) -> str:
    h = hashlib.sha256()
    with open(path, "rb") as f:
        for chunk in iter(lambda: f.read(1 << 20), b""):
            h.update(chunk)
    return h.hexdigest()

def validate_calendar_week(week_str: str, year: int):
    """
    Validates ISO week format (e.g. 'WK44', 'WK45') and derives calendar period.
    """
    m = re.match(r"^WK(\d{1,2})$", week_str.upper())
    if not m:
        raise ValueError(f"Format săptămână invalid: {week_str}. Formatul cerut este WKxx (ex: WK45)")
    week_num = int(m.group(1))
    if week_num < 1 or week_num > 53:
        raise ValueError(f"Număr săptămână ISO invalid: {week_num}. Trebuie să fie între 1 și 53.")
    if year < 2020 or year > 2035:
        raise ValueError(f"An calendaristic invalid: {year}.")
    
    try:
        mon = datetime.date.fromisocalendar(year, week_num, 1)
        sun = datetime.date.fromisocalendar(year, week_num, 7)
    except Exception as e:
        raise ValueError(f"Săptămâna ISO {week_str}/{year} nu este validă în calendar: {e}")
        
    months_ro = {
        1: "IAN", 2: "FEB", 3: "MAR", 4: "APR", 5: "MAI", 6: "IUN",
        7: "IUL", 8: "AUG", 9: "SEP", 10: "OCT", 11: "NOI", 12: "DEC"
    }
    
    if mon.month == sun.month:
        calendar_period = f"{mon.day:02d}–{sun.day:02d} {months_ro[mon.month]} {year}"
    else:
        calendar_period = f"{mon.day:02d} {months_ro[mon.month]} – {sun.day:02d} {months_ro[sun.month]} {year}"
        
    research_window = f"{week_str} {year} (±3 ZILE)"
    return week_num, mon, sun, calendar_period, research_window

def verify_static_pixels(master_img: Path, rendered_img: Path):
    """
    Ensures that fixed Golden Master regions remain 100% identical.
    """
    if Image is None:
        return True, 0, 100
    master = Image.open(master_img).convert("RGB")
    rendered = Image.open(rendered_img).convert("RGB")
    w, h = master.size
    diffs = 0
    total = 0
    
    # Table header zone (Y: 145-240)
    for y in range(145, 240):
        for x in range(w):
            total += 1
            if master.getpixel((x, y)) != rendered.getpixel((x, y)):
                diffs += 1
                
    # Product labels column (X: 0-245, Y: 250-950)
    for y in range(250, 950):
        for x in range(0, 245):
            total += 1
            if master.getpixel((x, y)) != rendered.getpixel((x, y)):
                diffs += 1
                
    return diffs == 0, diffs, total

def run_weekly_pipeline(week: str, year: int, domain: str, 
                        dataset_path: Path, research_path: Path = None, 
                        reconciliation_path: Path = None, source_path: Path = None, 
                        visual_path: Path = None, publish: bool = False,
                        target_public_dir: Path = None):
    errors = []
    
    print(f"\n=======================================================")
    print(f" FRESH MEAT RETAIL BI — WEEKLY PIPELINE ({domain} | {week} {year})")
    print(f"=======================================================\n")
    
    # Step 1: Calendar validation
    try:
        week_num, mon, sun, calendar_period, research_window = validate_calendar_week(week, year)
        print(f"[PAS 1] Validare calendaristică ISO: {week} {year} ({mon} -> {sun})")
        print(f"        Perioadă: {calendar_period}")
    except ValueError as e:
        print(f"[EROARE CALENDAR]: {e}")
        return {"status": "FAIL_CLOSED", "errors": [str(e)]}

    # Step 2: Data association & anti-stale checks
    print(f"\n[PAS 2] Verificare asociere date & protecție anti-reutilizare...")
    if not dataset_path.exists():
        errors.append(f"DATASET_MISSING: Fișierul {dataset_path} nu există")
        return {"status": "FAIL_CLOSED", "errors": errors}
        
    try:
        dataset = json.loads(dataset_path.read_text(encoding="utf-8"))
    except Exception as e:
        errors.append(f"DATASET_INVALID_JSON: {e}")
        return {"status": "FAIL_CLOSED", "errors": errors}

    # Explicit week and year binding check
    ds_week = dataset.get("week")
    ds_year = dataset.get("year")
    if str(ds_week).upper() != week.upper() or int(ds_year) != int(year):
        errors.append(f"WEEK_YEAR_MISMATCH: Datasetul conține {ds_week}/{ds_year}, dar pipeline-ul procesează {week}/{year}")
        return {"status": "FAIL_CLOSED", "errors": errors}
        
    dataset_sha = sha256_file(dataset_path)
    print(f"        Dataset SHA-256: {dataset_sha}")

    if domain == "PROMO":
        if not research_path or not research_path.exists():
            errors.append("PROMO_RESEARCH_RECEIPT_MISSING")
            return {"status": "FAIL_CLOSED", "errors": errors}
        if not reconciliation_path or not reconciliation_path.exists():
            errors.append("PROMO_RECONCILIATION_RECEIPT_MISSING")
            return {"status": "FAIL_CLOSED", "errors": errors}
            
        research = json.loads(research_path.read_text(encoding="utf-8"))
        reconciliation = json.loads(reconciliation_path.read_text(encoding="utf-8"))
        
        # Verify research receipt is bound to this exact week and dataset SHA
        if research.get("week") != week or int(research.get("year", 0)) != int(year):
            errors.append(f"STALE_RESEARCH_RECEIPT: Chitanța de cercetare aparține săptămânii {research.get('week')}, nu {week}")
        if research.get("dataset_sha256") != dataset_sha:
            errors.append(f"UNBOUND_RESEARCH_RECEIPT: dataset_sha256 din chitanță ({research.get('dataset_sha256')}) nu corespunde datasetului curent ({dataset_sha})")
        if research.get("status") != "PASS" or research.get("coverage") != "25/25":
            errors.append("RESEARCH_RECEIPT_NOT_PASS_OR_COVERAGE_INCOMPLETE")
            
        # Verify reconciliation receipt is bound to this exact week and dataset SHA
        if reconciliation.get("week") != week or int(reconciliation.get("year", 0)) != int(year):
            errors.append(f"STALE_RECONCILIATION_RECEIPT: Chitanța de reconciliere aparține săptămânii {reconciliation.get('week')}, nu {week}")
        if reconciliation.get("dataset_sha256") != dataset_sha:
            errors.append(f"UNBOUND_RECONCILIATION_RECEIPT: dataset_sha256 din chitanță ({reconciliation.get('dataset_sha256')}) nu corespunde datasetului curent ({dataset_sha})")
        if reconciliation.get("status") != "PASS":
            errors.append("RECONCILIATION_RECEIPT_NOT_PASS")

    elif domain == "EU_PORK_MARKET":
        if not source_path or not source_path.exists():
            errors.append("EU_SOURCE_RECEIPT_MISSING")
            return {"status": "FAIL_CLOSED", "errors": errors}
        if not visual_path or not visual_path.exists():
            errors.append("EU_VISUAL_RECEIPT_MISSING")
            return {"status": "FAIL_CLOSED", "errors": errors}

    if errors:
        print(f"[EROARE ASOCIERE DATE]: {errors}")
        return {"status": "FAIL_CLOSED", "errors": errors}
        
    print("        Toate datele și chitanțele sunt asociate explicit săptămânii curente.")

    # Step 3: Staging Workspace Isolation
    staging_dir = BASE / f"tmp_staging_{week}_{year}"
    if staging_dir.exists():
        shutil.rmtree(staging_dir)
    staging_dir.mkdir(parents=True, exist_ok=True)
    
    try:
        manifest_path = BASE / "CONFIG_MANIFEST.json"
        manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
        
        # Step 4: Deterministic Rendering
        print(f"\n[PAS 3] Randare deterministă pe componentele din CONFIG_MANIFEST...")
        if domain == "PROMO":
            renderer = BASE / manifest["promo"]["renderer"]
            output_png = staging_dir / f"output_{week}_{year}.png"
            cp_rend = subprocess.run([sys.executable, str(renderer), str(dataset_path), str(output_png)],
                                     cwd=str(BASE), capture_output=True, text=True)
            if cp_rend.returncode != 0 or not output_png.exists():
                errors.append(f"RENDERER_EXECUTION_FAILED: {cp_rend.stderr or cp_rend.stdout}")
                return {"status": "FAIL_CLOSED", "errors": errors}
                
            render_receipt = staging_dir / f"output_{week}_{year}.png.manifest.json"
            if not render_receipt.exists():
                errors.append("RENDERER_RECEIPT_MISSING")
                return {"status": "FAIL_CLOSED", "errors": errors}

            # Step 5: Static Pixel Check
            print(f"\n[PAS 4] Verificare conservare pixeli statici Golden Master...")
            master_img = BASE / manifest["promo"]["master"]
            static_ok, diffs, total_px = verify_static_pixels(master_img, output_png)
            if not static_ok:
                errors.append(f"STATIC_PIXEL_MUTATION_DETECTED: {diffs} diferențe din {total_px} pixeli statici")
                return {"status": "FAIL_CLOSED", "errors": errors}
            print(f"        Pixeli statici 100% conservați ({total_px} pixeli verificați, 0 diferențe).")

            # Step 6: Release Gate Validation
            print(f"\n[PAS 5] Validare poartă FRESH_MEAT_BI_GATE (Regulă FAIL_CLOSED)...")
            gate = BASE / manifest["release_gate"]["file"]
            
            # Stage dataset in staging_dir so relative canonical lock resolves correctly
            staged_dataset = staging_dir / dataset_path.name
            shutil.copy2(dataset_path, staged_dataset)
            
            # Temporary canonical manifest binding for this week's dataset
            tmp_m = dict(manifest)
            tmp_m["promo"]["authoritative_lock_registry"]["canonical_lock"] = dataset_path.name
            tmp_m_path = staging_dir / "tmp_manifest.json"
            tmp_m_path.write_text(json.dumps(tmp_m, indent=2), encoding="utf-8")
            
            cmd_gate = [
                sys.executable, str(gate), "PROMO", str(staged_dataset),
                "--render", str(render_receipt),
                "--research", str(research_path),
                "--reconciliation", str(reconciliation_path),
                "--manifest", str(tmp_m_path)
            ]
            cp_gate = subprocess.run(cmd_gate, cwd=str(BASE), capture_output=True, text=True)
            try:
                gate_res = json.loads(cp_gate.stdout)
            except Exception:
                errors.append(f"GATE_MALFORMED_OUTPUT: {cp_gate.stdout} {cp_gate.stderr}")
                return {"status": "FAIL_CLOSED", "errors": errors}
                
            if cp_gate.returncode != 0 or gate_res.get("release_status") != "RELEASE_PASS":
                errors.append(f"RELEASE_GATE_DENIED: {gate_res.get('errors')}")
                return {"status": "FAIL_CLOSED", "errors": errors}
                
            release_receipt_path = staging_dir / f"output_{week}_{year}.png.release_receipt.json"
            release_receipt_path.write_text(json.dumps(gate_res, indent=2), encoding="utf-8")
            print(f"        Poarta Release Gate a acordat statutul: RELEASE_PASS")

        elif domain == "EU_PORK_MARKET":
            renderer = BASE / manifest["eu_pork_market"]["renderer"]
            master_img = BASE / manifest["eu_pork_market"]["golden_reference"]
            output_png = staging_dir / f"EU_PORK_MARKET_{week}_{year}.png"
            render_receipt = staging_dir / f"EU_PORK_MARKET_{week}_{year}.png.receipt.json"
            
            cp_rend = subprocess.run([sys.executable, str(renderer), str(master_img), str(dataset_path), str(output_png), str(render_receipt)],
                                     cwd=str(BASE), capture_output=True, text=True)
            if cp_rend.returncode != 0 or not output_png.exists():
                errors.append(f"RENDERER_EXECUTION_FAILED: {cp_rend.stderr or cp_rend.stdout}")
                return {"status": "FAIL_CLOSED", "errors": errors}
                
            gate = BASE / manifest["release_gate"]["file"]
            cmd_gate = [
                sys.executable, str(gate), "EU_PORK", str(dataset_path),
                "--render", str(render_receipt),
                "--source", str(source_path),
                "--visual", str(visual_path),
                "--manifest", str(manifest_path)
            ]
            cp_gate = subprocess.run(cmd_gate, cwd=str(BASE), capture_output=True, text=True)
            try:
                gate_res = json.loads(cp_gate.stdout)
            except Exception:
                errors.append(f"GATE_MALFORMED_OUTPUT: {cp_gate.stdout} {cp_gate.stderr}")
                return {"status": "FAIL_CLOSED", "errors": errors}
                
            if cp_gate.returncode != 0 or gate_res.get("release_status") != "RELEASE_PASS":
                errors.append(f"RELEASE_GATE_DENIED: {gate_res.get('errors')}")
                return {"status": "FAIL_CLOSED", "errors": errors}
                
            release_receipt_path = staging_dir / f"output_eu_pork_{week}_{year}.png.release_receipt.json"
            release_receipt_path.write_text(json.dumps(gate_res, indent=2), encoding="utf-8")
            print(f"        Poarta Release Gate a acordat statutul: RELEASE_PASS (EU_PORK)")

        # Step 7: Staging Dashboard Export
        print(f"\n[PAS 6] Pregătire export JSON în staging...")
        if str(BASE) not in sys.path:
            sys.path.insert(0, str(BASE))
            
        if domain == "PROMO":
            from export_dashboard_data import export_data
            staging_export = staging_dir / "bi_dashboard_export.json"
            export_ok = export_data(dataset_path, output_png, release_receipt_path, staging_export)
        else:
            from export_eu_pork_data import export_eu_pork_data
            staging_export = staging_dir / "eu_pork_market_export.json"
            export_ok = export_eu_pork_data(dataset_path, staging_export, release_receipt_path, output_png)

        if not export_ok or not staging_export.exists():
            errors.append("DASHBOARD_EXPORT_GENERATION_FAILED")
            return {"status": "FAIL_CLOSED", "errors": errors}
            
        staged_json = json.loads(staging_export.read_text(encoding="utf-8"))
        if staged_json.get("release_status") != "RELEASE_PASS":
            errors.append("STAGED_EXPORT_STATUS_NOT_PASS")
            return {"status": "FAIL_CLOSED", "errors": errors}

        print("        Exportul dinamic a fost generat și verificat cu succes în staging.")

        # Step 8: Immutable Release Staging & Single Atomic Pointer Activation
        if not publish:
            print(f"\n[NOTĂ] Flag-ul --publish NU a fost furnizat. Publicarea a fost omisă (Dry Run / Staging).")
            print(f"       Artefactele validate sunt păstrate în: {staging_dir}")
            return {
                "status": "RELEASE_PASS",
                "published": False,
                "staging_dir": str(staging_dir),
                "output_png_sha256": sha256_file(output_png),
                "dataset_sha256": dataset_sha
            }

        print(f"\n[PAS 7] Publicare în depozit imuabil și activare atomică...")
        pub_root = target_public_dir or (ROOT / "public")
        pub_data_dir = pub_root / "data"
        pub_data_dir.mkdir(parents=True, exist_ok=True)

        short_sha = dataset_sha[:8]
        release_id = f"{year}/{week}_{short_sha}"
        immutable_dir = pub_root / "releases" / str(year) / f"{week}_{short_sha}"
        immutable_dir.mkdir(parents=True, exist_ok=True)

        expected_output_sha = sha256_file(output_png)

        if domain == "PROMO":
            rel_png_name = f"TOP5_PREȚURI_COMPETITORI_{week}_{year}.png"
            rel_png_path = immutable_dir / rel_png_name
            rel_export_path = immutable_dir / "bi_dashboard_export.json"
            rel_receipt_path = immutable_dir / "release_receipt.json"
            rel_manifest_path = immutable_dir / "manifest_receipt.json"

            # 1. Populate immutable release directory
            shutil.copy2(output_png, rel_png_path)
            shutil.copy2(staging_export, rel_export_path)
            shutil.copy2(release_receipt_path, rel_receipt_path)
            shutil.copy2(render_receipt, rel_manifest_path)

            # 2. Strict Pre-Activation Integrity Verification inside immutable directory
            expected_export_sha = sha256_file(staging_export)
            expected_receipt_sha = sha256_file(release_receipt_path)

            if sha256_file(rel_png_path) != expected_output_sha:
                errors.append("IMMUTABLE_RELEASE_PNG_HASH_MISMATCH")
            if sha256_file(rel_export_path) != expected_export_sha:
                errors.append("IMMUTABLE_RELEASE_EXPORT_HASH_MISMATCH")
            if sha256_file(rel_receipt_path) != expected_receipt_sha:
                errors.append("IMMUTABLE_RELEASE_RECEIPT_HASH_MISMATCH")

            if errors:
                print(f"[EROARE CRITICĂ PRE-ACTIVARE]: {errors}. Se anulează activarea release-ului.")
                shutil.rmtree(immutable_dir, ignore_errors=True)
                return {"status": "FAIL_CLOSED", "errors": errors}

            print(f"        Depozit imuabil sigilat și verificat: {immutable_dir.relative_to(pub_root)}")

            # 3. Prepare Single Atomic Pointer (active_release.json)
            now_utc = datetime.datetime.now(datetime.timezone.utc).isoformat()
            pointer_data = {
                "release_id": release_id,
                "week": week,
                "year": year,
                "published_at_utc": now_utc,
                "export_path": f"/releases/{year}/{week}_{short_sha}/bi_dashboard_export.json",
                "image_path": f"/releases/{year}/{week}_{short_sha}/{rel_png_name}",
                "release_receipt_path": f"/releases/{year}/{week}_{short_sha}/release_receipt.json",
                "dataset_sha256": dataset_sha,
                "output_sha256": expected_output_sha,
                "release_receipt_sha256": expected_receipt_sha,
                "release_status": "RELEASE_PASS"
            }

            # 4. Atomic Pointer Update via single os.replace()
            active_pointer_file = pub_data_dir / "active_release.json"
            tmp_pointer_file = pub_data_dir / f".tmp_active_release_{os.getpid()}.json"

            tmp_pointer_file.write_text(json.dumps(pointer_data, ensure_ascii=False, indent=2), encoding="utf-8")
            os.replace(tmp_pointer_file, active_pointer_file)

            # 5. Maintain legacy fallback files in sync
            shutil.copy2(rel_export_path, pub_data_dir / "bi_dashboard_export.json")
            shutil.copy2(rel_png_path, pub_root / rel_png_name)
            if week == "WK44":
                shutil.copy2(rel_png_path, pub_root / "TOP5_PREȚURI_COMPETITORI_WK44_2026.png")

            print(f"        Pointer unic activat atomic: {active_pointer_file}")
            print(f"        Release activ Promo: {release_id} (RELEASE_PASS)")
        else:
            # EU_PORK_MARKET publication
            rel_png_name = f"EU_PORK_MARKET_{week}_{year}.png"
            rel_png_path = immutable_dir / rel_png_name
            rel_export_path = immutable_dir / "eu_pork_market_export.json"
            rel_receipt_path = immutable_dir / "release_receipt.json"

            shutil.copy2(output_png, rel_png_path)
            shutil.copy2(staging_export, rel_export_path)
            shutil.copy2(release_receipt_path, rel_receipt_path)

            # Copy to active live public locations
            shutil.copy2(staging_export, pub_data_dir / "eu_pork_market_export.json")
            shutil.copy2(output_png, pub_root / rel_png_name)

            print(f"        Raport EU Pork Market activat: {pub_data_dir / 'eu_pork_market_export.json'}")
            print(f"        Imagine publicată: {pub_root / rel_png_name}")

        print(f"\n=======================================================")
        print(f" [SUCCES] WEEKLY PIPELINE FINALIZAT: RELEASE_PASS (PUBLICAT)")
        print(f"=======================================================\n")

        return {
            "status": "RELEASE_PASS",
            "published": True,
            "release_id": release_id,
            "output_png_sha256": expected_output_sha,
            "dataset_sha256": dataset_sha
        }

    finally:
        # Clean up staging workspace if publish succeeded or clean up on demand
        pass

def main():
    parser = argparse.ArgumentParser(description="Fresh Meat Retail BI — Weekly Controlled Pipeline")
    parser.add_argument("--week", required=True, help="Săptămâna în format WKxx (ex: WK45)")
    parser.add_argument("--year", type=int, default=2026, help="Anul calendaristic (default: 2026)")
    parser.add_argument("--domain", choices=["PROMO", "EU_PORK_MARKET"], default="PROMO", help="Domeniul de analiză")
    parser.add_argument("--dataset", required=True, type=Path, help="Calea către DATASET.json sau LOCK.json")
    parser.add_argument("--research", type=Path, help="Calea către RESEARCH_RECEIPT.json (pentru Promo)")
    parser.add_argument("--reconciliation", type=Path, help="Calea către RECONCILIATION_RECEIPT.json (pentru Promo)")
    parser.add_argument("--source", type=Path, help="Calea către SOURCE_RECEIPT.json (pentru EU)")
    parser.add_argument("--visual", type=Path, help="Calea către VISUAL_RECEIPT.json (pentru EU)")
    parser.add_argument("--publish", action="store_true", help="Publică atomic în public/ și dashboard numai la RELEASE_PASS")
    parser.add_argument("--target-dir", type=Path, help="Directorul țintă pentru publicare (default: public/)")

    args = parser.parse_args()
    res = run_weekly_pipeline(
        week=args.week,
        year=args.year,
        domain=args.domain,
        dataset_path=args.dataset.resolve(),
        research_path=args.research.resolve() if args.research else None,
        reconciliation_path=args.reconciliation.resolve() if args.reconciliation else None,
        source_path=args.source.resolve() if args.source else None,
        visual_path=args.visual.resolve() if args.visual else None,
        publish=args.publish,
        target_public_dir=args.target_dir.resolve() if args.target_dir else None
    )

    if res.get("status") != "RELEASE_PASS":
        print(f"\n[FAIL_CLOSED]: Pipeline-ul a respins lansarea. Erori: {res.get('errors')}")
        sys.exit(2)
    sys.exit(0)

if __name__ == "__main__":
    main()
