import React from 'react';

interface FooterProps {
  className?: string;
}

export default function Footer({ className = '' }: FooterProps) {
  return (
    <footer className={`w-full border-t border-slate-800/80 bg-slate-950/95 py-3.5 sm:py-4 md:py-5 shrink-0 text-center ${className}`}>
      <div className="max-w-7xl mx-auto px-4 flex flex-col items-center justify-center text-center">
        <p className="text-xs sm:text-sm font-semibold text-slate-100 tracking-wider uppercase">
          KNOW MORE. MOVE FIRST.
        </p>
        <p className="text-[11px] sm:text-xs text-slate-400 font-normal tracking-wide mt-0.5">
          by Vasile Huma
        </p>
      </div>
    </footer>
  );
}
