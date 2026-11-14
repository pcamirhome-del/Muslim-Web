'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Bell,
  BellOff,
  Play,
  Square,
  Volume2,
  VolumeX,
  Clock,
  Sparkles,
  Check,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import {
  DEFAULT_DHIKR_SCHEDULES,
  DEFAULT_SELECTED_DHIKR_IDS,
  DhikrAudioClip,
  DhikrScheduleMap,
  DhikrScheduleTiming,
  DhikrVoiceMode,
  EGYPTIAN_DHIKR_CLIPS,
  MUADHINS_LIST,
  MuadhinItem,
  SHEIKH_DHIKR_CLIPS,
  formatTime24To12Ar,
  getSilentKeepAliveWavDataUri,
  parseDhikrSchedules,
  parseSelectedDhikrIds,
} from '@/lib/data/audio-library';
import { DhikrTimeModal } from '@/components/DhikrTimeModal';
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
  const [adhanMuted, setAdhanMuted] = useState<boolean>(false);
  const [adhanNotifEnabled, setAdhanNotifEnabled] = useState<boolean>(true);
  const [preAdhanEnabled, setPreAdhanEnabled] = useState<boolean>(true);
  const [selectedMuadhinId, setSelectedMuadhinId] = useState<string>('tobar');
  const [previewingMuadhinId, setPreviewingMuadhinId] = useState<string | null>(null);
  const [showAllMuadhins, setShowAllMuadhins] = useState<boolean>(false);
  const [activeAdhanPrayer, setActiveAdhanPrayer] = useState<PrayerKey | null>(null);
  const [notifPermission, setNotifPermission] = useState<NotificationPermission | 'unsupported'>(
    'default'
  );

  // Dhikr reminder state (1 to 5 minutes, or disabled when no time is active)
  const [dhikrEnabled, setDhikrEnabled] = useState<boolean>(false);
  const [dhikrIntervalMins, setDhikrIntervalMins] = useState<number>(3);
  const [dhikrMode, setDhikrMode] = useState<DhikrVoiceMode>('egyptian_dhikr');
  const [selectedDhikrIds, setSelectedDhikrIds] = useState<string[]>(DEFAULT_SELECTED_DHIKR_IDS);
  const [dhikrSchedules, setDhikrSchedules] = useState<DhikrScheduleMap>(DEFAULT_DHIKR_SCHEDULES);
  const [timeModalClip, setTimeModalClip] = useState<DhikrAudioClip | null>(null);
  const [dhikrSecondsLeft, setDhikrSecondsLeft] = useState<number>(180);
  const [playingDhikrClip, setPlayingDhikrClip] = useState<DhikrAudioClip | null>(null);
  const [audioNotice, setAudioNotice] = useState<string | null>(null);

  const adhanAudioRef = useRef<HTMLAudioElement | null>(null);
  const dhikrAudioRef = useRef<HTMLAudioElement | null>(null);
  const silentKeepAliveAudioRef = useRef<HTMLAudioElement | null>(null);
  const isKeepAliveHijackedRef = useRef<boolean>(false);
  const activeHijackOwnerRef = useRef<'adhan' | 'dhikr' | null>(null);
  const workerRef = useRef<Worker | null>(null);

  const lastFiredAdhanKeyRef = useRef<string>('');
  const lastFiredPreAdhanKeyRef = useRef<string>('');
  const firedScheduledDhikrSigsRef = useRef<Set<string>>(new Set());
  const dhikrIndexRef = useRef<number>(0);
  const nextDhikrAtMsRef = useRef<number>(0);

  const selectedMuadhin: MuadhinItem =
    MUADHINS_LIST.find((m) => m.id === selectedMuadhinId) || MUADHINS_LIST[0];

  // Keep latest state in a ref so Worker / Service Worker / Silent Audio callbacks always read fresh values
  const liveStateRef = useRef({
    timings,
    timezone,
    adhanEnabled,
    adhanMuted,
    adhanNotifEnabled,
    preAdhanEnabled,
    dhikrEnabled,
    dhikrIntervalMins,
    dhikrMode,
    selectedDhikrIds,
    dhikrSchedules,
    selectedMuadhin,
  });

  useEffect(() => {
    liveStateRef.current = {
      timings,
      timezone,
      adhanEnabled,
      adhanMuted,
      adhanNotifEnabled,
      preAdhanEnabled,
      dhikrEnabled,
      dhikrIntervalMins,
      dhikrMode,
      selectedDhikrIds,
      dhikrSchedules,
      selectedMuadhin,
    };
  }, [
    timings,
    timezone,
    adhanEnabled,
    adhanMuted,
    adhanNotifEnabled,
    preAdhanEnabled,
    dhikrEnabled,
    dhikrIntervalMins,
    dhikrMode,
    selectedDhikrIds,
    dhikrSchedules,
    selectedMuadhin,
  ]);

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
      const savedAdhanMuted = localStorage.getItem('noor_adhan_muted');
      if (savedAdhanMuted !== null) {
        setAdhanMuted(savedAdhanMuted === 'true');
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
        const isOn = savedDhikrEnabled === 'true';
        setDhikrEnabled(isOn);
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
      setSelectedDhikrIds(parseSelectedDhikrIds(localStorage.getItem('noor_selected_dhikrs')));
      setDhikrSchedules(parseDhikrSchedules(localStorage.getItem('noor_dhikr_schedules')));
      const savedLastAdhan = localStorage.getItem('noor_last_adhan_sig');
      if (savedLastAdhan) {
        lastFiredAdhanKeyRef.current = savedLastAdhan;
      }
      const savedLastPreAdhan = localStorage.getItem('noor_last_preadhan_sig');
      if (savedLastPreAdhan) {
        lastFiredPreAdhanKeyRef.current = savedLastPreAdhan;
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

  // Update MediaSession metadata for background Keep-Alive when idle
  const refreshKeepAliveMediaSession = useCallback(() => {
    if (typeof navigator === 'undefined' || !('mediaSession' in navigator)) return;
    // Do not overwrite if Adhan or Dhikr is actively speaking right now
    if (
      (adhanAudioRef.current && !adhanAudioRef.current.paused) ||
      (dhikrAudioRef.current && !dhikrAudioRef.current.paused)
    ) {
      return;
    }

    try {
      const st = liveStateRef.current;
      navigator.mediaSession.metadata = new MediaMetadata({
        title: st.dhikrEnabled
          ? `منبه الأذكار والمؤذن التلقائي (كل ${st.dhikrIntervalMins} د)`
          : `المؤذن التلقائي — ${st.selectedMuadhin.name}`,
        artist: st.selectedMuadhin.name,
        album: 'نور الإسلام — يعمل في الخلفية',
        artwork: [{ src: '/pwa-192x192.png', sizes: '192x192', type: 'image/png' }],
      });
      navigator.mediaSession.playbackState = 'playing';
    } catch {
      // ignore
    }
  }, []);

  // Start or stop Silent Audio Loop Workaround to prevent iOS/Android background throttling
  const ensureSilentKeepAliveLoop = useCallback(() => {
    if (typeof window === 'undefined') return;
    const hasScheduledDhikr =
      liveStateRef.current.selectedDhikrIds.some((id) => {
        const sched = liveStateRef.current.dhikrSchedules[id];
        return sched && sched.timing !== 'periodic' && sched.timing !== 'off';
      }) ||
      SHEIKH_DHIKR_CLIPS.some((c) => {
        const sched = liveStateRef.current.dhikrSchedules[c.id];
        return sched && sched.timing !== 'periodic' && sched.timing !== 'off';
      });
    const shouldKeepAlive =
      liveStateRef.current.adhanEnabled ||
      liveStateRef.current.preAdhanEnabled ||
      liveStateRef.current.dhikrEnabled ||
      hasScheduledDhikr;

    if (!shouldKeepAlive) {
      if (silentKeepAliveAudioRef.current && !isKeepAliveHijackedRef.current) {
        silentKeepAliveAudioRef.current.pause();
      }
      return;
    }

    if (!silentKeepAliveAudioRef.current) {
      const silentAudio = new Audio(getSilentKeepAliveWavDataUri());
      silentAudio.loop = true;
      silentAudio.volume = 0.01;
      silentAudio.preload = 'auto';
      silentAudio.setAttribute('playsinline', 'true');
      silentKeepAliveAudioRef.current = silentAudio;
    }

    // Do not interrupt active Adhan or Dhikr playing through the keep-alive channel
    if (isKeepAliveHijackedRef.current) return;

    const audio = silentKeepAliveAudioRef.current;
    audio.loop = true;
    audio.volume = 0.01;

    if (audio.paused) {
      audio
        .play()
        .then(() => {
          refreshKeepAliveMediaSession();
        })
        .catch(() => {
          // Will be unlocked automatically on user tap/click listener
        });
    }
  }, [refreshKeepAliveMediaSession]);

  const restoreSilentKeepAlive = useCallback(() => {
    const silent = silentKeepAliveAudioRef.current;
    isKeepAliveHijackedRef.current = false;
    activeHijackOwnerRef.current = null;
    if (!silent) return;
    silent.onended = null;
    silent.onerror = null;
    silent.pause();
    silent.src = getSilentKeepAliveWavDataUri();
    silent.loop = true;
    silent.volume = 0.01;
    ensureSilentKeepAliveLoop();
  }, [ensureSilentKeepAliveLoop]);

  // Pre-unlock secondary <audio> elements synchronously during user gesture so background playback is never blocked
  const unlockAllAudioChannels = useCallback(() => {
    ensureSilentKeepAliveLoop();

    const unlockEl = (ref: React.MutableRefObject<HTMLAudioElement | null>) => {
      if (!ref.current) {
        const el = new Audio();
        el.preload = 'auto';
        el.setAttribute('playsinline', 'true');
        ref.current = el;
      }
      const el = ref.current;
      if (el.dataset.unlocked === '1') return;
      if (!el.paused && el.src && !el.src.startsWith('data:audio/wav')) return;
      el.src = getSilentKeepAliveWavDataUri();
      el.volume = 0.001;
      el.play()
        .then(() => {
          el.pause();
          el.currentTime = 0;
          el.volume = 1.0;
          el.removeAttribute('src');
          el.dataset.unlocked = '1';
        })
        .catch(() => {});
    };

    unlockEl(adhanAudioRef);
    unlockEl(dhikrAudioRef);
  }, [ensureSilentKeepAliveLoop]);

  const stopAdhanAudio = useCallback(() => {
    if (adhanAudioRef.current) {
      adhanAudioRef.current.pause();
      adhanAudioRef.current.currentTime = 0;
    }
    if (isKeepAliveHijackedRef.current && activeHijackOwnerRef.current === 'adhan') {
      restoreSilentKeepAlive();
    }
    setPreviewingMuadhinId(null);
    setActiveAdhanPrayer(null);
    refreshKeepAliveMediaSession();
  }, [refreshKeepAliveMediaSession, restoreSilentKeepAlive]);

  const playAdhanAudio = useCallback(
    (muadhin: MuadhinItem, prayerKey?: PrayerKey) => {
      stopAdhanAudio();
      setAudioNotice(null);
      ensureSilentKeepAliveLoop();

      if (prayerKey) {
        setActiveAdhanPrayer(prayerKey);
      } else {
        setPreviewingMuadhinId(muadhin.id);
      }

      if ('mediaSession' in navigator) {
        try {
          navigator.mediaSession.metadata = new MediaMetadata({
            title: prayerKey
              ? `حان الآن موعد أذان ${PRAYER_LABELS_AR[prayerKey]}`
              : `أذان ${muadhin.name}`,
            artist: muadhin.name,
            album: 'نور الإسلام — المؤذن التلقائي',
            artwork: [{ src: '/pwa-192x192.png', sizes: '192x192', type: 'image/png' }],
          });
          navigator.mediaSession.playbackState = 'playing';
        } catch {
          // ignore
        }
      }

      const playViaKeepAliveChannel = () => {
        const silent = silentKeepAliveAudioRef.current;
        if (!silent) return false;
        isKeepAliveHijackedRef.current = true;
        activeHijackOwnerRef.current = 'adhan';
        silent.pause();
        silent.loop = false;
        silent.volume = 1.0;
        silent.src = muadhin.audioUrl;
        silent.onended = () => {
          setPreviewingMuadhinId(null);
          setActiveAdhanPrayer(null);
          restoreSilentKeepAlive();
          refreshKeepAliveMediaSession();
        };
        silent.onerror = () => {
          setPreviewingMuadhinId(null);
          setActiveAdhanPrayer(null);
          restoreSilentKeepAlive();
          refreshKeepAliveMediaSession();
        };
        silent.play().catch(() => {
          setPreviewingMuadhinId(null);
          setActiveAdhanPrayer(null);
          restoreSilentKeepAlive();
          setAudioNotice('اضغط زر التجربة لتفعيل الصوت في المتصفح.');
        });
        return true;
      };

      // When backgrounded/locked on mobile OS, hijack the already-active MediaSession keep-alive element
      if (typeof document !== 'undefined' && document.hidden && silentKeepAliveAudioRef.current) {
        if (playViaKeepAliveChannel()) return;
      }

      if (!adhanAudioRef.current) {
        adhanAudioRef.current = new Audio();
        adhanAudioRef.current.preload = 'auto';
        adhanAudioRef.current.setAttribute('playsinline', 'true');
      }
      const audio = adhanAudioRef.current;
      audio.src = muadhin.audioUrl;
      audio.volume = 1.0;

      audio.onended = () => {
        setPreviewingMuadhinId(null);
        setActiveAdhanPrayer(null);
        refreshKeepAliveMediaSession();
      };

      audio.onerror = () => {
        setPreviewingMuadhinId(null);
        setActiveAdhanPrayer(null);
        setAudioNotice('تعذر تشغيل ملف الأذان. تحقق من الاتصال بالإنترنت.');
        refreshKeepAliveMediaSession();
      };

      audio.play().catch(() => {
        if (!playViaKeepAliveChannel()) {
          setPreviewingMuadhinId(null);
          setAudioNotice('اضغط زر التجربة لتفعيل الصوت في المتصفح.');
        }
      });
    },
    [ensureSilentKeepAliveLoop, refreshKeepAliveMediaSession, restoreSilentKeepAlive, stopAdhanAudio]
  );

  // Trigger Service Worker notification (showNotification) when Adhan or 10-min reminder fires
  const sendPrayerNotification = useCallback(
    (title: string, body: string, tag: string, signature?: string) => {
      if (typeof Notification === 'undefined' || Notification.permission !== 'granted') return;
      if ('serviceWorker' in navigator) {
        navigator.serviceWorker.ready
          .then((reg) => {
            if (reg.active) {
              reg.active.postMessage({
                type: 'SHOW_NOTIFICATION',
                payload: { title, body, tag, signature },
              });
            } else {
              reg.showNotification(title, {
                body,
                icon: '/pwa-192x192.png',
                badge: '/pwa-192x192.png',
                tag,
              });
            }
          })
          .catch(() => {
            try {
              new Notification(title, { body, icon: '/pwa-192x192.png', tag });
            } catch {}
          });
      } else {
        try {
          new Notification(title, { body, icon: '/pwa-192x192.png', tag });
        } catch {}
      }
    },
    []
  );

  // Dhikr human-voice player
  const stopDhikrAudio = useCallback(() => {
    if (dhikrAudioRef.current) {
      dhikrAudioRef.current.pause();
      dhikrAudioRef.current.currentTime = 0;
    }
    if (isKeepAliveHijackedRef.current && activeHijackOwnerRef.current === 'dhikr') {
      restoreSilentKeepAlive();
    }
    setPlayingDhikrClip(null);
    refreshKeepAliveMediaSession();
  }, [refreshKeepAliveMediaSession, restoreSilentKeepAlive]);

  const playNextDhikrClip = useCallback(
    (specificClip?: DhikrAudioClip, fromPeriodicTimer = false) => {
      const currentMode = liveStateRef.current.dhikrMode;
      const basePool = currentMode === 'egyptian_dhikr' ? EGYPTIAN_DHIKR_CLIPS : SHEIKH_DHIKR_CLIPS;
      const selectedIds = liveStateRef.current.selectedDhikrIds;
      const schedules = liveStateRef.current.dhikrSchedules;

      const selectedPool =
        currentMode === 'egyptian_dhikr'
          ? basePool.filter((c) => selectedIds.includes(c.id))
          : basePool;
      const periodicPool = selectedPool.filter(
        (c) => (schedules[c.id]?.timing || 'periodic') === 'periodic'
      );

      if (!specificClip && fromPeriodicTimer && periodicPool.length === 0) {
        return;
      }

      const activeNonOffPool = selectedPool.filter(
        (c) => (schedules[c.id]?.timing || 'periodic') !== 'off'
      );

      const pool =
        periodicPool.length > 0
          ? periodicPool
          : activeNonOffPool.length > 0
            ? activeNonOffPool
            : selectedPool.length > 0
              ? selectedPool
              : basePool;

      stopDhikrAudio();
      setAudioNotice(null);
      ensureSilentKeepAliveLoop();

      const clip = specificClip || pool[dhikrIndexRef.current % pool.length];
      if (!specificClip) {
        dhikrIndexRef.current = (dhikrIndexRef.current + 1) % pool.length;
      }

      setPlayingDhikrClip(clip);

      if ('mediaSession' in navigator) {
        try {
          navigator.mediaSession.metadata = new MediaMetadata({
            title: clip.label,
            artist: clip.speaker,
            album: 'منبه الأذكار — نور الإسلام',
            artwork: [{ src: '/pwa-192x192.png', sizes: '192x192', type: 'image/png' }],
          });
          navigator.mediaSession.playbackState = 'playing';
        } catch {
          // ignore
        }
      }

      const playViaKeepAliveChannel = () => {
        const silent = silentKeepAliveAudioRef.current;
        if (!silent) return false;
        isKeepAliveHijackedRef.current = true;
        activeHijackOwnerRef.current = 'dhikr';
        silent.pause();
        silent.loop = false;
        silent.volume = 1.0;
        silent.src = clip.audioUrl;
        silent.onended = () => {
          setPlayingDhikrClip(null);
          restoreSilentKeepAlive();
          refreshKeepAliveMediaSession();
        };
        silent.onerror = () => {
          setPlayingDhikrClip(null);
          restoreSilentKeepAlive();
          refreshKeepAliveMediaSession();
        };
        silent.play().catch(() => {
          setPlayingDhikrClip(null);
          restoreSilentKeepAlive();
          setAudioNotice('يرجى الضغط على "تشغيل الذكر الآن" لمنح المتصفح إذن الصوت.');
        });
        return true;
      };

      // When backgrounded/locked on mobile OS, hijack the already-active MediaSession keep-alive element
      if (typeof document !== 'undefined' && document.hidden && silentKeepAliveAudioRef.current) {
        if (playViaKeepAliveChannel()) return;
      }

      if (!dhikrAudioRef.current) {
        dhikrAudioRef.current = new Audio();
        dhikrAudioRef.current.preload = 'auto';
        dhikrAudioRef.current.setAttribute('playsinline', 'true');
      }
      const audio = dhikrAudioRef.current;
      audio.src = clip.audioUrl;
      audio.volume = 1.0;

      audio.onended = () => {
        setPlayingDhikrClip(null);
        refreshKeepAliveMediaSession();
      };

      audio.onerror = () => {
        setPlayingDhikrClip(null);
        setAudioNotice('تعذر تشغيل مقطع الذكر الصوتي. تأكد من الاتصال بالإنترنت.');
        refreshKeepAliveMediaSession();
      };

      audio.play().catch(() => {
        if (!playViaKeepAliveChannel()) {
          setPlayingDhikrClip(null);
          setAudioNotice('يرجى الضغط على "تشغيل الذكر الآن" لمنح المتصفح إذن الصوت.');
        }
      });
    },
    [ensureSilentKeepAliveLoop, refreshKeepAliveMediaSession, restoreSilentKeepAlive, stopDhikrAudio]
  );

  // Unified handler for Adhan due event (from Web Worker, Service Worker, or Silent Audio clock)
  const triggerAdhanForPrayer = useCallback(
    (prayerKey: PrayerKey, signature: string) => {
      if (lastFiredAdhanKeyRef.current === signature) return;
      lastFiredAdhanKeyRef.current = signature;
      try {
        localStorage.setItem('noor_last_adhan_sig', signature);
      } catch {}

      const st = liveStateRef.current;
      if (st.adhanEnabled && !st.adhanMuted) {
        playAdhanAudio(st.selectedMuadhin, prayerKey);
      } else if (st.adhanEnabled && st.adhanMuted) {
        setActiveAdhanPrayer(prayerKey);
      }
      if (st.adhanNotifEnabled) {
        sendPrayerNotification(
          `حان الآن موعد أذان ${PRAYER_LABELS_AR[prayerKey]}`,
          st.adhanMuted
            ? `الأذان في وضع الصامت — ${st.selectedMuadhin.name}`
            : `يرفع الأذان بصوت ${st.selectedMuadhin.name}`,
          `adhan-${prayerKey}`,
          signature
        );
      }
    },
    [playAdhanAudio, sendPrayerNotification]
  );

  // Unified handler for 10-minute Pre-Adhan reminder event
  const triggerPreAdhanForPrayer = useCallback(
    (prayerKey: PrayerKey, signature: string) => {
      if (lastFiredPreAdhanKeyRef.current === signature) return;
      lastFiredPreAdhanKeyRef.current = signature;
      try {
        localStorage.setItem('noor_last_preadhan_sig', signature);
      } catch {}

      if (liveStateRef.current.preAdhanEnabled) {
        sendPrayerNotification(
          `اقترب موعد صلاة ${PRAYER_LABELS_AR[prayerKey]}`,
          'تبقى ١٠ دقائق على دخول وقت الصلاة — تهيأ للوضوء والذكر',
          `pre-adhan-${prayerKey}`,
          signature
        );
      }
    },
    [sendPrayerNotification]
  );

  // Wall-clock evaluator invoked by Web Worker ticks AND Silent Audio timeupdate events
  const evaluateWallClock = useCallback(
    (nowMs: number) => {
      const st = liveStateRef.current;
      const now = new Date(nowMs);
      const clock = getZonedClockParts(now, st.timezone);
      const hhmm = `${String(clock.hours24).padStart(2, '0')}:${String(clock.minutes).padStart(2, '0')}`;
      let datePrefix = now.toISOString().slice(0, 10);
      try {
        datePrefix = new Intl.DateTimeFormat('en-CA', {
          timeZone: st.timezone || 'Africa/Cairo',
          year: 'numeric',
          month: '2-digit',
          day: '2-digit',
        }).format(now);
      } catch {}

      // 1. Check Adhan & 10-Minute Pre-Adhan
      if (st.timings && (st.adhanEnabled || st.adhanNotifEnabled || st.preAdhanEnabled)) {
        for (const key of ADHAN_PRAYER_KEYS) {
          const target = cleanTimeString(st.timings[key]);
          if (!target) continue;

          if ((st.adhanEnabled || st.adhanNotifEnabled) && target === hhmm) {
            const sig = `${datePrefix}-${key}-${hhmm}`;
            triggerAdhanForPrayer(key, sig);
          }

          if (st.preAdhanEnabled) {
            const preTarget = addMinutesToTime24(target, -10);
            if (preTarget === hhmm) {
              const preSig = `${datePrefix}-pre-${key}-${hhmm}`;
              triggerPreAdhanForPrayer(key, preSig);
            }
          }
        }
      }

      // 2. Check Scheduled Dhikr Clips (before_prayer, after_prayer, custom_time)
      const isAdhanPlayingNow = Boolean(adhanAudioRef.current && !adhanAudioRef.current.paused);
      if (!isAdhanPlayingNow) {
        const allDhikrClips = [...EGYPTIAN_DHIKR_CLIPS, ...SHEIKH_DHIKR_CLIPS];
        for (const clip of allDhikrClips) {
          const isEgyptian = EGYPTIAN_DHIKR_CLIPS.some((c) => c.id === clip.id);
          if (isEgyptian && !st.selectedDhikrIds.includes(clip.id)) continue;
          const sched = st.dhikrSchedules[clip.id];
          if (!sched || sched.timing === 'periodic' || sched.timing === 'off') continue;

          let matchedSig: string | null = null;
          if (sched.timing === 'custom_time' && sched.customTime === hhmm) {
            matchedSig = `${datePrefix}-dhikr-custom-${clip.id}-${hhmm}`;
          } else if (st.timings && (sched.timing === 'before_prayer' || sched.timing === 'after_prayer')) {
            const offset = sched.timing === 'before_prayer' ? -10 : 10;
            for (const key of ADHAN_PRAYER_KEYS) {
              const target = cleanTimeString(st.timings[key]);
              if (target && addMinutesToTime24(target, offset) === hhmm) {
                matchedSig = `${datePrefix}-dhikr-${sched.timing}-${key}-${clip.id}-${hhmm}`;
                break;
              }
            }
          }

          if (matchedSig && !firedScheduledDhikrSigsRef.current.has(matchedSig)) {
            if (firedScheduledDhikrSigsRef.current.size > 100) {
              firedScheduledDhikrSigsRef.current.clear();
            }
            firedScheduledDhikrSigsRef.current.add(matchedSig);
            playNextDhikrClip(clip);
            sendPrayerNotification(
              `تذكير: ${clip.label}`,
              clip.egyptianPrompt,
              `dhikr-${clip.id}`,
              matchedSig
            );
            break;
          }
        }
      }

      // 3. Check Periodic Dhikr via exact wall-clock timestamp
      if (st.dhikrEnabled) {
        const intervalMs = Math.max(1, st.dhikrIntervalMins) * 60 * 1000;
        if (!nextDhikrAtMsRef.current || nextDhikrAtMsRef.current < nowMs - intervalMs * 2) {
          nextDhikrAtMsRef.current = nowMs + intervalMs;
        }
        if (nowMs >= nextDhikrAtMsRef.current) {
          nextDhikrAtMsRef.current = nowMs + intervalMs;
          playNextDhikrClip(undefined, true);
        }
        const secsLeft = Math.max(1, Math.ceil((nextDhikrAtMsRef.current - nowMs) / 1000));
        setDhikrSecondsLeft(secsLeft);
      }
    },
    [playNextDhikrClip, sendPrayerNotification, triggerAdhanForPrayer, triggerPreAdhanForPrayer]
  );

  // Initialize Background Web Worker, Service Worker listener, Silent Audio Keep-Alive & MediaSession handlers
  useEffect(() => {
    if (typeof window === 'undefined') return;

    // 1. Create dedicated Web Worker
    let worker: Worker | null = null;
    try {
      worker = new Worker('/workers/background-timer-worker.js');
      workerRef.current = worker;

      worker.onmessage = (event) => {
        const data = event.data || {};
        if (data.type === 'WORKER_ADHAN_DUE' && data.prayerKey) {
          triggerAdhanForPrayer(data.prayerKey as PrayerKey, data.signature);
        } else if (data.type === 'WORKER_PRE_ADHAN_DUE' && data.prayerKey) {
          triggerPreAdhanForPrayer(data.prayerKey as PrayerKey, data.signature);
        } else if (data.type === 'WORKER_DHIKR_DUE') {
          if (typeof data.nextDhikrAtMs === 'number') {
            nextDhikrAtMsRef.current = data.nextDhikrAtMs;
          }
          playNextDhikrClip(undefined, true);
        } else if (data.type === 'TICK') {
          evaluateWallClock(typeof data.nowMs === 'number' ? data.nowMs : Date.now());
        }
      };

      worker.postMessage({ type: 'START' });
    } catch {
      // Fallback if Worker is blocked
    }

    // 2. Listen for Service Worker messages (SW_ADHAN_DUE / SW_PRE_ADHAN_DUE / SW_STOP_ADHAN / SW_MUTE_ADHAN)
    const handleSwMessage = (event: MessageEvent) => {
      const data = event.data || {};
      if (data.type === 'SW_ADHAN_DUE' && data.prayerKey) {
        triggerAdhanForPrayer(data.prayerKey as PrayerKey, data.signature);
      } else if (data.type === 'SW_PRE_ADHAN_DUE' && data.prayerKey) {
        triggerPreAdhanForPrayer(data.prayerKey as PrayerKey, data.signature);
      } else if (data.type === 'SW_STOP_ADHAN') {
        stopAdhanAudio();
      } else if (data.type === 'SW_MUTE_ADHAN') {
        stopAdhanAudio();
        setAdhanMuted(true);
        try {
          localStorage.setItem('noor_adhan_muted', 'true');
        } catch {}
      }
    };
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.addEventListener('message', handleSwMessage);
    }

    // 3. Configure Silent Keep-Alive Audio + hardware timeupdate heartbeat
    ensureSilentKeepAliveLoop();
    const silentAudio = silentKeepAliveAudioRef.current;
    const onSilentTimeUpdate = () => {
      evaluateWallClock(Date.now());
    };
    if (silentAudio) {
      silentAudio.addEventListener('timeupdate', onSilentTimeUpdate);
    }

    // 4. Unlock Silent Keep-Alive & secondary audio channels on first user interaction anywhere
    const unlockOnGesture = () => {
      unlockAllAudioChannels();
      if (silentKeepAliveAudioRef.current) {
        silentKeepAliveAudioRef.current.removeEventListener('timeupdate', onSilentTimeUpdate);
        silentKeepAliveAudioRef.current.addEventListener('timeupdate', onSilentTimeUpdate);
      }
    };
    window.addEventListener('pointerdown', unlockOnGesture, { passive: true });
    window.addEventListener('touchstart', unlockOnGesture, { passive: true });
    window.addEventListener('keydown', unlockOnGesture, { passive: true });

    // 5. Re-evaluate immediately on visibilitychange / focus
    const onVisibilityOrFocus = () => {
      ensureSilentKeepAliveLoop();
      evaluateWallClock(Date.now());
    };
    document.addEventListener('visibilitychange', onVisibilityOrFocus);
    window.addEventListener('focus', onVisibilityOrFocus);

    // 6. MediaSession action handlers so OS lock-screen controls keep the session alive
    if ('mediaSession' in navigator) {
      try {
        navigator.mediaSession.setActionHandler('play', () => {
          ensureSilentKeepAliveLoop();
        });
        navigator.mediaSession.setActionHandler('pause', () => {
          stopAdhanAudio();
          stopDhikrAudio();
          ensureSilentKeepAliveLoop();
        });
        navigator.mediaSession.setActionHandler('stop', () => {
          stopAdhanAudio();
          stopDhikrAudio();
        });
      } catch {
        // ignore unsupported handlers
      }
    }

    // Backup interval in case Worker is unavailable
    const backupInterval = setInterval(() => {
      evaluateWallClock(Date.now());
    }, 1000);

    return () => {
      clearInterval(backupInterval);
      if (worker) {
        worker.postMessage({ type: 'STOP' });
        worker.terminate();
        workerRef.current = null;
      }
      if ('serviceWorker' in navigator) {
        navigator.serviceWorker.removeEventListener('message', handleSwMessage);
      }
      if (silentAudio) {
        silentAudio.removeEventListener('timeupdate', onSilentTimeUpdate);
      }
      window.removeEventListener('pointerdown', unlockOnGesture);
      window.removeEventListener('touchstart', unlockOnGesture);
      window.removeEventListener('keydown', unlockOnGesture);
      document.removeEventListener('visibilitychange', onVisibilityOrFocus);
      window.removeEventListener('focus', onVisibilityOrFocus);
    };
  }, [
    ensureSilentKeepAliveLoop,
    evaluateWallClock,
    playNextDhikrClip,
    stopAdhanAudio,
    stopDhikrAudio,
    triggerAdhanForPrayer,
    triggerPreAdhanForPrayer,
    unlockAllAudioChannels,
  ]);

  // Sync state changes to Web Worker, Service Worker, and Silent Audio Keep-Alive Loop
  useEffect(() => {
    ensureSilentKeepAliveLoop();
    refreshKeepAliveMediaSession();

    const payload = {
      timings,
      timezone,
      adhanEnabled,
      adhanNotifEnabled,
      preAdhanEnabled,
      dhikrEnabled,
      dhikrIntervalMins,
      muadhinName: selectedMuadhin.name,
    };

    if (workerRef.current) {
      workerRef.current.postMessage({
        type: 'SYNC_STATE',
        payload,
      });
    }

    if (typeof navigator !== 'undefined' && 'serviceWorker' in navigator) {
      navigator.serviceWorker.ready
        .then((reg) => {
          reg.active?.postMessage({
            type: 'SYNC_PRAYER_STATE',
            payload,
          });
        })
        .catch(() => {});
    }
  }, [
    timings,
    timezone,
    adhanEnabled,
    adhanNotifEnabled,
    preAdhanEnabled,
    dhikrEnabled,
    dhikrIntervalMins,
    selectedMuadhin.name,
    ensureSilentKeepAliveLoop,
    refreshKeepAliveMediaSession,
  ]);

  useEffect(() => {
    ensureSilentKeepAliveLoop();
  }, [selectedDhikrIds, dhikrSchedules, ensureSilentKeepAliveLoop]);

  useEffect(() => {
    return () => {
      stopAdhanAudio();
      stopDhikrAudio();
      if (silentKeepAliveAudioRef.current) {
        silentKeepAliveAudioRef.current.pause();
      }
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

  const updateClipSchedule = useCallback(
    (clipId: string, timing: DhikrScheduleTiming, customTime?: string) => {
      setDhikrSchedules((prev) => {
        const current = prev[clipId] || { timing: 'periodic', customTime: '08:00' };
        const next: DhikrScheduleMap = {
          ...prev,
          [clipId]: {
            timing,
            customTime: customTime || current.customTime || '08:00',
          },
        };
        try {
          localStorage.setItem('noor_dhikr_schedules', JSON.stringify(next));
        } catch {}
        window.dispatchEvent(new Event('noor-settings-updated'));
        return next;
      });
    },
    []
  );

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

          <div className="flex items-center gap-1.5 shrink-0">
            <button
              type="button"
              onClick={() => {
                unlockAllAudioChannels();
                const next = !adhanMuted;
                setAdhanMuted(next);
                if (next) {
                  stopAdhanAudio();
                }
                try {
                  localStorage.setItem('noor_adhan_muted', String(next));
                } catch {}
              }}
              className={`min-h-[40px] flex items-center gap-1 rounded-xl px-2.5 py-1.5 text-xs font-bold transition-colors ${
                adhanMuted
                  ? 'bg-amber-600 text-white'
                  : 'bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
              }`}
            >
              {adhanMuted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
              <span>{adhanMuted ? 'صامت' : 'صوت'}</span>
            </button>

            <button
              type="button"
              onClick={() => {
                unlockAllAudioChannels();
                const next = !adhanEnabled;
                setAdhanEnabled(next);
                if (!next) stopAdhanAudio();
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
        </div>

        {/* Active Adhan Alert Banner if firing now (Stop / Silent / Cancel) */}
        {activeAdhanPrayer && (
          <div className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-amber-500 bg-amber-500/20 px-3 py-2.5">
            <span className="text-xs sm:text-sm font-extrabold">
              {adhanMuted
                ? `موعد أذان ${PRAYER_LABELS_AR[activeAdhanPrayer]} (صامت)`
                : `يُرفع الآن أذان ${PRAYER_LABELS_AR[activeAdhanPrayer]} — ${selectedMuadhin.name}`}
            </span>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={stopAdhanAudio}
                className="min-h-[36px] rounded-xl bg-rose-600 hover:bg-rose-500 px-2.5 py-1 text-xs font-bold text-white"
              >
                إيقاف
              </button>
              <button
                type="button"
                onClick={() => {
                  stopAdhanAudio();
                  setAdhanMuted(true);
                  try {
                    localStorage.setItem('noor_adhan_muted', 'true');
                  } catch {}
                }}
                className="min-h-[36px] rounded-xl bg-amber-600 hover:bg-amber-500 px-2.5 py-1 text-xs font-bold text-white"
              >
                صامت
              </button>
              <button
                type="button"
                onClick={() => {
                  stopAdhanAudio();
                  setAdhanEnabled(false);
                  try {
                    localStorage.setItem('noor_adhan_enabled', 'false');
                  } catch {}
                }}
                className="min-h-[36px] rounded-xl bg-slate-700 hover:bg-slate-600 px-2.5 py-1 text-xs font-bold text-white"
              >
                إلغاء
              </button>
            </div>
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
              unlockAllAudioChannels();
              const next = !dhikrEnabled;
              const intervalSecs = dhikrIntervalMins * 60;
              nextDhikrAtMsRef.current = Date.now() + intervalSecs * 1000;
              setDhikrSecondsLeft(intervalSecs);
              setDhikrEnabled(next);
              try {
                localStorage.setItem('noor_dhikr_enabled', String(next));
              } catch {}
              window.dispatchEvent(new Event('noor-settings-updated'));
              if (workerRef.current) {
                workerRef.current.postMessage({
                  type: 'SYNC_STATE',
                  payload: {
                    dhikrEnabled: next,
                    dhikrIntervalMins,
                    resetDhikrTimer: true,
                  },
                });
              }
            }}
            className={`min-h-[40px] flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-bold transition-colors ${
              dhikrEnabled
                ? 'bg-emerald-700 text-white'
                : 'bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
            }`}
          >
            <Clock className="h-4 w-4" />
            <span>{dhikrEnabled ? `بعد ${formatMMSS(dhikrSecondsLeft)}` : 'بدون توقيت'}</span>
          </button>
        </div>

        {/* Voice Mode Switcher: الأذكار vs Egyptian Sheikhs */}
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
            الأذكار
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

        {/* Interval Buttons: 1-4 mins in Row 1 (click selects & activates, re-click cancels), 5 mins + Cancel + Play in Row 2 */}
        <div className="space-y-1.5">
          <div className="grid grid-cols-4 gap-1.5">
            {[1, 2, 3, 4].map((mins) => {
              const isActive = dhikrEnabled && dhikrIntervalMins === mins;
              return (
                <button
                  key={mins}
                  type="button"
                  onClick={() => {
                    unlockAllAudioChannels();
                    if (isActive) {
                      setDhikrEnabled(false);
                      try {
                        localStorage.setItem('noor_dhikr_enabled', 'false');
                      } catch {}
                      window.dispatchEvent(new Event('noor-settings-updated'));
                      if (workerRef.current) {
                        workerRef.current.postMessage({
                          type: 'SYNC_STATE',
                          payload: { dhikrEnabled: false },
                        });
                      }
                      return;
                    }
                    nextDhikrAtMsRef.current = Date.now() + mins * 60 * 1000;
                    setDhikrIntervalMins(mins);
                    setDhikrSecondsLeft(mins * 60);
                    setDhikrEnabled(true);
                    try {
                      localStorage.setItem('noor_dhikr_interval', String(mins));
                      localStorage.setItem('noor_dhikr_enabled', 'true');
                    } catch {}
                    window.dispatchEvent(new Event('noor-settings-updated'));
                    if (workerRef.current) {
                      workerRef.current.postMessage({
                        type: 'SYNC_STATE',
                        payload: {
                          dhikrEnabled: true,
                          dhikrIntervalMins: mins,
                          resetDhikrTimer: true,
                        },
                      });
                    }
                  }}
                  className={`min-h-[42px] rounded-xl px-1 py-2 text-[10px] sm:text-xs font-bold leading-tight text-center break-words transition-colors ${
                    isActive
                      ? 'bg-amber-600 text-white shadow-sm'
                      : 'border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800'
                  }`}
                >
                  كل {mins} {mins === 1 ? 'دقيقة' : 'دقائق'}
                </button>
              );
            })}
          </div>

          <div className="grid grid-cols-3 gap-1.5">
            <button
              type="button"
              onClick={() => {
                unlockAllAudioChannels();
                const isActive = dhikrEnabled && dhikrIntervalMins === 5;
                if (isActive) {
                  setDhikrEnabled(false);
                  try {
                    localStorage.setItem('noor_dhikr_enabled', 'false');
                  } catch {}
                  window.dispatchEvent(new Event('noor-settings-updated'));
                  if (workerRef.current) {
                    workerRef.current.postMessage({
                      type: 'SYNC_STATE',
                      payload: { dhikrEnabled: false },
                    });
                  }
                  return;
                }
                nextDhikrAtMsRef.current = Date.now() + 5 * 60 * 1000;
                setDhikrIntervalMins(5);
                setDhikrSecondsLeft(5 * 60);
                setDhikrEnabled(true);
                try {
                  localStorage.setItem('noor_dhikr_interval', '5');
                  localStorage.setItem('noor_dhikr_enabled', 'true');
                } catch {}
                window.dispatchEvent(new Event('noor-settings-updated'));
                if (workerRef.current) {
                  workerRef.current.postMessage({
                    type: 'SYNC_STATE',
                    payload: {
                      dhikrEnabled: true,
                      dhikrIntervalMins: 5,
                      resetDhikrTimer: true,
                    },
                  });
                }
              }}
              className={`min-h-[42px] rounded-xl px-1.5 py-2 text-[10px] sm:text-xs font-bold leading-tight text-center break-words transition-colors ${
                dhikrEnabled && dhikrIntervalMins === 5
                  ? 'bg-amber-600 text-white shadow-sm'
                  : 'border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800'
              }`}
            >
              كل 5 دقائق
            </button>

            <button
              type="button"
              onClick={() => {
                setDhikrEnabled(false);
                try {
                  localStorage.setItem('noor_dhikr_enabled', 'false');
                } catch {}
                window.dispatchEvent(new Event('noor-settings-updated'));
                if (workerRef.current) {
                  workerRef.current.postMessage({
                    type: 'SYNC_STATE',
                    payload: { dhikrEnabled: false },
                  });
                }
              }}
              className={`min-h-[42px] rounded-xl px-1.5 py-2 text-[10px] sm:text-xs font-bold leading-tight text-center break-words transition-colors ${
                !dhikrEnabled
                  ? 'bg-slate-700 text-white'
                  : 'border border-rose-500/40 bg-rose-500/10 text-rose-700 dark:text-rose-300 hover:bg-rose-500/20'
              }`}
            >
              إلغاء التوقيت
            </button>

            <button
              type="button"
              onClick={() => {
                unlockAllAudioChannels();
                if (playingDhikrClip) stopDhikrAudio();
                else playNextDhikrClip();
              }}
              className={`min-h-[42px] flex items-center justify-center gap-1 rounded-xl px-1.5 py-2 text-[10px] sm:text-xs font-bold leading-tight text-center transition-colors ${
                playingDhikrClip
                  ? 'bg-rose-600 text-white'
                  : 'bg-emerald-700 hover:bg-emerald-600 text-white'
              }`}
            >
              {playingDhikrClip ? (
                <>
                  <Square className="h-3.5 w-3.5 fill-current shrink-0" />
                  <span>إيقاف الذكر</span>
                </>
              ) : (
                <>
                  <Play className="h-3.5 w-3.5 fill-current shrink-0" />
                  <span>تشغيل الآن</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Active / Clickable Clips Preview List: single row per clip (Title + Custom Time/Off + Play) */}
        <div className="space-y-1.5 pt-1">
          {activePool.map((clip) => {
            const isPlaying = playingDhikrClip?.id === clip.id;
            const sched = dhikrSchedules[clip.id] || {
              timing: 'periodic' as DhikrScheduleTiming,
              customTime: '08:00',
            };
            const isChecked =
              (dhikrMode !== 'egyptian_dhikr' || selectedDhikrIds.includes(clip.id)) &&
              sched.timing !== 'off';
            return (
              <div
                key={clip.id}
                className={`flex w-full items-center justify-between gap-2 rounded-xl border px-3 py-2 transition-colors ${
                  isPlaying
                    ? 'border-emerald-500 bg-emerald-500/15'
                    : isChecked
                      ? 'border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-slate-950/60 hover:border-amber-500/40'
                      : 'border-slate-200/60 dark:border-slate-800/60 bg-slate-100/60 dark:bg-slate-900/40 opacity-65'
                }`}
              >
                {dhikrMode === 'egyptian_dhikr' && (
                  <input
                    type="checkbox"
                    checked={selectedDhikrIds.includes(clip.id)}
                    aria-label={`تفعيل أو إيقاف ${clip.label}`}
                    onChange={() => {
                      const currentlyIncluded = selectedDhikrIds.includes(clip.id);
                      if (currentlyIncluded && selectedDhikrIds.length <= 1) {
                        setAudioNotice('يجب تحديد ذكر واحد على الأقل للتنبيه الدوري.');
                        return;
                      }
                      const next = currentlyIncluded
                        ? selectedDhikrIds.filter((id) => id !== clip.id)
                        : [...selectedDhikrIds, clip.id];
                      setSelectedDhikrIds(next);
                      setAudioNotice(null);
                      try {
                        localStorage.setItem('noor_selected_dhikrs', JSON.stringify(next));
                      } catch {}
                      window.dispatchEvent(new Event('noor-settings-updated'));
                    }}
                    className="h-4 w-4 accent-emerald-600 rounded cursor-pointer shrink-0"
                  />
                )}

                <button
                  type="button"
                  onClick={() => {
                    unlockAllAudioChannels();
                    setTimeModalClip(clip);
                  }}
                  className="flex flex-1 min-w-0 items-center justify-between gap-2 text-right"
                >
                  <span className="text-xs font-bold truncate">{clip.label}</span>
                  {sched.timing === 'custom_time' ? (
                    <span className="shrink-0 rounded-lg border border-amber-500/40 bg-amber-500/10 px-2 py-0.5 text-[10px] font-extrabold text-amber-700 dark:text-amber-300 whitespace-nowrap">
                      {formatTime24To12Ar(sched.customTime)}
                    </span>
                  ) : sched.timing === 'off' ? (
                    <span className="shrink-0 rounded-lg border border-rose-500/35 bg-rose-500/10 px-2 py-0.5 text-[10px] font-extrabold text-rose-600 dark:text-rose-300 whitespace-nowrap">
                      متوقف
                    </span>
                  ) : null}
                </button>

                <button
                  type="button"
                  onClick={() => {
                    unlockAllAudioChannels();
                    if (isPlaying) stopDhikrAudio();
                    else playNextDhikrClip(clip);
                  }}
                  aria-label={isPlaying ? `إيقاف ${clip.label}` : `تشغيل ${clip.label}`}
                  className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-white transition-colors ${
                    isPlaying ? 'bg-rose-600' : 'bg-emerald-700 hover:bg-emerald-600'
                  }`}
                >
                  {isPlaying ? (
                    <Square className="h-3.5 w-3.5 fill-current" />
                  ) : (
                    <Play className="h-3.5 w-3.5 fill-current" />
                  )}
                </button>
              </div>
            );
          })}
        </div>

        {audioNotice && (
          <p className="text-xs font-semibold text-amber-700 dark:text-amber-300">{audioNotice}</p>
        )}
      </section>

      <DhikrTimeModal
        clip={timeModalClip}
        initialTiming={
          timeModalClip ? dhikrSchedules[timeModalClip.id]?.timing || 'periodic' : 'periodic'
        }
        initialTime={
          timeModalClip ? dhikrSchedules[timeModalClip.id]?.customTime || '08:00' : '08:00'
        }
        onClose={() => setTimeModalClip(null)}
        onSave={(clipId, timing, time24) => {
          updateClipSchedule(clipId, timing, time24);
          setTimeModalClip(null);
        }}
      />
    </div>
  );
}
