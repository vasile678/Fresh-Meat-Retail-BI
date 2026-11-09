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
  Share2, 
  ArrowLeft,
  History,
  Tag
} from 'lucide-react';
import Homepage from './components/Homepage';
import EuPorkMarketModule from './components/EuPorkMarketModule';
import RetailMediaClippingModule from './components/RetailMediaClippingModule';
import Footer from './components/Footer';
import { getAssetUrl } from './utils';
import { useMarketIntelligence } from './hooks/useMarketIntelligence';
export { getAssetUrl };

interface CellHistoryItem {
  period: string;
  status: string;
  price_lei_kg: number | null;
  product?: string | null;
  discount?: string | null;
  mechanic?: string | null;
  source?: string | null;
  reason?: string | null;
  note?: string | null;
}

interface CellData {
  retailer: string;
  kvi: string;
  status: 'VERIFIED' | 'USER-REPORTED' | 'N/V' | 'NC';
  price_lei_kg: number | null;
  price_standard_lei_kg?: number | null;
  price_cupon_lei_kg?: number | null;
  price_card_lei_kg?: number | null;
  mechanic_type?: 'standard' | 'card' | 'cupon' | null;
  validity: string | null;
  source: string | null;
  source_date: string | null;
  exact_product: string | null;
  discount: string | null;
  mechanic: string | null;
  isBest?: boolean;
  offer_history?: CellHistoryItem[];
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

interface CommercialConclusionItem {
  kvi: string;
  has_offers: boolean;
  best_price: number | null;
  best_retailers: string[];
  summary_title: string;
  text: string;
  offers_count: number;
  offers_detail: {
    retailer: string;
    price_lei_kg: number;
    exact_product: string;
    discount?: string | null;
    mechanic?: string | null;
    validity?: string | null;
    is_best: boolean;
    diff_lei_kg: number;
    diff_percent: number;
    is_conditional: boolean;
  }[];
  nv_retailers: string[];
}

interface CommercialConclusions {
  schema_version: string;
  week: string;
  year: number;
  calendar_period: string;
  items: CommercialConclusionItem[];
  competitive_summary: {
    week: string;
    year: number;
    calendar_period: string;
    best_price_counts: Record<string, number>;
    verified_offer_counts: Record<string, number>;
    ranked_retailers: string[];
  };
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
  commercial_conclusions?: CommercialConclusions;
  release_gate: {
    release_status: string;
    checks: Record<string, boolean>;
    errors?: string[];
  };
}

export default function App() {
  const [activeModule, setActiveModule] = useState<'home' | 'promo' | 'eu-pork' | 'clipping'>('home');
  const [data, setData] = useState<DashboardExport | null>(null);
  const [activeRelease, setActiveRelease] = useState<ActiveRelease | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [selectedTab, setSelectedTab] = useState<'image' | 'matrix' | 'insights'>('image');
  const [selectedCell, setSelectedCell] = useState<CellData | null>(null);
  const [zoomImage, setZoomImage] = useState<boolean>(false);
  const [zoomedImage, setZoomedImage] = useState<{ url: string; title: string } | null>(null);
  const [copiedHash, setCopiedHash] = useState<string | null>(null);
  const [isDownloading, setIsDownloading] = useState<boolean>(false);
  const [downloadToast, setDownloadToast] = useState<{ message: string; type: 'info' | 'success' | 'error' } | null>(null);

  const { manifest, formatUpdatedDisplay } = useMarketIntelligence();

  // Enforce Windows / Browser title across all navigation and modules
  const APP_TITLE = 'Fresh Meat Retail BI | Market Intelligence & Insights';
  useEffect(() => {
    document.title = APP_TITLE;
  }, [activeModule]);

  // Sync active module with URL hash (#promo, #eu-pork, #clipping, or empty for home)
  useEffect(() => {
    const handleHash = () => {
      const hash = (window.location.hash || '').replace('#', '');
      if (hash === 'promo' || hash === 'eu-pork' || hash === 'clipping') {
        setActiveModule(hash as any);
      } else if (!hash || hash === 'home') {
        setActiveModule('home');
      }
    };
    handleHash();
    window.addEventListener('hashchange', handleHash);
    return () => window.removeEventListener('hashchange', handleHash);
  }, []);

  // Keyboard navigation: ESC closes any open zoom modal
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setZoomImage(false);
        setZoomedImage(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const navigateToModule = (mod: 'home' | 'promo' | 'eu-pork' | 'clipping') => {
    setActiveModule(mod);
    window.location.hash = mod === 'home' ? '' : mod;
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

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

  const handleDownloadCustomImage = async (targetUrl: string, filename: string, e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
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
            text: `Fresh Meat Retail BI — ${filename}`
          });
          setDownloadToast({ message: 'Imagine partajată / salvată cu succes!', type: 'success' });
        } catch (shareErr: any) {
          if (shareErr?.name !== 'AbortError') {
            console.warn('Eroare la partajare iOS:', shareErr);
            triggerBlobDownload(blob, filename);
          }
        }
      } else if (isIOS) {
        setZoomedImage({ url: targetUrl, title: filename });
        setDownloadToast({ 
          message: 'Pe iOS, mențineți apăsată imaginea mărită și selectați „Salvați în Poze”.', 
          type: 'info' 
        });
      } else {
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

  const handleDownloadImage = async (e?: React.MouseEvent) => {
    if (!data) return;
    const targetUrl = data.image_url || getAssetUrl('/TOP5_PREȚURI_COMPETITORI_WK46_2026.png');
    const filename = `TOP5_PREȚURI_COMPETITORI_${data.week || 'WK46'}_${data.year || '2026'}.png`;
    handleDownloadCustomImage(targetUrl, filename, e);
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
      // 1. Fetch the active atomic pointer with cache-busting and no-store
      const pointerRes = await fetch(getAssetUrl('/data/active_release.json?t=' + Date.now()), {
        cache: 'no-store'
      });
      let pointer: ActiveRelease | null = null;
      let exportUrl = getAssetUrl('/data/bi_dashboard_export.json?v=' + Date.now());
      let imageUrl = getAssetUrl('/TOP5_PREȚURI_COMPETITORI_WK46_2026.png?v=' + Date.now());

      if (pointerRes.ok) {
        pointer = await pointerRes.json();
        if (pointer && pointer.release_status === 'RELEASE_PASS') {
          setActiveRelease(pointer);
          const v = pointer.dataset_sha256 || Date.now().toString();
          const imgV = pointer.output_sha256 || Date.now().toString();
          exportUrl = getAssetUrl(`${pointer.export_path}?v=${v}`);
          imageUrl = getAssetUrl(`${pointer.image_path}?v=${imgV}`);
        } else if (pointer && pointer.release_status === 'FAIL_CLOSED') {
          throw new Error('Pointerul activ indică FAIL_CLOSED (lansare blocată de poartă)');
        }
      }

      // 2. Consume immutable export JSON corresponding strictly to the active release
      const res = await fetch(exportUrl, { cache: 'no-store' });
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
      } else {
        json.image_url = json.image_url ? getAssetUrl(`${json.image_url}?v=${Date.now()}`) : imageUrl;
      }

      setData(json);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Eroare necunoscută la citirea exportului';
      setFetchError(msg);
    } finally {
      setLoading(false);
    }
  };

  // Background release checker: auto-detects new release and refreshes without interrupting the user
  const checkBackgroundRelease = async () => {
    try {
      const pointerRes = await fetch(getAssetUrl('/data/active_release.json?t=' + Date.now()), { cache: 'no-store' });
      if (!pointerRes.ok) return;
      const pointer: ActiveRelease = await pointerRes.json();
      if (!pointer || pointer.release_status !== 'RELEASE_PASS') return;

      // Detect if release changed or is newer
      if (activeRelease && pointer.release_id === activeRelease.release_id && data?.week === pointer.week) {
        return;
      }

      const exportUrl = getAssetUrl(`${pointer.export_path}?v=${pointer.dataset_sha256 || Date.now()}`);
      const res = await fetch(exportUrl, { cache: 'no-store' });
      if (!res.ok) return;
      const json: DashboardExport = await res.json();

      if (
        json.hashes.dataset_sha256 === pointer.dataset_sha256 &&
        json.hashes.output_sha256 === pointer.output_sha256
      ) {
        json.image_url = getAssetUrl(`${pointer.image_path}?v=${pointer.output_sha256 || Date.now()}`);
        setActiveRelease(pointer);
        setData(json);
      }
    } catch {
      // Silent background check; tolerate offline / transient network disconnects
    }
  };

  // On-demand serverless trigger: only attempts if backend exists, respecting global cooldown & mutex
  // On static hosting (GitHub Pages), gracefully falls back with zero errors and no token exposure
  const attemptOnDemandCollection = async () => {
    try {
      const statusRes = await fetch('/api/promo-weekly/status');
      if (!statusRes.ok) return; // Static host: endpoint 404, gracefully skip
      const statusData = await statusRes.json();
      if (statusData && statusData.can_collect_now && !statusData.is_collecting) {
        await fetch('/api/promo-weekly/trigger-collect', { method: 'POST' });
      }
    } catch {
      // Fallback for purely static environments
    }
  };

  useEffect(() => {
    // 1. Load latest validated release immediately on open/refresh
    loadDashboardData();

    // 2. Check if on-demand collection can run in background
    attemptOnDemandCollection();

    // 3. Periodic background polling every 60 seconds
    const intervalId = setInterval(() => {
      checkBackgroundRelease();
    }, 60000);

    // 4. Tab visibility and window focus listeners
    const handleVisibilityOrFocus = () => {
      if (document.visibilityState === 'visible') {
        checkBackgroundRelease();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityOrFocus);
    window.addEventListener('focus', handleVisibilityOrFocus);

    return () => {
      clearInterval(intervalId);
      document.removeEventListener('visibilitychange', handleVisibilityOrFocus);
      window.removeEventListener('focus', handleVisibilityOrFocus);
    };
  }, []);

  // When user navigates directly to promo module, ensure fresh data is retrieved
  useEffect(() => {
    if (activeModule === 'promo') {
      loadDashboardData();
    }
  }, [activeModule]);

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedHash(id);
    setTimeout(() => setCopiedHash(null), 2000);
  };

  const getCell = (retailer: string, item: string): CellData | undefined => {
    if (!data || !data.cells) return undefined;
    return data.cells.find(c => c.retailer === retailer && c.kvi === item);
  };

  // 1. Homepage Route: Exactly 3 Cards
  if (activeModule === 'home') {
    return (
      <>
        <Homepage onSelectModule={navigateToModule} />
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
      </>
    );
  }

  // 2. EU Pork Market Weekly Module Route
  if (activeModule === 'eu-pork') {
    return (
      <>
        <EuPorkMarketModule
          onBack={() => navigateToModule('home')}
          onDownloadImage={handleDownloadCustomImage}
          onZoomImage={(url, title) => setZoomedImage({ url, title })}
          isDownloading={isDownloading}
        />
        {zoomedImage && (
          <div 
            className="fixed inset-0 bg-black/90 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setZoomedImage(null)}
          >
            <div className="relative max-w-5xl max-h-[90vh] flex flex-col items-center">
              <button 
                onClick={() => setZoomedImage(null)}
                className="absolute -top-10 right-0 text-white hover:text-amber-400 text-sm font-semibold flex items-center gap-1 cursor-pointer"
              >
                Închide [ESC]
              </button>
              <img 
                src={zoomedImage.url} 
                alt={zoomedImage.title} 
                className="max-h-[85vh] w-auto object-contain rounded-lg shadow-2xl border border-slate-700" 
              />
              <div className="mt-3 text-xs text-slate-400 flex flex-wrap items-center justify-center gap-4">
                <button 
                  type="button"
                  onClick={(e) => {
                    const fallbackName = zoomedImage.url.includes('EU_PORK') ? 'EU_PORK_MARKET_WK45_2026.png' : 'RAPORT_GRAFIC.png';
                    handleDownloadCustomImage(zoomedImage.url, fallbackName, e);
                  }}
                  disabled={isDownloading}
                  className="text-amber-400 hover:text-amber-300 hover:underline font-semibold flex items-center gap-1.5 cursor-pointer disabled:opacity-60"
                >
                  {isDownloading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
                  <span>{isDownloading ? 'Se procesează...' : 'Descarcă / Salvează imaginea'}</span>
                </button>
                <span className="text-[11px] text-slate-500 hidden sm:inline">(Pe iPhone: «Salvează imaginea» sau menține apăsat)</span>
              </div>
            </div>
          </div>
        )}
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
      </>
    );
  }

  // 3. Retail Media Clipping Weekly Module Route
  if (activeModule === 'clipping') {
    return (
      <>
        <RetailMediaClippingModule onBack={() => navigateToModule('home')} />
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
      </>
    );
  }

  // 4. Promo Weekly Module Route: Loading State
  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col items-center justify-center font-sans p-4 relative">
        <button
          type="button"
          onClick={() => navigateToModule('home')}
          className="absolute top-6 left-6 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 transition cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4 text-emerald-400" />
          <span>Înapoi la dashboard</span>
        </button>
        <div className="w-12 h-12 rounded-xl bg-emerald-600/20 border border-emerald-500/30 flex items-center justify-center animate-spin mb-4">
          <RefreshCw className="w-6 h-6 text-emerald-400" />
        </div>
        <h2 className="text-base font-bold text-white tracking-tight">Fresh Meat Retail BI — Promo Weekly</h2>
        <p className="text-xs text-slate-400 mt-1">Se verifică chitanțele criptografice și exportul motorului Python...</p>
      </div>
    );
  }

  // 5. Promo Weekly: FAIL_CLOSED State (Error or missing verified data)
  const isPass = data && data.release_status === 'RELEASE_PASS' && data.release_gate?.release_status === 'RELEASE_PASS';

  if (!isPass || fetchError) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
        <header className="border-b border-red-900/50 bg-red-950/20 backdrop-blur sticky top-0 z-40">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => navigateToModule('home')}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white text-xs font-semibold border border-slate-700 transition cursor-pointer"
              >
                <ArrowLeft className="w-4 h-4 text-red-400" />
                <span>Înapoi la dashboard</span>
              </button>
              <div className="h-6 w-px bg-slate-800 hidden sm:block" />
              <img 
                src={getAssetUrl('/icon-192.png')} 
                alt="Fresh Meat Retail BI Logo" 
                className="w-10 h-10 rounded-lg object-contain shadow-lg shadow-red-950/40 bg-slate-900 border border-red-800/60"
              />
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-lg font-bold text-white tracking-tight">Promo Weekly</h1>
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

  // 6. Normal RELEASE_PASS State: Displaying authentic verified Promo data
  const retailers = data.retailers || ['Kaufland', 'Lidl', 'PENNY', 'Carrefour', 'Auchan'];
  const kvi = data.kvi || ['Spată porc fără os', 'Pulpă porc fără os', 'Cotlet porc fără os', 'Ceafă porc fără os', 'Piept pui dezosat'];
  const pngUrl = data.image_url || getAssetUrl('/TOP5_PREȚURI_COMPETITORI_WK46_2026.png');

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
      {/* Top Corporate Nav */}
      <header className="border-b border-slate-800 bg-slate-900/90 backdrop-blur sticky top-0 z-40 pt-[max(0.25rem,env(safe-area-inset-top))]">
        <div className="max-w-7xl mx-auto px-3 sm:px-6 py-2.5 sm:py-3 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
            <button
              type="button"
              onClick={() => navigateToModule('home')}
              className="inline-flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white text-xs font-semibold border border-slate-700 transition cursor-pointer shrink-0"
              title="Revenire la ecranul principal"
            >
              <ArrowLeft className="w-4 h-4 text-emerald-400" />
              <span className="hidden xs:inline sm:inline">Înapoi la dashboard</span>
              <span className="inline xs:hidden sm:hidden">Înapoi</span>
            </button>
            <div className="h-6 w-px bg-slate-800 hidden sm:block" />
            <img 
              src={getAssetUrl('/icon-192.png')} 
              alt="Fresh Meat Retail BI Logo" 
              className="w-9 h-9 sm:w-10 sm:h-10 rounded-lg object-contain shadow-lg shadow-emerald-900/40 bg-slate-900 border border-slate-700/60 shrink-0"
            />
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-base sm:text-lg font-bold text-white tracking-tight truncate">Promo Weekly</h1>
              </div>
              <p className="text-[11px] sm:text-xs text-slate-400 truncate">
                TOP 5 ARTICOLE – PREȚURI COMPETITORI | {data.week} {data.year}
              </p>
            </div>
          </div>

          {/* Perioadă analizată în antet */}
          <div className="text-right shrink-0">
            <span className="text-[10px] sm:text-[11px] text-slate-400 block leading-tight">Perioadă analizată</span>
            <span className="text-xs sm:text-sm font-semibold text-slate-200">{data.calendar_period}</span>
          </div>
        </div>

        {/* Tab switcher: scrollabil orizontal fără bară de scroll pe mobil (Exact 3 secțiuni executive) */}
        <div className="max-w-7xl mx-auto px-3 sm:px-6 flex gap-1.5 sm:gap-2 border-t border-slate-800/60 pt-1 overflow-x-auto no-scrollbar touch-scroll whitespace-nowrap">
          <button 
            onClick={() => setSelectedTab('image')}
            className={`px-3 sm:px-4 py-2 text-xs font-medium border-b-2 transition flex items-center gap-1.5 sm:gap-2 shrink-0 cursor-pointer ${
              selectedTab === 'image' 
                ? 'border-emerald-500 text-emerald-400 bg-slate-800/40' 
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Eye className="w-3.5 h-3.5" /> Raport Săptămânal
          </button>
          <button 
            onClick={() => setSelectedTab('matrix')}
            className={`px-3 sm:px-4 py-2 text-xs font-medium border-b-2 transition flex items-center gap-1.5 sm:gap-2 shrink-0 cursor-pointer ${
              selectedTab === 'matrix' 
                ? 'border-emerald-500 text-emerald-400 bg-slate-800/40' 
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <FileCheck2 className="w-3.5 h-3.5" /> Comparație Prețuri
          </button>
          <button 
            onClick={() => setSelectedTab('insights')}
            className={`px-3 sm:px-4 py-2 text-xs font-medium border-b-2 transition flex items-center gap-1.5 sm:gap-2 shrink-0 cursor-pointer ${
              selectedTab === 'insights' 
                ? 'border-emerald-500 text-emerald-400 bg-slate-800/40' 
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <TrendingDown className="w-3.5 h-3.5" /> Concluzii Comerciale
          </button>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 py-6 w-full space-y-6">
        {/* Tab 1: Image & Executive View */}
        {selectedTab === 'image' && (
          <div className="space-y-6">
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-3 sm:p-4 shadow-xl space-y-3">
              {/* Titlul dinamic RAPORT SĂPTĂMÂNA XX & Comenzile vizuale Mărește | Salvează imaginea */}
              <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-800/80">
                <h2 className="text-base sm:text-lg md:text-xl font-bold text-white tracking-tight uppercase text-left">
                  RAPORT SĂPTĂMÂNA {data.week ? data.week.replace(/\D/g, '') : '46'}
                </h2>
                <div className="flex items-center gap-2 shrink-0">
                  <button 
                    type="button"
                    onClick={() => setZoomImage(true)}
                    className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-md bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white text-xs font-semibold border border-slate-700 shadow-sm transition cursor-pointer"
                    title="Mărește imaginea în ecran complet"
                  >
                    <Maximize2 className="w-3.5 h-3.5 text-slate-300" />
                    <span>Mărește</span>
                  </button>
                  <button 
                    type="button"
                    onClick={handleDownloadImage}
                    disabled={isDownloading}
                    className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-md bg-emerald-600 hover:bg-emerald-500 disabled:opacity-60 text-white text-xs font-semibold shadow-md shadow-emerald-950/40 border border-emerald-500/50 transition cursor-pointer"
                    title="Salvează imaginea raportului (suport Web Share API pe iOS)"
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
              <div className="relative group bg-slate-950 rounded-lg p-1.5 sm:p-2.5 border border-slate-800/80 overflow-hidden flex justify-center items-center">
                <img 
                  src={pngUrl} 
                  alt={`TOP 5 ARTICOLE – PREȚURI COMPETITORI | ${data.week} ${data.year}`} 
                  className="w-full max-w-5xl h-auto max-h-[78vh] object-contain rounded shadow-2xl cursor-pointer transition hover:opacity-95"
                  onClick={() => setZoomImage(true)}
                  title="Click pentru a mări imaginea"
                />
              </div>
            </div>

            {/* Secțiune Comercială: Cele mai bune prețuri per produs */}
            <div className="flex justify-center">
              <div className="w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-xl p-4 sm:p-5 shadow-lg">
                <div className="text-xs sm:text-sm font-bold text-emerald-400 uppercase tracking-wider mb-3 flex items-center justify-between pb-2.5 border-b border-slate-800">
                  <span className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    Cele mai bune prețuri per produs
                  </span>
                  <span className="text-[11px] font-normal text-slate-400 normal-case">
                    Top oferte active KVI
                  </span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2.5 text-xs text-slate-300">
                  {kvi.map(item => {
                    const best = data.summary?.best_prices?.[item];
                    return (
                      <div key={item} className="flex items-center justify-between py-2 px-3 rounded-lg bg-slate-950/70 border border-slate-800/80">
                        <span className="text-slate-300 font-medium">{item}:</span>
                        {best ? (
                          <span className="font-extrabold text-emerald-400 text-sm">
                            {best.toFixed(2).replace('.', ',')} <span className="text-[10px] font-medium text-slate-400">lei/kg</span>
                          </span>
                        ) : (
                          <span className="text-slate-400 font-semibold text-xs">N/V (Fără ofertă)</span>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Tab 2: Interactive Matrix */}
        {selectedTab === 'matrix' && (
          <div className="space-y-6">
            <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-xl">
              <div className="p-4 border-b border-slate-800 flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h3 className="text-base sm:text-lg font-bold text-white tracking-tight uppercase">
                    COMPARAȚIE PREȚURI — SĂPTĂMÂNA {data.week ? data.week.replace(/\D/g, '') : '46'}
                  </h3>
                </div>
                <div className="flex flex-wrap items-center gap-3 text-xs">
                  <span className="flex items-center gap-1.5 text-emerald-400 font-semibold">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 shadow-sm shadow-emerald-400"></span> Ofertă Verificată
                  </span>
                  <span className="flex items-center gap-1.5 text-slate-400 font-medium bg-slate-950/80 px-2.5 py-1 rounded-md border border-slate-800">
                    <span className="font-bold text-slate-300">N/V</span> = ofertă comparabilă neverificată
                  </span>
                </div>
              </div>

              <div className="overflow-x-auto touch-scroll">
                <div className="sm:hidden px-4 py-1.5 bg-slate-800/40 border-b border-slate-800 text-[11px] text-slate-400 text-center flex items-center justify-center gap-1">
                  <span>← Glisați orizontal pentru toți cei 5 retaileri →</span>
                </div>
                <table className="w-full text-left text-xs border-collapse min-w-[620px]">
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
                                  {c.price_cupon_lei_kg && (
                                    <div className="text-[10px] font-semibold text-amber-300 bg-amber-950/40 px-1 py-0.5 rounded border border-amber-500/30">
                                      cu cupon: {c.price_cupon_lei_kg.toFixed(2).replace('.', ',')} lei
                                    </div>
                                  )}
                                  {c.price_card_lei_kg && c.retailer === 'PENNY' && (
                                    <div className="text-[10px] font-semibold text-sky-300 bg-sky-950/40 px-1 py-0.5 rounded border border-sky-500/30">
                                      cu card: {c.price_card_lei_kg.toFixed(2).replace('.', ',')} lei
                                    </div>
                                  )}
                                  <div className="text-[10px] text-slate-400">
                                    {c.validity}
                                  </div>
                                </div>
                              ) : (
                                <div className="py-1">
                                  <span className="text-xs font-bold text-slate-400">N/V</span>
                                  {c?.offer_history && c.offer_history.length > 0 && (
                                    <div className="text-[9px] text-amber-400/80 mt-0.5" title={`Ofertă anterioară expirată: ${c.offer_history[0].price_lei_kg} lei/kg (${c.offer_history[0].period})`}>
                                      expirat la {c.offer_history[0].period.split('–')[1] || c.offer_history[0].period}
                                    </div>
                                  )}
                                  {(!c?.offer_history || c.offer_history.length === 0) && (
                                    <div className="text-[10px] text-slate-400 mt-0.5">—</div>
                                  )}
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
              <div className="bg-slate-900 border border-emerald-500/30 rounded-xl p-5 shadow-2xl relative space-y-4">
                <button 
                  onClick={() => setSelectedCell(null)}
                  className="absolute top-4 right-4 text-slate-400 hover:text-white text-xs px-2 py-1 rounded bg-slate-800"
                >
                  Închide
                </button>
                <div className="flex items-center gap-2 mb-1">
                  <span className={`px-2.5 py-0.5 rounded text-xs font-bold ${
                    selectedCell.status === 'VERIFIED'
                      ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                      : 'bg-slate-800 text-slate-400 border border-slate-700'
                  }`}>
                    {selectedCell.status}
                  </span>
                  <h4 className="text-base font-bold text-white">
                    {selectedCell.retailer} — {selectedCell.kvi}
                  </h4>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
                  <div className="bg-slate-950 p-3 rounded-lg border border-slate-800">
                    <span className="text-slate-500 block">Preț normalizat activ</span>
                    <span className="text-lg font-bold text-emerald-400">
                      {selectedCell.price_lei_kg ? `${selectedCell.price_lei_kg.toFixed(2)} lei/kg` : 'N/V (Fără ofertă activă)'}
                    </span>
                  </div>
                  <div className="bg-slate-950 p-3 rounded-lg border border-slate-800">
                    <span className="text-slate-500 block">Perioadă valabilitate</span>
                    <span className="text-slate-200 font-semibold">{selectedCell.validity || 'Nu se aplică (N/V)'}</span>
                  </div>
                  <div className="bg-slate-950 p-3 rounded-lg border border-slate-800">
                    <span className="text-slate-500 block">Produs exact</span>
                    <span className="text-slate-200 font-semibold">{selectedCell.exact_product || 'Nicio ofertă de catalog activă'}</span>
                  </div>
                  <div className="bg-slate-950 p-3 rounded-lg border border-slate-800">
                    <span className="text-slate-500 block">Mecanism promoțional</span>
                    <span className="text-slate-200 font-semibold">{selectedCell.mechanic || 'N/A'}</span>
                  </div>
                </div>

                {/* Conditional Pricing Separation (Card vs Cupon vs Standard) */}
                {selectedCell.price_cupon_lei_kg && (
                  <div className="p-3.5 rounded-lg bg-amber-950/20 border border-amber-500/30 text-xs space-y-1.5">
                    <div className="font-semibold text-amber-300 flex items-center gap-1.5">
                      <Tag className="w-3.5 h-3.5" /> Separare Explicită Preț Standard vs. Cupon {selectedCell.retailer} Plus:
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-slate-300">
                      <div>Preț standard la raft (fără cupon): <strong className="text-white">{selectedCell.price_standard_lei_kg?.toFixed(2)} lei/kg</strong></div>
                      <div>Preț cu cupon activat: <strong className="text-emerald-400">{selectedCell.price_cupon_lei_kg?.toFixed(2)} lei/kg</strong> (economie {(selectedCell.price_standard_lei_kg! - selectedCell.price_cupon_lei_kg!).toFixed(2)} lei/kg)</div>
                    </div>
                  </div>
                )}

                {selectedCell.price_card_lei_kg && (
                  <div className="p-3.5 rounded-lg bg-sky-950/20 border border-sky-500/30 text-xs space-y-1.5">
                    <div className="font-semibold text-sky-300 flex items-center gap-1.5">
                      <Tag className="w-3.5 h-3.5" /> Separare Explicită Preț Standard vs. Card {selectedCell.retailer}:
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-slate-300">
                      <div>Preț standard (fără card): <strong className="text-white">{selectedCell.price_standard_lei_kg?.toFixed(2)} lei/kg</strong></div>
                      <div>Preț cu card {selectedCell.retailer}: <strong className="text-emerald-400">{selectedCell.price_card_lei_kg?.toFixed(2)} lei/kg</strong></div>
                    </div>
                  </div>
                )}

                {/* Expired Offer Audit History (ACTIVE OFFERS ONLY Rule) */}
                {selectedCell.offer_history && selectedCell.offer_history.length > 0 && (
                  <div className="p-3.5 rounded-lg bg-slate-950 border border-amber-500/30 text-xs space-y-2">
                    <div className="font-semibold text-amber-400 flex items-center justify-between">
                      <span className="flex items-center gap-1.5">
                        <History className="w-3.5 h-3.5" /> Istoric Audit – Oferte Anterioare (Regula ACTIVE OFFERS ONLY):
                      </span>
                      <span className="text-[10px] text-slate-400 bg-slate-900 px-2 py-0.5 rounded border border-slate-800">
                        {selectedCell.offer_history.length} {selectedCell.offer_history.length === 1 ? 'înregistrare' : 'înregistrări'}
                      </span>
                    </div>
                    <div className="space-y-1.5 text-slate-300">
                      {selectedCell.offer_history.map((hist, hIdx) => (
                        <div key={hIdx} className="bg-slate-900/80 p-2.5 rounded border border-slate-800 text-xs">
                          <div className="flex items-center justify-between font-medium">
                            <span className="text-slate-200">{hist.product || selectedCell.kvi}</span>
                            <span className="text-amber-400 font-bold">
                              {hist.price_lei_kg ? `${hist.price_lei_kg.toFixed(2)} lei/kg` : hist.status}
                            </span>
                          </div>
                          <div className="text-[11px] text-slate-400 mt-1">
                            Perioadă: <span className="text-slate-200">{hist.period}</span> · Statut: <span className="text-amber-300 uppercase font-semibold">{hist.status}</span>
                            {hist.discount && ` (${hist.discount})`}
                          </div>
                          <div className="text-[11px] text-slate-500 mt-1 italic">
                            {hist.reason || hist.note || 'Ofertă arhivată conform politicii de audit.'}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="text-xs bg-slate-950 p-3 rounded-lg border border-slate-800 flex items-center justify-between">
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

        {/* Tab 3: Concluzii Comerciale (100% Dynamic from Active Release Dataset) */}
        {selectedTab === 'insights' && (
          <div className="space-y-6">
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-xl">
              <div className="pb-4 border-b border-slate-800 mb-4">
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <TrendingDown className="w-4 h-4 text-emerald-400" />
                  Analiză Comercială & Dinamică Prețuri Carne ({data.week} {data.year})
                </h3>
              </div>

              {/* Dynamic KVI Breakdown */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                {data.kvi.map((kviItem, idx) => {
                  const verifiedOffers = data.cells.filter(
                    c => c.kvi === kviItem && c.status === 'VERIFIED' && c.price_lei_kg != null
                  ).sort((a, b) => a.price_lei_kg! - b.price_lei_kg!);

                  const nvRetailers = data.cells.filter(
                    c => c.kvi === kviItem && c.status === 'N/V'
                  ).map(c => c.retailer);

                  const minPrice = verifiedOffers.length > 0 ? verifiedOffers[0].price_lei_kg! : null;
                  const leaders = verifiedOffers.filter(c => Math.abs(c.price_lei_kg! - minPrice!) < 0.001);
                  const competitors = verifiedOffers.filter(c => Math.abs(c.price_lei_kg! - minPrice!) >= 0.001);

                  const colorStyles = [
                    { border: 'border-emerald-500/30', header: 'text-emerald-400', badge: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' },
                    { border: 'border-blue-500/30', header: 'text-blue-400', badge: 'bg-blue-500/10 text-blue-400 border-blue-500/30' },
                    { border: 'border-amber-500/30', header: 'text-amber-400', badge: 'bg-amber-500/10 text-amber-400 border-amber-500/30' },
                    { border: 'border-purple-500/30', header: 'text-purple-400', badge: 'bg-purple-500/10 text-purple-400 border-purple-500/30' },
                    { border: 'border-rose-500/30', header: 'text-rose-400', badge: 'bg-rose-500/10 text-rose-400 border-rose-500/30' }
                  ][idx % 5];

                  return (
                    <div key={kviItem} className={`bg-slate-950 p-4 rounded-lg border ${colorStyles.border} flex flex-col justify-between`}>
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <h4 className={`text-sm font-semibold ${colorStyles.header} flex items-center gap-1.5`}>
                            <TrendingDown className="w-4 h-4" /> {kviItem}
                          </h4>
                          {minPrice !== null ? (
                            <span className={`px-2 py-0.5 rounded text-[11px] font-bold border ${colorStyles.badge}`}>
                              Minim: {minPrice.toFixed(2)} lei/kg
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded text-[11px] font-medium bg-slate-800 text-slate-400 border border-slate-700">
                              Nicio ofertă (N/V)
                            </span>
                          )}
                        </div>

                        {verifiedOffers.length > 0 ? (
                          <div className="space-y-2 mt-2">
                            {/* Leaders */}
                            <p className="text-slate-300 leading-relaxed">
                              {leaders.map(l => l.retailer).join(' și ')} asigură cel mai mic nivel de preț la{' '}
                              <strong className="text-white">{minPrice?.toFixed(2)} lei/kg</strong>
                              {leaders.map(l => {
                                const details = [];
                                if (l.discount) details.push(l.discount);
                                if (l.mechanic) details.push(l.mechanic);
                                if (l.exact_product) details.push(l.exact_product);
                                return details.length > 0 ? ` (${l.retailer}: ${details.join(', ')})` : '';
                              }).join('')}
                              {competitors.length > 0 && (
                                <>, în timp ce {competitors.map(c => {
                                  const diff = (c.price_lei_kg! - minPrice!).toFixed(2);
                                  const pct = (((c.price_lei_kg! - minPrice!) / minPrice!) * 100).toFixed(1);
                                  const cond = c.mechanic ? ` [${c.mechanic}]` : '';
                                  return (
                                    <span key={c.retailer}>
                                      {c.retailer} listează la <strong className="text-slate-200">{c.price_lei_kg?.toFixed(2)} lei/kg</strong>{cond} (+{diff} lei/kg, +{pct}%)
                                    </span>
                                  );
                                }).reduce((prev, curr) => [prev, '; ', curr] as any)}.</>
                              )}
                            </p>

                            {/* Format & Conditionality Tags */}
                            <div className="flex flex-wrap gap-1.5 pt-1">
                              {verifiedOffers.map(v => (
                                <span 
                                  key={v.retailer} 
                                  className="text-[10px] px-2 py-0.5 rounded bg-slate-900 border border-slate-800 text-slate-400"
                                >
                                  {v.retailer}: {v.price_lei_kg?.toFixed(2)} lei
                                  {v.price_cupon_lei_kg && ` (cupon: ${v.price_cupon_lei_kg.toFixed(2)} lei)`}
                                  {v.price_card_lei_kg && ` (card: ${v.price_card_lei_kg.toFixed(2)} lei)`}
                                  {' · '}{v.validity || 'WK' + data.week}
                                </span>
                              ))}
                            </div>
                          </div>
                        ) : (
                          <p className="text-slate-400 leading-relaxed mt-2">
                            Niciun retailer monitorizat nu are oferte promoționale active în catalog pentru acest sortiment în săptămâna {data.week} (toate celulele auditate N/V).
                          </p>
                        )}
                      </div>

                      {nvRetailers.length > 0 && (
                        <div className="mt-3 pt-2 border-t border-slate-900 text-[10px] text-slate-500 flex items-center gap-1">
                          <Info className="w-3 h-3 flex-shrink-0" />
                          <span>Fără promoție în catalog: {nvRetailers.join(', ')}</span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Competitive Positioning Matrix */}
              <div className="mt-4 p-4 bg-slate-950 rounded-lg border border-slate-800 text-xs">
                <h4 className="text-sm font-semibold text-slate-200 mb-2 flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-emerald-400" />
                  Poziționare Competitivă & Acoperire Promoțională ({data.week} {data.year})
                </h4>
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mt-3">
                  {data.retailers.map(ret => {
                    const retVerified = data.cells.filter(c => c.retailer === ret && c.status === 'VERIFIED').length;
                    const retBests = data.cells.filter(c => c.retailer === ret && c.status === 'VERIFIED' && c.isBest).length;
                    return (
                      <div key={ret} className="bg-slate-900/60 p-2.5 rounded border border-slate-800 text-center">
                        <span className="font-bold text-slate-200 block text-xs">{ret}</span>
                        <span className="text-[11px] text-emerald-400 font-semibold block mt-1">
                          {retBests} {retBests === 1 ? 'preț minim' : 'prețuri minime'}
                        </span>
                        <span className="text-[10px] text-slate-400 block mt-0.5">
                          {retVerified} / 5 oferte confirmate
                        </span>
                      </div>
                    );
                  })}
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
            <div className="mt-3 text-xs text-slate-400 flex flex-wrap items-center justify-center gap-4">
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

      {/* Universal Footer */}
      <Footer />
    </div>
  );
}
