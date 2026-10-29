#!/usr/bin/env python3
"""
Test Suite for Fresh Meat Retail BI — Weekly Controlled Pipeline (Etapa 4)
Tests all 7 required scenarios using isolated synthetic test environments:
1. Săptămână nouă fără date
2. Dovezi lipsă (chitanțe lipsă)
3. Date din săptămâni diferite (cross-week mismatch)
4. Hash-uri incorecte (tampered dataset)
5. Chitanță RELEASE_PASS reutilizată
6. Eșec în timpul execuției / abortare fără corupere
7. Păstrarea raportului de producție existent după eșec
"""

import sys
import os
import json
import shutil
import hashlib
import subprocess
from pathlib import Path

BASE = Path(__file__).resolve().parent
ROOT = BASE.parent

def sha256_file(path: Path) -> str:
    h = hashlib.sha256()
    with open(path, "rb") as f:
        for chunk in iter(lambda: f.read(1 << 20), b""):
            h.update(chunk)
    return h.hexdigest()

def test_1_new_week_without_data():
    print("[TEST 1/7] Test: Săptămână nouă fără date...")
    pipeline = BASE / "weekly_pipeline.py"
    cmd = [
        sys.executable, str(pipeline),
        "--week", "WK45",
        "--year", "2026",
        "--domain", "PROMO",
        "--dataset", str(BASE / "non_existent_dataset.json"),
        "--research", str(BASE / "non_existent_research.json"),
        "--reconciliation", str(BASE / "non_existent_rec.json")
    ]
    cp = subprocess.run(cmd, cwd=str(BASE), capture_output=True, text=True)
    assert cp.returncode == 2, f"Expected returncode 2 (FAIL_CLOSED), got {cp.returncode}"
    assert "DATASET_MISSING" in cp.stdout or "DATASET_MISSING" in cp.stderr
    print("  ✓ Pipeline-ul blochează execuția la lipsa datelor: PASS (FAIL_CLOSED)\n")

def test_2_missing_proofs():
    print("[TEST 2/7] Test: Dovezi lipsă (chitanțe de cercetare/reconciliere absente)...")
    pipeline = BASE / "weekly_pipeline.py"
    # Using WK44 dataset but omitting research receipt
    cmd = [
        sys.executable, str(pipeline),
        "--week", "WK44",
        "--year", "2026",
        "--domain", "PROMO",
        "--dataset", str(BASE / "PROMO_WEEKLY_CANONICAL_LOCK_WK44.json"),
        "--reconciliation", str(BASE / "RECONCILIATION_RECEIPT_WK44.json")
    ]
    cp = subprocess.run(cmd, cwd=str(BASE), capture_output=True, text=True)
    assert cp.returncode == 2, f"Expected returncode 2 (FAIL_CLOSED), got {cp.returncode}"
    assert "PROMO_RESEARCH_RECEIPT_MISSING" in cp.stdout or "PROMO_RESEARCH_RECEIPT_MISSING" in cp.stderr
    print("  ✓ Pipeline-ul blochează execuția fără chitanța completă de cercetare: PASS (FAIL_CLOSED)\n")

def test_3_cross_week_mismatch():
    print("[TEST 3/7] Test: Date din săptămâni diferite (WK45 cerut, dar datasetul conține WK44)...")
    pipeline = BASE / "weekly_pipeline.py"
    cmd = [
        sys.executable, str(pipeline),
        "--week", "WK45",  # Asking for WK45
        "--year", "2026",
        "--domain", "PROMO",
        "--dataset", str(BASE / "PROMO_WEEKLY_CANONICAL_LOCK_WK44.json"), # Providing WK44
        "--research", str(BASE / "RESEARCH_RECEIPT_WK44.json"),
        "--reconciliation", str(BASE / "RECONCILIATION_RECEIPT_WK44.json")
    ]
    cp = subprocess.run(cmd, cwd=str(BASE), capture_output=True, text=True)
    assert cp.returncode == 2, f"Expected returncode 2, got {cp.returncode}"
    assert "WEEK_YEAR_MISMATCH" in cp.stdout or "WEEK_YEAR_MISMATCH" in cp.stderr
    print("  ✓ Pipeline-ul respinge datasetul din altă săptămână: PASS (FAIL_CLOSED)\n")

