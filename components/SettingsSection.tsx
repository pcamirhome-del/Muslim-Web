'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Bell,
  BellRing,
  CheckCircle2,
  Clock,
  Download,
  HardDrive,
  Moon,
  Pause,
  Play,
  RefreshCw,
  Settings,
  Sparkles,
  Sun,
  Trash2,
  Volume2,
  WifiOff,
  X,
} from 'lucide-react';
import {
  QURAN_RECITERS,
  RIWAYAH_OPTIONS,
  RiwayahId,
  resolveReciterAndStream,
} from '@/lib/data/quran-reciters';
import {
  DEFAULT_SELECTED_DHIKR_IDS,
  DhikrVoiceMode,
  EGYPTIAN_DHIKR_CLIPS,
  MUADHINS_LIST,
  parseSelectedDhikrIds,
} from '@/lib/data/audio-library';
import { useFullQuranDownloader } from '@/hooks/useFullQuranDownloader';

interface SettingsSectionProps {
  isDark: boolean;
  onToggleTheme: () => void;
}

function formatBytesArabic(bytes: number): string {
  if (!bytes || bytes <= 0) return '0 ميجابايت';
  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} كيلوبايت`;
  }
  if (bytes < 1024 * 1024 * 1024) {
    return `${(bytes / (1024 * 1024)).toFixed(1)} ميجابايت`;
  }
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} جيجابايت`;
}

