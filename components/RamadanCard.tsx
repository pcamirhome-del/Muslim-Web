'use client';

import React from 'react';
import { MoonStar } from 'lucide-react';
import {
  PrayerTimings,
  addMinutesToTime24,
  formatTo12HourArabic,
} from '@/lib/prayer-utils';

interface RamadanCardProps {
  timings: PrayerTimings;
  isActualRamadan: boolean;
  onClosePreview?: () => void;
}

export function RamadanCard({ timings, isActualRamadan, onClosePreview }: RamadanCardProps) {
  const taraweehTime = addMinutesToTime24(timings.Isha, 15);

  const items = [
    { label: 'الإمساك', time: formatTo12HourArabic(timings.Imsak) },
    { label: 'الإفطار (المغرب)', time: formatTo12HourArabic(timings.Maghrib) },
    { label: 'صلاة التراويح', time: formatTo12HourArabic(taraweehTime) },
    { label: 'قيام الليل', time: formatTo12HourArabic(timings.Midnight) },
    { label: 'صلاة التهجد', time: formatTo12HourArabic(timings.Lastthird) },
  ];

  return (
    <section
      aria-label="مواقيت شهر رمضان المبارك"
      className="rounded-3xl border border-amber-500/40 bg-gradient-to-br from-amber-500/15 via-emerald-950/10 to-transparent p-4 space-y-3"
    >
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <MoonStar className="h-5 w-5 text-amber-500 shrink-0" />
          <div>
            <h3 className="text-sm sm:text-base font-extrabold">
              مواقيت شهر رمضان المبارك
            </h3>
            <p className="text-[11px] text-slate-600 dark:text-slate-300">
              {isActualRamadan
                ? 'رمضان كريم — تقبل الله صيامكم وقيامكم'
                : 'وضع المعاينة لمواعيد الإمساك والإفطار والقيام'}
            </p>
          </div>
        </div>

        {!isActualRamadan && onClosePreview && (
          <button
            type="button"
            onClick={onClosePreview}
            className="min-h-[36px] rounded-xl border border-amber-500/30 px-2.5 py-1 text-xs font-bold text-amber-700 dark:text-amber-300 hover:bg-amber-500/10 transition-colors"
          >
            إخفاء المعاينة
          </button>
        )}
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
        {items.map((item) => (
          <div
            key={item.label}
            className="rounded-2xl border border-amber-500/25 bg-white/75 dark:bg-slate-900/80 p-2.5 text-center"
          >
            <p className="text-[11px] font-bold text-slate-600 dark:text-slate-300">
              {item.label}
            </p>
            <p className="font-mono-num text-sm sm:text-base font-extrabold text-amber-700 dark:text-amber-300 mt-0.5">
              {item.time}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}
