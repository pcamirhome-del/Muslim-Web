'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Hls from 'hls.js';
import {
  PRIORITY_RADIO_STATIONS,
  RadioStation,
  classifyRadioStation,
} from '@/lib/data/radio-stations';

export type RadioPlaybackStatus =
  | 'idle'
  | 'connecting'
  | 'playing'
  | 'paused'
  | 'reconnecting'
  | 'error';

interface ApiRadioRecord {
  id: number;
  name: string;
  url: string;
}

export function useResilientRadio() {
  const [stations, setStations] = useState<RadioStation[]>(PRIORITY_RADIO_STATIONS);
  const [loadingStations, setLoadingStations] = useState<boolean>(true);
  const [activeStation, setActiveStation] = useState<RadioStation | null>(null);
  const [status, setStatus] = useState<RadioPlaybackStatus>('idle');
  const [activeStreamIndex, setActiveStreamIndex] = useState<number>(0);
  const [reconnectAttempt, setReconnectAttempt] = useState<number>(0);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [volume, setVolume] = useState<number>(0.9);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isMinimized, setIsMinimized] = useState<boolean>(false);

  // Sleep Timer state
  const [sleepTimerSecondsLeft, setSleepTimerSecondsLeft] = useState<number | null>(null);
  const [sleepTimerTotalMinutes, setSleepTimerTotalMinutes] = useState<number | null>(null);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const hlsRef = useRef<Hls | null>(null);
  const retryTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const retryAttemptRef = useRef<number>(0);
  const streamCandidateIdxRef = useRef<number>(0);
  const activeStationRef = useRef<RadioStation | null>(null);
  const stationsRef = useRef<RadioStation[]>(PRIORITY_RADIO_STATIONS);
  const statusRef = useRef<RadioPlaybackStatus>('idle');
  const lastProgressTimeRef = useRef<number>(0);
  const lastAudioCurrentTimeRef = useRef<number>(0);

  useEffect(() => {
    activeStationRef.current = activeStation;
  }, [activeStation]);

  useEffect(() => {
    stationsRef.current = stations;
  }, [stations]);

  useEffect(() => {
    statusRef.current = status;
  }, [status]);

  // Load 170+ live Quran radio stations from mp3quran.net v3 API
  useEffect(() => {
    let cancelled = false;
    const loadRadios = async () => {
      try {
        const res = await fetch('https://www.mp3quran.net/api/v3/radios?language=ar');
        if (!res.ok) throw new Error('HTTP error');
        const json = await res.json();
        if (!cancelled && Array.isArray(json.radios)) {
          const merged: RadioStation[] = [...PRIORITY_RADIO_STATIONS];
          for (const raw of json.radios as ApiRadioRecord[]) {
            if (!raw.url) continue;
            const cleanUrl = raw.url.replace(/^http:\/\//i, 'https://');
            const exists = merged.some(
              (m) => m.url === cleanUrl || m.backupUrls?.includes(cleanUrl)
            );
            if (!exists) {
              merged.push({
                id: raw.id,
                name: raw.name,
                subtitle: 'بث إذاعي مباشر 24/7',
                url: cleanUrl,
                category: classifyRadioStation(raw.name),
                featured: false,
              });
            }
          }
          setStations(merged);
        }
      } catch {
        // Keep priority curated stations on network failure
      } finally {
        if (!cancelled) setLoadingStations(false);
      }
    };

    const t = setTimeout(loadRadios, 0);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, []);

  const cleanupPlayback = useCallback(() => {
    if (retryTimerRef.current) {
      clearTimeout(retryTimerRef.current);
      retryTimerRef.current = null;
    }
    if (hlsRef.current) {
      hlsRef.current.destroy();
      hlsRef.current = null;
    }
    if (audioRef.current) {
      audioRef.current.onplaying = null;
      audioRef.current.onwaiting = null;
      audioRef.current.onerror = null;
      audioRef.current.onstalled = null;
      audioRef.current.ontimeupdate = null;
      audioRef.current.pause();
      audioRef.current.removeAttribute('src');
      audioRef.current.load();
    }
  }, []);

  const startStreamRef = useRef<
    (station: RadioStation, candidateIndex?: number, isRetry?: boolean) => void
  >(() => {});

  const stopStream = useCallback(() => {
    cleanupPlayback();
    retryAttemptRef.current = 0;
    streamCandidateIdxRef.current = 0;
    setActiveStation(null);
    setStatus('idle');
    setReconnectAttempt(0);
    setActiveStreamIndex(0);
    setErrorMsg(null);
    setIsMinimized(false);
    setSleepTimerSecondsLeft(null);
    setSleepTimerTotalMinutes(null);
  }, [cleanupPlayback]);

  const startStream = useCallback(
    (station: RadioStation, candidateIndex = 0, isRetry = false) => {
      cleanupPlayback();

      const candidates = [station.url, ...(station.backupUrls || [])];
      const safeIndex = candidateIndex % candidates.length;
      const streamUrl = candidates[safeIndex];

      if (!isRetry) {
        retryAttemptRef.current = 0;
      }
      streamCandidateIdxRef.current = safeIndex;
      setActiveStreamIndex(safeIndex);
      setActiveStation(station);
      setErrorMsg(null);
      setStatus(isRetry ? 'reconnecting' : 'connecting');

      if (!audioRef.current) {
        audioRef.current = new Audio();
      }
      const audio = audioRef.current;
      audio.preload = 'auto';
      audio.volume = isMuted ? 0 : volume;
      lastProgressTimeRef.current = Date.now();
      lastAudioCurrentTimeRef.current = 0;

      const scheduleFailoverOrReconnect = () => {
        if (!activeStationRef.current || activeStationRef.current.id !== station.id) return;
        if (statusRef.current === 'paused' || statusRef.current === 'idle') return;

        retryAttemptRef.current += 1;
        setReconnectAttempt(retryAttemptRef.current);

        // Up to 8 exponential-backoff retries rotating through primary & backup URLs
        if (retryAttemptRef.current <= 8) {
          setStatus('reconnecting');
          const nextCandidate = (streamCandidateIdxRef.current + 1) % candidates.length;
          const backoffMs = Math.min(8000, Math.round(700 * Math.pow(1.45, retryAttemptRef.current - 1)));
          retryTimerRef.current = setTimeout(() => {
            startStreamRef.current(station, nextCandidate, true);
          }, backoffMs);
        } else {
          setStatus('error');
          setErrorMsg('انقطع البث بسبب ضعف الاتصال. اضغط إعادة المحاولة.');
        }
      };

      audio.onplaying = () => {
        retryAttemptRef.current = 0;
        setReconnectAttempt(0);
        setStatus('playing');
        setErrorMsg(null);
        lastProgressTimeRef.current = Date.now();
      };

      audio.ontimeupdate = () => {
        if (audio.currentTime !== lastAudioCurrentTimeRef.current) {
          lastAudioCurrentTimeRef.current = audio.currentTime;
          lastProgressTimeRef.current = Date.now();
        }
      };

      audio.onwaiting = () => {
        if (statusRef.current === 'playing') {
          setStatus('reconnecting');
        }
      };

      audio.onerror = () => {
        scheduleFailoverOrReconnect();
      };

      audio.onstalled = () => {
        scheduleFailoverOrReconnect();
      };

      const isHLS = streamUrl.toLowerCase().includes('.m3u8');

      if (isHLS && Hls.isSupported()) {
        const hls = new Hls({
          enableWorker: true,
          lowLatencyMode: false,
          maxBufferLength: 60,
          maxMaxBufferLength: 120,
          liveSyncDurationCount: 3,
          manifestLoadingMaxRetry: 6,
          fragLoadingMaxRetry: 6,
          levelLoadingMaxRetry: 6,
        });
        hlsRef.current = hls;
        hls.loadSource(streamUrl);
        hls.attachMedia(audio);
        hls.on(Hls.Events.MANIFEST_PARSED, () => {
          audio.play().catch(() => {
            setStatus('paused');
            setErrorMsg('اضغط زر التشغيل لاستئناف البث');
          });
        });
        hls.on(Hls.Events.ERROR, (_evt, data) => {
          if (data.fatal) {
            scheduleFailoverOrReconnect();
          }
        });
      } else {
        audio.src = streamUrl;
        audio.load();
        audio.play().catch(() => {
          scheduleFailoverOrReconnect();
        });
      }

      // Full MediaSession integration for background playback & lock-screen controls
      if ('mediaSession' in navigator) {
        navigator.mediaSession.metadata = new MediaMetadata({
          title: station.name,
          artist: station.subtitle || 'إذاعة القرآن الكريم — بث مباشر 24/7',
          album: 'تطبيق نور الإسلام',
          artwork: [
            { src: '/pwa-192x192.png', sizes: '192x192', type: 'image/png' },
            { src: '/pwa-512x512.png', sizes: '512x512', type: 'image/png' },
          ],
        });

        navigator.mediaSession.setActionHandler('play', () => {
          audio.play().catch(() => startStreamRef.current(station, streamCandidateIdxRef.current));
          setStatus('playing');
        });
        navigator.mediaSession.setActionHandler('pause', () => {
          audio.pause();
          setStatus('paused');
        });
        navigator.mediaSession.setActionHandler('stop', () => {
          stopStream();
        });
        navigator.mediaSession.setActionHandler('nexttrack', () => {
          const list = stationsRef.current;
          const curIdx = list.findIndex((s) => s.id === station.id);
          const next = list[(curIdx + 1) % list.length];
          if (next) startStreamRef.current(next, 0, false);
        });
        navigator.mediaSession.setActionHandler('previoustrack', () => {
          const list = stationsRef.current;
          const curIdx = list.findIndex((s) => s.id === station.id);
          const prev = list[(curIdx - 1 + list.length) % list.length];
          if (prev) startStreamRef.current(prev, 0, false);
        });
      }
    },
    [cleanupPlayback, isMuted, stopStream, volume]
  );

  useEffect(() => {
    startStreamRef.current = startStream;
  }, [startStream]);

  const togglePlayPause = useCallback(() => {
    const audio = audioRef.current;
    const station = activeStationRef.current;
    if (!station) return;

    if (statusRef.current === 'playing' || statusRef.current === 'connecting' || statusRef.current === 'reconnecting') {
      if (retryTimerRef.current) {
        clearTimeout(retryTimerRef.current);
        retryTimerRef.current = null;
      }
      audio?.pause();
      setStatus('paused');
      if ('mediaSession' in navigator) {
        navigator.mediaSession.playbackState = 'paused';
      }
    } else if (audio && audio.src) {
      setStatus('connecting');
      audio.play().catch(() => {
        startStreamRef.current(station, streamCandidateIdxRef.current, false);
      });
    } else {
      startStreamRef.current(station, 0, false);
    }
  }, []);

  // Watchdog to recover silently if audio buffer freezes on flaky cellular connections
  useEffect(() => {
    const watchdog = setInterval(() => {
      const station = activeStationRef.current;
      const audio = audioRef.current;
      if (!station || !audio) return;
      if (statusRef.current !== 'playing') return;

      const stalledForMs = Date.now() - lastProgressTimeRef.current;
      if (stalledForMs > 14000 && audio.readyState < 3) {
        const candidates = [station.url, ...(station.backupUrls || [])];
        const nextCandidate = (streamCandidateIdxRef.current + 1) % candidates.length;
        startStreamRef.current(station, nextCandidate, true);
      }
    }, 5000);

    return () => clearInterval(watchdog);
  }, []);

  // Sync volume & mute
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = isMuted ? 0 : volume;
    }
  }, [isMuted, volume]);

  // Sleep Timer countdown
  useEffect(() => {
    if (sleepTimerSecondsLeft === null) return;

    const timer = setInterval(() => {
      setSleepTimerSecondsLeft((prev) => {
        if (prev === null) return null;
        if (prev <= 1) {
          stopStream();
          return null;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [sleepTimerSecondsLeft, stopStream]);

  const setSleepTimerMinutes = useCallback((minutes: number) => {
    const safeMins = Math.max(1, Math.min(360, Math.round(minutes)));
    setSleepTimerTotalMinutes(safeMins);
    setSleepTimerSecondsLeft(safeMins * 60);
  }, []);

  const cancelSleepTimer = useCallback(() => {
    setSleepTimerSecondsLeft(null);
    setSleepTimerTotalMinutes(null);
  }, []);

  useEffect(() => {
    return () => {
      cleanupPlayback();
    };
  }, [cleanupPlayback]);

  return {
    stations,
    loadingStations,
    activeStation,
    status,
    activeStreamIndex,
    reconnectAttempt,
    isMuted,
    setIsMuted,
    volume,
    setVolume,
    errorMsg,
    isMinimized,
    setIsMinimized,
    sleepTimerSecondsLeft,
    sleepTimerTotalMinutes,
    setSleepTimerMinutes,
    cancelSleepTimer,
    startStream,
    stopStream,
    togglePlayPause,
  };
}
