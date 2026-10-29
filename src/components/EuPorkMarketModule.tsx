import React, { useState } from 'react';
import { getAssetUrl } from '../utils';
import { 
  ArrowLeft, 
  Download, 
  Maximize2, 
  TrendingUp, 
  ShieldCheck, 
  Eye, 
  FileCheck2, 
  Scale, 
  AlertCircle,
  Loader2
} from 'lucide-react';

interface EuPorkMarketModuleProps {
  onBack: () => void;
  onDownloadImage: (url: string, filename: string) => void;
  onZoomImage: (imageUrl: string, title: string) => void;
  isDownloading: boolean;
}

export default function EuPorkMarketModule({
  onBack,
  onDownloadImage,
  onZoomImage,
  isDownloading
}: EuPorkMarketModuleProps) {
  const [selectedTab, setSelectedTab] = useState<'visual' | 'benchmarks' | 'takeaways' | 'governance'>('visual');
  const imageUrl = getAssetUrl('/EU_PORK_MARKET_GOLDEN_REFERENCE.png');
  const filename = 'EU_PORK_MARKET_GOLDEN_REFERENCE_WK38.png';

  const benchmarks = [
    { country: 'Germania', name: 'Germany VEZG', basis: 'Carcasă (Carcass)', unit: 'EUR / kg carcasă', authority: 'VEZG (Vereinigung der Erzeugergemeinschaften)', status: 'VERIFIED' },
    { country: 'Germania', name: 'ISN / Internet Pig Auction', basis: 'Comerț licitație', unit: 'EUR / kg carcasă', authority: 'ISN (Interessengemeinschaft der Schweinehalter)', status: 'VERIFIED' },
    { country: 'Spania', name: 'Spain Mercolleida', basis: 'Greutate vie (Live-weight)', unit: 'EUR / kg viu', authority: 'Lonja de Mercolleida', status: 'VERIFIED' },
    { country: 'Italia', name: 'Italy CUN 156–200 kg', basis: 'Porc greu (Heavy pig)', unit: 'EUR / kg viu', authority: 'Commissione Unica Nazionale (CUN)', status: 'VERIFIED' },
    { country: 'Olanda', name: 'Netherlands Vion', basis: 'Preț abator (Slaughterhouse)', unit: 'EUR / kg carcasă', authority: 'Vion Food Group', status: 'VERIFIED' },
    { country: 'Danemarca', name: 'Denmark Danish Crown', basis: 'Preț abator săptămânal', unit: 'DKK / kg carcasă', authority: 'Danish Crown', status: 'VERIFIED' },
    { country: 'Franța', name: 'France MPB', basis: 'Marché du Porc Breton', unit: 'EUR / kg carcasă', authority: 'MPB Plérin', status: 'VERIFIED' },
    { country: 'Polonia', name: 'Poland (ZMI) Class E', basis: 'Clasa E oficială', unit: 'PLN / 100 kg carcasă', authority: 'Ministerul Agriculturii Polonia (ZMR)', status: 'VERIFIED' }
  ];

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
      {/* Header */}
      <header className="border-b border-slate-800 bg-slate-900/90 backdrop-blur sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onBack}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white text-xs font-semibold border border-slate-700 transition cursor-pointer"
              title="Revenire la meniul principal"
            >
              <ArrowLeft className="w-4 h-4 text-emerald-400" />
              <span>Înapoi la dashboard</span>
            </button>
            <div className="h-6 w-px bg-slate-800 hidden sm:block" />
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg font-bold text-white tracking-tight">EU Pork Market Weekly</h1>
                <span className="px-2 py-0.5 text-xs rounded-full bg-amber-500/20 text-amber-400 font-semibold border border-amber-500/30 flex items-center gap-1">
                  <ShieldCheck className="w-3.5 h-3.5" /> ACTIVE_LOCKED
                </span>
              </div>
              <p className="text-xs text-slate-400">
                8 COTAȚII EUROPENE DE REFERINȚĂ | MASTER OVERLAY DETERMINIST
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => onDownloadImage(imageUrl, filename)}
              disabled={isDownloading}
              className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-md bg-amber-600 hover:bg-amber-500 disabled:opacity-60 text-white text-xs font-semibold shadow-md transition cursor-pointer"
              title="Descarcă sau salvează imaginea raportului"
            >
              {isDownloading ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Download className="w-3.5 h-3.5" />
              )}
              <span>{isDownloading ? 'Se procesează...' : 'Salvează imaginea 4:3'}</span>
            </button>
          </div>
        </div>

        {/* Tab switcher */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 flex gap-2 border-t border-slate-800/60 pt-1">
          <button
            onClick={() => setSelectedTab('visual')}
            className={`px-4 py-2 text-xs font-medium border-b-2 transition flex items-center gap-2 ${
              selectedTab === 'visual'
                ? 'border-amber-500 text-amber-400 bg-slate-800/40'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Eye className="w-3.5 h-3.5" /> Raport Vizual & Executiv
          </button>
          <button
            onClick={() => setSelectedTab('benchmarks')}
            className={`px-4 py-2 text-xs font-medium border-b-2 transition flex items-center gap-2 ${
              selectedTab === 'benchmarks'
                ? 'border-amber-500 text-amber-400 bg-slate-800/40'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Scale className="w-3.5 h-3.5" /> Cotații Oficiale (8 Piețe UE)
          </button>
          <button
            onClick={() => setSelectedTab('takeaways')}
            className={`px-4 py-2 text-xs font-medium border-b-2 transition flex items-center gap-2 ${
              selectedTab === 'takeaways'
                ? 'border-amber-500 text-amber-400 bg-slate-800/40'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <TrendingUp className="w-3.5 h-3.5" /> Semnale de Piață & Implicații
          </button>
          <button
            onClick={() => setSelectedTab('governance')}
            className={`px-4 py-2 text-xs font-medium border-b-2 transition flex items-center gap-2 ${
              selectedTab === 'governance'
                ? 'border-amber-500 text-amber-400 bg-slate-800/40'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <FileCheck2 className="w-3.5 h-3.5" /> Protocol Guvernanță
          </button>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-6">
        
        {/* Tab 1: Visual Report */}
        {selectedTab === 'visual' && (
          <div className="bg-slate-900 rounded-xl p-4 sm:p-6 border border-slate-800 shadow-xl">
            <div className="flex flex-wrap items-center justify-between pb-4 border-b border-slate-800 gap-4 mb-4">
              <div>
                <h2 className="text-base font-semibold text-white flex items-center gap-2">
                  EU Pork Market Weekly — Golden Reference & Master Overlay
                  <span className="text-xs font-normal text-slate-400">| Rezoluție 1536 × 1024 px</span>
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  Randat prin EU_PORK_MARKET_RENDERER conform EU_PORK_MARKET_CONFIG. Generative fallback: FORBIDDEN.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => onZoomImage(imageUrl, 'EU Pork Market Weekly — Golden Reference')}
                  className="px-3 py-1.5 rounded bg-slate-800 hover:bg-slate-700 text-xs font-medium text-slate-200 inline-flex items-center gap-1.5 transition"
                >
                  <Maximize2 className="w-3.5 h-3.5" /> Mărește
                </button>
                <button
                  onClick={() => onDownloadImage(imageUrl, filename)}
                  disabled={isDownloading}
                  className="px-3 py-1.5 rounded bg-amber-600 hover:bg-amber-500 disabled:opacity-60 text-xs font-semibold text-white inline-flex items-center gap-1.5 transition shadow cursor-pointer"
                >
                  {isDownloading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
                  <span>{isDownloading ? 'Se procesează...' : 'Salvează imaginea'}</span>
                </button>
              </div>
            </div>

            <div className="relative bg-slate-950 rounded-lg p-2 border border-slate-800/80 overflow-hidden flex justify-center items-center">
              <img
                src={imageUrl}
                alt="EU Pork Market Weekly Golden Reference"
                className="max-h-[640px] w-auto object-contain rounded shadow-2xl cursor-pointer transition hover:opacity-95"
                onClick={() => onZoomImage(imageUrl, 'EU Pork Market Weekly — Golden Reference')}
              />
            </div>

            <div className="mt-4 pt-3 border-t border-slate-800 flex flex-wrap items-center justify-between text-xs text-slate-400 gap-2">
              <div className="flex items-center gap-4">
                <span>Aspect ratio: <strong>4:3 (Master WK38)</strong></span>
                <span>SHA-256: <code className="text-amber-400">ac785f514eed0ae6...</code></span>
              </div>
              <div className="text-slate-500">
                Validat de FRESH_MEAT_BI_GATE v1.5 | CONFIG_MANIFEST
              </div>
            </div>
          </div>
        )}

        {/* Tab 2: Benchmarks */}
        {selectedTab === 'benchmarks' && (
          <div className="space-y-6">
            <div className="bg-slate-900 rounded-xl p-6 border border-slate-800 shadow-xl">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-base font-semibold text-white">Cele 8 Cotații Europene de Referință</h2>
                  <p className="text-xs text-slate-400 mt-1">
                    Ordine canonică fixată în protocolul v2.6. Fără amestec între carcasă și greutate vie.
                  </p>
                </div>
                <span className="text-xs text-slate-400">8 din 8 piețe monitorizate</span>
              </div>

              <div className="overflow-x-auto rounded-lg border border-slate-800">
                <table className="w-full text-left text-xs text-slate-300">
                  <thead className="bg-slate-800/80 text-slate-200 uppercase font-semibold text-[11px] border-b border-slate-700">
                    <tr>
                      <th className="py-3 px-4">#</th>
                      <th className="py-3 px-4">Țară</th>
                      <th className="py-3 px-4">Cotație Oficială</th>
                      <th className="py-3 px-4">Bază de Calcul</th>
                      <th className="py-3 px-4">Unitate de Măsură</th>
                      <th className="py-3 px-4">Autoritate / Bursă</th>
                      <th className="py-3 px-4 text-right">Statut</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800">
                    {benchmarks.map((b, idx) => (
                      <tr key={b.name} className="hover:bg-slate-800/40 transition">
                        <td className="py-3 px-4 font-mono text-slate-400">{idx + 1}</td>
                        <td className="py-3 px-4 font-medium text-white">{b.country}</td>
                        <td className="py-3 px-4 font-bold text-amber-300">{b.name}</td>
                        <td className="py-3 px-4">{b.basis}</td>
                        <td className="py-3 px-4 font-mono text-slate-300">{b.unit}</td>
                        <td className="py-3 px-4 text-slate-400">{b.authority}</td>
                        <td className="py-3 px-4 text-right">
                          <span className="px-2 py-0.5 text-[11px] rounded bg-emerald-500/20 text-emerald-400 font-semibold border border-emerald-500/30">
                            {b.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="mt-4 p-3 rounded-lg bg-amber-500/10 border border-amber-500/20 text-xs text-amber-300 flex items-start gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>
                  <strong>Regulă de Integritate a Unităților:</strong> Cotațiile din Spania (Mercolleida) și Italia (CUN) sunt exprimate în greutate vie (live-weight), în timp ce Germania (VEZG) și Olanda (Vion) sunt exprimate în carcasă. Protocolul interzice conversia sau mediarea artificială între baze diferite.
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Tab 3: Takeaways */}
        {selectedTab === 'takeaways' && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-slate-900 rounded-xl p-6 border border-slate-800 shadow-xl flex flex-col justify-between">
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-2.5 h-2.5 rounded-full bg-amber-400" />
                  <h3 className="text-sm font-bold text-white uppercase tracking-wider">Market Signal</h3>
                </div>
                <p className="text-xs text-slate-300 leading-relaxed">
                  Piața europeană de carne de porc indică o fază de stabilizare a cotațiilor în zona central-vestică (Germania VEZG, Olanda Vion). Oferta de porci pentru sacrificare este echilibrată cu capacitățile active de procesare, fără acumulări de stocuri în ferme.
                </p>
              </div>
              <div className="mt-4 pt-3 border-t border-slate-800 text-[11px] text-slate-500">
                Sursa: Barometrul VEZG & ISN
              </div>
            </div>

            <div className="bg-slate-900 rounded-xl p-6 border border-slate-800 shadow-xl flex flex-col justify-between">
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
                  <h3 className="text-sm font-bold text-white uppercase tracking-wider">Key Takeaways</h3>
                </div>
                <p className="text-xs text-slate-300 leading-relaxed">
                  Spania (Mercolleida) rămâne cel mai competitiv pol sud-european datorită deschiderilor pe piețele terțe din Asia, menținând o primă de preț. În estul Europei (Polonia), prețurile clasei E urmăresc cotația de bază germană, cu variații dictate de paritatea valutară EUR/PLN.
                </p>
              </div>
              <div className="mt-4 pt-3 border-t border-slate-800 text-[11px] text-slate-500">
                Sursa: Mercolleida & Min. Agriculturii Polonia
              </div>
            </div>

            <div className="bg-slate-900 rounded-xl p-6 border border-slate-800 shadow-xl flex flex-col justify-between">
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-2.5 h-2.5 rounded-full bg-sky-400" />
                  <h3 className="text-sm font-bold text-white uppercase tracking-wider">Implications for Buyers</h3>
                </div>
                <p className="text-xs text-slate-300 leading-relaxed">
                  Pentru achizitorii din rețelele moderne din România, stabilitatea pieței germane oferă o fereastră de negociere predictibilă pentru volumele spot (spată, ceafă). Se recomandă contractarea pe ferestre scurte (1–2 săptămâni) și evitarea angajamentelor lungi la prețuri fixe ridicate.
                </p>
              </div>
              <div className="mt-4 pt-3 border-t border-slate-800 text-[11px] text-slate-500">
                Recomandare Executivă Fresh Meat BI
              </div>
            </div>
          </div>
        )}

        {/* Tab 4: Governance */}
        {selectedTab === 'governance' && (
          <div className="bg-slate-900 rounded-xl p-6 border border-slate-800 shadow-xl space-y-4">
            <h2 className="text-base font-semibold text-white">Guvernanță & Contract Tehnic EU Pork Market</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs text-slate-300">
              <div className="p-4 rounded-lg bg-slate-950 border border-slate-800">
                <span className="font-semibold text-white block mb-1">Contract Configurație</span>
                <p className="text-slate-400">Fișier: <code>fresh_meat_bi/EU_PORK_MARKET_CONFIG.json</code></p>
                <p className="text-slate-400">Versiune: <code>2.6.1-lumi-compact</code></p>
                <p className="text-slate-400">Model randare: <code>DETERMINISTIC_MASTER_OVERLAY</code></p>
                <p className="text-slate-400">Generative fallback: <code>FORBIDDEN</code></p>
              </div>
              <div className="p-4 rounded-lg bg-slate-950 border border-slate-800">
                <span className="font-semibold text-white block mb-1">Poartă de Validare</span>
                <p className="text-slate-400">Autoritate: <code>FRESH_MEAT_BI_GATE_v1.py</code></p>
                <p className="text-slate-400">Cerințe lansare: <code>renderer_receipt, source_receipt, visual_receipt</code></p>
                <p className="text-slate-400">Politica erorilor: <code>FAIL_CLOSED</code> (fără aproximări)</p>
                <p className="text-slate-400">Golden Reference SHA-256: <code>ac785f514eed0ae6...</code></p>
              </div>
            </div>
          </div>
        )}

      </main>

      {/* Footer */}
      <footer className="border-t border-slate-800/80 bg-slate-950 py-4 text-center text-xs text-slate-400">
        <div className="max-w-7xl mx-auto px-4 flex flex-wrap items-center justify-between gap-2">
          <span>Fresh Meat Retail BI — Modul EU Pork Market Weekly</span>
          <span>Guvernat prin <code>CONFIG_MANIFEST.json</code></span>
        </div>
      </footer>
    </div>
  );
}
