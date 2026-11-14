'use client';

import React from 'react';
import { MapPin, RefreshCw, MoonStar, Loader2 } from 'lucide-react';
import {
  CALCULATION_METHODS,
  PrayerKey,
  PRAYER_LABELS_AR,
  PrayerScheduleData,
  UserLocation,
  formatTo12HourArabic,
} from '@/lib/prayer-utils';

export interface CityPreset {
  id: string;
  label: string;
  city: string;
  country: string;
  latitude: number;
  longitude: number;
  method: number;
  timezone: string;
  isEgyptDefault?: boolean;
}

export const GLOBAL_CITY_PRESETS: CityPreset[] = [
  {
    id: 'cairo',
    label: 'القاهرة - مصر (الافتراضي)',
    city: 'القاهرة',
    country: 'مصر',
    latitude: 30.0444,
    longitude: 31.2357,
    method: 5,
    timezone: 'Africa/Cairo',
    isEgyptDefault: true,
  },
  {
    id: 'alexandria',
    label: 'الإسكندرية - مصر',
    city: 'الإسكندرية',
    country: 'مصر',
    latitude: 31.2001,
    longitude: 29.9187,
    method: 5,
    timezone: 'Africa/Cairo',
  },
  {
    id: 'makkah',
    label: 'مكة المكرمة - السعودية',
    city: 'مكة المكرمة',
    country: 'السعودية',
    latitude: 21.3891,
    longitude: 39.8579,
    method: 4,
    timezone: 'Asia/Riyadh',
  },
  {
    id: 'madinah',
    label: 'المدينة المنورة - السعودية',
    city: 'المدينة المنورة',
    country: 'السعودية',
    latitude: 24.5247,
    longitude: 39.5692,
    method: 4,
    timezone: 'Asia/Riyadh',
  },
  {
    id: 'jerusalem',
    label: 'القدس الشريف - فلسطين',
    city: 'القدس',
    country: 'فلسطين',
    latitude: 31.7683,
    longitude: 35.2137,
    method: 3,
    timezone: 'Asia/Jerusalem',
  },
  {
    id: 'riyadh',
    label: 'الرياض - السعودية',
    city: 'الرياض',
    country: 'السعودية',
    latitude: 24.7136,
    longitude: 46.6753,
    method: 4,
    timezone: 'Asia/Riyadh',
  },
  {
    id: 'dubai',
    label: 'دبي - الإمارات',
    city: 'دبي',
    country: 'الإمارات',
    latitude: 25.2048,
    longitude: 55.2708,
    method: 8,
    timezone: 'Asia/Dubai',
  },
  {
    id: 'doha',
    label: 'الدوحة - قطر',
    city: 'الدوحة',
    country: 'قطر',
    latitude: 25.2854,
    longitude: 51.531,
    method: 8,
    timezone: 'Asia/Qatar',
  },
  {
    id: 'amman',
    label: 'عمّان - الأردن',
    city: 'عمّان',
    country: 'الأردن',
    latitude: 31.9454,
    longitude: 35.9284,
    method: 3,
    timezone: 'Asia/Amman',
  },
  {
    id: 'london',
    label: 'لندن - بريطانيا',
    city: 'لندن',
    country: 'بريطانيا',
    latitude: 51.5072,
    longitude: -0.1276,
    method: 3,
    timezone: 'Europe/London',
  },
  {
    id: 'newyork',
    label: 'نيويورك - أمريكا',
    city: 'نيويورك',
    country: 'الولايات المتحدة',
    latitude: 40.7128,
    longitude: -74.006,
    method: 2,
    timezone: 'America/New_York',
  },
];

interface PrayerTimesSectionProps {
  schedule: PrayerScheduleData | null;
  loading: boolean;
  error: string | null;
  location: UserLocation;
  nextPrayerKey: PrayerKey | null;
  gpsLoading: boolean;
  onRequestGPS: () => void;
  onSelectPreset: (preset: CityPreset) => void;
  onChangeMethod: (methodId: number) => void;
  onRefresh: () => void;
  ramadanPreview: boolean;
  onToggleRamadanPreview: () => void;
}

const ORDERED_PRAYERS: PrayerKey[] = ['Fajr', 'Sunrise', 'Dhuhr', 'Asr', 'Maghrib', 'Isha'];

