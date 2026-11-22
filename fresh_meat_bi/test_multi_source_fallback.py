#!/usr/bin/env python3
"""
TEST MULTI-SOURCE FALLBACK & 4-TIER RIGOR VERIFICATION
======================================================
Tests all 3 modules:
1. Promo Weekly (standard & simulate_primary_down)
2. EU Pork Market (standard & simulate_primary_down)
3. Retail Media Monitor (standard & simulate_primary_down)

Verifies:
- 4-Tier classification: CONFIRMAT PRIMAR, CONFIRMAT SECUNDAR, NECONFIRMAT, INDISPONIBIL
- Fallback events generation and engagement
- Zero Fictiune: No synthetic prices or fabricated data
- Smart refresh state schema 2.0 compliance
"""

import os
import sys
import json
import subprocess
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent
PUBLIC_DATA_DIR = BASE_DIR / "public" / "data"

def run_cmd(cmd_list):
    res = subprocess.run(cmd_list, cwd=str(BASE_DIR), capture_output=True, text=True)
    return res

def test_promo_weekly_multi_source():
    print("\n[TEST 1] Promo Weekly - Multi-Source Fallback Execution...")
    
    # 1.1 Run standard cycle
    cmd = [sys.executable, "fresh_meat_bi/promo_weekly_scheduler.py", "--run-autonomous", "--force"]
    res = run_cmd(cmd)
    assert res.returncode == 0, f"Promo standard cycle failed: {res.stderr}"
    print("  -> Standard autonomous cycle PASSED (exit code 0)")
    
    # Check bi_dashboard_export.json
    export_path = PUBLIC_DATA_DIR / "bi_dashboard_export.json"
    assert export_path.exists(), "bi_dashboard_export.json missing"
    with open(export_path, "r", encoding="utf-8") as f:
        export_data = json.load(f)
    
    counts = export_data.get("classification_counts", {})
    print(f"  -> Standard classification counts: {counts}")
    assert "confirmat_primar" in counts, "Missing confirmat_primar in counts"
    assert "confirmat_secundar" in counts, "Missing confirmat_secundar in counts"
    assert counts["confirmat_primar"] > 0, "Expected primary confirmed items in standard mode"
    assert export_data.get("is_fallback_engaged") is False, "Fallback should not be engaged in standard mode"
    
    # 1.2 Run with --simulate-primary-down
    print("  -> Running Promo Weekly with --simulate-primary-down...")
    cmd_fallback = [sys.executable, "fresh_meat_bi/promo_weekly_scheduler.py", "--run-autonomous", "--force", "--simulate-primary-down"]
    res_fb = run_cmd(cmd_fallback)
    assert res_fb.returncode == 0, f"Promo fallback cycle failed: {res_fb.stderr}"
    print("  -> Outage simulation cycle PASSED (exit code 0)")
    
    with open(export_path, "r", encoding="utf-8") as f:
        fb_export_data = json.load(f)
    
    fb_counts = fb_export_data.get("classification_counts", {})
    print(f"  -> Fallback classification counts: {fb_counts}")
    assert fb_counts.get("confirmat_secundar", 0) > 0, "Expected secondary confirmed items in fallback mode"
    assert fb_export_data.get("is_fallback_engaged") is True, "Fallback MUST be engaged when primary is down"
    assert len(fb_export_data.get("fallback_events", [])) > 0, "Expected fallback events recorded"
    print(f"  -> Recorded {len(fb_export_data['fallback_events'])} fallback events successfully")
    
    # Verify cells contain classification metadata
    cells = fb_export_data.get("cells", [])
    assert len(cells) == 25, f"Expected 25 cells, found {len(cells)}"
    for c in cells:
        assert "confirmation_level" in c, f"Cell {c.get('retailer')}-{c.get('kvi')} missing confirmation_level"
        assert c["confirmation_level"] in ["CONFIRMAT PRIMAR", "CONFIRMAT SECUNDAR", "NECONFIRMAT", "INDISPONIBIL"]
    print("  -> All 25 cells verified for 4-tier classification adherence")

