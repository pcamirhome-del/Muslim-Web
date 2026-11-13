'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  BookOpen,
  ChevronRight,
  ChevronLeft,
  Play,
  Pause,
  Square,
  Download,
  CheckCircle2,
  Loader2,
  Volume2,
  WifiOff,
} from 'lucide-react';
import {
  QURAN_RECITERS,
  RIWAYAH_OPTIONS,
  RiwayahId,
  resolveReciterAndStream,
} from '@/lib/data/quran-reciters';
import {
  OFFLINE_TEXT_CACHE,
  OfflineDownloadRecord,
  buildDownloadKey,
  downloadSurahForOffline,
  getAllOfflineDownloads,
  getSurahTextFromIDB,
} from '@/lib/offline-quran-db';
import { useGaplessQuranPlayer } from '@/hooks/useGaplessQuranPlayer';

interface SurahMeta {
  number: number;
  name: string;
  englishName: string;
  numberOfAyahs: number;
  revelationType: string;
}

interface AyahData {
  number: number;
  numberInSurah: number;
  text: string;
  surah: {
    number: number;
    name: string;
  };
  juz: number;
  page: number;
}

async function fetchPageWithOfflineFallback(pageNum: number): Promise<AyahData[]> {
  if (pageNum < 1 || pageNum > 604) return [];
  const url = `https://api.alquran.cloud/v1/page/${pageNum}/quran-uthmani`;

  if (typeof caches !== 'undefined') {
    try {
      const cache = await caches.open(OFFLINE_TEXT_CACHE);
      const cached = await cache.match(url);
      if (cached) {
        const json = await cached.json();
        if (json.code === 200 && Array.isArray(json.data?.ayahs)) {
          return json.data.ayahs;
        }
      }
    } catch {
      // fall through
    }
  }

  const res = await fetch(url);
  if (!res.ok) throw new Error('Network error');
  const json = await res.json();
  if (json.code === 200 && Array.isArray(json.data?.ayahs)) {
    return json.data.ayahs;
  }
  throw new Error('Invalid page data');
}