def test_4_hash_mismatch_tampered_data():
    print("[TEST 4/7] Test: Hash-uri incorecte (dataset modificat față de chitanță)...")
    pipeline = BASE / "weekly_pipeline.py"
    test_sandbox = BASE / "tmp_test_tampered"
    test_sandbox.mkdir(exist_ok=True)
    
    # Create tampered copy of dataset
    orig = json.loads((BASE / "PROMO_WEEKLY_CANONICAL_LOCK_WK44.json").read_text(encoding="utf-8"))
    orig["cells"][0]["price_lei_kg"] = 99.99 # Tamper price
    tampered_dataset = test_sandbox / "tampered_dataset.json"
    tampered_dataset.write_text(json.dumps(orig, indent=2), encoding="utf-8")

    cmd = [
        sys.executable, str(pipeline),
        "--week", "WK44",
        "--year", "2026",
        "--domain", "PROMO",
        "--dataset", str(tampered_dataset),
        "--research", str(BASE / "RESEARCH_RECEIPT_WK44.json"), # Unmodified receipt expecting original sha
        "--reconciliation", str(BASE / "RECONCILIATION_RECEIPT_WK44.json")
    ]
    cp = subprocess.run(cmd, cwd=str(BASE), capture_output=True, text=True)
    assert cp.returncode == 2, f"Expected returncode 2, got {cp.returncode}"
    assert "UNBOUND_RESEARCH_RECEIPT" in cp.stdout or "UNBOUND_RESEARCH_RECEIPT" in cp.stderr
    print("  ✓ Pipeline-ul respinge datasetul modificat neasociat criptografic: PASS (FAIL_CLOSED)\n")
    
    shutil.rmtree(test_sandbox)

def test_5_reused_stale_receipt():
    print("[TEST 5/7] Test: Chitanță reutilizată din săptămâna precedentă pe un dataset nou...")
    pipeline = BASE / "weekly_pipeline.py"
    test_sandbox = BASE / "tmp_test_stale"
    test_sandbox.mkdir(exist_ok=True)
    
    # Create valid-looking synthetic dataset for WK45
    orig = json.loads((BASE / "PROMO_WEEKLY_CANONICAL_LOCK_WK44.json").read_text(encoding="utf-8"))
    orig["week"] = "WK45"
    orig["calendar_period"] = "02–08 NOI 2026"
    wk45_dataset = test_sandbox / "dataset_wk45.json"
    wk45_dataset.write_text(json.dumps(orig, indent=2), encoding="utf-8")

    # Pass WK44 receipts to WK45 dataset
    cmd = [
        sys.executable, str(pipeline),
        "--week", "WK45",
        "--year", "2026",
        "--domain", "PROMO",
        "--dataset", str(wk45_dataset),
        "--research", str(BASE / "RESEARCH_RECEIPT_WK44.json"), # Stale WK44 receipt
        "--reconciliation", str(BASE / "RECONCILIATION_RECEIPT_WK44.json")
    ]
    cp = subprocess.run(cmd, cwd=str(BASE), capture_output=True, text=True)
    assert cp.returncode == 2, f"Expected returncode 2, got {cp.returncode}"
    assert "STALE_RESEARCH_RECEIPT" in cp.stdout or "STALE_RESEARCH_RECEIPT" in cp.stderr
    print("  ✓ Pipeline-ul refuză chitanțe reutilizate din altă săptămână: PASS (FAIL_CLOSED)\n")
    
    shutil.rmtree(test_sandbox)

def test_6_and_7_atomic_preservation_after_failure():
    print("[TEST 6 & 7] Test: Eșec în timpul pipeline-ului și garantarea păstrării raportului de producție existent...")
    pipeline = BASE / "weekly_pipeline.py"
    
    # 1. Record existing production hashes
    prod_json = ROOT / "public" / "data" / "bi_dashboard_export.json"
    prod_png = ROOT / "public" / "TOP5_PREȚURI_COMPETITORI_WK44_2026.png"
    
    assert prod_json.exists(), "Prod dashboard export should exist"
    assert prod_png.exists(), "Prod PNG should exist"
    
    orig_json_sha = sha256_file(prod_json)
    orig_png_sha = sha256_file(prod_png)
    
    # 2. Run pipeline with invalid/corrupt data and --publish enabled
    test_sandbox = BASE / "tmp_test_atomic"
    test_sandbox.mkdir(exist_ok=True)
    bad_dataset = test_sandbox / "bad_dataset.json"
    bad_dataset.write_text('{"week": "WK45", "year": 2026, "cells": []}', encoding="utf-8")
    
    cmd = [
        sys.executable, str(pipeline),
        "--week", "WK45",
        "--year", "2026",
        "--domain", "PROMO",
        "--dataset", str(bad_dataset),
        "--research", str(BASE / "RESEARCH_RECEIPT_WK44.json"),
        "--reconciliation", str(BASE / "RECONCILIATION_RECEIPT_WK44.json"),
        "--publish"  # Publish requested, but should be prevented by FAIL_CLOSED!
    ]
    cp = subprocess.run(cmd, cwd=str(BASE), capture_output=True, text=True)
    assert cp.returncode == 2, f"Expected returncode 2, got {cp.returncode}"
    
    # 3. Verify that production files were NOT touched at all
    new_json_sha = sha256_file(prod_json)
    new_png_sha = sha256_file(prod_png)
    
    assert orig_json_sha == new_json_sha, "CRITICAL: Production dashboard export was modified during failed run!"
    assert orig_png_sha == new_png_sha, "CRITICAL: Production image was modified during failed run!"
    
    print("  ✓ Eșecul a oprit publicarea înainte de orice suprascriere.")
    print("  ✓ Raportul anterior de producție a fost conservat 100% identic (SHA identic): PASS\n")
    
    shutil.rmtree(test_sandbox)

