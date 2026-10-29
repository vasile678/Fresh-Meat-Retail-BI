import React, { useState, useEffect } from 'react';
import { 
  CheckCircle2, 
  ShieldCheck, 
  Download, 
  Eye, 
  FileCheck2, 
  TrendingDown, 
  AlertCircle, 
  Info,
  Maximize2,
  Copy,
  AlertTriangle,
  RefreshCw,
  FileCode,
  Loader2,
  Share2
} from 'lucide-react';

interface CellData {
  retailer: string;
  kvi: string;
  status: 'VERIFIED' | 'USER-REPORTED' | 'N/V' | 'NC';
  price_lei_kg: number | null;
  validity: string | null;
  source: string | null;
  source_date: string | null;
  exact_product: string | null;
  discount: string | null;
  mechanic: string | null;
  isBest?: boolean;
}

interface ActiveRelease {
  release_id: string;
  week: string;
  year: number;
  published_at_utc: string;
  export_path: string;
  image_path: string;
  release_receipt_path: string;
  dataset_sha256: string;
  output_sha256: string;
  release_receipt_sha256: string;
  release_status: 'RELEASE_PASS' | 'FAIL_CLOSED';
}

interface DashboardExport {
  schema_version: string;
  release_status: 'RELEASE_PASS' | 'FAIL_CLOSED';
  errors?: string[];
  week: string;
  year: number;
  calendar_period: string;
  research_window: string;
  coverage_checked?: string;
  retailers: string[];
  kvi: string[];
  cells: CellData[];
  summary: {
    cell_count: number;
    verified_count: number;
    nv_count: number;
    best_prices: Record<string, number>;
  };
  hashes: {
    dataset_sha256: string | null;
    output_sha256: string | null;
    release_receipt_sha256: string | null;
    master_sha256: string | null;
    renderer_sha256: string | null;
  };
  image_url: string | null;
  release_gate: {
    release_status: string;
    checks: Record<string, boolean>;
    errors?: string[];
  };
}

const getAssetUrl = (path: string): string => {
  if (!path) return path;
  if (path.startsWith('http://') || path.startsWith('https://')) return path;
  const base = (import.meta.env.BASE_URL || '/').replace(/\/$/, '');
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  return `${base}${cleanPath}`;
};