export function QuranMushaf() {
  const [surahs, setSurahs] = useState<SurahMeta[]>([]);
  const [selectedSurah, setSelectedSurah] = useState<number>(1);
  const [selectedReciterId, setSelectedReciterId] = useState<string>('abdulbasit');
  const [selectedRiwayah, setSelectedRiwayah] = useState<RiwayahId>('hafs');
  const [currentPage, setCurrentPage] = useState<number>(1);

  const [ayahs, setAyahs] = useState<AyahData[]>([]);
  const [nextPageAyahs, setNextPageAyahs] = useState<AyahData[]>([]);
  const [prevPageAyahs, setPrevPageAyahs] = useState<AyahData[]>([]);
  const [loadingPage, setLoadingPage] = useState<boolean>(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Verse Range controls
  const [fromAyah, setFromAyah] = useState<number>(1);
  const [toAyah, setToAyah] = useState<number>(7);

  // Offline download state (0-100%)
  const [downloadProgress, setDownloadProgress] = useState<number | null>(null);
  const [offlineRecords, setOfflineRecords] = useState<Record<string, OfflineDownloadRecord>>({});
  const [downloadError, setDownloadError] = useState<string | null>(null);

  // Realistic 3D Page-Flipping Physics state
  const [flipDirection, setFlipDirection] = useState<'next' | 'prev' | null>(null);
  const [flipProgress, setFlipProgress] = useState<number>(0); // 0..1
  const [isAnimatingFlip, setIsAnimatingFlip] = useState<boolean>(false);

  const pointerStartRef = useRef<{ x: number; y: number; active: boolean } | null>(null);
  const activePointersRef = useRef<Set<number>>(new Set());
  const pageContainerRef = useRef<HTMLDivElement | null>(null);
  const activeAyahElemRef = useRef<HTMLButtonElement | null>(null);
  const lastSyncedSurahRef = useRef<number>(1);

  const player = useGaplessQuranPlayer();

  const resolvedAudio = useMemo(
    () => resolveReciterAndStream(selectedReciterId, selectedRiwayah),
    [selectedReciterId, selectedRiwayah]
  );

  // Load 114 Surahs list & saved offline download records
  useEffect(() => {
    let cancelled = false;
    fetch('https://api.alquran.cloud/v1/surah')
      .then((r) => r.json())
      .then((json) => {
        if (!cancelled && json.code === 200 && Array.isArray(json.data)) {
          setSurahs(json.data);
        }
      })
      .catch(() => {});

    getAllOfflineDownloads().then((records) => {
      if (cancelled) return;
      const map: Record<string, OfflineDownloadRecord> = {};
      for (const r of records) map[r.key] = r;
      setOfflineRecords(map);
    });

    return () => {
      cancelled = true;
    };
  }, []);

  // Load current page + adjacent next/prev pages so 3D page turn reveals real underneath text immediately
  useEffect(() => {
    let cancelled = false;

    const loadCurrentAndAdjacent = async () => {
      setLoadingPage(true);
      setErrorMsg(null);
      try {
        const curAyahs = await fetchPageWithOfflineFallback(currentPage);
        if (cancelled) return;
        setAyahs(curAyahs);

        if (curAyahs[0]?.surah?.number) {
          const sNum = curAyahs[0].surah.number;
          setSelectedSurah(sNum);
          const meta = surahs.find((s) => s.number === sNum);
          if (meta && lastSyncedSurahRef.current !== sNum) {
            lastSyncedSurahRef.current = sNum;
            setFromAyah(1);
            setToAyah(meta.numberOfAyahs);
          }
        }

        // Prefetch adjacent pages silently in background for 3D page reveal
        if (currentPage < 604) {
          fetchPageWithOfflineFallback(currentPage + 1)
            .then((data) => {
              if (!cancelled) setNextPageAyahs(data);
            })
            .catch(() => {
              if (!cancelled) setNextPageAyahs([]);
            });
        } else {
          setNextPageAyahs([]);
        }

        if (currentPage > 1) {
          fetchPageWithOfflineFallback(currentPage - 1)
            .then((data) => {
              if (!cancelled) setPrevPageAyahs(data);
            })
            .catch(() => {
              if (!cancelled) setPrevPageAyahs([]);
            });
        } else {
          setPrevPageAyahs([]);
        }
      } catch {
        if (!cancelled) {
          setErrorMsg('تعذر تحميل صفحة المصحف. تأكد من الاتصال بالإنترنت أو حمّل السورة أوفلاين.');
        }
      } finally {
        if (!cancelled) setLoadingPage(false);
      }
    };

    const t = setTimeout(loadCurrentAndAdjacent, 0);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [currentPage, surahs]);

  // Auto smooth-scroll & auto-turn Mushaf page when recited Ayah updates
  useEffect(() => {
    if (!player.activeTarget || player.activeTarget.mode !== 'ayah') return;
    const targetSurah = player.activeTarget.surahNumber;
    const targetAyah = player.activeTarget.ayahInSurah;

    const matchInCurrentPage = ayahs.find(
      (a) => a.surah.number === targetSurah && a.numberInSurah === targetAyah
    );

    if (matchInCurrentPage && activeAyahElemRef.current) {
      activeAyahElemRef.current.scrollIntoView({
        behavior: 'smooth',
        block: 'center',
      });
    } else if (!loadingPage && ayahs.length > 0) {
      // Find which page has that Ayah and flip to it
      fetch(`https://api.alquran.cloud/v1/ayah/${targetSurah}:${targetAyah}/quran-uthmani`)
        .then((r) => r.json())
        .then((json) => {
          const p = json?.data?.page;
          if (typeof p === 'number' && p !== currentPage) {
            setCurrentPage(p);
          }
        })
        .catch(async () => {
          const idb = await getSurahTextFromIDB(targetSurah);
          const found = idb?.ayahs.find((a) => a.numberInSurah === targetAyah);
          if (found && found.page !== currentPage) {
            setCurrentPage(found.page);
          }
        });
    }
  }, [player.activeTarget, ayahs, currentPage, loadingPage]);

  // Select Surah & jump to its first page
  const handleSelectSurah = async (surahNumber: number) => {
    lastSyncedSurahRef.current = surahNumber;
    setSelectedSurah(surahNumber);
    const meta = surahs.find((s) => s.number === surahNumber);
    setFromAyah(1);
    if (meta) setToAyah(meta.numberOfAyahs);

    // Check IndexedDB first for instant offline jump
    const idb = await getSurahTextFromIDB(surahNumber);
    if (idb && idb.ayahs[0]?.page) {
      setCurrentPage(idb.ayahs[0].page);
      return;
    }

    try {
      const res = await fetch(`https://api.alquran.cloud/v1/surah/${surahNumber}/quran-uthmani`);
      const json = await res.json();
      if (json.code === 200 && json.data?.ayahs?.[0]?.page) {
        setCurrentPage(json.data.ayahs[0].page);
      }
    } catch {
      // ignore if offline and not cached
    }
  };

  // Animated 3D Page Turn helper
  const triggerAnimatedFlip = useCallback(
    (dir: 'next' | 'prev') => {
      if (isAnimatingFlip) return;
      if (dir === 'next' && currentPage >= 604) return;
      if (dir === 'prev' && currentPage <= 1) return;

      setFlipDirection(dir);
      setIsAnimatingFlip(true);
      setFlipProgress(1);

      setTimeout(() => {
        setCurrentPage((p) => (dir === 'next' ? Math.min(604, p + 1) : Math.max(1, p - 1)));
        setFlipDirection(null);
        setFlipProgress(0);
        setIsAnimatingFlip(false);
      }, 310);
    },
    [currentPage, isAnimatingFlip]
  );

  // Touch / Pointer Realistic 3D Page Drag Handlers (multi-touch safe for user pinch-zoom)
  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    activePointersRef.current.add(e.pointerId);
    if (activePointersRef.current.size > 1 || !e.isPrimary || isAnimatingFlip) {
      pointerStartRef.current = null;
      return;
    }
    pointerStartRef.current = { x: e.clientX, y: e.clientY, active: true };
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (
      activePointersRef.current.size > 1 ||
      !pointerStartRef.current?.active ||
      isAnimatingFlip
    ) {
      return;
    }
    const dx = e.clientX - pointerStartRef.current.x;
    const dy = e.clientY - pointerStartRef.current.y;

    // Ignore vertical scrolling gestures
    if (Math.abs(dy) > Math.abs(dx) && Math.abs(dx) < 18) return;

    const width = pageContainerRef.current?.offsetWidth || 340;
    // RTL Mushaf: dragging right (dx > 0) turns to Next page; dragging left (dx < 0) turns to Prev page
    if (dx > 12 && currentPage < 604) {
      setFlipDirection('next');
      setFlipProgress(Math.min(1, Math.max(0, dx / (width * 0.72))));
    } else if (dx < -12 && currentPage > 1) {
      setFlipDirection('prev');
      setFlipProgress(Math.min(1, Math.max(0, Math.abs(dx) / (width * 0.72))));
    }
  };

  const finishDrag = (e?: React.PointerEvent<HTMLDivElement>) => {
    if (e) {
      activePointersRef.current.delete(e.pointerId);
    } else {
      activePointersRef.current.clear();
    }
    if (!pointerStartRef.current?.active) return;
    pointerStartRef.current = null;

    if (!flipDirection) return;

    if (flipProgress >= 0.25) {
      const dir = flipDirection;
      setIsAnimatingFlip(true);
      setFlipProgress(1);
      setTimeout(() => {
        setCurrentPage((p) => (dir === 'next' ? Math.min(604, p + 1) : Math.max(1, p - 1)));
        setFlipDirection(null);
        setFlipProgress(0);
        setIsAnimatingFlip(false);
      }, 240);
    } else {
      setIsAnimatingFlip(true);
      setFlipProgress(0);
      setTimeout(() => {
        setFlipDirection(null);
        setIsAnimatingFlip(false);
      }, 200);
    }
  };

  const activeSurahMeta = surahs.find((s) => s.number === selectedSurah) || {
    number: selectedSurah,
    name: ayahs[0]?.surah?.name || 'سُورَةُ ٱلْفَاتِحَةِ',
    englishName: 'Al-Fatiha',
    numberOfAyahs: 7,
    revelationType: 'Meccan',
  };

  const currentDownloadKey = buildDownloadKey(
    resolvedAudio.reciter.id,
    resolvedAudio.stream.riwayah,
    activeSurahMeta.number
  );
  const isCurrentSurahOffline = Boolean(offlineRecords[currentDownloadKey]);

  const handleDownloadOffline = async () => {
    if (downloadProgress !== null) return;
    setDownloadError(null);
    setDownloadProgress(0);
    try {
      const record = await downloadSurahForOffline({
        surahNumber: activeSurahMeta.number,
        surahName: activeSurahMeta.name,
        ayahCount: activeSurahMeta.numberOfAyahs,
        reciterId: resolvedAudio.reciter.id,
        reciterName: resolvedAudio.reciter.name,
        stream: resolvedAudio.stream,
        onProgress: (pct) => setDownloadProgress(pct),
      });
      setOfflineRecords((prev) => ({ ...prev, [record.key]: record }));
      setTimeout(() => setDownloadProgress(null), 1200);
    } catch {
      setDownloadProgress(null);
      setDownloadError('تعذر إكمال التحميل. تحقق من اتصالك بالإنترنت.');
    }
  };

  const startSurahPlayback = (customFrom?: number) => {
    const start = Math.max(1, Math.min(activeSurahMeta.numberOfAyahs, customFrom ?? fromAyah));
    const end = Math.max(start, Math.min(activeSurahMeta.numberOfAyahs, toAyah));
    player.startRecitation({
      surahNumber: activeSurahMeta.number,
      surahName: activeSurahMeta.name,
      fromAyah: start,
      toAyah: end,
      reciter: resolvedAudio.reciter,
      stream: resolvedAudio.stream,
    });
  };

  const activeSurahHeader = ayahs[0]?.surah?.name || activeSurahMeta.name;
  const activeJuz = ayahs[0]?.juz || 1;
  const underneathAyahs =
    flipDirection === 'next' ? nextPageAyahs : flipDirection === 'prev' ? prevPageAyahs : [];

  // 3D Page Transform Angle & Dynamic Fold Shadow
  const rotationDeg =
    flipDirection === 'next'
      ? flipProgress * 165
      : flipDirection === 'prev'
        ? -flipProgress * 165
        : 0;
  const shadowOpacity = Math.sin(flipProgress * Math.PI) * 0.45;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="text-lg sm:text-xl font-bold flex items-center gap-2">
            <BookOpen className="h-5 w-5 text-amber-500 shrink-0" />
            <span>المصحف الشريف التفاعلي</span>
          </h2>
          <p className="text-xs text-slate-600 dark:text-slate-300 mt-0.5">
            صفحة <span className="font-mono-num font-bold">{currentPage}</span> من ٦٠٤ · الجزء{' '}
            <span className="font-mono-num font-bold">{activeJuz}</span> · اسحب الورقة للتقليب
          </p>
        </div>

        {/* Offline Download Button with Real 0-100% Progress */}
        <button
          type="button"
          onClick={handleDownloadOffline}
          disabled={downloadProgress !== null}
          className={`min-h-[44px] inline-flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-bold text-white transition-colors ${
            isCurrentSurahOffline
              ? 'bg-emerald-700 hover:bg-emerald-600'
              : 'bg-amber-600 hover:bg-amber-500'
          }`}
        >
          {downloadProgress !== null ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin shrink-0" />
              <span className="font-mono-num">جارٍ التحميل {downloadProgress}%</span>
            </>
          ) : isCurrentSurahOffline ? (
            <>
              <CheckCircle2 className="h-4 w-4 shrink-0" />
              <span>محمّلة أوفلاين 100%</span>
            </>
          ) : (
            <>
              <Download className="h-4 w-4 shrink-0" />
              <span>تحميل السورة / القراءة أوفلاين</span>
            </>
          )}
        </button>
      </div>

      {/* Real Progress Bar during Offline Download */}
      {downloadProgress !== null && (
        <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-3 space-y-1.5">
          <div className="flex items-center justify-between text-xs font-bold">
            <span>
              حفظ {activeSurahMeta.name} — {resolvedAudio.reciter.name} (
              {resolvedAudio.stream.editionLabel})
            </span>
            <span className="font-mono-num text-amber-600 dark:text-amber-400">
              {downloadProgress}%
            </span>
          </div>
          <div className="h-2.5 w-full overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800">
            <div
              className="h-full rounded-full bg-emerald-600 transition-all duration-150"
              style={{ width: `${downloadProgress}%` }}
            />
          </div>
        </div>
      )}

      {downloadError && (
        <div className="flex items-center gap-2 rounded-xl border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-xs font-semibold text-rose-700 dark:text-rose-300">
          <WifiOff className="h-4 w-4 shrink-0" />
          <span>{downloadError}</span>
        </div>
      )}

      {/* Strict 2-Select Row Rule: 2 selects side-by-side, 3rd select full-width underneath */}
      <div className="grid grid-cols-2 gap-2">
        <select
          value={selectedSurah}
          onChange={(e) => handleSelectSurah(Number(e.target.value))}
          aria-label="اختيار السورة"
          className="min-h-[44px] w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-2.5 py-2 text-base sm:text-sm font-bold focus:outline-none focus:ring-2 focus:ring-amber-500"
        >
          {surahs.length === 0 ? (
            <option value={1}>١. سورة الفاتحة</option>
          ) : (
            surahs.map((s) => (
              <option key={s.number} value={s.number}>
                {s.number}. {s.name} ({s.numberOfAyahs} آية)
              </option>
            ))
          )}
        </select>

        <select
          value={resolvedAudio.reciter.id}
          onChange={(e) => {
            player.stop();
            setSelectedReciterId(e.target.value);
          }}
          aria-label="اختيار القارئ"
          className="min-h-[44px] w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-2.5 py-2 text-base sm:text-sm font-bold focus:outline-none focus:ring-2 focus:ring-amber-500"
        >
          {QURAN_RECITERS.map((r) => (
            <option key={r.id} value={r.id}>
              {r.name}
            </option>
          ))}
        </select>

        {/* 3rd Select: Full-width below the first two */}
        <select
          value={selectedRiwayah}
          onChange={(e) => {
            player.stop();
            setSelectedRiwayah(e.target.value as RiwayahId);
          }}
          aria-label="اختيار الرواية والقراءة"
          className="col-span-2 w-full min-h-[44px] rounded-xl border border-amber-500/35 bg-white dark:bg-slate-900 px-2.5 py-2 text-base sm:text-sm font-bold focus:outline-none focus:ring-2 focus:ring-amber-500"
        >
          {RIWAYAH_OPTIONS.map((rw) => (
            <option key={rw.id} value={rw.id}>
              {rw.label}
            </option>
          ))}
        </select>
      </div>

      {/* Verse Range & Reciter Info Bar */}
      <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/75 dark:bg-slate-900/75 p-3 space-y-2.5">
        <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
          <span className="font-bold text-emerald-700 dark:text-emerald-300">
            القارئ النشط: {resolvedAudio.reciter.name} · {resolvedAudio.stream.editionLabel}
          </span>
          {player.activeTarget && (
            <span className="font-mono-num font-bold text-amber-600 dark:text-amber-400">
              {player.activeTarget.mode === 'ayah'
                ? `الآية ${player.activeTarget.ayahInSurah} من ${player.activeTarget.toAyah}`
                : `تلاوة السورة كاملة (${player.surahProgressPct}%)`}
            </span>
          )}
        </div>

        {/* Verse Range Pickers (16px on mobile prevents browser auto-zoom on focus) */}
        <div className="grid grid-cols-3 gap-2 items-center">
          <label className="flex items-center gap-1.5 text-xs font-bold">
            <span className="shrink-0">من آية:</span>
            <input
              type="number"
              min={1}
              max={activeSurahMeta.numberOfAyahs}
              value={fromAyah}
              onChange={(e) => {
                const v = Math.max(1, Math.min(activeSurahMeta.numberOfAyahs, Number(e.target.value) || 1));
                setFromAyah(v);
                if (toAyah < v) setToAyah(v);
              }}
              className="min-h-[40px] w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 px-2 text-center font-mono-num text-base sm:text-xs font-bold"
            />
          </label>

          <label className="flex items-center gap-1.5 text-xs font-bold">
            <span className="shrink-0">إلى آية:</span>
            <input
              type="number"
              min={fromAyah}
              max={activeSurahMeta.numberOfAyahs}
              value={toAyah}
              onChange={(e) => {
                const v = Math.max(
                  fromAyah,
                  Math.min(activeSurahMeta.numberOfAyahs, Number(e.target.value) || activeSurahMeta.numberOfAyahs)
                );
                setToAyah(v);
              }}
              className="min-h-[40px] w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 px-2 text-center font-mono-num text-base sm:text-xs font-bold"
            />
          </label>

          <button
            type="button"
            onClick={() => {
              setFromAyah(1);
              setToAyah(activeSurahMeta.numberOfAyahs);
            }}
            className="min-h-[40px] rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-2 py-1.5 text-xs font-bold hover:border-amber-500/50 transition-colors"
          >
            السورة كاملة
          </button>
        </div>

        {/* Strict 4-Button Mushaf Control Row */}
        <div className="grid grid-cols-4 gap-1.5">
          <button
            type="button"
            onClick={() => triggerAnimatedFlip('prev')}
            disabled={currentPage <= 1 || isAnimatingFlip}
            className="min-h-[44px] flex items-center justify-center gap-1 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-1 py-2 text-[10px] sm:text-xs font-bold leading-tight text-center break-words disabled:opacity-40"
          >
            <ChevronRight className="h-3.5 w-3.5 shrink-0" />
            <span>الصفحة السابقة</span>
          </button>

          <button
            type="button"
            onClick={() => (player.activeTarget ? player.stop() : startSurahPlayback())}
            disabled={loadingPage}
            className={`min-h-[44px] flex items-center justify-center gap-1 rounded-xl px-1 py-2 text-[10px] sm:text-xs font-bold leading-tight text-center break-words text-white transition-colors ${
              player.activeTarget ? 'bg-rose-600 hover:bg-rose-500' : 'bg-emerald-700 hover:bg-emerald-600'
            }`}
          >
            {player.activeTarget ? (
              <>
                <Square className="h-3.5 w-3.5 shrink-0 fill-current" />
                <span>إيقاف التلاوة</span>
              </>
            ) : (
              <>
                <Play className="h-3.5 w-3.5 shrink-0 fill-current" />
                <span>تلاوة متصلة</span>
              </>
            )}
          </button>

          <button
            type="button"
            onClick={() => (player.activeTarget ? player.togglePlayPause() : startSurahPlayback())}
            className="min-h-[44px] flex items-center justify-center gap-1 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-1 py-2 text-[10px] sm:text-xs font-bold leading-tight text-center break-words"
          >
            {player.isBuffering ? (
              <Loader2 className="h-3.5 w-3.5 shrink-0 animate-spin text-amber-500" />
            ) : player.isPlaying ? (
              <Pause className="h-3.5 w-3.5 shrink-0 text-amber-500" />
            ) : (
              <Volume2 className="h-3.5 w-3.5 shrink-0 text-amber-500" />
            )}
            <span>{player.isPlaying ? 'إيقاف مؤقت' : 'استئناف'}</span>
          </button>

          <button
            type="button"
            onClick={() => triggerAnimatedFlip('next')}
            disabled={currentPage >= 604 || isAnimatingFlip}
            className="min-h-[44px] flex items-center justify-center gap-1 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-1 py-2 text-[10px] sm:text-xs font-bold leading-tight text-center break-words disabled:opacity-40"
          >
            <span>الصفحة التالية</span>
            <ChevronLeft className="h-3.5 w-3.5 shrink-0" />
          </button>
        </div>

        {player.audioError && (
          <p className="text-xs font-semibold text-rose-600 dark:text-rose-400">
            {player.audioError}
          </p>
        )}
      </div>

      {/* Realistic 3D Page-Flipping Mushaf Stage (Compact readable mobile frame + manual pinch-zoom allowed) */}
      <div
        ref={pageContainerRef}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={(e) => finishDrag(e)}
        onPointerCancel={(e) => finishDrag(e)}
        style={{ perspective: '1800px', touchAction: 'pan-y pinch-zoom' }}
        className="relative overflow-hidden rounded-2xl sm:rounded-3xl select-none"
      >
        {/* Underneath Layer: Next or Previous Page Revealed Live During Flip */}
        {flipDirection && underneathAyahs.length > 0 && (
          <div
            aria-hidden="true"
            className="absolute inset-0 z-0 rounded-2xl sm:rounded-3xl border-2 border-amber-600/35 bg-[#fbf6e9] dark:bg-[#101826] p-2.5 sm:p-7 text-slate-900 dark:text-amber-50 overflow-hidden"
          >
            <div className="mb-2 sm:mb-4 flex items-center justify-between border-b border-amber-600/25 pb-1.5 sm:pb-2.5 text-[11px] sm:text-sm font-bold text-amber-900 dark:text-amber-300">
              <span>{underneathAyahs[0]?.surah?.name || ''}</span>
              <span className="font-mono-num">
                صفحة {flipDirection === 'next' ? currentPage + 1 : currentPage - 1}
              </span>
            </div>
            <div dir="rtl" className="font-quran text-[15px] sm:text-[26px] leading-[1.9] sm:leading-[2.35] text-justify">
              {underneathAyahs.map((a) => (
                <span key={a.number}>
                  {a.text}{' '}
                  <span className="px-0.5 sm:px-1 text-[11px] sm:text-base font-bold text-amber-700 dark:text-amber-400 font-mono-num">
                    ﴿{a.numberInSurah.toLocaleString('ar-EG')}﴾
                  </span>{' '}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Top Turning Page Layer */}
        <div
          style={{
            transform: flipDirection
              ? `rotateY(${rotationDeg}deg)`
              : 'rotateY(0deg)',
            transformOrigin: flipDirection === 'next' ? 'left center' : 'right center',
            transformStyle: 'preserve-3d',
            transition: isAnimatingFlip ? 'transform 280ms cubic-bezier(0.22, 1, 0.36, 1)' : 'none',
            backfaceVisibility: 'hidden',
          }}
          className="relative z-10 rounded-2xl sm:rounded-3xl border-2 border-amber-600/35 bg-[#fbf6e9] dark:bg-[#101826] p-2.5 sm:p-7 shadow-xl text-slate-900 dark:text-amber-50"
        >
          {/* Dynamic Fold Shadow Overlay during Flip */}
          {flipDirection && (
            <div
              aria-hidden="true"
              style={{
                opacity: shadowOpacity,
                background:
                  flipDirection === 'next'
                    ? 'linear-gradient(to right, rgba(0,0,0,0.45), transparent 55%)'
                    : 'linear-gradient(to left, rgba(0,0,0,0.45), transparent 55%)',
              }}
              className="pointer-events-none absolute inset-0 z-20 rounded-2xl sm:rounded-3xl"
            />
          )}

          <div className="mb-2 sm:mb-4 flex items-center justify-between border-b border-amber-600/25 pb-1.5 sm:pb-2.5 text-[11px] sm:text-sm font-bold text-amber-900 dark:text-amber-300">
            <span>{activeSurahHeader}</span>
            <span className="font-mono-num">صفحة {currentPage}</span>
          </div>

          {loadingPage ? (
            <div className="flex flex-col items-center justify-center py-10 sm:py-14 gap-2 text-slate-500">
              <Loader2 className="h-6 w-6 sm:h-7 sm:w-7 animate-spin text-amber-600" />
              <span className="text-xs sm:text-sm font-semibold">جارٍ فتح صفحة المصحف...</span>
            </div>
          ) : errorMsg ? (
            <div className="py-10 text-center text-sm text-rose-600 dark:text-rose-400 font-semibold">
              {errorMsg}
            </div>
          ) : (
            <div
              dir="rtl"
              className="font-quran text-[15px] sm:text-[26px] leading-[1.9] sm:leading-[2.35] text-justify tracking-normal select-text"
            >
              {ayahs.map((ayah, idx) => {
                const isRecited =
                  player.activeTarget?.mode === 'ayah' &&
                  player.activeTarget.surahNumber === ayah.surah.number &&
                  player.activeTarget.ayahInSurah === ayah.numberInSurah;

                return (
                  <React.Fragment key={ayah.number}>
                    {ayah.numberInSurah === 1 && idx > 0 && (
                      <div className="my-2.5 sm:my-4 rounded-xl border border-amber-600/30 bg-amber-500/10 py-1 text-center text-sm sm:text-lg font-bold text-amber-800 dark:text-amber-300">
                        {ayah.surah.name}
                      </div>
                    )}
                    <button
                      ref={isRecited ? activeAyahElemRef : undefined}
                      type="button"
                      onClick={() => {
                        setSelectedSurah(ayah.surah.number);
                        setFromAyah(ayah.numberInSurah);
                        const meta = surahs.find((s) => s.number === ayah.surah.number);
                        const endAyah = meta ? meta.numberOfAyahs : ayah.numberInSurah;
                        setToAyah(endAyah);
                        player.startRecitation({
                          surahNumber: ayah.surah.number,
                          surahName: ayah.surah.name,
                          fromAyah: ayah.numberInSurah,
                          toAyah: endAyah,
                          reciter: resolvedAudio.reciter,
                          stream: resolvedAudio.stream,
                        });
                      }}
                      title="اضغط للتلاوة المتصلة من هذه الآية"
                      className={`inline text-right transition-colors rounded-lg px-0.5 sm:px-1 ${
                        isRecited
                          ? 'bg-amber-400/40 dark:bg-emerald-500/35 ring-2 ring-amber-500/70 text-emerald-950 dark:text-amber-100'
                          : 'hover:bg-amber-500/10'
                      }`}
                    >
                      {ayah.text}{' '}
                      <span className="inline-flex items-center justify-center px-0.5 sm:px-1 text-[11px] sm:text-base font-bold text-amber-700 dark:text-amber-400 font-mono-num">
                        ﴿{ayah.numberInSurah.toLocaleString('ar-EG')}﴾
                      </span>{' '}
                    </button>
                  </React.Fragment>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
