export interface PrayerTimings {
  Fajr: string;
  Sunrise: string;
  Dhuhr: string;
  Asr: string;
  Maghrib: string;
  Isha: string;
  Imsak: string;
  Midnight: string;
  Lastthird: string;
}

export interface HijriDateInfo {
  date: string;
  day: string;
  monthNumber: number;
  monthAr: string;
  year: string;
  weekdayAr: string;
}

export interface GregorianDateInfo {
  date: string;
  day: string;
  month: string;
  year: string;
}

export interface PrayerScheduleData {
  timings: PrayerTimings;
  hijri: HijriDateInfo;
  gregorian: GregorianDateInfo;
  timezone: string;
  methodName: string;
  isRamadan: boolean;
}

export interface UserLocation {
  city: string;
  country: string;
  latitude: number;
  longitude: number;
  method: number;
  timezone: string;
  isEgyptDefault?: boolean;
}

export const DEFAULT_EGYPT_LOCATION: UserLocation = {
  city: 'القاهرة',
  country: 'مصر',
  latitude: 30.0444,
  longitude: 31.2357,
  method: 5, // الهيئة المصرية العامة للمساحة
  timezone: 'Africa/Cairo',
  isEgyptDefault: true,
};

export const CALCULATION_METHODS = [
  { id: 5, name: 'الهيئة المصرية العامة للمساحة' },
  { id: 4, name: 'أم القرى - مكة المكرمة' },
  { id: 3, name: 'رابطة العالم الإسلامي' },
  { id: 2, name: 'الجمعية الإسلامية لأمريكا الشمالية (ISNA)' },
  { id: 1, name: 'جامعة العلوم الإسلامية بكراتشي' },
  { id: 8, name: 'دول الخليج والكويت' },
  { id: 11, name: 'سنغافورة وماليزيا' },
  { id: 12, name: 'اتحاد المنظمات الإسلامية بفرنسا' },
  { id: 13, name: 'رئاسة الشؤون الدينية التركية' },
];

export const KAABA_COORDS = {
  lat: 21.422487,
  lng: 39.826206,
};

/**
 * Clean time string returned by Aladhan API (strips "(EET)" or "(+03)" suffixes)
 */
export function cleanTimeString(raw: string): string {
  if (!raw) return '00:00';
  return raw.split(' ')[0].trim();
}

/**
 * Convert "HH:MM" (24h) to 12-hour Arabic format with صباحاً / مساءً
 */
export function formatTo12HourArabic(time24: string): string {
  const clean = cleanTimeString(time24);
  const [hStr, mStr] = clean.split(':');
  const h = Number.parseInt(hStr, 10);
  const m = Number.parseInt(mStr, 10);
  if (Number.isNaN(h) || Number.isNaN(m)) return clean;
  const period = h >= 12 ? 'م' : 'ص';
  const hour12 = h % 12 === 0 ? 12 : h % 12;
  return `${String(hour12).padStart(2, '0')}:${String(m).padStart(2, '0')} ${period}`;
}

/**
 * Add minutes to a 24-hour "HH:MM" time string
 */
export function addMinutesToTime24(time24: string, offsetMinutes: number): string {
  const clean = cleanTimeString(time24);
  const [hStr, mStr] = clean.split(':');
  const h = Number.parseInt(hStr, 10);
  const m = Number.parseInt(mStr, 10);
  if (Number.isNaN(h) || Number.isNaN(m)) return clean;
  const total = (h * 60 + m + offsetMinutes + 1440) % 1440;
  const newH = Math.floor(total / 60);
  const newM = total % 60;
  return `${String(newH).padStart(2, '0')}:${String(newM).padStart(2, '0')}`;
}

/**
 * Detect Egypt DST or general timezone label using Intl.DateTimeFormat
 */
export function getTimezoneSeasonInfo(timeZone: string): {
  offsetLabel: string;
  isDST: boolean;
  seasonLabel: string;
} {
  try {
    const now = new Date();
    const parts = new Intl.DateTimeFormat('en-US', {
      timeZone,
      timeZoneName: 'shortOffset',
    }).formatToParts(now);
    const tzPart = parts.find((p) => p.type === 'timeZoneName')?.value || 'GMT+2';

    // Standard winter offset in Egypt is GMT+2; summer DST is GMT+3
    const jan = new Date(now.getFullYear(), 0, 1);
    const jul = new Date(now.getFullYear(), 6, 1);
    const getOffsetMinutes = (d: Date) => {
      const str = d.toLocaleString('en-US', { timeZone });
      const local = new Date(str);
      const utc = new Date(d.toLocaleString('en-US', { timeZone: 'UTC' }));
      return Math.round((local.getTime() - utc.getTime()) / 60000);
    };
    const janOffset = getOffsetMinutes(jan);
    const julOffset = getOffsetMinutes(jul);
    const curOffset = getOffsetMinutes(now);
    const stdOffset = Math.min(janOffset, julOffset);
    const isDST = curOffset > stdOffset;

    if (timeZone === 'Africa/Cairo') {
      return {
        offsetLabel: tzPart,
        isDST,
        seasonLabel: isDST ? 'التوقيت الصيفي المصري' : 'التوقيت الشتوي المصري',
      };
    }

    return {
      offsetLabel: tzPart,
      isDST,
      seasonLabel: isDST ? 'التوقيت الصيفي المفعّل' : 'التوقيت القياسي',
    };
  } catch {
    return {
      offsetLabel: 'GMT+2',
      isDST: false,
      seasonLabel: 'التوقيت المحلي',
    };
  }
}

