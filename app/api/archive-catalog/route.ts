import { NextResponse } from 'next/server';

export const runtime = 'nodejs';

interface ArchiveFileEntry {
  name: string;
  size?: string;
  length?: string;
}

export interface DownloadableMediaItem {
  id: string;
  category: 'prophets' | 'sharawi';
  partNumber: number;
  title: string;
  subtitle: string;
  url: string;
  sizeBytes: number;
  sizeLabel: string;
}

const JUZ_SURAH_MAP: Array<{ juz: number; label: string; surahNumbers: number[] }> = [
  { juz: 1, label: 'الجزء الأول (الفاتحة — البقرة ١٤١)', surahNumbers: [1, 2] },
  { juz: 2, label: 'الجزء الثاني (البقرة ١٤٢ — ٢٥٢)', surahNumbers: [2] },
  { juz: 3, label: 'الجزء الثالث (البقرة ٢٥٣ — آل عمران ٩٢)', surahNumbers: [2, 3] },
  { juz: 4, label: 'الجزء الرابع (آل عمران ٩٣ — النساء ٢٣)', surahNumbers: [3, 4] },
  { juz: 5, label: 'الجزء الخامس (النساء ٢٤ — ١٤٧)', surahNumbers: [4] },
  { juz: 6, label: 'الجزء السادس (النساء ١٤٨ — المائدة ٨١)', surahNumbers: [4, 5] },
  { juz: 7, label: 'الجزء السابع (المائدة ٨٢ — الأنعام ١١٠)', surahNumbers: [5, 6] },
  { juz: 8, label: 'الجزء الثامن (الأنعام ١١١ — الأعراف ٨٧)', surahNumbers: [6, 7] },
  { juz: 9, label: 'الجزء التاسع (الأعراف ٨٨ — الأنفال ٤٠)', surahNumbers: [7, 8] },
  { juz: 10, label: 'الجزء العاشر (الأنفال ٤١ — التوبة ٩٢)', surahNumbers: [8, 9] },
  { juz: 11, label: 'الجزء الحادي عشر (التوبة ٩٣ — هود ٥)', surahNumbers: [9, 10, 11] },
  { juz: 12, label: 'الجزء الثاني عشر (هود ٦ — يوسف ٥٢)', surahNumbers: [11, 12] },
  { juz: 13, label: 'الجزء الثالث عشر (يوسف ٥٣ — إبراهيم)', surahNumbers: [12, 13, 14] },
  { juz: 14, label: 'الجزء الرابع عشر (الحجر — النحل)', surahNumbers: [15, 16] },
  { juz: 15, label: 'الجزء الخامس عشر (الإسراء — الكهف ٧٤)', surahNumbers: [17, 18] },
  { juz: 16, label: 'الجزء السادس عشر (الكهف ٧٥ — طه)', surahNumbers: [18, 19, 20] },
  { juz: 17, label: 'الجزء السابع عشر (الأنبياء — الحج)', surahNumbers: [21, 22] },
  { juz: 18, label: 'الجزء الثامن عشر (المؤمنون — الفرقان ٢٠)', surahNumbers: [23, 24, 25] },
  { juz: 19, label: 'الجزء التاسع عشر (الفرقان ٢١ — النمل ٥٥)', surahNumbers: [25, 26, 27] },
  { juz: 20, label: 'الجزء العشرون (النمل ٥٦ — العنكبوت ٤٥)', surahNumbers: [27, 28, 29] },
  { juz: 21, label: 'الجزء الحادي والعشرون (العنكبوت ٤٦ — الأحزاب ٣٠)', surahNumbers: [29, 30, 31, 32, 33] },
  { juz: 22, label: 'الجزء الثاني والعشرون (الأحزاب ٣١ — يس ٢٧)', surahNumbers: [33, 34, 35, 36] },
  { juz: 23, label: 'الجزء الثالث والعشرون (يس ٢٨ — الزمر ٣١)', surahNumbers: [36, 37, 38, 39] },
  { juz: 24, label: 'الجزء الرابع والعشرون (الزمر ٣٢ — فصلت ٤٦)', surahNumbers: [39, 40, 41] },
  { juz: 25, label: 'الجزء الخامس والعشرون (فصلت ٤٧ — الجاثية)', surahNumbers: [41, 42, 43, 44, 45] },
  { juz: 26, label: 'الجزء السادس والعشرون (الأحقاف — الذاريات ٣٠)', surahNumbers: [46, 47, 48, 49, 50, 51] },
  { juz: 27, label: 'الجزء السابع والعشرون (الذاريات ٣١ — الحديد)', surahNumbers: [51, 52, 53, 54, 55, 56, 57] },
  { juz: 28, label: 'الجزء الثامن والعشرون (المجادلة — التحريم)', surahNumbers: [58, 59, 60, 61, 62, 63, 64, 65, 66] },
  { juz: 29, label: 'الجزء التاسع والعشرون (تبارك — المرسلات)', surahNumbers: [67, 68, 69, 70, 71, 72, 73, 74, 75, 76, 77] },
  { juz: 30, label: 'الجزء الثلاثون (جزء عمّ — من النبأ إلى الناس)', surahNumbers: [78, 79, 80, 81, 82, 83, 84, 85, 86, 87, 88, 89, 90, 91, 92, 93, 94, 95, 96, 97, 98, 99, 100, 101, 102, 103, 104, 105, 106, 107, 108, 109, 110, 111, 112, 113, 114] },
];

