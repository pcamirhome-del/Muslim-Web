'use client';

import React, { useEffect, useState } from 'react';
import { Clock, MapPin } from 'lucide-react';
import { NextPrayerInfo, UserLocation, getTimezoneSeasonInfo } from '@/lib/prayer-utils';

interface PhonePrayerWidgetProps {
  nextPrayer: NextPrayerInfo | null;
  location: UserLocation;
  timezone: string;
}

export function PhonePrayerWidget({
  nextPrayer,
  location,
  timezone,
}: PhonePrayerWidgetProps) {
  const [seasonInfo, setSeasonInfo] = useState<ReturnType<typeof getTimezoneSeasonInfo> | null>(
    null
  );

  useEffect(() => {
    const t = setTimeout(() => {
      setSeasonInfo(getTimezoneSeasonInfo(timezone));
    }, 0);
    return () => clearTimeout(t);
  }, [timezone]);

  return (
    <section
      aria-label="ويدجت الصلاة القادمة"
      className="rounded-3xl border border-amber-500/35 bg-gradient-to-br from-emerald-950 via-slate-900 to-slate-950 p-4 sm:p-5 text-white shadow-xl space-y-3"
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-xs text-amber-300 font-semibold">
          <MapPin className="h-3.5 w-3.5 shrink-0" />
          <span>
            {location.city}
            {location.country ? ` · ${location.country}` : ''}
          </span>
          {seasonInfo && (
            <>
              <span aria-hidden="true">·</span>
              <span>
                {seasonInfo.seasonLabel} ({seasonInfo.offsetLabel})
              </span>
            </>
          )}
        </div>
      </div>

      {/* Main Countdown Focal Anchor: single row on mobile & desktop */}
      <div className="flex flex-row items-center justify-between gap-2.5 pt-1">
        <div className="min-w-0 space-y-0.5">
          <p className="text-[11px] sm:text-xs text-emerald-300 font-semibold flex items-center gap-1">
            <Clock className="h-3.5 w-3.5 shrink-0" />
            <span>الصلاة القادمة</span>
          </p>
          <div className="flex flex-wrap items-baseline gap-1.5 sm:gap-2.5">
            <h2 className="text-xl sm:text-3xl font-extrabold text-white leading-tight">
              {nextPrayer ? nextPrayer.nameAr : '—'}
            </h2>
            <span className="font-mono-num text-xs sm:text-lg font-bold text-amber-300 whitespace-nowrap">
              {nextPrayer ? nextPrayer.time12Ar : '--:--'}
            </span>
          </div>
        </div>

        <div className="shrink-0 rounded-2xl border border-white/10 bg-white/5 px-3 py-2 sm:px-4 sm:py-2.5 text-center sm:text-left">
          <p className="text-[10px] sm:text-[11px] text-slate-300 font-semibold whitespace-nowrap">
            الوقت المتبقي للأذان
          </p>
          <p className="font-mono-num text-lg sm:text-3xl font-extrabold tracking-wider text-amber-400 mt-0.5 whitespace-nowrap">
            {nextPrayer ? nextPrayer.formattedCountdown : '00:00:00'}
          </p>
        </div>
      </div>
    </section>
  );
}
