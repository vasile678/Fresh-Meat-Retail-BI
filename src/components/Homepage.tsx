import React from 'react';
import { getAssetUrl } from '../utils';
import { ArrowRight } from 'lucide-react';

interface HomepageProps {
  onSelectModule: (module: 'promo' | 'eu-pork' | 'clipping') => void;
}

// 1. Pictogramă: coș de cumpărături cu etichetă de preț (PROMO WEEKLY)
function PromoCartTagIcon({ className = "w-20 h-20" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      {/* Soft rounded background container */}
      <rect x="2" y="2" width="60" height="60" rx="16" fill="currentColor" fillOpacity="0.08" />
      
      {/* Shopping cart body & frame */}
      <path 
        d="M10 16h8l6 24h23l5.5-17H21" 
        stroke="currentColor" 
        strokeWidth="2.75" 
        strokeLinecap="round" 
        strokeLinejoin="round" 
      />
      {/* Cart wire grid */}
      <path d="M21 28h28M23 34h23" stroke="currentColor" strokeWidth="1.75" strokeOpacity="0.5" strokeLinecap="round" />
      
      {/* Wheels */}
      <circle cx="26" cy="47" r="3.75" fill="currentColor" />
      <circle cx="45" cy="47" r="3.75" fill="currentColor" />
      
      {/* Price tag attached to the cart */}
      <g transform="translate(32, 6)">
        <path 
          d="M14 0h-8a2 2 0 0 0-1.41.59l-10 10a2 2 0 0 0 0 2.82l8 8a2 2 0 0 0 2.82 0l10-10A2 2 0 0 0 16 10V2a2 2 0 0 0-2-2z" 
          fill="currentColor" 
          fillOpacity="0.25" 
          stroke="currentColor" 
          strokeWidth="2.2" 
          strokeLinejoin="round" 
        />
        <circle cx="12" cy="4" r="1.75" fill="currentColor" />
        <path d="M2 13l5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      </g>
    </svg>
  );
}

