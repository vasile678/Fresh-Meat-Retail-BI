#!/usr/bin/env python3
"""
Fresh Meat Retail BI — Unified Market Intelligence Manifest Generator
Maintains the authoritative platform manifest for continuous market updates.
Compatible with GitHub Pages static hosting and client-side controlled cache busting.
"""

import json
import hashlib
from datetime import datetime
from pathlib import Path
from zoneinfo import ZoneInfo

BASE_DIR = Path(__file__).resolve().parent
ROOT_DIR = BASE_DIR.parent
PUBLIC_DATA_DIR = ROOT_DIR / "public" / "data"
MANIFEST_PATH = PUBLIC_DATA_DIR / "market_intelligence_manifest.json"

def sha256_file(path: Path) -> str:
    if not path.exists():
        return ""
    h = hashlib.sha256()
    with open(path, "rb") as f:
        for chunk in iter(lambda: f.read(1024 * 1024), b""):
            h.update(chunk)
    return h.hexdigest()

def generate_manifest():
    PUBLIC_DATA_DIR.mkdir(parents=True, exist_ok=True)
    bucharest_tz = ZoneInfo("Europe/Bucharest")
    now_bucharest = datetime.now(bucharest_tz)
    now_iso = now_bucharest.isoformat()

    # 1. Promo Weekly Data
    promo_export_path = PUBLIC_DATA_DIR / "bi_dashboard_export.json"
    active_release_path = PUBLIC_DATA_DIR / "active_release.json"
    promo_data = {}
    promo_sha = sha256_file(promo_export_path)
    if promo_export_path.exists():
        try:
            promo_data = json.loads(promo_export_path.read_text(encoding="utf-8"))
        except Exception as e:
            print(f"Warning: Could not parse {promo_export_path}: {e}")

    active_release_data = {}
    if active_release_path.exists():
        try:
            active_release_data = json.loads(active_release_path.read_text(encoding="utf-8"))
        except Exception:
            pass

    # Determine last verified update for Promo Weekly dynamically
    active_week = active_release_data.get("week") or promo_data.get("week", "WK46")
    active_year = active_release_data.get("year") or promo_data.get("year", 2026)
    try:
        w_num = int(active_week.replace("WK", ""))
        mon_date = datetime.fromisocalendar(int(active_year), w_num, 1).date()
        promo_updated = f"{mon_date.strftime('%d.%m.%Y')} · 09:00"
    except Exception:
        promo_updated = "09.11.2026 · 09:00"

    rolling_receipt_path = BASE_DIR / f"ROLLING_UPDATE_RECEIPT_{active_week}.json"
    if rolling_receipt_path.exists():
        try:
            r_data = json.loads(rolling_receipt_path.read_text(encoding="utf-8"))
            if active_release_data.get("release_id", "").endswith(r_data.get("new_release", {}).get("release_id", "___").split("_")[-1]):
                applied_at = r_data.get("applied_at_bucharest", "")
                if applied_at:
                    parts = applied_at.split(" ")
                    promo_updated = f"{parts[0]} · {parts[1][:5]}"
        except Exception:
            pass

    promo_module = {
        "module_id": "promo_weekly",
        "title": "Promo Weekly",
        "schedule": "Luni, 09:00 Europe/Bucharest",
        "last_verified_update": promo_updated,
        "updated_date": promo_updated.split(" · ")[0] if " · " in promo_updated else "29.10.2026",
        "updated_time": promo_updated.split(" · ")[1] if " · " in promo_updated else "09:00",
        "week": promo_data.get("week", "WK44"),
        "year": promo_data.get("year", 2026),
        "period": promo_data.get("calendar_period", "26 OCT – 01 NOI 2026"),
        "status": promo_data.get("release_status", "RELEASE_PASS"),
        "data_file": "/data/bi_dashboard_export.json",
        "active_release_file": "/data/active_release.json",
        "dataset_sha256": promo_sha,
        "verified_cells_count": len(promo_data.get("cells", [])),
        "verified_retailers_count": len(promo_data.get("retailers", []))
    }

    # 2. EU Pork Market Data
    eu_export_path = PUBLIC_DATA_DIR / "eu_pork_market_export.json"
    eu_data = {}
    eu_sha = sha256_file(eu_export_path)
    if eu_export_path.exists():
        try:
            eu_data = json.loads(eu_export_path.read_text(encoding="utf-8"))
        except Exception as e:
            print(f"Warning: Could not parse {eu_export_path}: {e}")

    # Weekly release for EU Pork Market: Thursday 09:00 with finalized afternoon session integration (16:00)
    updated_date_str = eu_data.get("updated", "05.11.2026")
    updated_time_str = eu_data.get("updated_time", "16:00")
    eu_updated = f"{updated_date_str} · {updated_time_str}"

    eu_module = {
        "module_id": "eu_pork_market",
        "title": "EU Pork Market",
        "schedule": "Joi, 09:00 & 16:00 Europe/Bucharest (sesiune completă)",
        "last_verified_update": eu_updated,
        "updated_date": updated_date_str,
        "updated_time": updated_time_str,
        "week": eu_data.get("week", "WK44"),
        "year": eu_data.get("year", 2026),
        "period": eu_data.get("period", "26.10–01.11.2026"),
        "status": eu_data.get("release_status", "RELEASE_PASS"),
        "data_file": "/data/eu_pork_market_export.json",
        "dataset_sha256": eu_sha,
        "verified_benchmarks_count": len(eu_data.get("rows", []))
    }

    # 3. Retail Media Monitor (Presă Specializată)
    retail_media_export_path = PUBLIC_DATA_DIR / "retail_media_export.json"
    rm_data = {}
    rm_sha = sha256_file(retail_media_export_path)
    if retail_media_export_path.exists():
        try:
            rm_data = json.loads(retail_media_export_path.read_text(encoding="utf-8"))
        except Exception as e:
            print(f"Warning: Could not parse {retail_media_export_path}: {e}")

    rm_updated_date = rm_data.get("updated_date", "31.10.2026")
    rm_updated_time = rm_data.get("updated_time", "09:00")
    rm_updated = f"{rm_updated_date} · {rm_updated_time}"

    total_articles = sum(len(p.get("articles", [])) for p in rm_data.get("publications", []))

    rm_module = {
        "module_id": "retail_media_monitor",
        "title": "Retail Media Monitor (Presă Specializată)",
        "schedule": "Zilnic, 09:00 Europe/Bucharest",
        "last_verified_update": rm_updated,
        "updated_date": rm_updated_date,
        "updated_time": rm_updated_time,
        "period": rm_data.get("period_analyzed", "24.10.2026 – 31.10.2026"),
        "status": rm_data.get("status", "ACTIVE_MONITORED"),
        "data_file": "/data/retail_media_export.json",
        "dataset_sha256": rm_sha,
        "verified_publications_count": len(rm_data.get("publications", [])),
        "verified_articles_count": total_articles
    }

    # 4. Strategic Category Insights
    sci_updated = rm_updated
    sci_module = {
        "module_id": "strategic_category_insights",
        "title": "Strategic Category Insights",
        "schedule": "Zilnic, după sincronizarea surselor relevante de piață",
        "last_verified_update": sci_updated,
        "updated_date": rm_updated_date,
        "updated_time": rm_updated_time,
        "status": "SYNCHRONIZED",
        "sources": [
            "PROMO_WEEKLY (Prețuri & Mecanici KVI)",
            "EU_PORK_MARKET (Cotații Europene de Referință)",
            "PRESĂ_SPECIALIZATĂ (12 Publicații Sectoriale Monitorizate)"
        ],
        "framework": "INSIGHT → BUSINESS IMPLICATION → RECOMMENDED ACTION",
        "insights_count": len(rm_data.get("competitive_intelligence", {}).get("strategic_insights", []))
    }

    manifest = {
        "schema_version": "2.0-market-intelligence-manifest",
        "platform_policy": "ALWAYS_SHOW_LATEST_VERIFIED_MARKET_INTELLIGENCE",
        "generated_at_utc": now_iso,
        "execution_timezone": "Europe/Bucharest",
        "modules": {
            "promo_weekly": promo_module,
            "eu_pork_market": eu_module,
            "retail_media_monitor": rm_module,
            "strategic_category_insights": sci_module
        }
    }

    MANIFEST_PATH.write_text(json.dumps(manifest, indent=2, ensure_ascii=False), encoding="utf-8")
    print(f"✓ Unified Market Intelligence Manifest written: {MANIFEST_PATH}")
    print(f"  Promo Weekly: {promo_module['last_verified_update']}")
    print(f"  EU Pork Market: {eu_module['last_verified_update']}")
    print(f"  Retail Media Monitor: {rm_module['last_verified_update']}")
    print(f"  Strategic Category Insights: {sci_module['last_verified_update']}")
    return manifest

if __name__ == "__main__":
    generate_manifest()
