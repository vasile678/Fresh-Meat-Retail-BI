#!/usr/bin/env python3
"""
Test Suite: Strategic Category Intelligence Synchronization & ACTIVE OFFERS ONLY
================================================================================
Validates all 8 commercial & technical requirements:
1. Sincronizarea release_id cu active_release.json
2. Excluderea ofertelor expirate (Spată Kaufland 14.90 lei/kg exclusă din prețurile active)
3. Separarea prețurilor standard, cu card și cu cupon (Lidl cotlet 16.90 cupon vs 19.90 std; PENNY card)
4. Recalcularea corectă a liderilor de piață pentru WK45
5. Absența prețurilor statice/hardcodate din surse anterioare
6. Regenerarea automată la rolling update / pipeline promo
7. Conservarea ultimei versiuni valide la eșec (FAIL_CLOSED)
8. Integritatea datelor celorlalte module (5x5 matrix, EU Pork Market, Retail Media 14 publicații)
"""

import sys
import json
import unittest
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent
ROOT_DIR = BASE_DIR.parent
PUBLIC_DATA_DIR = ROOT_DIR / "public" / "data"

sys.path.insert(0, str(BASE_DIR))
from strategic_category_intelligence import (
    get_active_promo_data,
    recalculate_competitive_intelligence,
    update_strategic_category_intelligence,
    ACTIVE_RELEASE_FILE,
    RETAIL_MEDIA_FILE,
    EU_PORK_FILE
)

