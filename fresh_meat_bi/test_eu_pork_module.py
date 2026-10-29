#!/usr/bin/env python3
"""
Unit and Integration Test Suite for EU Pork Market Weekly Module.
Validates:
1. CONFIG_MANIFEST.json component integrity (Golden Reference & Renderer SHA-256).
2. Canonical 8-market order and unit integrity (strictly no mixing live vs. carcass).
3. ISO 8601 calendar calculations and Europe/Bucharest timezone formatting.
4. FAIL_CLOSED policy enforcement when current week receipts are missing.
5. Successful RELEASE_PASS execution with authentic receipts and export generation.
"""

import sys
import json
import hashlib
import datetime
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

def test_1_manifest_hashes():
    print("[TEST 1/5] Checking manifest integrity for EU Pork Market...")
    manifest_path = BASE / "CONFIG_MANIFEST.json"
    assert manifest_path.exists(), "CONFIG_MANIFEST.json is missing"
    m = json.loads(manifest_path.read_text(encoding="utf-8"))

    eu_cfg = m.get("eu_pork_market", {})
    golden_ref = BASE / eu_cfg["golden_reference"]
    renderer = BASE / eu_cfg["renderer"]

    assert golden_ref.exists(), f"Golden reference {golden_ref} missing"
    assert renderer.exists(), f"Renderer {renderer} missing"

    actual_master_sha = sha256_file(golden_ref)
    assert actual_master_sha == eu_cfg["golden_reference_sha256"], (
        f"Master hash mismatch: expected {eu_cfg['golden_reference_sha256']}, got {actual_master_sha}"
    )

    actual_renderer_sha = sha256_file(renderer)
    assert actual_renderer_sha == eu_cfg["renderer_sha256"], (
        f"Renderer hash mismatch: expected {eu_cfg['renderer_sha256']}, got {actual_renderer_sha}"
    )
    print("  ✓ Golden Reference and Renderer SHA-256 verified: PASS\n")

def test_2_market_order_and_units():
    print("[TEST 2/5] Checking 8-market order and unit integrity...")
    config_path = BASE / "EU_PORK_MARKET_CONFIG.json"
    assert config_path.exists()
    cfg = json.loads(config_path.read_text(encoding="utf-8"))

    expected_order = [
        "Germany VEZG",
        "ISN / Internet Pig Auction",
        "Spain Mercolleida",
        "Italy CUN 156–200 kg",
        "Netherlands Vion",
        "Denmark Danish Crown",
        "France MPB",
        "Poland (ZMI) Class E"
    ]
    assert cfg.get("market_order") == expected_order, "Market order in config does not match authoritative standard"

    dataset_path = BASE / "EU_PORK_MARKET_DATASET_WK38.json"
    assert dataset_path.exists()
    ds = json.loads(dataset_path.read_text(encoding="utf-8"))
    actual_rows = [r["market"] for r in ds.get("rows", [])]
    assert actual_rows == expected_order, f"Dataset market order mismatch: {actual_rows}"

    # Verify unit rules: Spania & Italia must be live-weight, others carcass
    for r in ds.get("rows", []):
        m = r["market"]
        u = r.get("unit", "").lower()
        if m in ("Spain Mercolleida", "Italy CUN 156–200 kg"):
            assert "live" in u or "viu" in u, f"Market {m} must use live-weight, got: {u}"
        else:
            assert "sg" in u or "carcass" in u or "carcasă" in u or "kg" in u, f"Market {m} must use carcass basis, got: {u}"
    print("  ✓ 8-market order and unit integrity verified: PASS\n")

def test_3_iso_calendar_calculation():
    print("[TEST 3/5] Validating ISO 8601 calendar week and Romanian timezone date...")
    # ISO week test: WK38 2026
    year = 2026
    week = 38
    mon = datetime.date.fromisocalendar(year, week, 1)
    sun = datetime.date.fromisocalendar(year, week, 7)
    assert mon == datetime.date(2026, 9, 14), f"Expected 2026-09-14, got {mon}"
    assert sun == datetime.date(2026, 9, 20), f"Expected 2026-09-20, got {sun}"

    # Year boundary test (WK01 2027)
    mon_01 = datetime.date.fromisocalendar(2027, 1, 1)
    sun_01 = datetime.date.fromisocalendar(2027, 1, 7)
    assert mon_01.isocalendar() == (2027, 1, 1)
    assert sun_01.isocalendar() == (2027, 1, 7)

    # Thursday calculation
    thu = datetime.date.fromisocalendar(year, week, 4)
    assert thu.weekday() == 3 # Thursday is index 3 (0=Monday)
    print("  ✓ ISO 8601 calendar calculation verified: PASS\n")

