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

/**
 * Short, crystal-clear human-voiced Dhikr MP3 clips (Zero robotic TTS)
 */
export const EGYPTIAN_DHIKR_CLIPS: DhikrAudioClip[] = [
  {
    id: 'salawat',
    label: 'صلِّ على النبي ﷺ',
    egyptianPrompt: 'صلِّ على الحبيب قلبك يطيب — اللهم صلِّ وسلم على نبينا محمد',
    speaker: 'ذكر مسموع بصوت بشري نقي',
    audioUrl:
      'https://archive.org/download/2_20250602_20250602_1135/adkar_be3d_adan/3.mp3',
  },
  {
    id: 'subhanallah',
    label: 'سبحان الله وبحمده',
    egyptianPrompt: 'سبحان الله وبحمده عدد خلقه ورضا نفسه وزنة عرشه ومداد كلماته',
    speaker: 'ذكر مسموع بصوت بشري نقي',
    audioUrl:
      'https://archive.org/download/20260404_20260404_1649/%D8%B3%D8%A8%D8%AD%D8%A7%D9%86%20%D8%A7%D9%84%D9%84%D9%87%20%D9%88%D8%A8%D8%AD%D9%85%D8%AF%D9%87%20%D8%B9%D8%AF%D8%AF%20%D8%AE%D9%84%D9%82%D9%87%20%D9%88%D8%B1%D8%B6%D8%A7%20%D9%86%D9%81%D8%B3%D9%87%20%D9%88%D8%B2%D9%86%D8%A9%20%D8%B9%D8%B1%D8%B4%D9%87%20%D9%88%D9%85%D8%AF%D8%A7%D8%AF%20%D9%83%D9%84%D9%85%D8%A7%D8%AA%D9%87.mp3',
  },
  {
    id: 'istighfar',
    label: 'استغفر الله العظيم وأتوب إليه',
    egyptianPrompt: 'استغفر ربنا دلوقتي — أستغفر الله العظيم الذي لا إله إلا هو الحي القيوم وأتوب إليه',
    speaker: 'ذكر مسموع بصوت بشري نقي',
    audioUrl:
      'https://archive.org/download/20260404_20260404_1728/%D8%A7%D8%B3%D8%AA%D8%BA%D9%81%D8%B1%20%D8%A7%D9%84%D9%84%D9%87%20%D8%A7%D9%84%D8%B9%D8%B8%D9%8A%D9%85%20%D8%A7%D9%84%D8%B0%D9%8A%20%D9%84%D8%A7%20%D8%A5%D9%84%D9%87%20%D8%A5%D9%84%D8%A7%20%D9%87%D9%88%20%D8%A7%D9%84%D8%AD%D9%8A%20%D8%A7%D9%84%D9%82%D9%8A%D9%88%D9%85%20%D9%88%D8%A3%D8%AA%D9%88%D8%A8%20%D8%A5%D9%84%D9%8A%D9%87%20%20%D8%A7%D8%B3%D8%AA%D8%BA%D9%81%D8%A7%D8%B1.mp3',
  },
  {
    id: 'hawqala',
    label: 'لا حول ولا قوة إلا بالله',
    egyptianPrompt: 'كنز من كنوز الجنة — لا حول ولا قوة إلا بالله العلي العظيم',
    speaker: 'ذكر مسموع بصوت بشري نقي',
    audioUrl:
      'https://archive.org/download/2_20250602_20250602_1135/adkar_be3d_adan/1.mp3',
  },
  {
    id: 'subhanallah_palm',
    label: 'سبحان الله العظيم وبحمده',
    egyptianPrompt: 'اغرس نخلة في الجنة — سبحان الله العظيم وبحمده',
    speaker: 'ذكر مسموع بصوت بشري نقي',
    audioUrl:
      'https://archive.org/download/100_20260403_202604/%D8%A7%D9%84%D8%AD%D8%AF%D9%8A%D8%AB%20%D8%A7%D9%84%D8%B4%D8%B1%D9%8A%D9%81%20_%20%D9%85%D9%86%20%D9%82%D8%A7%D9%84%20%D8%B3%D8%A8%D8%AD%D8%A7%D9%86%20%D8%A7%D9%84%D9%84%D9%87%20%D8%A7%D9%84%D8%B9%D8%B8%D9%8A%D9%85%20%20%D9%88%D8%A8%D8%AD%D9%85%D8%AF%D9%87%20%20%D8%BA%D8%B1%D8%B3%D8%AA%20%D9%84%D9%87%20%D9%86%D8%AE%D9%84%D8%A9%20%D9%81%D9%8A%20%D8%A7%D9%84%D8%AC%D9%86%D8%A9.mp3',
  },
];

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