// 2. Pictogramă: siluetă de porc cu grafic de evoluție (EU PORK MARKET WEEKLY)
function PorkTrendIcon({ className = "w-20 h-20" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      {/* Soft rounded background container */}
      <rect x="2" y="2" width="60" height="60" rx="16" fill="currentColor" fillOpacity="0.08" />
      
      {/* Evolution graph grid & ascending trendline */}
      <path d="M10 46h44" stroke="currentColor" strokeWidth="1.5" strokeDasharray="3 3" strokeOpacity="0.3" />
      <path 
        d="M10 38l12-14 10 7 14-16 10 5" 
        stroke="currentColor" 
        strokeWidth="2.75" 
        strokeLinecap="round" 
        strokeLinejoin="round" 
      />
      <circle cx="22" cy="24" r="2.75" fill="currentColor" />
      <circle cx="32" cy="31" r="2.75" fill="currentColor" />
      <circle cx="46" cy="15" r="3.25" fill="currentColor" />
      
      {/* Pig silhouette */}
      <path 
        d="M16 39c-2.5-1.5-3.5-4-3.5-6.5 0-4 3.5-7 8-7h7c4.5-3 10-3.5 15.5-2 4.5 1 8 4 9.5 8 2 1 3.5 2.5 3.5 5 0 2.5-1.5 4.5-4 5v5h-4v-3.5h-9v3.5h-4.5v-3.5h-4l-3 2.5h-3.5l1-2.5c-3-1-5.5-3-7.5-6z" 
        fill="currentColor" 
        fillOpacity="0.25" 
        stroke="currentColor" 
        strokeWidth="2.4" 
        strokeLinejoin="round" 
      />
      {/* Pig ear */}
      <path d="M42 25l3.5-4.5-4.5 1.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      {/* Pig eye */}
      <circle cx="47" cy="31" r="1.25" fill="currentColor" />
      {/* Tail curl */}
      <path d="M14 29c-2-1.5-3.5-3-2.5-5 1-1.5 3-.5 2.5 1" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

// 3. Pictogramă: ziar digital cu lupă (RETAIL MEDIA CLIPPING WEEKLY)
function ClippingSearchIcon({ className = "w-20 h-20" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      {/* Soft rounded background container */}
      <rect x="2" y="2" width="60" height="60" rx="16" fill="currentColor" fillOpacity="0.08" />
      
      {/* Digital newspaper / tablet frame */}
      <rect 
        x="10" 
        y="12" 
        width="34" 
        height="40" 
        rx="3.5" 
        fill="currentColor" 
        fillOpacity="0.2" 
        stroke="currentColor" 
        strokeWidth="2.5" 
        strokeLinejoin="round" 
      />
      {/* Newspaper masthead & columns */}
      <path d="M16 19h22" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
      <path d="M16 26h12M16 31h10M16 36h11M16 41h20M16 45h16" stroke="currentColor" strokeWidth="2" strokeOpacity="0.75" strokeLinecap="round" />
      <rect x="31" y="25" width="8" height="10" rx="1.5" fill="currentColor" fillOpacity="0.4" stroke="currentColor" strokeWidth="1.2" />
      
      {/* Magnifying glass focusing over the news clipping */}
      <g transform="translate(4, 2)">
        <circle 
          cx="39" 
          cy="37" 
          r="9.5" 
          fill="currentColor" 
          fillOpacity="0.3" 
          stroke="currentColor" 
          strokeWidth="2.6" 
        />
        <path d="M35 33a6 6 0 0 1 5 1" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeOpacity="0.8" />
        <path d="M46 44l8.5 8.5" stroke="currentColor" strokeWidth="3.4" strokeLinecap="round" />
      </g>
    </svg>
  );
}

export default function Homepage({ onSelectModule }: HomepageProps) {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-between font-sans">
      {/* Top Header: strict minimal — Logo and Title only */}
      <header className="pt-10 pb-6 sm:pt-16 sm:pb-8">
        <div className="max-w-6xl mx-auto px-4 flex flex-col items-center justify-center text-center">
          <img 
            src={getAssetUrl('/icon-192.png')} 
            alt="Fresh Meat Retail BI Logo" 
            className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl object-contain shadow-2xl shadow-emerald-950/50 bg-slate-900 border border-slate-800 mb-4"
          />
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-extrabold text-white tracking-tight">
            Fresh Meat Retail BI
          </h1>
        </div>
      </header>

      {/* Main Content Area: Exactly 3 Large Clickable Cards */}
      <main className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 py-6 sm:py-12 flex items-center justify-center">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8 w-full">
          
          {/* Card 1: 🛒 PROMO WEEKLY */}
          <button
            type="button"
            onClick={() => onSelectModule('promo')}
            className="group relative flex flex-col justify-between p-8 sm:p-10 rounded-2xl bg-slate-900/90 border border-slate-800 hover:border-emerald-500/60 hover:bg-slate-900 text-left transition-all duration-300 hover:shadow-2xl hover:shadow-emerald-950/40 hover:-translate-y-1.5 active:translate-y-0 active:scale-[0.99] cursor-pointer"
          >
            <div>
              <div className="text-emerald-400 group-hover:text-emerald-300 transition-colors mb-6">
                <PromoCartTagIcon className="w-20 h-20" />
              </div>
              <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight group-hover:text-emerald-400 transition-colors">
                PROMO WEEKLY
              </h2>
            </div>
            
            <div className="mt-8 pt-6 border-t border-slate-800/80 flex items-center justify-between text-xs font-semibold text-slate-400 group-hover:text-emerald-400 transition-colors">
              <span>Deschide modulul</span>
              <ArrowRight className="w-4 h-4 transform group-hover:translate-x-1.5 transition-transform" />
            </div>
          </button>

          {/* Card 2: 🐷 EU PORK MARKET */}
          <button
            type="button"
            onClick={() => onSelectModule('eu-pork')}
            className="group relative flex flex-col justify-between p-8 sm:p-10 rounded-2xl bg-slate-900/90 border border-slate-800 hover:border-amber-500/60 hover:bg-slate-900 text-left transition-all duration-300 hover:shadow-2xl hover:shadow-amber-950/40 hover:-translate-y-1.5 active:translate-y-0 active:scale-[0.99] cursor-pointer"
          >
            <div>
              <div className="text-amber-400 group-hover:text-amber-300 transition-colors mb-6">
                <PorkTrendIcon className="w-20 h-20" />
              </div>
              <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight group-hover:text-amber-400 transition-colors">
                EU PORK MARKET
              </h2>
            </div>
            
            <div className="mt-8 pt-6 border-t border-slate-800/80 flex items-center justify-between text-xs font-semibold text-slate-400 group-hover:text-amber-400 transition-colors">
              <span>Deschide modulul</span>
              <ArrowRight className="w-4 h-4 transform group-hover:translate-x-1.5 transition-transform" />
            </div>
          </button>

          {/* Card 3: 📰 RETAIL MEDIA MONITOR */}
          <button
            type="button"
            onClick={() => onSelectModule('clipping')}
            className="group relative flex flex-col justify-between p-8 sm:p-10 rounded-2xl bg-slate-900/90 border border-slate-800 hover:border-sky-500/60 hover:bg-slate-900 text-left transition-all duration-300 hover:shadow-2xl hover:shadow-sky-950/40 hover:-translate-y-1.5 active:translate-y-0 active:scale-[0.99] cursor-pointer"
          >
            <div>
              <div className="text-sky-400 group-hover:text-sky-300 transition-colors mb-6">
                <ClippingSearchIcon className="w-20 h-20" />
              </div>
              <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight group-hover:text-sky-400 transition-colors">
                RETAIL MEDIA MONITOR
              </h2>
            </div>
            
            <div className="mt-8 pt-6 border-t border-slate-800/80 flex items-center justify-between text-xs font-semibold text-slate-400 group-hover:text-sky-400 transition-colors">
              <span>Deschide modulul</span>
              <ArrowRight className="w-4 h-4 transform group-hover:translate-x-1.5 transition-transform" />
            </div>
          </button>

        </div>
      </main>

      {/* Minimal Footer */}
      <footer className="py-6 text-center text-xs text-slate-500">
        Fresh Meat Retail BI
      </footer>
    </div>
  );
}