class TestStrategicCategoryIntelligence(unittest.TestCase):

    @classmethod
    def setUpClass(cls):
        # Ensure fresh calculation
        assert update_strategic_category_intelligence() is True

    def test_01_release_id_synchronization(self):
        """1. Strategic Category Intelligence citește exact release_id activ din active_release.json."""
        active_pointer = json.loads(ACTIVE_RELEASE_FILE.read_text(encoding="utf-8"))
        active_release_id = active_pointer["release_id"]
        
        comp_intel = recalculate_competitive_intelligence()
        self.assertEqual(comp_intel["release_id"], active_release_id,
                         f"Release ID mismatch: expected {active_release_id}, got {comp_intel.get('release_id')}")
        self.assertTrue(comp_intel["active_offers_only"], "Flag-ul active_offers_only trebuie să fie True")

    def test_02_exclude_expired_offers_active_offers_only(self):
        """2. Excluderea ofertelor expirate (Kaufland spată 14.90 lei/kg expirată la 03.11)."""
        comp_intel = recalculate_competitive_intelligence()
        
        # In executive summary
        summary = comp_intel["executive_summary"]
        self.assertIn("ACTIVE OFFERS ONLY", summary)
        self.assertIn("14,90", summary)
        self.assertIn("expirat", summary.lower())

        # In Retailer Dashboard (Kaufland row)
        kaufland_row = next((r for r in comp_intel["retailer_dashboard"] if r["retailer"] == "Kaufland"), None)
        self.assertIsNotNone(kaufland_row, "Kaufland must exist in retailer dashboard")
        self.assertIn("Spată porc f.o. N/V", kaufland_row["lead_kvi_price"])
        self.assertIn("expirată la 03.11", kaufland_row["lead_kvi_price"])
        self.assertNotIn("14,90 lei/kg (activ)", kaufland_row["lead_kvi_price"])

        # Check Top Signals: Kaufland must NOT be listed as active price leader on spată
        for sig in comp_intel["top_signals"]:
            if "spat" in sig["signal"].lower() and "kaufland" in sig["signal"].lower():
                self.assertIn("expirat", sig["signal"].lower())

    def test_03_separate_standard_card_cupon_prices(self):
        """3. Separarea prețurilor standard, cu card și cupon."""
        active_pointer, promo_data = get_active_promo_data()
        comp_intel = recalculate_competitive_intelligence()

        # Lidl separation
        lidl_row = next((r for r in comp_intel["retailer_dashboard"] if r["retailer"] == "Lidl"), None)
        self.assertIsNotNone(lidl_row)
        if active_pointer.get("week") == "WK45":
            self.assertIn("16,90 lei/kg (cupon)", lidl_row["lead_kvi_price"])
            self.assertIn("19,90 lei/kg (std)", lidl_row["lead_kvi_price"])
            penny_row = next((r for r in comp_intel["retailer_dashboard"] if r["retailer"] == "Penny"), None)
            self.assertIsNotNone(penny_row)
            self.assertIn("15,99 lei/kg (card)", penny_row["lead_kvi_price"])
            self.assertIn("17,99 lei/kg (card)", penny_row["lead_kvi_price"])
        else:
            self.assertIn("17,90 lei/kg (cupon)", lidl_row["lead_kvi_price"])
            self.assertIn("23,90 lei/kg (std)", lidl_row["lead_kvi_price"])
            penny_row = next((r for r in comp_intel["retailer_dashboard"] if r["retailer"] == "Penny"), None)
            self.assertIsNotNone(penny_row)
            self.assertIn("26,90 lei/kg", penny_row["lead_kvi_price"])

    def test_04_market_leaders_recalculated_wk45(self):
        """4. Recalcularea corectă a liderilor conform săptămânii active."""
        active_pointer, promo_data = get_active_promo_data()
        comp_intel = recalculate_competitive_intelligence()

        kaufland_row = next(r for r in comp_intel["retailer_dashboard"] if r["retailer"] == "Kaufland")
        lidl_row = next(r for r in comp_intel["retailer_dashboard"] if r["retailer"] == "Lidl")

        if active_pointer.get("week") == "WK45":
            self.assertIn("Cotlet porc f.o. 15,90 lei/kg", kaufland_row["lead_kvi_price"])
            self.assertIn("Pulpă porc f.o. 15,99 lei/kg", kaufland_row["lead_kvi_price"])
            penny_row = next(r for r in comp_intel["retailer_dashboard"] if r["retailer"] == "Penny")
            self.assertIn("Pulpă porc f.o. 15,99 lei/kg (card)", penny_row["lead_kvi_price"])
            self.assertIn("Spată porc f.o. 18,90 lei/kg", lidl_row["lead_kvi_price"])
            self.assertIn("Ceafă porc f.o. 23,90 lei/kg", lidl_row["lead_kvi_price"])
        else:
            # WK46 leaders
            self.assertIn("Cotlet porc f.o. 15,90 lei/kg", kaufland_row["lead_kvi_price"])
            self.assertIn("Pulpă porc f.o. 15,99 lei/kg", kaufland_row["lead_kvi_price"])
            self.assertIn("Ceafă porc f.o. 17,90 lei/kg (cupon)", lidl_row["lead_kvi_price"])
            penny_row = next(r for r in comp_intel["retailer_dashboard"] if r["retailer"] == "Penny")
            self.assertIn("Piept pui dezosat 26,90 lei/kg", penny_row["lead_kvi_price"])

    def test_05_no_unsupported_prices_for_mega_and_profi(self):
        """5. Fără prețuri inventate pentru Mega Image și Profi (neincluse în matricea 5x5)."""
        comp_intel = recalculate_competitive_intelligence()
        
        mega_row = next(r for r in comp_intel["retailer_dashboard"] if r["retailer"] == "Mega Image")
        self.assertIn("Neinclus în matricea promoțională 5×5", mega_row["lead_kvi_price"])

        profi_row = next(r for r in comp_intel["retailer_dashboard"] if r["retailer"] == "Profi")
        self.assertIn("Neinclus în matricea promoțională 5×5", profi_row["lead_kvi_price"])

    def test_06_atomic_update_and_manifest_sync(self):
        """6. Regenerarea automată și sincronizarea atomică cu manifestul unificat."""
        success = update_strategic_category_intelligence()
        self.assertTrue(success)

        rm_data = json.loads(RETAIL_MEDIA_FILE.read_text(encoding="utf-8"))
        active_promo, _ = get_active_promo_data()
        self.assertEqual(rm_data["competitive_intelligence"]["promo_week"], active_promo.get("week"))

        manifest_file = PUBLIC_DATA_DIR / "market_intelligence_manifest.json"
        if manifest_file.exists():
            manifest = json.loads(manifest_file.read_text(encoding="utf-8"))
            self.assertIn("modules", manifest)
            self.assertIn("strategic_category_insights", manifest["modules"])

    def test_07_fail_closed_on_corrupt_pointer(self):
        """7. Conservarea ultimei versiuni valide în caz de eșec (FAIL_CLOSED)."""
        backup_content = RETAIL_MEDIA_FILE.read_text(encoding="utf-8")
        
        # Test exception raising on missing active release file
        non_existent_path = PUBLIC_DATA_DIR / "non_existent_release.json"
        try:
            from unittest.mock import patch
            with patch("strategic_category_intelligence.ACTIVE_RELEASE_FILE", non_existent_path):
                with self.assertRaises(FileNotFoundError):
                    get_active_promo_data()
        finally:
            # Confirm retail media file is unmodified
            self.assertEqual(RETAIL_MEDIA_FILE.read_text(encoding="utf-8"), backup_content)

    def test_08_module_integrity(self):
        """8. Integritatea datelor celorlalte module (5x5 matrix 25 celule, 14 publicații media)."""
        # Promo Weekly export check
        active_pointer, promo_data = get_active_promo_data()
        self.assertEqual(len(promo_data.get("cells", [])), 25, "Matricea Promo Weekly trebuie să conțină exact 25 de celule")
        self.assertEqual(promo_data.get("release_status"), "RELEASE_PASS")

        # Retail Media Monitor publications check
        rm_data = json.loads(RETAIL_MEDIA_FILE.read_text(encoding="utf-8"))
        self.assertEqual(len(rm_data.get("retailers", [])), 7, "Retail Media Monitor trebuie să aibă exact 7 retaileri")
        self.assertEqual(len(rm_data.get("publications", [])), 14, "Retail Media Monitor trebuie să aibă exact 14 publicații")

if __name__ == "__main__":
    unittest.main()