/**
 * Get current wall-clock hours, minutes, seconds in target IANA timezone
 */
export function getZonedClockParts(date: Date, timeZone: string): {
  hours24: number;
  minutes: number;
  seconds: number;
  hours12: number;
  periodFull: string;
  weekdayAr: string;
  gregorianAr: string;
} {
  try {
    const numFmt = new Intl.DateTimeFormat('en-GB', {
      timeZone,
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    });
    const parts = numFmt.formatToParts(date);
    const hRaw = Number.parseInt(parts.find((p) => p.type === 'hour')?.value || '0', 10);
    const hours24 = hRaw === 24 ? 0 : hRaw;
    const minutes = Number.parseInt(parts.find((p) => p.type === 'minute')?.value || '0', 10);
    const seconds = Number.parseInt(parts.find((p) => p.type === 'second')?.value || '0', 10);

    const periodFull = hours24 >= 12 ? 'مساءً' : 'صباحاً';
    const hours12 = hours24 % 12 === 0 ? 12 : hours24 % 12;

    const weekdayAr = new Intl.DateTimeFormat('ar-EG', {
      timeZone,
      weekday: 'long',
    }).format(date);

    const gregorianAr = new Intl.DateTimeFormat('ar-EG', {
      timeZone,
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    }).format(date);

    return { hours24, minutes, seconds, hours12, periodFull, weekdayAr, gregorianAr };
  } catch {
    const hours24 = date.getHours();
    const minutes = date.getMinutes();
    const seconds = date.getSeconds();
    return {
      hours24,
      minutes,
      seconds,
      hours12: hours24 % 12 === 0 ? 12 : hours24 % 12,
      periodFull: hours24 >= 12 ? 'مساءً' : 'صباحاً',
      weekdayAr: 'اليوم',
      gregorianAr: date.toLocaleDateString('ar-EG'),
    };
  }
}

export type PrayerKey = 'Fajr' | 'Sunrise' | 'Dhuhr' | 'Asr' | 'Maghrib' | 'Isha';

export const PRAYER_LABELS_AR: Record<PrayerKey, string> = {
  Fajr: 'الفجر',
  Sunrise: 'الشروق',
  Dhuhr: 'الظهر',
  Asr: 'العصر',
  Maghrib: 'المغرب',
  Isha: 'العشاء',
};

export const ADHAN_PRAYER_KEYS: PrayerKey[] = ['Fajr', 'Dhuhr', 'Asr', 'Maghrib', 'Isha'];

export interface NextPrayerInfo {
  key: PrayerKey;
  nameAr: string;
  time24: string;
  time12Ar: string;
  remainingSeconds: number;
  formattedCountdown: string;
}

export function computeNextPrayer(
  timings: PrayerTimings,
  nowDate: Date,
  timeZone: string
): NextPrayerInfo {
  const clock = getZonedClockParts(nowDate, timeZone);
  const nowTotalSec = clock.hours24 * 3600 + clock.minutes * 60 + clock.seconds;

  const ordered: PrayerKey[] = ['Fajr', 'Sunrise', 'Dhuhr', 'Asr', 'Maghrib', 'Isha'];
  for (const key of ordered) {
    const clean = cleanTimeString(timings[key]);
    const [hStr, mStr] = clean.split(':');
    const pSec = Number.parseInt(hStr, 10) * 3600 + Number.parseInt(mStr, 10) * 60;
    if (pSec > nowTotalSec) {
      const diff = pSec - nowTotalSec;
      return {
        key,
        nameAr: PRAYER_LABELS_AR[key],
        time24: clean,
        time12Ar: formatTo12HourArabic(clean),
        remainingSeconds: diff,
        formattedCountdown: formatDurationHMS(diff),
      };
    }
  }

  // After Isha -> next is Fajr tomorrow
  const fajrClean = cleanTimeString(timings.Fajr);
  const [fh, fm] = fajrClean.split(':');
  const fajrSec = Number.parseInt(fh, 10) * 3600 + Number.parseInt(fm, 10) * 60;
  const diff = 86400 - nowTotalSec + fajrSec;

  return {
    key: 'Fajr',
    nameAr: PRAYER_LABELS_AR.Fajr,
    time24: fajrClean,
    time12Ar: formatTo12HourArabic(fajrClean),
    remainingSeconds: diff,
    formattedCountdown: formatDurationHMS(diff),
  };
}

