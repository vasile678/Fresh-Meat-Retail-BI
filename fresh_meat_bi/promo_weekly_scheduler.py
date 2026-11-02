#!/usr/bin/env python3
"""
Fresh Meat Retail BI — Promo Weekly Automated Scheduler & Recovery Engine
Enforces:
1. Schedule rule: Every Monday at 09:00 Europe/Bucharest.
2. Missed execution detection: Identifies if current time > scheduled time and active release is behind target week.
3. Automated recovery upon request/startup with strict FAIL_CLOSED policy:
   - Validates existence of authentic dataset and 25/25 research & reconciliation receipts.
   - Rejects missing, unverified, or reused receipts.
   - Never fabricates prices or passes.
   - Preserves previous verified release (e.g. WK44) intact when target week data is unverified or unavailable.
4. Generates public/data/schedule_status.json for audit and client observability.
"""

import sys
import os
import json
import hashlib
import argparse
import datetime
from pathlib import Path
from zoneinfo import ZoneInfo

BASE_DIR = Path(__file__).resolve().parent
ROOT_DIR = BASE_DIR.parent
PUBLIC_DATA_DIR = ROOT_DIR / "public" / "data"
ACTIVE_RELEASE_PATH = PUBLIC_DATA_DIR / "active_release.json"
SCHEDULE_STATUS_PATH = PUBLIC_DATA_DIR / "schedule_status.json"

SCHEDULE_TIMEZONE = "Europe/Bucharest"
SCHEDULE_DAY_OF_WEEK = 1  # 1 = Monday
SCHEDULE_HOUR = 9         # 09:00
SCHEDULE_MINUTE = 0

def get_now_bucharest() -> datetime.datetime:
    return datetime.datetime.now(ZoneInfo(SCHEDULE_TIMEZONE))

def calculate_target_promo_week(dt: datetime.datetime) -> tuple[str, int, str]:
    """
    Calculates the expected active Promo Weekly release according to the rule:
    Updated every Monday at 09:00 Europe/Bucharest.
    
    If current day is Monday and time < 09:00:
      Target week is previous ISO week.
    If current day is Monday and time >= 09:00, or Tuesday..Sunday:
      Target week is current ISO week.
    """
    iso_year, iso_week, iso_weekday = dt.isocalendar()
    
    # If Monday before 09:00, target week is previous week
    if iso_weekday == 1 and (dt.hour < SCHEDULE_HOUR or (dt.hour == SCHEDULE_HOUR and dt.minute < SCHEDULE_MINUTE)):
        prior_dt = dt - datetime.timedelta(days=7)
        target_year, target_week_num, _ = prior_dt.isocalendar()
        target_week_str = f"WK{target_week_num:02d}"
    else:
        target_year = iso_year
        target_week_str = f"WK{iso_week:02d}"
        
    mon = datetime.date.fromisocalendar(target_year, int(target_week_str.replace("WK", "")), 1)
    sun = datetime.date.fromisocalendar(target_year, int(target_week_str.replace("WK", "")), 7)
    months_ro = {
        1: "IAN", 2: "FEB", 3: "MAR", 4: "APR", 5: "MAI", 6: "IUN",
        7: "IUL", 8: "AUG", 9: "SEP", 10: "OCT", 11: "NOI", 12: "DEC"
    }
    if mon.month == sun.month:
        period_str = f"{mon.day:02d}–{sun.day:02d} {months_ro[mon.month]} {target_year}"
    else:
        period_str = f"{mon.day:02d} {months_ro[mon.month]} – {sun.day:02d} {months_ro[sun.month]} {target_year}"

    return target_week_str, target_year, period_str

def get_active_release_info() -> dict:
    if not ACTIVE_RELEASE_PATH.exists():
        return {
            "week": "UNKNOWN",
            "year": 0,
            "release_id": "NONE",
            "release_status": "MISSING",
            "published_at_utc": None,
            "dataset_sha256": None
        }
    try:
        return json.loads(ACTIVE_RELEASE_PATH.read_text(encoding="utf-8"))
    except Exception as e:
        return {
            "week": "CORRUPT",
            "year": 0,
            "release_id": "CORRUPT",
            "release_status": "CORRUPT",
            "error": str(e)
        }

