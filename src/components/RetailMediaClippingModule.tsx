import React, { useState } from 'react';
import { 
  ArrowLeft, 
  Newspaper, 
  Store, 
  FileText, 
  ExternalLink, 
  CheckCircle2, 
  Calendar, 
  Tag, 
  Layers,
  Search
} from 'lucide-react';

interface RetailMediaClippingModuleProps {
  onBack: () => void;
}

export default function RetailMediaClippingModule({ onBack }: RetailMediaClippingModuleProps) {
  const [selectedTab, setSelectedTab] = useState<'catalogs' | 'press' | 'methodology'>('catalogs');

  const retailers = [
    {
      name: 'Kaufland',
      channel: 'Revista Săptămânală & Kaufland Card',
      frequency: 'Miercuri – Marți (Ciclul promoțional principal)',
      app: 'Kaufland Card (Cupoane personalizate & reduceri exclusive)',
      privateBrand: 'K-Purland (Carne 100% din România)',
      monitoredCuts: ['Spată porc f.o.', 'Pulpă porc f.o.', 'Cotlet porc f.o.', 'Ceafă porc f.o.', 'Piept pui dezosat'],
      mechanics: ['Preț șoc cu Kaufland Card', 'Reducere procentuală directă', 'Ofertă de weekend (Vineri-Duminică)']
    },
    {
      name: 'Lidl',
      channel: 'Catalogul Săptămânal & Lidl Plus',
      frequency: 'Luni – Duminică (Actualizări Luni și Joi)',
      app: 'Lidl Plus (Cupoane activate în aplicație)',
      privateBrand: 'Cămara Noastră & Pikok',
      monitoredCuts: ['Spată porc f.o.', 'Pulpă porc f.o.', 'Cotlet porc f.o.', 'Ceafă porc f.o.', 'Piept pui dezosat'],
      mechanics: ['Cupon Lidl Plus (-20% / -25%)', 'Promoție XXL / Gramaj sporit', 'Super Weekend Lidl']
    },
    {
      name: 'PENNY',
      channel: 'Pliantul Săptămânal & PENNY Card',
      frequency: 'Miercuri – Marți',
      app: 'PENNY Card (Preț redus cu scanare card la casă)',
      privateBrand: 'Hanul Boieresc (Carne cu origine românească)',
      monitoredCuts: ['Spată porc f.o.', 'Pulpă porc f.o.', 'Cotlet porc f.o.', 'Ceafă porc f.o.', 'Piept pui dezosat'],
      mechanics: ['Preț redus cu PENNY Card', 'Reducere de volum (3 buc / pachet)', 'Promoția zilei']
    },
    {
      name: 'Carrefour',
      channel: 'Catalog Hipermarket / Market & ActForFood',
      frequency: 'Joi – Miercuri',
      app: 'ActForFood / Aplicația Carrefour',
      privateBrand: 'Filiera Calității Carrefour & Drag de România',
      monitoredCuts: ['Spată porc f.o.', 'Pulpă porc f.o.', 'Cotlet porc f.o.', 'Ceafă porc f.o.', 'Piept pui dezosat'],
      mechanics: ['Reducere pe bon de cumpărături', 'Preț special ActForFood', 'Promoție 2+1 la preț redus']
    },
    {
      name: 'Auchan',
      channel: 'Catalogul Promoțional & MyClub Auchan',
      frequency: 'Miercuri – Marți',
      app: 'MyClub Auchan (Bani înapoi pe cardul de fidelitate)',
      privateBrand: 'Filiera Auchan & Pouce',
      monitoredCuts: ['Spată porc f.o.', 'Pulpă porc f.o.', 'Cotlet porc f.o.', 'Ceafă porc f.o.', 'Piept pui dezosat'],
      mechanics: ['Cashback pe card MyClub', 'Preț redus direct la casă', 'Promoții tematice de sezon']
    }
  ];

  const tradePublications = [
    {
      name: 'Revista Progresiv',
      focus: 'Retail modern & FMCG, barometre de vânzări pe categoria carne proaspătă',
      coverage: 'Analize de sortimentație, dinamica mărcilor private, interviuri directori de achiziții'
    },
    {
      name: 'Revista Piața',
      focus: 'Strategii de retail, campanii de promovare și comportamentul de achiziție al consumatorilor',
      coverage: 'Campanii in-store, digital retail media, evaluarea eficienței promoțiilor'
    },
    {
      name: 'Trends HRB',
      focus: 'Tendințe din canalul de distribuție, HoReCa și procesare agroalimentară',
      coverage: 'Prețuri de achiziție en-gros, cerere pe segmente specifice de carne proaspătă'
    },
    {
      name: 'Modern Buyer',
      focus: 'Studii de categorie carne și preparate, relațiile furnizori-retaileri',
      coverage: 'Conferințe de profil, rapoarte anuale de consum, monitorizare lansări noi'
    },
    {
      name: 'Retail-FMCG',
      focus: 'Știri cotidiene din retailul alimentar din România',
      coverage: 'Deschideri de magazine noi, campanii de loialitate, extinderea rețelelor de discounters'
    },
    {
      name: 'Meat.Milk',
      focus: 'Industria cărnii din România, procesatori, abatoare și ferme locale',
      coverage: 'Producția internă de carne de porc și pasăre, legislație sanitar-veterinară, subvenții'
    }
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
                <h1 className="text-lg font-bold text-white tracking-tight">Retail Media Clipping Weekly</h1>
                <span className="px-2 py-0.5 text-xs rounded-full bg-sky-500/20 text-sky-400 font-semibold border border-sky-500/30 flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" /> MONITORING_ACTIVE
                </span>
              </div>
              <p className="text-xs text-slate-400">
                MONITORIZARE CATALOG PROMOȚIONAL, APLICAȚII RETAIL & PRESĂ DE SPECIALITATE
              </p>
            </div>
          </div>
        </div>

        {/* Tab switcher */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 flex gap-2 border-t border-slate-800/60 pt-1">
          <button
            onClick={() => setSelectedTab('catalogs')}
            className={`px-4 py-2 text-xs font-medium border-b-2 transition flex items-center gap-2 ${
              selectedTab === 'catalogs'
                ? 'border-sky-500 text-sky-400 bg-slate-800/40'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Store className="w-3.5 h-3.5" /> Cataloage & Aplicații Retaileri
          </button>
          <button
            onClick={() => setSelectedTab('press')}
            className={`px-4 py-2 text-xs font-medium border-b-2 transition flex items-center gap-2 ${
              selectedTab === 'press'
                ? 'border-sky-500 text-sky-400 bg-slate-800/40'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Newspaper className="w-3.5 h-3.5" /> Presă Specializată & Canale Media
          </button>
          <button
            onClick={() => setSelectedTab('methodology')}
            className={`px-4 py-2 text-xs font-medium border-b-2 transition flex items-center gap-2 ${
              selectedTab === 'methodology'
                ? 'border-sky-500 text-sky-400 bg-slate-800/40'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <FileText className="w-3.5 h-3.5" /> Protocol & Metodologie
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-6">
        
        {/* Tab 1: Catalogs & Retailers */}
        {selectedTab === 'catalogs' && (
          <div className="space-y-6">
            <div className="bg-slate-900 rounded-xl p-6 border border-slate-800 shadow-xl">
              <div className="flex flex-wrap items-center justify-between pb-4 border-b border-slate-800 gap-2 mb-6">
                <div>
                  <h2 className="text-base font-semibold text-white">Monitorizare Promoțională Top 5 Retaileri</h2>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Urmărirea cataloagelor tipărite, edițiilor digitale și campaniilor exclusive din aplicațiile mobile.
                  </p>
                </div>
                <span className="text-xs text-slate-400">5 retaileri monitorizați săptămânal</span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {retailers.map(r => (
                  <div key={r.name} className="bg-slate-950 rounded-xl p-5 border border-slate-800 flex flex-col justify-between hover:border-sky-500/40 transition">
                    <div>
                      <div className="flex items-center justify-between mb-3">
                        <h3 className="text-base font-bold text-white">{r.name}</h3>
                        <span className="px-2 py-0.5 text-[11px] rounded bg-sky-500/10 text-sky-400 font-semibold border border-sky-500/20">
                          {r.channel}
                        </span>
                      </div>
                      
                      <div className="space-y-2 text-xs text-slate-300">
                        <div>
                          <span className="text-slate-500 block text-[11px]">Periodicitate catalog:</span>
                          <span className="font-medium">{r.frequency}</span>
                        </div>
                        <div>
                          <span className="text-slate-500 block text-[11px]">Aplicație mobilă & loialitate:</span>
                          <span className="text-sky-300 font-medium">{r.app}</span>
                        </div>
                        <div>
                          <span className="text-slate-500 block text-[11px]">Marcă proprie carne proaspătă:</span>
                          <span className="text-emerald-400 font-medium">{r.privateBrand}</span>
                        </div>
                      </div>

                      <div className="mt-4 pt-3 border-t border-slate-800/80">
                        <span className="text-slate-500 block text-[11px] mb-1.5 font-semibold">Mecanisme promoționale urmărite:</span>
                        <div className="flex flex-wrap gap-1.5">
                          {r.mechanics.map((m, idx) => (
                            <span key={idx} className="px-2 py-0.5 text-[11px] rounded bg-slate-800 text-slate-300 border border-slate-700">
                              {m}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>

                    <div className="mt-4 pt-3 border-t border-slate-800/80 text-[11px] text-slate-400 flex items-center justify-between">
                      <span>Articole KVI: 5 monitorizate</span>
                      <span className="text-emerald-400 font-semibold">ACTIV</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Tab 2: Trade Media */}
        {selectedTab === 'press' && (
          <div className="bg-slate-900 rounded-xl p-6 border border-slate-800 shadow-xl space-y-6">
            <div className="flex items-center justify-between pb-4 border-b border-slate-800">
              <div>
                <h2 className="text-base font-semibold text-white">Canale Media & Presă de Specialitate</h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  Monitorizare editorială din publicațiile de afaceri, retail și industria cărnii din România.
                </p>
              </div>
              <span className="text-xs text-slate-400">6 publicații de profil</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {tradePublications.map(pub => (
                <div key={pub.name} className="bg-slate-950 rounded-xl p-5 border border-slate-800 hover:border-slate-700 transition flex flex-col justify-between">
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <Newspaper className="w-4 h-4 text-sky-400" />
                      <h3 className="text-sm font-bold text-white">{pub.name}</h3>
                    </div>
                    <p className="text-xs text-slate-300 mb-3 leading-relaxed">
                      {pub.focus}
                    </p>
                    <div className="text-[11px] text-slate-400 bg-slate-900/60 p-2.5 rounded-lg border border-slate-800/60">
                      <span className="font-semibold text-slate-300 block mb-0.5">Arie de acoperire:</span>
                      {pub.coverage}
                    </div>
                  </div>
                  <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-500">
                    <span>Flux săptămânal</span>
                    <span className="text-sky-400">Monitorizat permanent</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Tab 3: Methodology */}
        {selectedTab === 'methodology' && (
          <div className="bg-slate-900 rounded-xl p-6 border border-slate-800 shadow-xl space-y-6">
            <div>
              <h2 className="text-base font-semibold text-white">Protocolul de Monitorizare Retail Media</h2>
              <p className="text-xs text-slate-400 mt-1">
                Instrucțiuni metodologice stabilite pentru colectarea, verificarea și arhivarea dovezilor promoționale.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-xs text-slate-300">
              <div className="p-4 rounded-xl bg-slate-950 border border-slate-800">
                <div className="flex items-center gap-2 mb-2 text-sky-400 font-bold">
                  <Calendar className="w-4 h-4" />
                  <span>1. Fereastra de Monitorizare</span>
                </div>
                <p className="leading-relaxed text-slate-400">
                  Ciclul de monitorizare este sincronizat cu săptămâna ISO (Luni – Duminică). Cataloagele sunt auditate în ziua lansării promoționale (miercuri pentru Kaufland/PENNY, luni/joi pentru Lidl, joi pentru Carrefour).
                </p>
              </div>

              <div className="p-4 rounded-xl bg-slate-950 border border-slate-800">
                <div className="flex items-center gap-2 mb-2 text-emerald-400 font-bold">
                  <Tag className="w-4 h-4" />
                  <span>2. Criterii Like-for-Like</span>
                </div>
                <p className="leading-relaxed text-slate-400">
                  Pentru fiecare promoție se înregistrează specia, tăietura, starea osului (fără os), condiția de procesare (nemarinat/fără aditivi), unitatea de vânzare (per kg) și condițiile promoționale (preț standard vs preț card).
                </p>
              </div>

              <div className="p-4 rounded-xl bg-slate-950 border border-slate-800">
                <div className="flex items-center gap-2 mb-2 text-amber-400 font-bold">
                  <Layers className="w-4 h-4" />
                  <span>3. Integritatea Dovezilor</span>
                </div>
                <p className="leading-relaxed text-slate-400">
                  Toate prețurile și promoțiile sunt susținute de capturi digitale sau extrase PDF originale din cataloage. Ofertele nesusținute sau incerte sunt catalogate N/V pentru a garanta integritatea absolută a raportului.
                </p>
              </div>
            </div>
          </div>
        )}

      </main>

      {/* Footer */}
      <footer className="border-t border-slate-800/80 bg-slate-950 py-4 text-center text-xs text-slate-400">
        <div className="max-w-7xl mx-auto px-4 flex flex-wrap items-center justify-between gap-2">
          <span>Fresh Meat Retail BI — Modul Retail Media Clipping Weekly</span>
          <span>Pilon de Inteligență Competitivă Promoțională</span>
        </div>
      </footer>
    </div>
  );
}