export function PrayerTimesSection({
  schedule,
  loading,
  error,
  location,
  nextPrayerKey,
  gpsLoading,
  onRequestGPS,
  onSelectPreset,
  onChangeMethod,
  onRefresh,
  ramadanPreview,
  onToggleRamadanPreview,
}: PrayerTimesSectionProps) {
  const matchedPreset =
    GLOBAL_CITY_PRESETS.find(
      (p) => p.city === location.city && p.country === location.country
    )?.id || '';

  return (
    <section aria-label="مواقيت الصلاة" className="space-y-3">
      {/* Location & Action Controls (Max 4 buttons in one row) */}
      <div className="grid grid-cols-4 gap-1.5">
        <button
          type="button"
          onClick={onRequestGPS}
          disabled={gpsLoading}
          className="col-span-2 min-h-[44px] flex items-center justify-center gap-1.5 rounded-xl bg-emerald-700 hover:bg-emerald-600 px-1.5 py-2 text-[10px] sm:text-xs font-bold leading-tight text-center text-white transition-colors disabled:opacity-60"
        >
          {gpsLoading ? (
            <Loader2 className="h-4 w-4 shrink-0 animate-spin" />
          ) : (
            <MapPin className="h-4 w-4 shrink-0" />
          )}
          <span>تحديد الموقع تلقائياً (GPS)</span>
        </button>

        <button
          type="button"
          onClick={onToggleRamadanPreview}
          className={`min-h-[44px] flex items-center justify-center gap-1 rounded-xl border px-1 py-2 text-[10px] sm:text-xs font-bold leading-tight text-center break-words transition-colors ${
            ramadanPreview
              ? 'border-amber-500 bg-amber-600 text-white'
              : 'border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 hover:border-amber-500/50'
          }`}
        >
          <MoonStar className="h-3.5 w-3.5 shrink-0" />
          <span>مواقيت رمضان</span>
        </button>

        <button
          type="button"
          onClick={onRefresh}
          disabled={loading}
          className="min-h-[44px] flex items-center justify-center gap-1 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 px-1 py-2 text-[10px] sm:text-xs font-bold leading-tight text-center break-words hover:border-amber-500/50 transition-colors"
        >
          <RefreshCw className={`h-3.5 w-3.5 shrink-0 ${loading ? 'animate-spin' : ''}`} />
          <span>تحديث</span>
        </button>
      </div>

      {/* Strict 2-Select Row Rule: max 2 <select> side by side */}
      <div className="grid grid-cols-2 gap-2">
        <select
          value={matchedPreset}
          onChange={(e) => {
            const preset = GLOBAL_CITY_PRESETS.find((p) => p.id === e.target.value);
            if (preset) onSelectPreset(preset);
          }}
          aria-label="اختيار المدينة"
          className="min-h-[44px] w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-2.5 py-2 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-amber-500"
        >
          <option value="" disabled>
            {location.city} ({location.country})
          </option>
          {GLOBAL_CITY_PRESETS.map((p) => (
            <option key={p.id} value={p.id}>
              {p.label}
            </option>
          ))}
        </select>

        <select
          value={location.method}
          onChange={(e) => onChangeMethod(Number(e.target.value))}
          aria-label="طريقة الحساب الفقهية"
          className="min-h-[44px] w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-2.5 py-2 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-amber-500"
        >
          {CALCULATION_METHODS.map((m) => (
            <option key={m.id} value={m.id}>
              {m.name}
            </option>
          ))}
        </select>
      </div>

      {/* Prayer Times Grid */}
      {error ? (
        <div className="rounded-2xl border border-rose-500/30 bg-rose-500/10 p-4 text-center text-xs sm:text-sm font-semibold text-rose-700 dark:text-rose-300">
          {error}
        </div>
      ) : (
        <div className="grid grid-cols-3 lg:grid-cols-6 gap-1.5 sm:gap-2">
          {ORDERED_PRAYERS.map((key) => {
            const isNext = nextPrayerKey === key;
            const rawTime = schedule?.timings[key] || '--:--';
            const displayTime = schedule ? formatTo12HourArabic(rawTime) : '--:--';
            return (
              <div
                key={key}
                className={`rounded-2xl border p-2 sm:p-3 text-center transition-colors ${
                  isNext
                    ? 'border-amber-500 bg-amber-500/15 shadow-md'
                    : 'border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/75'
                }`}
              >
                <p
                  className={`text-[11px] sm:text-xs font-bold ${
                    isNext
                      ? 'text-amber-700 dark:text-amber-300'
                      : 'text-slate-600 dark:text-slate-300'
                  }`}
                >
                  {PRAYER_LABELS_AR[key]}
                </p>
                <p
                  className={`font-mono-num text-sm sm:text-lg font-extrabold mt-1 whitespace-nowrap ${
                    isNext ? 'text-slate-900 dark:text-white' : ''
                  }`}
                >
                  {displayTime}
                </p>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