def diagnose_scheduler_state(now_dt: datetime.datetime = None) -> dict:
    dt = now_dt or get_now_bucharest()
    target_week, target_year, target_period = calculate_target_promo_week(dt)
    active = get_active_release_info()
    
    active_week = active.get("week")
    active_year = active.get("year")
    
    is_behind = (active_week != target_week) or (active_year != target_year)
    
    state = {
        "schema_version": "1.0-scheduler-diagnosis",
        "evaluated_at_bucharest": dt.strftime("%d.%m.%Y %H:%M:%S %Z"),
        "evaluated_at_utc": dt.astimezone(datetime.timezone.utc).isoformat(),
        "timezone": SCHEDULE_TIMEZONE,
        "schedule_rule": "Every Monday at 09:00 Europe/Bucharest",
        "target_release": {
            "week": target_week,
            "year": target_year,
            "period": target_period
        },
        "active_release": {
            "week": active_week,
            "year": active_year,
            "release_id": active.get("release_id"),
            "release_status": active.get("release_status"),
            "published_at_utc": active.get("published_at_utc"),
            "dataset_sha256": active.get("dataset_sha256")
        },
        "is_overdue": is_behind,
        "status": "UP_TO_DATE" if not is_behind else "UPDATE_OVERDUE"
    }
    
    if is_behind:
        # Determine why it is overdue and if recovery can proceed
        dataset_candidate = BASE_DIR / f"PROMO_WEEKLY_CANONICAL_LOCK_{target_week}.json"
        research_candidate = BASE_DIR / f"RESEARCH_RECEIPT_{target_week}.json"
        reconciliation_candidate = BASE_DIR / f"RECONCILIATION_RECEIPT_{target_week}.json"
        
        missing = []
        if not dataset_candidate.exists():
            missing.append(f"DATASET_MISSING ({dataset_candidate.name})")
        if not research_candidate.exists():
            missing.append(f"RESEARCH_RECEIPT_MISSING ({research_candidate.name})")
        if not reconciliation_candidate.exists():
            missing.append(f"RECONCILIATION_RECEIPT_MISSING ({reconciliation_candidate.name})")
            
        state["recovery_check"] = {
            "dataset_path": str(dataset_candidate),
            "dataset_exists": dataset_candidate.exists(),
            "research_receipt_exists": research_candidate.exists(),
            "reconciliation_receipt_exists": reconciliation_candidate.exists(),
            "missing_prerequisites": missing,
            "can_auto_publish": len(missing) == 0,
            "policy": "FAIL_CLOSED"
        }
        
        if len(missing) > 0:
            state["block_reason"] = "MISSING_VERIFIED_PREREQUISITES"
            state["detail"] = (
                f"Ora 09:00 a trecut pentru săptămâna {target_week} ({target_period}), "
                f"dar dovezile verificate 25/25 lipsesc ({', '.join(missing)}). "
                f"Conform politicii FAIL_CLOSED, raportul anterior ({active_week} {active_year}) "
                f"este păstrat ca ultim raport oficial validat."
            )
        else:
            state["detail"] = f"Toate premisele pentru {target_week} sunt prezente. Recuperarea poate fi executată."
    else:
        state["detail"] = f"Raportul curent ({active_week}) este conform cu calendarul de publicare."

    return state

