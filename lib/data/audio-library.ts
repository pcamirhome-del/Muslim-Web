export interface MuadhinItem {
  id: string;
  name: string;
  title: string;
  audioUrl: string;
}

export interface DhikrAudioClip {
  id: string;
  label: string;
  egyptianPrompt: string;
  speaker: string;
  audioUrl: string;
}

export type DhikrVoiceMode = 'egyptian_dhikr' | 'sheikh';

/**
 * 11 Verified Muadhins with direct Archive.org MP3 URLs (HTTP 200 verified)
 */
export const MUADHINS_LIST: MuadhinItem[] = [
  {
    id: 'tobar',
    name: 'الشيخ نصر الدين طوبار',
    title: 'أذان الفجر — الإذاعة المصرية',
    audioUrl:
      'https://archive.org/download/20210125_20210125_1047/%D8%A7%D8%B0%D8%A7%D9%86%20%D8%A7%D9%84%D9%81%D8%AC%D8%B1%20%D9%84%D9%81%D8%B6%D9%8A%D9%84%D8%A9%20%D8%A7%D9%84%D8%B4%D9%8A%D8%AE%20%D9%86%D8%B5%D8%B1%20%D8%A7%D9%84%D8%AF%D9%8A%D9%86%20%D8%B7%D9%88%D8%A8%D8%A7%D8%B1%20%D8%B1%D8%AD%D9%85%D8%A9%20%D8%A7%D9%84%D9%84%D9%87.mp3',
  },
  {
    id: 'minshawi',
    name: 'الشيخ محمد صديق المنشاوي',
    title: 'الأذان الخاشع',
    audioUrl:
      'https://archive.org/download/90---azan---90---azan--many----sound----mp3---alazan_379/048-.mp3',
  },
  {
    id: 'abdulbasit',
    name: 'الشيخ عبد الباسط عبد الصمد',
    title: 'أذان القاهرة العريق',
    audioUrl:
      'https://archive.org/download/90---azan---90---azan--many----sound----mp3---alazan_379/041--.mp3',
  },
  {
    id: 'husary',
    name: 'الشيخ محمود خليل الحصري',
    title: 'أذان الإذاعة المصرية',
    audioUrl:
      'https://archive.org/download/90---azan---90---azan--many----sound----mp3---alazan_379/044--.mp3',
  },
  {
    id: 'sudais',
    name: 'الشيخ عبد الرحمن السديس',
    title: 'أذان الحرم المكي الشريف',
    audioUrl:
      'https://archive.org/download/90---azan---90---azan--many----sound----mp3---alazan_379/019--1.mp3',
  },
  {
    id: 'rifaat',
    name: 'الشيخ محمد رفعت',
    title: 'أذان القاهرة التراثي النادر',
    audioUrl:
      'https://archive.org/download/90---azan---90---azan--many----sound----mp3---alazan_379/042--.mp3',
  },
  {
    id: 'naqshabandi',
    name: 'الشيخ سيد النقشبندي',
    title: 'أذان الفجر المصري الروحاني',
    audioUrl:
      'https://archive.org/download/90---azan---90---azan--many----sound----mp3---alazan_379/036--.mp3',
  },
  {
    id: 'ali_mulla',
    name: 'الشيخ علي أحمد ملا',
    title: 'شيخ مؤذني المسجد الحرام',
    audioUrl:
      'https://archive.org/download/90---azan---90---azan--many----sound----mp3---alazan_379/047--.mp3',
  },
  {
    id: 'alafasy',
    name: 'الشيخ مشاري راشد العفاسي',
    title: 'الأذان العذب',
    audioUrl:
      'https://archive.org/download/90---azan---90---azan--many----sound----mp3---alazan_379/074-1_-.mp3',
  },
  {
    id: 'mustafa_ismail',
    name: 'الشيخ مصطفى إسماعيل',
    title: 'أذان مصري أصيل',
    audioUrl:
      'https://archive.org/download/90---azan---90---azan--many----sound----mp3---alazan_379/068-.mp3',
  },
  {
    id: 'banna',
    name: 'الشيخ محمود علي البنا',
    title: 'أذان القاهرة الكلاسيكي',
    audioUrl:
      'https://archive.org/download/90---azan---90---azan--many----sound----mp3---alazan_379/043--.mp3',
  },
];

export type DhikrScheduleTiming = 'periodic' | 'before_prayer' | 'after_prayer' | 'custom_time' | 'off';