export function SettingsSection({ isDark, onToggleTheme }: SettingsSectionProps) {
  // Notification & Audio Settings
  const [notifPermission, setNotifPermission] = useState<NotificationPermission | 'unsupported'>(
    'default'
  );
  const [adhanAudioEnabled, setAdhanAudioEnabled] = useState<boolean>(true);
  const [adhanNotifEnabled, setAdhanNotifEnabled] = useState<boolean>(true);
  const [preAdhanEnabled, setPreAdhanEnabled] = useState<boolean>(true);
  const [muadhinId, setMuadhinId] = useState<string>('tobar');

  const [dhikrEnabled, setDhikrEnabled] = useState<boolean>(false);
  const [dhikrInterval, setDhikrInterval] = useState<number>(3);
  const [dhikrMode, setDhikrMode] = useState<DhikrVoiceMode>('egyptian_dhikr');
  const [selectedDhikrIds, setSelectedDhikrIds] = useState<string[]>(DEFAULT_SELECTED_DHIKR_IDS);

  // Full Quran Offline Downloader Selection
  const [selectedReciterId, setSelectedReciterId] = useState<string>('abdulbasit');
  const [selectedRiwayah, setSelectedRiwayah] = useState<RiwayahId>('hafs');
  const [confirmClearAll, setConfirmClearAll] = useState<boolean>(false);
  const [settingsSavedNotice, setSettingsSavedNotice] = useState<string | null>(null);

  const downloader = useFullQuranDownloader();

  const resolvedSelection = useMemo(
    () => resolveReciterAndStream(selectedReciterId, selectedRiwayah),
    [selectedReciterId, selectedRiwayah]
  );

  // Sync initial preferences from localStorage
  useEffect(() => {
    const timer = setTimeout(() => {
      try {
        const sAdhan = localStorage.getItem('noor_adhan_enabled');
        if (sAdhan !== null) setAdhanAudioEnabled(sAdhan === 'true');

        const sAdhanNotif = localStorage.getItem('noor_adhan_notif_enabled');
        if (sAdhanNotif !== null) setAdhanNotifEnabled(sAdhanNotif === 'true');

        const sPre = localStorage.getItem('noor_pre_adhan_enabled');
        if (sPre !== null) setPreAdhanEnabled(sPre === 'true');

        const sMuadhin = localStorage.getItem('noor_muadhin_id');
        if (sMuadhin && MUADHINS_LIST.some((m) => m.id === sMuadhin)) {
          setMuadhinId(sMuadhin);
        }

        const sDhikrEnabled = localStorage.getItem('noor_dhikr_enabled');
        if (sDhikrEnabled !== null) setDhikrEnabled(sDhikrEnabled === 'true');

        const sInterval = Number(localStorage.getItem('noor_dhikr_interval'));
        if (sInterval >= 1 && sInterval <= 5) setDhikrInterval(sInterval);

        const sMode = localStorage.getItem('noor_dhikr_mode') as DhikrVoiceMode | null;
        if (sMode === 'egyptian_dhikr' || sMode === 'sheikh') setDhikrMode(sMode);

        setSelectedDhikrIds(parseSelectedDhikrIds(localStorage.getItem('noor_selected_dhikrs')));
      } catch {
        // ignore storage errors
      }

      if (typeof Notification === 'undefined') {
        setNotifPermission('unsupported');
      } else {
        setNotifPermission(Notification.permission);
      }
    }, 0);
    return () => clearTimeout(timer);
  }, []);

  const persistSetting = useCallback((key: string, value: string, label?: string) => {
    try {
      localStorage.setItem(key, value);
    } catch {
      // ignore
    }
    window.dispatchEvent(new Event('noor-settings-updated'));
    if (label) {
      setSettingsSavedNotice(label);
      setTimeout(() => setSettingsSavedNotice(null), 2200);
    }
  }, []);

  const handleRequestPermission = async () => {
    if (typeof Notification === 'undefined') return;
    const perm = await Notification.requestPermission();
    setNotifPermission(perm);
    if (perm === 'granted') {
      persistSetting('noor_adhan_notif_enabled', 'true', 'تم تفعيل إشعارات الأذان بنجاح');
      setAdhanNotifEnabled(true);
    }
  };

  // Group downloaded Surahs by reciter + riwayah for Storage Manager
  const downloadedBundles = useMemo(() => {
    const map = new Map<
      string,
      {
        reciterId: string;
        reciterName: string;
        riwayah: RiwayahId;
        count: number;
      }
    >();

    for (const rec of downloader.downloads) {
      const k = `${rec.reciterId}:${rec.riwayah}`;
      const existing = map.get(k);
      if (existing) {
        existing.count += 1;
      } else {
        map.set(k, {
          reciterId: rec.reciterId,
          reciterName: rec.reciterName,
          riwayah: rec.riwayah,
          count: 1,
        });
      }
    }
    return Array.from(map.values());
  }, [downloader.downloads]);

  const selectedDownloadedCount = useMemo(() => {
    return downloader.downloads.filter(
      (d) =>
        d.reciterId === resolvedSelection.reciter.id &&
        d.riwayah === resolvedSelection.stream.riwayah
    ).length;
  }, [downloader.downloads, resolvedSelection]);

  const isQueueActiveForSelection =
    (downloader.status === 'running' || downloader.status === 'paused') &&
    downloader.activeReciterId === resolvedSelection.reciter.id &&
    downloader.activeRiwayah === resolvedSelection.stream.riwayah;

  return (
    <div className="space-y-4">
      {/* Section Header */}
      <section className="rounded-3xl border border-amber-500/25 bg-gradient-to-br from-emerald-950/90 via-slate-900/95 to-slate-950 p-4 sm:p-5 text-white shadow-xl">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-lg sm:text-xl font-extrabold flex items-center gap-2 text-amber-300">
              <Settings className="h-5 w-5 shrink-0" />
              <span>الإعدادات المتقدمة ومدير التحميل الكامل</span>
            </h2>
            <p className="text-xs text-slate-300 mt-1 leading-relaxed">
              تحكم كامل بالمظهر، إشعارات الأذان والتنبيه المسبق، الأذكار الصوتية، وتحميل المصحف كاملاً (١١٤ سورة) للعمل بدون إنترنت.
            </p>
          </div>
          {settingsSavedNotice && (
            <span className="inline-flex items-center gap-1.5 rounded-xl border border-emerald-400/40 bg-emerald-500/20 px-3 py-1.5 text-xs font-bold text-emerald-200">
              <CheckCircle2 className="h-4 w-4" />
              <span>{settingsSavedNotice}</span>
            </span>
          )}
        </div>
      </section>

      {/* 1. Theme Switcher (Light / Dark Mode) */}
      <section className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-900/80 p-4 space-y-3">
        <div className="flex items-center justify-between gap-2">
          <div>
            <h3 className="text-sm sm:text-base font-extrabold flex items-center gap-2">
              {isDark ? (
                <Moon className="h-4 w-4 text-amber-400" />
              ) : (
                <Sun className="h-4 w-4 text-amber-500" />
              )}
              <span>مظهر التطبيق والخلفيات المقدسة</span>
            </h3>
            <p className="text-[11px] sm:text-xs text-slate-600 dark:text-slate-300 mt-0.5">
              تبقى صورة الكعبة المشرفة والمسجد الأقصى على الحواف الجانبية بوضوح تام للنصوص في الوضعين.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => {
              if (!isDark) onToggleTheme();
            }}
            className={`min-h-[48px] flex items-center justify-center gap-2 rounded-2xl border px-3 py-2 text-xs sm:text-sm font-extrabold transition-all ${
              isDark
                ? 'border-amber-500 bg-slate-950 text-amber-300 shadow-md'
                : 'border-slate-200 bg-white text-slate-700 hover:border-amber-500/40'
            }`}
          >
            <Moon className="h-4 w-4 shrink-0" />
            <span>المظهر الليلي (Dark)</span>
          </button>

          <button
            type="button"
            onClick={() => {
              if (isDark) onToggleTheme();
            }}
            className={`min-h-[48px] flex items-center justify-center gap-2 rounded-2xl border px-3 py-2 text-xs sm:text-sm font-extrabold transition-all ${
              !isDark
                ? 'border-amber-500 bg-amber-50 text-amber-900 shadow-md'
                : 'border-slate-700 bg-slate-800 text-slate-200 hover:border-amber-500/40'
            }`}
          >
            <Sun className="h-4 w-4 shrink-0" />
            <span>المظهر النهاري (Light)</span>
          </button>
        </div>
      </section>

      {/* 2. Notifications, 10-Min Pre-Adhan & Periodic Dhikr */}
      <section className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-900/80 p-4 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h3 className="text-sm sm:text-base font-extrabold flex items-center gap-2">
              <BellRing className="h-4 w-4 text-emerald-500" />
              <span>إدارة الإشعارات، التنبيهات، ومنبه الأذكار</span>
            </h3>
            <p className="text-[11px] sm:text-xs text-slate-600 dark:text-slate-300 mt-0.5">
              تُطبق هذه التعديلات فوراً وتُحفظ تلقائياً في جهازك.
            </p>
          </div>

          <button
            type="button"
            onClick={handleRequestPermission}
            disabled={notifPermission === 'unsupported'}
            className={`min-h-[40px] flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-bold transition-colors ${
              notifPermission === 'granted'
                ? 'bg-emerald-700 text-white'
                : notifPermission === 'denied'
                ? 'bg-rose-600 text-white'
                : 'bg-amber-600 hover:bg-amber-500 text-white'
            }`}
          >
            <Bell className="h-3.5 w-3.5 shrink-0" />
            <span>
              {notifPermission === 'granted'
                ? 'إذن الإشعارات: مُفعّل'
                : notifPermission === 'denied'
                ? 'الإشعارات محظورة من المتصفح'
                : notifPermission === 'unsupported'
                ? 'المتصفح لا يدعم الإشعارات'
                : 'تفعيل إذن الإشعارات الآن'}
            </span>
          </button>
        </div>

        {/* Toggle grid (2 cards per row on sm+) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          {/* Immediate Adhan Browser Notification */}
          <button
            type="button"
            onClick={() => {
              const next = !adhanNotifEnabled;
              setAdhanNotifEnabled(next);
              persistSetting(
                'noor_adhan_notif_enabled',
                String(next),
                next ? 'تم تفعيل إشعار الأذان الفوري' : 'تم إيقاف إشعار الأذان الفوري'
              );
            }}
            className={`min-h-[54px] flex items-center justify-between gap-2 rounded-2xl border px-3 py-2.5 text-right transition-colors ${
              adhanNotifEnabled
                ? 'border-emerald-500/60 bg-emerald-500/10'
                : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950/60'
            }`}
          >
            <div className="min-w-0">
              <p className="text-xs sm:text-sm font-extrabold">إشعارات الأذان الفورية</p>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                إظهار تنبيه منبثق فور دخول وقت الصلاة
              </p>
            </div>
            <span
              className={`shrink-0 rounded-lg px-2.5 py-1 text-[11px] font-extrabold ${
                adhanNotifEnabled
                  ? 'bg-emerald-700 text-white'
                  : 'bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
              }`}
            >
              {adhanNotifEnabled ? 'مُفعّل' : 'متوقف'}
            </span>
          </button>

          {/* 10-Minute Pre-Adhan Reminder */}
          <button
            type="button"
            onClick={() => {
              const next = !preAdhanEnabled;
              setPreAdhanEnabled(next);
              persistSetting(
                'noor_pre_adhan_enabled',
                String(next),
                next ? 'تم تفعيل التنبيه قبل الأذان بـ ١٠ دقائق' : 'تم إيقاف التنبيه المسبق'
              );
            }}
            className={`min-h-[54px] flex items-center justify-between gap-2 rounded-2xl border px-3 py-2.5 text-right transition-colors ${
              preAdhanEnabled
                ? 'border-amber-500/60 bg-amber-500/10'
                : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950/60'
            }`}
          >
            <div className="min-w-0">
              <p className="text-xs sm:text-sm font-extrabold">التنبيه قبل الأذان بـ ١٠ دقائق</p>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                إشعار للاستعداد للوضوء قبل كل صلاة مفروضة
              </p>
            </div>
            <span
              className={`shrink-0 rounded-lg px-2.5 py-1 text-[11px] font-extrabold ${
                preAdhanEnabled
                  ? 'bg-amber-600 text-white'
                  : 'bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
              }`}
            >
              {preAdhanEnabled ? 'مُفعّل' : 'متوقف'}
            </span>
          </button>

          {/* Automatic Adhan Audio */}
          <button
            type="button"
            onClick={() => {
              const next = !adhanAudioEnabled;
              setAdhanAudioEnabled(next);
              persistSetting(
                'noor_adhan_enabled',
                String(next),
                next ? 'تم تفعيل صوت الأذان التلقائي' : 'تم إيقاف صوت الأذان التلقائي'
              );
            }}
            className={`min-h-[54px] flex items-center justify-between gap-2 rounded-2xl border px-3 py-2.5 text-right transition-colors ${
              adhanAudioEnabled
                ? 'border-emerald-500/60 bg-emerald-500/10'
                : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950/60'
            }`}
          >
            <div className="min-w-0">
              <p className="text-xs sm:text-sm font-extrabold">صوت الأذان التلقائي</p>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                رفع الأذان صوتياً بصوت المؤذن المختار
              </p>
            </div>
            <span
              className={`shrink-0 rounded-lg px-2.5 py-1 text-[11px] font-extrabold ${
                adhanAudioEnabled
                  ? 'bg-emerald-700 text-white'
                  : 'bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
              }`}
            >
              {adhanAudioEnabled ? 'مُفعّل' : 'متوقف'}
            </span>
          </button>

          {/* Periodic Dhikr Audio */}
          <button
            type="button"
            onClick={() => {
              const next = !dhikrEnabled;
              setDhikrEnabled(next);
              persistSetting(
                'noor_dhikr_enabled',
                String(next),
                next ? 'تم تفعيل منبه الأذكار الصوتية الدورية' : 'تم إيقاف منبه الأذكار الدورية'
              );
            }}
            className={`min-h-[54px] flex items-center justify-between gap-2 rounded-2xl border px-3 py-2.5 text-right transition-colors ${
              dhikrEnabled
                ? 'border-emerald-500/60 bg-emerald-500/10'
                : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950/60'
            }`}
          >
            <div className="min-w-0">
              <p className="text-xs sm:text-sm font-extrabold">الأذكار الصوتية الدورية</p>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                تشغيل تلقائي كل {dhikrInterval} {dhikrInterval === 1 ? 'دقيقة' : 'دقائق'}
              </p>
            </div>
            <span
              className={`shrink-0 rounded-lg px-2.5 py-1 text-[11px] font-extrabold ${
                dhikrEnabled
                  ? 'bg-emerald-700 text-white'
                  : 'bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
              }`}
            >
              {dhikrEnabled ? 'مُفعّل' : 'متوقف'}
            </span>
          </button>
        </div>

        {/* Muadhin Select */}
        <div className="space-y-1.5">
          <label className="text-xs font-bold flex items-center gap-1.5 text-slate-700 dark:text-slate-200">
            <Volume2 className="h-3.5 w-3.5 text-amber-500" />
            <span>المؤذن الافتراضي للأذان التلقائي:</span>
          </label>
          <select
            value={muadhinId}
            onChange={(e) => {
              const id = e.target.value;
              setMuadhinId(id);
              persistSetting('noor_muadhin_id', id, 'تم تحديث صوت المؤذن');
            }}
            aria-label="اختيار المؤذن الافتراضي"
            className="min-h-[44px] w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2 text-xs sm:text-sm font-bold focus:outline-none focus:ring-2 focus:ring-amber-500"
          >
            {MUADHINS_LIST.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name} — {m.title}
              </option>
            ))}
          </select>
        </div>

        {/* Dhikr Voice Mode & Interval */}
        <div className="space-y-2 border-t border-slate-200 dark:border-slate-800 pt-3">
          <p className="text-xs font-bold flex items-center gap-1.5">
            <Sparkles className="h-3.5 w-3.5 text-emerald-500" />
            <span>صوت وتوقيت الأذكار الصوتية (١ إلى ٥ دقائق):</span>
          </p>

          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => {
                setDhikrMode('egyptian_dhikr');
                persistSetting('noor_dhikr_mode', 'egyptian_dhikr', 'تم اختيار الأذكار بالعامية المصرية');
              }}
              className={`min-h-[44px] rounded-xl px-2 py-2 text-[11px] sm:text-xs font-bold leading-tight text-center transition-colors ${
                dhikrMode === 'egyptian_dhikr'
                  ? 'bg-emerald-700 text-white shadow-sm'
                  : 'border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800'
              }`}
            >
              الأذكار بالعامية المصرية
            </button>

            <button
              type="button"
              onClick={() => {
                setDhikrMode('sheikh');
                persistSetting('noor_dhikr_mode', 'sheikh', 'تم اختيار الأذكار بصوت الشيوخ');
              }}
              className={`min-h-[44px] rounded-xl px-2 py-2 text-[11px] sm:text-xs font-bold leading-tight text-center transition-colors ${
                dhikrMode === 'sheikh'
                  ? 'bg-emerald-700 text-white shadow-sm'
                  : 'border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800'
              }`}
            >
              بصوت الشيوخ (الشعراوي وطوبار)
            </button>
          </div>

          <div className="grid grid-cols-4 gap-1.5">
            {[1, 2, 3, 4].map((mins) => (
              <button
                key={mins}
                type="button"
                onClick={() => {
                  setDhikrInterval(mins);
                  persistSetting('noor_dhikr_interval', String(mins), `تم ضبط التكرار كل ${mins} د`);
                }}
                className={`min-h-[42px] rounded-xl px-1 py-2 text-[10px] sm:text-xs font-bold leading-tight text-center break-words transition-colors ${
                  dhikrInterval === mins
                    ? 'bg-amber-600 text-white shadow-sm'
                    : 'border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800'
                }`}
              >
                كل {mins} {mins === 1 ? 'دقيقة' : 'دقائق'}
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={() => {
              setDhikrInterval(5);
              persistSetting('noor_dhikr_interval', '5', 'تم ضبط التكرار كل 5 دقائق');
            }}
            className={`w-full min-h-[42px] rounded-xl px-3 py-2 text-xs font-bold flex items-center justify-center gap-1.5 transition-colors ${
              dhikrInterval === 5
                ? 'bg-amber-600 text-white shadow-sm'
                : 'border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800'
            }`}
          >
            <Clock className="h-3.5 w-3.5" />
            <span>تكرار الأذكار كل 5 دقائق</span>
          </button>

          {/* Select Specific Dhikrs (Checkboxes) */}
          <div className="space-y-2 border-t border-slate-200 dark:border-slate-800 pt-3">
            <div className="flex items-center justify-between gap-2">
              <p className="text-xs font-bold text-slate-700 dark:text-slate-200">
                تحديد الأذكار المفعّلة في المنبه ({selectedDhikrIds.length} / {EGYPTIAN_DHIKR_CLIPS.length}):
              </p>
              <button
                type="button"
                onClick={() => {
                  setSelectedDhikrIds(DEFAULT_SELECTED_DHIKR_IDS);
                  persistSetting(
                    'noor_selected_dhikrs',
                    JSON.stringify(DEFAULT_SELECTED_DHIKR_IDS),
                    'تم تفعيل جميع الأذكار الأربعة'
                  );
                }}
                className="rounded-lg border border-amber-500/40 bg-amber-500/10 px-2.5 py-1 text-[11px] font-bold text-amber-700 dark:text-amber-300 hover:bg-amber-500/20 transition-colors"
              >
                تحديد الكل
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {EGYPTIAN_DHIKR_CLIPS.map((clip) => {
                const isChecked = selectedDhikrIds.includes(clip.id);
                return (
                  <label
                    key={clip.id}
                    className={`flex min-h-[44px] cursor-pointer items-center justify-between gap-2 rounded-xl border px-3 py-2 text-xs font-bold transition-colors ${
                      isChecked
                        ? 'border-emerald-500/60 bg-emerald-500/10 text-emerald-900 dark:text-emerald-200'
                        : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950/60 text-slate-600 dark:text-slate-400'
                    }`}
                  >
                    <span className="flex items-center gap-2.5 min-w-0">
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => {
                          if (isChecked && selectedDhikrIds.length <= 1) {
                            setSettingsSavedNotice('يجب إبقاء ذكر واحد على الأقل مفعّلاً');
                            setTimeout(() => setSettingsSavedNotice(null), 2200);
                            return;
                          }
                          const next = isChecked
                            ? selectedDhikrIds.filter((id) => id !== clip.id)
                            : [...selectedDhikrIds, clip.id];
                          setSelectedDhikrIds(next);
                          persistSetting(
                            'noor_selected_dhikrs',
                            JSON.stringify(next),
                            isChecked ? `تم إيقاف "${clip.label}"` : `تم تفعيل "${clip.label}"`
                          );
                        }}
                        className="h-4 w-4 accent-emerald-600 rounded cursor-pointer shrink-0"
                      />
                      <span className="truncate">{clip.label}</span>
                    </span>
                    <span
                      className={`shrink-0 rounded-md px-2 py-0.5 text-[10px] font-extrabold ${
                        isChecked
                          ? 'bg-emerald-700 text-white'
                          : 'bg-slate-200 dark:bg-slate-800 text-slate-500 dark:text-slate-400'
                      }`}
                    >
                      {isChecked ? 'مفعّل' : 'متوقف'}
                    </span>
                  </label>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      {/* 3. Full Quran Offline Downloader (114 Surahs Queue) */}
      <section className="rounded-3xl border border-amber-500/30 bg-slate-50/85 dark:bg-slate-900/85 p-4 space-y-3.5">
        <div>
          <h3 className="text-sm sm:text-base font-extrabold flex items-center gap-2 text-amber-600 dark:text-amber-400">
            <Download className="h-5 w-5 shrink-0" />
            <span>مدير تحميل القرآن الكريم بالكامل (١١٤ سورة Offline)</span>
          </h3>
          <p className="text-[11px] sm:text-xs text-slate-600 dark:text-slate-300 mt-0.5 leading-relaxed">
            اختر القارئ والرواية لحفظ المصحف كاملاً صوتاً ونصاً بالرسم العثماني داخل ذاكرة المتصفح للعمل بدون إنترنت نهائياً، مع إمكانية الإيقاف المؤقت والاستئناف.
          </p>
        </div>

        {/* Strict 2-Select Row Rule: Reciter + Riwayah side by side */}
        <div className="grid grid-cols-2 gap-2">
          <select
            value={resolvedSelection.reciter.id}
            onChange={(e) => setSelectedReciterId(e.target.value)}
            disabled={downloader.status === 'running'}
            aria-label="اختيار القارئ للتحميل الكامل"
            className="min-h-[44px] w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 px-2.5 py-2 text-xs sm:text-sm font-bold focus:outline-none focus:ring-2 focus:ring-amber-500 disabled:opacity-60"
          >
            {QURAN_RECITERS.map((r) => (
              <option key={r.id} value={r.id}>
                {r.name}
              </option>
            ))}
          </select>

          <select
            value={selectedRiwayah}
            onChange={(e) => setSelectedRiwayah(e.target.value as RiwayahId)}
            disabled={downloader.status === 'running'}
            aria-label="اختيار الرواية للتحميل الكامل"
            className="min-h-[44px] w-full rounded-xl border border-amber-500/35 bg-white dark:bg-slate-950 px-2.5 py-2 text-xs sm:text-sm font-bold focus:outline-none focus:ring-2 focus:ring-amber-500 disabled:opacity-60"
          >
            {RIWAYAH_OPTIONS.map((rw) => (
              <option key={rw.id} value={rw.id}>
                {rw.label}
              </option>
            ))}
          </select>
        </div>

        {/* Selected Reciter Info Banner */}
        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-slate-950/60 px-3 py-2.5 text-xs space-y-1">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="font-extrabold text-emerald-700 dark:text-emerald-300">
              {resolvedSelection.reciter.name} — {resolvedSelection.stream.editionLabel}
            </span>
            <span className="font-mono-num font-bold text-amber-600 dark:text-amber-400">
              المحفوظ حالياً: {selectedDownloadedCount} / 114 سورة
            </span>
          </div>
          <p className="text-[11px] text-slate-500 dark:text-slate-400">
            {resolvedSelection.stream.everyayahFolder
              ? 'سيتم تحميل النص العثماني + صفحات المصحف + تلاوة كل آية بدون فواصل.'
              : 'سيتم تحميل النص العثماني + صفحات المصحف + ملفات السور الصوتية الكاملة.'}
          </p>
        </div>

        {/* Active Progress Panel */}
        {(downloader.status !== 'idle' || selectedDownloadedCount > 0) && (
          <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-3 space-y-2">
            <div className="flex items-center justify-between gap-2 text-xs font-extrabold">
              <span>
                {downloader.status === 'running'
                  ? `جارٍ التحميل: سورة ${downloader.currentSurahName} (${downloader.currentSurahNumber || 1} / ${downloader.totalCount})`
                  : downloader.status === 'paused'
                  ? `متوقف مؤقتاً عند سورة ${downloader.currentSurahName || ''}`
                  : downloader.status === 'completed'
                  ? 'تم تحميل المصحف الشريف بالكامل بنجاح!'
                  : `السور الجاهزة بدون إنترنت: ${selectedDownloadedCount} / 114`}
              </span>
              <span className="font-mono-num text-emerald-700 dark:text-emerald-300">
                {downloader.status === 'running' || downloader.status === 'paused'
                  ? `${downloader.completedCount} / ${downloader.totalCount} (${downloader.overallPercent}%)`
                  : `${Math.round((selectedDownloadedCount / 114) * 100)}%`}
              </span>
            </div>

            {/* Overall Progress Bar */}
            <div className="h-2.5 w-full overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800">
              <div
                className="h-full rounded-full bg-gradient-to-l from-amber-500 to-emerald-500 transition-all duration-300"
                style={{
                  width: `${
                    downloader.status === 'running' || downloader.status === 'paused'
                      ? downloader.overallPercent
                      : Math.round((selectedDownloadedCount / 114) * 100)
                  }%`,
                }}
              />
            </div>

            {/* Current Surah Bar */}
            {downloader.status === 'running' && (
              <div className="space-y-1">
                <div className="flex items-center justify-between text-[11px] font-bold text-slate-600 dark:text-slate-300">
                  <span>تقدم السورة الحالية ({downloader.currentSurahName})</span>
                  <span className="font-mono-num">{downloader.currentSurahPct}%</span>
                </div>
                <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800">
                  <div
                    className="h-full rounded-full bg-amber-500 transition-all duration-200"
                    style={{ width: `${downloader.currentSurahPct}%` }}
                  />
                </div>
              </div>
            )}
          </div>
        )}

        {downloader.errorMsg && (
          <div className="flex items-center gap-2 rounded-xl border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-xs font-bold text-rose-700 dark:text-rose-300">
            <WifiOff className="h-4 w-4 shrink-0" />
            <span>{downloader.errorMsg}</span>
          </div>
        )}

        {/* Queue Action Buttons (max 2 side by side) */}
        {downloader.status === 'running' ? (
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={downloader.pauseDownload}
              className="min-h-[46px] flex items-center justify-center gap-1.5 rounded-xl bg-amber-600 hover:bg-amber-500 px-3 py-2 text-xs sm:text-sm font-extrabold text-white transition-colors"
            >
              <Pause className="h-4 w-4 shrink-0" />
              <span>إيقاف مؤقت</span>
            </button>
            <button
              type="button"
              onClick={downloader.cancelDownload}
              className="min-h-[46px] flex items-center justify-center gap-1.5 rounded-xl bg-rose-600 hover:bg-rose-500 px-3 py-2 text-xs sm:text-sm font-extrabold text-white transition-colors"
            >
              <X className="h-4 w-4 shrink-0" />
              <span>إلغاء الطابور</span>
            </button>
          </div>
        ) : downloader.status === 'paused' && isQueueActiveForSelection ? (
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={downloader.resumeDownload}
              className="min-h-[46px] flex items-center justify-center gap-1.5 rounded-xl bg-emerald-700 hover:bg-emerald-600 px-3 py-2 text-xs sm:text-sm font-extrabold text-white transition-colors"
            >
              <Play className="h-4 w-4 shrink-0 fill-current" />
              <span>استئناف التحميل</span>
            </button>
            <button
              type="button"
              onClick={downloader.cancelDownload}
              className="min-h-[46px] flex items-center justify-center gap-1.5 rounded-xl bg-rose-600 hover:bg-rose-500 px-3 py-2 text-xs sm:text-sm font-extrabold text-white transition-colors"
            >
              <X className="h-4 w-4 shrink-0" />
              <span>إلغاء</span>
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() =>
              downloader.startDownload(
                resolvedSelection.reciter.id,
                resolvedSelection.stream.riwayah
              )
            }
            className="w-full min-h-[48px] flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-l from-amber-600 to-emerald-700 hover:brightness-110 px-4 py-3 text-xs sm:text-sm font-extrabold text-white shadow-lg transition-all"
          >
            <Download className="h-4 w-4 shrink-0" />
            <span>
              {selectedDownloadedCount === 114
                ? 'تم تحميل المصحف كاملاً — إعادة فحص/تحديث'
                : selectedDownloadedCount > 0
                ? `استكمال تحميل القرآن الكريم (${selectedDownloadedCount}/114)`
                : 'تحميل القرآن الكريم بالكامل للعمل بدون إنترنت'}
            </span>
          </button>
        )}
      </section>

      {/* 4. Storage Usage & Cache Manager */}
      <section className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-900/80 p-4 space-y-3">
        <div className="flex items-center justify-between gap-2">
          <h3 className="text-sm sm:text-base font-extrabold flex items-center gap-2">
            <HardDrive className="h-4 w-4 text-sky-500 shrink-0" />
            <span>إدارة المساحة والملفات المحفوظة</span>
          </h3>
          <button
            type="button"
            onClick={() => downloader.refreshStats()}
            className="min-h-[36px] flex items-center gap-1 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-2.5 py-1 text-[11px] font-bold"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            <span>تحديث</span>
          </button>
        </div>

        {/* 4 Stats Tiles (Strict 4-button/item grid) */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center">
          <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-slate-950/60 p-2.5">
            <p className="text-[10px] font-bold text-slate-500 dark:text-slate-400">
              المساحة المستخدمة
            </p>
            <p className="text-xs sm:text-sm font-extrabold text-amber-600 dark:text-amber-400 mt-0.5 font-mono-num">
              {formatBytesArabic(downloader.storageStats.usageBytes)}
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-slate-950/60 p-2.5">
            <p className="text-[10px] font-bold text-slate-500 dark:text-slate-400">
              ملفات تلاوة صوتية
            </p>
            <p className="text-xs sm:text-sm font-extrabold text-emerald-700 dark:text-emerald-300 mt-0.5 font-mono-num">
              {downloader.storageStats.quranAudioEntries} ملف
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-slate-950/60 p-2.5">
            <p className="text-[10px] font-bold text-slate-500 dark:text-slate-400">
              صفحات المصحف المحفوظة
            </p>
            <p className="text-xs sm:text-sm font-extrabold text-sky-600 dark:text-sky-400 mt-0.5 font-mono-num">
              {downloader.storageStats.quranTextEntries} صفحة/سورة
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-slate-950/60 p-2.5">
            <p className="text-[10px] font-bold text-slate-500 dark:text-slate-400">
              القصص والخواطر المحفوظة
            </p>
            <p className="text-xs sm:text-sm font-extrabold text-purple-600 dark:text-purple-400 mt-0.5 font-mono-num">
              {downloader.storageStats.mediaEntries} ملف
            </p>
          </div>
        </div>

        {/* Downloaded Recitations List */}
        {downloadedBundles.length > 0 ? (
          <div className="space-y-2 pt-1">
            <p className="text-xs font-bold text-slate-600 dark:text-slate-300">
              المصاحف والتلاوات المحفوظة حسب القارئ والرواية:
            </p>
            {downloadedBundles.map((bundle) => {
              const rwLabel =
                RIWAYAH_OPTIONS.find((r) => r.id === bundle.riwayah)?.label || bundle.riwayah;
              return (
                <div
                  key={`${bundle.reciterId}:${bundle.riwayah}`}
                  className="flex items-center justify-between gap-2 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-slate-950/60 px-3 py-2"
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-extrabold truncate">{bundle.reciterName}</p>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                      {rwLabel} ·{' '}
                      <span className="font-mono-num font-bold text-emerald-600 dark:text-emerald-400">
                        {bundle.count} / 114 سورة
                      </span>
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => downloader.deleteBundle(bundle.reciterId, bundle.riwayah)}
                    className="min-h-[36px] shrink-0 flex items-center gap-1 rounded-xl border border-rose-500/30 bg-rose-500/10 hover:bg-rose-600 hover:text-white px-2.5 py-1 text-[11px] font-bold text-rose-700 dark:text-rose-300 transition-colors"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    <span>حذف</span>
                  </button>
                </div>
              );
            })}
          </div>
        ) : (
          <p className="text-xs text-slate-500 dark:text-slate-400 text-center py-2">
            لا توجد سور قرآنية محملة للاستماع بدون إنترنت حتى الآن.
          </p>
        )}

        {/* Clear All Offline Data with safe inline confirmation */}
        {(downloader.downloads.length > 0 ||
          downloader.storageStats.quranAudioEntries > 0 ||
          downloader.storageStats.mediaEntries > 0) && (
          <div className="pt-1 border-t border-slate-200 dark:border-slate-800">
            {!confirmClearAll ? (
              <button
                type="button"
                onClick={() => setConfirmClearAll(true)}
                className="w-full min-h-[42px] flex items-center justify-center gap-1.5 rounded-xl border border-rose-500/35 bg-rose-500/10 hover:bg-rose-500/20 px-3 py-2 text-xs font-extrabold text-rose-700 dark:text-rose-300 transition-colors"
              >
                <Trash2 className="h-4 w-4" />
                <span>مسح جميع الملفات الصوتية والنصية المحفوظة</span>
              </button>
            ) : (
              <div className="rounded-2xl border border-rose-500/50 bg-rose-500/15 p-3 space-y-2">
                <p className="text-xs font-extrabold text-rose-700 dark:text-rose-200 text-center">
                  هل أنت متأكد من مسح جميع التلاوات والقصص المحفوظة لتفريغ المساحة؟
                </p>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={async () => {
                      await downloader.clearAll();
                      setConfirmClearAll(false);
                    }}
                    className="min-h-[40px] rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-extrabold"
                  >
                    نعم، مسح الكل
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfirmClearAll(false)}
                    className="min-h-[40px] rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-bold"
                  >
                    تراجع
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </section>
    </div>
  );
}