let cachedCatalog: { prophets: DownloadableMediaItem[]; sharawi: DownloadableMediaItem[]; fetchedAt: number } | null = null;

export async function GET() {
  if (cachedCatalog && Date.now() - cachedCatalog.fetchedAt < 1000 * 60 * 60 * 6) {
    return NextResponse.json({
      prophets: cachedCatalog.prophets,
      sharawi: cachedCatalog.sharawi,
    });
  }

  try {
    const [prophetsRes, sharawiRes] = await Promise.all([
      fetch('https://archive.org/metadata/02_20251028/files', { cache: 'no-store' }),
      fetch(
        'https://archive.org/metadata/Khwater.El-Sharawy.Fi.Tafsir.EL-Quran-Karim-Up_ReDa_MoHamMeD/files',
        { cache: 'no-store' }
      ),
    ]);

    const prophetsJson = prophetsRes.ok
      ? ((await prophetsRes.json()) as { result?: ArchiveFileEntry[] })
      : { result: [] };
    const sharawiJson = sharawiRes.ok
      ? ((await sharawiRes.json()) as { result?: ArchiveFileEntry[] })
      : { result: [] };

    const prophetsMp3 = (prophetsJson.result || [])
      .filter((f) => f.name && f.name.toLowerCase().endsWith('.mp3'))
      .sort((a, b) => a.name.localeCompare(b.name));

    const prophets: DownloadableMediaItem[] = prophetsMp3.map((f, idx) => {
      const bytes = Number(f.size || 0);
      const cleanTitle = f.name.replace(/^\d+\s*-\s*/, '').replace(/\.mp3$/i, '');
      return {
        id: `prophet-${idx + 1}`,
        category: 'prophets',
        partNumber: idx + 1,
        title: cleanTitle,
        subtitle: 'الشيخ نبيل العوضي — سلسلة قصص الأنبياء كاملة',
        url: `https://archive.org/download/02_20251028/${encodeURIComponent(f.name)}`,
        sizeBytes: bytes,
        sizeLabel: bytes > 0 ? `${(bytes / 1048576).toFixed(1)} MB` : 'MP3',
      };
    });

    const sharawiMp3 = (sharawiJson.result || []).filter(
      (f) => f.name && f.name.toLowerCase().endsWith('.mp3')
    );

    // Map each of the 30 Juz to the representative Sharawi Khawater MP3 episode(s)
    const sharawi: DownloadableMediaItem[] = JUZ_SURAH_MAP.map((juzMeta) => {
      // Pick the first real matching MP3 episode for that Juz's primary Surah
      const candidates = sharawiMp3.filter((f) => {
        const sMatch = f.name.match(/^(\d{3})_/);
        if (!sMatch) return false;
        const sNum = Number(sMatch[1]);
        return juzMeta.surahNumbers.includes(sNum);
      });

      // Distribute cleanly across Juz 1, 2, 3 when sharing Al-Baqarah
      let chosen = candidates[0];
      if (juzMeta.juz === 2 && candidates.length > 20) {
        chosen = candidates[Math.floor(candidates.length * 0.45)];
      } else if (juzMeta.juz === 3 && candidates.length > 40) {
        chosen = candidates[Math.floor(candidates.length * 0.85)];
      } else if (juzMeta.juz === 5 && candidates.length > 10) {
        chosen = candidates[Math.floor(candidates.length * 0.5)];
      } else if (juzMeta.juz === 6 && candidates.length > 10) {
        chosen = candidates[candidates.length - 1];
      }

      if (!chosen) {
        chosen = sharawiMp3[juzMeta.juz] || sharawiMp3[0];
      }

      const bytes = Number(chosen?.size || 0);
      const fileName = chosen?.name || '001_Al-Fatihah_001.mp3';

      return {
        id: `sharawi-juz-${juzMeta.juz}`,
        category: 'sharawi',
        partNumber: juzMeta.juz,
        title: juzMeta.label,
        subtitle: `خواطر الشيخ محمد متولي الشعراوي — (${fileName.replace(/\.mp3$/i, '')})`,
        url: `https://archive.org/download/Khwater.El-Sharawy.Fi.Tafsir.EL-Quran-Karim-Up_ReDa_MoHamMeD/${encodeURIComponent(
          fileName
        )}`,
        sizeBytes: bytes,
        sizeLabel: bytes > 0 ? `${(bytes / 1048576).toFixed(1)} MB` : 'MP3',
      };
    });

    if (prophets.length > 0 || sharawi.length > 0) {
      cachedCatalog = { prophets, sharawi, fetchedAt: Date.now() };
    }

    return NextResponse.json({ prophets, sharawi });
  } catch {
    return NextResponse.json(
      { error: 'تعذر جلب فهرس الملفات الصوتية.', prophets: [], sharawi: [] },
      { status: 500 }
    );
  }
}
