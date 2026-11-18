'use client';

import React, { useEffect, useState } from 'react';
import { Menu, Sun, Moon, Home, PictureInPicture2 } from 'lucide-react';
import { HijriDateInfo, getZonedClockParts } from '@/lib/prayer-utils';
import type { AppSection } from './SideDrawer';

interface TopHeaderProps {
  timezone: string;
  hijri: HijriDateInfo | null;
  isDark: boolean;
  onToggleTheme: () => void;
  onOpenDrawer: () => void;
  onSelectGuide: (mode: 'wudu' | 'prayer') => void;
  activeTab: AppSection;
  onGoHome: () => void;
  onOpenDesktopWidget?: () => void;
  isDesktopWidgetOpen?: boolean;
  desktopWidgetNotice?: string | null;
}

export function TopHeader({
  timezone,
  hijri,
  isDark,
  onToggleTheme,
  onOpenDrawer,
  onSelectGuide,
  activeTab,
  onGoHome,
  onOpenDesktopWidget,
  isDesktopWidgetOpen,
  desktopWidgetNotice,
}: TopHeaderProps) {
  const [now, setNow] = useState<Date | null>(null);
  const [guideValue, setGuideValue] = useState('');

  useEffect(() => {
    const initTimer = setTimeout(() => setNow(new Date()), 0);
    const timer = setInterval(() => {
      setNow(new Date());
    }, 1000);
    return () => {
      clearTimeout(initTimer);
      clearInterval(timer);
    };
  }, []);

  const clock = now ? getZonedClockParts(now, timezone) : null;
  const timeDisplay = clock
    ? `${String(clock.hours12).padStart(2, '0')}:${String(clock.minutes).padStart(2, '0')}:${String(clock.seconds).padStart(2, '0')}`
    : '--:--:--';

  const hijriFormatted = hijri
    ? `${hijri.day} ${hijri.monthAr} ${hijri.year} هـ`
    : 'جارٍ تحميل التاريخ الهجري...';

  return (
    <header className="sticky top-0 z-30 border-b border-slate-200/70 dark:border-slate-800/80 bg-white/85 dark:bg-slate-950/85 backdrop-blur-md px-3 py-2">
      {/* Row 1: Right Drawer Button + Quick Guide Select + Home / Theme */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <button
            type="button"
            onClick={onOpenDrawer}
            aria-label="فتح القائمة الجانبية"
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-900 hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors"
          >
            <Menu className="h-5 w-5" />
          </button>

          <select
            value={guideValue}
            onChange={(e) => {
              const val = e.target.value as 'wudu' | 'prayer' | '';
              if (val === 'wudu' || val === 'prayer') {
                onSelectGuide(val);
              }
              setGuideValue('');
            }}
            aria-label="تعليم الوضوء والصلاة"
            className="min-h-[44px] max-w-[205px] sm:max-w-[240px] flex-1 rounded-xl border border-amber-500/40 bg-amber-500/10 dark:bg-amber-500/15 px-2.5 py-1.5 text-xs sm:text-sm font-bold text-amber-900 dark:text-amber-200 focus:outline-none focus:ring-2 focus:ring-amber-500"
          >
            <option value="" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white">
              تعليم الوضوء والصلاة
            </option>
            <option value="wudu" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white">
              تعليم الوضوء خطوة بخطوة
            </option>
            <option value="prayer" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white">
              تعليم الصلاة بالتشكيل
            </option>
          </select>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          {activeTab !== 'home' && (
            <button
              type="button"
              onClick={onGoHome}
              aria-label="العودة للرئيسية"
              className="flex h-11 items-center gap-1 rounded-xl bg-emerald-700 hover:bg-emerald-600 px-2.5 text-xs font-bold text-white transition-colors"
            >
              <Home className="h-4 w-4" />
              <span className="hidden sm:inline">الرئيسية</span>
            </button>
          )}
          {onOpenDesktopWidget && (
            <button
              type="button"
              onClick={onOpenDesktopWidget}
              title="نافذة سطح المكتب"
              aria-label="نافذة سطح المكتب - ويدجت الصلاة"
              className={`hidden sm:flex h-11 items-center gap-1.5 rounded-xl border px-2.5 text-xs font-bold transition-colors ${
                isDesktopWidgetOpen
                  ? 'border-amber-500 bg-amber-600 text-white shadow-sm'
                  : 'border-amber-500/40 bg-amber-500/10 dark:bg-amber-500/15 text-amber-900 dark:text-amber-200 hover:bg-amber-500/20'
              }`}
            >
              <PictureInPicture2 className="h-4 w-4 shrink-0" />
              <span>ويدجت الصلاة</span>
            </button>
          )}
          <button
            type="button"
            onClick={onToggleTheme}
            aria-label={isDark ? 'الوضع النهاري' : 'الوضع الليلي'}
            className="flex h-11 w-11 items-center justify-center rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-900 hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors"
          >
            {isDark ? (
              <Sun className="h-5 w-5 text-amber-400" />
            ) : (
              <Moon className="h-5 w-5 text-indigo-600" />
            )}
          </button>
        </div>
      </div>

      {desktopWidgetNotice && (
        <p className="mt-1.5 rounded-lg border border-amber-500/35 bg-amber-500/10 px-2.5 py-1 text-[11px] font-bold text-amber-700 dark:text-amber-300">
          {desktopWidgetNotice}
        </p>
      )}

      {/* Row 2: Live 12h Clock + Day + Hijri & Gregorian Dates */}
      <div className="mt-2 flex flex-wrap items-center justify-between gap-x-3 gap-y-1 border-t border-slate-200/60 dark:border-slate-800/70 pt-1.5 text-xs">
        <div className="flex items-center gap-1.5 text-slate-700 dark:text-slate-200 font-semibold min-w-0">
          <span className="text-amber-600 dark:text-amber-400 font-bold">
            {clock?.weekdayAr || hijri?.weekdayAr || '—'}
          </span>
          <span aria-hidden="true">·</span>
          <span className="truncate">{hijriFormatted}</span>
          <span aria-hidden="true" className="hidden sm:inline">
            ·
          </span>
          <span className="hidden sm:inline text-slate-500 dark:text-slate-400">
            {clock?.gregorianAr || ''}
          </span>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          <span className="font-mono-num text-sm sm:text-base font-extrabold tracking-tight text-emerald-700 dark:text-emerald-400">
            {timeDisplay}
          </span>
          <span className="text-[11px] font-bold text-slate-600 dark:text-slate-300">
            {clock?.periodFull || ''}
          </span>
        </div>
      </div>
    </header>
  );
}
