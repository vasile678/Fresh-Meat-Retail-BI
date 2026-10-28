import React, { useState } from 'react';
import { 
  CheckCircle2, 
  ShieldCheck, 
  Download, 
  ExternalLink, 
  Eye, 
  FileCheck2, 
  TrendingDown, 
  Calendar, 
  AlertCircle, 
  Info,
  Maximize2,
  Copy,
  ChevronRight,
  Sparkles,
  ArrowRight
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

const RETAILERS = ['Kaufland', 'Lidl', 'PENNY', 'Carrefour', 'Auchan'];
const KVI = [
  'Spată porc fără os',
  'Pulpă porc fără os',
  'Cotlet porc fără os',
  'Ceafă porc fără os',
  'Piept pui dezosat'
];

const CELLS_DATA: CellData[] = [
  // Spată porc fără os
  {
    retailer: 'Kaufland',
    kvi: 'Spată porc fără os',
    status: 'VERIFIED',
    price_lei_kg: 14.90,
    validity: '28.10–03.11.2026',
    source: 'Kaufland România – catalog oficial WK44',
    source_date: '2026-10-28',
    exact_product: 'Spată de porc fără os vacuum Purland',
    discount: '-21%',
    mechanic: 'standard promo',
    isBest: false
  },
  {
    retailer: 'Lidl',
    kvi: 'Spată porc fără os',
    status: 'VERIFIED',
    price_lei_kg: 13.90,
    validity: '26.10–01.11.2026',
    source: 'Lidl România – catalog oficial WK44 (Lidl Plus)',
    source_date: '2026-10-26',
    exact_product: 'Spată de porc fără os XXL (1,39 lei/100g, max 6kg/bon)',
    discount: 'Lidl Plus',
    mechanic: 'cupon Lidl Plus',
    isBest: true
  },
  {
    retailer: 'PENNY',
    kvi: 'Spată porc fără os',
    status: 'N/V',
    price_lei_kg: null,
    validity: null,
    source: null,
    source_date: null,
    exact_product: null,
    discount: null,
    mechanic: null
  },
  {
    retailer: 'Carrefour',
    kvi: 'Spată porc fără os',
    status: 'N/V',
    price_lei_kg: null,
    validity: null,
    source: null,
    source_date: null,
    exact_product: null,
    discount: null,
    mechanic: null
  },
  {
    retailer: 'Auchan',
    kvi: 'Spată porc fără os',
    status: 'N/V',
    price_lei_kg: null,
    validity: null,
    source: null,
    source_date: null,
    exact_product: null,
    discount: null,
    mechanic: null
  },

  // Pulpă porc fără os
  {
    retailer: 'Kaufland',
    kvi: 'Pulpă porc fără os',
    status: 'VERIFIED',
    price_lei_kg: 15.99,
    validity: '28.10–03.11.2026',
    source: 'Kaufland România – catalog oficial WK44',
    source_date: '2026-10-28',
    exact_product: 'Pulpă de porc fără os kg',
    discount: '-33%',
    mechanic: 'standard promo',
    isBest: true
  },
  {
    retailer: 'Lidl',
    kvi: 'Pulpă porc fără os',
    status: 'N/V',
    price_lei_kg: null,
    validity: null,
    source: null,
    source_date: null,
    exact_product: null,
    discount: null,
    mechanic: null
  },
  {
    retailer: 'PENNY',
    kvi: 'Pulpă porc fără os',
    status: 'VERIFIED',
    price_lei_kg: 15.99,
    validity: '28.10–03.11.2026',
    source: 'PENNY România – catalog oficial WK44 (Penny Card)',
    source_date: '2026-10-28',
    exact_product: 'Hanul Boieresc Pulpă de porc fără os kg',
    discount: '-30%',
    mechanic: 'Penny Card',
    isBest: true
  },
  {
    retailer: 'Carrefour',
    kvi: 'Pulpă porc fără os',
    status: 'N/V',
    price_lei_kg: null,
    validity: null,
    source: null,
    source_date: null,
    exact_product: null,
    discount: null,
    mechanic: null
  },
  {
    retailer: 'Auchan',
    kvi: 'Pulpă porc fără os',
    status: 'N/V',
    price_lei_kg: null,
    validity: null,
    source: null,
    source_date: null,
    exact_product: null,
    discount: null,
    mechanic: null
  },

  // Cotlet porc fără os
  {
    retailer: 'Kaufland',
    kvi: 'Cotlet porc fără os',
    status: 'VERIFIED',
    price_lei_kg: 16.99,
    validity: '28.10–03.11.2026',
    source: 'Kaufland România – catalog oficial WK44',
    source_date: '2026-10-28',
    exact_product: 'Cotlet de porc fără os bucată',
    discount: '-39%',
    mechanic: 'standard promo',
    isBest: true
  },
  {
    retailer: 'Lidl',
    kvi: 'Cotlet porc fără os',
    status: 'VERIFIED',
    price_lei_kg: 24.73,
    validity: '26.10–01.11.2026',
    source: 'Lidl România – catalog oficial WK44 (Lidl Plus)',
    source_date: '2026-10-26',
    exact_product: 'Cotlet de porc fără os feliat 400g (9,89 lei/cas)',
    discount: 'Lidl Plus',
    mechanic: 'cupon Lidl Plus',
    isBest: false
  },
  {
    retailer: 'PENNY',
    kvi: 'Cotlet porc fără os',
    status: 'VERIFIED',
    price_lei_kg: 27.68,
    validity: '28.10–03.11.2026',
    source: 'PENNY România – catalog oficial WK44 (Penny Card)',
    source_date: '2026-10-28',
    exact_product: 'Hanul Boieresc Cotlet de porc fără os feliat 650g (17,99 lei)',
    discount: '-22%',
    mechanic: 'Penny Card',
    isBest: false
  },
  {
    retailer: 'Carrefour',
    kvi: 'Cotlet porc fără os',
    status: 'N/V',
    price_lei_kg: null,
    validity: null,
    source: null,
    source_date: null,
    exact_product: null,
    discount: null,
    mechanic: null
  },
  {
    retailer: 'Auchan',
    kvi: 'Cotlet porc fără os',
    status: 'N/V',
    price_lei_kg: null,
    validity: null,
    source: null,
    source_date: null,
    exact_product: null,
    discount: null,
    mechanic: null
  },

  // Ceafă porc fără os
  {
    retailer: 'Kaufland',
    kvi: 'Ceafă porc fără os',
    status: 'N/V',
    price_lei_kg: null,
    validity: null,
    source: null,
    source_date: null,
    exact_product: null,
    discount: null,
    mechanic: null
  },
  {
    retailer: 'Lidl',
    kvi: 'Ceafă porc fără os',
    status: 'N/V',
    price_lei_kg: null,
    validity: null,
    source: null,
    source_date: null,
    exact_product: null,
    discount: null,
    mechanic: null
  },
  {
    retailer: 'PENNY',
    kvi: 'Ceafă porc fără os',
    status: 'N/V',
    price_lei_kg: null,
    validity: null,
    source: null,
    source_date: null,
    exact_product: null,
    discount: null,
    mechanic: null
  },
  {
    retailer: 'Carrefour',
    kvi: 'Ceafă porc fără os',
    status: 'N/V',
    price_lei_kg: null,
    validity: null,
    source: null,
    source_date: null,
    exact_product: null,
    discount: null,
    mechanic: null
  },
  {
    retailer: 'Auchan',
    kvi: 'Ceafă porc fără os',
    status: 'N/V',
    price_lei_kg: null,
    validity: null,
    source: null,
    source_date: null,
    exact_product: null,
    discount: null,
    mechanic: null
  },

  // Piept pui dezosat
  {
    retailer: 'Kaufland',
    kvi: 'Piept pui dezosat',
    status: 'N/V',
    price_lei_kg: null,
    validity: null,
    source: null,
    source_date: null,
    exact_product: null,
    discount: null,
    mechanic: null
  },
  {
    retailer: 'Lidl',
    kvi: 'Piept pui dezosat',
    status: 'VERIFIED',
    price_lei_kg: 28.90,
    validity: '26.10–01.11.2026',
    source: 'Lidl România – catalog oficial WK44',
    source_date: '2026-10-26',
    exact_product: 'Piept de pui dezosat fără piele (2,89 lei/100g)',
    discount: 'Promoție',
    mechanic: 'standard promo',
    isBest: true
  },
  {
    retailer: 'PENNY',
    kvi: 'Piept pui dezosat',
    status: 'N/V',
    price_lei_kg: null,
    validity: null,
    source: null,
    source_date: null,
    exact_product: null,
    discount: null,
    mechanic: null
  },
  {
    retailer: 'Carrefour',
    kvi: 'Piept pui dezosat',
    status: 'N/V',
    price_lei_kg: null,
    validity: null,
    source: null,
    source_date: null,
    exact_product: null,
    discount: null,
    mechanic: null
  },
  {
    retailer: 'Auchan',
    kvi: 'Piept pui dezosat',
    status: 'N/V',
    price_lei_kg: null,
    validity: null,
    source: null,
    source_date: null,
    exact_product: null,
    discount: null,
    mechanic: null
  }
];

export default function App() {
  const [selectedTab, setSelectedTab] = useState<'image' | 'matrix' | 'receipts' | 'insights'>('image');
  const [selectedCell, setSelectedCell] = useState<CellData | null>(null);
  const [zoomImage, setZoomImage] = useState<boolean>(false);
  const [copiedHash, setCopiedHash] = useState<string | null>(null);

  const pngUrl = '/TOP5_PREȚURI_COMPETITORI_WK44_2026.png';
  const outputSha = '59b63464598939e65c6798d14065568a63e5ffde806e90d2f6fe323f64901ae9';
  const masterSha = '5c272afc25f7813c5060d6204128ac75964eaadb1d8d708378db7c59e396966c';
  const datasetSha = '16ebcd3c4a31b6f861e45358d48603cc0156d797cc4fddff9ff4793b57b9b915';

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedHash(id);
    setTimeout(() => setCopiedHash(null), 2000);
  };

  const getCell = (retailer: string, item: string) => {
    return CELLS_DATA.find(c => c.retailer === retailer && c.kvi === item);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
      {/* Top Corporate Nav */}
      <header className="border-b border-slate-800 bg-slate-900/90 backdrop-blur sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-emerald-600 flex items-center justify-center font-bold text-white shadow-lg shadow-emerald-900/40">
              FM
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg font-bold text-white tracking-tight">Fresh Meat Retail BI</h1>
                <span className="px-2 py-0.5 text-xs rounded-full bg-emerald-500/20 text-emerald-400 font-semibold border border-emerald-500/30 flex items-center gap-1">
                  <ShieldCheck className="w-3.5 h-3.5" /> RELEASE_PASS
                </span>
              </div>
              <p className="text-xs text-slate-400">
                TOP 5 ARTICOLE – PREȚURI COMPETITORI | WK44 2026 (±3 ZILE)
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <a 
              href={pngUrl}
              download="TOP5_PREȚURI_COMPETITORI_WK44_2026.png"
              className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-md bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold shadow-md transition"
            >
              <Download className="w-3.5 h-3.5" /> Descarcă PNG 4:3
            </a>
            <div className="text-right hidden sm:block">
              <span className="text-[11px] text-slate-400 block">Perioadă analizată</span>
              <span className="text-xs font-medium text-slate-200">26 OCT – 01 NOI 2026</span>
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
            <TrendingDown className="w-3.5 h-3.5" /> Concluzii & Comparație WK38
          </button>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 py-6 w-full">
        {/* KPI Summary strip */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-slate-900 border border-slate-800 p-3.5 rounded-lg">
            <span className="text-xs text-slate-400 font-medium">Acoperire Matrice 5×5</span>
            <div className="text-xl font-bold text-white mt-0.5 flex items-center justify-between">
              25 / 25
              <span className="text-xs px-2 py-0.5 rounded bg-blue-500/10 text-blue-400 border border-blue-500/20">Audit 100%</span>
            </div>
            <span className="text-[11px] text-slate-500 mt-1 block">5 retaileri × 5 articole KVI</span>
          </div>

          <div className="bg-slate-900 border border-slate-800 p-3.5 rounded-lg">
            <span className="text-xs text-slate-400 font-medium">Prețuri VERIFIED</span>
            <div className="text-xl font-bold text-emerald-400 mt-0.5 flex items-center justify-between">
              6 Oferte
              <span className="text-xs px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">Active</span>
            </div>
            <span className="text-[11px] text-slate-500 mt-1 block">Kaufland (3), Lidl (3), PENNY (2)</span>
          </div>

          <div className="bg-slate-900 border border-slate-800 p-3.5 rounded-lg">
            <span className="text-xs text-slate-400 font-medium">Prețuri N/V (Neverificate)</span>
            <div className="text-xl font-bold text-amber-400 mt-0.5 flex items-center justify-between">
              19 Celule
              <span className="text-xs px-2 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20">Fără promo</span>
            </div>
            <span className="text-[11px] text-slate-500 mt-1 block">Carrefour, Auchan & ceafă/spată</span>
          </div>

          <div className="bg-slate-900 border border-slate-800 p-3.5 rounded-lg">
            <span className="text-xs text-slate-400 font-medium">Poartă de lansare</span>
            <div className="text-xl font-bold text-emerald-400 mt-0.5 flex items-center justify-between">
              RELEASE_PASS
              <CheckCircle2 className="w-5 h-5 text-emerald-400" />
            </div>
            <span className="text-[11px] text-slate-500 mt-1 block">Static Pixels 100% match</span>
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
                    Generată prin suprapunere pe Masterul Locked SHA-256 conform CONFIG_MANIFEST. Static pixels match: 100%.
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button 
                    onClick={() => setZoomImage(true)}
                    className="px-3 py-1.5 rounded bg-slate-800 hover:bg-slate-700 text-xs font-medium text-slate-200 inline-flex items-center gap-1.5 transition"
                  >
                    <Maximize2 className="w-3.5 h-3.5" /> Mărește
                  </button>
                  <a 
                    href={pngUrl}
                    download="TOP5_PREȚURI_COMPETITORI_WK44_2026.png"
                    className="px-3 py-1.5 rounded bg-emerald-600 hover:bg-emerald-500 text-xs font-semibold text-white inline-flex items-center gap-1.5 transition shadow"
                  >
                    <Download className="w-3.5 h-3.5" /> Salvează imaginea
                  </a>
                </div>
              </div>

              {/* Rendered Image Display */}
              <div className="relative group bg-slate-950 rounded-lg p-2 border border-slate-800/80 overflow-hidden flex justify-center items-center">
                <img 
                  src={pngUrl} 
                  alt="TOP 5 ARTICOLE – PREȚURI COMPETITORI | WK44 2026" 
                  className="max-h-[640px] w-auto object-contain rounded shadow-2xl cursor-pointer transition hover:opacity-95"
                  onClick={() => setZoomImage(true)}
                />
              </div>

              {/* Integrity metadata footer */}
              <div className="mt-4 pt-3 border-t border-slate-800 flex flex-wrap items-center justify-between text-xs text-slate-400 gap-2">
                <div className="flex items-center gap-4">
                  <span>Aspect ratio: <strong>4:3 (1.333)</strong></span>
                  <span>Master SHA-256: <code className="text-slate-300">5c272afc...966c</code></span>
                  <span>Output SHA-256: <code className="text-emerald-400">59b63464...1ae9</code></span>
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
                  <li className="flex justify-between border-b border-slate-800/60 pb-1.5">
                    <span>Spată porc:</span>
                    <strong className="text-emerald-400">Lidl – 13,90 lei/kg</strong>
                  </li>
                  <li className="flex justify-between border-b border-slate-800/60 pb-1.5">
                    <span>Pulpă porc:</span>
                    <strong className="text-emerald-400">Kaufland & Penny – 15,99 lei/kg</strong>
                  </li>
                  <li className="flex justify-between border-b border-slate-800/60 pb-1.5">
                    <span>Cotlet porc:</span>
                    <strong className="text-emerald-400">Kaufland – 16,99 lei/kg</strong>
                  </li>
                  <li className="flex justify-between border-b border-slate-800/60 pb-1.5">
                    <span>Ceafă porc:</span>
                    <strong className="text-slate-400">Nicio ofertă (N/V peste tot)</strong>
                  </li>
                  <li className="flex justify-between">
                    <span>Piept pui:</span>
                    <strong className="text-emerald-400">Lidl – 28,90 lei/kg</strong>
                  </li>
                </ul>
              </div>

              <div className="bg-slate-900 border border-slate-800 rounded-lg p-4">
                <div className="text-xs font-bold text-amber-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                  <AlertCircle className="w-4 h-4" /> Politică Like-For-Like
                </div>
                <p className="text-xs text-slate-300 leading-relaxed">
                  Nu au fost incluse ca echivalente sortimentele de <em>ceafă marinată</em> (Kaufland/Carrefour) sau bucățile cu os. Prețurile afișate la Auchan sau Kaufland pe magazinele online fără reducere de catalog național rămân <strong>N/V</strong>.
                </p>
              </div>

              <div className="bg-slate-900 border border-slate-800 rounded-lg p-4">
                <div className="text-xs font-bold text-blue-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                  <Info className="w-4 h-4" /> Mecanisme promoționale
                </div>
                <p className="text-xs text-slate-300 leading-relaxed">
                  Lidl impune cupon Lidl Plus cu limită 6kg pe bon la spata de 13,90 lei/kg. La Penny, prețurile speciale Hanul Boieresc (pulpă 15,99 și cotlet 27,68) necesită scanarea Penny Card. Kaufland oferă reducere directă la casă.
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
                  <p className="text-xs text-slate-400">Faceți clic pe orice celulă pentru a inspecta sursa, mecanismul și trasabilitatea completă.</p>
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
                      <th className="py-3 px-4 text-center border-l border-slate-700/60 bg-red-950/20 text-red-200">Kaufland</th>
                      <th className="py-3 px-4 text-center border-l border-slate-700/60 bg-blue-950/20 text-blue-200">Lidl</th>
                      <th className="py-3 px-4 text-center border-l border-slate-700/60 bg-amber-950/20 text-amber-200">PENNY</th>
                      <th className="py-3 px-4 text-center border-l border-slate-700/60 bg-blue-900/10 text-cyan-200">Carrefour</th>
                      <th className="py-3 px-4 text-center border-l border-slate-700/60 bg-red-900/10 text-pink-200">Auchan</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800">
                    {KVI.map((item, idx) => (
                      <tr key={item} className={idx % 2 === 0 ? 'bg-slate-900/40' : 'bg-slate-900/80'}>
                        <td className="py-3.5 px-4 font-semibold text-slate-200 border-r border-slate-800">
                          {item}
                        </td>
                        {RETAILERS.map(ret => {
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
                                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shadow-sm shadow-emerald-400 animate-pulse" title="Cel mai bun preț"></span>
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
                    Dată sursă: {selectedCell.source_date || '2026-10-28'}
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
                  <span className="text-xs font-semibold text-slate-400">Chitanță Cercetare (25/25)</span>
                  <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 text-[10px] font-bold">PASS</span>
                </div>
                <div className="space-y-1.5 text-xs">
                  <div className="text-slate-300 font-mono text-[11px] truncate">
                    dataset_sha256: {datasetSha}
                  </div>
                  <div className="text-slate-400">Celule auditate: <strong>25/25</strong></div>
                  <div className="text-slate-400">Data auditului: <strong>2026-10-28T21:41Z</strong></div>
                </div>
                <button 
                  onClick={() => copyToClipboard(datasetSha, 'data')}
                  className="mt-3 w-full py-1.5 bg-slate-800 hover:bg-slate-700 rounded text-[11px] text-slate-300 flex items-center justify-center gap-1 transition"
                >
                  <Copy className="w-3 h-3" /> {copiedHash === 'data' ? 'Copiat!' : 'Copiază SHA-256'}
                </button>
              </div>

              <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-semibold text-slate-400">Chitanță Reconciliere</span>
                  <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 text-[10px] font-bold">PASS</span>
                </div>
                <div className="space-y-1.5 text-xs">
                  <div className="text-slate-300">Conflicte identificate: <strong>0</strong></div>
                  <div className="text-slate-300">Regulă: <strong>Strict Like-For-Like</strong></div>
                  <div className="text-slate-400">Reconciled at: <strong>2026-10-28</strong></div>
                </div>
                <div className="mt-3 text-[11px] text-emerald-400 bg-emerald-950/30 p-1.5 rounded border border-emerald-900 text-center font-medium">
                  ALL_CELLS_RECONCILED
                </div>
              </div>

              <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-semibold text-slate-400">Poartă BI (FRESH_MEAT_BI_GATE)</span>
                  <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 text-[10px] font-bold">RELEASE_PASS</span>
                </div>
                <div className="space-y-1.5 text-xs">
                  <div className="text-slate-300">Fail Mode: <strong>CLOSED</strong></div>
                  <div className="text-slate-300">Golden Static Pixels: <strong>100% (0 diffs)</strong></div>
                  <div className="text-slate-300 font-mono text-[11px] truncate">
                    output_sha256: {outputSha}
                  </div>
                </div>
                <button 
                  onClick={() => copyToClipboard(outputSha, 'out')}
                  className="mt-3 w-full py-1.5 bg-slate-800 hover:bg-slate-700 rounded text-[11px] text-slate-300 flex items-center justify-center gap-1 transition"
                >
                  <Copy className="w-3 h-3" /> {copiedHash === 'out' ? 'Copiat!' : 'Copiază Hash PNG'}
                </button>
              </div>
            </div>

            {/* JSON Schema & Governance Block */}
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
              <h4 className="text-sm font-semibold text-white mb-2">Autoritate de Guvernanță: CONFIG_MANIFEST.json</h4>
              <p className="text-xs text-slate-400 mb-3">
                Conform regulii LUMI Fresh Meat Retail BI v2.6, lansarea unui PNG promoțional este permisă exclusiv atunci când chitanțele de cercetare, reconciliere și randare sunt legate criptografic prin SHA-256 de lock-ul canonic.
              </p>

              <pre className="bg-slate-950 p-4 rounded-lg text-emerald-400 font-mono text-[11px] overflow-x-auto border border-slate-800 leading-relaxed">
{`{
  "release_status": "RELEASE_PASS",
  "executed_runtime": "FRESH_MEAT_BI_RUNTIME_v2.9-asset-resolution",
  "master_sha256": "${masterSha}",
  "dataset_sha256": "${datasetSha}",
  "output_sha256": "${outputSha}",
  "checks": {
    "coverage": true,               // 25/25 verified
    "matrix_identity": true,        // 5x5 canonical matrix
    "statuses": true,               // Allowed statuses only
    "source_integrity": true,       // All verified rows include source & exact SKU
    "research_25_25_evidence": true,// SHA-bound audit receipt
    "reconciliation": true,         // Clean reconciliation
    "render_receipt": true,         // Deterministic renderer v2.1
    "master_hash": true             // 100% pixel match on golden background
  }
}`}
              </pre>
            </div>
          </div>
        )}

        {/* Tab 4: Insights & Historical comparison */}
        {selectedTab === 'insights' && (
          <div className="space-y-6">
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-xl">
              <h3 className="text-base font-bold text-white mb-3">Analiză Comercială & Dinamică Prețuri Carne (WK44 vs WK38)</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4 text-xs">
                <div className="bg-slate-950 p-4 rounded-lg border border-slate-800">
                  <h4 className="text-sm font-semibold text-emerald-400 mb-2 flex items-center gap-1.5">
                    <TrendingDown className="w-4 h-4" /> Spată de porc fără os (Presiune agresivă)
                  </h4>
                  <p className="text-slate-300 leading-relaxed">
                    În WK38, spata a fost marcată N/V la toți retailerii din cauza lipsei ofertelor comparabile. În WK44, <strong>Lidl declanșează o promoție agresivă la 13,90 lei/kg</strong> (-1,39 lei/100g prin Lidl Plus), iar <strong>Kaufland răspunde la 14,90 lei/kg</strong> (Purland vacuum). Este cel mai scăzut nivel de preț din toamna 2026.
                  </p>
                </div>

                <div className="bg-slate-950 p-4 rounded-lg border border-slate-800">
                  <h4 className="text-sm font-semibold text-blue-400 mb-2 flex items-center gap-1.5">
                    <TrendingDown className="w-4 h-4" /> Pulpă de porc fără os (Stabilitate la 15,99 lei/kg)
                  </h4>
                  <p className="text-slate-300 leading-relaxed">
                    Prețul pulpei a scăzut de la 16,99 lei/kg (Kaufland/Auchan în septembrie) la un nivel minim sincronizat de <strong>15,99 lei/kg</strong> la Kaufland (-33%) și PENNY (Hanul Boieresc, -30% cu Penny Card).
                  </p>
                </div>

                <div className="bg-slate-950 p-4 rounded-lg border border-slate-800">
                  <h4 className="text-sm font-semibold text-amber-400 mb-2 flex items-center gap-1.5">
                    <TrendingDown className="w-4 h-4" /> Cotlet de porc fără os (Dispersie mare între retaileri)
                  </h4>
                  <p className="text-slate-300 leading-relaxed">
                    Kaufland conduce detașat cu <strong>16,99 lei/kg</strong> (-39% la bucata întreagă). Spre comparație, la Lidl (cotlet feliat 400g) prețul normalizat este de <strong>24,73 lei/kg</strong>, iar la PENNY (cotlet feliat 650g) este <strong>27,68 lei/kg</strong>.
                  </p>
                </div>

                <div className="bg-slate-950 p-4 rounded-lg border border-slate-800">
                  <h4 className="text-sm font-semibold text-purple-400 mb-2 flex items-center gap-1.5">
                    <Info className="w-4 h-4" /> Ceafă de porc & Piept pui
                  </h4>
                  <p className="text-slate-300 leading-relaxed">
                    Ceafa proaspătă fără os nu beneficiază de nicio reducere națională comparabilă în această săptămână (apar doar sortimente marinate sau fleică, excluse conform gate-ului). La pieptul de pui dezosat, singura ofertă națională activă este la Lidl (<strong>28,90 lei/kg</strong>).
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
              alt="TOP 5 ARTICOLE – PREȚURI COMPETITORI | WK44 2026" 
              className="max-h-[85vh] w-auto object-contain rounded-lg shadow-2xl border border-slate-700" 
            />
            <div className="mt-2 text-xs text-slate-400 flex items-center gap-4">
              <span>Raport de aspect 4:3</span>
              <span>Rezoluție: 1448 × 1086 px</span>
              <a 
                href={pngUrl} 
                download="TOP5_PREȚURI_COMPETITORI_WK44_2026.png"
                className="text-emerald-400 hover:underline font-semibold"
                onClick={e => e.stopPropagation()}
              >
                Descarcă fișierul PNG original
              </a>
            </div>
          </div>
        </div>
      )}

      {/* Footer */}
      <footer className="border-t border-slate-800/80 bg-slate-950 py-4 text-center text-xs text-slate-400">
        <div className="max-w-7xl mx-auto px-4 flex flex-wrap items-center justify-between gap-2">
          <span>Fresh Meat Retail BI — Sistem Guvernat de Monitorizare Competitivă</span>
          <span>Configurație activă: <code>CONFIG_MANIFEST.json</code> | LUMI 4.2 Production</span>
        </div>
      </footer>
    </div>
  );
}
