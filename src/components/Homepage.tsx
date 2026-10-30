import React from 'react';
import { getAssetUrl } from '../utils';
import { ArrowRight } from 'lucide-react';

interface HomepageProps {
  onSelectModule: (module: 'promo' | 'eu-pork' | 'clipping') => void;
}

// 1. Pictogramă: coș de cumpărături cu etichetă de preț (PROMO WEEKLY) - verde-turcoaz
function PromoCartTagIcon({ className = "w-12 h-12 md:w-16 md:h-16" }: { className?: string }) {
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

// 2. Pictogramă: siluetă de porc modernă și elegantă (EU PORK MARKET) - roz premium
export function PinkPorkIcon({ className = "w-12 h-12 md:w-16 md:h-16" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      {/* Soft rounded background container */}
      <rect x="2" y="2" width="60" height="60" rx="16" fill="currentColor" fillOpacity="0.08" />
      
      {/* Pig Silhouette Group */}
      <g transform="translate(6, 12)">
        {/* Curled Pig Tail */}
        <path 
          d="M6 21c-2.8-1-4.2-3.8-3.5-6.5.7-2.6 3.4-3.5 5.5-2 1.8 1.3 2 3.2 1 4.5" 
          stroke="currentColor" 
          strokeWidth="2.5" 
          strokeLinecap="round" 
        />
        
        {/* Main Pig Body & Legs */}
        <path 
          d="M8 20c0-6 5-11 12-12h14c5 0 9 2.5 12 6.5l3.5 1.5c2 .8 3.5 2.5 3.5 4.8 0 2.2-1.2 4-3 4.8v.4c0 3-1.8 5.5-4.5 6.5-.5 1-1.5 2-2.5 2.5v4.5c0 1.1-.9 2-2 2h-3c-1.1 0-2-.9-2-2v-3.5h-8v3.5c0 1.1-.9 2-2 2h-3c-1.1 0-2-.9-2-2V41c-5-1.5-8.5-5.5-8.5-10.5v-10.5z" 
          fill="currentColor" 
          fillOpacity="0.22" 
          stroke="currentColor" 
          strokeWidth="2.5" 
          strokeLinejoin="round" 
        />
        
        {/* Snout Details */}
        <rect x="42" y="16.5" width="8" height="6" rx="3" fill="currentColor" fillOpacity="0.45" stroke="currentColor" strokeWidth="1.8" />
        <circle cx="44.5" cy="19.5" r="0.9" fill="currentColor" />
        <circle cx="47.5" cy="19.5" r="0.9" fill="currentColor" />
        
        {/* Pig Eye */}
        <circle cx="37" cy="15.5" r="1.4" fill="currentColor" />
        
        {/* Pig Ear */}
        <path 
          d="M32 8l4.5-4c1.2-1 3 .2 2.5 1.8L37 10" 
          fill="currentColor" 
          fillOpacity="0.5" 
          stroke="currentColor" 
          strokeWidth="2" 
          strokeLinejoin="round" 
        />

        {/* Trotter foot separations */}
        <line x1="16.5" y1="47.5" x2="16.5" y2="49.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        <line x1="29.5" y1="47.5" x2="29.5" y2="49.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      </g>
    </svg>
  );
}

// 3. Pictogramă: document de presă și lupă (RETAIL MEDIA MONITOR) - albastru-cyan
function ClippingSearchIcon({ className = "w-12 h-12 md:w-16 md:h-16" }: { className?: string }) {
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
    <div className="min-h-[100dvh] h-full bg-[#080E1A] text-slate-100 flex flex-col justify-between font-sans selection:bg-pink-500/30 pt-0 pb-[max(0.5rem,env(safe-area-inset-bottom))] pl-[max(0.5rem,env(safe-area-inset-left))] pr-[max(0.5rem,env(safe-area-inset-right))] overflow-y-auto">
      {/* Top Header: Logo și Titlu coborâte cu încă ~56px (~1,5 cm) față de poziția anterioară, perfect centrate */}
      <header className="pt-[calc(env(safe-area-inset-top,0px)+90px)] sm:pt-[calc(env(safe-area-inset-top,0px)+80px)] md:pt-8 pb-0 md:pb-5 -mb-14 sm:-mb-10 md:mb-0 shrink-0">
        <div className="w-full max-w-6xl mx-auto px-4 flex flex-col items-center justify-center text-center">
          <img 
            src={getAssetUrl('/icon-192.png')} 
            alt="Fresh Meat Retail BI Logo" 
            className="w-16 h-16 sm:w-[72px] sm:h-[72px] md:w-16 md:h-16 rounded-2xl object-contain shadow-2xl shadow-black/60 bg-[#0E1726] border border-slate-800/80 mb-2 sm:mb-2.5 md:mb-3.5 mx-auto"
          />
          <h1 className="text-xl sm:text-2xl md:text-3xl font-extrabold text-white tracking-tight text-center">
            Fresh Meat Retail BI
          </h1>
        </div>
      </header>

      {/* Main Content:
          - Mobil: 3 carduri compacte orizontale (110-120px înălțime, icon stânga, titlu centru, săgeată dreapta)
          - Desktop (md+): 3 carduri verticale (310x290px), aliniate orizontal, cu divider și „Deschide modulul”
      */}
      <main className="flex-1 flex items-center justify-center px-2 sm:px-4 md:px-6 py-1 sm:py-2 md:py-6 my-auto">
        <div className="flex flex-col md:flex-row items-center justify-center gap-3 sm:gap-3.5 md:gap-8 lg:gap-[34px] w-full max-w-6xl">
          
          {/* CARD 1 — PROMO WEEKLY */}
          <button
            type="button"
            onClick={() => onSelectModule('promo')}
            className="group relative flex flex-row md:flex-col items-center justify-between w-[92%] sm:w-[90%] md:w-[310px] lg:w-[315px] max-w-md md:max-w-[320px] h-[112px] sm:h-[120px] md:h-[290px] px-4 py-3 sm:px-5 sm:py-4 md:p-6 lg:p-7 rounded-2xl bg-[#0E1726] border border-slate-800/80 hover:border-emerald-500/60 hover:bg-[#121E31] transition-all duration-300 hover:shadow-2xl hover:shadow-emerald-950/30 hover:-translate-y-1 active:translate-y-0 active:scale-[0.99] cursor-pointer shrink-0"
          >
            <div className="flex items-center justify-center shrink-0 text-emerald-400 group-hover:text-emerald-300 transition-colors md:mb-4">
              <PromoCartTagIcon className="w-12 h-12 sm:w-14 sm:h-14 md:w-16 md:h-16" />
            </div>

            <div className="flex-1 text-center px-3 md:px-0">
              <h2 className="text-base sm:text-lg md:text-lg font-bold text-white tracking-wide group-hover:text-emerald-400 transition-colors">
                PROMO WEEKLY
              </h2>
            </div>

            {/* Săgeată navigare mobil dreapta */}
            <div className="flex md:hidden items-center justify-center shrink-0 pl-1 text-slate-400 group-hover:text-emerald-400 transition-colors">
              <ArrowRight className="w-5 h-5 transform group-hover:translate-x-1 transition-transform" />
            </div>

            {/* Desktop-only separator & text "Deschide modulul" */}
            <div className="hidden md:flex w-full pt-4 border-t border-slate-800/80 items-center justify-between text-xs font-semibold text-slate-400 group-hover:text-emerald-400 transition-colors">
              <span>Deschide modulul</span>
              <ArrowRight className="w-4 h-4 transform group-hover:translate-x-1.5 transition-transform" />
            </div>
          </button>

          {/* CARD 2 — EU PORK MARKET (Pink Pig Icon) */}
          <button
            type="button"
            onClick={() => onSelectModule('eu-pork')}
            className="group relative flex flex-row md:flex-col items-center justify-between w-[92%] sm:w-[90%] md:w-[310px] lg:w-[315px] max-w-md md:max-w-[320px] h-[112px] sm:h-[120px] md:h-[290px] px-4 py-3 sm:px-5 sm:py-4 md:p-6 lg:p-7 rounded-2xl bg-[#0E1726] border border-slate-800/80 hover:border-pink-500/60 hover:bg-[#121E31] transition-all duration-300 hover:shadow-2xl hover:shadow-pink-950/30 hover:-translate-y-1 active:translate-y-0 active:scale-[0.99] cursor-pointer shrink-0"
          >
            <div className="flex items-center justify-center shrink-0 text-pink-400 group-hover:text-pink-300 transition-colors md:mb-4">
              <PinkPorkIcon className="w-12 h-12 sm:w-14 sm:h-14 md:w-16 md:h-16" />
            </div>

            <div className="flex-1 text-center px-3 md:px-0">
              <h2 className="text-base sm:text-lg md:text-lg font-bold text-white tracking-wide group-hover:text-pink-400 transition-colors">
                EU PORK MARKET
              </h2>
            </div>

            {/* Săgeată navigare mobil dreapta */}
            <div className="flex md:hidden items-center justify-center shrink-0 pl-1 text-slate-400 group-hover:text-pink-400 transition-colors">
              <ArrowRight className="w-5 h-5 transform group-hover:translate-x-1 transition-transform" />
            </div>

            {/* Desktop-only separator & text "Deschide modulul" */}
            <div className="hidden md:flex w-full pt-4 border-t border-slate-800/80 items-center justify-between text-xs font-semibold text-slate-400 group-hover:text-pink-400 transition-colors">
              <span>Deschide modulul</span>
              <ArrowRight className="w-4 h-4 transform group-hover:translate-x-1.5 transition-transform" />
            </div>
          </button>

          {/* CARD 3 — RETAIL MEDIA MONITOR */}
          <button
            type="button"
            onClick={() => onSelectModule('clipping')}
            className="group relative flex flex-row md:flex-col items-center justify-between w-[92%] sm:w-[90%] md:w-[310px] lg:w-[315px] max-w-md md:max-w-[320px] h-[112px] sm:h-[120px] md:h-[290px] px-4 py-3 sm:px-5 sm:py-4 md:p-6 lg:p-7 rounded-2xl bg-[#0E1726] border border-slate-800/80 hover:border-sky-500/60 hover:bg-[#121E31] transition-all duration-300 hover:shadow-2xl hover:shadow-sky-950/30 hover:-translate-y-1 active:translate-y-0 active:scale-[0.99] cursor-pointer shrink-0"
          >
            <div className="flex items-center justify-center shrink-0 text-sky-400 group-hover:text-sky-300 transition-colors md:mb-4">
              <ClippingSearchIcon className="w-12 h-12 sm:w-14 sm:h-14 md:w-16 md:h-16" />
            </div>

            <div className="flex-1 text-center px-3 md:px-0">
              <h2 className="text-base sm:text-lg md:text-lg font-bold text-white tracking-wide group-hover:text-sky-400 transition-colors">
                RETAIL MEDIA MONITOR
              </h2>
            </div>

            {/* Săgeată navigare mobil dreapta */}
            <div className="flex md:hidden items-center justify-center shrink-0 pl-1 text-slate-400 group-hover:text-sky-400 transition-colors">
              <ArrowRight className="w-5 h-5 transform group-hover:translate-x-1 transition-transform" />
            </div>

            {/* Desktop-only separator & text "Deschide modulul" */}
            <div className="hidden md:flex w-full pt-4 border-t border-slate-800/80 items-center justify-between text-xs font-semibold text-slate-400 group-hover:text-sky-400 transition-colors">
              <span>Deschide modulul</span>
              <ArrowRight className="w-4 h-4 transform group-hover:translate-x-1.5 transition-transform" />
            </div>
          </button>

        </div>
      </main>

      {/* Footer obligatoriu: MEAT MARKET INSIGHTS by Vasile Huma */}
      <footer className="w-full border-t border-slate-800/80 py-2.5 sm:py-3 md:py-5 shrink-0">
        <div className="max-w-6xl mx-auto px-4 text-center">
          <p className="text-[11px] sm:text-xs md:text-sm font-medium text-slate-400 tracking-wide">
            MEAT MARKET INSIGHTS by Vasile Huma
          </p>
        </div>
      </footer>
    </div>
  );
}