export interface DhikrClipSchedule {
  timing: DhikrScheduleTiming;
  customTime: string; // HH:MM (24-hour)
}

export type DhikrScheduleMap = Record<string, DhikrClipSchedule>;

/**
 * Human-voiced Dhikr & Dua MP3 clips (Zero robotic TTS)
 */
export const EGYPTIAN_DHIKR_CLIPS: DhikrAudioClip[] = [
  {
    id: 'sabah_adhkar',
    label: 'أذكار الصباح',
    egyptianPrompt: 'أذكار الصباح كاملة — ٢١ دقيقة',
    speaker: 'أذكار الصباح الصوتية',
    audioUrl: '/assets/aistudio/_____________9b75ee32.mp3',
  },
  {
    id: 'masaa_adhkar',
    label: 'أذكار المساء',
    egyptianPrompt: 'أذكار المساء كاملة — ٢٧ دقيقة',
    speaker: 'أذكار المساء الصوتية',
    audioUrl: '/assets/aistudio/______________32e900e0.mp3',
  },
  {
    id: 'sleep_adhkar',
    label: 'أذكار النوم',
    egyptianPrompt: 'أذكار النوم المباركة — ٣:٣٠ دقيقة',
    speaker: 'أذكار النوم الصوتية',
    audioUrl: '/assets/aistudio/_____________16154d41.mp3',
  },
  {
    id: 'wakeup_adhkar',
    label: 'أذكار الاستيقاظ من النوم',
    egyptianPrompt: 'أذكار الاستيقاظ من النوم — ١:٣٤ دقيقة',
    speaker: 'أذكار الاستيقاظ الصوتية',
    audioUrl: '/assets/aistudio/__________________________e48962d0.mp3',
  },
  {
    id: 'go_to_mosque',
    label: 'دعاء الذهاب إلى المسجد',
    egyptianPrompt: 'دعاء الذهاب إلى المسجد — ١:٣٠ دقيقة',
    speaker: 'أدعية الصلاة والمسجد',
    audioUrl: '/assets/aistudio/_______________________bcce5037.mp3',
  },
];

export const DEFAULT_SELECTED_DHIKR_IDS: string[] = EGYPTIAN_DHIKR_CLIPS.map((c) => c.id);

export function parseSelectedDhikrIds(raw: string | null): string[] {
  if (!raw) return DEFAULT_SELECTED_DHIKR_IDS;
  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      const validIds = parsed.filter(
        (id): id is string =>
          typeof id === 'string' && EGYPTIAN_DHIKR_CLIPS.some((c) => c.id === id)
      );
      if (validIds.length > 0) return validIds;
    }
  } catch {
    // ignore malformed storage value
  }
  return DEFAULT_SELECTED_DHIKR_IDS;
}