export function formatDurationHMS(totalSeconds: number): string {
  const safe = Math.max(0, Math.floor(totalSeconds));
  const hrs = Math.floor(safe / 3600);
  const mins = Math.floor((safe % 3600) / 60);
  const secs = safe % 60;
  return `${String(hrs).padStart(2, '0')}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

/**
 * Fetch real prayer times from Aladhan API
 */
export async function fetchPrayerSchedule(location: UserLocation): Promise<PrayerScheduleData> {
  const now = new Date();
  const dd = String(now.getDate()).padStart(2, '0');
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const yyyy = now.getFullYear();
  const dateStr = `${dd}-${mm}-${yyyy}`;

  let url = '';
  if (location.isEgyptDefault) {
    url = `https://api.aladhan.com/v1/timingsByCity/${dateStr}?city=Cairo&country=Egypt&method=${location.method}`;
  } else {
    url = `https://api.aladhan.com/v1/timings/${dateStr}?latitude=${location.latitude}&longitude=${location.longitude}&method=${location.method}`;
  }

  const res = await fetch(url);
  if (!res.ok) {
    throw new Error('تعذر جلب مواقيت الصلاة من الخادم');
  }
  const json = await res.json();
  if (json.code !== 200 || !json.data) {
    throw new Error('بيانات مواقيت الصلاة غير صالحة');
  }

  const { timings, date, meta } = json.data;
  const hijriMonthNum = Number(date?.hijri?.month?.number || 1);

  return {
    timings: {
      Fajr: cleanTimeString(timings.Fajr),
      Sunrise: cleanTimeString(timings.Sunrise),
      Dhuhr: cleanTimeString(timings.Dhuhr),
      Asr: cleanTimeString(timings.Asr),
      Maghrib: cleanTimeString(timings.Maghrib),
      Isha: cleanTimeString(timings.Isha),
      Imsak: cleanTimeString(timings.Imsak || addMinutesToTime24(timings.Fajr, -10)),
      Midnight: cleanTimeString(timings.Midnight),
      Lastthird: cleanTimeString(timings.Lastthird),
    },
    hijri: {
      date: date?.hijri?.date || '',
      day: date?.hijri?.day || '',
      monthNumber: hijriMonthNum,
      monthAr: date?.hijri?.month?.ar || '',
      year: date?.hijri?.year || '',
      weekdayAr: date?.hijri?.weekday?.ar || '',
    },
    gregorian: {
      date: date?.gregorian?.date || '',
      day: date?.gregorian?.day || '',
      month: date?.gregorian?.month?.en || '',
      year: date?.gregorian?.year || '',
    },
    timezone: meta?.timezone || location.timezone,
    methodName: meta?.method?.name || 'الهيئة المصرية العامة للمساحة',
    isRamadan: hijriMonthNum === 9,
  };
}

/**
 * Reverse geocode coordinates into Arabic city & country name using BigDataCloud free client API
 */
export async function reverseGeocodeArabic(
  lat: number,
  lng: number
): Promise<{ city: string; country: string }> {
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}&accept-language=ar`
    );
    if (!res.ok) throw new Error('Nominatim geocode failed');
    const data = await res.json();
    const addr = data.address || {};
    const city =
      addr.city ||
      addr.town ||
      addr.village ||
      addr.state ||
      addr.county ||
      'موقعك الحالي';
    const country = addr.country || '';
    return { city, country };
  } catch {
    try {
      const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || '';
      const tzCity = tz.split('/').pop()?.replace(/_/g, ' ') || 'موقعك الحالي';
      return { city: tzCity, country: 'GPS' };
    } catch {
      return {
        city: `${lat.toFixed(2)}°, ${lng.toFixed(2)}°`,
        country: 'GPS',
      };
    }
  }
}

/**
 * Calculate Great Circle Bearing (0..360 degrees clockwise from True North) toward the Kaaba
 */
export function calculateQiblaBearing(lat: number, lng: number): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const toDeg = (rad: number) => (rad * 180) / Math.PI;

  const phi1 = toRad(lat);
  const phi2 = toRad(KAABA_COORDS.lat);
  const deltaLambda = toRad(KAABA_COORDS.lng - lng);

  const y = Math.sin(deltaLambda) * Math.cos(phi2);
  const x =
    Math.cos(phi1) * Math.sin(phi2) -
    Math.sin(phi1) * Math.cos(phi2) * Math.cos(deltaLambda);

  const bearing = (toDeg(Math.atan2(y, x)) + 360) % 360;
  return bearing;
}

/**
 * Calculate Haversine distance in kilometers to Makkah
 */
export function calculateDistanceToKaabaKm(lat: number, lng: number): number {
  const R = 6371;
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(KAABA_COORDS.lat - lat);
  const dLon = toRad(KAABA_COORDS.lng - lng);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat)) *
      Math.cos(toRad(KAABA_COORDS.lat)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c);
}
