export type RadioCategory = 'all' | 'official' | 'senior_egypt' | 'haramain' | 'general';

export interface RadioStation {
  id: number;
  name: string;
  subtitle?: string;
  url: string;
  backupUrls?: string[];
  category: Exclude<RadioCategory, 'all'>;
  featured?: boolean;
}

export const PRIORITY_RADIO_STATIONS: RadioStation[] = [
  {
    id: 9000,
    name: 'إذاعة القرآن الكريم من القاهرة',
    subtitle: 'البث الرسمي المباشر 24/7 (مع خوادم بديلة تلقائية)',
    url: 'https://stream.radiojar.com/8s5u5tpdtwzuv',
    backupUrls: [
      'https://n0a.radiojar.com/8s5u5tpdtwzuv',
      'https://n0e.radiojar.com/8s5u5tpdtwzuv',
      'https://backup.qurango.net/radio/mix',
    ],
    category: 'official',
    featured: true,
  },
  {
    id: 70,
    name: 'الشيخ محمد صديق المنشاوي',
    subtitle: 'تلاوات خاشعة ومجودة على مدار الساعة',
    url: 'https://backup.qurango.net/radio/mohammed_siddiq_alminshawi_mojawwad',
    backupUrls: ['https://backup.qurango.net/radio/mohammed_siddiq_alminshawi'],
    category: 'senior_egypt',
    featured: true,
  },
  {
    id: 75,
    name: 'الشيخ محمود خليل الحصري',
    subtitle: 'المصحف المجود والمرتل 24/7',
    url: 'https://backup.qurango.net/radio/mahmoud_khalil_alhussary_mojawwad',
    backupUrls: [
      'https://backup.qurango.net/radio/mahmoud_khalil_alhussary',
      'https://backup.qurango.net/radio/mahmoud_khalil_alhussary_warsh',
    ],
    category: 'senior_egypt',
    featured: true,
  },
  {
    id: 30,
    name: 'الشيخ عبد الباسط عبد الصمد',
    subtitle: 'المصحف المجود والمرتل 24/7',
    url: 'https://backup.qurango.net/radio/abdulbasit_abdulsamad_mojawwad',
    backupUrls: [
      'https://backup.qurango.net/radio/abdulbasit_abdulsamad',
      'https://backup.qurango.net/radio/abdulbasit_abdulsamad_warsh',
    ],
    category: 'senior_egypt',
    featured: true,
  },
  {
    id: 64,
    name: 'الشيخ محمد محمود الطبلاوي',
    subtitle: 'تلاوات إذاعية نادرة 24/7',
    url: 'https://backup.qurango.net/radio/mohammad_altablaway',
    backupUrls: ['https://backup.qurango.net/radio/tarateel'],
    category: 'senior_egypt',
    featured: true,
  },
  {
    id: 33,
    name: 'الشيخ عبد الرحمن السديس',
    subtitle: 'تلاوات المسجد الحرام 24/7',
    url: 'https://backup.qurango.net/radio/abdulrahman_alsudaes',
    backupUrls: ['https://backup.qurango.net/radio/mix'],
    category: 'haramain',
    featured: true,
  },
  {
    id: 9001,
    name: 'إذاعة التلاوات الخاشعة - عامة',
    subtitle: 'بث متواصل لأجمل التلاوات المختارة',
    url: 'https://backup.qurango.net/radio/tarateel',
    backupUrls: ['https://backup.qurango.net/radio/salma', 'https://backup.qurango.net/radio/mix'],
    category: 'official',
    featured: false,
  },
];

const SENIOR_EGYPT_KEYWORDS = [
  'المنشاوي',
  'الحصري',
  'عبدالباسط',
  'عبد الباسط',
  'الطبلاوي',
  'رفعت',
  'مصطفى إسماعيل',
  'البنا',
  'شعيشع',
  'نعينع',
  'البهتيمي',
  'الليثي',
  'الشحات',
  'غلوش',
  'سليمان',
  'جبريل',
];

const HARAMAIN_KEYWORDS = [
  'السديس',
  'الشريم',
  'المعيقلي',
  'الحذيفي',
  'الجهني',
  'بندر',
  'الدوسري',
  'القطامي',
  'العفاسي',
  'المغامسي',
  'أيوب',
  'بصفر',
  'اللحيدان',
  'الأخضر',
];

const OFFICIAL_KEYWORDS = [
  'القاهرة',
  'العامة',
  'تلاوات خاشعة',
  'تفسير',
  'الفتاوى',
  'أذكار',
  'الرقية',
  'سيرة',
];

export function classifyRadioStation(name: string): Exclude<RadioCategory, 'all'> {
  if (OFFICIAL_KEYWORDS.some((k) => name.includes(k))) return 'official';
  if (SENIOR_EGYPT_KEYWORDS.some((k) => name.includes(k))) return 'senior_egypt';
  if (HARAMAIN_KEYWORDS.some((k) => name.includes(k))) return 'haramain';
  return 'general';
}
