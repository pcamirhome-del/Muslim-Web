'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowRight,
  BookOpen,
  Loader2,
  Pause,
  Play,
  RotateCcw,
  RotateCw,
  Search,
  Sparkles,
  Square,
  UserCheck,
  Volume2,
  X,
} from 'lucide-react';
import {
  NarratorId,
  PROPHETS_LIST,
  PROPHET_NARRATORS,
  ProphetStoryEntry,
} from '@/lib/data/prophets-stories-data';

interface ProphetsStoriesProps {
  onCloseSection: () => void;
}

function normalizeArabicText(value: string): string {
  return value
    .trim()
    .replace(/[أإآ]/g, 'ا')
    .replace(/ى/g, 'ي')
    .replace(/ة/g, 'ه')
    .replace(/[\u064B-\u065F]/g, '')
    .toLowerCase();
}

function formatAudioDuration(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) return '00:00';
  const total = Math.floor(seconds);
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  if (h > 0) {
    return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  }
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

export function ProphetsStories({ onCloseSection }: ProphetsStoriesProps) {
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedMiracleProphetId, setSelectedMiracleProphetId] = useState<string>('muhammad');
  const [activeProphet, setActiveProphet] = useState<ProphetStoryEntry | null>(null);
  const [selectedNarrator, setSelectedNarrator] = useState<NarratorId>('suwaidan');

  // HTML5 Streaming Audio Player state
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const shouldAutoPlayOnNarratorSwitchRef = useRef<boolean>(false);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [isBuffering, setIsBuffering] = useState<boolean>(false);
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [duration, setDuration] = useState<number>(0);
  const [audioError, setAudioError] = useState<string | null>(null);

  const filteredProphets = useMemo(() => {
    const q = normalizeArabicText(searchQuery);
    if (!q) return PROPHETS_LIST;
    return PROPHETS_LIST.filter((p) => {
      const hay = normalizeArabicText(`${p.name} ${p.honorific} ${p.eraTag}`);
      return hay.includes(q);
    });
  }, [searchQuery]);

  const selectedMiracleProphet = useMemo(
    () => PROPHETS_LIST.find((p) => p.id === selectedMiracleProphetId) || null,
    [selectedMiracleProphetId]
  );

  const activeNarratorInfo = useMemo(
    () => PROPHET_NARRATORS.find((n) => n.id === selectedNarrator) || PROPHET_NARRATORS[0],
    [selectedNarrator]
  );

  const activeAudioUrl = activeProphet ? activeProphet.audioUrls[selectedNarrator] : '';

  const resetAudioPlayer = useCallback(() => {
    const el = audioRef.current;
    if (el) {
      el.pause();
      el.currentTime = 0;
    }
    shouldAutoPlayOnNarratorSwitchRef.current = false;
    setIsPlaying(false);
    setIsBuffering(false);
    setCurrentTime(0);
    setDuration(0);
    setAudioError(null);
  }, []);

  // Load audio stream when activeProphet or selectedNarrator changes
  useEffect(() => {
    const el = audioRef.current;
    if (!el || !activeProphet || !activeAudioUrl) return;

    setAudioError(null);
    setCurrentTime(0);
    setDuration(0);
    setIsBuffering(true);

    el.src = activeAudioUrl;
    el.preload = 'auto';
    el.load();

    if (shouldAutoPlayOnNarratorSwitchRef.current) {
      shouldAutoPlayOnNarratorSwitchRef.current = false;
      el.play()
        .then(() => {
          setIsPlaying(true);
          setIsBuffering(false);
        })
        .catch(() => {
          setIsPlaying(false);
          setIsBuffering(false);
        });
    } else {
      setIsBuffering(false);
    }
  }, [activeProphet, activeAudioUrl]);

  // Cleanup audio on unmount
  useEffect(() => {
    const audioEl = audioRef.current;
    return () => {
      if (audioEl) {
        audioEl.pause();
      }
    };
  }, []);

  const handleOpenProphet = (prophet: ProphetStoryEntry) => {
    resetAudioPlayer();
    setActiveProphet(prophet);
  };

  const handleBackToList = () => {
    resetAudioPlayer();
    setActiveProphet(null);
  };

  const handleCloseAll = () => {
    resetAudioPlayer();
    setActiveProphet(null);
    onCloseSection();
  };

  const handleTogglePlayPause = () => {
    const el = audioRef.current;
    if (!el || !activeAudioUrl) return;

    if (!el.paused) {
      el.pause();
      setIsPlaying(false);
      return;
    }

    setAudioError(null);
    setIsBuffering(true);
    if (!el.src || el.src !== activeAudioUrl) {
      el.src = activeAudioUrl;
    }

    el.play()
      .then(() => {
        setIsPlaying(true);
        setIsBuffering(false);
      })
      .catch(() => {
        setIsPlaying(false);
        setIsBuffering(false);
        setAudioError('تعذر بدء البث الصوتي. تأكد من الاتصال بالإنترنت ثم حاول مرة أخرى.');
      });
  };

  const handleStopAudio = () => {
    const el = audioRef.current;
    if (!el) return;
    el.pause();
    el.currentTime = 0;
    setIsPlaying(false);
    setCurrentTime(0);
  };

  const handleSeekRelative = (deltaSeconds: number) => {
    const el = audioRef.current;
    if (!el) return;
    const maxDur = Number.isFinite(el.duration) && el.duration > 0 ? el.duration : duration || 0;
    const nextTime = Math.max(
      0,
      maxDur > 0 ? Math.min(maxDur, el.currentTime + deltaSeconds) : el.currentTime + deltaSeconds
    );
    el.currentTime = nextTime;
    setCurrentTime(nextTime);
  };

  const handleRangeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const nextTime = Number(e.target.value);
    const el = audioRef.current;
    setCurrentTime(nextTime);
    if (el && Number.isFinite(nextTime)) {
      el.currentTime = nextTime;
    }
  };

  const handleNarratorChange = (nextNarrator: NarratorId) => {
    const wasPlaying = Boolean(audioRef.current && !audioRef.current.paused);
    shouldAutoPlayOnNarratorSwitchRef.current = wasPlaying;
    if (audioRef.current) {
      audioRef.current.pause();
    }
    setIsPlaying(false);
    setSelectedNarrator(nextNarrator);
  };

  return (
    <div className="space-y-4 overflow-x-hidden">
      {/* Section Header */}
      <section className="rounded-3xl border border-amber-500/25 bg-gradient-to-br from-emerald-950/90 via-slate-900/95 to-slate-950 p-4 sm:p-5 text-white shadow-xl">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="text-lg sm:text-xl font-extrabold flex items-center gap-2 text-amber-300">
              <BookOpen className="h-5 w-5 shrink-0" />
              <span>قصص ومعجزات الأنبياء (٢٩ نبياً)</span>
            </h2>
            <p className="text-xs text-slate-300 mt-1 leading-relaxed">
              موسوعة صوتية ومقروءة مرتبة من خاتم الأنبياء محمد ﷺ إلى آدم عليه السلام، مع معجزات كل نبي ومزامنة النص مع كبار الشيوخ.
            </p>
          </div>
          <span className="rounded-xl border border-amber-400/35 bg-amber-500/15 px-3 py-1 text-xs font-extrabold text-amber-200">
            من الأحدث للأقدم
          </span>
        </div>
      </section>

      {/* Search Bar & Miracles Dropdown Card */}
      <section className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white/85 dark:bg-slate-900/80 backdrop-blur-xl p-4 space-y-4 shadow-lg">
        {/* Fast Search Input */}
        <div className="space-y-1.5">
          <label
            htmlFor="prophet-search-input"
            className="text-xs font-extrabold text-slate-700 dark:text-slate-200 flex items-center gap-1.5"
          >
            <Search className="h-4 w-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
            <span>البحث السريع عن اسم النبي:</span>
          </label>
          <div className="relative">
            <input
              id="prophet-search-input"
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="اكتب اسم النبي (مثال: محمد، موسى، إبراهيم، يوسف)..."
              className="min-h-[46px] w-full rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 pr-10 pl-10 py-2.5 text-base sm:text-sm font-bold text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-500"
            />
            <Search className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                aria-label="مسح البحث"
                className="absolute left-3 top-1/2 -translate-y-1/2 flex h-7 w-7 items-center justify-center rounded-lg bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-300"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Miracles of Prophets Dropdown + Book-Style Reading Panel */}
        <div className="space-y-2.5 border-t border-slate-200 dark:border-slate-800 pt-3">
          <label
            htmlFor="miracles-prophet-select"
            className="text-xs font-extrabold text-amber-700 dark:text-amber-300 flex items-center gap-1.5"
          >
            <Sparkles className="h-4 w-4 shrink-0" />
            <span>معجزات الأنبياء (اختر النبي لعرض معجزاته):</span>
          </label>

          <select
            id="miracles-prophet-select"
            value={selectedMiracleProphetId}
            onChange={(e) => setSelectedMiracleProphetId(e.target.value)}
            aria-label="قائمة معجزات الأنبياء"
            className="min-h-[46px] w-full rounded-2xl border border-amber-500/40 bg-amber-50/70 dark:bg-slate-950 px-3 py-2 text-base sm:text-sm font-extrabold text-slate-900 dark:text-amber-200 focus:outline-none focus:ring-2 focus:ring-amber-500"
          >
            {PROPHETS_LIST.map((p) => (
              <option
                key={p.id}
                value={p.id}
                className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
              >
                {p.orderNumber}. معجزات نبي الله {p.name} ({p.honorific})
              </option>
            ))}
          </select>

          {selectedMiracleProphet && (
            <div className="rounded-2xl border border-amber-500/30 bg-[#fffdf6] dark:bg-slate-950/90 p-4 sm:p-5 space-y-3 shadow-inner">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-amber-500/20 pb-2.5">
                <div>
                  <h3 className="text-sm sm:text-base font-extrabold text-emerald-800 dark:text-amber-300">
                    معجزات نبي الله {selectedMiracleProphet.name} {selectedMiracleProphet.honorific}
                  </h3>
                  <p className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                    {selectedMiracleProphet.eraTag}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => handleOpenProphet(selectedMiracleProphet)}
                  className="min-h-[38px] rounded-xl bg-emerald-700 hover:bg-emerald-600 px-3 py-1.5 text-xs font-extrabold text-white transition-colors"
                >
                  قراءة وسماع القصة كاملة
                </button>
              </div>

              {/* Book-page stacked lines */}
              <div className="space-y-2.5">
                {selectedMiracleProphet.miracles.map((line, idx) => (
                  <p
                    key={idx}
                    className="flex items-start gap-2.5 text-sm sm:text-[15px] leading-loose text-slate-800 dark:text-slate-100 border-b border-slate-200/70 dark:border-slate-800/80 pb-2 last:border-b-0 last:pb-0"
                  >
                    <span className="mt-1 flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-amber-500/15 text-xs font-extrabold text-amber-700 dark:text-amber-300 font-mono-num">
                      {idx + 1}
                    </span>
                    <span className="flex-1">{line}</span>
                  </p>
                ))}
              </div>
            </div>
          )}
        </div>
      </section>

      {/* Reverse-Ordered List of 29 Prophets (Newest -> Oldest) */}
      <section className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white/85 dark:bg-slate-900/80 backdrop-blur-xl p-4 space-y-3 shadow-lg">
        <div className="flex items-center justify-between gap-2">
          <h3 className="text-sm sm:text-base font-extrabold flex items-center gap-2 text-slate-900 dark:text-white">
            <BookOpen className="h-4 w-4 text-amber-500 shrink-0" />
            <span>قائمة الأنبياء والمرسلين ({filteredProphets.length} / 29)</span>
          </h3>
          <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400">
            اضغط على اسم النبي للقراءة والاستماع
          </span>
        </div>

        {filteredProphets.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-300 dark:border-slate-700 p-6 text-center space-y-2">
            <p className="text-sm font-bold text-slate-600 dark:text-slate-300">
              لم يتم العثور على نبي مطابق لبحثك «{searchQuery}».
            </p>
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="rounded-xl bg-amber-600 hover:bg-amber-500 px-4 py-2 text-xs font-extrabold text-white"
            >
              عرض جميع الأنبياء الـ ٢٩
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
            {filteredProphets.map((prophet) => (
              <button
                key={prophet.id}
                type="button"
                onClick={() => handleOpenProphet(prophet)}
                className={`group flex min-h-[84px] flex-col justify-between rounded-2xl border p-3 text-right transition-all ${
                  prophet.id === 'muhammad'
                    ? 'border-amber-500/60 bg-gradient-to-br from-amber-500/15 to-emerald-600/15 hover:border-amber-400'
                    : 'border-slate-200 dark:border-slate-800 bg-slate-50/90 dark:bg-slate-950/70 hover:border-emerald-500/60 hover:bg-emerald-500/10'
                }`}
              >
                <div className="flex items-center justify-between gap-1.5 w-full">
                  <span className="inline-flex h-6 min-w-[24px] items-center justify-center rounded-lg bg-emerald-700/15 dark:bg-emerald-500/20 px-1.5 text-[11px] font-extrabold text-emerald-800 dark:text-emerald-300 font-mono-num">
                    {prophet.orderNumber}
                  </span>
                  <Volume2 className="h-3.5 w-3.5 text-amber-500 opacity-80 group-hover:opacity-100 shrink-0" />
                </div>

                <div className="mt-2 space-y-0.5 min-w-0">
                  <p className="text-xs sm:text-sm font-extrabold text-slate-900 dark:text-white break-words leading-tight">
                    {prophet.name}
                  </p>
                  <p className="text-[10px] font-semibold text-amber-700 dark:text-amber-300 break-words leading-tight">
                    {prophet.honorific}
                  </p>
                </div>
              </button>
            ))}
          </div>
        )}
      </section>

      {/* Hidden Single HTML5 Streaming Audio Element */}
      <audio
        ref={audioRef}
        preload="auto"
        onLoadStart={() => {
          if (activeProphet) setIsBuffering(true);
        }}
        onCanPlay={() => setIsBuffering(false)}
        onWaiting={() => setIsBuffering(true)}
        onPlaying={() => {
          setIsPlaying(true);
          setIsBuffering(false);
        }}
        onPause={() => setIsPlaying(false)}
        onLoadedMetadata={() => {
          if (audioRef.current && Number.isFinite(audioRef.current.duration)) {
            setDuration(audioRef.current.duration);
          }
        }}
        onDurationChange={() => {
          if (audioRef.current && Number.isFinite(audioRef.current.duration)) {
            setDuration(audioRef.current.duration);
          }
        }}
        onTimeUpdate={() => {
          if (audioRef.current) {
            setCurrentTime(audioRef.current.currentTime);
          }
        }}
        onEnded={() => {
          setIsPlaying(false);
          setIsBuffering(false);
          setCurrentTime(0);
        }}
        onError={() => {
          setIsPlaying(false);
          setIsBuffering(false);
          if (activeProphet) {
            setAudioError('تعذر تحميل البث الصوتي من الخادم الآن. يمكنك الاستمرار في قراءة القصة أو تجربة راوٍ آخر.');
          }
        }}
      />

      {/* Full-Screen Reading & Listening Modal (fixed inset-0 z-50) */}
      {activeProphet && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={`قصة نبي الله ${activeProphet.name}`}
          className="fixed inset-0 z-50 flex flex-col bg-slate-50/95 dark:bg-slate-950/95 backdrop-blur-xl text-slate-900 dark:text-white overflow-hidden"
        >
          {/* Top Navigation Bar: Back + Title + Close */}
          <header className="shrink-0 border-b border-slate-200 dark:border-slate-800 bg-white/90 dark:bg-slate-950/90 px-3 sm:px-5 py-3">
            <div className="mx-auto flex max-w-4xl items-center justify-between gap-2">
              <button
                type="button"
                onClick={handleBackToList}
                className="min-h-[42px] flex items-center gap-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-900 hover:bg-slate-200 dark:hover:bg-slate-800 px-3 py-1.5 text-xs sm:text-sm font-extrabold transition-colors shrink-0"
              >
                <ArrowRight className="h-4 w-4 shrink-0" />
                <span>رجوع</span>
              </button>

              <div className="min-w-0 text-center flex-1">
                <h2 className="text-sm sm:text-lg font-extrabold text-emerald-800 dark:text-amber-300 truncate">
                  قصة نبي الله {activeProphet.name} {activeProphet.honorific}
                </h2>
                <p className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 truncate">
                  {activeProphet.eraTag}
                </p>
              </div>

              <button
                type="button"
                onClick={handleCloseAll}
                className="min-h-[42px] flex items-center gap-1.5 rounded-xl bg-rose-600 hover:bg-rose-500 px-3 py-1.5 text-xs sm:text-sm font-extrabold text-white transition-colors shrink-0"
              >
                <X className="h-4 w-4 shrink-0" />
                <span>إغلاق</span>
              </button>
            </div>
          </header>

          {/* Scrollable Synchronized Story Content */}
          <div className="flex-1 overflow-y-auto px-3 sm:px-5 py-4">
            <div className="mx-auto max-w-4xl space-y-4">
              {/* Active Narrator Info Banner */}
              <div className="rounded-2xl border border-emerald-500/35 bg-emerald-500/10 px-4 py-3 flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <UserCheck className="h-5 w-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                  <div className="min-w-0">
                    <p className="text-xs sm:text-sm font-extrabold text-emerald-900 dark:text-emerald-200 truncate">
                      رواية وأسلوب: {activeNarratorInfo.name}
                    </p>
                    <p className="text-[11px] font-semibold text-slate-600 dark:text-slate-300 truncate">
                      {activeNarratorInfo.title}
                    </p>
                  </div>
                </div>
                <span className="rounded-xl border border-amber-500/35 bg-amber-500/15 px-2.5 py-1 text-[10px] sm:text-xs font-extrabold text-amber-800 dark:text-amber-200">
                  {activeNarratorInfo.styleBadge}
                </span>
              </div>

              {/* Story Paragraphs (Synced with Selected Narrator) */}
              <article className="rounded-3xl border border-amber-500/30 bg-[#fffdf6] dark:bg-slate-900/90 p-5 sm:p-6 shadow-xl space-y-4">
                <h3 className="text-base sm:text-lg font-extrabold text-amber-700 dark:text-amber-300 border-b border-amber-500/20 pb-2">
                  ملخص القصة برواية {activeNarratorInfo.name}
                </h3>

                <div className="space-y-4">
                  {activeProphet.stories[selectedNarrator].map((paragraph, idx) => (
                    <p
                      key={`${selectedNarrator}-${idx}`}
                      className="text-base sm:text-[17px] leading-[2.1] text-slate-800 dark:text-slate-100 font-medium"
                    >
                      {paragraph}
                    </p>
                  ))}
                </div>
              </article>

              {/* Miracles Reference Box inside Story Modal */}
              <article className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white/85 dark:bg-slate-900/75 p-4 sm:p-5 space-y-3">
                <h4 className="text-sm sm:text-base font-extrabold flex items-center gap-2 text-emerald-800 dark:text-emerald-300">
                  <Sparkles className="h-4 w-4 text-amber-500 shrink-0" />
                  <span>معجزات نبي الله {activeProphet.name} {activeProphet.honorific}</span>
                </h4>
                <div className="space-y-2">
                  {activeProphet.miracles.map((m, idx) => (
                    <p
                      key={idx}
                      className="flex items-start gap-2 text-sm leading-relaxed text-slate-700 dark:text-slate-200"
                    >
                      <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-md bg-amber-500/15 text-[11px] font-extrabold text-amber-700 dark:text-amber-300 font-mono-num">
                        {idx + 1}
                      </span>
                      <span>{m}</span>
                    </p>
                  ))}
                </div>
              </article>
            </div>
          </div>

          {/* Bottom Docked Advanced HTML5 Audio Player & Narrator Dropdown */}
          <footer className="shrink-0 border-t border-slate-200 dark:border-slate-800 bg-white/95 dark:bg-slate-950/95 px-3 sm:px-5 py-3 shadow-2xl">
            <div className="mx-auto max-w-4xl space-y-2.5">
              {/* Seekable Range Progress Bar */}
              <div className="space-y-1">
                <input
                  type="range"
                  min={0}
                  max={duration > 0 ? duration : 100}
                  value={duration > 0 ? Math.min(currentTime, duration) : 0}
                  onChange={handleRangeChange}
                  disabled={!duration}
                  aria-label="شريط تقديم وتأخير الصوت"
                  className="h-2 w-full cursor-pointer accent-amber-500 rounded-lg bg-slate-200 dark:bg-slate-800 disabled:opacity-50"
                />
                <div className="flex items-center justify-between text-[11px] font-bold font-mono-num text-slate-500 dark:text-slate-400">
                  <span>{formatAudioDuration(currentTime)}</span>
                  <span className="font-sans text-[11px] font-bold text-emerald-700 dark:text-emerald-400">
                    {isBuffering
                      ? 'جارٍ الاتصال بالبث الصوتي...'
                      : isPlaying
                        ? `يستمع الآن: ${activeNarratorInfo.name}`
                        : 'جاهز للتشغيل المباشر (Archive.org)'}
                  </span>
                  <span>{duration > 0 ? formatAudioDuration(duration) : '--:--'}</span>
                </div>
              </div>

              {/* Player Controls Row (max 4 buttons in a row) */}
              <div className="grid grid-cols-4 gap-2">
                <button
                  type="button"
                  onClick={() => handleSeekRelative(-5)}
                  aria-label="تأخير 5 ثوان"
                  className="min-h-[44px] flex items-center justify-center gap-1 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-900 hover:bg-slate-200 dark:hover:bg-slate-800 px-2 py-2 text-xs font-extrabold transition-colors"
                >
                  <RotateCcw className="h-4 w-4 shrink-0" />
                  <span>-5s</span>
                </button>

                <button
                  type="button"
                  onClick={handleTogglePlayPause}
                  className="min-h-[44px] flex items-center justify-center gap-1.5 rounded-xl bg-emerald-700 hover:bg-emerald-600 px-2 py-2 text-xs sm:text-sm font-extrabold text-white shadow-md transition-colors"
                >
                  {isBuffering ? (
                    <Loader2 className="h-4 w-4 animate-spin shrink-0" />
                  ) : isPlaying ? (
                    <Pause className="h-4 w-4 shrink-0" />
                  ) : (
                    <Play className="h-4 w-4 fill-current shrink-0" />
                  )}
                  <span>{isPlaying ? 'إيقاف مؤقت' : 'استماع'}</span>
                </button>

                <button
                  type="button"
                  onClick={handleStopAudio}
                  aria-label="إيقاف الصوت"
                  className="min-h-[44px] flex items-center justify-center gap-1 rounded-xl border border-rose-500/35 bg-rose-500/10 hover:bg-rose-600 hover:text-white px-2 py-2 text-xs font-extrabold text-rose-700 dark:text-rose-300 transition-colors"
                >
                  <Square className="h-3.5 w-3.5 fill-current shrink-0" />
                  <span>إيقاف</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleSeekRelative(5)}
                  aria-label="تقديم 5 ثوان"
                  className="min-h-[44px] flex items-center justify-center gap-1 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-900 hover:bg-slate-200 dark:hover:bg-slate-800 px-2 py-2 text-xs font-extrabold transition-colors"
                >
                  <span>+5s</span>
                  <RotateCw className="h-4 w-4 shrink-0" />
                </button>
              </div>

              {audioError && (
                <p className="rounded-xl border border-amber-500/35 bg-amber-500/10 px-3 py-1.5 text-[11px] font-bold text-amber-700 dark:text-amber-300 text-center">
                  {audioError}
                </p>
              )}

              {/* Bottom Narrator / Sheikh Dropdown */}
              <div className="flex items-center gap-2">
                <label
                  htmlFor="story-narrator-select"
                  className="text-xs font-extrabold text-slate-700 dark:text-slate-200 shrink-0"
                >
                  اختر الراوي:
                </label>
                <select
                  id="story-narrator-select"
                  value={selectedNarrator}
                  onChange={(e) => handleNarratorChange(e.target.value as NarratorId)}
                  aria-label="اختيار القارئ أو الراوي"
                  className="min-h-[44px] flex-1 rounded-xl border border-amber-500/40 bg-amber-500/10 dark:bg-slate-900 px-3 py-2 text-base sm:text-sm font-extrabold text-slate-900 dark:text-amber-200 focus:outline-none focus:ring-2 focus:ring-amber-500"
                >
                  {PROPHET_NARRATORS.map((n) => (
                    <option
                      key={n.id}
                      value={n.id}
                      className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
                    >
                      {n.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </footer>
        </div>
      )}
    </div>
  );
}
