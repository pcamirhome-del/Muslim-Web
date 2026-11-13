import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';

interface AlquranEditionItem {
  identifier: string;
  ayahs: Array<{
    number: number;
    numberInSurah: number;
    text: string;
    juz: number;
    page: number;
  }>;
}

interface ArchiveFileEntry {
  name: string;
  size?: string;
  length?: string;
}

export interface SharawiAudioMatch {
  fileName: string;
  label: string;
  url: string;
  sizeMB: string;
}

let cachedSharawiFiles: ArchiveFileEntry[] | null = null;
let cachedSharawiAt = 0;

async function getSharawiArchiveIndex(): Promise<ArchiveFileEntry[]> {
  const now = Date.now();
  if (cachedSharawiFiles && now - cachedSharawiAt < 1000 * 60 * 60) {
    return cachedSharawiFiles;
  }
  const res = await fetch(
    'https://archive.org/metadata/Khwater.El-Sharawy.Fi.Tafsir.EL-Quran-Karim-Up_ReDa_MoHamMeD/files',
    { cache: 'no-store' }
  );
  if (!res.ok) return cachedSharawiFiles || [];
  const json = (await res.json()) as { result?: ArchiveFileEntry[] };
  const mp3s = (json.result || []).filter((f) => f.name && f.name.toLowerCase().endsWith('.mp3'));
  cachedSharawiFiles = mp3s;
  cachedSharawiAt = now;
  return mp3s;
}

function matchSharawiEpisodes(files: ArchiveFileEntry[], surah: number, ayah: number): SharawiAudioMatch[] {
  const prefix = `${String(surah).padStart(3, '0')}_`;
  const surahFiles = files.filter((f) => f.name.startsWith(prefix));

  const matches: Array<{ item: SharawiAudioMatch; priority: number }> = [];
  for (const f of surahFiles) {
    const sizeMB = f.size ? (Number(f.size) / 1048576).toFixed(1) : '—';
    const rangeMatch = f.name.match(/(\d{3})_(\d{3})/);
    let label = f.name.replace(/^\d{3}_/, '').replace(/\.mp3$/i, '').replace(/_/g, ' ');
    let priority = 2;

    if (rangeMatch) {
      const startAyah = Number(rangeMatch[1]);
      const endAyah = Number(rangeMatch[2]);
      label = `الآيات ${startAyah} – ${endAyah}`;
      if (ayah > 0 && ayah >= startAyah && ayah <= endAyah) {
        priority = 0;
      } else if (ayah > 0) {
        priority = 3;
      }
    }

    matches.push({
      item: {
        fileName: f.name,
        label,
        url: `https://archive.org/download/Khwater.El-Sharawy.Fi.Tafsir.EL-Quran-Karim-Up_ReDa_MoHamMeD/${encodeURIComponent(
          f.name
        )}`,
        sizeMB,
      },
      priority,
    });
  }

  matches.sort((a, b) => a.priority - b.priority);
  const filtered = ayah > 0 ? matches.filter((m) => m.priority === 0) : matches;
  const finalSelection = filtered.length > 0 ? filtered : matches;
  return finalSelection.slice(0, 12).map((m) => m.item);
}

async function fetchTafsirAppVerse(src: 'muyassar' | 'aysar-altafasir', s: number, a: number): Promise<string> {
  try {
    const res = await fetch(`https://tafsir.app/get.php?src=${src}&s=${s}&a=${a}`, {
      headers: { Accept: 'application/json' },
      next: { revalidate: 86400 },
    });
    if (!res.ok) return '';
    const json = (await res.json()) as { data?: string };
    return (json.data || '').trim();
  } catch {
    return '';
  }
}

export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const book = sp.get('book') || 'muyassar';
  const s = Math.max(1, Math.min(114, Number(sp.get('s')) || 1));
  const a = Math.max(0, Number(sp.get('a')) || 0);
  const offset = Math.max(0, Number(sp.get('offset')) || 0);
  const limit = Math.max(1, Math.min(20, Number(sp.get('limit')) || 10));

  try {
    // Always fetch Uthmani Ayahs + Al-Muyassar in one fast upstream call
    const quranRes = await fetch(
      `https://api.alquran.cloud/v1/surah/${s}/editions/quran-uthmani,ar.muyassar`,
      { next: { revalidate: 86400 } }
    );
    if (!quranRes.ok) {
      return NextResponse.json({ error: 'تعذر الاتصال بخدمة التفسير.' }, { status: 502 });
    }
    const quranJson = (await quranRes.json()) as {
      code: number;
      data: AlquranEditionItem[];
    };

    const uthmani = quranJson.data?.[0]?.ayahs || [];
    const muyassar = quranJson.data?.[1]?.ayahs || [];

    if (uthmani.length === 0) {
      return NextResponse.json({ error: 'لم يتم العثور على بيانات السورة.' }, { status: 404 });
    }

    // Determine target ayah slice
    const targetAyahs =
      a > 0
        ? uthmani.filter((item) => item.numberInSurah === a)
        : uthmani.slice(offset, offset + limit);

    if (book === 'muyassar') {
      const items = targetAyahs.map((item) => {
        const tItem = muyassar.find((m) => m.numberInSurah === item.numberInSurah);
        return {
          numberInSurah: item.numberInSurah,
          juz: item.juz,
          page: item.page,
          ayahText: item.text,
          tafsirText: tItem?.text || '',
        };
      });

      return NextResponse.json({
        book: 'muyassar',
        surahNumber: s,
        totalAyahs: uthmani.length,
        offset,
        hasMore: a === 0 && offset + limit < uthmani.length,
        items,
      });
    }

    if (book === 'aysar') {
      const items = await Promise.all(
        targetAyahs.map(async (item) => {
          const text = await fetchTafsirAppVerse('aysar-altafasir', s, item.numberInSurah);
          const fallbackMuyassar =
            muyassar.find((m) => m.numberInSurah === item.numberInSurah)?.text || '';
          return {
            numberInSurah: item.numberInSurah,
            juz: item.juz,
            page: item.page,
            ayahText: item.text,
            tafsirText: text || fallbackMuyassar,
            usedFallback: !text,
          };
        })
      );

      return NextResponse.json({
        book: 'aysar',
        surahNumber: s,
        totalAyahs: uthmani.length,
        offset,
        hasMore: a === 0 && offset + limit < uthmani.length,
        items,
      });
    }

    // Book: 'sharawi' — returns real Sharawi audio episodes from archive.org + Uthmani & Muyassar reference text
    const [archiveFiles] = await Promise.all([getSharawiArchiveIndex()]);
    const sharawiEpisodes = matchSharawiEpisodes(archiveFiles, s, a);

    const items = targetAyahs.map((item) => {
      const tItem = muyassar.find((m) => m.numberInSurah === item.numberInSurah);
      return {
        numberInSurah: item.numberInSurah,
        juz: item.juz,
        page: item.page,
        ayahText: item.text,
        tafsirText: tItem?.text || '',
      };
    });

    return NextResponse.json({
      book: 'sharawi',
      surahNumber: s,
      totalAyahs: uthmani.length,
      offset,
      hasMore: a === 0 && offset + limit < uthmani.length,
      items,
      sharawiEpisodes,
    });
  } catch {
    return NextResponse.json({ error: 'حدث خطأ أثناء جلب بيانات التفسير.' }, { status: 500 });
  }
}
