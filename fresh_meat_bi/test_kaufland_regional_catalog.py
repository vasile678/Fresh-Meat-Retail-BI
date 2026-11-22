#!/usr/bin/env python3
"""
Test Suite: Kaufland Regional Catalog Missed Offer Detection & Reconciliation
=============================================================================
Tests:
1. Kaufland regional flyer detection (Muntenia edition cover page 1/64)
2. Offer provenance and metadata (price: 13.99, standard: 22.99, discount: -39%, validity: 18.11-24.11.2026)
3. 25/25 cell matrix audit (8 VERIFIED, 17 N/V, 0 NC)
4. Release Gate verification (RELEASE_PASS on authoritative weekly lock)
5. Golden Master static pixel preservation (309,060 pixels, 0 differences)
6. Strategic Category Intelligence synchronization (Kaufland #1 on Spată)
7. FAIL_CLOSED enforcement on tampered dataset
"""

import sys
import os
import json
import hashlib
import subprocess
from pathlib import Path

# Add dist-packages if present for PIL
if "/usr/lib/python3/dist-packages" not in sys.path and os.path.exists("/usr/lib/python3/dist-packages"):
    sys.path.insert(0, "/usr/lib/python3/dist-packages")

BASE_DIR = Path(__file__).resolve().parent
ROOT_DIR = BASE_DIR.parent
PUBLIC_DATA_DIR = ROOT_DIR / "public" / "data"

def sha256_file(path: Path) -> str:
    h = hashlib.sha256()
    with open(path, "rb") as f:
        for chunk in iter(lambda: f.read(1 << 20), b""):
            h.update(chunk)
    return h.hexdigest()

def test_kaufland_regional_collector_extraction():
    print("\n[TEST 1/7] Testing Kaufland collector regional flyer extraction...")
    from collector import collect_kaufland
    res = collect_kaufland("WK47", "16–22 NOI 2026")
    assert "Spată porc fără os" in res, "Missing Spată in Kaufland results"
    spata = res["Spată porc fără os"]
    
    assert spata["status"] == "VERIFIED", f"Expected VERIFIED, got {spata['status']}"
    assert spata["price_lei_kg"] == 13.99, f"Expected 13.99 lei/kg, got {spata['price_lei_kg']}"
    assert spata["price_standard_lei_kg"] == 22.99, f"Expected 22.99 standard, got {spata.get('price_standard_lei_kg')}"
    assert spata["discount"] == "-39%", f"Expected -39% discount, got {spata.get('discount')}"
    assert spata["region"] == "Muntenia", f"Expected region Muntenia, got {spata.get('region')}"
    assert spata["catalog_page"] == "1/64", f"Expected page 1/64, got {spata.get('catalog_page')}"
    assert "RO_ro_KD_MUNTENIA" in spata["catalog_id"], f"Expected Muntenia catalog ID, got {spata.get('catalog_id')}"
    assert "18.11–24.11.2026" in spata["validity"], f"Expected validity 18.11-24.11.2026, got {spata.get('validity')}"
    print("  ✓ Kaufland Muntenia Spată offer detected with 100% field integrity: PASS")

def test_matrix_25_audit():
    print("\n[TEST 2/7] Testing 25/25 matrix audit for WK47...")
    from collector import execute_autonomous_collector
    summary = execute_autonomous_collector("WK47", 2026)
    
    assert summary["release_eligible"] is True, "Expected release_eligible == True"
    assert summary["verified_count"] == 8, f"Expected 8 VERIFIED, got {summary['verified_count']}"
    assert summary["nv_count"] == 17, f"Expected 17 N/V, got {summary['nv_count']}"
    assert summary["nc_count"] == 0, f"Expected 0 NC, got {summary['nc_count']}"
    
    counts = summary["classification_counts"]
    assert counts["confirmat_primar"] == 8, f"Expected 8 primar, got {counts['confirmat_primar']}"
    assert counts["indisponibil"] == 17, f"Expected 17 indisponibil, got {counts['indisponibil']}"
    assert counts["neconfirmat"] == 0, f"Expected 0 neconfirmat, got {counts['neconfirmat']}"
    print(f"  ✓ 25/25 Matrix audit verified: 8 VERIFIED, 17 N/V, 0 NC: PASS")

