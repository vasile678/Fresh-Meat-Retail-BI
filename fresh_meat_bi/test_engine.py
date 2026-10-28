#!/usr/bin/env python3
"""
Test Suite for Fresh Meat Retail BI Engine.
Validates:
1. Manifest SHA-256 integrity of all declared components.
2. Deterministic Promo image renderer.
3. FRESH_MEAT_BI_GATE FAIL_CLOSED policy when required evidence is missing.
4. FRESH_MEAT_BI_GATE RELEASE_PASS policy when authentic evidence is provided.
5. Golden Master static pixel preservation.
"""

import sys
import json
import hashlib
import subprocess
from pathlib import Path
from PIL import Image

BASE = Path(__file__).resolve().parent

def sha256_file(path: Path) -> str:
    h = hashlib.sha256()
    with open(path, "rb") as f:
        for chunk in iter(lambda: f.read(1 << 20), b""):
            h.update(chunk)
    return h.hexdigest()

def test_manifest_integrity():
    print("[TEST 1/5] Checking manifest SHA-256 integrity...")
    manifest_path = BASE / "CONFIG_MANIFEST.json"
    assert manifest_path.exists(), "CONFIG_MANIFEST.json missing"
    m = json.loads(manifest_path.read_text(encoding="utf-8"))

    expected = {
        "runtime": (BASE / m["governance"]["runtime"], m["governance"]["runtime_sha256"]),
        "release_gate": (BASE / m["release_gate"]["file"], m["release_gate"]["sha256"]),
        "promo_master": (BASE / m["promo"]["master"], m["promo"]["master_sha256"]),
        "promo_renderer": (BASE / m["promo"]["renderer"], m["promo"]["renderer_sha256"]),
        "promo_contract": (BASE / m["promo"]["contract"], m["promo"]["contract_sha256"]),
        "eu_golden": (BASE / m["eu_pork_market"]["golden_reference"], m["eu_pork_market"]["golden_reference_sha256"]),
        "eu_renderer": (BASE / m["eu_pork_market"]["renderer"], m["eu_pork_market"]["renderer_sha256"]),
    }

    for name, (file_path, expected_hash) in expected.items():
        assert file_path.exists(), f"Component {name} ({file_path.name}) not found"
        actual_hash = sha256_file(file_path)
        assert actual_hash == expected_hash, f"SHA-256 mismatch for {name}: expected {expected_hash}, got {actual_hash}"
        print(f"  ✓ {name:16}: {actual_hash[:16]}... OK")
    print("  -> Manifest SHA-256 integrity: PASS\n")

def test_promo_renderer_deterministic():
    print("[TEST 2/5] Testing deterministic Promo renderer...")
    renderer = BASE / "promo_image_renderer_v2.py"
    canonical_lock = BASE / "PROMO_WEEKLY_CANONICAL_LOCK.json"
    test_out = BASE / "tmp_test_promo.png"

    cmd = [sys.executable, str(renderer), str(canonical_lock), str(test_out)]
    cp = subprocess.run(cmd, cwd=str(BASE), capture_output=True, text=True)
    assert cp.returncode == 0, f"Renderer failed: {cp.stderr}"
    assert test_out.exists(), "Output image not created"

    receipt_file = BASE / "tmp_test_promo.png.manifest.json"
    assert receipt_file.exists(), "Manifest receipt not created"
    receipt = json.loads(receipt_file.read_text(encoding="utf-8"))
    assert receipt["status"] == "PASS", f"Renderer status != PASS: {receipt}"
    assert receipt["coverage_checked"] == "25/25"

    im = Image.open(test_out)
    assert im.size == (1448, 1086), f"Unexpected dimensions {im.size}"
    print(f"  ✓ Rendered 1448x1086 4:3 image with manifest receipt: PASS\n")

