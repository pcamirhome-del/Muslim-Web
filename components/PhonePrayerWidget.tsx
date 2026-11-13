'use client';

import React, { useState } from 'react';
import { Clock, Smartphone, Download, Share2, MapPin } from 'lucide-react';
import { NextPrayerInfo, UserLocation, getTimezoneSeasonInfo } from '@/lib/prayer-utils';
import { usePWAInstall } from '@/hooks/usePWAInstall';

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
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showWidgetHelp, setShowWidgetHelp] = useState(false);

  const seasonInfo = getTimezoneSeasonInfo(timezone);

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
          <span aria-hidden="true">·</span>
          <span>
            {seasonInfo.seasonLabel} ({seasonInfo.offsetLabel})
          </span>
        </div>

        {!isInstalled && (
          <button
            type="button"
            onClick={() => {
              if (isInstallable) {
                install();
              } else {
                setShowWidgetHelp((v) => !v);
              }
            }}
            className="min-h-[36px] inline-flex items-center gap-1.5 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 border border-amber-400/40 px-2.5 py-1 text-[11px] font-bold text-amber-200 transition-colors"
          >
            {isInstallable ? (
              <>
                <Download className="h-3.5 w-3.5" />
                <span>تثبيت الويدجت والتطبيق</span>
              </>
            ) : isIOS ? (
              <>
                <Share2 className="h-3.5 w-3.5" />
                <span>إضافة للشاشة الرئيسية</span>
              </>
            ) : (
              <>
                <Smartphone className="h-3.5 w-3.5" />
                <span>دليل التثبيت على الهاتف</span>
              </>
            )}
          </button>
        )}
      </div>

      {/* Main Countdown Focal Anchor */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pt-1">
        <div className="space-y-0.5">
          <p className="text-xs text-emerald-300 font-semibold flex items-center gap-1.5">
            <Clock className="h-3.5 w-3.5" />
            <span>الصلاة القادمة</span>
          </p>
          <div className="flex items-baseline gap-2.5">
            <h2 className="text-2xl sm:text-3xl font-extrabold text-white">
              {nextPrayer ? nextPrayer.nameAr : '—'}
            </h2>
            <span className="font-mono-num text-base sm:text-lg font-bold text-amber-300">
              {nextPrayer ? nextPrayer.time12Ar : '--:--'}
            </span>
          </div>
        </div>

        <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-2.5 text-center sm:text-left">
          <p className="text-[11px] text-slate-300 font-semibold">الوقت المتبقي للأذان</p>
          <p className="font-mono-num text-2xl sm:text-3xl font-extrabold tracking-wider text-amber-400 mt-0.5">
            {nextPrayer ? nextPrayer.formattedCountdown : '00:00:00'}
          </p>
        </div>
      </div>

      {showWidgetHelp && (
        <div className="rounded-2xl border border-amber-400/30 bg-black/35 p-3 text-xs leading-relaxed text-slate-200">
          {isIOS
            ? 'لإضافة التطبيق واختصارات المواقيت على شاشة الآيفون: اضغط زر المشاركة (Share) في Safari ثم اختر "إضافة إلى الشاشة الرئيسية".'
            : 'لإضافة التطبيق كأيقونة واختصارات سريعة على هاتفك: افتح قائمة المتصفح (⋮) واختر "تثبيت التطبيق" أو "إضافة إلى الشاشة الرئيسية".'}
        </div>
      )}
    </section>
  );
}
