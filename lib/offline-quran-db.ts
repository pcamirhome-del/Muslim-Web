import {
  ReciterRiwayahStream,
  RiwayahId,
  getEveryAyahUrl,
  getFullSurahMp3Url,
} from './data/quran-reciters';

export const OFFLINE_AUDIO_CACHE = 'noor-quran-audio-v1';
export const OFFLINE_TEXT_CACHE = 'noor-quran-pages-v1';
export const OFFLINE_MEDIA_CACHE = 'noor-media-downloads-v1';

const DB_NAME = 'noor-islam-offline-db';
const DB_VERSION = 1;
const STORE_SURAH_TEXT = 'surahs';
const STORE_DOWNLOADS = 'downloads';

export interface OfflineDownloadRecord {
  key: string; // `${reciterId}:${riwayah}:${surahNumber}`
  reciterId: string;
  reciterName: string;
  riwayah: RiwayahId;
  surahNumber: number;
  surahName: string;
  ayahCount: number;
  mode: 'ayah' | 'surah';
  downloadedAt: number;
}

export interface StoredSurahPayload {
  surahNumber: number;
  name: string;
  ayahs: Array<{
    number: number;
    numberInSurah: number;
    text: string;
    page: number;
    juz: number;
    surah: { number: number; name: string };
  }>;
}

function openOfflineDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      reject(new Error('IndexedDB unavailable'));
      return;
    }
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE_SURAH_TEXT)) {
        db.createObjectStore(STORE_SURAH_TEXT, { keyPath: 'surahNumber' });
      }
      if (!db.objectStoreNames.contains(STORE_DOWNLOADS)) {
        db.createObjectStore(STORE_DOWNLOADS, { keyPath: 'key' });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export function buildDownloadKey(
  reciterId: string,
  riwayah: RiwayahId,
  surahNumber: number
): string {
  return `${reciterId}:${riwayah}:${surahNumber}`;
}

export async function saveSurahTextToIDB(payload: StoredSurahPayload): Promise<void> {
  try {
    const db = await openOfflineDB();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_SURAH_TEXT, 'readwrite');
      tx.objectStore(STORE_SURAH_TEXT).put(payload);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch {
    // fallback silently
  }
}

export async function getSurahTextFromIDB(
  surahNumber: number
): Promise<StoredSurahPayload | null> {
  try {
    const db = await openOfflineDB();
    return await new Promise<StoredSurahPayload | null>((resolve) => {
      const tx = db.transaction(STORE_SURAH_TEXT, 'readonly');
      const req = tx.objectStore(STORE_SURAH_TEXT).get(surahNumber);
      req.onsuccess = () => resolve((req.result as StoredSurahPayload) || null);
      req.onerror = () => resolve(null);
    });
  } catch {
    return null;
  }
}

export async function getAllOfflineDownloads(): Promise<OfflineDownloadRecord[]> {
  try {
    const db = await openOfflineDB();
    return await new Promise<OfflineDownloadRecord[]>((resolve) => {
      const tx = db.transaction(STORE_DOWNLOADS, 'readonly');
      const req = tx.objectStore(STORE_DOWNLOADS).getAll();
      req.onsuccess = () => resolve((req.result as OfflineDownloadRecord[]) || []);
      req.onerror = () => resolve([]);
    });
  } catch {
    return [];
  }
}

async function saveDownloadRecord(record: OfflineDownloadRecord): Promise<void> {
  const db = await openOfflineDB();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE_DOWNLOADS, 'readwrite');
    tx.objectStore(STORE_DOWNLOADS).put(record);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

/**
 * Retrieve cached audio Blob URL from CacheStorage if downloaded offline, or return network URL
 */
export async function resolveOfflineAudioSrc(url: string): Promise<{
  src: string;
  isBlob: boolean;
}> {
  if (typeof caches !== 'undefined') {
    try {
      const cache = await caches.open(OFFLINE_AUDIO_CACHE);
      const match = await cache.match(url);
      if (match) {
        const blob = await match.blob();
        return { src: URL.createObjectURL(blob), isBlob: true };
      }
    } catch {
      // fall through
    }
  }
  return { src: url, isBlob: false };
}

/**
 * Download complete Surah Uthmani text + pages + audio into CacheStorage & IndexedDB with real 0..100% progress
 */
export async function downloadSurahForOffline(params: {
  surahNumber: number;
  surahName: string;
  ayahCount: number;
  reciterId: string;
  reciterName: string;
  stream: ReciterRiwayahStream;
  onProgress: (percent: number) => void;
}): Promise<OfflineDownloadRecord> {
  const { surahNumber, surahName, ayahCount, reciterId, reciterName, stream, onProgress } = params;

  onProgress(2);

  // 1. Fetch & cache Surah Uthmani JSON + individual Mushaf pages touched by this Surah
  const textCache = await caches.open(OFFLINE_TEXT_CACHE);
  const surahApiUrl = `https://api.alquran.cloud/v1/surah/${surahNumber}/quran-uthmani`;
  const surahRes = await fetch(surahApiUrl);
  if (!surahRes.ok) throw new Error('تعذر تحميل نص السورة');
  const surahJson = await surahRes.json();
  await textCache.put(
    surahApiUrl,
    new Response(JSON.stringify(surahJson), {
      headers: { 'Content-Type': 'application/json' },
    })
  );

  const rawAyahs = (surahJson.data?.ayahs || []) as Array<{
    number: number;
    numberInSurah: number;
    text: string;
    page: number;
    juz: number;
  }>;

  await saveSurahTextToIDB({
    surahNumber,
    name: surahName,
    ayahs: rawAyahs.map((a) => ({
      ...a,
      surah: { number: surahNumber, name: surahName },
    })),
  });

  // Cache all Mushaf pages belonging to this Surah
  const uniquePages = Array.from(new Set(rawAyahs.map((a) => a.page)));
  for (const page of uniquePages) {
    const pageUrl = `https://api.alquran.cloud/v1/page/${page}/quran-uthmani`;
    const existing = await textCache.match(pageUrl);
    if (!existing) {
      try {
        const pr = await fetch(pageUrl);
        if (pr.ok) await textCache.put(pageUrl, pr.clone());
      } catch {
        // continue
      }
    }
  }

  onProgress(10);

  // 2. Download Audio into CacheStorage with real progress tracking
  const audioCache = await caches.open(OFFLINE_AUDIO_CACHE);

  if (stream.everyayahFolder) {
    const total = ayahCount;
    let completed = 0;
    const urls = Array.from({ length: total }, (_, idx) =>
      getEveryAyahUrl(stream.everyayahFolder!, surahNumber, idx + 1)
    );

    const concurrency = 4;
    let cursor = 0;

    const worker = async () => {
      while (cursor < urls.length) {
        const myIdx = cursor++;
        const audioUrl = urls[myIdx];
        const cached = await audioCache.match(audioUrl);
        if (!cached) {
          const resp = await fetch(audioUrl);
          if (resp.ok) {
            await audioCache.put(audioUrl, resp.clone());
          }
        }
        completed += 1;
        const pct = 10 + Math.round((completed / total) * 88);
        onProgress(Math.min(98, pct));
      }
    };

    await Promise.all(Array.from({ length: concurrency }, () => worker()));
  } else {
    // Full Surah MP3 stream download with byte-level progress
    const fullUrl = getFullSurahMp3Url(stream.mp3quranServer, surahNumber);
    const resp = await fetch(fullUrl);
    if (!resp.ok) throw new Error('تعذر تحميل الملف الصوتي للسورة');

    const contentLength = Number(resp.headers.get('content-length') || 0);
    if (resp.body && contentLength > 0) {
      const reader = resp.body.getReader();
      const chunks: Uint8Array[] = [];
      let received = 0;
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        if (value) {
          chunks.push(value);
          received += value.byteLength;
          const pct = 10 + Math.round((received / contentLength) * 88);
          onProgress(Math.min(98, pct));
        }
      }
      const blob = new Blob(chunks as BlobPart[], { type: 'audio/mpeg' });
      await audioCache.put(
        fullUrl,
        new Response(blob, {
          status: 200,
          headers: { 'Content-Type': 'audio/mpeg' },
        })
      );
    } else {
      await audioCache.put(fullUrl, resp.clone());
    }
  }

  const record: OfflineDownloadRecord = {
    key: buildDownloadKey(reciterId, stream.riwayah, surahNumber),
    reciterId,
    reciterName,
    riwayah: stream.riwayah,
    surahNumber,
    surahName,
    ayahCount,
    mode: stream.everyayahFolder ? 'ayah' : 'surah',
    downloadedAt: Date.now(),
  };

  await saveDownloadRecord(record);
  onProgress(100);
  return record;
}

export interface SurahIndexItem {
  number: number;
  name: string;
  englishName: string;
  numberOfAyahs: number;
  revelationType: string;
}

/**
 * Fetch and cache the complete 114-Surah metadata list for full-Quran queue downloads
 */
