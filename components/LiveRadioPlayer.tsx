'use client';

import React, { useMemo, useState } from 'react';
import {
  Radio,
  Play,
  Pause,
  Square,
  Volume2,
  VolumeX,
  Search,
  RefreshCw,
  WifiOff,
  Loader2,
  Minimize2,
  Timer,
  ShieldCheck,
} from 'lucide-react';
import {
  PRIORITY_RADIO_STATIONS,
  RadioCategory,
  RadioStation,
} from '@/lib/data/radio-stations';
import type { RadioPlaybackStatus } from '@/hooks/useResilientRadio';

interface LiveRadioPlayerProps {
  stations: RadioStation[];
  loadingStations: boolean;
  activeStation: RadioStation | null;
  status: RadioPlaybackStatus;
  activeStreamIndex: number;
  reconnectAttempt: number;
  isMuted: boolean;
  onToggleMute: () => void;
  volume: number;
  onChangeVolume: (vol: number) => void;
  errorMsg: string | null;
  isMinimized: boolean;
  onMinimize: () => void;
  onExpand: () => void;
  sleepTimerSecondsLeft: number | null;
  onSetSleepTimer: (minutes: number) => void;
  onCancelSleepTimer: () => void;
  onStartStream: (station: RadioStation) => void;
  onTogglePlayPause: () => void;
  onStopStream: () => void;
}

function formatCountdown(secs: number): string {
  const hrs = Math.floor(secs / 3600);
  const mins = Math.floor((secs % 3600) / 60);
  const rem = secs % 60;
  if (hrs > 0) {
    return `${String(hrs).padStart(2, '0')}:${String(mins).padStart(2, '0')}:${String(rem).padStart(2, '0')}`;
  }
  return `${String(mins).padStart(2, '0')}:${String(rem).padStart(2, '0')}`;
}