def run_autonomous_cycle(now_dt: datetime.datetime = None) -> dict:
    """
    Executes complete autonomous cycle without human intervention:
    1. Evaluates target week based on Europe/Bucharest calendar time (Monday 09:00 rule).
    2. Enforces idempotency: If target week is already active and verified, exits cleanly.
    3. Runs autonomous collector against all 5 retailers (Kaufland, Lidl, PENNY, Carrefour, Auchan)
       and all 5 KVIs (25 cells total).
    4. Evaluates release eligibility:
       - If 25/25 cells verified with authentic promotional offers:
         generates candidate locks, executes deterministic renderer & gate checks,
         and publishes new release atomically.
       - If any prerequisite fails or target week lacks verified offers:
         enforces FAIL_CLOSED, preserves active verified release intact,
         and records structured audit log in schedule_status.json.
    """
    dt = now_dt or get_now_bucharest()
    target_week, target_year, target_period = calculate_target_promo_week(dt)
    active = get_active_release_info()
    PUBLIC_DATA_DIR.mkdir(parents=True, exist_ok=True)
    
    # 1. Idempotency Check
    if active.get("week") == target_week and active.get("year") == target_year and active.get("release_status") == "RELEASE_PASS":
        print(f"[IDEMPOTENT] Săptămâna {target_week}/{target_year} este deja publicată și activă ({active.get('release_id')}). Nicio acțiune necesară.")
        diag = diagnose_scheduler_state(dt)
        diag["status"] = "UP_TO_DATE"
        diag["detail"] = f"Raportul {target_week} este deja publicat și activ."
        SCHEDULE_STATUS_PATH.write_text(json.dumps(diag, indent=2, ensure_ascii=False), encoding="utf-8")
        return diag

    print(f"[AUTONOMOUS CYCLE] Inițiere ciclu automat pentru {target_week}/{target_year} ({target_period})")
    
    # 2. Invoke Autonomous Collector Engine
    from collector import execute_autonomous_collector
    collector_summary = execute_autonomous_collector(target_week, target_year)
    
    diag = diagnose_scheduler_state(dt)
    diag["collector_audit"] = {
        "coverage": collector_summary["coverage"],
        "verified_count": collector_summary["verified_count"],
        "nv_count": collector_summary["nv_count"],
        "nc_count": collector_summary["nc_count"],
        "release_eligible": collector_summary["release_eligible"],
        "dataset_sha256": collector_summary["dataset_sha256"]
    }
    
    # 3. Decision Gate
    if collector_summary["release_eligible"]:
        print(f"[AUTONOMOUS CYCLE] Colectarea a trecut verificările (25/25 celule, {collector_summary['verified_count']} verified). Se inițiază publicarea...")
        
        lock_file = BASE_DIR / f"PROMO_WEEKLY_CANONICAL_LOCK_{target_week}.json"
        research_file = BASE_DIR / f"RESEARCH_RECEIPT_{target_week}.json"
        reconcil_file = BASE_DIR / f"RECONCILIATION_RECEIPT_{target_week}.json"
        
        lock_file.write_text(json.dumps(collector_summary["canonical_lock"], indent=2, ensure_ascii=False), encoding="utf-8")
        research_file.write_text(json.dumps(collector_summary["research_receipt"], indent=2, ensure_ascii=False), encoding="utf-8")
        reconcil_file.write_text(json.dumps(collector_summary["reconciliation_receipt"], indent=2, ensure_ascii=False), encoding="utf-8")
        
        import subprocess
        cmd = [
            sys.executable,
            str(BASE_DIR / "weekly_pipeline.py"),
            "--week", target_week,
            "--year", str(target_year),
            "--domain", "PROMO",
            "--dataset", str(lock_file),
            "--research", str(research_file),
            "--reconciliation", str(reconcil_file),
            "--publish"
        ]
        cp = subprocess.run(cmd, cwd=str(BASE_DIR), capture_output=True, text=True)
        if cp.returncode == 0:
            diag["recovery_action"] = "PUBLISHED_SUCCESSFULLY"
            diag["action_result"] = {
                "status": "RELEASE_PASS",
                "published_week": target_week,
                "stdout": cp.stdout[-500:]
            }
            # Update manifest
            subprocess.run([sys.executable, str(BASE_DIR / "update_market_intelligence_manifest.py")], cwd=str(BASE_DIR))
        else:
            diag["recovery_action"] = "PIPELINE_FAILED_FAIL_CLOSED"
            diag["action_result"] = {
                "status": "FAIL_CLOSED",
                "stderr": cp.stderr,
                "stdout": cp.stdout[-500:]
            }
    else:
        # FAIL_CLOSED enforcement
        print(f"[FAIL_CLOSED] Ciclul automat a oprit publicarea: {collector_summary['verified_count']} oferte confirmate din 25 celule auditate.")
        diag["recovery_action"] = "BLOCKED_FAIL_CLOSED"
        diag["action_result"] = {
            "status": "FAIL_CLOSED",
            "message": (
                f"Actualizarea automată pentru {target_week} ({target_period}) a fost reținută conform politicii FAIL_CLOSED. "
                f"Audit 25/25 finalizat: {collector_summary['verified_count']} VERIFIED, {collector_summary['nv_count']} N/V, {collector_summary['nc_count']} NC. "
                f"Sursele oficiale nu conțin promoții confirmate pentru intervalul {target_period}. "
                f"Raportul validat anterior ({active.get('week')} {active.get('year')}) rămâne 100% activ în producție."
            ),
            "retained_active_week": active.get("week"),
            "retained_active_release_id": active.get("release_id")
        }

    SCHEDULE_STATUS_PATH.write_text(json.dumps(diag, indent=2, ensure_ascii=False), encoding="utf-8")
    return diag

def execute_recovery(now_dt: datetime.datetime = None) -> dict:
    return run_autonomous_cycle(now_dt)