export async function fetchAllSurahMetadata(): Promise<SurahIndexItem[]> {
  const url = 'https://api.alquran.cloud/v1/surah';
  if (typeof caches !== 'undefined') {
    try {
      const cache = await caches.open(OFFLINE_TEXT_CACHE);
      const cached = await cache.match(url);
      if (cached) {
        const json = await cached.json();
        if (Array.isArray(json?.data) && json.data.length === 114) {
          return json.data as SurahIndexItem[];
        }
      }
    } catch {
      // fall through to network
    }
  }

  const res = await fetch(url);
  if (!res.ok) throw new Error('تعذر جلب فهرس سور القرآن الكريم');
  const json = await res.json();
  if (!Array.isArray(json?.data)) {
    throw new Error('بيانات فهرس السور غير صالحة');
  }

  if (typeof caches !== 'undefined') {
    try {
      const cache = await caches.open(OFFLINE_TEXT_CACHE);
      await cache.put(
        url,
        new Response(JSON.stringify(json), {
          headers: { 'Content-Type': 'application/json' },
        })
      );
    } catch {
      // ignore cache write errors
    }
  }

  return json.data as SurahIndexItem[];
}

export interface StorageUsageStats {
  usageBytes: number;
  quotaBytes: number;
  quranAudioEntries: number;
  quranTextEntries: number;
  mediaEntries: number;
}

/**
 * Inspect real CacheStorage counts and navigator.storage.estimate()
 */
export async function getOfflineStorageStats(): Promise<StorageUsageStats> {
  let usageBytes = 0;
  let quotaBytes = 0;
  let quranAudioEntries = 0;
  let quranTextEntries = 0;
  let mediaEntries = 0;

  if (typeof navigator !== 'undefined' && navigator.storage?.estimate) {
    try {
      const est = await navigator.storage.estimate();
      usageBytes = est.usage || 0;
      quotaBytes = est.quota || 0;
    } catch {
      // ignore
    }
  }

  if (typeof caches !== 'undefined') {
    try {
      const [audioCache, textCache, mediaCache] = await Promise.all([
        caches.open(OFFLINE_AUDIO_CACHE),
        caches.open(OFFLINE_TEXT_CACHE),
        caches.open(OFFLINE_MEDIA_CACHE),
      ]);
      const [audioKeys, textKeys, mediaKeys] = await Promise.all([
        audioCache.keys(),
        textCache.keys(),
        mediaCache.keys(),
      ]);
      quranAudioEntries = audioKeys.length;
      quranTextEntries = textKeys.length;
      mediaEntries = mediaKeys.length;
    } catch {
      // ignore
    }
  }

  return {
    usageBytes,
    quotaBytes,
    quranAudioEntries,
    quranTextEntries,
    mediaEntries,
  };
}

/**
 * Remove downloaded Surahs & cached audio files for a specific Reciter + Riwayah bundle
 */
export async function deleteOfflineRecitationBundle(
  reciterId: string,
  riwayah: RiwayahId,
  stream?: ReciterRiwayahStream
): Promise<void> {
  const all = await getAllOfflineDownloads();
  const targets = all.filter((d) => d.reciterId === reciterId && d.riwayah === riwayah);

  try {
    const db = await openOfflineDB();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_DOWNLOADS, 'readwrite');
      const store = tx.objectStore(STORE_DOWNLOADS);
      for (const item of targets) {
        store.delete(item.key);
      }
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch {
    // ignore IDB error
  }

  if (stream && typeof caches !== 'undefined') {
    try {
      const audioCache = await caches.open(OFFLINE_AUDIO_CACHE);
      const keys = await audioCache.keys();
      const folderToken = stream.everyayahFolder
        ? `everyayah.com/data/${stream.everyayahFolder}/`
        : null;
      const serverBase = stream.mp3quranServer.endsWith('/')
        ? stream.mp3quranServer
        : `${stream.mp3quranServer}/`;

      await Promise.all(
        keys.map((req) => {
          const matchesFolder = folderToken ? req.url.includes(folderToken) : false;
          const matchesServer = req.url.startsWith(serverBase);
          if (matchesFolder || matchesServer) {
            return audioCache.delete(req);
          }
          return Promise.resolve(false);
        })
      );
    } catch {
      // ignore
    }
  }
}

/**
 * Clear all offline Quran text, audio, and media caches
 */
export async function clearAllOfflineCaches(): Promise<void> {
  try {
    const db = await openOfflineDB();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction([STORE_DOWNLOADS, STORE_SURAH_TEXT], 'readwrite');
      tx.objectStore(STORE_DOWNLOADS).clear();
      tx.objectStore(STORE_SURAH_TEXT).clear();
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch {
    // ignore
  }

  if (typeof caches !== 'undefined') {
    try {
      await Promise.all([
        caches.delete(OFFLINE_AUDIO_CACHE),
        caches.delete(OFFLINE_TEXT_CACHE),
        caches.delete(OFFLINE_MEDIA_CACHE),
      ]);
    } catch {
      // ignore
    }
  }
}
