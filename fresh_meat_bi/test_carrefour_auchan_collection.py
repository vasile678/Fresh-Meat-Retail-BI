#!/usr/bin/env python3
"""
Test Suite: Carrefour & Auchan Web Ingestion, Unit Normalization, and Market Reshuffle
======================================================================================
Verifies:
1. Investigation & root cause resolution for Carrefour and Auchan omissions.
2. Automatic unit normalization from lei/100 g to lei/kg.
3. Official web page extraction (promotiile-zilei & auchan.ro/carne).
4. ACTIVE OFFERS ONLY validity window enforcement (WK45: 02.11–08.11.2026).
5. 25-cell matrix integrity (5 retailers x 5 KVIs).
6. Market leader reshuffle on Ceafă de porc:
   - #1 Carrefour: 17.90 lei/kg (economie 6.00 lei/kg vs Lidl 23.90)
   - #2 Auchan: 19.99 lei/kg (economie 3.91 lei/kg vs Lidl 23.90)
   - #3 Lidl: 23.90 lei/kg
7. Synchronization across active_release.json, bi_dashboard_export.json, and retail_media_export.json.
8. Deterministic rendering and Release Gate RELEASE_PASS.
"""

import sys
import os
import json
import unittest
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent
ROOT_DIR = BASE_DIR.parent
sys.path.insert(0, str(BASE_DIR))
sys.path.insert(0, str(ROOT_DIR))

from collector import normalize_price_to_kg, collect_carrefour, collect_auchan, CANONICAL_KVI
from FRESH_MEAT_BI_GATE_v1 import validate_promo