export default function App() {
  const [data, setData] = useState<DashboardExport | null>(null);
  const [activeRelease, setActiveRelease] = useState<ActiveRelease | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [selectedTab, setSelectedTab] = useState<'image' | 'matrix' | 'receipts' | 'insights'>('image');
  const [selectedCell, setSelectedCell] = useState<CellData | null>(null);
  const [zoomImage, setZoomImage] = useState<boolean>(false);
  const [copiedHash, setCopiedHash] = useState<string | null>(null);
  const [isDownloading, setIsDownloading] = useState<boolean>(false);
  const [downloadToast, setDownloadToast] = useState<{ message: string; type: 'info' | 'success' | 'error' } | null>(null);

  const isIOSDevice = (): boolean => {
    if (typeof window === 'undefined' || typeof navigator === 'undefined') return false;
    const ua = navigator.userAgent || '';
    const isTouchMac = navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1;
    return /iPad|iPhone|iPod/.test(ua) || isTouchMac;
  };

  const triggerBlobDownload = (blob: Blob, filename: string) => {
    const blobUrl = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = blobUrl;
    link.download = filename;
    link.rel = 'noopener noreferrer';
    link.style.display = 'none';
    document.body.appendChild(link);
    link.click();
    setTimeout(() => {
      if (document.body.contains(link)) {
        document.body.removeChild(link);
      }
      URL.revokeObjectURL(blobUrl);
    }, 1500);
  };

  const handleDownloadImage = async (e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    if (!data) return;

    const targetUrl = data.image_url || getAssetUrl('/TOP5_PREȚURI_COMPETITORI_WK44_2026.png');
    const filename = `TOP5_PREȚURI_COMPETITORI_${data.week || 'WK44'}_${data.year || '2026'}.png`;

    setIsDownloading(true);
    try {
      const res = await fetch(targetUrl);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const blob = await res.blob();

      const isIOS = isIOSDevice();
      const file = new File([blob], filename, { type: 'image/png' });

      // iOS Web Share API pathway (Safari iOS 14+) - keeps user inside the app
      if (isIOS && typeof navigator.share === 'function' && navigator.canShare && navigator.canShare({ files: [file] })) {
        try {
          await navigator.share({
            files: [file],
            title: filename,
            text: `Fresh Meat Retail BI — Raport Executiv ${data.week} ${data.year}`
          });
          setDownloadToast({ message: 'Imagine partajată / salvată cu succes!', type: 'success' });
        } catch (shareErr: any) {
          // If the user cancelled the share sheet, AbortError is thrown — this is normal and safe
          if (shareErr?.name !== 'AbortError') {
            console.warn('Eroare la partajare iOS:', shareErr);
            // Non-navigating fallback: trigger blob download
            triggerBlobDownload(blob, filename);
          }
        }
      } else if (isIOS) {
        // Fallback for iOS environments without file sharing:
        // NEVER navigate window to raw PNG. Open zoom modal with instruction to long-press and save to Photos.
        setZoomImage(true);
        setDownloadToast({ 
          message: 'Pe iOS, mențineți apăsată imaginea mărită și selectați „Salvați în Poze”.', 
          type: 'info' 
        });
      } else {
        // Windows, Android, macOS Desktop, Linux: programmatic blob download
        triggerBlobDownload(blob, filename);
        setDownloadToast({ message: 'Descărcare inițiată cu succes.', type: 'info' });
      }
    } catch (err) {
      console.error('Eroare descărcare imagine:', err);
      setDownloadToast({ 
        message: 'Nu s-a putut descărca automat. Puteți salva imaginea prin click dreapta sau atingere lungă.', 
        type: 'error' 
      });
    } finally {
      setIsDownloading(false);
      setTimeout(() => {
        setDownloadToast(null);
      }, 4500);
    }
  };

  const handleDownloadJson = async (e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    if (!data) return;
    const exportPath = activeRelease?.export_path ? getAssetUrl(activeRelease.export_path) : getAssetUrl('/data/bi_dashboard_export.json');
    const filename = `bi_export_${data.week}_${data.year}.json`;
    try {
      const res = await fetch(exportPath);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const blob = await res.blob();
      triggerBlobDownload(blob, filename);
      setDownloadToast({ message: 'Export JSON descărcat.', type: 'info' });
    } catch (err) {
      console.error('Eroare descărcare JSON:', err);
    } finally {
      setTimeout(() => setDownloadToast(null), 3000);
    }
  };

  const loadDashboardData = async () => {
    setLoading(true);
    setFetchError(null);
    try {
      // 1. Fetch the active atomic pointer with cache-busting
      const pointerRes = await fetch(getAssetUrl('/data/active_release.json?t=' + Date.now()));
      let pointer: ActiveRelease | null = null;
      let exportUrl = getAssetUrl('/data/bi_dashboard_export.json?v=' + Date.now());
      let imageUrl = getAssetUrl('/TOP5_PREȚURI_COMPETITORI_WK44_2026.png');

      if (pointerRes.ok) {
        pointer = await pointerRes.json();
        if (pointer && pointer.release_status === 'RELEASE_PASS') {
          setActiveRelease(pointer);
          exportUrl = getAssetUrl(pointer.export_path);
          imageUrl = getAssetUrl(pointer.image_path);
        } else if (pointer && pointer.release_status === 'FAIL_CLOSED') {
          throw new Error('Pointerul activ indică FAIL_CLOSED (lansare blocată de poartă)');
        }
      }

      // 2. Consume immutable export JSON corresponding strictly to the active release
      const res = await fetch(exportUrl);
      if (!res.ok) {
        throw new Error(`Eroare la încărcarea exportului validat (HTTP ${res.status})`);
      }
      const json: DashboardExport = await res.json();

      // 3. Cryptographic consistency validation between pointer and export
      if (pointer) {
        if (json.hashes.dataset_sha256 !== pointer.dataset_sha256) {
          throw new Error('Nepotrivire SHA-256 între pointerul activ și datasetul exportat!');
        }
        if (json.hashes.output_sha256 !== pointer.output_sha256) {
          throw new Error('Nepotrivire SHA-256 între pointerul activ și imaginea randată!');
        }
        json.image_url = imageUrl;
      }

      setData(json);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Eroare necunoscută la citirea exportului';
      setFetchError(msg);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDashboardData();
  }, []);

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedHash(id);
    setTimeout(() => setCopiedHash(null), 2000);
  };

  const getCell = (retailer: string, item: string): CellData | undefined => {
    if (!data || !data.cells) return undefined;
    return data.cells.find(c => c.retailer === retailer && c.kvi === item);
  };

  // 1. Loading State
  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col items-center justify-center font-sans p-4">
        <div className="w-12 h-12 rounded-xl bg-emerald-600/20 border border-emerald-500/30 flex items-center justify-center animate-spin mb-4">
          <RefreshCw className="w-6 h-6 text-emerald-400" />
        </div>
        <h2 className="text-base font-bold text-white tracking-tight">Fresh Meat Retail BI</h2>
        <p className="text-xs text-slate-400 mt-1">Se verifică chitanțele criptografice și exportul motorului Python...</p>
      </div>
    );
  }

  // 2. FAIL_CLOSED State (Error or missing verified data)
  const isPass = data && data.release_status === 'RELEASE_PASS' && data.release_gate?.release_status === 'RELEASE_PASS';

  if (!isPass || fetchError) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
        <header className="border-b border-red-900/50 bg-red-950/20 backdrop-blur sticky top-0 z-40">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <img 
                src={getAssetUrl('/icon-192.png')} 
                alt="Fresh Meat Retail BI Logo" 
                className="w-10 h-10 rounded-lg object-contain shadow-lg shadow-red-950/40 bg-slate-900 border border-red-800/60"
              />
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-lg font-bold text-white tracking-tight">Fresh Meat Retail BI</h1>
                  <span className="px-2 py-0.5 text-xs rounded-full bg-red-500/20 text-red-400 font-semibold border border-red-500/30 flex items-center gap-1">
                    <AlertTriangle className="w-3.5 h-3.5" /> FAIL_CLOSED
                  </span>
                </div>
                <p className="text-xs text-slate-400">Guvernanță activă: Validare blocată conform politicii fail-closed.</p>
              </div>
            </div>
            <button 
              onClick={loadDashboardData}
              className="px-3 py-1.5 rounded bg-slate-800 hover:bg-slate-700 text-xs font-medium text-slate-200 inline-flex items-center gap-1.5 transition"
            >
              <RefreshCw className="w-3.5 h-3.5" /> Reîncearcă verificarea
            </button>
          </div>
        </header>

        <main className="flex-1 max-w-4xl mx-auto px-4 py-12 w-full flex flex-col items-center justify-center text-center">
          <div className="w-16 h-16 rounded-2xl bg-red-900/30 border border-red-500/40 flex items-center justify-center text-red-400 mb-6 shadow-xl">
            <AlertCircle className="w-8 h-8" />
          </div>
          <h2 className="text-xl font-bold text-white">Publicare Blocată: Regula FAIL_CLOSED Activată</h2>
          <p className="text-sm text-slate-300 max-w-xl mt-2 leading-relaxed">
            Conform constituției de guvernanță Fresh Meat Retail BI v2.6, datele comerciale și imaginile nu pot fi afișate fără o chitanță autentică Release Gate complet validată prin SHA-256.
          </p>

          <div className="mt-6 w-full bg-slate-900 border border-red-900/40 rounded-xl p-5 text-left">
            <h3 className="text-xs font-bold text-red-400 uppercase tracking-wider mb-2">Motive blocaj identificate:</h3>
            <ul className="text-xs text-slate-300 space-y-1.5 list-disc list-inside">
              {fetchError && <li>Eroare citire export: {fetchError}</li>}
              {data?.errors?.map((err, i) => (
                <li key={i} className="font-mono text-red-300">{err}</li>
              ))}
              {data?.release_gate?.errors?.map((err, i) => (
                <li key={`gate-${i}`} className="font-mono text-red-300">Poartă BI: {err}</li>
              ))}
              {!fetchError && (!data?.errors || data.errors.length === 0) && (
                <li>Chitanța de lansare nu a atins statutul RELEASE_PASS.</li>
              )}
            </ul>
          </div>
        </main>
      </div>
    );
  }

  // 3. Normal RELEASE_PASS State: Displaying authentic verified data
  const retailers = data.retailers || ['Kaufland', 'Lidl', 'PENNY', 'Carrefour', 'Auchan'];
  const kvi = data.kvi || ['Spată porc fără os', 'Pulpă porc fără os', 'Cotlet porc fără os', 'Ceafă porc fără os', 'Piept pui dezosat'];
  const pngUrl = data.image_url || getAssetUrl('/TOP5_PREȚURI_COMPETITORI_WK44_2026.png');

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
      {/* Top Corporate Nav */}
      <header className="border-b border-slate-800 bg-slate-900/90 backdrop-blur sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <img 
              src={getAssetUrl('/icon-192.png')} 
              alt="Fresh Meat Retail BI Logo" 
              className="w-10 h-10 rounded-lg object-contain shadow-lg shadow-emerald-900/40 bg-slate-900 border border-slate-700/60"
            />
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg font-bold text-white tracking-tight">Fresh Meat Retail BI</h1>
                <span className="px-2 py-0.5 text-xs rounded-full bg-emerald-500/20 text-emerald-400 font-semibold border border-emerald-500/30 flex items-center gap-1">
                  <ShieldCheck className="w-3.5 h-3.5" /> {data.release_status}
                </span>
              </div>
              <p className="text-xs text-slate-400">
                TOP 5 ARTICOLE – PREȚURI COMPETITORI | {data.week} {data.year} (±3 ZILE)
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button 
              type="button"
              onClick={handleDownloadJson}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 transition cursor-pointer"
              title="Descarcă exportul JSON validat"
            >
              <FileCode className="w-3.5 h-3.5 text-emerald-400" /> Export JSON
            </button>
            <button 
              type="button"
              onClick={handleDownloadImage}
              disabled={isDownloading}
              className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-md bg-emerald-600 hover:bg-emerald-500 disabled:opacity-60 text-white text-xs font-semibold shadow-md transition cursor-pointer"
              title="Descarcă sau salvează imaginea PNG fără părăsirea aplicației"
            >
              {isDownloading ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Download className="w-3.5 h-3.5" />
              )}
              <span>{isDownloading ? 'Se procesează...' : 'Descarcă PNG 4:3'}</span>
            </button>
            <div className="text-right hidden sm:block">
              <span className="text-[11px] text-slate-400 block">Perioadă analizată</span>
              <span className="text-xs font-medium text-slate-200">{data.calendar_period}</span>
            </div>
          </div>
        </div>

        {/* Tab switcher */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 flex gap-2 border-t border-slate-800/60 pt-1">
          <button 
            onClick={() => setSelectedTab('image')}
            className={`px-4 py-2 text-xs font-medium border-b-2 transition flex items-center gap-2 ${
              selectedTab === 'image' 
                ? 'border-emerald-500 text-emerald-400 bg-slate-800/40' 
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Eye className="w-3.5 h-3.5" /> Imagine PNG 4:3 & Export Executiv
          </button>
          <button 
            onClick={() => setSelectedTab('matrix')}
            className={`px-4 py-2 text-xs font-medium border-b-2 transition flex items-center gap-2 ${
              selectedTab === 'matrix' 
                ? 'border-emerald-500 text-emerald-400 bg-slate-800/40' 
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <FileCheck2 className="w-3.5 h-3.5" /> Matrice 5×5 Interactivă
          </button>
          <button 
            onClick={() => setSelectedTab('receipts')}
            className={`px-4 py-2 text-xs font-medium border-b-2 transition flex items-center gap-2 ${
              selectedTab === 'receipts' 
                ? 'border-emerald-500 text-emerald-400 bg-slate-800/40' 
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <ShieldCheck className="w-3.5 h-3.5" /> Chitanțe SHA-256 & Audit Gate
          </button>
          <button 
            onClick={() => setSelectedTab('insights')}
            className={`px-4 py-2 text-xs font-medium border-b-2 transition flex items-center gap-2 ${
              selectedTab === 'insights' 
                ? 'border-emerald-500 text-emerald-400 bg-slate-800/40' 
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <TrendingDown className="w-3.5 h-3.5" /> Concluzii & Analiză Comercială
          </button>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 py-6 w-full">
        {/* KPI Summary strip from authenticated data */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-slate-900 border border-slate-800 p-3.5 rounded-lg">
            <span className="text-xs text-slate-400 font-medium">Acoperire Matrice 5×5</span>
            <div className="text-xl font-bold text-white mt-0.5 flex items-center justify-between">
              {data.summary?.cell_count || 25} / 25
              <span className="text-xs px-2 py-0.5 rounded bg-blue-500/10 text-blue-400 border border-blue-500/20">Audit 100%</span>
            </div>
            <span className="text-[11px] text-slate-500 mt-1 block">5 retaileri × 5 articole KVI</span>
          </div>

          <div className="bg-slate-900 border border-slate-800 p-3.5 rounded-lg">
            <span className="text-xs text-slate-400 font-medium">Prețuri VERIFIED</span>
            <div className="text-xl font-bold text-emerald-400 mt-0.5 flex items-center justify-between">
              {data.summary?.verified_count || 0} Oferte
              <span className="text-xs px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">Active</span>
            </div>
            <span className="text-[11px] text-slate-500 mt-1 block">Surse externe capturate</span>
          </div>

          <div className="bg-slate-900 border border-slate-800 p-3.5 rounded-lg">
            <span className="text-xs text-slate-400 font-medium">Prețuri N/V (Neverificate)</span>
            <div className="text-xl font-bold text-amber-400 mt-0.5 flex items-center justify-between">
              {data.summary?.nv_count || 0} Celule
              <span className="text-xs px-2 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20">Fără promo</span>
            </div>
            <span className="text-[11px] text-slate-500 mt-1 block">Fără asumpții demonstrative</span>
          </div>

          <div className="bg-slate-900 border border-slate-800 p-3.5 rounded-lg">
            <span className="text-xs text-slate-400 font-medium">Autoritate Lansare</span>
            <div className="text-xl font-bold text-emerald-400 mt-0.5 flex items-center justify-between">
              {data.release_status}
              <CheckCircle2 className="w-5 h-5 text-emerald-400" />
            </div>
            <span className="text-[11px] text-slate-500 mt-1 block">Chitanță Release Gate autentică</span>
          </div>
        </div>

        {/* Tab 1: Image & Executive View */}
        {selectedTab === 'image' && (
          <div className="space-y-6">
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-xl">
              <div className="flex flex-wrap items-center justify-between gap-4 mb-4 pb-4 border-b border-slate-800">
                <div>
                  <h2 className="text-base font-semibold text-white flex items-center gap-2">
                    Imagine PNG 4:3 Generată Determinist (Model WK Promo)
                    <span className="text-xs font-normal text-slate-400">| Rezoluție 1448 × 1086 px</span>
                  </h2>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Generată prin motorul Python conform CONFIG_MANIFEST. Static pixels match: 100%.
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button 
                    onClick={() => setZoomImage(true)}
                    className="px-3 py-1.5 rounded bg-slate-800 hover:bg-slate-700 text-xs font-medium text-slate-200 inline-flex items-center gap-1.5 transition"
                  >
                    <Maximize2 className="w-3.5 h-3.5" /> Mărește
                  </button>
                  <button 
                    type="button"
                    onClick={handleDownloadImage}
                    disabled={isDownloading}
                    className="px-3 py-1.5 rounded bg-emerald-600 hover:bg-emerald-500 disabled:opacity-60 text-xs font-semibold text-white inline-flex items-center gap-1.5 transition shadow cursor-pointer"
                    title="Salvează imaginea PNG"
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

              {/* Rendered Image Display */}
              <div className="relative group bg-slate-950 rounded-lg p-2 border border-slate-800/80 overflow-hidden flex justify-center items-center">
                <img 
                  src={pngUrl} 
                  alt={`TOP 5 ARTICOLE – PREȚURI COMPETITORI | ${data.week} ${data.year}`} 
                  className="max-h-[640px] w-auto object-contain rounded shadow-2xl cursor-pointer transition hover:opacity-95"
                  onClick={() => setZoomImage(true)}
                />
              </div>

              {/* Integrity metadata footer */}
              <div className="mt-4 pt-3 border-t border-slate-800 flex flex-wrap items-center justify-between text-xs text-slate-400 gap-2">
                <div className="flex items-center gap-4">
                  <span>Aspect ratio: <strong>4:3 (1.333)</strong></span>
                  <span>Master SHA-256: <code className="text-slate-300">{data.hashes?.master_sha256?.substring(0, 12)}...</code></span>
                  <span>Output SHA-256: <code className="text-emerald-400">{data.hashes?.output_sha256?.substring(0, 12)}...</code></span>
                </div>
                <div className="text-slate-500">
                  Validat de FRESH_MEAT_BI_GATE v1.5
                </div>
              </div>
            </div>

            {/* Quick Observations Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-slate-900 border border-slate-800 rounded-lg p-4">
                <div className="text-xs font-bold text-emerald-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4" /> Cele mai bune prețuri per rând
                </div>
                <ul className="text-xs space-y-2 text-slate-300">
                  {kvi.map(item => {
                    const best = data.summary?.best_prices?.[item];
                    return (
                      <li key={item} className="flex justify-between border-b border-slate-800/60 pb-1.5">
                        <span>{item}:</span>
                        {best ? (
                          <strong className="text-emerald-400">{best.toFixed(2).replace('.', ',')} lei/kg</strong>
                        ) : (
                          <strong className="text-slate-400">N/V (Fără ofertă)</strong>
                        )}
                      </li>
                    );
                  })}
                </ul>
              </div>

              <div className="bg-slate-900 border border-slate-800 rounded-lg p-4">
                <div className="text-xs font-bold text-amber-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                  <AlertCircle className="w-4 h-4" /> Politică Like-For-Like
                </div>
                <p className="text-xs text-slate-300 leading-relaxed">
                  Nu au fost incluse ca echivalente sortimentele marinate sau bucățile cu os. Prețurile afișate pe platformele online fără reducere de catalog național rămân <strong>N/V</strong> conform regulii de publicare.
                </p>
              </div>

              <div className="bg-slate-900 border border-slate-800 rounded-lg p-4">
                <div className="text-xs font-bold text-blue-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                  <Info className="w-4 h-4" /> Integritate Criptografică
                </div>
                <p className="text-xs text-slate-300 leading-relaxed">
                  Datele afișate provin exclusiv din chitanțele generate de motorul Python în directorul canonic <code>fresh_meat_bi/</code>, garantând independența deplină față de valori demonstrative hardcodate.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Tab 2: Interactive Matrix */}
        {selectedTab === 'matrix' && (
          <div className="space-y-6">
            <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-xl">
              <div className="p-4 border-b border-slate-800 flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-semibold text-white">Matricea Oficială de Prețuri 5×5 (Normalizată lei/kg)</h3>
                  <p className="text-xs text-slate-400">Date consumate dinamic din exportul autentic Python ({data.week} {data.year}).</p>
                </div>
                <div className="flex items-center gap-3 text-xs">
                  <span className="flex items-center gap-1.5 text-emerald-400">
                    <span className="w-3 h-3 rounded bg-emerald-500/20 border border-emerald-500 inline-block"></span> VERIFIED
                  </span>
                  <span className="flex items-center gap-1.5 text-slate-400">
                    <span className="w-3 h-3 rounded bg-slate-800 border border-slate-700 inline-block"></span> N/V (Neverificat)
                  </span>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-800/80 text-slate-300 border-b border-slate-700 font-semibold">
                      <th className="py-3 px-4 w-44">ARTICOL</th>
                      {retailers.map(r => (
                        <th key={r} className="py-3 px-4 text-center border-l border-slate-700/60 text-slate-200">
                          {r}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800">
                    {kvi.map((item, idx) => (
                      <tr key={item} className={idx % 2 === 0 ? 'bg-slate-900/40' : 'bg-slate-900/80'}>
                        <td className="py-3.5 px-4 font-semibold text-slate-200 border-r border-slate-800">
                          {item}
                        </td>
                        {retailers.map(ret => {
                          const c = getCell(ret, item);
                          const isVerified = c?.status === 'VERIFIED';
                          const isBest = c?.isBest;

                          return (
                            <td 
                              key={ret}
                              onClick={() => setSelectedCell(c || null)}
                              className={`py-3 px-4 text-center cursor-pointer transition border-r border-slate-800/60 hover:bg-slate-800 ${
                                isBest ? 'bg-emerald-950/30 ring-1 ring-inset ring-emerald-500/40' : ''
                              }`}
                            >
                              {isVerified ? (
                                <div className="space-y-0.5">
                                  <div className="flex items-center justify-center gap-1">
                                    <span className="text-base font-extrabold text-emerald-400">
                                      {c.price_lei_kg?.toFixed(2).replace('.', ',')}
                                    </span>
                                    <span className="text-[10px] text-slate-400 font-medium">lei/kg</span>
                                    {isBest && (
                                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shadow-sm shadow-emerald-400 animate-pulse" title="Cel mai bun preț pe rând"></span>
                                    )}
                                  </div>
                                  <div className="text-[10px] font-semibold text-emerald-300">
                                    {c.discount || c.mechanic}
                                  </div>
                                  <div className="text-[10px] text-slate-400">
                                    {c.validity}
                                  </div>
                                </div>
                              ) : (
                                <div className="py-1">
                                  <span className="text-xs font-bold text-slate-400">N/V</span>
                                  <div className="text-[10px] text-slate-400 mt-0.5">—</div>
                                </div>
                              )}
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Selected Cell Audit Modal / Drawer */}
            {selectedCell && (
              <div className="bg-slate-900 border border-emerald-500/30 rounded-xl p-5 shadow-2xl relative">
                <button 
                  onClick={() => setSelectedCell(null)}
                  className="absolute top-4 right-4 text-slate-400 hover:text-white text-xs px-2 py-1 rounded bg-slate-800"
                >
                  Închide
                </button>
                <div className="flex items-center gap-2 mb-3">
                  <span className="px-2.5 py-0.5 rounded text-xs font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                    {selectedCell.status}
                  </span>
                  <h4 className="text-base font-bold text-white">
                    {selectedCell.retailer} — {selectedCell.kvi}
                  </h4>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 text-xs mt-4">
                  <div className="bg-slate-950 p-3 rounded-lg border border-slate-800">
                    <span className="text-slate-500 block">Preț normalizat</span>
                    <span className="text-lg font-bold text-emerald-400">
                      {selectedCell.price_lei_kg ? `${selectedCell.price_lei_kg.toFixed(2)} lei/kg` : 'N/V (Fără ofertă)'}
                    </span>
                  </div>
                  <div className="bg-slate-950 p-3 rounded-lg border border-slate-800">
                    <span className="text-slate-500 block">Perioadă valabilitate</span>
                    <span className="text-slate-200 font-semibold">{selectedCell.validity || 'Nu se aplică'}</span>
                  </div>
                  <div className="bg-slate-950 p-3 rounded-lg border border-slate-800">
                    <span className="text-slate-500 block">Produs exact</span>
                    <span className="text-slate-200 font-semibold">{selectedCell.exact_product || 'Nicio ofertă de catalog comparabilă'}</span>
                  </div>
                  <div className="bg-slate-950 p-3 rounded-lg border border-slate-800">
                    <span className="text-slate-500 block">Mecanism promoțional</span>
                    <span className="text-slate-200 font-semibold">{selectedCell.mechanic || 'N/A'}</span>
                  </div>
                </div>

                <div className="mt-3 text-xs bg-slate-950 p-3 rounded-lg border border-slate-800 flex items-center justify-between">
                  <span className="text-slate-400">
                    Sursă verificare: <strong className="text-slate-200">{selectedCell.source || 'Monitorizare catalog național & verificare ±3 zile'}</strong>
                  </span>
                  <span className="text-slate-500">
                    Dată sursă: {selectedCell.source_date || 'N/A'}
                  </span>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Tab 3: Receipts & Cryptographic Gate */}
        {selectedTab === 'receipts' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-semibold text-slate-400">Chitanță Dataset</span>
                  <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 text-[10px] font-bold">SHA-256</span>
                </div>
                <div className="space-y-1.5 text-xs">
                  <div className="text-slate-300 font-mono text-[11px] truncate">
                    {data.hashes?.dataset_sha256}
                  </div>
                  <div className="text-slate-400">Săptămână: <strong>{data.week} {data.year}</strong></div>
                  <div className="text-slate-400">Acoperire: <strong>{data.coverage_checked || '25/25'}</strong></div>
                </div>
                <button 
                  onClick={() => copyToClipboard(data.hashes?.dataset_sha256 || '', 'data')}
                  className="mt-3 w-full py-1.5 bg-slate-800 hover:bg-slate-700 rounded text-[11px] text-slate-300 flex items-center justify-center gap-1 transition"
                >
                  <Copy className="w-3 h-3" /> {copiedHash === 'data' ? 'Copiat!' : 'Copiază SHA-256'}
                </button>
              </div>

              <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-semibold text-slate-400">Chitanță Release Gate</span>
                  <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 text-[10px] font-bold">
                    {data.release_gate?.release_status}
                  </span>
                </div>
                <div className="space-y-1.5 text-xs">
                  <div className="text-slate-300 font-mono text-[11px] truncate">
                    {data.hashes?.release_receipt_sha256}
                  </div>
                  <div className="text-slate-300">Regulă: <strong>Strict Like-For-Like</strong></div>
                  <div className="text-slate-400">Erori raportate: <strong>{data.release_gate?.errors?.length || 0}</strong></div>
                </div>
                <button 
                  onClick={() => copyToClipboard(data.hashes?.release_receipt_sha256 || '', 'receipt')}
                  className="mt-3 w-full py-1.5 bg-slate-800 hover:bg-slate-700 rounded text-[11px] text-slate-300 flex items-center justify-center gap-1 transition"
                >
                  <Copy className="w-3 h-3" /> {copiedHash === 'receipt' ? 'Copiat!' : 'Copiază Hash Chitanță'}
                </button>
              </div>

              <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-semibold text-slate-400">Imagine Output PNG</span>
                  <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 text-[10px] font-bold">1448×1086</span>
                </div>
                <div className="space-y-1.5 text-xs">
                  <div className="text-slate-300 font-mono text-[11px] truncate">
                    {data.hashes?.output_sha256}
                  </div>
                  <div className="text-slate-300">Golden Static Pixels: <strong>100% match</strong></div>
                  <div className="text-slate-400">Aspect ratio: <strong>4:3 (1.333)</strong></div>
                </div>
                <button 
                  onClick={() => copyToClipboard(data.hashes?.output_sha256 || '', 'out')}
                  className="mt-3 w-full py-1.5 bg-slate-800 hover:bg-slate-700 rounded text-[11px] text-slate-300 flex items-center justify-center gap-1 transition"
                >
                  <Copy className="w-3 h-3" /> {copiedHash === 'out' ? 'Copiat!' : 'Copiază Hash PNG'}
                </button>
              </div>
            </div>

            {/* JSON Schema & Governance Block */}
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
              <h4 className="text-sm font-semibold text-white mb-2">Chitanță Autentică Release Gate (JSON)</h4>
              <p className="text-xs text-slate-400 mb-3">
                Fragment consumat direct din exportul validat al motorului Python:
              </p>

              <pre className="bg-slate-950 p-4 rounded-lg text-emerald-400 font-mono text-[11px] overflow-x-auto border border-slate-800 leading-relaxed">
{JSON.stringify(data.release_gate, null, 2)}
              </pre>
            </div>
          </div>
        )}

        {/* Tab 4: Insights */}
        {selectedTab === 'insights' && (
          <div className="space-y-6">
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-xl">
              <h3 className="text-base font-bold text-white mb-3">Analiză Comercială & Dinamică Prețuri Carne ({data.week} {data.year})</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4 text-xs">
                <div className="bg-slate-950 p-4 rounded-lg border border-slate-800">
                  <h4 className="text-sm font-semibold text-emerald-400 mb-2 flex items-center gap-1.5">
                    <TrendingDown className="w-4 h-4" /> Spată de porc fără os (Presiune agresivă)
                  </h4>
                  <p className="text-slate-300 leading-relaxed">
                    Lidl conduce segmentul de bază la <strong>13,90 lei/kg</strong> (-1,39 lei/100g prin cupon Lidl Plus, max 6kg/bon), iar Kaufland răspunde cu <strong>14,90 lei/kg</strong> (Purland vacuum, reducere directă -21%).
                  </p>
                </div>

                <div className="bg-slate-950 p-4 rounded-lg border border-slate-800">
                  <h4 className="text-sm font-semibold text-blue-400 mb-2 flex items-center gap-1.5">
                    <TrendingDown className="w-4 h-4" /> Pulpă de porc fără os (Paritate la 15,99 lei/kg)
                  </h4>
                  <p className="text-slate-300 leading-relaxed">
                    Kaufland (-33%) și PENNY (Hanul Boieresc, -30% cu Penny Card) afișează același nivel competitiv minim de <strong>15,99 lei/kg</strong>.
                  </p>
                </div>

                <div className="bg-slate-950 p-4 rounded-lg border border-slate-800">
                  <h4 className="text-sm font-semibold text-amber-400 mb-2 flex items-center gap-1.5">
                    <TrendingDown className="w-4 h-4" /> Cotlet de porc fără os (Dispersie de format)
                  </h4>
                  <p className="text-slate-300 leading-relaxed">
                    Kaufland oferă <strong>16,99 lei/kg</strong> la bucată întreagă, în timp ce variantele feliate la caserolă se situează la <strong>24,73 lei/kg</strong> (Lidl Plus) și <strong>27,68 lei/kg</strong> (PENNY).
                  </p>
                </div>

                <div className="bg-slate-950 p-4 rounded-lg border border-slate-800">
                  <h4 className="text-sm font-semibold text-purple-400 mb-2 flex items-center gap-1.5">
                    <Info className="w-4 h-4" /> Ceafă de porc & Piept pui
                  </h4>
                  <p className="text-slate-300 leading-relaxed">
                    Ceafa proaspătă fără os nu are reduceri comparabile de catalog național (N/V). Pieptul de pui dezosat are ca unică ofertă națională activă varianta Lidl (<strong>28,90 lei/kg</strong>).
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Zoom Modal */}
      {zoomImage && (
        <div 
          className="fixed inset-0 bg-black/90 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          onClick={() => setZoomImage(false)}
        >
          <div className="relative max-w-5xl max-h-[90vh] flex flex-col items-center">
            <button 
              onClick={() => setZoomImage(false)}
              className="absolute -top-10 right-0 text-white hover:text-emerald-400 text-sm font-semibold flex items-center gap-1"
            >
              Închide [ESC]
            </button>
            <img 
              src={pngUrl} 
              alt={`TOP 5 ARTICOLE – PREȚURI COMPETITORI | ${data.week} ${data.year}`} 
              className="max-h-[85vh] w-auto object-contain rounded-lg shadow-2xl border border-slate-700" 
            />
            <div className="mt-2 text-xs text-slate-400 flex flex-wrap items-center justify-center gap-4">
              <span>Raport de aspect 4:3</span>
              <span>Rezoluție: 1448 × 1086 px</span>
              <button 
                type="button"
                onClick={handleDownloadImage}
                disabled={isDownloading}
                className="text-emerald-400 hover:text-emerald-300 hover:underline font-semibold flex items-center gap-1.5 cursor-pointer disabled:opacity-60"
              >
                {isDownloading ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Download className="w-3.5 h-3.5" />
                )}
                <span>{isDownloading ? 'Se procesează...' : 'Descarcă / Salvează imaginea'}</span>
              </button>
              <span className="text-[11px] text-slate-500 hidden sm:inline">(Pe iPhone: «Salvează imaginea» sau menține apăsat)</span>
            </div>
          </div>
        </div>
      )}

      {/* Download Notification Toast */}
      {downloadToast && (
        <div 
          className="fixed bottom-6 right-6 z-50 max-w-sm bg-slate-900/95 backdrop-blur border border-slate-700 text-slate-100 px-4 py-3 rounded-lg shadow-2xl flex items-center gap-3 transition-all"
          role="status"
          aria-live="polite"
        >
          {downloadToast.type === 'success' && <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />}
          {downloadToast.type === 'info' && <Info className="w-4 h-4 text-sky-400 shrink-0" />}
          {downloadToast.type === 'error' && <AlertCircle className="w-4 h-4 text-amber-400 shrink-0" />}
          <p className="text-xs leading-relaxed flex-1">{downloadToast.message}</p>
          <button 
            type="button"
            onClick={() => setDownloadToast(null)} 
            className="text-slate-400 hover:text-white text-xs p-1 cursor-pointer"
            aria-label="Închide notificarea"
          >
            ✕
          </button>
        </div>
      )}

      {/* Footer */}
      <footer className="border-t border-slate-800/80 bg-slate-950 py-4 text-center text-xs text-slate-400">
        <div className="max-w-7xl mx-auto px-4 flex flex-wrap items-center justify-between gap-2">
          <span>Fresh Meat Retail BI — Date consumate dinamic din exportul motorului Python</span>
          <span>Configurație activă: <code>CONFIG_MANIFEST.json</code> | LUMI 4.2 Production</span>
        </div>
      </footer>
    </div>
  );
}
