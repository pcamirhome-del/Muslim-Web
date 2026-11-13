export type RiwayahId = 'hafs' | 'warsh' | 'soosi' | 'qaloon_dori';

export interface RiwayahOption {
  id: RiwayahId;
  label: string;
}

export const RIWAYAH_OPTIONS: RiwayahOption[] = [
  { id: 'hafs', label: 'رواية حفص عن عاصم' },
  { id: 'warsh', label: 'رواية ورش عن نافع' },
  { id: 'soosi', label: 'رواية السوسي عن أبي عمرو' },
  { id: 'qaloon_dori', label: 'رواية قالون عن نافع / الدوري عن أبي عمرو' },
];

export interface ReciterRiwayahStream {
  riwayah: RiwayahId;
  editionLabel: string;
  everyayahFolder?: string; // Enables ayah-by-ayah dual-buffer gapless playback
  mp3quranServer: string; // Full-surah server (100% verified mp3quran CDN)
}

export interface QuranReciterConfig {
  id: string;
  name: string;
  title: string;
  streams: ReciterRiwayahStream[];
}

export const QURAN_RECITERS: QuranReciterConfig[] = [
  {
    id: 'abdulbasit',
    name: 'الشيخ عبد الباسط عبد الصمد',
    title: 'المرتل والمجود — مصر',
    streams: [
      {
        riwayah: 'hafs',
        editionLabel: 'حفص عن عاصم (مرتل)',
        everyayahFolder: 'Abdul_Basit_Murattal_192kbps',
        mp3quranServer: 'https://cdn.mp3quran.net/audio/abdulbasit-abdulsamad/r3/',
      },
      {
        riwayah: 'warsh',
        editionLabel: 'ورش عن نافع',
        everyayahFolder: 'warsh/warsh_Abdul_Basit_128kbps',
        mp3quranServer: 'https://cdn.mp3quran.net/audio/abdulbasit-abdulsamad/r2/',
      },
    ],
  },
  {
    id: 'sudais',
    name: 'الشيخ عبد الرحمن السديس',
    title: 'إمام المسجد الحرام',
    streams: [
      {
        riwayah: 'hafs',
        editionLabel: 'حفص عن عاصم (مرتل)',
        everyayahFolder: 'Abdurrahmaan_As-Sudais_192kbps',
        mp3quranServer: 'https://cdn.mp3quran.net/audio/abdulrahman-sudais/r1/',
      },
    ],
  },
  {
    id: 'minshawi',
    name: 'الشيخ محمد صديق المنشاوي',
    title: 'المصحف المرتل — مصر',
    streams: [
      {
        riwayah: 'hafs',
        editionLabel: 'حفص عن عاصم (مرتل)',
        everyayahFolder: 'Minshawy_Murattal_128kbps',
        mp3quranServer: 'https://cdn.mp3quran.net/audio/muhammad-minshawi/r1/',
      },
    ],
  },
  {
    id: 'tablawi',
    name: 'الشيخ محمد محمود الطبلاوي',
    title: 'شيخ عموم المقارئ المصرية سابقاً',
    streams: [
      {
        riwayah: 'hafs',
        editionLabel: 'حفص عن عاصم (مرتل)',
        everyayahFolder: 'Mohammad_al_Tablaway_128kbps',
        mp3quranServer: 'https://cdn.mp3quran.net/audio/muhammad-tablawi/r1/',
      },
    ],
  },
  {
    id: 'husary',
    name: 'الشيخ محمود خليل الحصري',
    title: 'جامع الروايات المتعددة — مصر',
    streams: [
      {
        riwayah: 'hafs',
        editionLabel: 'حفص عن عاصم (مرتل)',
        everyayahFolder: 'Husary_128kbps',
        mp3quranServer: 'https://cdn.mp3quran.net/audio/mahmoud-husary/r1/',
      },
      {
        riwayah: 'warsh',
        editionLabel: 'ورش عن نافع',
        mp3quranServer: 'https://cdn.mp3quran.net/audio/mahmoud-husary/r3/',
      },
      {
        riwayah: 'qaloon_dori',
        editionLabel: 'قالون عن نافع / الدوري عن أبي عمرو',
        mp3quranServer: 'https://cdn.mp3quran.net/audio/mahmoud-husary/r5/',
      },
    ],
  },
  {
    id: 'mustafa_ismail',
    name: 'الشيخ مصطفى إسماعيل',
    title: 'قارئ القصر والجامع الأزهر — مصر',
    streams: [
      {
        riwayah: 'hafs',
        editionLabel: 'حفص عن عاصم (مرتل)',
        everyayahFolder: 'Mustafa_Ismail_48kbps',
        mp3quranServer: 'https://cdn.mp3quran.net/audio/mustafa-ismail/r1/',
      },
    ],
  },
  {
    id: 'alafasy',
    name: 'الشيخ مشاري راشد العفاسي',
    title: 'تلاوة نقية عالية الجودة',
    streams: [
      {
        riwayah: 'hafs',
        editionLabel: 'حفص عن عاصم (مرتل)',
        everyayahFolder: 'Alafasy_128kbps',
        mp3quranServer: 'https://cdn.mp3quran.net/audio/mishary-alafasy/r1/',
      },
    ],
  },
  {
    id: 'hudhaifi',
    name: 'الشيخ علي بن عبد الرحمن الحذيفي',
    title: 'إمام المسجد النبوي (حفص وقالون)',
    streams: [
      {
        riwayah: 'hafs',
        editionLabel: 'حفص عن عاصم (مرتل)',
        everyayahFolder: 'Hudhaify_128kbps',
        mp3quranServer: 'https://cdn.mp3quran.net/audio/ali-hudhaifi/r1/',
      },
      {
        riwayah: 'qaloon_dori',
        editionLabel: 'قالون عن نافع',
        mp3quranServer: 'https://cdn.mp3quran.net/audio/ali-hudhaifi/r2/',
      },
    ],
  },
  {
    id: 'sufi',
    name: 'الشيخ عبد الرشيد صوفي',
    title: 'متقن القراءات (السوسي وحفص)',
    streams: [
      {
        riwayah: 'soosi',
        editionLabel: 'السوسي عن أبي عمرو',
        mp3quranServer: 'https://cdn.mp3quran.net/audio/abdulrasheed-sufi/r2/',
      },
      {
        riwayah: 'hafs',
        editionLabel: 'حفص عن عاصم',
        mp3quranServer: 'https://cdn.mp3quran.net/audio/abdulrasheed-sufi/r3/',
      },
    ],
  },
];

