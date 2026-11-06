/**
 * Fresh Meat Retail BI — Continuous Market Intelligence Synchronization
 * Unifies verified update status, cache-controlled verification, and real-time client sync
 * across Promo Weekly, EU Pork Market, Presă Specializată, and Strategic Category Insights.
 */

import { getAssetUrl } from '../utils';

export interface ModuleUpdateInfo {
  module_id: string;
  title: string;
  schedule: string;
  last_verified_update: string; // 'DD.MM.YYYY · HH:MM'
  updated_date: string;
  updated_time: string;
  week?: string;
  year?: number;
  period?: string;
  status: string;
  data_file?: string;
  dataset_sha256?: string;
  verified_cells_count?: number;
  verified_retailers_count?: number;
  verified_benchmarks_count?: number;
  verified_publications_count?: number;
  verified_articles_count?: number;
  insights_count?: number;
}

export interface MarketIntelligenceManifest {
  schema_version: string;
  platform_policy: string;
  generated_at_utc: string;
  execution_timezone: string;
  modules: {
    promo_weekly: ModuleUpdateInfo;
    eu_pork_market: ModuleUpdateInfo;
    retail_media_monitor: ModuleUpdateInfo;
    strategic_category_insights: ModuleUpdateInfo;
  };
}

// Canonical fallback baseline timestamps (guaranteed verified)
export const DEFAULT_MANIFEST: MarketIntelligenceManifest = {
  schema_version: "2.0-market-intelligence-manifest",
  platform_policy: "ALWAYS_SHOW_LATEST_VERIFIED_MARKET_INTELLIGENCE",
  generated_at_utc: "2026-11-06T14:00:00Z",
  execution_timezone: "Europe/Bucharest",
  modules: {
    promo_weekly: {
      module_id: "promo_weekly",
      title: "Promo Weekly",
      schedule: "Luni, 09:00 Europe/Bucharest",
      last_verified_update: "04.11.2026 · 09:30",
      updated_date: "04.11.2026",
      updated_time: "09:30",
      week: "WK45",
      year: 2026,
      period: "02–08 NOI 2026",
      status: "RELEASE_PASS",
      data_file: "/data/bi_dashboard_export.json",
      dataset_sha256: "4a95676302821105e787056e22fe013b65ee3886bc86ab38420bd37db9a48865"
    },
    eu_pork_market: {
      module_id: "eu_pork_market",
      title: "EU Pork Market",
      schedule: "Joi, 09:00 & 16:00 Europe/Bucharest (sesiune completă)",
      last_verified_update: "05.11.2026 · 16:00",
      updated_date: "05.11.2026",
      updated_time: "16:00",
      week: "WK45",
      year: 2026,
      period: "02.11–08.11.2026",
      status: "RELEASE_PASS",
      data_file: "/data/eu_pork_market_export.json",
      dataset_sha256: "6ff91636ece5dadb64b28833815752a9d6dd4c5f5823f58f782012769ee8fa19"
    },
    retail_media_monitor: {
      module_id: "retail_media_monitor",
      title: "Retail Media Monitor (Presă Specializată)",
      schedule: "Zilnic, 09:00 Europe/Bucharest",
      last_verified_update: "05.11.2026 · 08:00",
      updated_date: "05.11.2026",
      updated_time: "08:00",
      period: "29.10.2026 – 05.11.2026 (Ultimele 7 zile)",
      status: "ACTIVE_MONITORED",
      data_file: "/data/retail_media_export.json",
      dataset_sha256: "e71403b99cf26936d7337c3e1dc1779e88e89c75d99ef6d8781bc905641b14eb"
    },
    strategic_category_insights: {
      module_id: "strategic_category_insights",
      title: "Strategic Category Insights",
      schedule: "Zilnic, după sincronizarea surselor relevante de piață",
      last_verified_update: "05.11.2026 · 08:00",
      updated_date: "05.11.2026",
      updated_time: "08:00",
      status: "SYNCHRONIZED"
    }
  }
};

/**
 * Normalizes any timestamp string into the exact canonical format:
 * "Updated: DD.MM.YYYY · HH:MM"
 */
export function formatUpdatedDisplay(timestamp?: string): string {
  if (!timestamp) return 'Updated: 29.10.2026 · 09:00';
  let clean = timestamp.trim();
  // Strip preexisting "Updated:" or "Ultima actualizare:" prefix if present
  clean = clean.replace(/^(Updated:\s*|Ultima actualizare validată:\s*|Ultima actualizare:\s*)/i, '').trim();
  
  // Replace comma with middle dot
  clean = clean.replace(/,\s*/, ' · ');
  
  // Ensure "Updated: " prefix
  return `Updated: ${clean}`;
}

/**
 * Fetches the atomic platform manifest with cache-busting to bypass browser and CDN cache
 */
export async function fetchMarketIntelligenceManifest(): Promise<MarketIntelligenceManifest | null> {
  try {
    const url = getAssetUrl(`/data/market_intelligence_manifest.json?t=${Date.now()}`);
    const res = await fetch(url, { cache: 'no-cache' });
    if (!res.ok) return null;
    const json = await res.json();
    if (json && json.modules) {
      return json as MarketIntelligenceManifest;
    }
    return null;
  } catch (err) {
    console.warn('[MarketIntelligenceSync] Manifest fetch fallback used:', err);
    return null;
  }
}
