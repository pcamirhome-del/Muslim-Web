'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  BookText,
  UserCheck,
  Loader2,
  Play,
  Pause,
  Volume2,
  ChevronDown,
  BookOpen,
  RotateCcw,
  RotateCw,
  Download,
  CheckCircle2,
  Square,
} from 'lucide-react';
import { QURAN_JUZ_LIST, TAFSIR_BOOKS, TafsirBookId } from '@/lib/data/tafsir-books';
import { OFFLINE_MEDIA_CACHE, OFFLINE_TEXT_CACHE } from '@/lib/offline-quran-db';

interface SurahMeta {
  number: number;
  name: string;
  numberOfAyahs: number;
}

interface TafsirVerseItem {
  numberInSurah: number;
  juz: number;
  page: number;
  ayahText: string;
  tafsirText: string;
}

interface SharawiEpisode {
  fileName: string;
  label: string;
  url: string;
  sizeMB: string;
}

interface TafsirResponse {
  book: TafsirBookId;
  surahNumber: number;
  totalAyahs: number;
  offset: number;
  hasMore: boolean;
  items: TafsirVerseItem[];
  sharawiEpisodes?: SharawiEpisode[];
  error?: string;
}

function formatAudioClock(secs: number): string {
  if (!Number.isFinite(secs) || secs < 0) return '00:00';
  const total = Math.floor(secs);
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  if (h > 0) {
    return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  }
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

export function TafsirSection() {
  const [surahs, setSurahs] = useState<SurahMeta[]>([]);
  const [selectedBook, setSelectedBook] = useState<TafsirBookId>('muyassar');
  const [selectedSurah, setSelectedSurah] = useState<number>(1);
  const [selectedJuz, setSelectedJuz] = useState<number>(1);
  const [selectedAyah, setSelectedAyah] = useState<number>(0); // 0 = السورة كاملة (أو دفعة)

  const [items, setItems] = useState<TafsirVerseItem[]>([]);
  const [sharawiEpisodes, setSharawiEpisodes] = useState<SharawiEpisode[]>([]);
  const [totalAyahs, setTotalAyahs] = useState<number>(7);
  const [offset, setOffset] = useState<number>(0);
  const [hasMore, setHasMore] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);
  const [loadingMore, setLoadingMore] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Author bio modal/card toggled on clicking any Tafsir card
  const [activeAuthorCardId, setActiveAuthorCardId] = useState<number | null>(null);

  // Audio player for Sharawi episodes (with Seek bar & +5s/-5s)
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const episodeBlobUrlRef = useRef<string | null>(null);
  const pendingSeekRef = useRef<number | null>(null);
  const [activeEpisode, setActiveEpisode] = useState<SharawiEpisode | null>(null);
  const [isAudioPlaying, setIsAudioPlaying] = useState<boolean>(false);
  const [isAudioBuffering, setIsAudioBuffering] = useState<boolean>(false);
  const [audioCurrentTime, setAudioCurrentTime] = useState<number>(0);
  const [audioDuration, setAudioDuration] = useState<number>(0);

  // Offline Download state for Sharawi Audio Episodes & Written Tafsir
  const [savedEpisodeUrls, setSavedEpisodeUrls] = useState<Record<string, boolean>>({});
  const [downloadingEpisodes, setDownloadingEpisodes] = useState<Record<string, number>>({});
  const [savedTafsirKeys, setSavedTafsirKeys] = useState<Record<string, boolean>>({});
  const [savingTafsir, setSavingTafsir] = useState<boolean>(false);

  const bookMeta = TAFSIR_BOOKS.find((b) => b.id === selectedBook) || TAFSIR_BOOKS[0];
  const currentTafsirSaveKey = `${selectedBook}:${selectedSurah}:${selectedAyah}`;

  // Fetch 114 Surah metadata list once
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

    return () => {
      cancelled = true;
    };
  }, []);

  // Inspect cached Sharawi episodes & saved Tafsir on mount
  useEffect(() => {
    const t = setTimeout(async () => {
      if (typeof caches === 'undefined') return;
      try {
        const [mediaCache, textCache] = await Promise.all([
          caches.open(OFFLINE_MEDIA_CACHE),
          caches.open(OFFLINE_TEXT_CACHE),
        ]);
        const [mediaKeys, textKeys] = await Promise.all([
          mediaCache.keys(),
          textCache.keys(),
        ]);

        const epMap: Record<string, boolean> = {};
        for (const req of mediaKeys) {
          epMap[req.url] = true;
        }
        setSavedEpisodeUrls(epMap);

        const tafsirMap: Record<string, boolean> = {};
        for (const req of textKeys) {
          if (req.url.includes('/api/tafsir')) {
            const u = new URL(req.url);
            const b = u.searchParams.get('book') || 'muyassar';
            const s = u.searchParams.get('s') || '1';
            const a = u.searchParams.get('a') || '0';
            tafsirMap[`${b}:${s}:${a}`] = true;
          }
        }
        setSavedTafsirKeys(tafsirMap);
      } catch {
        // ignore cache scan errors
      }
    }, 0);
    return () => clearTimeout(t);
  }, []);

  // Reactive fetch whenever Book, Surah, or Ayah changes (with Offline Cache fallback)
  useEffect(() => {
    let cancelled = false;

    const loadTafsir = async () => {
      setLoading(true);
      setErrorMsg(null);
      setOffset(0);
      setActiveAuthorCardId(null);

      const apiUrl = `/api/tafsir?book=${selectedBook}&s=${selectedSurah}&a=${selectedAyah}&offset=0&limit=10`;
      try {
        const res = await fetch(apiUrl);
        const data = (await res.json()) as TafsirResponse;
        if (cancelled) return;
        if (!res.ok || data.error) {
          setErrorMsg(data.error || 'تعذر تحميل التفسير حالياً.');
          setItems([]);
          setSharawiEpisodes([]);
        } else {
          setItems(data.items || []);
          setTotalAyahs(data.totalAyahs || 7);
          setHasMore(Boolean(data.hasMore));
          setSharawiEpisodes(data.sharawiEpisodes || []);
        }
      } catch {
        // Fallback to offline saved Tafsir in CacheStorage
        if (typeof caches !== 'undefined') {
          try {
            const textCache = await caches.open(OFFLINE_TEXT_CACHE);
            const fullUrl = new URL(apiUrl, window.location.origin).toString();
            const cached = (await textCache.match(fullUrl)) || (await textCache.match(apiUrl));
            if (cached && !cancelled) {
              const data = (await cached.json()) as TafsirResponse;
              setItems(data.items || []);
              setTotalAyahs(data.totalAyahs || 7);
              setHasMore(Boolean(data.hasMore));
              setSharawiEpisodes(data.sharawiEpisodes || []);
              setLoading(false);
              return;
            }
          } catch {
            // ignore
          }
        }
        if (!cancelled) {
          setErrorMsg('تعذر الاتصال بخدمة التفسير. تحقق من الإنترنت.');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    const t = setTimeout(loadTafsir, 0);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [selectedBook, selectedSurah, selectedAyah]);

  const handleLoadMore = async () => {
    if (loadingMore || !hasMore) return;
    const nextOffset = offset + 10;
    setLoadingMore(true);
    try {
      const res = await fetch(
        `/api/tafsir?book=${selectedBook}&s=${selectedSurah}&a=0&offset=${nextOffset}&limit=10`
      );
      const data = (await res.json()) as TafsirResponse;
      if (res.ok && Array.isArray(data.items)) {
        setItems((prev) => [...prev, ...data.items]);
        setOffset(nextOffset);
        setHasMore(Boolean(data.hasMore));
      }
    } catch {
      // ignore
    } finally {
      setLoadingMore(false);
    }
  };

  const handleSelectJuz = (juzNum: number) => {
    setSelectedJuz(juzNum);
    const juzInfo = QURAN_JUZ_LIST.find((j) => j.juz === juzNum);
    if (juzInfo) {
      setSelectedSurah(juzInfo.startSurah);
      setSelectedAyah(juzInfo.startAyah);
    }
  };

  const cleanupBlobUrl = useCallback(() => {
    if (episodeBlobUrlRef.current) {
      URL.revokeObjectURL(episodeBlobUrlRef.current);
      episodeBlobUrlRef.current = null;
    }
  }, []);

  const ensureAudioInstance = useCallback(() => {
    if (audioRef.current) return audioRef.current;

    const audio = new Audio();
    audio.preload = 'metadata';

    audio.onloadedmetadata = () => {
      if (Number.isFinite(audio.duration) && audio.duration > 0) {
        setAudioDuration(audio.duration);
      }
      if (pendingSeekRef.current !== null) {
        const target = pendingSeekRef.current;
        pendingSeekRef.current = null;
        audio.currentTime = target;
        setAudioCurrentTime(target);
      }
    };

    audio.ondurationchange = () => {
      if (Number.isFinite(audio.duration) && audio.duration > 0) {
        setAudioDuration(audio.duration);
      }
    };

    audio.ontimeupdate = () => {
      setAudioCurrentTime(audio.currentTime || 0);
      if (Number.isFinite(audio.duration) && audio.duration > 0) {
        setAudioDuration(audio.duration);
      }
    };

    audio.onwaiting = () => setIsAudioBuffering(true);
    audio.oncanplay = () => setIsAudioBuffering(false);
    audio.onplaying = () => {
      setIsAudioBuffering(false);
      setIsAudioPlaying(true);
    };
    audio.onplay = () => setIsAudioPlaying(true);
    audio.onpause = () => setIsAudioPlaying(false);
    audio.onended = () => {
      setIsAudioPlaying(false);
      setIsAudioBuffering(false);
    };

    audioRef.current = audio;
    return audio;
  }, []);

  const toggleEpisodeAudio = async (ep: SharawiEpisode) => {
    const audio = ensureAudioInstance();

    if (activeEpisode?.url === ep.url) {
      if (isAudioPlaying) {
        audio.pause();
      } else {
        audio.play().catch(() => {});
      }
      return;
    }

    audio.pause();
    cleanupBlobUrl();
    pendingSeekRef.current = null;
    setActiveEpisode(ep);
    setAudioCurrentTime(0);
    setAudioDuration(0);
    setIsAudioBuffering(true);

    // Check offline CacheStorage first for instant, lag-free seeking even offline
    let playbackSrc = `/api/proxy-media?url=${encodeURIComponent(ep.url)}`;
    if (typeof caches !== 'undefined') {
      try {
        const cache = await caches.open(OFFLINE_MEDIA_CACHE);
        const match = await cache.match(ep.url);
        if (match) {
          const blob = await match.blob();
          const blobUrl = URL.createObjectURL(blob);
          episodeBlobUrlRef.current = blobUrl;
          playbackSrc = blobUrl;
        }
      } catch {
        // fallback to streaming proxy
      }
    }

    audio.src = playbackSrc;
    audio.load();
    audio.play().catch(() => {
      setIsAudioBuffering(false);
    });
  };

  const seekBySeconds = (delta: number) => {
    const audio = audioRef.current;
    if (!audio || !activeEpisode) return;

    const knownDuration =
      Number.isFinite(audio.duration) && audio.duration > 0 ? audio.duration : audioDuration;
    const baseTime = Number.isFinite(audio.currentTime) ? audio.currentTime : audioCurrentTime;
    const targetTime =
      knownDuration > 0
        ? Math.max(0, Math.min(knownDuration, baseTime + delta))
        : Math.max(0, baseTime + delta);

    if (audio.readyState >= 1) {
      audio.currentTime = targetTime;
    } else {
      pendingSeekRef.current = targetTime;
    }
    setAudioCurrentTime(targetTime);
  };

  const handleSeekBarChange = (newTime: number) => {
    const audio = audioRef.current;
    if (!audio || !activeEpisode) return;
    if (audio.readyState >= 1) {
      audio.currentTime = newTime;
    } else {
      pendingSeekRef.current = newTime;
    }
    setAudioCurrentTime(newTime);
  };

  const stopEpisodeAudio = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.removeAttribute('src');
      audioRef.current.load();
    }
    cleanupBlobUrl();
    setActiveEpisode(null);
    setIsAudioPlaying(false);
    setIsAudioBuffering(false);
    setAudioCurrentTime(0);
    setAudioDuration(0);
  };

  const handleDownloadEpisode = async (ep: SharawiEpisode) => {
    if (downloadingEpisodes[ep.url] !== undefined || savedEpisodeUrls[ep.url]) return;

    setDownloadingEpisodes((prev) => ({ ...prev, [ep.url]: 5 }));
    try {
      const proxyUrl = `/api/proxy-media?url=${encodeURIComponent(ep.url)}`;
      const res = await fetch(proxyUrl);
      if (!res.ok) throw new Error('Download failed');

      const totalBytes = Number(res.headers.get('content-length') || 0);
      let blob: Blob;
      if (res.body && totalBytes > 0) {
        const reader = res.body.getReader();
        const chunks: Uint8Array[] = [];
        let received = 0;
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          if (value) {
            chunks.push(value);
            received += value.byteLength;
            const pct = Math.min(98, Math.max(5, Math.round((received / totalBytes) * 98)));
            setDownloadingEpisodes((prev) => ({ ...prev, [ep.url]: pct }));
          }
        }
        blob = new Blob(chunks as BlobPart[], { type: 'audio/mpeg' });
      } else {
        blob = await res.blob();
      }

      if (typeof caches !== 'undefined') {
        const cache = await caches.open(OFFLINE_MEDIA_CACHE);
        await cache.put(
          ep.url,
          new Response(blob, {
            status: 200,
            headers: { 'Content-Type': 'audio/mpeg' },
          })
        );
      }

      setSavedEpisodeUrls((prev) => ({ ...prev, [ep.url]: true }));
    } catch {
      // ignore failed download cleanly
    } finally {
      setDownloadingEpisodes((prev) => {
        const copy = { ...prev };
        delete copy[ep.url];
        return copy;
      });
    }
  };

  const handleSaveWrittenTafsirOffline = async () => {
    if (savingTafsir || items.length === 0) return;
    setSavingTafsir(true);
    try {
      const apiUrl = `/api/tafsir?book=${selectedBook}&s=${selectedSurah}&a=${selectedAyah}&offset=0&limit=10`;
      const fullPayload: TafsirResponse = {
        book: selectedBook,
        surahNumber: selectedSurah,
        totalAyahs,
        offset,
        hasMore,
        items,
        sharawiEpisodes,
      };
      if (typeof caches !== 'undefined') {
        const textCache = await caches.open(OFFLINE_TEXT_CACHE);
        await textCache.put(
          new URL(apiUrl, window.location.origin).toString(),
          new Response(JSON.stringify(fullPayload), {
            headers: { 'Content-Type': 'application/json' },
          })
        );
      }
      setSavedTafsirKeys((prev) => ({ ...prev, [currentTafsirSaveKey]: true }));
    } catch {
      // ignore
    } finally {
      setSavingTafsir(false);
    }
  };

  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.removeAttribute('src');
      }
      cleanupBlobUrl();
    };
  }, [cleanupBlobUrl]);

  const currentSurahMeta = surahs.find((s) => s.number === selectedSurah);
  const ayahCount = currentSurahMeta?.numberOfAyahs || totalAyahs || 7;
  const isCurrentTafsirSaved = Boolean(savedTafsirKeys[currentTafsirSaveKey]);

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg sm:text-xl font-bold flex items-center gap-2">
          <BookText className="h-5 w-5 text-amber-500 shrink-0" />
          <span>تفسير القرآن الكريم</span>
        </h2>
        <p className="text-xs text-slate-600 dark:text-slate-300 mt-0.5">
          اختر كتاب التفسير والسورة (أو حدد الجزء والآية) ليظهر التفسير فوراً — اضغط على أي بطاقة
          تفسير لعرض نبذة المؤلف الكاملة.
        </p>
      </div>

      {/* Strict 2-Select-Per-Row Rule */}
      <div className="grid grid-cols-2 gap-2">
        <select
          value={selectedBook}
          onChange={(e) => setSelectedBook(e.target.value as TafsirBookId)}
          aria-label="اختيار كتاب التفسير"
          className="min-h-[44px] w-full rounded-xl border border-amber-500/40 bg-white dark:bg-slate-900 px-2.5 py-2 text-xs sm:text-sm font-bold focus:outline-none focus:ring-2 focus:ring-amber-500"
        >
          {TAFSIR_BOOKS.map((book) => (
            <option key={book.id} value={book.id}>
              {book.shortTitle}
            </option>
          ))}
        </select>

        <select
          value={selectedSurah}
          onChange={(e) => {
            setSelectedSurah(Number(e.target.value));
            setSelectedAyah(0);
          }}
          aria-label="اختيار اسم السورة"
          className="min-h-[44px] w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-2.5 py-2 text-xs sm:text-sm font-bold focus:outline-none focus:ring-2 focus:ring-amber-500"
        >
          {surahs.length === 0 ? (
            <option value={1}>١. سورة الفاتحة</option>
          ) : (
            surahs.map((s) => (
              <option key={s.number} value={s.number}>
                {s.number}. {s.name} ({s.numberOfAyahs})
              </option>
            ))
          )}
        </select>

        <select
          value={selectedJuz}
          onChange={(e) => handleSelectJuz(Number(e.target.value))}
          aria-label="اختيار رقم الجزء"
          className="min-h-[44px] w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-2.5 py-2 text-xs sm:text-sm font-bold focus:outline-none focus:ring-2 focus:ring-amber-500"
        >
          {QURAN_JUZ_LIST.map((j) => (
            <option key={j.juz} value={j.juz}>
              {j.name}
            </option>
          ))}
        </select>

        <select
          value={selectedAyah}
          onChange={(e) => setSelectedAyah(Number(e.target.value))}
          aria-label="اختيار رقم الآية"
          className="min-h-[44px] w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-2.5 py-2 text-xs sm:text-sm font-bold focus:outline-none focus:ring-2 focus:ring-amber-500"
        >
          <option value={0}>تفسير السورة كاملة (تصفح متتابع)</option>
          {Array.from({ length: ayahCount }, (_, i) => i + 1).map((num) => (
            <option key={num} value={num}>
              الآية رقم {num}
            </option>
          ))}
        </select>
      </div>

      {/* Book & Author Banner + Side Save Tafsir Button */}
      <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-3 text-xs flex flex-wrap items-center justify-between gap-2">
        <div className="min-w-0 space-y-0.5">
          <p className="font-extrabold text-amber-800 dark:text-amber-300 truncate">
            {bookMeta.title}
          </p>
          <p className="text-[11px] font-semibold text-slate-600 dark:text-slate-300 truncate">
            {bookMeta.authorFullName}
          </p>
        </div>

        <button
          type="button"
          onClick={handleSaveWrittenTafsirOffline}
          disabled={savingTafsir || loading || items.length === 0}
          className={`min-h-[38px] shrink-0 inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-[11px] font-bold text-white transition-colors ${
            isCurrentTafsirSaved
              ? 'bg-emerald-700'
              : 'bg-amber-600 hover:bg-amber-500 disabled:opacity-50'
          }`}
        >
          {savingTafsir ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : isCurrentTafsirSaved ? (
            <CheckCircle2 className="h-3.5 w-3.5" />
          ) : (
            <Download className="h-3.5 w-3.5" />
          )}
          <span>{isCurrentTafsirSaved ? 'تم حفظ التفسير' : 'تحميل التفسير'}</span>
        </button>
      </div>

      {/* Sheikh Sharawi Audio Khawater Episodes + Interactive Seek & +5s/-5s Controls */}
      {selectedBook === 'sharawi' && sharawiEpisodes.length > 0 && (
        <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-3.5 space-y-3">
          <div className="flex items-center justify-between gap-2">
            <h3 className="text-xs sm:text-sm font-extrabold flex items-center gap-1.5 text-emerald-800 dark:text-emerald-300">
              <Volume2 className="h-4 w-4 shrink-0" />
              <span>حلقات خواطر الإمام الشعراوي الصوتية لهذه السورة</span>
            </h3>
            <span className="text-[11px] font-mono-num font-bold text-emerald-700 dark:text-emerald-400">
              {sharawiEpisodes.length} حلقة
            </span>
          </div>

          {/* Active Sharawi Episode Player with Scrubber & Working +5s / -5s */}
          {activeEpisode && (
            <div className="rounded-2xl border border-emerald-500/50 bg-slate-950/90 text-white p-3 space-y-2.5 shadow-lg">
              <div className="flex items-center justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-extrabold text-amber-300 truncate">
                    {activeEpisode.label} — خواطر الإمام الشعراوي
                  </p>
                  <p className="text-[11px] font-mono-num text-emerald-300 mt-0.5">
                    {formatAudioClock(audioCurrentTime)} /{' '}
                    {audioDuration > 0 ? formatAudioClock(audioDuration) : '--:--'}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={stopEpisodeAudio}
                  aria-label="إغلاق مشغل الخواطر"
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-rose-600 hover:bg-rose-500 text-white"
                >
                  <Square className="h-3.5 w-3.5 fill-current" />
                </button>
              </div>

              {/* Seekable Range Scrubber */}
              <input
                type="range"
                min={0}
                max={audioDuration > 0 ? Math.floor(audioDuration) : 100}
                step={1}
                value={
                  audioDuration > 0
                    ? Math.min(Math.floor(audioCurrentTime), Math.floor(audioDuration))
                    : 0
                }
                onChange={(e) => handleSeekBarChange(Number(e.target.value))}
                aria-label="شريط تقديم وتأخير المقطع الصوتي"
                className="w-full h-2 accent-amber-500 cursor-pointer"
              />

              {/* Strict <= 4 Buttons Row: Rewind -5s | Play/Pause | Forward +5s */}
              <div className="grid grid-cols-3 gap-1.5">
                <button
                  type="button"
                  onClick={() => seekBySeconds(-5)}
                  className="min-h-[42px] flex items-center justify-center gap-1 rounded-xl border border-white/15 bg-white/10 hover:bg-white/20 px-1.5 py-2 text-[10px] sm:text-xs font-bold leading-tight text-center transition-colors"
                >
                  <RotateCcw className="h-3.5 w-3.5 shrink-0 text-amber-400" />
                  <span>تأخير 5 ث</span>
                </button>

                <button
                  type="button"
                  onClick={() => toggleEpisodeAudio(activeEpisode)}
                  className="min-h-[42px] flex items-center justify-center gap-1 rounded-xl bg-emerald-700 hover:bg-emerald-600 px-1.5 py-2 text-[10px] sm:text-xs font-bold leading-tight text-center text-white transition-colors"
                >
                  {isAudioBuffering ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin shrink-0" />
                  ) : isAudioPlaying ? (
                    <Pause className="h-3.5 w-3.5 shrink-0 fill-current" />
                  ) : (
                    <Play className="h-3.5 w-3.5 shrink-0 fill-current" />
                  )}
                  <span>{isAudioPlaying ? 'إيقاف مؤقت' : 'تشغيل'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => seekBySeconds(5)}
                  className="min-h-[42px] flex items-center justify-center gap-1 rounded-xl border border-white/15 bg-white/10 hover:bg-white/20 px-1.5 py-2 text-[10px] sm:text-xs font-bold leading-tight text-center transition-colors"
                >
                  <span>تقديم 5 ث</span>
                  <RotateCw className="h-3.5 w-3.5 shrink-0 text-amber-400" />
                </button>
              </div>
            </div>
          )}

          {/* Episodes List with Side Download Button */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {sharawiEpisodes.map((ep) => {
              const isCurrent = activeEpisode?.url === ep.url;
              const isSaved = Boolean(savedEpisodeUrls[ep.url]);
              const dlPct = downloadingEpisodes[ep.url];

              return (
                <div
                  key={ep.fileName}
                  className={`flex items-center gap-1.5 rounded-xl border p-1.5 transition-colors ${
                    isCurrent
                      ? 'border-emerald-500 bg-emerald-700 text-white'
                      : 'border-emerald-500/25 bg-white/85 dark:bg-slate-900/85'
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => toggleEpisodeAudio(ep)}
                    className="flex flex-1 min-w-0 items-center justify-between gap-2 px-2 py-1.5 text-right text-xs font-bold"
                  >
                    <span className="flex items-center gap-2 min-w-0">
                      {isCurrent && isAudioPlaying ? (
                        <Pause className="h-4 w-4 shrink-0" />
                      ) : (
                        <Play className="h-4 w-4 shrink-0" />
                      )}
                      <span className="truncate">{ep.label}</span>
                    </span>
                    <span className="font-mono-num text-[10px] opacity-80 shrink-0">
                      {ep.sizeMB} MB
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleDownloadEpisode(ep)}
                    disabled={dlPct !== undefined || isSaved}
                    aria-label={`تحميل ${ep.label}`}
                    className={`min-h-[36px] shrink-0 inline-flex items-center gap-1 rounded-lg px-2.5 py-1 text-[10px] font-bold transition-colors ${
                      isSaved
                        ? 'bg-emerald-600 text-white'
                        : dlPct !== undefined
                        ? 'bg-amber-600 text-white'
                        : 'bg-amber-600 hover:bg-amber-500 text-white'
                    }`}
                  >
                    {dlPct !== undefined ? (
                      <>
                        <Loader2 className="h-3 w-3 animate-spin shrink-0" />
                        <span className="font-mono-num">{dlPct}%</span>
                      </>
                    ) : isSaved ? (
                      <>
                        <CheckCircle2 className="h-3 w-3 shrink-0" />
                        <span>محفوظ</span>
                      </>
                    ) : (
                      <>
                        <Download className="h-3 w-3 shrink-0" />
                        <span>تحميل</span>
                      </>
                    )}
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Reactive Tafsir Output */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-12 gap-2 text-slate-500">
          <Loader2 className="h-7 w-7 animate-spin text-amber-500" />
          <span className="text-sm font-semibold">جارٍ جلب التفسير المعتمد...</span>
        </div>
      ) : errorMsg ? (
        <div className="rounded-2xl border border-rose-500/30 bg-rose-500/10 p-4 text-center text-sm font-semibold text-rose-700 dark:text-rose-300">
          {errorMsg}
        </div>
      ) : (
        <div className="space-y-3">
          {items.map((item) => {
            const showAuthorBio = activeAuthorCardId === item.numberInSurah;
            return (
              <div
                key={item.numberInSurah}
                className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-900/80 overflow-hidden transition-colors hover:border-amber-500/45"
              >
                <button
                  type="button"
                  onClick={() =>
                    setActiveAuthorCardId(showAuthorBio ? null : item.numberInSurah)
                  }
                  className="w-full text-right p-4 space-y-2.5 focus:outline-none"
                >
                  <div className="flex items-center justify-between gap-2 text-xs font-bold text-amber-700 dark:text-amber-400">
                    <span className="flex items-center gap-1.5">
                      <BookOpen className="h-3.5 w-3.5 shrink-0" />
                      <span>
                        الآية <span className="font-mono-num">{item.numberInSurah}</span> · الجزء{' '}
                        <span className="font-mono-num">{item.juz}</span>
                      </span>
                    </span>
                    <span className="inline-flex items-center gap-1 text-[11px] text-slate-500 dark:text-slate-400">
                      <UserCheck className="h-3.5 w-3.5" />
                      <span>اضغط لعرض المؤلف</span>
                      <ChevronDown
                        className={`h-3.5 w-3.5 transition-transform ${
                          showAuthorBio ? 'rotate-180' : ''
                        }`}
                      />
                    </span>
                  </div>

                  <p
                    dir="rtl"
                    className="font-quran text-xl sm:text-2xl leading-[2.1] text-slate-900 dark:text-amber-100 border-b border-slate-200 dark:border-slate-800 pb-2.5"
                  >
                    {item.ayahText}{' '}
                    <span className="font-mono-num text-base font-bold text-amber-600 dark:text-amber-400">
                      ﴿{item.numberInSurah.toLocaleString('ar-EG')}﴾
                    </span>
                  </p>

                  {selectedBook === 'sharawi' && (
                    <p className="text-[11px] font-bold text-emerald-700 dark:text-emerald-300">
                      البيان الميسّر المصاحب لخواطر الإمام الشعراوي (استمع للحلقات الصوتية بالأعلى):
                    </p>
                  )}

                  <p className="text-sm sm:text-base leading-relaxed whitespace-pre-line text-slate-800 dark:text-slate-200">
                    {item.tafsirText}
                  </p>
                </button>

                {/* Author Full Name & Verified Bio Card */}
                {showAuthorBio && (
                  <div className="border-t border-amber-500/30 bg-amber-500/10 px-4 py-3.5 space-y-1.5 text-xs">
                    <div className="flex items-center gap-1.5 font-extrabold text-amber-800 dark:text-amber-300">
                      <UserCheck className="h-4 w-4 shrink-0" />
                      <span>{bookMeta.authorFullName}</span>
                    </div>
                    <p className="font-semibold text-slate-700 dark:text-slate-300">
                      {bookMeta.authorDates}
                    </p>
                    <p className="leading-relaxed text-slate-700 dark:text-slate-200">
                      {bookMeta.authorBio}
                    </p>
                    <p className="leading-relaxed text-emerald-800 dark:text-emerald-300 font-medium">
                      <strong>منهج التفسير:</strong> {bookMeta.bookMethodology}
                    </p>
                  </div>
                )}
              </div>
            );
          })}

          {hasMore && (
            <button
              type="button"
              onClick={handleLoadMore}
              disabled={loadingMore}
              className="w-full min-h-[44px] rounded-xl bg-amber-600 hover:bg-amber-500 text-white text-xs sm:text-sm font-bold flex items-center justify-center gap-2 transition-colors"
            >
              {loadingMore ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>جارٍ تحميل الآيات التالية...</span>
                </>
              ) : (
                <span>عرض الآيات التالية من السورة</span>
              )}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