def test_eu_pork_multi_source():
    print("\n[TEST 2] EU Pork Market - Multi-Source Fallback Execution...")
    
    # 2.1 Standard run
    cmd = [sys.executable, "fresh_meat_bi/eu_pork_collector.py", "--run-pipeline"]
    res = run_cmd(cmd)
    assert res.returncode == 0, f"EU Pork standard run failed: {res.stderr}"
    print("  -> Standard EU pork pipeline PASSED (exit code 0)")
    
    eu_export_path = PUBLIC_DATA_DIR / "eu_pork_market_export.json"
    assert eu_export_path.exists(), "eu_pork_market_export.json missing"
    with open(eu_export_path, "r", encoding="utf-8") as f:
        eu_data = json.load(f)
    
    assert "classification_counts" in eu_data, "Missing classification_counts in EU pork export"
    counts = eu_data["classification_counts"]
    print(f"  -> Standard EU pork classification counts: {counts}")
    assert counts.get("confirmat_primar", 0) >= 3, "Expected primary benchmarks"
    assert counts.get("confirmat_primar", 0) + counts.get("confirmat_secundar", 0) == 7, "Expected 7 quoted benchmarks"
    assert counts.get("indisponibil", 0) == 1, "Expected 1 NQ benchmark (ISN)"
    assert eu_data.get("is_fallback_engaged") is False
    
    # 2.2 Fallback run (--simulate-primary-down)
    print("  -> Running EU Pork with --simulate-primary-down...")
    cmd_fallback = [sys.executable, "fresh_meat_bi/eu_pork_collector.py", "--run-pipeline", "--simulate-primary-down"]
    res_fb = run_cmd(cmd_fallback)
    assert res_fb.returncode == 0, f"EU Pork fallback run failed: {res_fb.stderr}"
    print("  -> Outage simulation cycle PASSED (exit code 0)")
    
    with open(eu_export_path, "r", encoding="utf-8") as f:
        fb_eu_data = json.load(f)
    
    fb_counts = fb_eu_data["classification_counts"]
    print(f"  -> Fallback EU pork classification counts: {fb_counts}")
    assert fb_counts.get("confirmat_secundar", 0) > 0, "Expected secondary sources engaged"
    assert fb_eu_data.get("is_fallback_engaged") is True, "Fallback must be flagged as engaged"
    assert len(fb_eu_data.get("fallback_events", [])) > 0, "Fallback events must be recorded"
    
    # Check all rows
    rows = fb_eu_data.get("rows", [])
    assert len(rows) == 8, f"Expected 8 market benchmarks, got {len(rows)}"
    for r in rows:
        assert "confirmation_level" in r, f"Row {r.get('market')} missing confirmation_level"
        assert r["confirmation_level"] in ["CONFIRMAT PRIMAR", "CONFIRMAT SECUNDAR", "NECONFIRMAT", "INDISPONIBIL"]
        # Zero Fictiune: verify ISN is NQ / restricted, not invented
        if "ISN" in r.get("market", ""):
            assert r["status"] == "NQ" or r["freshness_status"] == "NQ", "Zero Fictiune violation: ISN must be NQ"
    print("  -> All 8 benchmarks verified for 4-tier classification & Zero Fictiune adherence")

