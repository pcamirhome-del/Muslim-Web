'use client';

import React, { useEffect, useRef, useState } from 'react';
import {
  BookText,
  UserCheck,
  Loader2,
  Play,
  Pause,
  Volume2,
  ChevronDown,
  BookOpen,
} from 'lucide-react';
import { QURAN_JUZ_LIST, TAFSIR_BOOKS, TafsirBookId } from '@/lib/data/tafsir-books';

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

  // Audio player for Sharawi episodes
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [playingEpisodeUrl, setPlayingEpisodeUrl] = useState<string | null>(null);
  const [isAudioPlaying, setIsAudioPlaying] = useState<boolean>(false);

  const bookMeta = TAFSIR_BOOKS.find((b) => b.id === selectedBook) || TAFSIR_BOOKS[0];

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

  // Reactive fetch whenever Book, Surah, or Ayah changes
  useEffect(() => {
    let cancelled = false;

    const loadTafsir = async () => {
      setLoading(true);
      setErrorMsg(null);
      setOffset(0);
      setActiveAuthorCardId(null);

      try {
        const res = await fetch(
          `/api/tafsir?book=${selectedBook}&s=${selectedSurah}&a=${selectedAyah}&offset=0&limit=10`
        );
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

  const toggleEpisodeAudio = (ep: SharawiEpisode) => {
    if (!audioRef.current) {
      audioRef.current = new Audio();
      audioRef.current.onended = () => setIsAudioPlaying(false);
      audioRef.current.onpause = () => setIsAudioPlaying(false);
      audioRef.current.onplay = () => setIsAudioPlaying(true);
    }

    const audio = audioRef.current;
    if (playingEpisodeUrl === ep.url) {
      if (isAudioPlaying) {
        audio.pause();
      } else {
        audio.play().catch(() => {});
      }
      return;
    }

    audio.src = ep.url;
    setPlayingEpisodeUrl(ep.url);
    audio.play().catch(() => {});
  };

  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.removeAttribute('src');
      }
    };
  }, []);

  const currentSurahMeta = surahs.find((s) => s.number === selectedSurah);
  const ayahCount = currentSurahMeta?.numberOfAyahs || totalAyahs || 7;

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

      {/* Book & Author Banner */}
      <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-3 text-xs space-y-1">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className="font-extrabold text-amber-800 dark:text-amber-300">
            {bookMeta.title}
          </span>
          <span className="text-[11px] font-semibold text-slate-600 dark:text-slate-300">
            {bookMeta.authorFullName}
          </span>
        </div>
      </div>

      {/* Sheikh Sharawi Audio Khawater Episodes when Sharawi is selected */}
      {selectedBook === 'sharawi' && sharawiEpisodes.length > 0 && (
        <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-3.5 space-y-2.5">
          <div className="flex items-center justify-between gap-2">
            <h3 className="text-xs sm:text-sm font-extrabold flex items-center gap-1.5 text-emerald-800 dark:text-emerald-300">
              <Volume2 className="h-4 w-4 shrink-0" />
              <span>حلقات خواطر الإمام الشعراوي الصوتية لهذه السورة</span>
            </h3>
            <span className="text-[11px] font-mono-num font-bold text-emerald-700 dark:text-emerald-400">
              {sharawiEpisodes.length} حلقة
            </span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {sharawiEpisodes.map((ep) => {
              const isCurrent = playingEpisodeUrl === ep.url;
              return (
                <button
                  key={ep.fileName}
                  type="button"
                  onClick={() => toggleEpisodeAudio(ep)}
                  className={`flex items-center justify-between gap-2 rounded-xl border px-3 py-2 text-right text-xs font-bold transition-colors ${
                    isCurrent
                      ? 'border-emerald-500 bg-emerald-700 text-white'
                      : 'border-emerald-500/25 bg-white/80 dark:bg-slate-900/80 hover:border-emerald-500/60'
                  }`}
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