export function pad3(num: number): string {
  return String(num).padStart(3, '0');
}

export function getEveryAyahUrl(folder: string, surahNumber: number, ayahInSurah: number): string {
  return `https://everyayah.com/data/${folder}/${pad3(surahNumber)}${pad3(ayahInSurah)}.mp3`;
}

export function getFullSurahMp3Url(server: string, surahNumber: number): string {
  const base = server.endsWith('/') ? server : `${server}/`;
  return `${base}${pad3(surahNumber)}.mp3`;
}

export function resolveReciterAndStream(
  reciterId: string,
  riwayah: RiwayahId
): { reciter: QuranReciterConfig; stream: ReciterRiwayahStream } {
  const reciter = QURAN_RECITERS.find((r) => r.id === reciterId) || QURAN_RECITERS[0];
  const exact = reciter.streams.find((s) => s.riwayah === riwayah);
  if (exact) {
    return { reciter, stream: exact };
  }
  // If user chose a Riwayah not recorded by current reciter, auto-pick a verified reciter for that Riwayah
  const matchingReciter = QURAN_RECITERS.find((r) =>
    r.streams.some((s) => s.riwayah === riwayah)
  );
  if (matchingReciter) {
    const stream = matchingReciter.streams.find((s) => s.riwayah === riwayah)!;
    return { reciter: matchingReciter, stream };
  }
  return { reciter, stream: reciter.streams[0] };
}