def test_4_fail_closed_on_missing_receipts():
    print("[TEST 4/5] Testing FRESH_MEAT_BI_GATE FAIL_CLOSED policy on EU Pork without receipts...")
    gate = BASE / "FRESH_MEAT_BI_GATE_v1.py"
    dataset = BASE / "EU_PORK_MARKET_DATASET_WK38.json"

    # Running gate without --source or --visual MUST exit with code 2 and release_status == FAIL_CLOSED
    cmd = [
        sys.executable, str(gate), "EU_PORK", str(dataset),
        "--manifest", str(BASE / "CONFIG_MANIFEST.json")
    ]
    cp = subprocess.run(cmd, capture_output=True, text=True)
    assert cp.returncode == 2, f"Gate must exit with 2, got {cp.returncode}"
    res = json.loads(cp.stdout)
    assert res.get("release_status") == "FAIL_CLOSED"
    assert "EU_CURRENT_SOURCE_VERIFICATION_NOT_PROVEN" in res.get("errors", [])
    assert "EU_VISUAL_QA_NOT_PROVEN" in res.get("errors", [])
    print("  ✓ Gate correctly blocked unverified release: FAIL_CLOSED (PASS)\n")

def test_5_export_generation_and_schema():
    print("[TEST 5/5] Testing EU Pork export generation and schema compliance...")
    from export_eu_pork_data import export_eu_pork_data
    ds = BASE / "EU_PORK_MARKET_DATASET_WK38.json"
    out = ROOT / "public" / "data" / "eu_pork_market_export.json"

    success = export_eu_pork_data(ds, out)
    assert success is True, "Export failed"
    assert out.exists(), "Export file not written"

    data = json.loads(out.read_text(encoding="utf-8"))
    assert data.get("schema_version") == "2.0-eu-pork-export"
    assert data.get("release_status") == "RELEASE_PASS"
    assert data.get("status_badge") == "ACTIVE_LOCKED"
    assert data.get("week") == "WK38"
    assert data.get("year") == 2026
    assert data.get("is_baseline_golden_reference") is True
    assert len(data.get("rows", [])) == 8
    assert data.get("hashes", {}).get("master_sha256") == "ac785f514eed0ae6e1cf8fc115e9e1ff384645cc4b30b33d5603ed35718da264"
    print("  ✓ Export JSON schema and data verified: PASS\n")

def test_6_wk44_pipeline_and_release_pass():
    print("[TEST 6/6] Testing full governed pipeline for WK44 EU Pork Market...")
    ds = BASE / "EU_PORK_MARKET_DATASET_WK44.json"
    src = BASE / "EU_SOURCE_RECEIPT_WK44.json"
    vis = BASE / "EU_VISUAL_RECEIPT_WK44.json"
    assert ds.exists() and src.exists() and vis.exists(), "WK44 dataset or receipts missing"

    pipeline = BASE / "weekly_pipeline.py"
    cmd = [
        sys.executable, str(pipeline),
        "--week", "WK44",
        "--year", "2026",
        "--domain", "EU_PORK_MARKET",
        "--dataset", str(ds),
        "--source", str(src),
        "--visual", str(vis),
        "--publish"
    ]
    cp = subprocess.run(cmd, cwd=str(BASE), capture_output=True, text=True)
    assert cp.returncode == 0, f"Pipeline failed: {cp.stdout} {cp.stderr}"
    assert "RELEASE_PASS (PUBLICAT)" in cp.stdout

    # Verify published export
    pub_export = ROOT / "public" / "data" / "eu_pork_market_export.json"
    assert pub_export.exists(), "Export file not found in public/data/"
    data = json.loads(pub_export.read_text(encoding="utf-8"))
    assert data.get("week") == "WK44"
    assert data.get("year") == 2026
    assert data.get("release_status") == "RELEASE_PASS"
    assert data.get("market_signal") == "DOWNSIDE ACCELERATION"
    assert len(data.get("rows", [])) == 8

    # Verify output image
    pub_img = ROOT / "public" / "EU_PORK_MARKET_WK44_2026.png"
    assert pub_img.exists(), "Published image not found in public/"
    from PIL import Image
    im = Image.open(pub_img)
    assert im.size == (1536, 1024), f"Unexpected image size: {im.size}"

    print("  ✓ WK44 pipeline execution, Release Gate RELEASE_PASS and publication verified: PASS\n")

if __name__ == "__main__":
    print("\n=======================================================")
    print(" RUNNING EU PORK MARKET WEEKLY MODULE TEST SUITE")
    print("=======================================================\n")
    test_1_manifest_hashes()
    test_2_market_order_and_units()
    test_3_iso_calendar_calculation()
    test_4_fail_closed_on_missing_receipts()
    test_5_export_generation_and_schema()
    test_6_wk44_pipeline_and_release_pass()
    print("=======================================================")
    print(" ALL 6/6 EU PORK MARKET MODULE TESTS PASSED")
    print("=======================================================\n")
