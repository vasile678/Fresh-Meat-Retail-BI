import React, { useState, useEffect, useMemo } from 'react';
import { getAssetUrl } from '../utils';
import { PinkPorkIcon } from './Homepage';
import Footer from './Footer';
import { 
  ArrowLeft, 
  Download, 
  Maximize2, 
  TrendingUp, 
  ShieldCheck, 
  Eye, 
  Scale, 
  AlertCircle,
  Loader2,
  Calendar,
  Clock,
  Lock,
  FileCode,
  TrendingDown,
  Minus,
  CheckCircle2
} from 'lucide-react';

interface EuBenchmarkRow {
  market: string;
  country: string;
  flag: string;
  basis: string;
  authority: string;
  official_unit: string;
  price: string;
  unit: string;
  wow: string;
  trend: string;
  source: string;
  source_date: string;
  status: 'VERIFIED' | 'NQ' | 'N/V';
}

interface EuPorkExportData {
  schema_version: string;
  release_status: string;
  status_badge: string;
  week: string;
  year: number;
  period: string;
  updated: string;
  published_at_utc: string;
  is_baseline_golden_reference: boolean;
  fail_closed_mode: string;
  fail_closed_notice: string;
  market_signal_title: string;
  market_signal: string;
  market_signal_body: string;
  takeaways: string[];
  implications: string[];
  rows: EuBenchmarkRow[];
  hashes: {
    dataset_sha256?: string;
    master_sha256?: string;
    renderer_sha256?: string;
    release_receipt_sha256?: string;
  };
  image_url: string;
  image_filename: string;
}

interface EuPorkMarketModuleProps {
  onBack: () => void;
  onDownloadImage: (url: string, filename: string) => void;
  onZoomImage: (imageUrl: string, title: string) => void;
  isDownloading: boolean;
}

