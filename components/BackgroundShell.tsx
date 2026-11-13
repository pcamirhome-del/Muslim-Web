'use client';

import React from 'react';
import Image from 'next/image';

interface BackgroundShellProps {
  isHome: boolean;
  isDark: boolean;
  children: React.ReactNode;
}

export function BackgroundShell({ isHome, isDark, children }: BackgroundShellProps) {
  return (
    <div className="relative min-h-screen w-full overflow-x-hidden bg-slate-950 transition-colors duration-500">
      {/* Sacred Background Layer 1: Holy Kaaba (Home Screen) */}
      <div
        aria-hidden="true"
        className={`fixed inset-0 z-0 transition-opacity duration-700 ease-out ${
          isHome ? 'opacity-100' : 'opacity-0'
        }`}
      >
        <Image
          src="/images/kaaba.jpg"
          alt="الكعبة المشرفة"
          fill
          priority
          sizes="100vw"
          referrerPolicy="no-referrer"
          className="object-cover object-center"
        />
        <div
          className={`absolute inset-0 ${
            isDark
              ? 'bg-gradient-to-b from-slate-950/65 via-slate-950/45 to-slate-950/85'
              : 'bg-gradient-to-b from-slate-900/40 via-slate-900/25 to-slate-950/65'
          }`}
        />
      </div>

      {/* Sacred Background Layer 2: Al-Aqsa Mosque (Internal Sections) */}
      <div
        aria-hidden="true"
        className={`fixed inset-0 z-0 transition-opacity duration-700 ease-out ${
          !isHome ? 'opacity-100' : 'opacity-0'
        }`}
      >
        <Image
          src="/images/aqsa.jpg"
          alt="المسجد الأقصى المبارك"
          fill
          sizes="100vw"
          referrerPolicy="no-referrer"
          className="object-cover object-center"
        />
        <div
          className={`absolute inset-0 ${
            isDark
              ? 'bg-gradient-to-b from-slate-950/65 via-slate-950/45 to-slate-950/85'
              : 'bg-gradient-to-b from-slate-900/40 via-slate-900/25 to-slate-950/65'
          }`}
        />
      </div>

      {/* Center Glassmorphic Shell leaving slender lateral edges showing sacred imagery */}
      <div className="relative z-10 mx-auto min-h-screen w-full max-w-5xl px-2 sm:px-4">
        <div
          className={`flex min-h-screen flex-col border-x transition-colors duration-300 backdrop-blur-xl shadow-2xl ${
            isDark
              ? 'border-amber-500/20 bg-slate-950/88 text-white'
              : 'border-amber-700/20 bg-white/92 text-slate-900'
          }`}
        >
          {children}
        </div>
      </div>
    </div>
  );
}
