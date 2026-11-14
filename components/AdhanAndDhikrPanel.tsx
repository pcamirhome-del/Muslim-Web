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
  getSilentKeepAliveWavDataUri,
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
  const silentKeepAliveAudioRef = useRef<HTMLAudioElement | null>(null);
  const workerRef = useRef<Worker | null>(null);

  const lastFiredAdhanKeyRef = useRef<string>('');
  const lastFiredPreAdhanKeyRef = useRef<string>('');
  const dhikrIndexRef = useRef<number>(0);
  const nextDhikrAtMsRef = useRef<number>(0);

  const selectedMuadhin: MuadhinItem =
    MUADHINS_LIST.find((m) => m.id === selectedMuadhinId) || MUADHINS_LIST[0];

  // Keep latest state in a ref so Worker / Service Worker / Silent Audio callbacks always read fresh values
  const liveStateRef = useRef({
    timings,
    timezone,
    adhanEnabled,
    adhanNotifEnabled,
    preAdhanEnabled,
    dhikrEnabled,
    dhikrIntervalMins,
    dhikrMode,
    selectedMuadhin,
  });

  useEffect(() => {
    liveStateRef.current = {
      timings,
      timezone,
      adhanEnabled,
      adhanNotifEnabled,
      preAdhanEnabled,
      dhikrEnabled,
      dhikrIntervalMins,
      dhikrMode,
      selectedMuadhin,
    };
  }, [
    timings,
    timezone,
    adhanEnabled,
    adhanNotifEnabled,
    preAdhanEnabled,
    dhikrEnabled,
    dhikrIntervalMins,
    dhikrMode,
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
    const shouldKeepAlive =
      liveStateRef.current.adhanEnabled ||
      liveStateRef.current.preAdhanEnabled ||
      liveStateRef.current.dhikrEnabled;

    if (!shouldKeepAlive) {
      if (silentKeepAliveAudioRef.current) {
        silentKeepAliveAudioRef.current.pause();
      }
      return;
    }

    if (!silentKeepAliveAudioRef.current) {
      const silentAudio = new Audio(getSilentKeepAliveWavDataUri());
      silentAudio.loop = true;
      silentAudio.volume = 0.01; // Near-zero volume so user hears nothing while OS keeps audio session awake
      silentAudio.preload = 'auto';
      silentAudio.setAttribute('playsinline', 'true');
      silentKeepAliveAudioRef.current = silentAudio;
    }

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
          // Will be unlocked automatically on first user tap/click listener below
        });
    }
  }, [refreshKeepAliveMediaSession]);

  const stopAdhanAudio = useCallback(() => {
    if (adhanAudioRef.current) {
      adhanAudioRef.current.pause();
      adhanAudioRef.current.currentTime = 0;
    }
    setPreviewingMuadhinId(null);
    setActiveAdhanPrayer(null);
    refreshKeepAliveMediaSession();
  }, [refreshKeepAliveMediaSession]);

  const playAdhanAudio = useCallback(
    (muadhin: MuadhinItem, prayerKey?: PrayerKey) => {
      stopAdhanAudio();
      setAudioNotice(null);
      ensureSilentKeepAliveLoop();

      if (!adhanAudioRef.current) {
        adhanAudioRef.current = new Audio();
        adhanAudioRef.current.preload = 'auto';
        adhanAudioRef.current.setAttribute('playsinline', 'true');
      }
      const audio = adhanAudioRef.current;
      audio.src = muadhin.audioUrl;
      audio.volume = 1.0;

      if (prayerKey) {
        setActiveAdhanPrayer(prayerKey);
      } else {
        setPreviewingMuadhinId(muadhin.id);
      }

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
        setPreviewingMuadhinId(null);
        setAudioNotice('اضغط زر التجربة لتفعيل الصوت في المتصفح.');
      });

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
    },
    [ensureSilentKeepAliveLoop, refreshKeepAliveMediaSession, stopAdhanAudio]
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
    setPlayingDhikrClip(null);
    refreshKeepAliveMediaSession();
  }, [refreshKeepAliveMediaSession]);

  const playNextDhikrClip = useCallback(
    (specificClip?: DhikrAudioClip) => {
      stopDhikrAudio();
      setAudioNotice(null);
      ensureSilentKeepAliveLoop();

      const currentMode = liveStateRef.current.dhikrMode;
      const pool = currentMode === 'egyptian_dhikr' ? EGYPTIAN_DHIKR_CLIPS : SHEIKH_DHIKR_CLIPS;
      const clip = specificClip || pool[dhikrIndexRef.current % pool.length];
      if (!specificClip) {
        dhikrIndexRef.current = (dhikrIndexRef.current + 1) % pool.length;
      }

      if (!dhikrAudioRef.current) {
        dhikrAudioRef.current = new Audio();
        dhikrAudioRef.current.preload = 'auto';
        dhikrAudioRef.current.setAttribute('playsinline', 'true');
      }
      const audio = dhikrAudioRef.current;
      audio.src = clip.audioUrl;
      audio.volume = 1.0;
      setPlayingDhikrClip(clip);

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
        setPlayingDhikrClip(null);
        setAudioNotice('يرجى الضغط على "تشغيل الذكر الآن" لمنح المتصفح إذن الصوت.');
      });

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
    },
    [ensureSilentKeepAliveLoop, refreshKeepAliveMediaSession, stopDhikrAudio]
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
      if (st.adhanEnabled) {
        playAdhanAudio(st.selectedMuadhin, prayerKey);
      }
      if (st.adhanNotifEnabled) {
        sendPrayerNotification(
          `حان الآن موعد أذان ${PRAYER_LABELS_AR[prayerKey]}`,
          `يرفع الأذان بصوت ${st.selectedMuadhin.name}`,
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

      // 1. Check Adhan & 10-Minute Pre-Adhan
      if (st.timings && (st.adhanEnabled || st.adhanNotifEnabled || st.preAdhanEnabled)) {
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

      // 2. Check Periodic Dhikr via exact wall-clock timestamp
      if (st.dhikrEnabled) {
        const intervalMs = Math.max(1, st.dhikrIntervalMins) * 60 * 1000;
        if (!nextDhikrAtMsRef.current || nextDhikrAtMsRef.current < nowMs - intervalMs * 2) {
          nextDhikrAtMsRef.current = nowMs + intervalMs;
        }
        if (nowMs >= nextDhikrAtMsRef.current) {
          nextDhikrAtMsRef.current = nowMs + intervalMs;
          playNextDhikrClip();
        }
        const secsLeft = Math.max(1, Math.ceil((nextDhikrAtMsRef.current - nowMs) / 1000));
        setDhikrSecondsLeft(secsLeft);
      }
    },
    [playNextDhikrClip, triggerAdhanForPrayer, triggerPreAdhanForPrayer]
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
          playNextDhikrClip();
        } else if (data.type === 'TICK') {
          evaluateWallClock(typeof data.nowMs === 'number' ? data.nowMs : Date.now());
        }
      };

      worker.postMessage({ type: 'START' });
    } catch {
      // Fallback if Worker is blocked
    }

    // 2. Listen for Service Worker messages (SW_ADHAN_DUE / SW_PRE_ADHAN_DUE)
    const handleSwMessage = (event: MessageEvent) => {
      const data = event.data || {};
      if (data.type === 'SW_ADHAN_DUE' && data.prayerKey) {
        triggerAdhanForPrayer(data.prayerKey as PrayerKey, data.signature);
      } else if (data.type === 'SW_PRE_ADHAN_DUE' && data.prayerKey) {
        triggerPreAdhanForPrayer(data.prayerKey as PrayerKey, data.signature);
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

    // 4. Unlock Silent Keep-Alive Audio on first user interaction anywhere in the app
    const unlockOnGesture = () => {
      ensureSilentKeepAliveLoop();
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
              const next = !dhikrEnabled;
              const intervalSecs = dhikrIntervalMins * 60;
              nextDhikrAtMsRef.current = Date.now() + intervalSecs * 1000;
              setDhikrSecondsLeft(intervalSecs);
              setDhikrEnabled(next);
              try {
                localStorage.setItem('noor_dhikr_enabled', String(next));
              } catch {}
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
                  nextDhikrAtMsRef.current = Date.now() + mins * 60 * 1000;
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
                nextDhikrAtMsRef.current = Date.now() + 5 * 60 * 1000;
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
                  {clip.egyptianPrompt !== clip.label && (
                    <span className="block text-[11px] text-slate-600 dark:text-slate-300 truncate">
                      {clip.egyptianPrompt}
                    </span>
                  )}
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