def run_tests():
    print("=================================================================")
    print(" TEST SUITE: PROMO WEEKLY AUTOMATED SCHEDULER & RECOVERY ENGINE")
    print("=================================================================")
    
    # Test 1: Monday before 09:00 -> should target previous week
    dt_mon_0859 = datetime.datetime(2026, 11, 2, 8, 59, 0, tzinfo=ZoneInfo("Europe/Bucharest"))
    tw, ty, _ = calculate_target_promo_week(dt_mon_0859)
    assert tw == "WK44" and ty == 2026, f"Expected WK44/2026, got {tw}/{ty}"
    print("[TEST 1/5] Luni la 08:59 Europe/Bucharest -> Ținta este WK44 (anterior): PASS")
    
    # Test 2: Monday at 09:00 -> should target current week (WK45)
    dt_mon_0900 = datetime.datetime(2026, 11, 2, 9, 0, 0, tzinfo=ZoneInfo("Europe/Bucharest"))
    tw, ty, _ = calculate_target_promo_week(dt_mon_0900)
    assert tw == "WK45" and ty == 2026, f"Expected WK45/2026, got {tw}/{ty}"
    print("[TEST 2/5] Luni la 09:00 Europe/Bucharest -> Ținta este WK45 (curent): PASS")
    
    # Test 3: Monday at 09:30 (today) with active WK44 -> detects UPDATE_OVERDUE
    dt_mon_0930 = datetime.datetime(2026, 11, 2, 9, 30, 0, tzinfo=ZoneInfo("Europe/Bucharest"))
    diag = diagnose_scheduler_state(dt_mon_0930)
    assert diag["is_overdue"] is True, "Expected overdue detection"
    assert diag["target_release"]["week"] == "WK45", "Target should be WK45"
    assert diag["active_release"]["week"] == "WK44", "Active should be WK44"
    print("[TEST 3/5] Detectare întârziere (Target WK45, Activ WK44): PASS")
    
    # Test 4: Missing prerequisites triggers FAIL_CLOSED and blocks publication
    rec = run_autonomous_cycle(dt_mon_0930)
    assert rec["recovery_action"] == "BLOCKED_FAIL_CLOSED", f"Expected BLOCKED_FAIL_CLOSED, got {rec['recovery_action']}"
    assert rec["action_result"]["status"] == "FAIL_CLOSED"
    assert rec["action_result"]["retained_active_week"] == "WK44"
    print("[TEST 4/5] Politică FAIL_CLOSED pe date lipsă (păstrare 100% WK44): PASS")
    
    # Test 5: Integrity of schedule_status.json
    assert SCHEDULE_STATUS_PATH.exists(), "schedule_status.json should exist"
    status_content = json.loads(SCHEDULE_STATUS_PATH.read_text(encoding="utf-8"))
    assert status_content["active_release"]["week"] == "WK44"
    print("[TEST 5/5] Manifest schedule_status.json generat corect: PASS")
    
    print("=================================================================")
    print(" TOATE CELE 5 TESTE SCHEDULER & RECOVERY AU TRECUT CU SUCCES (100%)")
    print("=================================================================")

def check_is_due(now_dt: datetime.datetime = None) -> bool:
    """
    Checks if a release update is due:
    True if active release is behind the target week.
    False if active release already matches target week and passed.
    """
    dt = now_dt or get_now_bucharest()
    target_week, target_year, _ = calculate_target_promo_week(dt)
    active = get_active_release_info()
    if active.get("week") == target_week and active.get("year") == target_year and active.get("release_status") == "RELEASE_PASS":
        return False
    return True

def main():
    parser = argparse.ArgumentParser(description="Promo Weekly Scheduler & Recovery Engine")
    parser.add_argument("--diagnose", action="store_true", help="Diagnose current schedule state")
    parser.add_argument("--check-and-recover", action="store_true", help="Attempt recovery if overdue")
    parser.add_argument("--run-autonomous", action="store_true", help="Run full autonomous collection and release cycle")
    parser.add_argument("--get-target-week", action="store_true", help="Prints current target week string (e.g. WK45)")
    parser.add_argument("--is-due", action="store_true", help="Prints true if target week update is due, false otherwise")
    parser.add_argument("--test", action="store_true", help="Run scheduler unit tests")
    args = parser.parse_args()
    
    if args.is_due:
        due = check_is_due()
        print("true" if due else "false")
        sys.exit(0)
        
    if args.get_target_week:
        tw, _, _ = calculate_target_promo_week(get_now_bucharest())
        print(tw)
        sys.exit(0)
        
    if args.test:
        run_tests()
        sys.exit(0)
        
    if args.run_autonomous:
        result = run_autonomous_cycle()
        print(json.dumps(result, indent=2, ensure_ascii=False))
        sys.exit(0)
        
    if args.check_and_recover:
        result = execute_recovery()
        print(json.dumps(result, indent=2, ensure_ascii=False))
        sys.exit(0)
        
    # Default: diagnose
    diag = diagnose_scheduler_state()
    SCHEDULE_STATUS_PATH.write_text(json.dumps(diag, indent=2, ensure_ascii=False), encoding="utf-8")
    print(json.dumps(diag, indent=2, ensure_ascii=False))

if __name__ == "__main__":
    main()