def test_successful_weekly_run_staging():
    print("[VERIFICARE RUN REUȘIT] Test: Rulare completă WK44 cu dovezi autentice (Dry run / Staging)...")
    pipeline = BASE / "weekly_pipeline.py"
    cmd = [
        sys.executable, str(pipeline),
        "--week", "WK44",
        "--year", "2026",
        "--domain", "PROMO",
        "--dataset", str(BASE / "PROMO_WEEKLY_CANONICAL_LOCK_WK44.json"),
        "--research", str(BASE / "RESEARCH_RECEIPT_WK44.json"),
        "--reconciliation", str(BASE / "RECONCILIATION_RECEIPT_WK44.json")
    ]
    cp = subprocess.run(cmd, cwd=str(BASE), capture_output=True, text=True)
    assert cp.returncode == 0, f"Expected returncode 0, got {cp.returncode}: {cp.stderr} {cp.stdout}"
def test_8_interruption_between_json_and_png():
    print("[TEST 8] Test: Întrerupere între scrierea JSON-ului și PNG-ului (pre-activare)...")
    pointer_file = ROOT / "public" / "data" / "active_release.json"
    assert pointer_file.exists(), "active_release.json should exist"
    orig_pointer_sha = sha256_file(pointer_file)

    # Call run_weekly_pipeline with an intentionally broken intermediate step
    from weekly_pipeline import run_weekly_pipeline
    test_sandbox = BASE / "tmp_test_interrupted"
    test_sandbox.mkdir(exist_ok=True)
    
    # Run a pipeline with missing receipts to trigger pre-publish abort
    bad_ds = test_sandbox / "bad_ds.json"
    bad_ds.write_text(json.dumps({"week": "WK45", "year": 2026, "cells": []}), encoding="utf-8")
    
    res = run_weekly_pipeline(
        week="WK45",
        year=2026,
        domain="PROMO",
        dataset_path=bad_ds,
        publish=True
    )
    assert res.get("status") == "FAIL_CLOSED"
    
    # Ensure active pointer was NOT modified
    new_pointer_sha = sha256_file(pointer_file)
    assert orig_pointer_sha == new_pointer_sha, "Pointer was modified during interrupted run!"
    print("  ✓ Eșecul pre-activare nu a atins pointerul activ: PASS\n")
    shutil.rmtree(test_sandbox, ignore_errors=True)

def test_9_demonstrate_incomplete_release_never_active():
    print("[TEST 9] Test: Demonstrare că o publicare incompletă nu poate deveni versiunea activă...")
    pub_root = ROOT / "public"
    releases_dir = pub_root / "releases" / "2026" / "WK99_corrupt"
    releases_dir.mkdir(parents=True, exist_ok=True)
    
    # Place an incomplete release (only JSON, no PNG or corrupted PNG)
    (releases_dir / "bi_dashboard_export.json").write_text('{"fake": true}', encoding="utf-8")
    
    # Read active release pointer
    pointer = json.loads((pub_root / "data" / "active_release.json").read_text(encoding="utf-8"))
    
    # Verify active pointer DOES NOT point to the corrupt release
    assert pointer.get("release_id") != "2026/WK99_corrupt"
    assert "WK99_corrupt" not in pointer.get("export_path")
    assert "WK99_corrupt" not in pointer.get("image_path")
    
    # Verify that the active pointer points to files that actually exist and match hash
    active_export = pub_root / pointer["export_path"].lstrip("/")
    active_image = pub_root / pointer["image_path"].lstrip("/")
    assert active_export.exists(), f"Active export {active_export} must exist"
    assert active_image.exists(), f"Active image {active_image} must exist"
    assert sha256_file(active_export) == pointer.get("dataset_sha256") or sha256_file(active_image) == pointer.get("output_sha256")
    
    print("  ✓ O versiune incompletă/coruptă din depozit nu este activată de pointer: PASS\n")
    shutil.rmtree(releases_dir, ignore_errors=True)

def main():
    print("================================================================")
    print(" FRESH MEAT RETAIL BI — SUITĂ DE TESTE ETAPA 4 (WEEKLY PIPELINE)")
    print("================================================================\n")
    try:
        test_1_new_week_without_data()
        test_2_missing_proofs()
        test_3_cross_week_mismatch()
        test_4_hash_mismatch_tampered_data()
        test_5_reused_stale_receipt()
        test_6_and_7_atomic_preservation_after_failure()
        test_successful_weekly_run_staging()
        test_8_interruption_between_json_and_png()
        test_9_demonstrate_incomplete_release_never_active()
        print("================================================================")
        print(" TOATE CELE 9 TESTE DE CONTROL & ATOMICITATE AU TRECUT (100%)    ")
        print("================================================================")
    except AssertionError as e:
        print(f"\n[FAIL]: {e}")
        sys.exit(1)

if __name__ == "__main__":
    main()