def test_gate_fail_closed():
    print("[TEST 3/5] Testing FRESH_MEAT_BI_GATE FAIL_CLOSED policy...")
    gate = BASE / "FRESH_MEAT_BI_GATE_v1.py"
    canonical_lock = BASE / "PROMO_WEEKLY_CANONICAL_LOCK.json"
    render_receipt = BASE / "tmp_test_promo.png.manifest.json"

    # Promo without research or reconciliation receipts MUST fail closed (exit code 2)
    cmd = [
        sys.executable, str(gate), "PROMO", str(canonical_lock),
        "--render", str(render_receipt),
        "--manifest", str(BASE / "CONFIG_MANIFEST.json")
    ]
    cp = subprocess.run(cmd, cwd=str(BASE), capture_output=True, text=True)
    assert cp.returncode == 2, f"Gate should fail closed with code 2, got {cp.returncode}"
    res = json.loads(cp.stdout)
    assert res.get("release_status") == "FAIL_CLOSED", f"Expected FAIL_CLOSED, got {res}"
    assert "PROMO_RESEARCH_25_25_NOT_PROVEN" in res.get("errors", [])
    assert "PROMO_RECONCILIATION_NOT_PROVEN" in res.get("errors", [])
    print("  ✓ Gate correctly blocked release without research/reconciliation receipts: FAIL_CLOSED (PASS)")

    # EU without source or visual receipts MUST fail closed
    eu_config = BASE / "EU_PORK_MARKET_CONFIG.json"
    cmd_eu = [
        sys.executable, str(gate), "EU_PORK", str(eu_config),
        "--manifest", str(BASE / "CONFIG_MANIFEST.json")
    ]
    cp_eu = subprocess.run(cmd_eu, cwd=str(BASE), capture_output=True, text=True)
    assert cp_eu.returncode == 2, f"Gate should fail closed for EU without receipts, got {cp_eu.returncode}"
    res_eu = json.loads(cp_eu.stdout)
    assert res_eu.get("release_status") == "FAIL_CLOSED"
    print("  ✓ Gate correctly blocked release for EU without source/visual receipts: FAIL_CLOSED (PASS)\n")

def test_static_pixel_preservation():
    print("[TEST 4/5] Testing Golden Master static pixel preservation...")
    master = Image.open(BASE / "PROMO_MASTER_v2_LOCKED.png").convert("RGB")
    rendered = Image.open(BASE / "tmp_test_promo.png").convert("RGB")
    w, h = master.size

    diff_count = 0
    total_static = 0

    # Header rows (Y: 145-240)
    for y in range(145, 240):
        for x in range(w):
            total_static += 1
            if master.getpixel((x, y)) != rendered.getpixel((x, y)):
                diff_count += 1

    # Left product column (X: 0-245, Y: 250-950)
    for y in range(250, 950):
        for x in range(0, 245):
            total_static += 1
            if master.getpixel((x, y)) != rendered.getpixel((x, y)):
                diff_count += 1

    assert diff_count == 0, f"Static pixels modified: {diff_count} diffs out of {total_static}"
    print(f"  ✓ {total_static} static pixels checked: 0 differences (100% preservation)\n")

