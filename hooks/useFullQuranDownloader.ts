'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import {
  OfflineDownloadRecord,
  StorageUsageStats,
  SurahIndexItem,
  buildDownloadKey,
  clearAllOfflineCaches,
  deleteOfflineRecitationBundle,
  downloadSurahForOffline,
  fetchAllSurahMetadata,
  getAllOfflineDownloads,
  getOfflineStorageStats,
} from '@/lib/offline-quran-db';
import {
  RiwayahId,
  resolveReciterAndStream,
} from '@/lib/data/quran-reciters';

export type QueueDownloaderStatus = 'idle' | 'running' | 'paused' | 'completed' | 'error';

export function useFullQuranDownloader() {
  const [status, setStatus] = useState<QueueDownloaderStatus>('idle');
  const [downloads, setDownloads] = useState<OfflineDownloadRecord[]>([]);
  const [storageStats, setStorageStats] = useState<StorageUsageStats>({
    usageBytes: 0,
    quotaBytes: 0,
    quranAudioEntries: 0,
    quranTextEntries: 0,
    mediaEntries: 0,
  });

  const [activeReciterId, setActiveReciterId] = useState<string>('abdulbasit');
  const [activeRiwayah, setActiveRiwayah] = useState<RiwayahId>('hafs');
  const [currentSurahNumber, setCurrentSurahNumber] = useState<number | null>(null);
  const [currentSurahName, setCurrentSurahName] = useState<string>('');
  const [currentSurahPct, setCurrentSurahPct] = useState<number>(0);
  const [completedCount, setCompletedCount] = useState<number>(0);
  const [totalCount, setTotalCount] = useState<number>(114);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const pauseFlagRef = useRef<boolean>(false);
  const cancelFlagRef = useRef<boolean>(false);
  const isRunningRef = useRef<boolean>(false);
  const surahsCacheRef = useRef<SurahIndexItem[] | null>(null);

  const refreshStats = useCallback(async () => {
    const [allRecords, stats] = await Promise.all([
      getAllOfflineDownloads(),
      getOfflineStorageStats(),
    ]);
    setDownloads(allRecords);
    setStorageStats(stats);
    return allRecords;
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      refreshStats().catch(() => {});
    }, 0);
    return () => clearTimeout(timer);
  }, [refreshStats]);

  const runQueue = useCallback(
    async (reciterId: string, riwayah: RiwayahId) => {
      if (isRunningRef.current) return;
      isRunningRef.current = true;
      pauseFlagRef.current = false;
      cancelFlagRef.current = false;

      const resolved = resolveReciterAndStream(reciterId, riwayah);
      setActiveReciterId(resolved.reciter.id);
      setActiveRiwayah(resolved.stream.riwayah);
      setStatus('running');
      setErrorMsg(null);

      try {
        let surahs = surahsCacheRef.current;
        if (!surahs || surahs.length !== 114) {
          surahs = await fetchAllSurahMetadata();
          surahsCacheRef.current = surahs;
        }
        setTotalCount(surahs.length);

        const existing = await getAllOfflineDownloads();
        const existingKeys = new Set(existing.map((d) => d.key));

        let doneForSelection = surahs.filter((s) =>
          existingKeys.has(buildDownloadKey(resolved.reciter.id, resolved.stream.riwayah, s.number))
        ).length;
        setCompletedCount(doneForSelection);

        for (const surah of surahs) {
          if (cancelFlagRef.current) {
            setStatus('idle');
            setCurrentSurahNumber(null);
            setCurrentSurahName('');
            setCurrentSurahPct(0);
            isRunningRef.current = false;
            await refreshStats();
            return;
          }

          if (pauseFlagRef.current) {
            setStatus('paused');
            isRunningRef.current = false;
            await refreshStats();
            return;
          }

          const key = buildDownloadKey(
            resolved.reciter.id,
            resolved.stream.riwayah,
            surah.number
          );
          if (existingKeys.has(key)) {
            continue;
          }

          setCurrentSurahNumber(surah.number);
          setCurrentSurahName(surah.name);
          setCurrentSurahPct(0);

          await downloadSurahForOffline({
            surahNumber: surah.number,
            surahName: surah.name,
            ayahCount: surah.numberOfAyahs,
            reciterId: resolved.reciter.id,
            reciterName: resolved.reciter.name,
            stream: resolved.stream,
            onProgress: (pct) => {
              setCurrentSurahPct(pct);
            },
          });

          existingKeys.add(key);
          doneForSelection += 1;
          setCompletedCount(doneForSelection);
          await refreshStats();

          if (cancelFlagRef.current) {
            setStatus('idle');
            setCurrentSurahNumber(null);
            setCurrentSurahName('');
            setCurrentSurahPct(0);
            isRunningRef.current = false;
            return;
          }

          if (pauseFlagRef.current) {
            setStatus('paused');
            isRunningRef.current = false;
            return;
          }
        }

        setStatus('completed');
        setCurrentSurahNumber(null);
        setCurrentSurahName('تم اكتمال المصحف كاملاً');
        setCurrentSurahPct(100);
      } catch (err) {
        setStatus('error');
        setErrorMsg(
          err instanceof Error
            ? err.message
            : 'توقف التحميل مؤقتاً بسبب انقطاع الإنترنت. يمكنك الاستئناف عند عودة الاتصال.'
        );
      } finally {
        isRunningRef.current = false;
        await refreshStats();
      }
    },
    [refreshStats]
  );

  const startDownload = useCallback(
    (reciterId: string, riwayah: RiwayahId) => {
      runQueue(reciterId, riwayah);
    },
    [runQueue]
  );

  const pauseDownload = useCallback(() => {
    pauseFlagRef.current = true;
    setStatus('paused');
  }, []);

  const resumeDownload = useCallback(() => {
    runQueue(activeReciterId, activeRiwayah);
  }, [activeReciterId, activeRiwayah, runQueue]);

  const cancelDownload = useCallback(() => {
    cancelFlagRef.current = true;
    pauseFlagRef.current = false;
    if (!isRunningRef.current) {
      setStatus('idle');
      setCurrentSurahNumber(null);
      setCurrentSurahName('');
      setCurrentSurahPct(0);
    }
  }, []);

  const deleteBundle = useCallback(
    async (reciterId: string, riwayah: RiwayahId) => {
      const resolved = resolveReciterAndStream(reciterId, riwayah);
      await deleteOfflineRecitationBundle(reciterId, riwayah, resolved.stream);
      await refreshStats();
    },
    [refreshStats]
  );

  const clearAll = useCallback(async () => {
    cancelFlagRef.current = true;
    await clearAllOfflineCaches();
    setStatus('idle');
    setCompletedCount(0);
    setCurrentSurahNumber(null);
    setCurrentSurahName('');
    setCurrentSurahPct(0);
    await refreshStats();
  }, [refreshStats]);

  const overallPercent =
    totalCount > 0
      ? Math.min(
          100,
          Math.round(
            ((completedCount + (status === 'running' ? currentSurahPct / 100 : 0)) / totalCount) *
              100
          )
        )
      : 0;

  return {
    status,
    downloads,
    storageStats,
    activeReciterId,
    activeRiwayah,
    currentSurahNumber,
    currentSurahName,
    currentSurahPct,
    completedCount,
    totalCount,
    overallPercent,
    errorMsg,
    startDownload,
    pauseDownload,
    resumeDownload,
    cancelDownload,
    deleteBundle,
    clearAll,
    refreshStats,
  };
}