// Fallback baseline in accordance with WK38 Golden Reference
const BASELINE_FALLBACK: EuPorkExportData = {
  schema_version: '2.0-eu-pork-export',
  release_status: 'RELEASE_PASS',
  status_badge: 'ACTIVE_LOCKED',
  week: 'WK38',
  year: 2026,
  period: '14–20 September 2026',
  updated: '19.09.2026',
  published_at_utc: '2026-09-19T10:00:00Z',
  is_baseline_golden_reference: true,
  fail_closed_mode: 'ACTIVE',
  fail_closed_notice: 'Raportul afișează ultimul release autoritativ validat (WK38/2026). Pentru săptămâna curentă, datele nu sunt încă validate prin Release Gate, aplicându-se principiul fail-closed.',
  market_signal_title: 'MARKET SIGNAL (WK38)',
  market_signal: 'NEGOTIATE',
  market_signal_body: 'Broad downside pressure across DE, ISN, ES, NL, FR and PL.\nDenmark stable; Italy CUN not formulated.',
  takeaways: [
    'Germany VEZG: 1.45 €/kg SG, -0.15 WoW.',
    'ISN: 1.49 €/kg SG; Mercolleida: 1.340 €/kg live.',
    'France MPF: 1.867 €/kg, -0.036; Poland Class E: 6.93 PLN/kg, -0.09.',
    'Vion down; Danish Crown flat; Italy CUN 156–200 kg: non formulato.'
  ],
  implications: [
    'BROAD EU downside signal supports supplier renegotiation',
    'PROTECT margin before passing reductions through retail',
    'ITALY is not a numeric benchmark this week — monitor next CUN'
  ],
  rows: [
    { market: 'Germany VEZG', country: 'Germania', flag: '🇩🇪', basis: 'Carcasă (Carcass)', authority: 'VEZG (Vereinigung der Erzeugergemeinschaften)', official_unit: 'EUR / kg carcasă', price: '1.450', unit: '€/kg SG', wow: '-0.150', trend: 'WEAKENING', source: 'VEZG | 16.09', source_date: 'VEZG | 16.09', status: 'VERIFIED' },
    { market: 'ISN / Internet Pig Auction', country: 'Germania', flag: '🇩🇪', basis: 'Comerț licitație', authority: 'ISN (Interessengemeinschaft der Schweinehalter)', official_unit: 'EUR / kg carcasă', price: '1.490', unit: '€/kg SG', wow: '-0.130', trend: 'WEAKENING', source: 'ISN | 18.09', source_date: 'ISN | 18.09', status: 'VERIFIED' },
    { market: 'Spain Mercolleida', country: 'Spania', flag: '🇪🇸', basis: 'Greutate vie (Live-weight)', authority: 'Lonja de Mercolleida', official_unit: 'EUR / kg viu', price: '1.340', unit: '€/kg live', wow: '-0.025', trend: 'WEAKENING', source: 'Mercolleida | 17.09', source_date: 'Mercolleida | 17.09', status: 'VERIFIED' },
    { market: 'Italy CUN 156–200 kg', country: 'Italia', flag: '🇮🇹', basis: 'Porc greu (Heavy pig)', authority: 'Commissione Unica Nazionale (CUN)', official_unit: 'EUR / kg viu', price: 'NQ', unit: '€/kg live', wow: '—', trend: 'N/V', source: 'CUN/Crefis | 17.09', source_date: 'CUN/Crefis | 17.09', status: 'N/V' },
    { market: 'Netherlands Vion', country: 'Olanda', flag: '🇳🇱', basis: 'Preț abator (Slaughterhouse)', authority: 'Vion Food Group', official_unit: 'EUR / kg carcasă', price: '1.21', unit: '€/kg SG', wow: '-0.15', trend: 'WEAKENING', source: 'Vion | WK38', source_date: 'Vion | WK38', status: 'VERIFIED' },
    { market: 'Denmark Danish Crown', country: 'Danemarca', flag: '🇩🇰', basis: 'Preț abator săptămânal', authority: 'Danish Crown', official_unit: 'DKK / kg carcasă', price: '6.90', unit: 'DKK/kg', wow: '0.00', trend: 'STABLE', source: 'DC | WK38', source_date: 'DC | WK38', status: 'VERIFIED' },
    { market: 'France MPB', country: 'Franța', flag: '🇫🇷', basis: 'Marché du Porc Breton', authority: 'MPB Plérin', official_unit: 'EUR / kg carcasă', price: '1.867', unit: '€/kg carcass', wow: '-0.036', trend: 'WEAKENING', source: 'MPF/IFIP | 17.09', source_date: 'MPF/IFIP | 17.09', status: 'VERIFIED' },
    { market: 'Poland (ZMI) Class E', country: 'Polonia', flag: '🇵🇱', basis: 'Clasa E oficială', authority: 'Ministerul Agriculturii Polonia (ZMR)', official_unit: 'PLN / 100 kg carcasă', price: '6.93', unit: 'PLN/kg Class E', wow: '-0.09', trend: 'WEAKENING', source: 'MRiRW/POLPIG | WK38', source_date: 'MRiRW/POLPIG | WK38', status: 'VERIFIED' }
  ],
  hashes: {
    master_sha256: 'ac785f514eed0ae6e1cf8fc115e9e1ff384645cc4b30b33d5603ed35718da264',
    renderer_sha256: '2bb1d9f3ebc0ea9276086e0111ededbd334a2c6ebccdcaecff3e98f5b8ee1455',
    dataset_sha256: '70c912ec51f9dd3b3ca38d75d69ab344f5cdf86e5551003af7ca5485f5fb1aad'
  },
  image_url: '/EU_PORK_MARKET_GOLDEN_REFERENCE.png',
  image_filename: 'EU_PORK_MARKET_GOLDEN_REFERENCE_WK38.png'
};

