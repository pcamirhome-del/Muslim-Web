'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Bell,
  BellOff,
  Play,
  Square,
  Volume2,
  Clock,
  Sparkles,
  Check,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import {
  DhikrAudioClip,
  DhikrVoiceMode,
  EGYPTIAN_DHIKR_CLIPS,
  MUADHINS_LIST,
  MuadhinItem,
  SHEIKH_DHIKR_CLIPS,
} from '@/lib/data/audio-library';
import {
  ADHAN_PRAYER_KEYS,
  PRAYER_LABELS_AR,
  PrayerKey,
  PrayerTimings,
  addMinutesToTime24,
  cleanTimeString,
  getZonedClockParts,
} from '@/lib/prayer-utils';

interface AdhanAndDhikrPanelProps {
  timings: PrayerTimings | null;
  timezone: string;
}

export function AdhanAndDhikrPanel({ timings, timezone }: AdhanAndDhikrPanelProps) {
  // Adhan state
  const [adhanEnabled, setAdhanEnabled] = useState<boolean>(true);
  const [adhanNotifEnabled, setAdhanNotifEnabled] = useState<boolean>(true);
  const [preAdhanEnabled, setPreAdhanEnabled] = useState<boolean>(true);
  const [selectedMuadhinId, setSelectedMuadhinId] = useState<string>('tobar');
  const [previewingMuadhinId, setPreviewingMuadhinId] = useState<string | null>(null);
  const [showAllMuadhins, setShowAllMuadhins] = useState<boolean>(false);
  const [activeAdhanPrayer, setActiveAdhanPrayer] = useState<PrayerKey | null>(null);
  const [notifPermission, setNotifPermission] = useState<NotificationPermission | 'unsupported'>(
    'default'
  );

  // Dhikr reminder state (1 to 5 minutes)
  const [dhikrEnabled, setDhikrEnabled] = useState<boolean>(false);
  const [dhikrIntervalMins, setDhikrIntervalMins] = useState<number>(3);
  const [dhikrMode, setDhikrMode] = useState<DhikrVoiceMode>('egyptian_dhikr');
  const [dhikrSecondsLeft, setDhikrSecondsLeft] = useState<number>(180);
  const [playingDhikrClip, setPlayingDhikrClip] = useState<DhikrAudioClip | null>(null);
  const [audioNotice, setAudioNotice] = useState<string | null>(null);

  const adhanAudioRef = useRef<HTMLAudioElement | null>(null);
  const dhikrAudioRef = useRef<HTMLAudioElement | null>(null);
  const lastFiredAdhanKeyRef = useRef<string>('');
  const lastFiredPreAdhanKeyRef = useRef<string>('');
  const dhikrIndexRef = useRef<number>(0);

  const syncFromStorage = useCallback(() => {
    try {
      const savedMuadhin = localStorage.getItem('noor_muadhin_id');
      if (savedMuadhin && MUADHINS_LIST.some((m) => m.id === savedMuadhin)) {
        setSelectedMuadhinId(savedMuadhin);
      }
      const savedAdhanEnabled = localStorage.getItem('noor_adhan_enabled');
      if (savedAdhanEnabled !== null) {
        setAdhanEnabled(savedAdhanEnabled === 'true');
      }
      const savedAdhanNotif = localStorage.getItem('noor_adhan_notif_enabled');
      if (savedAdhanNotif !== null) {
        setAdhanNotifEnabled(savedAdhanNotif === 'true');
      }
      const savedPreAdhan = localStorage.getItem('noor_pre_adhan_enabled');
      if (savedPreAdhan !== null) {
        setPreAdhanEnabled(savedPreAdhan === 'true');
      }
      const savedDhikrEnabled = localStorage.getItem('noor_dhikr_enabled');
      if (savedDhikrEnabled !== null) {
        setDhikrEnabled(savedDhikrEnabled === 'true');
      }
      const savedInterval = Number(localStorage.getItem('noor_dhikr_interval'));
      if (savedInterval >= 1 && savedInterval <= 5) {
        setDhikrIntervalMins(savedInterval);
        setDhikrSecondsLeft(savedInterval * 60);
      }
      const savedMode = localStorage.getItem('noor_dhikr_mode') as DhikrVoiceMode | null;
      if (savedMode === 'egyptian_dhikr' || savedMode === 'sheikh') {
        setDhikrMode(savedMode);
      }
    } catch {
      // ignore storage errors
    }

    if (typeof Notification === 'undefined') {
      setNotifPermission('unsupported');
    } else {
      setNotifPermission(Notification.permission);
    }
  }, []);

  // Restore saved preferences & listen for Settings updates
  useEffect(() => {
    const timer = setTimeout(() => {
      syncFromStorage();
    }, 0);
    const handler = () => syncFromStorage();
    window.addEventListener('noor-settings-updated', handler);
    return () => {
      clearTimeout(timer);
      window.removeEventListener('noor-settings-updated', handler);
    };
  }, [syncFromStorage]);

  const selectedMuadhin: MuadhinItem =
    MUADHINS_LIST.find((m) => m.id === selectedMuadhinId) || MUADHINS_LIST[0];

  const stopAdhanAudio = useCallback(() => {
    if (adhanAudioRef.current) {
      adhanAudioRef.current.pause();
      adhanAudioRef.current.currentTime = 0;
    }
    setPreviewingMuadhinId(null);
    setActiveAdhanPrayer(null);
  }, []);

  const playAdhanAudio = useCallback(
    (muadhin: MuadhinItem, prayerKey?: PrayerKey) => {
      stopAdhanAudio();
      setAudioNotice(null);

      if (!adhanAudioRef.current) {
        adhanAudioRef.current = new Audio();
      }
      const audio = adhanAudioRef.current;
      audio.src = muadhin.audioUrl;

      if (prayerKey) {
        setActiveAdhanPrayer(prayerKey);
      } else {
        setPreviewingMuadhinId(muadhin.id);
      }

      audio.onended = () => {
        setPreviewingMuadhinId(null);
        setActiveAdhanPrayer(null);
      };

      audio.onerror = () => {
        setPreviewingMuadhinId(null);
        setActiveAdhanPrayer(null);
        setAudioNotice('تعذر تشغيل ملف الأذان. تحقق من الاتصال بالإنترنت.');
      };

      audio.play().catch(() => {
        setPreviewingMuadhinId(null);
        setAudioNotice('اضغط زر التجربة لتفعيل الصوت في المتصفح.');
      });

      if ('mediaSession' in navigator) {
        navigator.mediaSession.metadata = new MediaMetadata({
          title: prayerKey
            ? `حان الآن موعد أذان ${PRAYER_LABELS_AR[prayerKey]}`
            : `أذان ${muadhin.name}`,
          artist: muadhin.name,
          album: 'نور الإسلام — المؤذن التلقائي',
          artwork: [{ src: '/pwa-192x192.png', sizes: '192x192', type: 'image/png' }],
        });
      }
    },
    [stopAdhanAudio]
  );

  // Trigger browser/PWA notification when Adhan or 10-min reminder fires
  const sendPrayerNotification = useCallback(
    (title: string, body: string, tag: string) => {
      if (typeof Notification === 'undefined' || Notification.permission !== 'granted') return;
      if ('serviceWorker' in navigator) {
        navigator.serviceWorker.ready
          .then((reg) => {
            reg.showNotification(title, {
              body,
              icon: '/pwa-192x192.png',
              badge: '/pwa-192x192.png',
              tag,
            });
          })
          .catch(() => {
            new Notification(title, { body, icon: '/pwa-192x192.png' });
          });
      } else {
        new Notification(title, { body, icon: '/pwa-192x192.png' });
      }
    },
    []
  );

  // Exact second watcher for Automatic Adhan & 10-minute Pre-Adhan reminder
  useEffect(() => {
    if ((!adhanEnabled && !adhanNotifEnabled && !preAdhanEnabled) || !timings) return;

    const interval = setInterval(() => {
      const now = new Date();
      const clock = getZonedClockParts(now, timezone);
      const hhmm = `${String(clock.hours24).padStart(2, '0')}:${String(clock.minutes).padStart(2, '0')}`;

      if (clock.seconds !== 0) return;

      for (const key of ADHAN_PRAYER_KEYS) {
        const target = cleanTimeString(timings[key]);
        if (target === hhmm) {
          const fireSignature = `${now.toDateString()}-${key}-${hhmm}`;
          if (lastFiredAdhanKeyRef.current !== fireSignature) {
            lastFiredAdhanKeyRef.current = fireSignature;
            try {
              localStorage.setItem('noor_last_adhan_sig', fireSignature);
            } catch {}
            if (adhanEnabled) {
              playAdhanAudio(selectedMuadhin, key);
            }
            if (adhanNotifEnabled) {
              sendPrayerNotification(
                `حان الآن موعد أذان ${PRAYER_LABELS_AR[key]}`,
                `يرفع الأذان بصوت ${selectedMuadhin.name}`,
                `adhan-${key}`
              );
            }
          }
        }

        if (preAdhanEnabled) {
          const preTarget = addMinutesToTime24(target, -10);
          if (preTarget === hhmm) {
            const preSig = `${now.toDateString()}-pre-${key}-${hhmm}`;
            if (lastFiredPreAdhanKeyRef.current !== preSig) {
              lastFiredPreAdhanKeyRef.current = preSig;
              try {
                localStorage.setItem('noor_last_preadhan_sig', preSig);
              } catch {}
              sendPrayerNotification(
                `اقترب موعد صلاة ${PRAYER_LABELS_AR[key]}`,
                'تبقى ١٠ دقائق على دخول وقت الصلاة — تهيأ للوضوء والذكر',
                `pre-adhan-${key}`
              );
            }
          }
        }
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [
    adhanEnabled,
    adhanNotifEnabled,
    preAdhanEnabled,
    timings,
    timezone,
    selectedMuadhin,
    playAdhanAudio,
    sendPrayerNotification,
  ]);

  // Dhikr human-voice player
  const stopDhikrAudio = useCallback(() => {
    if (dhikrAudioRef.current) {
      dhikrAudioRef.current.pause();
      dhikrAudioRef.current.currentTime = 0;
    }
    setPlayingDhikrClip(null);
  }, []);

  const playNextDhikrClip = useCallback(
    (specificClip?: DhikrAudioClip) => {
      stopDhikrAudio();
      setAudioNotice(null);

      const pool = dhikrMode === 'egyptian_dhikr' ? EGYPTIAN_DHIKR_CLIPS : SHEIKH_DHIKR_CLIPS;
      const clip = specificClip || pool[dhikrIndexRef.current % pool.length];
      if (!specificClip) {
        dhikrIndexRef.current = (dhikrIndexRef.current + 1) % pool.length;
      }

      if (!dhikrAudioRef.current) {
        dhikrAudioRef.current = new Audio();
      }
      const audio = dhikrAudioRef.current;
      audio.src = clip.audioUrl;
      setPlayingDhikrClip(clip);

      audio.onended = () => {
        setPlayingDhikrClip(null);
      };

      audio.onerror = () => {
        setPlayingDhikrClip(null);
        setAudioNotice('تعذر تشغيل مقطع الذكر الصوتي. تأكد من الاتصال بالإنترنت.');
      };

      audio.play().catch(() => {
        setPlayingDhikrClip(null);
        setAudioNotice('يرجى الضغط على "تشغيل الذكر الآن" لمنح المتصفح إذن الصوت.');
      });

      if ('mediaSession' in navigator) {
        navigator.mediaSession.metadata = new MediaMetadata({
          title: clip.label,
          artist: clip.speaker,
          album: 'منبه الأذكار — نور الإسلام',
          artwork: [{ src: '/pwa-192x192.png', sizes: '192x192', type: 'image/png' }],
        });
      }
    },
    [dhikrMode, stopDhikrAudio]
  );

  // Periodic Dhikr Countdown (1..5 mins)
  useEffect(() => {
    if (!dhikrEnabled) {
      return;
    }

    const timer = setInterval(() => {
      setDhikrSecondsLeft((prev) => {
        if (prev <= 1) {
          playNextDhikrClip();
          return dhikrIntervalMins * 60;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [dhikrEnabled, dhikrIntervalMins, playNextDhikrClip]);

  useEffect(() => {
    return () => {
      stopAdhanAudio();
      stopDhikrAudio();
    };
  }, [stopAdhanAudio, stopDhikrAudio]);

  const handleRequestNotifications = async () => {
    if (typeof Notification === 'undefined') return;
    const perm = await Notification.requestPermission();
    setNotifPermission(perm);
  };

  const formatMMSS = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  const activePool = dhikrMode === 'egyptian_dhikr' ? EGYPTIAN_DHIKR_CLIPS : SHEIKH_DHIKR_CLIPS;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      {/* Section A: Automatic Adhan & 11 Muadhins */}
      <section
        aria-label="نظام الأذان التلقائي والمؤذنون"
        className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-slate-50/75 dark:bg-slate-900/75 p-4 space-y-3"
      >
        <div className="flex items-start justify-between gap-2">
          <div>
            <h3 className="text-base font-extrabold flex items-center gap-2">
              <Volume2 className="h-5 w-5 text-amber-500 shrink-0" />
              <span>نظام الأذان التلقائي (١١ مؤذناً)</span>
            </h3>
            <p className="text-xs text-slate-600 dark:text-slate-300 mt-0.5">
              المؤذن المختار: <strong className="text-emerald-700 dark:text-emerald-400">{selectedMuadhin.name}</strong>
            </p>
          </div>

          <button
            type="button"
            onClick={() => {
              const next = !adhanEnabled;
              setAdhanEnabled(next);
              try {
                localStorage.setItem('noor_adhan_enabled', String(next));
              } catch {}
            }}
            className={`min-h-[40px] flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-bold transition-colors ${
              adhanEnabled
                ? 'bg-emerald-700 text-white'
                : 'bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
            }`}
          >
            {adhanEnabled ? <Bell className="h-4 w-4" /> : <BellOff className="h-4 w-4" />}
            <span>{adhanEnabled ? 'مُفعّل' : 'متوقف'}</span>
          </button>
        </div>

        {/* Active Adhan Alert Banner if firing now */}
        {activeAdhanPrayer && (
          <div className="flex items-center justify-between gap-2 rounded-2xl border border-amber-500 bg-amber-500/20 px-3 py-2.5">
            <span className="text-xs sm:text-sm font-extrabold">
              يُرفع الآن أذان {PRAYER_LABELS_AR[activeAdhanPrayer]} — {selectedMuadhin.name}
            </span>
            <button
              type="button"
              onClick={stopAdhanAudio}
              className="min-h-[36px] rounded-xl bg-rose-600 px-3 py-1 text-xs font-bold text-white"
            >
              إيقاف
            </button>
          </div>
        )}

        {/* Quick Select + Preview + Notification Controls */}
        <div className="space-y-2">
          <select
            value={selectedMuadhinId}
            onChange={(e) => {
              const id = e.target.value;
              setSelectedMuadhinId(id);
              try {
                localStorage.setItem('noor_muadhin_id', id);
              } catch {}
            }}
            aria-label="اختيار صوت المؤذن"
            className="min-h-[44px] w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2 text-xs sm:text-sm font-bold focus:outline-none focus:ring-2 focus:ring-amber-500"
          >
            {MUADHINS_LIST.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name} — {m.title}
              </option>
            ))}
          </select>

          <div className="grid grid-cols-3 gap-1.5">
            <button
              type="button"
              onClick={() =>
                previewingMuadhinId === selectedMuadhin.id
                  ? stopAdhanAudio()
                  : playAdhanAudio(selectedMuadhin)
              }
              className={`min-h-[44px] flex items-center justify-center gap-1 rounded-xl px-1.5 py-2 text-[10px] sm:text-xs font-bold leading-tight text-center break-words transition-colors ${
                previewingMuadhinId === selectedMuadhin.id
                  ? 'bg-rose-600 text-white'
                  : 'bg-amber-600 hover:bg-amber-500 text-white'
              }`}
            >
              {previewingMuadhinId === selectedMuadhin.id ? (
                <>
                  <Square className="h-3.5 w-3.5 shrink-0 fill-current" />
                  <span>إيقاف الأذان</span>
                </>
              ) : (
                <>
                  <Play className="h-3.5 w-3.5 shrink-0 fill-current" />
                  <span>تجربة صوت الأذان</span>
                </>
              )}
            </button>

            <button
              type="button"
              onClick={() => setShowAllMuadhins((v) => !v)}
              className="min-h-[44px] flex items-center justify-center gap-1 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-1.5 py-2 text-[10px] sm:text-xs font-bold leading-tight text-center break-words"
            >
              {showAllMuadhins ? (
                <ChevronUp className="h-3.5 w-3.5 shrink-0" />
              ) : (
                <ChevronDown className="h-3.5 w-3.5 shrink-0" />
              )}
              <span>قائمة الـ ١١ مؤذناً</span>
            </button>

            <button
              type="button"
              onClick={handleRequestNotifications}
              className="min-h-[44px] flex items-center justify-center gap-1 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-1.5 py-2 text-[10px] sm:text-xs font-bold leading-tight text-center break-words"
            >
              <Bell className="h-3.5 w-3.5 shrink-0 text-emerald-500" />
              <span>
                {notifPermission === 'granted' ? 'الإشعارات مفعّلة' : 'تفعيل إشعار الأذان'}
              </span>
            </button>
          </div>
        </div>

        {/* Full 11 Muadhins List with individual Play/Test & Select buttons */}
        {showAllMuadhins && (
          <div className="max-h-72 overflow-y-auto space-y-1.5 pt-1 pl-1">
            {MUADHINS_LIST.map((m) => {
              const isSelected = m.id === selectedMuadhinId;
              const isPreviewing = previewingMuadhinId === m.id;
              return (
                <div
                  key={m.id}
                  className={`flex items-center justify-between gap-2 rounded-xl border px-3 py-2 ${
                    isSelected
                      ? 'border-emerald-500 bg-emerald-500/10'
                      : 'border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-slate-950/60'
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedMuadhinId(m.id);
                      try {
                        localStorage.setItem('noor_muadhin_id', m.id);
                      } catch {}
                    }}
                    className="flex items-center gap-2 min-w-0 flex-1 text-right"
                  >
                    <span
                      className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full border ${
                        isSelected
                          ? 'border-emerald-500 bg-emerald-600 text-white'
                          : 'border-slate-300 dark:border-slate-700'
                      }`}
                    >
                      {isSelected && <Check className="h-3.5 w-3.5" />}
                    </span>
                    <div className="min-w-0">
                      <p className="text-xs font-bold truncate">{m.name}</p>
                      <p className="text-[10px] text-slate-500 dark:text-slate-400 truncate">
                        {m.title}
                      </p>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => (isPreviewing ? stopAdhanAudio() : playAdhanAudio(m))}
                    className={`min-h-[36px] shrink-0 flex items-center gap-1 rounded-lg px-2.5 py-1 text-[11px] font-bold transition-colors ${
                      isPreviewing
                        ? 'bg-rose-600 text-white'
                        : 'bg-amber-600 hover:bg-amber-500 text-white'
                    }`}
                  >
                    {isPreviewing ? (
                      <>
                        <Square className="h-3 w-3 fill-current" />
                        <span>إيقاف</span>
                      </>
                    ) : (
                      <>
                        <Play className="h-3 w-3 fill-current" />
                        <span>تجربة</span>
                      </>
                    )}
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* Section B: Periodic Human-Voice Dhikr Reminder (1 to 5 Minutes) */}
      <section
        aria-label="منبه الأذكار الصوتية الدورية"
        className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-slate-50/75 dark:bg-slate-900/75 p-4 space-y-3"
      >
        <div className="flex items-start justify-between gap-2">
          <div>
            <h3 className="text-base font-extrabold flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-emerald-500 shrink-0" />
              <span>منبه الأذكار الصوتية الدورية</span>
            </h3>
            <p className="text-xs text-slate-600 dark:text-slate-300 mt-0.5">
              مقاطع بشرية حقيقية مسجلة (بدون أي صوت آلي روبوتي)
            </p>
          </div>

          <button
            type="button"
            onClick={() => {
              setDhikrSecondsLeft(dhikrIntervalMins * 60);
              setDhikrEnabled((v) => {
                const next = !v;
                try {
                  localStorage.setItem('noor_dhikr_enabled', String(next));
                } catch {}
                return next;
              });
            }}
            className={`min-h-[40px] flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-bold transition-colors ${
              dhikrEnabled
                ? 'bg-emerald-700 text-white'
                : 'bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
            }`}
          >
            <Clock className="h-4 w-4" />
            <span>{dhikrEnabled ? `بعد ${formatMMSS(dhikrSecondsLeft)}` : 'تفعيل المنبه'}</span>
          </button>
        </div>

        {/* Voice Mode Switcher: Egyptian Dhikr vs Egyptian Sheikhs */}
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => {
              stopDhikrAudio();
              setDhikrMode('egyptian_dhikr');
              try {
                localStorage.setItem('noor_dhikr_mode', 'egyptian_dhikr');
              } catch {}
            }}
            className={`min-h-[44px] rounded-xl px-2 py-2 text-[11px] sm:text-xs font-bold leading-tight text-center transition-colors ${
              dhikrMode === 'egyptian_dhikr'
                ? 'bg-emerald-700 text-white shadow-sm'
                : 'border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800'
            }`}
          >
            الأذكار بالعامية المصرية المسموعة
          </button>

          <button
            type="button"
            onClick={() => {
              stopDhikrAudio();
              setDhikrMode('sheikh');
              try {
                localStorage.setItem('noor_dhikr_mode', 'sheikh');
              } catch {}
            }}
            className={`min-h-[44px] rounded-xl px-2 py-2 text-[11px] sm:text-xs font-bold leading-tight text-center transition-colors ${
              dhikrMode === 'sheikh'
                ? 'bg-emerald-700 text-white shadow-sm'
                : 'border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800'
            }`}
          >
            صوت الشيوخ (الشعراوي وطوبار والنقشبندي)
          </button>
        </div>

        {/* Interval Buttons: 1-4 mins in Row 1 (4 buttons), 5 mins + Play Now in Row 2 */}
        <div className="space-y-1.5">
          <div className="grid grid-cols-4 gap-1.5">
            {[1, 2, 3, 4].map((mins) => (
              <button
                key={mins}
                type="button"
                onClick={() => {
                  setDhikrIntervalMins(mins);
                  setDhikrSecondsLeft(mins * 60);
                  try {
                    localStorage.setItem('noor_dhikr_interval', String(mins));
                  } catch {}
                }}
                className={`min-h-[42px] rounded-xl px-1 py-2 text-[10px] sm:text-xs font-bold leading-tight text-center break-words transition-colors ${
                  dhikrIntervalMins === mins
                    ? 'bg-amber-600 text-white shadow-sm'
                    : 'border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800'
                }`}
              >
                كل {mins} {mins === 1 ? 'دقيقة' : 'دقائق'}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-2 gap-1.5">
            <button
              type="button"
              onClick={() => {
                setDhikrIntervalMins(5);
                setDhikrSecondsLeft(5 * 60);
                try {
                  localStorage.setItem('noor_dhikr_interval', '5');
                } catch {}
              }}
              className={`min-h-[42px] rounded-xl px-2 py-2 text-xs font-bold text-center transition-colors ${
                dhikrIntervalMins === 5
                  ? 'bg-amber-600 text-white shadow-sm'
                  : 'border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800'
              }`}
            >
              كل 5 دقائق
            </button>

            <button
              type="button"
              onClick={() => (playingDhikrClip ? stopDhikrAudio() : playNextDhikrClip())}
              className={`min-h-[42px] flex items-center justify-center gap-1.5 rounded-xl px-2 py-2 text-xs font-bold transition-colors ${
                playingDhikrClip
                  ? 'bg-rose-600 text-white'
                  : 'bg-emerald-700 hover:bg-emerald-600 text-white'
              }`}
            >
              {playingDhikrClip ? (
                <>
                  <Square className="h-3.5 w-3.5 fill-current" />
                  <span>إيقاف الذكر</span>
                </>
              ) : (
                <>
                  <Play className="h-3.5 w-3.5 fill-current" />
                  <span>تشغيل الذكر الآن</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Active / Clickable Clips Preview List */}
        <div className="space-y-1.5 pt-1">
          {activePool.map((clip) => {
            const isPlaying = playingDhikrClip?.id === clip.id;
            return (
              <button
                key={clip.id}
                type="button"
                onClick={() => (isPlaying ? stopDhikrAudio() : playNextDhikrClip(clip))}
                className={`flex w-full items-center justify-between gap-2 rounded-xl border px-3 py-2 text-right transition-colors ${
                  isPlaying
                    ? 'border-emerald-500 bg-emerald-500/15'
                    : 'border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-slate-950/60 hover:border-amber-500/40'
                }`}
              >
                <span className="block min-w-0 flex-1">
                  <span className="block text-xs font-bold truncate">{clip.label}</span>
                  <span className="block text-[11px] text-slate-600 dark:text-slate-300 truncate">
                    {clip.egyptianPrompt}
                  </span>
                </span>
                <span
                  className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-white ${
                    isPlaying ? 'bg-rose-600' : 'bg-emerald-700'
                  }`}
                >
                  {isPlaying ? (
                    <Square className="h-3.5 w-3.5 fill-current" />
                  ) : (
                    <Play className="h-3.5 w-3.5 fill-current" />
                  )}
                </span>
              </button>
            );
          })}
        </div>

        {audioNotice && (
          <p className="text-xs font-semibold text-amber-700 dark:text-amber-300">{audioNotice}</p>
        )}
      </section>
    </div>
  );
}