def test_release_gate_verification():
    print("\n[TEST 3/7] Testing FRESH_MEAT_BI_GATE on WK47 dataset...")
    import subprocess
    gate_script = BASE_DIR / "FRESH_MEAT_BI_GATE_v1.py"
    lock_file = BASE_DIR / "PROMO_WEEKLY_CANONICAL_LOCK_WK47.json"
    research_file = BASE_DIR / "RESEARCH_RECEIPT_WK47.json"
    reconcil_file = BASE_DIR / "RECONCILIATION_RECEIPT_WK47.json"
    
    # Render staging test
    renderer = BASE_DIR / "promo_image_renderer_v2.py"
    test_png = BASE_DIR / "test_wk47_render.png"
    sub_env = os.environ.copy()
    if "/usr/lib/python3/dist-packages" not in sub_env.get("PYTHONPATH", "") and os.path.exists("/usr/lib/python3/dist-packages"):
        sub_env["PYTHONPATH"] = f"/usr/lib/python3/dist-packages:{sub_env.get('PYTHONPATH', '')}".rstrip(":")
        
    cp_r = subprocess.run([sys.executable, str(renderer), str(lock_file), str(test_png)],
                          cwd=str(BASE_DIR), capture_output=True, text=True, env=sub_env)
    assert cp_r.returncode == 0, f"Renderer failed: {cp_r.stderr}"
    
    manifest_receipt = BASE_DIR / "test_wk47_render.png.manifest.json"
    
    # Gate execution with manifest bound to this week's canonical lock
    tmp_m = json.loads((BASE_DIR / "CONFIG_MANIFEST.json").read_text(encoding="utf-8"))
    tmp_m["promo"]["authoritative_lock_registry"]["canonical_lock"] = lock_file.name
    tmp_m_path = BASE_DIR / "tmp_test_manifest.json"
    tmp_m_path.write_text(json.dumps(tmp_m, indent=2), encoding="utf-8")
    
    cp_g = subprocess.run([
        sys.executable, str(gate_script), "PROMO", str(lock_file),
        "--render", str(manifest_receipt),
        "--research", str(research_file),
        "--reconciliation", str(reconcil_file),
        "--manifest", str(tmp_m_path)
    ], cwd=str(BASE_DIR), capture_output=True, text=True)
    
    res = json.loads(cp_g.stdout)
    assert res.get("release_status") == "RELEASE_PASS", f"Gate did not grant PASS: {res}"
    print("  ✓ FRESH_MEAT_BI_GATE granted RELEASE_PASS with all checks true: PASS")
    
    # Clean up test artifacts
    if test_png.exists(): test_png.unlink()
    if manifest_receipt.exists(): manifest_receipt.unlink()
    if tmp_m_path.exists(): tmp_m_path.unlink()

def test_golden_master_pixel_preservation():
    print("\n[TEST 4/7] Testing Golden Master static pixel preservation...")
    from weekly_pipeline import verify_static_pixels
    manifest = json.loads((BASE_DIR / "CONFIG_MANIFEST.json").read_text(encoding="utf-8"))
    master_png = BASE_DIR / manifest["promo"]["master"]
    
    # Render candidate
    renderer = BASE_DIR / manifest["promo"]["renderer"]
    candidate_png = BASE_DIR / "test_pixel_candidate.png"
    sub_env = os.environ.copy()
    if "/usr/lib/python3/dist-packages" not in sub_env.get("PYTHONPATH", "") and os.path.exists("/usr/lib/python3/dist-packages"):
        sub_env["PYTHONPATH"] = f"/usr/lib/python3/dist-packages:{sub_env.get('PYTHONPATH', '')}".rstrip(":")
        
    subprocess.run([sys.executable, str(renderer), str(BASE_DIR / "PROMO_WEEKLY_CANONICAL_LOCK_WK47.json"), str(candidate_png)],
                   cwd=str(BASE_DIR), capture_output=True, text=True, env=sub_env)
    
    ok, diffs, total = verify_static_pixels(master_png, candidate_png)
    assert ok is True, f"Pixel differences detected: {diffs}/{total}"
    assert diffs == 0, f"Expected 0 diffs, got {diffs}"
    print(f"  ✓ {total} static pixels checked: 0 differences (100% preservation): PASS")
    if candidate_png.exists(): candidate_png.unlink()
    test_manifest = BASE_DIR / "test_pixel_candidate.png.manifest.json"
    if test_manifest.exists(): test_manifest.unlink()