export default function EuPorkMarketModule({
  onBack,
  onDownloadImage,
  onZoomImage,
  isDownloading
}: EuPorkMarketModuleProps) {
  const [selectedTab, setSelectedTab] = useState<'visual' | 'benchmarks' | 'takeaways'>('visual');
  const [data, setData] = useState<EuPorkExportData>(BASELINE_FALLBACK);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Compute current date and ISO 8601 calendar week based on Romanian local timezone (Europe/Bucharest)
  const currentBucharestInfo = useMemo(() => {
    try {
      const now = new Date();
      const bucharestFormatter = new Intl.DateTimeFormat('en-CA', {
        timeZone: 'Europe/Bucharest',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
      });
      const parts = bucharestFormatter.formatToParts(now);
      const yearPart = Number(parts.find(p => p.type === 'year')?.value || now.getFullYear());
      const monthPart = Number(parts.find(p => p.type === 'month')?.value || now.getMonth() + 1);
      const dayPart = Number(parts.find(p => p.type === 'day')?.value || now.getDate());

      const d = new Date(Date.UTC(yearPart, monthPart - 1, dayPart));
      const dayNum = d.getUTCDay() || 7;
      d.setUTCDate(d.getUTCDate() + 4 - dayNum);
      const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
      const weekNo = Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
      const isoYear = d.getUTCFullYear();

      const monDate = new Date(Date.UTC(yearPart, monthPart - 1, dayPart));
      monDate.setUTCDate(monDate.getUTCDate() - (dayNum - 1));
      const sunDate = new Date(Date.UTC(monDate.getUTCFullYear(), monDate.getUTCMonth(), monDate.getUTCDate() + 6));

      const monthsRo = ['IAN', 'FEB', 'MAR', 'APR', 'MAI', 'IUN', 'IUL', 'AUG', 'SEP', 'OCT', 'NOI', 'DEC'];
      const monDay = String(monDate.getUTCDate()).padStart(2, '0');
      const sunDay = String(sunDate.getUTCDate()).padStart(2, '0');
      const monMonth = monthsRo[monDate.getUTCMonth()];
      const sunMonth = monthsRo[sunDate.getUTCMonth()];

      const formattedPeriod = monMonth === sunMonth
        ? `${monDay}–${sunDay} ${monMonth} ${isoYear}`
        : `${monDay} ${monMonth} – ${sunDay} ${sunMonth} ${isoYear}`;

      const bucharestDateStr = `${String(dayPart).padStart(2, '0')}.${String(monthPart).padStart(2, '0')}.${yearPart}`;

      return {
        isoYear,
        isoWeek: weekNo,
        weekStr: `WK${String(weekNo).padStart(2, '0')}`,
        formattedPeriod,
        bucharestDateStr
      };
    } catch {
      return {
        isoYear: 2026,
        isoWeek: 44,
        weekStr: 'WK44',
        formattedPeriod: '26 OCT – 01 NOI 2026',
        bucharestDateStr: '29.10.2026'
      };
    }
  }, []);

  // Guarantee Windows title bar in module
  useEffect(() => {
    document.title = 'Fresh Meat Retail BI | Market Intelligence & Insights';
  }, []);

  // Fetch dynamic export from /data/eu_pork_market_export.json
  useEffect(() => {
    let isMounted = true;
    async function loadEuData() {
      try {
        const url = getAssetUrl('/data/eu_pork_market_export.json');
        const res = await fetch(url, { cache: 'no-cache' });
        if (res.ok) {
          const json = await res.json();
          if (isMounted && json && json.rows && json.rows.length === 8) {
            setData(json);
          }
        }
      } catch {
        // Fallback remains safely in place
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }
    loadEuData();
    return () => { isMounted = false; };
  }, []);

  const imageUrl = getAssetUrl(data.image_url || '/EU_PORK_MARKET_GOLDEN_REFERENCE.png');
  const filename = data.image_filename || 'EU_PORK_MARKET_GOLDEN_REFERENCE_WK38.png';

  const downloadJsonExport = () => {
    try {
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const dlUrl = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = dlUrl;
      a.download = `EU_PORK_MARKET_EXPORT_${data.week}_${data.year}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(dlUrl);
    } catch {
      // Fallback
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
      {/* Header */}
      <header className="border-b border-slate-800 bg-slate-900/90 backdrop-blur sticky top-0 z-40 pt-[max(0.25rem,env(safe-area-inset-top))]">
        <div className="max-w-7xl mx-auto px-3 sm:px-6 py-2.5 sm:py-3 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
            <button
              type="button"
              onClick={onBack}
              className="inline-flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white text-xs font-semibold border border-slate-700 transition cursor-pointer shrink-0"
              title="Revenire la ecranul principal"
            >
              <ArrowLeft className="w-4 h-4 text-emerald-400" />
              <span className="hidden xs:inline sm:inline">Înapoi la dashboard</span>
              <span className="inline xs:hidden sm:hidden">Înapoi</span>
            </button>
            <div className="h-6 w-px bg-slate-800 hidden sm:block" />
            <div className="p-1 rounded-lg bg-pink-500/10 border border-pink-500/20 text-pink-400 shrink-0">
              <PinkPorkIcon className="w-8 h-8 sm:w-9 sm:h-9" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-base sm:text-lg font-bold text-white tracking-tight truncate">EU PORK MARKET</h1>
                <span className="px-2 py-0.5 text-[11px] sm:text-xs rounded-full bg-pink-500/20 text-pink-400 font-semibold border border-pink-500/30 flex items-center gap-1 shrink-0">
                  <ShieldCheck className="w-3.5 h-3.5" /> {data.status_badge || 'ACTIVE_LOCKED'}
                </span>
                <span className="px-2 py-0.5 text-[11px] sm:text-xs rounded-full bg-emerald-500/20 text-emerald-400 font-semibold border border-emerald-500/30 shrink-0">
                  {data.release_status}
                </span>
              </div>
              <p className="text-[11px] sm:text-xs text-slate-400 truncate">
                8 COTAȚII EUROPENE DE REFERINȚĂ | MONITORIZARE SĂPTĂMÂNALĂ
              </p>
            </div>
          </div>

          {/* Perioadă analizată în antet */}
          <div className="text-right shrink-0">
            <span className="text-[10px] sm:text-[11px] text-slate-400 block leading-tight">Perioadă analizată</span>
            <span className="text-xs sm:text-sm font-semibold text-slate-200">{data.period}</span>
          </div>
        </div>

        {/* Tab switcher: scrollabil orizontal pe mobil (Exact 3 secțiuni) */}
        <div className="max-w-7xl mx-auto px-3 sm:px-6 flex gap-1.5 sm:gap-2 border-t border-slate-800/60 pt-1 overflow-x-auto no-scrollbar touch-scroll whitespace-nowrap">
          <button
            onClick={() => setSelectedTab('visual')}
            className={`px-3 sm:px-4 py-2 text-xs font-medium border-b-2 transition flex items-center gap-1.5 sm:gap-2 shrink-0 cursor-pointer ${
              selectedTab === 'visual'
                ? 'border-pink-500 text-pink-400 bg-slate-800/40'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Eye className="w-3.5 h-3.5" /> Raport Săptămânal
          </button>
          <button
            onClick={() => setSelectedTab('benchmarks')}
            className={`px-3 sm:px-4 py-2 text-xs font-medium border-b-2 transition flex items-center gap-1.5 sm:gap-2 shrink-0 cursor-pointer ${
              selectedTab === 'benchmarks'
                ? 'border-pink-500 text-pink-400 bg-slate-800/40'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Scale className="w-3.5 h-3.5" /> Cotații Europene
          </button>
          <button
            onClick={() => setSelectedTab('takeaways')}
            className={`px-3 sm:px-4 py-2 text-xs font-medium border-b-2 transition flex items-center gap-1.5 sm:gap-2 shrink-0 cursor-pointer ${
              selectedTab === 'takeaways'
                ? 'border-pink-500 text-pink-400 bg-slate-800/40'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <TrendingUp className="w-3.5 h-3.5" /> Analiză & Implicații Comerciale
          </button>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-6 space-y-6">

        {/* Tab 1: Visual Report & Executive View — Începe direct sub meniul de navigare */}
        {selectedTab === 'visual' && (
          <div className="bg-slate-900 rounded-xl p-3 sm:p-5 border border-slate-800 shadow-xl space-y-3">
            {/* Titlul dinamic RAPORT SĂPTĂMÂNA XX & Comenzile vizuale Mărește | Salvează imaginea */}
            <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-800/80">
              <h2 className="text-base sm:text-lg md:text-xl font-bold text-white tracking-tight uppercase text-left">
                RAPORT SĂPTĂMÂNA {data.week ? data.week.replace(/\D/g, '') : '44'}
              </h2>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => onZoomImage(imageUrl, `RAPORT SĂPTĂMÂNA ${data.week ? data.week.replace(/\D/g, '') : '44'} — EU PORK MARKET`)}
                  className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-md bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white text-xs font-semibold border border-slate-700 shadow-sm transition cursor-pointer"
                  title="Mărește imaginea în ecran complet"
                >
                  <Maximize2 className="w-3.5 h-3.5 text-slate-300" />
                  <span>Mărește</span>
                </button>
                <button
                  type="button"
                  onClick={() => onDownloadImage(imageUrl, filename)}
                  disabled={isDownloading}
                  className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-md bg-emerald-600 hover:bg-emerald-500 disabled:opacity-60 text-white text-xs font-semibold shadow-md shadow-emerald-950/40 border border-emerald-500/50 transition cursor-pointer"
                  title="Salvează imaginea raportului (PNG oficial validat)"
                >
                  {isDownloading ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Download className="w-3.5 h-3.5" />
                  )}
                  <span>{isDownloading ? 'Se procesează...' : 'Salvează imaginea'}</span>
                </button>
              </div>
            </div>

            {/* Rendered Image Display — centrată, raport original 4:3 */}
            <div className="relative bg-slate-950 rounded-lg p-1.5 sm:p-2.5 border border-slate-800/80 overflow-hidden flex justify-center items-center">
              <img
                src={imageUrl}
                alt={`EU Pork Market Weekly — RAPORT SĂPTĂMÂNA ${data.week ? data.week.replace(/\D/g, '') : '44'}`}
                className="w-full max-w-5xl h-auto max-h-[78vh] object-contain rounded shadow-2xl cursor-pointer transition hover:opacity-95"
                onClick={() => onZoomImage(imageUrl, `RAPORT SĂPTĂMÂNA ${data.week ? data.week.replace(/\D/g, '') : '44'} — EU PORK MARKET`)}
                title="Click pentru a mări imaginea"
              />
            </div>
          </div>
        )}

        {/* Tab 2: Benchmarks Table */}
        {selectedTab === 'benchmarks' && (
          <div className="bg-slate-900 rounded-xl p-4 sm:p-6 border border-slate-800 shadow-xl space-y-4">
            <div className="flex flex-wrap items-center justify-between pb-3 border-b border-slate-800 gap-2">
              <div>
                <h2 className="text-base font-semibold text-white">
                  Cele 8 Cotații Europene de Referință — {data.week} ({data.period})
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  Ordine canonică fixă în protocolul v2.6. Fără amestec între carcasă și greutate vie.
                </p>
              </div>
              <span className="text-xs text-slate-400 bg-slate-800 px-2.5 py-1 rounded-full border border-slate-700">
                {data.rows?.filter(r => r.status === 'VERIFIED').length || 7} din {data.rows?.length || 8} cotații VERIFIED
              </span>
            </div>

            <div className="overflow-x-auto touch-scroll rounded-lg border border-slate-800">
              <div className="sm:hidden px-3 py-1.5 bg-slate-800/40 border-b border-slate-800 text-[11px] text-slate-400 text-center flex items-center justify-center gap-1">
                <span>← Glisați orizontal pentru toate cele 8 piețe UE →</span>
              </div>
              <table className="w-full text-left text-xs text-slate-300 min-w-[680px]">
                <thead className="bg-slate-800/80 text-slate-200 uppercase font-semibold text-[11px] border-b border-slate-700">
                  <tr>
                    <th className="py-3 px-3">#</th>
                    <th className="py-3 px-3">Piață UE</th>
                    <th className="py-3 px-4">Cotație Oficială</th>
                    <th className="py-3 px-3 text-right">Preț Curent</th>
                    <th className="py-3 px-3">Unitate</th>
                    <th className="py-3 px-3 text-center">WoW</th>
                    <th className="py-3 px-3 text-center">Tendință</th>
                    <th className="py-3 px-4">Sursă & Dată</th>
                    <th className="py-3 px-3">Bază Calcul</th>
                    <th className="py-3 px-3 text-center">Statut</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800 font-mono">
                  {data.rows?.map((row, idx) => {
                    const isVerified = row.status === 'VERIFIED';
                    const isWeaker = row.trend === 'WEAKENING';
                    const isRising = row.trend === 'RISING';
                    const isStable = row.trend === 'STABLE';

                    return (
                      <tr key={row.market} className="hover:bg-slate-800/40 transition">
                        <td className="py-3 px-3 text-slate-500 font-sans">{idx + 1}</td>
                        <td className="py-3 px-3 font-sans font-medium text-white flex items-center gap-1.5">
                          <span className="text-base">{row.flag}</span>
                          <span>{row.country}</span>
                        </td>
                        <td className="py-3 px-4 font-sans font-bold text-amber-300">
                          {row.market}
                        </td>
                        <td className="py-3 px-3 text-right font-bold text-sm text-white">
                          {row.price}
                        </td>
                        <td className="py-3 px-3 text-slate-300">
                          {row.unit}
                        </td>
                        <td className={`py-3 px-3 text-center font-bold ${
                          String(row.wow).startsWith('+') ? 'text-emerald-400' : 
                          String(row.wow).startsWith('-') ? 'text-red-400' : 'text-slate-300'
                        }`}>
                          {row.wow}
                        </td>
                        <td className="py-3 px-3 text-center font-sans">
                          {isWeaker && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-bold bg-red-500/10 text-red-400 border border-red-500/20">
                              <TrendingDown className="w-3 h-3" /> WEAKENING
                            </span>
                          )}
                          {isRising && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                              <TrendingUp className="w-3 h-3" /> RISING
                            </span>
                          )}
                          {isStable && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-bold bg-slate-800 text-slate-300 border border-slate-700">
                              <Minus className="w-3 h-3" /> STABLE
                            </span>
                          )}
                          {!isWeaker && !isRising && !isStable && (
                            <span className="text-slate-400 font-mono text-[11px]">{row.trend}</span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-slate-300 font-sans text-[11px]">
                          {row.source_date || row.source}
                        </td>
                        <td className="py-3 px-3 font-sans text-slate-400 text-[11px]">
                          {row.basis}
                        </td>
                        <td className="py-3 px-3 text-center font-sans">
                          {isVerified ? (
                            <span className="px-2 py-0.5 text-[11px] rounded bg-emerald-500/20 text-emerald-400 font-semibold border border-emerald-500/30">
                              VERIFIED
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 text-[11px] rounded bg-slate-800 text-slate-400 font-semibold border border-slate-700">
                              {row.status}
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="p-3.5 rounded-lg bg-amber-500/10 border border-amber-500/20 text-xs text-amber-300 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>
                <strong>Regulă de Integritate a Unităților & Standard de Carcasă:</strong> Cotațiile din Spania (Mercolleida) și Italia (CUN) sunt exprimate în greutate vie (live-weight), în timp ce Germania (VEZG) și Olanda (Vion) sunt exprimate în carcasă. Protocolul interzice conversia sau mediarea artificială între baze diferite. Dacă o cotație lipsește, se marchează obligatoriu N/V sau NQ.
              </span>
            </div>
          </div>
        )}

        {/* Tab 3: Takeaways & Lower Panels */}
        {selectedTab === 'takeaways' && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Panel 1: Market Signal */}
            <div className="bg-slate-900 rounded-xl p-6 border border-emerald-900/40 shadow-xl flex flex-col justify-between">
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
                  <h3 className="text-xs font-bold text-emerald-400 uppercase tracking-wider">
                    {data.market_signal_title || 'MARKET SIGNAL'}
                  </h3>
                </div>
                <div className="text-2xl font-black text-emerald-400 tracking-tight mb-3">
                  {data.market_signal}
                </div>
                <p className="text-xs text-slate-300 leading-relaxed whitespace-pre-line">
                  {data.market_signal_body}
                </p>
              </div>
              <div className="mt-6 pt-3 border-t border-slate-800 text-[11px] text-slate-500">
                Barometru de achiziție | Fresh Meat Retail BI
              </div>
            </div>

            {/* Panel 2: Key Takeaways */}
            <div className="bg-slate-900 rounded-xl p-6 border border-slate-800 shadow-xl flex flex-col justify-between">
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-2.5 h-2.5 rounded-full bg-amber-400" />
                  <h3 className="text-xs font-bold text-white uppercase tracking-wider">
                    KEY TAKEAWAYS
                  </h3>
                </div>
                <ul className="space-y-3 text-xs text-slate-300">
                  {data.takeaways?.map((t, idx) => (
                    <li key={idx} className="flex items-start gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0 mt-1.5" />
                      <span className="leading-relaxed">{t}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <div className="mt-6 pt-3 border-t border-slate-800 text-[11px] text-slate-500">
                Sinteză comparativă piețe europene
              </div>
            </div>

            {/* Panel 3: Implications for Buyers */}
            <div className="bg-slate-900 rounded-xl p-6 border border-slate-800 shadow-xl flex flex-col justify-between">
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-2.5 h-2.5 rounded-full bg-sky-400" />
                  <h3 className="text-xs font-bold text-white uppercase tracking-wider">
                    IMPLICATIONS FOR BUYERS
                  </h3>
                </div>
                <ul className="space-y-3 text-xs text-slate-300">
                  {data.implications?.map((imp, idx) => (
                    <li key={idx} className="flex items-start gap-2">
                      <span className="text-emerald-400 font-bold shrink-0">•</span>
                      <span className="leading-relaxed font-medium">{imp}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <div className="mt-6 pt-3 border-t border-slate-800 text-[11px] text-slate-500">
                Recomandare Executivă Retail Procurement
              </div>
            </div>
          </div>
        )}

      </main>

      {/* Universal Shared Footer */}
      <Footer />
    </div>
  );
}