def test_wk44_release_pass():
    print("[TEST 5/5] Testing WK44 governed release pass with authentic receipts...")
    runtime = BASE / "fresh_meat_bi_runtime_v2.py"
    dataset = BASE / "PROMO_WEEKLY_CANONICAL_LOCK_WK44.json"
    research = BASE / "RESEARCH_RECEIPT_WK44.json"
    reconciliation = BASE / "RECONCILIATION_RECEIPT_WK44.json"

    if not (dataset.exists() and research.exists() and reconciliation.exists()):
        print("  ! WK44 receipts not present in test dir, skipping RELEASE_PASS test.")
        return

    # Update canonical lock pointer in manifest for WK44 test or run gate
    out_png = BASE / "tmp_wk44_release.png"
    gate = BASE / "FRESH_MEAT_BI_GATE_v1.py"

    # 1. Run promo renderer
    renderer = BASE / "promo_image_renderer_v2.py"
    cp_rend = subprocess.run([sys.executable, str(renderer), str(dataset), str(out_png)], cwd=str(BASE), capture_output=True, text=True)
    assert cp_rend.returncode == 0, f"Renderer failed: {cp_rend.stderr}"

    render_receipt = BASE / "tmp_wk44_release.png.manifest.json"
    assert render_receipt.exists()

    # 2. Run gate directly with dataset and receipts
    # Create temporary manifest for WK44 release test
    base_m = json.loads((BASE / "CONFIG_MANIFEST.json").read_text(encoding="utf-8"))
    base_m["promo"]["authoritative_lock_registry"]["canonical_lock"] = dataset.name
    tmp_m_path = BASE / "tmp_manifest_wk44.json"
    tmp_m_path.write_text(json.dumps(base_m, indent=2), encoding="utf-8")

    cmd_gate = [
        sys.executable, str(gate), "PROMO", str(dataset),
        "--render", str(render_receipt),
        "--research", str(research),
        "--reconciliation", str(reconciliation),
        "--manifest", str(tmp_m_path)
    ]
    cp_gate = subprocess.run(cmd_gate, cwd=str(BASE), capture_output=True, text=True)
    res_gate = json.loads(cp_gate.stdout)
    assert cp_gate.returncode == 0, f"Gate failed: {cp_gate.stdout} {cp_gate.stderr}"
    assert res_gate.get("release_status") == "RELEASE_PASS", f"Expected RELEASE_PASS, got {res_gate}"
    print("  ✓ Full WK44 release gate execution: RELEASE_PASS\n")

    # Clean up temporary test files
    for p in [BASE / "tmp_test_promo.png", BASE / "tmp_test_promo.png.manifest.json", out_png, render_receipt, tmp_m_path]:
        if p.exists():
            p.unlink()

def test_dashboard_export_integrity():
    print("[TEST 6/6] Testing React dashboard JSON export integrity...")
    export_script = BASE / "export_dashboard_data.py"
    assert export_script.exists(), "export_dashboard_data.py missing"

    # Run exporter
    cp = subprocess.run([sys.executable, str(export_script)], cwd=str(BASE), capture_output=True, text=True)
    assert cp.returncode == 0, f"Export script failed: {cp.stderr}"

    export_file = BASE.parent / "public" / "data" / "bi_dashboard_export.json"
    assert export_file.exists(), "bi_dashboard_export.json missing"
    data = json.loads(export_file.read_text(encoding="utf-8"))

    assert data.get("release_status") == "RELEASE_PASS", f"Expected RELEASE_PASS, got {data.get('release_status')}"
    assert len(data.get("cells", [])) == 25, "Expected 25 cells in export"
    assert data.get("coverage_checked") == "25/25"

    png_file = BASE.parent / "public" / "TOP5_PREȚURI_COMPETITORI_WK44_2026.png"
    assert png_file.exists()
    assert data["hashes"]["output_sha256"] == sha256_file(png_file)

    lock_file = BASE / "PROMO_WEEKLY_CANONICAL_LOCK_WK44.json"
    if lock_file.exists():
        assert data["hashes"]["dataset_sha256"] == sha256_file(lock_file)

    assert data.get("release_gate", {}).get("release_status") == "RELEASE_PASS"
    print("  ✓ Dashboard JSON export cryptographic integrity and Release Gate binding: PASS\n")

def main():
    print("==================================================")
    print("     FRESH MEAT RETAIL BI — ENGINE TEST SUITE     ")
    print("==================================================\n")
    try:
        test_manifest_integrity()
        test_promo_renderer_deterministic()
        test_gate_fail_closed()
        test_static_pixel_preservation()
        test_wk44_release_pass()
        test_dashboard_export_integrity()
        print("==================================================")
        print("     ALL ENGINE TESTS PASSED (100% SUCCESS)       ")
        print("==================================================")
    except AssertionError as e:
        print(f"\n[FAIL]: {e}")
        sys.exit(1)

if __name__ == "__main__":
    main()