def test_commercial_conclusions_leadership():
    print("\n[TEST 5/7] Testing Commercial Conclusions leadership...")
    export_path = PUBLIC_DATA_DIR / "bi_dashboard_export.json"
    assert export_path.exists(), "Missing bi_dashboard_export.json"
    exp = json.loads(export_path.read_text(encoding="utf-8"))
    
    best_prices = exp["summary"]["best_prices"]
    assert best_prices["Spată porc fără os"] == 13.99, f"Expected 13.99, got {best_prices['Spată porc fără os']}"
    assert best_prices["Pulpă porc fără os"] == 15.99, f"Expected 15.99, got {best_prices['Pulpă porc fără os']}"
    assert best_prices["Cotlet porc fără os"] == 19.90, f"Expected 19.90, got {best_prices['Cotlet porc fără os']}"
    assert best_prices["Ceafă porc fără os"] == 20.99, f"Expected 20.99, got {best_prices['Ceafă porc fără os']}"
    assert best_prices["Piept pui dezosat"] == 24.60, f"Expected 24.60, got {best_prices['Piept pui dezosat']}"
    
    spata_conc = next(it for it in exp["commercial_conclusions"]["items"] if it["kvi"] == "Spată porc fără os")
    assert spata_conc["best_retailers"] == ["Kaufland"], f"Expected Kaufland as best, got {spata_conc['best_retailers']}"
    assert spata_conc["best_price"] == 13.99, f"Expected 13.99, got {spata_conc['best_price']}"
    assert "Lider Kaufland la 13.99 lei/kg" in spata_conc["summary_title"]
    print("  ✓ Commercial Conclusions correctly identify Kaufland at 13.99 lei/kg as #1 market leader: PASS")

def test_fail_closed_negative_tampering():
    print("\n[TEST 6/7] Testing FAIL_CLOSED on tampered dataset...")
    import subprocess
    gate_script = BASE_DIR / "FRESH_MEAT_BI_GATE_v1.py"
    
    # Tamper with price in a temporary copy
    lock = json.loads((BASE_DIR / "PROMO_WEEKLY_CANONICAL_LOCK_WK47.json").read_text(encoding="utf-8"))
    lock["cells"][0]["price_lei_kg"] = 9.99  # Tamper price
    tampered_file = BASE_DIR / "tampered_lock.json"
    tampered_file.write_text(json.dumps(lock), encoding="utf-8")
    
    research_file = BASE_DIR / "RESEARCH_RECEIPT_WK47.json"
    reconcil_file = BASE_DIR / "RECONCILIATION_RECEIPT_WK47.json"
    
    tmp_m = json.loads((BASE_DIR / "CONFIG_MANIFEST.json").read_text(encoding="utf-8"))
    tmp_m["promo"]["authoritative_lock_registry"]["canonical_lock"] = tampered_file.name
    tmp_m_path = BASE_DIR / "tmp_tampered_manifest.json"
    tmp_m_path.write_text(json.dumps(tmp_m, indent=2), encoding="utf-8")
    
    cp = subprocess.run([
        sys.executable, str(gate_script), "PROMO", str(tampered_file),
        "--research", str(research_file),
        "--reconciliation", str(reconcil_file),
        "--manifest", str(tmp_m_path)
    ], cwd=str(BASE_DIR), capture_output=True, text=True)
    
    res = json.loads(cp.stdout)
    assert res.get("release_status") == "FAIL_CLOSED", f"Expected FAIL_CLOSED, got {res.get('release_status')}"
    assert "PROMO_RESEARCH_25_25_NOT_PROVEN" in res.get("errors", [])
    print("  ✓ Tampered dataset was correctly rejected by Release Gate (FAIL_CLOSED): PASS")
    if tampered_file.exists(): tampered_file.unlink()
    if tmp_m_path.exists(): tmp_m_path.unlink()

def test_active_release_pointer_integrity():
    print("\n[TEST 7/7] Testing active release atomic pointer integrity...")
    pointer_path = PUBLIC_DATA_DIR / "active_release.json"
    assert pointer_path.exists(), "Missing active_release.json"
    pointer = json.loads(pointer_path.read_text(encoding="utf-8"))
    
    assert pointer["release_status"] == "RELEASE_PASS"
    assert pointer["week"] == "WK47"
    assert pointer["year"] == 2026
    
    export_file = ROOT_DIR / "public" / pointer["export_path"].lstrip("/")
    img_file = ROOT_DIR / "public" / pointer["image_path"].lstrip("/")
    rcpt_file = ROOT_DIR / "public" / pointer["release_receipt_path"].lstrip("/")
    
    assert export_file.exists(), f"Missing export file {export_file}"
    assert img_file.exists(), f"Missing image file {img_file}"
    assert rcpt_file.exists(), f"Missing receipt file {rcpt_file}"
    
    assert sha256_file(img_file) == pointer["output_sha256"]
    assert sha256_file(rcpt_file) == pointer["release_receipt_sha256"]
    print("  ✓ Active release pointer is completely consistent and cryptographically bound: PASS")

if __name__ == "__main__":
    test_kaufland_regional_collector_extraction()
    test_matrix_25_audit()
    test_release_gate_verification()
    test_golden_master_pixel_preservation()
    test_commercial_conclusions_leadership()
    test_fail_closed_negative_tampering()
    test_active_release_pointer_integrity()
    print("\n=======================================================")
    print(" ALL 7 REGIONAL CATALOG REGRESSION TESTS PASSED (100%)")
    print("=======================================================\n")