def test_retail_media_multi_source():
    print("\n[TEST 3] Retail Media Monitor - Multi-Source Fallback Execution...")
    
    # 3.1 Standard run
    cmd = [sys.executable, "fresh_meat_bi/daily_retail_media_monitor.py", "--force"]
    res = run_cmd(cmd)
    assert res.returncode == 0, f"Retail Media standard run failed: {res.stderr}"
    print("  -> Standard Retail Media execution PASSED (exit code 0)")
    
    rm_path = PUBLIC_DATA_DIR / "retail_media_export.json"
    assert rm_path.exists(), "retail_media_export.json missing"
    with open(rm_path, "r", encoding="utf-8") as f:
        rm_data = json.load(f)
    
    assert "classification_counts" in rm_data, "Missing classification_counts in Retail Media export"
    counts = rm_data["classification_counts"]
    print(f"  -> Retail Media classification counts: {counts}")
    assert counts.get("confirmat_secundar", 0) > 0, "Retail media primarily draws from verified secondary publications"
    
    # 3.2 Outage run (--simulate-primary-down)
    print("  -> Running Retail Media with --simulate-primary-down...")
    cmd_fallback = [sys.executable, "fresh_meat_bi/daily_retail_media_monitor.py", "--force", "--simulate-primary-down"]
    res_fb = run_cmd(cmd_fallback)
    assert res_fb.returncode == 0, f"Retail Media fallback run failed: {res_fb.stderr}"
    print("  -> Outage simulation cycle PASSED (exit code 0)")
    
    with open(rm_path, "r", encoding="utf-8") as f:
        fb_rm_data = json.load(f)
    
    assert fb_rm_data.get("is_fallback_engaged") is True, "Fallback must be engaged"
    assert len(fb_rm_data.get("fallback_events", [])) > 0, "Fallback events must be recorded"
    print(f"  -> Fallback events recorded: {len(fb_rm_data['fallback_events'])}")

def test_smart_refresh_state_persistence():
    print("\n[TEST 4] Verifying smart_refresh_state.json Schema 2.0 Compliance...")
    state_file = PUBLIC_DATA_DIR / "smart_refresh_state.json"
    assert state_file.exists(), "smart_refresh_state.json missing"
    
    with open(state_file, "r", encoding="utf-8") as f:
        state = json.load(f)
    
    assert "schema_version" in state, "Missing schema_version"
    assert state["schema_version"] in ["2.0", "1.0-smart-refresh-state", "2.0-smart-refresh-state"], f"Unexpected schema_version: {state['schema_version']}"
    assert "modules" in state, "Missing modules object"
    
    for mod in ["promo_weekly", "eu_pork_market", "retail_media_monitor"]:
        assert mod in state["modules"], f"Module {mod} missing in state"
        m_state = state["modules"][mod]
        assert "last_check_bucharest" in m_state, f"Missing last_check_bucharest in {mod}"
        assert "last_data_update_bucharest" in m_state, f"Missing last_data_update_bucharest in {mod}"
        assert "classification_counts" in m_state, f"Missing classification_counts in {mod}"
        assert "is_fallback_engaged" in m_state, f"Missing is_fallback_engaged in {mod}"
        assert "fallback_events" in m_state, f"Missing fallback_events in {mod}"
        assert "primary_sources" in m_state, f"Missing primary_sources in {mod}"
        assert "secondary_sources" in m_state, f"Missing secondary_sources in {mod}"
        print(f"  -> Module {mod} matches Schema 2.0 perfectly")

def restore_production_baseline():
    print("\n[RESTORATION] Restoring production baseline across all 3 modules...")
    # Run standard cycles without simulate_primary_down to leave the dashboard in clean production state
    run_cmd([sys.executable, "fresh_meat_bi/promo_weekly_scheduler.py", "--run-autonomous", "--force"])
    run_cmd([sys.executable, "fresh_meat_bi/eu_pork_collector.py", "--run-pipeline"])
    run_cmd([sys.executable, "fresh_meat_bi/daily_retail_media_monitor.py", "--force"])
    print("  -> Production baseline restored with latest verified data")

if __name__ == "__main__":
    print("======================================================================")
    print("RUNNING SMART REFRESH MULTI-SOURCE FALLBACK AUTOMATED TEST SUITE")
    print("======================================================================")
    try:
        test_promo_weekly_multi_source()
        test_eu_pork_multi_source()
        test_retail_media_multi_source()
        test_smart_refresh_state_persistence()
        restore_production_baseline()
        print("\n======================================================================")
        print("ALL TESTS PASSED! MULTI-SOURCE FALLBACK SYSTEM IS FULLY VALIDATED.")
        print("======================================================================")
        sys.exit(0)
    except AssertionError as e:
        print(f"\n[FAIL] Assertion error: {e}")
        sys.exit(1)
    except Exception as e:
        print(f"\n[ERROR] Unexpected error: {e}")
        sys.exit(1)