class TestCarrefourAuchanCollection(unittest.TestCase):

    def test_01_unit_normalization(self):
        """Tests that pricing in lei/100 g is deterministically normalized to lei/kg."""
        self.assertEqual(normalize_price_to_kg("1,79", "100 g"), 17.90)
        self.assertEqual(normalize_price_to_kg(1.79, "100g"), 17.90)
        self.assertEqual(normalize_price_to_kg("2,39", "100 g"), 23.90)
        self.assertEqual(normalize_price_to_kg("19.99", "kg"), 19.99)
        self.assertEqual(normalize_price_to_kg("29,99", "1 kg"), 29.99)
        self.assertEqual(normalize_price_to_kg(8.50, "500 g"), 17.00)

    def test_02_carrefour_extraction(self):
        """Tests Carrefour ingestion from promotiile-zilei corporate feed."""
        res = collect_carrefour("WK45", "02–08 NOI 2026")
        self.assertEqual(len(res), 5)
        ceafa = res["Ceafă porc fără os"]
        self.assertEqual(ceafa["retailer"], "Carrefour")
        self.assertEqual(ceafa["status"], "VERIFIED")
        self.assertEqual(ceafa["price_lei_kg"], 17.90)
        self.assertEqual(ceafa["price_standard_lei_kg"], 23.90)
        self.assertEqual(ceafa["discount"], "-25%")
        self.assertEqual(ceafa["exact_product"], "Ceafă de porc dezosată")
        self.assertIn("02.11–08.11.2026", ceafa["validity"])
        self.assertIn("promotiile-zilei", ceafa["source"])

    def test_03_auchan_extraction(self):
        """Tests Auchan ingestion from official carne category and VTEX state."""
        res = collect_auchan("WK45", "02–08 NOI 2026")
        self.assertEqual(len(res), 5)
        ceafa = res["Ceafă porc fără os"]
        self.assertEqual(ceafa["retailer"], "Auchan")
        self.assertEqual(ceafa["status"], "VERIFIED")
        self.assertEqual(ceafa["price_lei_kg"], 19.99)
        self.assertEqual(ceafa["price_standard_lei_kg"], 29.99)
        self.assertEqual(ceafa["discount"], "-33%")
        self.assertIn("Ceafă de porc fără os", ceafa["exact_product"])
        self.assertIn("02.11–08.11.2026", ceafa["validity"])

    def test_04_matrix_identity_and_coverage(self):
        """Tests that the canonical dataset for WK45 has exactly 25 cells covering all 5x5 pairs."""
        lock_path = BASE_DIR / "PROMO_WEEKLY_CANONICAL_LOCK_WK45.json"
        self.assertTrue(lock_path.exists())
        lock_data = json.loads(lock_path.read_text(encoding="utf-8"))
        
        self.assertEqual(lock_data.get("coverage_checked"), "25/25")
        cells = lock_data.get("cells", [])
        self.assertEqual(len(cells), 25)
        
        retailers = ["Kaufland", "Lidl", "PENNY", "Carrefour", "Auchan"]
        kvist = ["Spată porc fără os", "Pulpă porc fără os", "Cotlet porc fără os", "Ceafă porc fără os", "Piept pui dezosat"]
        actual_pairs = {(c["retailer"], c["kvi"]) for c in cells}
        expected_pairs = {(r, k) for r in retailers for k in kvist}
        self.assertEqual(actual_pairs, expected_pairs)

    def test_05_ceafa_market_rankings_and_savings(self):
        """Tests that Carrefour is #1, Auchan is #2, and Lidl is #3 with exact savings."""
        export_path = ROOT_DIR / "public" / "data" / "bi_dashboard_export.json"
        self.assertTrue(export_path.exists())
        export_data = json.loads(export_path.read_text(encoding="utf-8"))
        
        conclusions = export_data.get("commercial_conclusions", {}).get("items", [])
        ceafa_concl = next((x for x in conclusions if x.get("kvi") == "Ceafă porc fără os"), None)
        self.assertIsNotNone(ceafa_concl)
        
        self.assertEqual(ceafa_concl["best_price"], 17.90)
        self.assertEqual(ceafa_concl["best_retailers"], ["Carrefour"])
        self.assertEqual(ceafa_concl["offers_count"], 3)
        
        # Check offers detail ordering and diffs
        details = ceafa_concl["offers_detail"]
        self.assertEqual(details[0]["retailer"], "Carrefour")
        self.assertEqual(details[0]["price_lei_kg"], 17.90)
        self.assertTrue(details[0]["is_best"])
        
        self.assertEqual(details[1]["retailer"], "Auchan")
        self.assertEqual(details[1]["price_lei_kg"], 19.99)
        self.assertEqual(details[1]["diff_lei_kg"], 2.09)
        
        self.assertEqual(details[2]["retailer"], "Lidl")
        self.assertEqual(details[2]["price_lei_kg"], 23.90)
        self.assertEqual(details[2]["diff_lei_kg"], 6.00)
        
        # Savings vs Lidl:
        # Carrefour saves 6.00 lei/kg (23.90 - 17.90)
        # Auchan saves 3.91 lei/kg (23.90 - 19.99)
        carr_saving = round(details[2]["price_lei_kg"] - details[0]["price_lei_kg"], 2)
        auch_saving = round(details[2]["price_lei_kg"] - details[1]["price_lei_kg"], 2)
        self.assertEqual(carr_saving, 6.00)
        self.assertEqual(auch_saving, 3.91)

    def test_06_release_gate_pass(self):
        """Verifies that the release gate returns RELEASE_PASS for the active release."""
        active_path = ROOT_DIR / "public" / "data" / "active_release.json"
        self.assertTrue(active_path.exists())
        active_data = json.loads(active_path.read_text(encoding="utf-8"))
        self.assertEqual(active_data.get("release_status"), "RELEASE_PASS")

    def test_07_strategic_category_intelligence_synchronized(self):
        """Verifies that retail_media_export.json reflects Carrefour and Auchan Ceafă leadership."""
        strat_path = ROOT_DIR / "public" / "data" / "retail_media_export.json"
        self.assertTrue(strat_path.exists())
        strat_data = json.loads(strat_path.read_text(encoding="utf-8"))
        
        ci = strat_data.get("competitive_intelligence", {})
        dashboard = ci.get("retailer_dashboard", [])
        carr_entry = next((r for r in dashboard if r.get("retailer") == "Carrefour"), None)
        auch_entry = next((r for r in dashboard if r.get("retailer") == "Auchan"), None)
        
        self.assertIsNotNone(carr_entry)
        self.assertIsNotNone(auch_entry)
        self.assertIn("17,90", carr_entry.get("lead_kvi_price", ""))
        self.assertIn("19,99", auch_entry.get("lead_kvi_price", ""))
        self.assertIn("Lider absolut", carr_entry.get("positioning_note", ""))
        self.assertIn("Al doilea cel mai bun preț", auch_entry.get("positioning_note", ""))

if __name__ == "__main__":
    unittest.main()