export function formatTime24To12Ar(time24: string): string {
  if (!/^\d{2}:\d{2}$/.test(time24)) return time24;
  const [hStr, mStr] = time24.split(':');
  const h = Number(hStr);
  const period = h >= 12 ? 'م' : 'ص';
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}:${mStr} ${period}`;
}

/**
 * Generates a 2-second 8kHz 16-bit mono PCM WAV base64 data URI with an imperceptible
 * 1-LSB alternating signal so iOS/Android keep the background audio session & MediaSession alive.
 */
let cachedSilentWavUri: string | null = null;
export function getSilentKeepAliveWavDataUri(): string {
  if (cachedSilentWavUri) return cachedSilentWavUri;
  const sampleRate = 8000;
  const durationSeconds = 2;
  const numSamples = sampleRate * durationSeconds;
  const dataSize = numSamples * 2;
  const buffer = new ArrayBuffer(44 + dataSize);
  const view = new DataView(buffer);

  const writeStr = (offset: number, str: string) => {
    for (let i = 0; i < str.length; i++) {
      view.setUint8(offset + i, str.charCodeAt(i));
    }
  };

  writeStr(0, 'RIFF');
  view.setUint32(4, 36 + dataSize, true);
  writeStr(8, 'WAVE');
  writeStr(12, 'fmt ');
  view.setUint32(16, 16, true); // PCM chunk size
  view.setUint16(20, 1, true); // PCM format
  view.setUint16(22, 1, true); // Mono
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true); // Byte rate
  view.setUint16(32, 2, true); // Block align
  view.setUint16(34, 16, true); // Bits per sample
  writeStr(36, 'data');
  view.setUint32(40, dataSize, true);

  for (let i = 0; i < numSamples; i++) {
    // 1-LSB sub-audible dither prevents OS digital-zero auto-suspend
    view.setInt16(44 + i * 2, i % 2 === 0 ? 1 : -1, true);
  }

  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  const base64 = typeof btoa === 'function' ? btoa(binary) : '';
  cachedSilentWavUri = `data:audio/wav;base64,${base64}`;
  return cachedSilentWavUri;
}

/**
 * Authentic Egyptian Scholars' Supplications & Spiritual Clips
 */
export const SHEIKH_DHIKR_CLIPS: DhikrAudioClip[] = [
  {
    id: 'shaarawy_1',
    label: 'دعاء: أحمدك ربي وأستعينك',
    egyptianPrompt: 'مقطع دعاء مؤثر بصوت فضيلة الشيخ محمد متولي الشعراوي رحمه الله',
    speaker: 'الشيخ محمد متولي الشعراوي',
    audioUrl: 'https://archive.org/download/sharawy_doaa_02/sharawy_doaa_02.mp3',
  },
  {
    id: 'shaarawy_2',
    label: 'دعاء: اللهم إنك الشفيع',
    egyptianPrompt: 'دعاء خاشع ومؤثر بصوت فضيلة الشيخ محمد متولي الشعراوي رحمه الله',
    speaker: 'الشيخ محمد متولي الشعراوي',
    audioUrl: 'https://archive.org/download/sharawy_doaa_09/sharawy_doaa_09.mp3',
  },
  {
    id: 'naqshabandi_clip',
    label: 'تلاوة وابتهال: إذا جاء نصر الله',
    egyptianPrompt: 'مقطع روحاني نادر بصوت الشيخ سيد النقشبندي رحمه الله',
    speaker: 'الشيخ سيد النقشبندي',
    audioUrl:
      'https://archive.org/download/Naqshabandee/%D8%A5%D8%B0%D8%A7%20%D8%AC%D8%A7%D8%A1%20%D9%86%D8%B5%D8%B1%20%D8%A7%D9%84%D9%84%D9%87.mp3',
  },
  {
    id: 'tobar_clip',
    label: 'مناجاة وابتهال خاشع',
    egyptianPrompt: 'مقطع ابتهال ومناجاة بصوت الشيخ نصر الدين طوبار رحمه الله',
    speaker: 'الشيخ نصر الدين طوبار',
    audioUrl: 'https://archive.org/download/nasruddin-tubar/1056128.mp3',
  },
];

export const DEFAULT_DHIKR_SCHEDULES: DhikrScheduleMap = {
  sabah_adhkar: { timing: 'custom_time', customTime: '06:30' },
  masaa_adhkar: { timing: 'custom_time', customTime: '17:00' },
  sleep_adhkar: { timing: 'custom_time', customTime: '22:00' },
  wakeup_adhkar: { timing: 'custom_time', customTime: '05:30' },
  go_to_mosque: { timing: 'before_prayer', customTime: '12:00' },
  shaarawy_1: { timing: 'periodic', customTime: '08:00' },
  shaarawy_2: { timing: 'periodic', customTime: '08:00' },
  naqshabandi_clip: { timing: 'periodic', customTime: '08:00' },
  tobar_clip: { timing: 'periodic', customTime: '08:00' },
};

export function parseDhikrSchedules(raw: string | null): DhikrScheduleMap {
  const result: DhikrScheduleMap = { ...DEFAULT_DHIKR_SCHEDULES };
  if (!raw) return result;
  const allClips = [...EGYPTIAN_DHIKR_CLIPS, ...SHEIKH_DHIKR_CLIPS];
  try {
    const parsed = JSON.parse(raw) as Record<string, Partial<DhikrClipSchedule>>;
    if (parsed && typeof parsed === 'object') {
      for (const clip of allClips) {
        const entry = parsed[clip.id];
        if (entry && typeof entry === 'object') {
          const validTiming: DhikrScheduleTiming =
            entry.timing === 'periodic' ||
            entry.timing === 'before_prayer' ||
            entry.timing === 'after_prayer' ||
            entry.timing === 'custom_time' ||
            entry.timing === 'off'
              ? entry.timing
              : result[clip.id]?.timing || 'periodic';
          const validTime =
            typeof entry.customTime === 'string' && /^\d{2}:\d{2}$/.test(entry.customTime)
              ? entry.customTime
              : result[clip.id]?.customTime || '08:00';
          result[clip.id] = { timing: validTiming, customTime: validTime };
        }
      }
    }
  } catch {
    // ignore malformed storage value
  }
  return result;
}
