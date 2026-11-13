'use client';

import React from 'react';
import { Menu, Radio, Compass, BookOpen } from 'lucide-react';
import type { AppSection } from './SideDrawer';

interface BottomNavBarProps {
  activeTab: AppSection;
  onSelectTab: (tab: AppSection) => void;
  onOpenDrawer: () => void;
}

export function BottomNavBar({ activeTab, onSelectTab, onOpenDrawer }: BottomNavBarProps) {
  return (
    <nav
      aria-label="التنقل السفلي"
      className="fixed bottom-0 left-0 right-0 z-40 border-t border-amber-500/25 bg-white/95 dark:bg-slate-950/95 backdrop-blur-lg shadow-[0_-4px_24px_rgba(0,0,0,0.2)]"
    >
      <div className="mx-auto max-w-5xl px-2 py-1.5">
        {/* Strict 4-button single row RTL order: القائمة -> البث المباشر -> القبلة -> القرآن الكريم */}
        <div className="grid grid-cols-4 gap-1.5">
          {/* 1. Rightmost: القائمة */}
          <button
            type="button"
            onClick={onOpenDrawer}
            className="min-h-[48px] flex flex-col items-center justify-center gap-0.5 rounded-xl px-1 py-2 text-[10px] sm:text-xs font-bold leading-tight text-center break-words text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-900 transition-colors"
          >
            <Menu className="h-4 w-4 sm:h-5 sm:w-5 shrink-0" />
            <span>القائمة</span>
          </button>

          {/* 2. البث المباشر */}
          <button
            type="button"
            onClick={() => onSelectTab('radio')}
            className={`min-h-[48px] flex flex-col items-center justify-center gap-0.5 rounded-xl px-1 py-2 text-[10px] sm:text-xs font-bold leading-tight text-center break-words transition-colors ${
              activeTab === 'radio'
                ? 'bg-emerald-700 text-white shadow-sm'
                : 'text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-900'
            }`}
          >
            <Radio className="h-4 w-4 sm:h-5 sm:w-5 shrink-0" />
            <span>البث المباشر</span>
          </button>

          {/* 3. القبلة */}
          <button
            type="button"
            onClick={() => onSelectTab('qibla')}
            className={`min-h-[48px] flex flex-col items-center justify-center gap-0.5 rounded-xl px-1 py-2 text-[10px] sm:text-xs font-bold leading-tight text-center break-words transition-colors ${
              activeTab === 'qibla'
                ? 'bg-emerald-700 text-white shadow-sm'
                : 'text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-900'
            }`}
          >
            <Compass className="h-4 w-4 sm:h-5 sm:w-5 shrink-0" />
            <span>القبلة</span>
          </button>

          {/* 4. القرآن الكريم */}
          <button
            type="button"
            onClick={() => onSelectTab('quran')}
            className={`min-h-[48px] flex flex-col items-center justify-center gap-0.5 rounded-xl px-1 py-2 text-[10px] sm:text-xs font-bold leading-tight text-center break-words transition-colors ${
              activeTab === 'quran'
                ? 'bg-emerald-700 text-white shadow-sm'
                : 'text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-900'
            }`}
          >
            <BookOpen className="h-4 w-4 sm:h-5 sm:w-5 shrink-0" />
            <span>القرآن الكريم</span>
          </button>
        </div>
      </div>
    </nav>
  );
}
