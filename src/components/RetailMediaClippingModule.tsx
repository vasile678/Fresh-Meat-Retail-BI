import React, { useState } from 'react';
import { 
  ArrowLeft, 
  Newspaper, 
  Store, 
  TrendingUp, 
  ExternalLink, 
  CheckCircle2, 
  Calendar, 
  Tag, 
  Layers
} from 'lucide-react';

interface RetailMediaClippingModuleProps {
  onBack: () => void;
}

interface RetailerCatalogInfo {
  name: string;
  catalogUrl: string;
  channel: string;
  frequency: string;
  validity: string;
  app: string;
  privateBrand: string;
  monitoredCuts: string[];
  mechanics: string[];
}

export default function RetailMediaClippingModule({ onBack }: RetailMediaClippingModuleProps) {
  const [selectedTab, setSelectedTab] = useState<'catalogs' | 'press' | 'intelligence'>('catalogs');

  // Exact 7 retaileri monitorizați cu legături directe către cataloagele oficiale
  const retailers: RetailerCatalogInfo[] = [
    {
      name: 'Kaufland',
      catalogUrl: 'https://www.kaufland.ro/cataloage-cu-reduceri.html',
      channel: 'Revista Săptămânală & Kaufland Card',
      frequency: 'Miercuri – Marți (Ciclul promoțional principal)',
      validity: 'Miercuri – Marți',
      app: 'Kaufland Card (Cupoane personalizate & reduceri exclusive)',
      privateBrand: 'K-Purland (Carne 100% din România)',
      monitoredCuts: ['Spată porc f.o.', 'Pulpă porc f.o.', 'Cotlet porc f.o.', 'Ceafă porc f.o.', 'Piept pui dezosat'],
      mechanics: ['Preț șoc cu Kaufland Card', 'Reducere procentuală directă', 'Ofertă de weekend (Vineri-Duminică)']
    },
    {
      name: 'Lidl',
      catalogUrl: 'https://www.lidl.ro/l/ro/cataloage/',
      channel: 'Catalogul Săptămânal & Lidl Plus',
      frequency: 'Luni – Duminică (Actualizări Luni și Joi)',
      validity: 'Luni – Duminică',
      app: 'Lidl Plus (Cupoane activate în aplicație)',
      privateBrand: 'Cămara Noastră & Pikok',
      monitoredCuts: ['Spată porc f.o.', 'Pulpă porc f.o.', 'Cotlet porc f.o.', 'Ceafă porc f.o.', 'Piept pui dezosat'],
      mechanics: ['Cupon Lidl Plus (-20% / -25%)', 'Promoție XXL / Gramaj sporit', 'Super Weekend Lidl']
    },
    {
      name: 'Penny',
      catalogUrl: 'https://www.penny.ro/vezi-pliantele-saptamanii',
      channel: 'Pliantul Săptămânal & PENNY Card',
      frequency: 'Miercuri – Marți',
      validity: 'Miercuri – Marți',
      app: 'PENNY Card (Preț redus cu scanare card la casă)',
      privateBrand: 'Hanul Boieresc (Carne cu origine românească)',
      monitoredCuts: ['Spată porc f.o.', 'Pulpă porc f.o.', 'Cotlet porc f.o.', 'Ceafă porc f.o.', 'Piept pui dezosat'],
      mechanics: ['Preț redus cu PENNY Card', 'Reducere de volum (3 buc / pachet)', 'Promoția zilei']
    },
    {
      name: 'Carrefour',
      catalogUrl: 'https://carrefour.ro/corporate/cataloage',
      channel: 'Catalog Hipermarket / Market & ActForFood',
      frequency: 'Joi – Miercuri',
      validity: 'Joi – Miercuri',
      app: 'ActForFood / Aplicația Carrefour',
      privateBrand: 'Filiera Calității Carrefour & Drag de România',
      monitoredCuts: ['Spată porc f.o.', 'Pulpă porc f.o.', 'Cotlet porc f.o.', 'Ceafă porc f.o.', 'Piept pui dezosat'],
      mechanics: ['Reducere pe bon de cumpărături', 'Preț special ActForFood', 'Promoție 2+1 la preț redus']
    },
    {
      name: 'Auchan',
      catalogUrl: 'https://www.auchan.ro/cataloage',
      channel: 'Catalogul Promoțional & MyClub Auchan',
      frequency: 'Miercuri – Marți',
      validity: 'Miercuri – Marți',
      app: 'MyClub Auchan (Bani înapoi pe cardul de fidelitate)',
      privateBrand: 'Filiera Auchan & Pouce',
      monitoredCuts: ['Spată porc f.o.', 'Pulpă porc f.o.', 'Cotlet porc f.o.', 'Ceafă porc f.o.', 'Piept pui dezosat'],
      mechanics: ['Cashback pe card MyClub', 'Preț redus direct la casă', 'Promoții tematice de sezon']
    },
    {
      name: 'Profi',
      catalogUrl: 'https://www.profi.ro/reviste-ro/',
      channel: 'Revista Promoțională & Profi App',
      frequency: 'Miercuri – Marți (Ediții Standard / Loco / City)',
      validity: 'Miercuri – Marți',
      app: 'Aplicația Profi (Cuponiada & reduceri digitale)',
      privateBrand: 'Proxi & Ferma din Deal',
      monitoredCuts: ['Spată porc f.o.', 'Pulpă porc f.o.', 'Cotlet porc f.o.', 'Ceafă porc f.o.', 'Piept pui dezosat'],
      mechanics: ['Preț special cu aplicația Profi', 'Oferte de weekend', 'Reducere pachet']
    },
    {
      name: 'Mega Image',
      catalogUrl: 'https://revista.mega-image.ro/',
      channel: 'Revista Săptămânală & Card Connect',
      frequency: 'Joi – Miercuri',
      validity: 'Joi – Miercuri',
      app: 'Aplicația Mega Image & Card Connect',
      privateBrand: 'Gusturi Românești & Mega Apetit',
      monitoredCuts: ['Spată porc f.o.', 'Pulpă porc f.o.', 'Cotlet porc f.o.', 'Ceafă porc f.o.', 'Piept pui dezosat'],
      mechanics: ['Preț Card Connect', 'Promoție de weekend', 'Reduceri la pachete proaspete']
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
      <header className="border-b border-slate-800 bg-slate-900/90 backdrop-blur sticky top-0 z-40 pt-[max(0.25rem,env(safe-area-inset-top))]">
        <div className="max-w-7xl mx-auto px-3 sm:px-6 py-2.5 sm:py-3 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
            <button
              type="button"
              onClick={onBack}
              className="inline-flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white text-xs font-semibold border border-slate-700 transition cursor-pointer shrink-0"
              title="Revenire la meniul principal"
            >
              <ArrowLeft className="w-4 h-4 text-emerald-400" />
              <span className="hidden xs:inline sm:inline">Înapoi la dashboard</span>
              <span className="inline xs:hidden sm:hidden">Înapoi</span>
            </button>
            <div className="h-6 w-px bg-slate-800 hidden sm:block" />
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-base sm:text-lg font-bold text-white tracking-tight truncate">RETAIL MEDIA MONITOR</h1>
                <span className="px-2 py-0.5 text-[11px] sm:text-xs rounded-full bg-sky-500/20 text-sky-400 font-semibold border border-sky-500/30 flex items-center gap-1 shrink-0">
                  <CheckCircle2 className="w-3.5 h-3.5" /> MONITORING_ACTIVE
                </span>
              </div>
              <p className="text-[11px] sm:text-xs text-slate-400 truncate">
                CATALOAGE PROMOȚIONALE 7 RETAILERI & PRESĂ
              </p>
            </div>
          </div>
        </div>

        {/* Tab switcher: scrollabil orizontal fără bară de scroll pe mobil */}
        <div className="max-w-7xl mx-auto px-3 sm:px-6 flex gap-1.5 sm:gap-2 border-t border-slate-800/60 pt-1 overflow-x-auto no-scrollbar touch-scroll whitespace-nowrap">
          <button
            onClick={() => setSelectedTab('catalogs')}
            className={`px-3 sm:px-4 py-2 text-xs font-medium border-b-2 transition flex items-center gap-1.5 sm:gap-2 shrink-0 cursor-pointer ${
              selectedTab === 'catalogs'
                ? 'border-sky-500 text-sky-400 bg-slate-800/40'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Store className="w-3.5 h-3.5" /> Cataloage & Aplicații (7 Retaileri)
          </button>
          <button
            onClick={() => setSelectedTab('press')}
            className={`px-3 sm:px-4 py-2 text-xs font-medium border-b-2 transition flex items-center gap-1.5 sm:gap-2 shrink-0 cursor-pointer ${
              selectedTab === 'press'
                ? 'border-sky-500 text-sky-400 bg-slate-800/40'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Newspaper className="w-3.5 h-3.5" /> Presă Specializată
          </button>
          <button
            onClick={() => setSelectedTab('intelligence')}
            className={`px-3 sm:px-4 py-2 text-xs font-medium border-b-2 transition flex items-center gap-1.5 sm:gap-2 shrink-0 cursor-pointer ${
              selectedTab === 'intelligence'
                ? 'border-sky-500 text-sky-400 bg-slate-800/40'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <TrendingUp className="w-3.5 h-3.5" /> Competitive Intelligence & Recomandări
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
                  <h2 className="text-base font-semibold text-white">Monitorizare Promoțională 7 Retaileri</h2>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Acces direct la cataloagele săptămânale oficiale, edițiile digitale și campaniile exclusive din aplicațiile mobile.
                  </p>
                </div>
                <span className="text-xs text-slate-400 font-medium">7 retaileri monitorizați săptămânal</span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {retailers.map(r => (
                  <div key={r.name} className="bg-slate-950 rounded-xl p-5 border border-slate-800 flex flex-col justify-between hover:border-sky-500/50 transition-all duration-200 shadow-lg group">
                    <div>
                      {/* Retailer Header & Channel Badge (Clickable link to catalog) */}
                      <div className="flex items-start justify-between gap-2 mb-3">
                        <div>
                          <h3 className="text-base font-bold text-white tracking-tight">{r.name}</h3>
                          {r.validity && (
                            <span className="text-[11px] text-slate-400 flex items-center gap-1 mt-0.5">
                              <Calendar className="w-3 h-3 text-sky-400 shrink-0" />
                              <span>Ciclu: <strong className="text-slate-300 font-medium">{r.validity}</strong></span>
                            </span>
                          )}
                        </div>
                        {r.catalogUrl ? (
                          <a
                            href={r.catalogUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="px-2.5 py-1 text-[11px] rounded bg-sky-500/15 hover:bg-sky-500/25 text-sky-300 hover:text-white font-semibold border border-sky-500/30 hover:border-sky-500/50 inline-flex items-center gap-1 transition shadow-sm cursor-pointer"
                            title={`Deschide ${r.channel} într-o filă nouă`}
                          >
                            <span className="truncate max-w-[140px]">{r.channel}</span>
                            <ExternalLink className="w-3 h-3 shrink-0" />
                          </a>
                        ) : (
                          <span className="px-2 py-0.5 text-[11px] rounded bg-slate-800 text-slate-400 border border-slate-700">
                            Catalog indisponibil
                          </span>
                        )}
                      </div>
                      
                      {/* Retailer Details */}
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

                      {/* Monitored Promotional Mechanics */}
                      <div className="mt-4 pt-3 border-t border-slate-800/80">
                        <span className="text-slate-500 block text-[11px] mb-1.5 font-semibold">Mecanisme promoționale urmărite:</span>
                        <div className="flex flex-wrap gap-1.5">
                          {r.mechanics.map((m, idx) => (
                            <span key={idx} className="px-2 py-0.5 text-[11px] rounded bg-slate-800/80 text-slate-300 border border-slate-700">
                              {m}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* Bottom Action: KVI Counter & Deschide catalogul ↗ button */}
                    <div className="mt-5 pt-3.5 border-t border-slate-800/80 flex items-center justify-between gap-3">
                      <div className="text-[11px] text-slate-400">
                        <span className="text-emerald-400 font-semibold flex items-center gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5" /> 5 KVI active
                        </span>
                      </div>
                      {r.catalogUrl ? (
                        <a
                          href={r.catalogUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-sky-600 hover:bg-sky-500 text-white text-xs font-semibold shadow-md transition-all hover:shadow-sky-950/40 cursor-pointer group/btn"
                          title={`Deschide cel mai recent catalog promoțional ${r.name}`}
                        >
                          <span>Deschide catalogul</span>
                          <ExternalLink className="w-3.5 h-3.5 transition-transform group-hover/btn:translate-x-0.5 group-hover/btn:-translate-y-0.5" />
                        </a>
                      ) : (
                        <span className="text-xs text-slate-500 italic">Catalog indisponibil</span>
                      )}
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

        {/* Tab 3: Competitive Intelligence & Recomandări Comerciale */}
        {selectedTab === 'intelligence' && (
          <div className="bg-slate-900 rounded-xl p-6 border border-slate-800 shadow-xl space-y-6">
            <div>
              <h2 className="text-base font-semibold text-white">Competitive Intelligence & Dinamică Promoțională</h2>
              <p className="text-xs text-slate-400 mt-1">
                Sinteză strategică privind strategiile promoționale pe carne proaspătă, mecanismele de atragere a traficului și oportunitățile comerciale.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-xs text-slate-300">
              <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
                <div className="flex items-center gap-2 mb-2 text-sky-400 font-bold">
                  <Tag className="w-4 h-4" />
                  <span>1. Presiune de Preț pe Piesele Cheie</span>
                </div>
                <p className="leading-relaxed text-slate-400">
                  Segmentul de bază (spată și pulpă de porc f.o.) este folosit ca principal instrument de atragere a traficului în magazine. Discounterii (Kaufland, Lidl, PENNY) mențin prețuri agresive (13,90 – 15,99 lei/kg), forțând un nivel minim de marjă la nivelul întregii piețe.
                </p>
              </div>

              <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
                <div className="flex items-center gap-2 mb-2 text-emerald-400 font-bold">
                  <Layers className="w-4 h-4" />
                  <span>2. Condiționare Digitală (Card / App)</span>
                </div>
                <p className="leading-relaxed text-slate-400">
                  Peste 60% dintre prețurile cele mai mici din piață sunt condiționate de activarea aplicațiilor de loialitate (Lidl Plus, Kaufland Card, PENNY Card). Această strategie permite retailerilor să afișeze reduceri spectaculoase (-20% la -33%) protejând marja pe clienții ocazionali.
                </p>
              </div>

              <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
                <div className="flex items-center gap-2 mb-2 text-amber-400 font-bold">
                  <Calendar className="w-4 h-4" />
                  <span>3. Recomandări pentru Achiziții</span>
                </div>
                <p className="leading-relaxed text-slate-400">
                  Urmărirea ferestrelor de lansare promoțională (miercuri și joi) permite anticiparea volumelor solicitate furnizorilor locali și arbitrajul eficient cu cotațiile carcasei europene din piețele de referință (Germania, Spania, Olanda).
                </p>
              </div>
            </div>
          </div>
        )}

      </main>

      {/* Footer */}
      <footer className="border-t border-slate-800/80 bg-slate-950 py-3.5 sm:py-4 text-center text-xs text-slate-400">
        <div className="max-w-7xl mx-auto px-4 text-center">
          <p className="text-[11px] sm:text-xs md:text-sm font-medium text-slate-400 tracking-wide">
            MEAT MARKET INSIGHTS by Vasile Huma
          </p>
        </div>
      </footer>
    </div>
  );
}