export function LiveRadioPlayer({
  stations,
  loadingStations,
  activeStation,
  status,
  activeStreamIndex,
  reconnectAttempt,
  isMuted,
  onToggleMute,
  volume,
  onChangeVolume,
  errorMsg,
  isMinimized,
  onMinimize,
  onExpand,
  sleepTimerSecondsLeft,
  onSetSleepTimer,
  onCancelSleepTimer,
  onStartStream,
  onTogglePlayPause,
  onStopStream,
}: LiveRadioPlayerProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [category, setCategory] = useState<RadioCategory>('all');
  const [sleepSelectVal, setSleepSelectVal] = useState<string>('');
  const [showCustomSleepInput, setShowCustomSleepInput] = useState<boolean>(false);
  const [customMinutes, setCustomMinutes] = useState<string>('20');

  const isPlayingOrConnecting =
    status === 'playing' || status === 'connecting' || status === 'reconnecting';

  const cairoRadio = PRIORITY_RADIO_STATIONS[0];
  const quickSelectStations = useMemo(
    () => [
      { id: 70, label: 'المنشاوي', station: PRIORITY_RADIO_STATIONS.find((s) => s.id === 70) },
      { id: 75, label: 'الحصري', station: PRIORITY_RADIO_STATIONS.find((s) => s.id === 75) },
      { id: 30, label: 'عبد الباسط', station: PRIORITY_RADIO_STATIONS.find((s) => s.id === 30) },
      { id: 64, label: 'الطبلاوي', station: PRIORITY_RADIO_STATIONS.find((s) => s.id === 64) },
      {
        id: 33,
        label: 'الشيخ عبد الرحمن السديس',
        station: PRIORITY_RADIO_STATIONS.find((s) => s.id === 33),
      },
      {
        id: 9001,
        label: 'إذاعة التلاوات الخاشعة',
        station: PRIORITY_RADIO_STATIONS.find((s) => s.id === 9001),
      },
    ],
    []
  );

  const filteredStations = useMemo(() => {
    const q = searchQuery.trim();
    return stations.filter((s) => {
      const matchCat = category === 'all' || s.category === category;
      const matchQuery = !q || s.name.includes(q) || (s.subtitle && s.subtitle.includes(q));
      return matchCat && matchQuery;
    });
  }, [stations, searchQuery, category]);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="text-lg sm:text-xl font-bold flex items-center gap-2">
            <Radio className="h-5 w-5 text-amber-500 shrink-0" />
            <span>البث المباشر لإذاعة القرآن الكريم (24/7)</span>
          </h2>
          <p className="text-xs text-slate-600 dark:text-slate-300 mt-0.5">
            بث فائق الثبات مع مخزن مسبق وخوادم بديلة وتبديل سلس في الخلفية ({stations.length} قناة)
          </p>
        </div>

        {activeStation && isMinimized && (
          <button
            type="button"
            onClick={onExpand}
            className="min-h-[40px] rounded-xl bg-amber-600 hover:bg-amber-500 px-3 py-1.5 text-xs font-bold text-white transition-colors"
          >
            إظهار المشغل الكامل
          </button>
        )}
      </div>

      {/* Main Active Player Card (collapses when minimized into FloatingMiniPlayer) */}
      {!isMinimized && (
        <div className="rounded-3xl border border-amber-500/35 bg-gradient-to-br from-emerald-950/95 via-slate-900/95 to-slate-950 p-4 sm:p-5 text-white shadow-xl space-y-4">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0 flex-1 space-y-0.5">
              <div className="flex flex-wrap items-center gap-2 text-xs font-semibold text-amber-300">
                <span>
                  {status === 'playing' && 'البث المباشر يعمل بثبات'}
                  {status === 'connecting' && 'جارٍ التحميل المسبق والاتصال...'}
                  {status === 'reconnecting' &&
                    `إعادة الاتصال الذكي (محاولة ${reconnectAttempt} · خادم ${activeStreamIndex + 1})`}
                  {status === 'paused' && 'البث متوقف مؤقتاً'}
                  {status === 'error' && 'تعذر الاتصال بالبث'}
                  {status === 'idle' && 'اختر قناة لبدء البث المتواصل'}
                </span>
                {activeStation && activeStreamIndex > 0 && status === 'playing' && (
                  <span className="inline-flex items-center gap-1 text-emerald-300">
                    <ShieldCheck className="h-3.5 w-3.5" />
                    خادم بديل نشط
                  </span>
                )}
              </div>

              <h3 className="text-base sm:text-lg font-extrabold truncate">
                {activeStation ? activeStation.name : 'إذاعة القرآن الكريم — البث المباشر'}
              </h3>
              {activeStation?.subtitle && (
                <p className="text-[11px] text-slate-300 truncate">{activeStation.subtitle}</p>
              )}
            </div>

            {/* Minimize Button ("خفض المشغل") */}
            {activeStation && (
              <button
                type="button"
                onClick={onMinimize}
                className="min-h-[40px] flex items-center gap-1.5 shrink-0 rounded-xl border border-amber-400/40 bg-amber-500/15 hover:bg-amber-500/25 px-2.5 py-1.5 text-xs font-bold text-amber-200 transition-colors"
              >
                <Minimize2 className="h-4 w-4 shrink-0" />
                <span>خفض المشغل (تصغير)</span>
              </button>
            )}
          </div>

          {/* Controls + Volume */}
          <div className="flex flex-wrap items-center gap-2.5">
            <div className="flex items-center gap-2 shrink-0">
              {activeStation ? (
                <>
                  <button
                    type="button"
                    onClick={onTogglePlayPause}
                    aria-label={isPlayingOrConnecting ? 'إيقاف مؤقت' : 'تشغيل'}
                    className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white shadow-md transition-colors"
                  >
                    {isPlayingOrConnecting ? (
                      <Pause className="h-5 w-5 fill-current" />
                    ) : (
                      <Play className="h-5 w-5 fill-current" />
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={onStopStream}
                    aria-label="إيقاف نهائي"
                    className="flex h-11 w-11 items-center justify-center rounded-xl bg-rose-600 hover:bg-rose-500 text-white shadow-md transition-colors"
                  >
                    <Square className="h-4 w-4 fill-current" />
                  </button>
                </>
              ) : (
                <button
                  type="button"
                  onClick={() => onStartStream(cairoRadio)}
                  className="min-h-[44px] flex items-center gap-2 rounded-xl bg-amber-600 hover:bg-amber-500 px-4 py-2 text-xs sm:text-sm font-extrabold text-white shadow-md transition-colors"
                >
                  <Play className="h-4 w-4 fill-current" />
                  <span>تشغيل إذاعة القاهرة الآن</span>
                </button>
              )}

              {status === 'error' && activeStation && (
                <button
                  type="button"
                  onClick={() => onStartStream(activeStation)}
                  aria-label="إعادة المحاولة"
                  className="flex h-11 w-11 items-center justify-center rounded-xl bg-amber-600 hover:bg-amber-500 text-white shadow-md transition-colors"
                >
                  <RefreshCw className="h-5 w-5" />
                </button>
              )}
            </div>

            {/* Volume Slider */}
            <div className="flex flex-1 min-w-[140px] items-center gap-2">
              <button
                type="button"
                onClick={onToggleMute}
                aria-label={isMuted ? 'إلغاء كتم الصوت' : 'كتم الصوت'}
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/10 hover:bg-white/20 transition-colors"
              >
                {isMuted ? (
                  <VolumeX className="h-4 w-4 text-rose-300" />
                ) : (
                  <Volume2 className="h-4 w-4 text-emerald-300" />
                )}
              </button>
              <input
                type="range"
                min={0}
                max={1}
                step={0.05}
                value={isMuted ? 0 : volume}
                onChange={(e) => onChangeVolume(Number(e.target.value))}
                aria-label="مستوى الصوت"
                className="h-2 flex-1 accent-amber-500 cursor-pointer"
              />
              {(status === 'connecting' || status === 'reconnecting') && (
                <Loader2 className="h-5 w-5 animate-spin text-amber-400 shrink-0" />
              )}
            </div>
          </div>

          {/* Sleep Timer Section inside Player */}
          <div className="border-t border-white/10 pt-3 space-y-2">
            <div className="flex items-center justify-between gap-2 text-xs">
              <span className="flex items-center gap-1.5 font-bold text-amber-300">
                <Timer className="h-4 w-4 shrink-0" />
                <span>مؤقت النوم وإيقاف البث التلقائي</span>
              </span>
              {sleepTimerSecondsLeft !== null ? (
                <span className="font-mono-num font-extrabold text-emerald-300">
                  يتوقف بعد {formatCountdown(sleepTimerSecondsLeft)}
                </span>
              ) : (
                <span className="text-slate-400">غير مفعّل</span>
              )}
            </div>

            <select
              value={sleepSelectVal}
              aria-label="مؤقت النوم وإيقاف البث التلقائي"
              onChange={(e) => {
                const val = e.target.value;
                setSleepSelectVal(val);
                const mins = Number.parseInt(val, 10);
                if (!Number.isNaN(mins) && mins > 0) {
                  setShowCustomSleepInput(false);
                  onSetSleepTimer(mins);
                }
              }}
              className="min-h-[42px] w-full rounded-xl border border-white/20 bg-slate-900/95 px-3 py-2 text-xs sm:text-sm font-bold text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
            >
              <option value="">اختر مدة الإيقاف التلقائي...</option>
              <option value="5">5 دقائق</option>
              <option value="15">15 دقيقة</option>
              <option value="30">30 دقيقة</option>
              <option value="45">45 دقيقة</option>
              <option value="60">60 دقيقة</option>
            </select>

            <div className="grid grid-cols-2 gap-1.5">
              <button
                type="button"
                onClick={() => setShowCustomSleepInput((v) => !v)}
                className="min-h-[40px] rounded-xl bg-emerald-700 hover:bg-emerald-600 px-2 py-1.5 text-xs font-bold text-white transition-colors"
              >
                تحديد مخصص
              </button>

              <button
                type="button"
                onClick={() => {
                  setSleepSelectVal('');
                  setShowCustomSleepInput(false);
                  onCancelSleepTimer();
                }}
                disabled={sleepTimerSecondsLeft === null}
                className="min-h-[40px] rounded-xl bg-rose-600/85 hover:bg-rose-600 px-2 py-1.5 text-xs font-bold text-white transition-colors disabled:opacity-40"
              >
                إنهاء المؤقت
              </button>
            </div>

            {showCustomSleepInput && (
              <div className="grid grid-cols-2 gap-1.5 items-center pt-1">
                <input
                  type="number"
                  min={1}
                  max={360}
                  value={customMinutes}
                  onChange={(e) => setCustomMinutes(e.target.value)}
                  aria-label="دقائق مخصصة لمؤقت النوم"
                  placeholder="عدد الدقائق"
                  className="min-h-[40px] w-full rounded-xl border border-white/20 bg-slate-900/90 px-3 text-center font-mono-num text-xs font-bold text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
                <button
                  type="button"
                  onClick={() => {
                    const n = Number.parseInt(customMinutes, 10);
                    if (!Number.isNaN(n) && n > 0) {
                      setSleepSelectVal('');
                      onSetSleepTimer(n);
                      setShowCustomSleepInput(false);
                    }
                  }}
                  className="min-h-[40px] rounded-xl bg-amber-600 hover:bg-amber-500 px-2 py-1.5 text-xs font-bold text-white transition-colors"
                >
                  تفعيل المؤقت
                </button>
              </div>
            )}
          </div>

          {errorMsg && (
            <div className="flex items-center gap-2 rounded-xl bg-rose-500/20 border border-rose-400/30 px-3 py-2 text-xs text-rose-200">
              <WifiOff className="h-4 w-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}
        </div>
      )}

      {/* Official Cairo Radio + Top 5 Priority Readers */}
      <div className="space-y-2">
        <p className="text-xs font-bold text-slate-600 dark:text-slate-300">
          الإذاعة الرسمية وكبار القراء (بث متواصل 24 ساعة)
        </p>

        {/* Official Cairo Radio Hero Card */}
        <button
          type="button"
          onClick={() =>
            activeStation?.id === cairoRadio.id ? onTogglePlayPause() : onStartStream(cairoRadio)
          }
          className={`flex w-full items-center justify-between gap-3 rounded-2xl border p-3.5 text-right transition-colors ${
            activeStation?.id === cairoRadio.id
              ? 'border-amber-500 bg-amber-500/15'
              : 'border-emerald-600/35 bg-emerald-700/10 hover:border-amber-500/60'
          }`}
        >
          <div className="min-w-0">
            <h4 className="text-sm sm:text-base font-extrabold text-emerald-800 dark:text-amber-300">
              {cairoRadio.name}
            </h4>
            <p className="text-xs text-slate-600 dark:text-slate-300 mt-0.5">
              {cairoRadio.subtitle}
            </p>
          </div>
          <span
            className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-white ${
              activeStation?.id === cairoRadio.id && isPlayingOrConnecting
                ? 'bg-rose-600'
                : 'bg-emerald-700'
            }`}
          >
            {activeStation?.id === cairoRadio.id && isPlayingOrConnecting ? (
              <Pause className="h-5 w-5 fill-current" />
            ) : (
              <Play className="h-5 w-5 fill-current" />
            )}
          </span>
        </button>

        {/* Quick-Select Readers & Category Filter Dropdowns (Mobile & Desktop, Max 2 per row) */}
        <div className="grid grid-cols-2 gap-2 pt-1">
          <select
            value={
              activeStation && quickSelectStations.some((q) => q.id === activeStation.id)
                ? String(activeStation.id)
                : ''
            }
            onChange={(e) => {
              const id = Number(e.target.value);
              const found = quickSelectStations.find((q) => q.id === id)?.station;
              if (found) onStartStream(found);
            }}
            aria-label="الاختيار السريع لكبار القراء والإذاعات"
            className="min-h-[44px] w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-2.5 py-2 text-xs sm:text-sm font-bold focus:outline-none focus:ring-2 focus:ring-amber-500"
          >
            <option value="">الاختيار السريع (كبار القراء)</option>
            {quickSelectStations.map((item) => (
              <option key={item.id} value={String(item.id)}>
                {item.label}
              </option>
            ))}
          </select>

          <select
            value={category}
            onChange={(e) => setCategory(e.target.value as RadioCategory)}
            aria-label="تصنيف قنوات الإذاعة"
            className="min-h-[44px] w-full rounded-xl border border-amber-500/35 bg-white dark:bg-slate-900 px-2.5 py-2 text-xs sm:text-sm font-bold focus:outline-none focus:ring-2 focus:ring-amber-500"
          >
            <option value="all">كل القنوات</option>
            <option value="official">إذاعات رسمية</option>
            <option value="senior_egypt">قراء مصر</option>
            <option value="haramain">قراء الحرمين</option>
          </select>
        </div>
      </div>

      {/* Fast Station Search */}
      <div className="relative">
        <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
        <input
          type="search"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="ابحث بالاسم في أكثر من 170 إذاعة للقرآن الكريم..."
          className="w-full min-h-[44px] rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 pr-10 pl-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
        />
      </div>

      {/* Stations List */}
      {loadingStations ? (
        <div className="flex items-center justify-center py-8 text-sm text-slate-500 gap-2">
          <Loader2 className="h-4 w-4 animate-spin" />
          <span>جارٍ جلب جميع قنوات البث المباشر...</span>
        </div>
      ) : filteredStations.length === 0 ? (
        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 p-6 text-center text-sm text-slate-500">
          لا توجد إذاعات مطابقة لبحثك.
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-[400px] overflow-y-auto pl-1">
          {filteredStations.map((station) => {
            const isCurrent = activeStation?.id === station.id;
            return (
              <button
                key={`${station.id}-${station.url}`}
                type="button"
                onClick={() => (isCurrent ? onTogglePlayPause() : onStartStream(station))}
                className={`flex min-h-[56px] items-center justify-between gap-2 rounded-2xl border px-3.5 py-2.5 text-right transition-colors ${
                  isCurrent
                    ? 'border-emerald-500 bg-emerald-600/15 text-emerald-800 dark:text-emerald-200'
                    : 'border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-900/75 hover:border-amber-500/40'
                }`}
              >
                <div className="min-w-0 flex-1">
                  <p className="text-xs sm:text-sm font-bold leading-snug truncate">
                    {station.name}
                  </p>
                  {station.subtitle && (
                    <p className="text-[10px] text-slate-500 dark:text-slate-400 truncate mt-0.5">
                      {station.subtitle}
                    </p>
                  )}
                </div>
                <span
                  className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-white ${
                    isCurrent && isPlayingOrConnecting ? 'bg-rose-600' : 'bg-emerald-700'
                  }`}
                >
                  {isCurrent && isPlayingOrConnecting ? (
                    <Pause className="h-4 w-4 fill-current" />
                  ) : (
                    <Play className="h-4 w-4 fill-current" />
                  )}
                </span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
