'use client';

import React, { useEffect, useRef, useState } from 'react';
import {
  ScrollText,
  Search,
  Download,
  Play,
  Pause,
  CheckCircle2,
  Loader2,
  FolderDown,
  BookMarked,
  HardDriveDownload,
  Trash2,
} from 'lucide-react';
import { CURATED_SAHIH_HADITHS } from '@/lib/data/curated-hadiths';
import type { HadithSearchResult } from '@/app/api/hadith-search/route';
import type { DownloadableMediaItem } from '@/app/api/archive-catalog/route';

const MEDIA_CACHE_NAME = 'noor-media-downloads-v1';

type HadithSubTab = 'curated' | 'search' | 'downloads';
type DownloadCategoryTab = 'prophets' | 'sharawi';

export function HadithAndDownloadsSection() {
  const [subTab, setSubTab] = useState<HadithSubTab>('curated');

  // Curated Hadiths filter
  const [selectedTopic, setSelectedTopic] = useState<string>('الكل');

  // Official Hadith Search Engine state
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [searching, setSearching] = useState<boolean>(false);
  const [searchResults, setSearchResults] = useState<HadithSearchResult[]>([]);
  const [hasSearched, setHasSearched] = useState<boolean>(false);
  const [searchError, setSearchError] = useState<string | null>(null);

  // Direct In-App Downloads (Prophets + Sharawi 30 Juz)
  const [downloadCat, setDownloadCat] = useState<DownloadCategoryTab>('prophets');
  const [prophetsItems, setProphetsItems] = useState<DownloadableMediaItem[]>([]);
  const [sharawiItems, setSharawiItems] = useState<DownloadableMediaItem[]>([]);
  const [loadingCatalog, setLoadingCatalog] = useState<boolean>(false);

  const [cachedUrls, setCachedUrls] = useState<Record<string, boolean>>({});
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [downloadPct, setDownloadPct] = useState<number>(0);
  const [downloadErr, setDownloadErr] = useState<string | null>(null);

  // Integrated In-App Audio Player
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const currentBlobUrlRef = useRef<string | null>(null);
  const [activeMediaId, setActiveMediaId] = useState<string | null>(null);
  const [activeMediaTitle, setActiveMediaTitle] = useState<string>('');
  const [isAudioPlaying, setIsAudioPlaying] = useState<boolean>(false);
  const [isAudioLoading, setIsAudioLoading] = useState<boolean>(false);

  // Check CacheStorage for already downloaded items
  const refreshCachedStatus = async (items: DownloadableMediaItem[]) => {
    if (typeof caches === 'undefined' || items.length === 0) return;
    try {
      const cache = await caches.open(MEDIA_CACHE_NAME);
      const statusMap: Record<string, boolean> = {};
      await Promise.all(
        items.map(async (item) => {
          const match = await cache.match(item.url);
          if (match) statusMap[item.url] = true;
        })
      );
      setCachedUrls((prev) => ({ ...prev, ...statusMap }));
    } catch {
      // ignore
    }
  };

  // Load real Archive.org catalog when Downloads subtab is opened
  useEffect(() => {
    if (subTab !== 'downloads') return;
    if (prophetsItems.length > 0 && sharawiItems.length > 0) return;

    let cancelled = false;
    const loadCatalog = async () => {
      setLoadingCatalog(true);
      try {
        const res = await fetch('/api/archive-catalog');
        const json = (await res.json()) as {
          prophets?: DownloadableMediaItem[];
          sharawi?: DownloadableMediaItem[];
        };
        if (cancelled) return;
        const pList = json.prophets || [];
        const sList = json.sharawi || [];
        setProphetsItems(pList);
        setSharawiItems(sList);
        await refreshCachedStatus([...pList, ...sList]);
      } catch {
        // ignore
      } finally {
        if (!cancelled) setLoadingCatalog(false);
      }
    };

    const t = setTimeout(loadCatalog, 0);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [subTab, prophetsItems.length, sharawiItems.length]);

  const executeHadithSearch = async (topicQuery: string) => {
    const clean = topicQuery.trim();
    if (!clean) return;
    setSearchQuery(clean);
    setSearching(true);
    setSearchError(null);
    setHasSearched(true);

    try {
      const res = await fetch(`/api/hadith-search?q=${encodeURIComponent(clean)}`);
      const json = (await res.json()) as {
        results?: HadithSearchResult[];
        error?: string;
      };
      if (!res.ok || json.error) {
        setSearchError(json.error || 'تعذر البحث حالياً.');
        setSearchResults([]);
      } else {
        setSearchResults(json.results || []);
      }
    } catch {
      setSearchError('تعذر الاتصال بمحرك البحث الرسمي للأحاديث.');
      setSearchResults([]);
    } finally {
      setSearching(false);
    }
  };

  // Direct In-App Fetch + ReadableStream Progress + CacheStorage Save (Zero external links!)
  const handleDirectDownload = async (item: DownloadableMediaItem) => {
    if (downloadingId) return;
    setDownloadingId(item.id);
    setDownloadPct(0);
    setDownloadErr(null);

    try {
      const proxyUrl = `/api/proxy-media?url=${encodeURIComponent(item.url)}`;
      const res = await fetch(proxyUrl);
      if (!res.ok) throw new Error('Download failed');

      const totalHeader = Number(res.headers.get('content-length')) || item.sizeBytes || 0;

      if (res.body) {
        const reader = res.body.getReader();
        const chunks: BlobPart[] = [];
        let received = 0;

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          if (value) {
            chunks.push(value);
            received += value.byteLength;
            if (totalHeader > 0) {
              setDownloadPct(Math.min(99, Math.round((received / totalHeader) * 100)));
            } else {
              setDownloadPct((p) => Math.min(95, p + 5));
            }
          }
        }

        const blob = new Blob(chunks, { type: 'audio/mpeg' });
        if (typeof caches !== 'undefined') {
          const cache = await caches.open(MEDIA_CACHE_NAME);
          await cache.put(
            item.url,
            new Response(blob, {
              headers: {
                'Content-Type': 'audio/mpeg',
                'Content-Length': String(blob.size),
              },
            })
          );
        }
        setCachedUrls((prev) => ({ ...prev, [item.url]: true }));
        setDownloadPct(100);
      } else {
        const blob = await res.blob();
        if (typeof caches !== 'undefined') {
          const cache = await caches.open(MEDIA_CACHE_NAME);
          await cache.put(
            item.url,
            new Response(blob, { headers: { 'Content-Type': 'audio/mpeg' } })
          );
        }
        setCachedUrls((prev) => ({ ...prev, [item.url]: true }));
        setDownloadPct(100);
      }

      setTimeout(() => {
        setDownloadingId(null);
        setDownloadPct(0);
      }, 900);
    } catch {
      setDownloadingId(null);
      setDownloadPct(0);
      setDownloadErr(`تعذر تحميل "${item.title}". تأكد من اتصالك بالإنترنت وأعد المحاولة.`);
    }
  };

  // Save cached Blob directly to user device via local ObjectURL (zero external tab!)
  const handleSaveBlobToDevice = async (item: DownloadableMediaItem) => {
    if (typeof caches === 'undefined') return;
    try {
      const cache = await caches.open(MEDIA_CACHE_NAME);
      const cached = await cache.match(item.url);
      if (!cached) return;
      const blob = await cached.blob();
      const objUrl = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = objUrl;
      a.download = `${item.title.replace(/[^\u0600-\u06FFa-zA-Z0-9\s-]/g, '').trim() || item.id}.mp3`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(objUrl), 5000);
    } catch {
      // ignore
    }
  };

  const handleDeleteCached = async (item: DownloadableMediaItem) => {
    if (typeof caches === 'undefined') return;
    try {
      const cache = await caches.open(MEDIA_CACHE_NAME);
      await cache.delete(item.url);
      setCachedUrls((prev) => {
        const next = { ...prev };
        delete next[item.url];
        return next;
      });
    } catch {
      // ignore
    }
  };

  // Play either cached offline Blob or stream in-app
  const handlePlayMedia = async (item: DownloadableMediaItem) => {
    if (!audioRef.current) {
      audioRef.current = new Audio();
      audioRef.current.onplaying = () => {
        setIsAudioPlaying(true);
        setIsAudioLoading(false);
      };
      audioRef.current.onwaiting = () => setIsAudioLoading(true);
      audioRef.current.onpause = () => setIsAudioPlaying(false);
      audioRef.current.onended = () => setIsAudioPlaying(false);
    }

    const audio = audioRef.current;

    if (activeMediaId === item.id) {
      if (isAudioPlaying) {
        audio.pause();
      } else {
        audio.play().catch(() => {});
      }
      return;
    }

    setIsAudioLoading(true);
    setActiveMediaId(item.id);
    setActiveMediaTitle(item.title);

    if (currentBlobUrlRef.current) {
      URL.revokeObjectURL(currentBlobUrlRef.current);
      currentBlobUrlRef.current = null;
    }

    let playSrc = item.url;
    if (typeof caches !== 'undefined') {
      try {
        const cache = await caches.open(MEDIA_CACHE_NAME);
        const match = await cache.match(item.url);
        if (match) {
          const blob = await match.blob();
          playSrc = URL.createObjectURL(blob);
          currentBlobUrlRef.current = playSrc;
        }
      } catch {
        // fallback to network URL
      }
    }

    audio.src = playSrc;
    audio.play().catch(() => {
      setIsAudioLoading(false);
    });

    if ('mediaSession' in navigator) {
      navigator.mediaSession.metadata = new MediaMetadata({
        title: item.title,
        artist: item.subtitle,
        album: 'نور الإسلام — المكتبة الصوتية',
        artwork: [{ src: '/pwa-192x192.png', sizes: '192x192', type: 'image/png' }],
      });
    }
  };

  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.removeAttribute('src');
      }
      if (currentBlobUrlRef.current) {
        URL.revokeObjectURL(currentBlobUrlRef.current);
      }
    };
  }, []);

  const topics = ['الكل', 'الصلاة', 'الصدق', 'بر الوالدين', 'الصبر', 'الرزق والتوكل', 'الجنة', 'الأخلاق'];

  const filteredCurated =
    selectedTopic === 'الكل'
      ? CURATED_SAHIH_HADITHS
      : CURATED_SAHIH_HADITHS.filter(
          (h) =>
            h.topic.includes(selectedTopic) ||
            h.title.includes(selectedTopic) ||
            h.text.includes(selectedTopic)
        );

  const visibleDownloads = downloadCat === 'prophets' ? prophetsItems : sharawiItems;

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg sm:text-xl font-bold flex items-center gap-2">
          <ScrollText className="h-5 w-5 text-amber-500 shrink-0" />
          <span>الأحاديث النبوية الشريفة والتحميل المباشر</span>
        </h2>
        <p className="text-xs text-slate-600 dark:text-slate-300 mt-0.5">
          أكثر من ٢٥ حديثاً صحيحاً، ومحرك بحث متصل بالموسوعة النبوية والكتب الستة، وتحميل مباشر
          لقصص الأنبياء وتفسير الشعراوي داخل التطبيق.
        </p>
      </div>

      {/* 3 Sub-Tabs (<= 4 buttons per row) */}
      <div className="grid grid-cols-3 gap-1.5">
        <button
          type="button"
          onClick={() => setSubTab('curated')}
          className={`min-h-[44px] flex items-center justify-center gap-1 rounded-xl px-1 py-2 text-[10px] sm:text-xs font-bold leading-tight text-center break-words transition-colors ${
            subTab === 'curated'
              ? 'bg-emerald-700 text-white'
              : 'border border-slate-200 dark:border-slate-700 bg-white/80 dark:bg-slate-900/80'
          }`}
        >
          <BookMarked className="h-3.5 w-3.5 shrink-0 hidden sm:block" />
          <span>٢٨ حديثاً صحيحاً</span>
        </button>

        <button
          type="button"
          onClick={() => setSubTab('search')}
          className={`min-h-[44px] flex items-center justify-center gap-1 rounded-xl px-1 py-2 text-[10px] sm:text-xs font-bold leading-tight text-center break-words transition-colors ${
            subTab === 'search'
              ? 'bg-amber-600 text-white'
              : 'border border-slate-200 dark:border-slate-700 bg-white/80 dark:bg-slate-900/80'
          }`}
        >
          <Search className="h-3.5 w-3.5 shrink-0 hidden sm:block" />
          <span>محرك البحث الرسمي</span>
        </button>

        <button
          type="button"
          onClick={() => setSubTab('downloads')}
          className={`min-h-[44px] flex items-center justify-center gap-1 rounded-xl px-1 py-2 text-[10px] sm:text-xs font-bold leading-tight text-center break-words transition-colors ${
            subTab === 'downloads'
              ? 'bg-emerald-700 text-white'
              : 'border border-slate-200 dark:border-slate-700 bg-white/80 dark:bg-slate-900/80'
          }`}
        >
          <FolderDown className="h-3.5 w-3.5 shrink-0 hidden sm:block" />
          <span>التحميل المباشر</span>
        </button>
      </div>

      {/* SubTab 1: 28 Curated Sahih Hadiths */}
      {subTab === 'curated' && (
        <div className="space-y-3">
          {/* 4-per-row Topic Filter Buttons */}
          <div className="grid grid-cols-4 gap-1.5">
            {topics.map((topic) => (
              <button
                key={topic}
                type="button"
                onClick={() => setSelectedTopic(topic)}
                className={`min-h-[40px] rounded-xl px-1 py-1.5 text-[10px] sm:text-xs font-bold leading-tight text-center break-words transition-colors ${
                  selectedTopic === topic
                    ? 'bg-amber-600 text-white'
                    : 'border border-slate-200 dark:border-slate-700 bg-white/80 dark:bg-slate-900/80'
                }`}
              >
                {topic}
              </button>
            ))}
          </div>

          <div className="space-y-3">
            {filteredCurated.map((h, idx) => (
              <article
                key={h.id}
                className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-900/80 p-4 space-y-2.5"
              >
                <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                  <span className="font-extrabold text-amber-700 dark:text-amber-300">
                    {idx + 1}. {h.title}
                  </span>
                  <span className="rounded-lg bg-emerald-700 px-2 py-0.5 text-[10px] font-bold text-white">
                    {h.grade}
                  </span>
                </div>

                <p className="text-sm sm:text-base font-semibold leading-[1.95] text-slate-900 dark:text-amber-50">
                  {h.text}
                </p>

                <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white/75 dark:bg-slate-950/60 p-3 space-y-1 text-xs">
                  <p>
                    <strong className="text-emerald-700 dark:text-emerald-300">الراوي:</strong>{' '}
                    {h.narrator}
                  </p>
                  <p>
                    <strong className="text-emerald-700 dark:text-emerald-300">التخريج:</strong>{' '}
                    {h.source}
                  </p>
                  <p className="leading-relaxed pt-1">
                    <strong className="text-amber-700 dark:text-amber-300">الشرح المبسط:</strong>{' '}
                    {h.explanation}
                  </p>
                </div>
              </article>
            ))}
          </div>
        </div>
      )}

      {/* SubTab 2: Official Hadith Topic Search Engine */}
      {subTab === 'search' && (
        <div className="space-y-3">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              executeHadithSearch(searchQuery);
            }}
            className="flex gap-2"
          >
            <input
              type="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="ابحث بالموضوع (مثل: الصدق، الصلاة، بر الوالدين، الرزق، الصبر، الجنة)..."
              className="flex-1 min-h-[46px] rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-xs sm:text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-amber-500"
            />
            <button
              type="submit"
              disabled={searching}
              className="min-h-[46px] shrink-0 rounded-xl bg-emerald-700 hover:bg-emerald-600 px-4 text-xs sm:text-sm font-bold text-white flex items-center gap-1.5 transition-colors"
            >
              {searching ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
              <span>بحث</span>
            </button>
          </form>

          {/* Quick Search Topics (strictly 4 per row) */}
          <div className="grid grid-cols-4 gap-1.5">
            {['الصدق', 'الصلاة', 'بر الوالدين', 'الرزق', 'الصبر', 'الجنة', 'التوبة', 'الأمانة'].map(
              (t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => executeHadithSearch(t)}
                  className="min-h-[40px] rounded-xl border border-amber-500/30 bg-amber-500/10 px-1 py-1.5 text-[10px] sm:text-xs font-bold leading-tight text-center break-words hover:bg-amber-500/20 transition-colors"
                >
                  {t}
                </button>
              )
            )}
          </div>

          {searching ? (
            <div className="flex flex-col items-center justify-center py-10 gap-2 text-slate-500">
              <Loader2 className="h-7 w-7 animate-spin text-amber-500" />
              <span className="text-sm font-semibold">
                جارٍ البحث في صحيح البخاري ومسلم وموسوعة الأحاديث النبوية...
              </span>
            </div>
          ) : searchError ? (
            <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-3 text-xs font-semibold text-rose-700 dark:text-rose-300">
              {searchError}
            </div>
          ) : hasSearched && searchResults.length === 0 ? (
            <div className="rounded-2xl border border-slate-200 dark:border-slate-800 p-6 text-center text-sm font-semibold text-slate-500">
              لم يتم العثور على نتائج مطابقة لـ «{searchQuery}». جرّب كلمة أخرى مثل: الصدق أو
              الصلاة.
            </div>
          ) : (
            <div className="space-y-3">
              {searchResults.map((res) => (
                <article
                  key={res.id}
                  className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-900/80 p-4 space-y-2"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                    <span className="font-bold text-emerald-700 dark:text-emerald-300">
                      {res.source}
                    </span>
                    <span className="rounded-lg bg-amber-600 px-2 py-0.5 text-[10px] font-bold text-white">
                      {res.grade}
                    </span>
                  </div>
                  <p className="text-sm sm:text-base font-semibold leading-[1.9]">
                    {res.text}
                  </p>
                  <p className="text-xs text-slate-600 dark:text-slate-300">
                    <strong>التخريج:</strong> {res.attribution}
                  </p>
                  {res.explanation && (
                    <p className="text-xs leading-relaxed rounded-xl border border-slate-200 dark:border-slate-800 bg-white/75 dark:bg-slate-950/60 p-2.5">
                      <strong className="text-amber-700 dark:text-amber-300">الشرح:</strong>{' '}
                      {res.explanation}
                    </p>
                  )}
                </article>
              ))}
            </div>
          )}
        </div>
      )}

      {/* SubTab 3: In-App Direct Downloads (Prophets Stories & Sharawi 30 Juz) */}
      {subTab === 'downloads' && (
        <div className="space-y-3">
          {/* Category Switch (2 buttons) */}
          <div className="grid grid-cols-2 gap-1.5">
            <button
              type="button"
              onClick={() => setDownloadCat('prophets')}
              className={`min-h-[44px] rounded-xl px-1 py-2 text-[10px] sm:text-xs font-bold leading-tight text-center break-words transition-colors ${
                downloadCat === 'prophets'
                  ? 'bg-emerald-700 text-white'
                  : 'border border-slate-200 dark:border-slate-700 bg-white/80 dark:bg-slate-900/80'
              }`}
            >
              أجزاء قصص الأنبياء (١٩ جزءاً)
            </button>
            <button
              type="button"
              onClick={() => setDownloadCat('sharawi')}
              className={`min-h-[44px] rounded-xl px-1 py-2 text-[10px] sm:text-xs font-bold leading-tight text-center break-words transition-colors ${
                downloadCat === 'sharawi'
                  ? 'bg-amber-600 text-white'
                  : 'border border-slate-200 dark:border-slate-700 bg-white/80 dark:bg-slate-900/80'
              }`}
            >
              تفسير الشعراوي (٣٠ جزءاً كاملة)
            </button>
          </div>

          {/* Active In-App Player Banner */}
          {activeMediaId && (
            <div className="rounded-2xl border border-emerald-500/40 bg-emerald-500/15 p-3 flex items-center justify-between gap-2">
              <div className="min-w-0">
                <p className="text-[11px] font-bold text-emerald-700 dark:text-emerald-300">
                  المشغل الداخلي (يعمل أوفلاين عند التحميل)
                </p>
                <p className="text-xs sm:text-sm font-extrabold truncate">{activeMediaTitle}</p>
              </div>
              <button
                type="button"
                onClick={() => {
                  const found = visibleDownloads.find((i) => i.id === activeMediaId);
                  if (found) handlePlayMedia(found);
                }}
                className="min-h-[42px] shrink-0 rounded-xl bg-emerald-700 px-3 text-xs font-bold text-white flex items-center gap-1.5"
              >
                {isAudioLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : isAudioPlaying ? (
                  <Pause className="h-4 w-4" />
                ) : (
                  <Play className="h-4 w-4" />
                )}
                <span>{isAudioPlaying ? 'إيقاف مؤقت' : 'تشغيل'}</span>
              </button>
            </div>
          )}

          {downloadErr && (
            <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-3 text-xs font-semibold text-rose-700 dark:text-rose-300">
              {downloadErr}
            </div>
          )}

          {loadingCatalog ? (
            <div className="flex flex-col items-center justify-center py-10 gap-2 text-slate-500">
              <Loader2 className="h-7 w-7 animate-spin text-amber-500" />
              <span className="text-sm font-semibold">جارٍ تجهيز الأجزاء المباشرة للتحميل...</span>
            </div>
          ) : (
            <div className="space-y-2.5">
              {visibleDownloads.map((item) => {
                const isCached = Boolean(cachedUrls[item.url]);
                const isDownloading = downloadingId === item.id;
                const isPlayingThis = activeMediaId === item.id && isAudioPlaying;

                return (
                  <div
                    key={item.id}
                    className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-900/80 p-3.5 space-y-2.5"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <h3 className="text-xs sm:text-sm font-extrabold flex items-center gap-1.5">
                          <span className="font-mono-num inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-amber-500/20 text-amber-700 dark:text-amber-300 text-[11px] font-bold">
                            {item.partNumber}
                          </span>
                          <span className="truncate">{item.title}</span>
                        </h3>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 truncate">
                          {item.subtitle} · <span className="font-mono-num">{item.sizeLabel}</span>
                        </p>
                      </div>

                      {isCached && (
                        <span className="shrink-0 inline-flex items-center gap-1 rounded-lg bg-emerald-700 px-2 py-0.5 text-[10px] font-bold text-white">
                          <CheckCircle2 className="h-3 w-3" />
                          <span>محفوظ أوفلاين</span>
                        </span>
                      )}
                    </div>

                    {/* Real Progress Bar during In-App Download */}
                    {isDownloading && (
                      <div className="space-y-1">
                        <div className="flex justify-between text-[11px] font-bold">
                          <span>جارٍ الحفظ في ذاكرة التطبيق...</span>
                          <span className="font-mono-num text-amber-600 dark:text-amber-400">
                            {downloadPct}%
                          </span>
                        </div>
                        <div className="h-2 w-full overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800">
                          <div
                            className="h-full rounded-full bg-emerald-600 transition-all duration-150"
                            style={{ width: `${downloadPct}%` }}
                          />
                        </div>
                      </div>
                    )}

                    {/* Action Buttons (<= 3 buttons per row, strictly no external links) */}
                    <div className="grid grid-cols-3 gap-1.5">
                      <button
                        type="button"
                        onClick={() => handlePlayMedia(item)}
                        className={`min-h-[42px] flex items-center justify-center gap-1 rounded-xl px-1 py-1.5 text-[10px] sm:text-xs font-bold leading-tight text-center break-words transition-colors ${
                          isPlayingThis
                            ? 'bg-emerald-700 text-white'
                            : 'border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800'
                        }`}
                      >
                        {isPlayingThis ? (
                          <Pause className="h-3.5 w-3.5 shrink-0" />
                        ) : (
                          <Play className="h-3.5 w-3.5 shrink-0" />
                        )}
                        <span>{isPlayingThis ? 'إيقاف' : 'استماع الآن'}</span>
                      </button>

                      {!isCached ? (
                        <button
                          type="button"
                          onClick={() => handleDirectDownload(item)}
                          disabled={Boolean(downloadingId)}
                          className="col-span-2 min-h-[42px] flex items-center justify-center gap-1.5 rounded-xl bg-amber-600 hover:bg-amber-500 disabled:opacity-50 px-2 py-1.5 text-[10px] sm:text-xs font-bold leading-tight text-center break-words text-white transition-colors"
                        >
                          {isDownloading ? (
                            <Loader2 className="h-3.5 w-3.5 shrink-0 animate-spin" />
                          ) : (
                            <Download className="h-3.5 w-3.5 shrink-0" />
                          )}
                          <span>
                            {isDownloading
                              ? `تحميل ${downloadPct}%`
                              : 'تحميل وحفظ أوفلاين داخل التطبيق'}
                          </span>
                        </button>
                      ) : (
                        <>
                          <button
                            type="button"
                            onClick={() => handleSaveBlobToDevice(item)}
                            className="min-h-[42px] flex items-center justify-center gap-1 rounded-xl bg-emerald-700 hover:bg-emerald-600 px-1 py-1.5 text-[10px] sm:text-xs font-bold leading-tight text-center break-words text-white transition-colors"
                          >
                            <HardDriveDownload className="h-3.5 w-3.5 shrink-0" />
                            <span>حفظ على الجهاز</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteCached(item)}
                            className="min-h-[42px] flex items-center justify-center gap-1 rounded-xl border border-rose-500/35 bg-rose-500/10 px-1 py-1.5 text-[10px] sm:text-xs font-bold leading-tight text-center break-words text-rose-700 dark:text-rose-300 transition-colors"
                          >
                            <Trash2 className="h-3.5 w-3.5 shrink-0" />
                            <span>حذف المحفوظ</span>
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
