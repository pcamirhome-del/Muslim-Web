'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import {
  QuranReciterConfig,
  ReciterRiwayahStream,
  getEveryAyahUrl,
  getFullSurahMp3Url,
} from '@/lib/data/quran-reciters';
import { resolveOfflineAudioSrc } from '@/lib/offline-quran-db';

export interface ActiveRecitationTarget {
  surahNumber: number;
  surahName: string;
  ayahInSurah: number;
  fromAyah: number;
  toAyah: number;
  mode: 'ayah' | 'surah';
}

export function useGaplessQuranPlayer() {
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [isBuffering, setIsBuffering] = useState<boolean>(false);
  const [activeTarget, setActiveTarget] = useState<ActiveRecitationTarget | null>(null);
  const [surahProgressPct, setSurahProgressPct] = useState<number>(0);
  const [audioError, setAudioError] = useState<string | null>(null);

  // Dual Audio Buffers for Zero-Gap Preloading
  const bufferARef = useRef<HTMLAudioElement | null>(null);
  const bufferBRef = useRef<HTMLAudioElement | null>(null);
  const activeSlotRef = useRef<'A' | 'B'>('A');
  const preloadedAyahRef = useRef<number | null>(null);
  const preloadedBlobUrlRef = useRef<string | null>(null);
  const currentBlobUrlRef = useRef<string | null>(null);

  const sessionConfigRef = useRef<{
    surahNumber: number;
    surahName: string;
    fromAyah: number;
    toAyah: number;
    reciter: QuranReciterConfig;
    stream: ReciterRiwayahStream;
  } | null>(null);

  const revokeBlob = (url: string | null) => {
    if (url && url.startsWith('blob:')) {
      try {
        URL.revokeObjectURL(url);
      } catch {
        // ignore
      }
    }
  };

  const getActiveAudio = () =>
    activeSlotRef.current === 'A' ? bufferARef.current : bufferBRef.current;

  const getStandbyAudio = () =>
    activeSlotRef.current === 'A' ? bufferBRef.current : bufferARef.current;

  const stop = useCallback(() => {
    [bufferARef.current, bufferBRef.current].forEach((audio) => {
      if (audio) {
        audio.ontimeupdate = null;
        audio.onended = null;
        audio.onerror = null;
        audio.onplaying = null;
        audio.onwaiting = null;
        audio.pause();
        audio.removeAttribute('src');
        audio.load();
      }
    });
    revokeBlob(currentBlobUrlRef.current);
    revokeBlob(preloadedBlobUrlRef.current);
    currentBlobUrlRef.current = null;
    preloadedBlobUrlRef.current = null;
    preloadedAyahRef.current = null;
    sessionConfigRef.current = null;
    setIsPlaying(false);
    setIsBuffering(false);
    setActiveTarget(null);
    setSurahProgressPct(0);
    setAudioError(null);
  }, []);

  const preloadNextAyahIntoStandby = useCallback(async (nextAyah: number) => {
    const cfg = sessionConfigRef.current;
    if (!cfg || !cfg.stream.everyayahFolder) return;
    if (nextAyah > cfg.toAyah) return;
    if (preloadedAyahRef.current === nextAyah) return;

    preloadedAyahRef.current = nextAyah;
    const standby = getStandbyAudio();
    if (!standby) return;

    const rawUrl = getEveryAyahUrl(cfg.stream.everyayahFolder, cfg.surahNumber, nextAyah);
    const resolved = await resolveOfflineAudioSrc(rawUrl);

    revokeBlob(preloadedBlobUrlRef.current);
    preloadedBlobUrlRef.current = resolved.isBlob ? resolved.src : null;

    standby.preload = 'auto';
    standby.src = resolved.src;
    standby.load();
  }, []);

  const attachActiveHandlersRef = useRef<(ayahInSurah: number) => void>(() => {});

  const attachActiveHandlers = useCallback(
    (ayahInSurah: number) => {
      const active = getActiveAudio();
      const cfg = sessionConfigRef.current;
      if (!active || !cfg) return;

      active.onplaying = () => {
        setIsPlaying(true);
        setIsBuffering(false);
        setAudioError(null);
      };

      active.onwaiting = () => {
        setIsBuffering(true);
      };

      active.ontimeupdate = () => {
        if (!active.duration || Number.isNaN(active.duration)) return;
        const remaining = active.duration - active.currentTime;
        // Preload next Ayah into dual standby buffer 2.2s before current Ayah ends
        if (remaining <= 2.2 && ayahInSurah < cfg.toAyah) {
          preloadNextAyahIntoStandby(ayahInSurah + 1);
        }
      };

      active.onended = () => {
        const nextAyah = ayahInSurah + 1;
        if (!cfg || nextAyah > cfg.toAyah) {
          stop();
          return;
        }

        // Swap to standby dual buffer instantaneously for zero-gap playback
        if (preloadedAyahRef.current === nextAyah) {
          const standby = getStandbyAudio();
          if (standby) {
            active.ontimeupdate = null;
            active.onended = null;
            activeSlotRef.current = activeSlotRef.current === 'A' ? 'B' : 'A';
            revokeBlob(currentBlobUrlRef.current);
            currentBlobUrlRef.current = preloadedBlobUrlRef.current;
            preloadedBlobUrlRef.current = null;
            preloadedAyahRef.current = null;

            setActiveTarget({
              surahNumber: cfg.surahNumber,
              surahName: cfg.surahName,
              ayahInSurah: nextAyah,
              fromAyah: cfg.fromAyah,
              toAyah: cfg.toAyah,
              mode: 'ayah',
            });

            attachActiveHandlersRef.current(nextAyah);
            standby.play().catch(() => {
              setAudioError('تعذر متابعة التلاوة. تحقق من الاتصال أو الملف المحمل.');
            });

            if ('mediaSession' in navigator) {
              navigator.mediaSession.metadata = new MediaMetadata({
                title: `${cfg.surahName} — الآية ${nextAyah}`,
                artist: `${cfg.reciter.name} (${cfg.stream.editionLabel})`,
                album: 'المصحف الشريف — نور الإسلام',
                artwork: [{ src: '/pwa-192x192.png', sizes: '192x192', type: 'image/png' }],
              });
            }
            return;
          }
        }

        // If standby wasn't ready yet, load & play immediately
        preloadNextAyahIntoStandby(nextAyah).then(() => {
          const standby = getStandbyAudio();
          if (!standby) return;
          activeSlotRef.current = activeSlotRef.current === 'A' ? 'B' : 'A';
          revokeBlob(currentBlobUrlRef.current);
          currentBlobUrlRef.current = preloadedBlobUrlRef.current;
          preloadedBlobUrlRef.current = null;
          preloadedAyahRef.current = null;
          setActiveTarget({
            surahNumber: cfg.surahNumber,
            surahName: cfg.surahName,
            ayahInSurah: nextAyah,
            fromAyah: cfg.fromAyah,
            toAyah: cfg.toAyah,
            mode: 'ayah',
          });
          attachActiveHandlersRef.current(nextAyah);
          standby.play().catch(() => {});
        });
      };

      active.onerror = () => {
        setIsBuffering(false);
        setIsPlaying(false);
        setAudioError('تعذر تشغيل التلاوة. تأكد من الاتصال بالإنترنت أو حمّل السورة أوفلاين.');
      };
    },
    [preloadNextAyahIntoStandby, stop]
  );

  useEffect(() => {
    attachActiveHandlersRef.current = attachActiveHandlers;
  }, [attachActiveHandlers]);

  const startRecitation = useCallback(
    async (params: {
      surahNumber: number;
      surahName: string;
      fromAyah: number;
      toAyah: number;
      reciter: QuranReciterConfig;
      stream: ReciterRiwayahStream;
    }) => {
      stop();

      if (!bufferARef.current) bufferARef.current = new Audio();
      if (!bufferBRef.current) bufferBRef.current = new Audio();
      activeSlotRef.current = 'A';

      sessionConfigRef.current = params;
      setIsBuffering(true);
      setAudioError(null);

      const audio = bufferARef.current;

      if (params.stream.everyayahFolder) {
        setActiveTarget({
          surahNumber: params.surahNumber,
          surahName: params.surahName,
          ayahInSurah: params.fromAyah,
          fromAyah: params.fromAyah,
          toAyah: params.toAyah,
          mode: 'ayah',
        });

        const rawUrl = getEveryAyahUrl(
          params.stream.everyayahFolder,
          params.surahNumber,
          params.fromAyah
        );
        const resolved = await resolveOfflineAudioSrc(rawUrl);
        currentBlobUrlRef.current = resolved.isBlob ? resolved.src : null;

        audio.preload = 'auto';
        audio.src = resolved.src;
        attachActiveHandlers(params.fromAyah);

        audio.play().catch(() => {
          setIsBuffering(false);
          setIsPlaying(false);
          setAudioError('اضغط زر التشغيل لبدء التلاوة.');
        });

        // Preload immediate next verse in advance
        if (params.fromAyah < params.toAyah) {
          preloadNextAyahIntoStandby(params.fromAyah + 1);
        }
      } else {
        // Full-Surah Riwayah Playback (e.g., Husary Warsh/Qaloon/Dori, Sufi Soosi, Hudhaify Qaloon)
        setActiveTarget({
          surahNumber: params.surahNumber,
          surahName: params.surahName,
          ayahInSurah: params.fromAyah,
          fromAyah: params.fromAyah,
          toAyah: params.toAyah,
          mode: 'surah',
        });

        const rawUrl = getFullSurahMp3Url(params.stream.mp3quranServer, params.surahNumber);
        const resolved = await resolveOfflineAudioSrc(rawUrl);
        currentBlobUrlRef.current = resolved.isBlob ? resolved.src : null;

        audio.preload = 'auto';
        audio.src = resolved.src;
        audio.onplaying = () => {
          setIsPlaying(true);
          setIsBuffering(false);
          setAudioError(null);
        };
        audio.onwaiting = () => setIsBuffering(true);
        audio.ontimeupdate = () => {
          if (audio.duration > 0) {
            setSurahProgressPct(Math.round((audio.currentTime / audio.duration) * 100));
          }
        };
        audio.onended = () => stop();
        audio.onerror = () => {
          setIsBuffering(false);
          setIsPlaying(false);
          setAudioError('تعذر تشغيل السورة. تحقق من الإنترنت أو قم بتحميل السورة أوفلاين.');
        };

        audio.play().catch(() => {
          setIsBuffering(false);
          setIsPlaying(false);
          setAudioError('اضغط زر التشغيل لبدء التلاوة.');
        });
      }

      if ('mediaSession' in navigator) {
        navigator.mediaSession.metadata = new MediaMetadata({
          title: `${params.surahName} — ${params.stream.editionLabel}`,
          artist: params.reciter.name,
          album: 'المصحف الشريف — نور الإسلام',
          artwork: [{ src: '/pwa-192x192.png', sizes: '192x192', type: 'image/png' }],
        });
        navigator.mediaSession.setActionHandler('play', () => {
          getActiveAudio()?.play().catch(() => {});
          setIsPlaying(true);
        });
        navigator.mediaSession.setActionHandler('pause', () => {
          getActiveAudio()?.pause();
          setIsPlaying(false);
        });
        navigator.mediaSession.setActionHandler('stop', () => {
          stop();
        });
      }
    },
    [attachActiveHandlers, preloadNextAyahIntoStandby, stop]
  );

  const togglePlayPause = useCallback(() => {
    const active = getActiveAudio();
    if (!active || !activeTarget) return;
    if (isPlaying) {
      active.pause();
      setIsPlaying(false);
    } else {
      active.play().catch(() => {});
      setIsPlaying(true);
    }
  }, [activeTarget, isPlaying]);

  useEffect(() => {
    return () => {
      stop();
    };
  }, [stop]);

  return {
    isPlaying,
    isBuffering,
    activeTarget,
    surahProgressPct,
    audioError,
    startRecitation,
    togglePlayPause,
    stop,
  };
}
