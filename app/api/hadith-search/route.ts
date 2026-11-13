import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';

interface FawazHadithItem {
  hadithnumber: number;
  arabicnumber: number;
  text: string;
  grades?: Array<{ name?: string; grade?: string }>;
  reference?: { book?: number; hadith?: number };
}

interface FawazEditionResponse {
  metadata?: {
    name?: string;
    sections?: Record<string, string>;
  };
  hadiths?: FawazHadithItem[];
}

interface HadeethEncListItem {
  id: string;
  title: string;
}

interface HadeethEncDetail {
  id: string;
  title: string;
  hadeeth: string;
  attribution: string;
  grade: string;
  explanation: string;
  hints?: string[];
}

export interface HadithSearchResult {
  id: string;
  source: string;
  hadithNumber?: number;
  text: string;
  grade: string;
  attribution: string;
  explanation?: string;
  hints?: string[];
}

function stripArabicDiacritics(input: string): string {
  return input
    .replace(/[\u064B-\u065F\u0670\u06D6-\u06ED]/g, '')
    .replace(/[أإآ]/g, 'ا')
    .replace(/ى/g, 'ي')
    .replace(/ة/g, 'ه')
    .trim();
}

const cachedEditions: Record<string, { data: FawazHadithItem[]; fetchedAt: number }> = {};

async function loadEdition(slug: string): Promise<FawazHadithItem[]> {
  const cached = cachedEditions[slug];
  if (cached && Date.now() - cached.fetchedAt < 1000 * 60 * 60 * 6) {
    return cached.data;
  }
  const url = `https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions/${slug}.min.json`;
  const res = await fetch(url, { cache: 'no-store' });
  if (!res.ok) return cached?.data || [];
  const json = (await res.json()) as FawazEditionResponse;
  const list = (json.hadiths || []).filter((h) => h.text && h.text.trim().length > 10);
  cachedEditions[slug] = { data: list, fetchedAt: Date.now() };
  return list;
}

const TOPIC_TO_HADEETHENC_CATEGORIES: Array<{ keywords: string[]; categoryId: string }> = [
  { keywords: ['الصدق', 'الامانه', 'الاخلاق', 'الصبر', 'الرفق', 'الرحمه', 'الحياء'], categoryId: '5' },
  { keywords: ['بر الوالدين', 'الوالدين', 'صله الرحم', 'الجار'], categoryId: '5' },
  { keywords: ['الصلاه', 'الوضوء', 'الاذان', 'الجمعه', 'الوتر', 'الصيام', 'الزكاه', 'الحج'], categoryId: '4' },
  { keywords: ['الايمان', 'التوحيد', 'الجنه', 'النار', 'القدر', 'الرزق', 'التوكل'], categoryId: '3' },
  { keywords: ['القران', 'التلاوه', 'الفاتحه'], categoryId: '1' },
  { keywords: ['الدعوه', 'الامر بالمعروف'], categoryId: '6' },
];

async function searchHadeethEnc(queryNorm: string): Promise<HadithSearchResult[]> {
  try {
    let catId = '5';
    for (const entry of TOPIC_TO_HADEETHENC_CATEGORIES) {
      if (entry.keywords.some((kw) => queryNorm.includes(kw) || kw.includes(queryNorm))) {
        catId = entry.categoryId;
        break;
      }
    }

    const listRes = await fetch(
      `https://hadeethenc.com/api/v1/hadeeths/list/?language=ar&category_id=${catId}&page=1&per_page=35`,
      { next: { revalidate: 3600 } }
    );
    if (!listRes.ok) return [];
    const listJson = (await listRes.json()) as { data?: HadeethEncListItem[] };
    const candidates = (listJson.data || []).filter((item) =>
      stripArabicDiacritics(item.title).includes(queryNorm)
    );
    const selected = (candidates.length > 0 ? candidates : (listJson.data || []).slice(0, 3)).slice(
      0,
      4
    );

    const details: Array<HadithSearchResult | null> = await Promise.all(
      selected.map(async (item): Promise<HadithSearchResult | null> => {
        try {
          const dRes = await fetch(
            `https://hadeethenc.com/api/v1/hadeeths/one/?language=ar&id=${item.id}`,
            { next: { revalidate: 86400 } }
          );
          if (!dRes.ok) return null;
          const d = (await dRes.json()) as HadeethEncDetail;
          return {
            id: `enc-${d.id}`,
            source: 'موسوعة الأحاديث النبوية (HadeethEnc)',
            text: d.hadeeth,
            grade: d.grade || 'صحيح',
            attribution: d.attribution || 'متفق عليه / صحيح',
            explanation: d.explanation,
            hints: d.hints,
          };
        } catch {
          return null;
        }
      })
    );

    return details.filter((d): d is HadithSearchResult => d !== null);
  } catch {
    return [];
  }
}

export async function GET(req: NextRequest) {
  const q = (req.nextUrl.searchParams.get('q') || '').trim();
  if (!q) {
    return NextResponse.json({ results: [], query: '' });
  }

  const queryNorm = stripArabicDiacritics(q);
  const queryTokens = queryNorm.split(/\s+/).filter((t) => t.length >= 2);

  try {
    const [nawawi, bukhari, muslim, encResults] = await Promise.all([
      loadEdition('ara-nawawi'),
      loadEdition('ara-bukhari'),
      loadEdition('ara-muslim'),
      searchHadeethEnc(queryNorm),
    ]);

    const matchList = (
      items: FawazHadithItem[],
      sourceLabel: string,
      prefix: string,
      maxCount: number
    ): HadithSearchResult[] => {
      const out: HadithSearchResult[] = [];
      for (const h of items) {
        const norm = stripArabicDiacritics(h.text);
        const matchesAll =
          norm.includes(queryNorm) ||
          (queryTokens.length > 1 && queryTokens.every((tok) => norm.includes(tok)));
        if (matchesAll) {
          out.push({
            id: `${prefix}-${h.hadithnumber}`,
            source: sourceLabel,
            hadithNumber: h.hadithnumber,
            text: h.text,
            grade: 'صحيح معتمد',
            attribution: `${sourceLabel} — حديث رقم ${h.hadithnumber}`,
          });
          if (out.length >= maxCount) break;
        }
      }
      return out;
    };

    const combined: HadithSearchResult[] = [
      ...encResults,
      ...matchList(nawawi, 'الأربعون النووية', 'nawawi', 5),
      ...matchList(bukhari, 'صحيح البخاري', 'bukhari', 10),
      ...matchList(muslim, 'صحيح مسلم', 'muslim', 10),
    ];

    return NextResponse.json({
      query: q,
      total: combined.length,
      results: combined.slice(0, 25),
    });
  } catch {
    return NextResponse.json(
      { error: 'تعذر البحث في قاعدة بيانات الأحاديث.', results: [] },
      { status: 500 }
    );
  }
}
