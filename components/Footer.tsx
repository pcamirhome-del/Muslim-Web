import React from 'react';

interface FooterProps {
  hasMiniPlayer?: boolean;
}

export function Footer({ hasMiniPlayer = false }: FooterProps) {
  return (
    <footer
      className={`mt-auto border-t border-slate-200/70 dark:border-slate-800/80 px-4 py-4 text-center transition-all ${
        hasMiniPlayer ? 'pb-36' : 'pb-20'
      }`}
    >
      <p className="text-xs sm:text-sm font-bold text-amber-700 dark:text-amber-300">
        لوجه الله تعالى - مع تحيات المطور Amir Lamay
      </p>
    </footer>
  );
}
