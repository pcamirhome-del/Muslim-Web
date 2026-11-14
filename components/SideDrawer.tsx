'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import {
  X,
  Sun,
  Moon,
  Download,
  Compass,
  Radio,
  BookOpen,
  Clock,
  Sparkles,
  Volume2,
  Share2,
  BookText,
  ShieldCheck,
  ScrollText,
  Settings,
  ChevronDown,
  ChevronRight,
  ChevronUp,
} from 'lucide-react';
import { usePWAInstall } from '@/hooks/usePWAInstall';

export type AppSection =
  | 'home'
  | 'radio'
  | 'qibla'
  | 'quran'
  | 'tafsir'
  | 'hisn'
  | 'hadith'
  | 'settings';

interface SideDrawerProps {
  open: boolean;
  onClose: () => void;
  activeTab: AppSection;
  onSelectTab: (tab: AppSection) => void;
  isDark: boolean;
  onToggleTheme: () => void;
  onOpenGuide?: (mode: 'wudu' | 'prayer') => void;
  ramadanPreview: boolean;
  onToggleRamadanPreview: () => void;
}

export function SideDrawer({
  open,
  onClose,
  activeTab,
  onSelectTab,
  isDark,
  onToggleTheme,
  ramadanPreview,
  onToggleRamadanPreview,
}: SideDrawerProps) {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showIOSGuide, setShowIOSGuide] = useState(false);
  const [showSettingsSubMenu, setShowSettingsSubMenu] = useState(false);
  const [expandedSettingOption, setExpandedSettingOption] = useState<
    'theme' | 'ramadan' | 'adhan' | 'advanced' | null
  >(null);

  if (!open) return null;

  const navigate = (tab: AppSection) => {
    onSelectTab(tab);
    setShowSettingsSubMenu(false);
    setExpandedSettingOption(null);
    onClose();
  };

  const handleClose = () => {
    setShowSettingsSubMenu(false);
    setExpandedSettingOption(null);
    onClose();
  };

  const toggleSettingOption = (opt: 'theme' | 'ramadan' | 'adhan' | 'advanced') => {
    setExpandedSettingOption((prev) => (prev === opt ? null : opt));
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-start bg-black/65 backdrop-blur-sm">
      {/* Drawer Panel (RTL: starts from right) */}
      <aside className="flex h-full w-80 max-w-[85vw] flex-col border-l border-amber-500/20 bg-white dark:bg-slate-950 text-slate-900 dark:text-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 px-4 py-4">
          <div className="flex items-center gap-2.5">
            <Image
              src="/pwa-192x192.png"
              alt="نور الإسلام"
              width={40}
              height={40}
              referrerPolicy="no-referrer"
              className="h-10 w-10 rounded-xl object-cover border border-amber-500/30"
            />
            <div>
              <h2 className="text-base font-extrabold">نور الإسلام</h2>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                تطبيق إسلامي شامل (PWA)
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleClose}
            aria-label="إغلاق القائمة"
            className="flex h-11 w-11 items-center justify-center rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-3 py-4 space-y-5">
          {showSettingsSubMenu ? (
            <div className="space-y-2.5">
              {/* Top Back Header inside Settings Side Menu */}
              <div className="flex items-center justify-between gap-2 border-b border-slate-200 dark:border-slate-800 pb-2.5">
                <button
                  type="button"
                  onClick={() => {
                    setShowSettingsSubMenu(false);
                    setExpandedSettingOption(null);
                  }}
                  className="flex min-h-[40px] items-center gap-1.5 rounded-xl bg-slate-100 dark:bg-slate-900 px-3 py-1.5 text-xs font-bold hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors"
                >
                  <ChevronRight className="h-4 w-4 shrink-0" />
                  <span>رجوع للقائمة</span>
                </button>
                <span className="text-sm font-extrabold text-amber-600 dark:text-amber-400">
                  الإعدادات
                </span>
              </div>

              {/* Option 1: Theme Switcher */}
              <div className="rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden">
                <button
                  type="button"
                  onClick={() => toggleSettingOption('theme')}
                  className="flex w-full min-h-[44px] items-center justify-between gap-2 px-3 py-2.5 text-sm font-bold hover:bg-slate-100 dark:hover:bg-slate-900 transition-colors"
                >
                  <span className="flex items-center gap-2.5">
                    {isDark ? (
                      <Sun className="h-5 w-5 text-amber-400 shrink-0" />
                    ) : (
                      <Moon className="h-5 w-5 text-indigo-600 shrink-0" />
                    )}
                    <span>المظهر النهاري والليلي</span>
                  </span>
                  {expandedSettingOption === 'theme' ? (
                    <ChevronUp className="h-4 w-4 shrink-0" />
                  ) : (
                    <ChevronDown className="h-4 w-4 shrink-0" />
                  )}
                </button>

                {expandedSettingOption === 'theme' && (
                  <div className="border-t border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-900/70 p-3 space-y-2">
                    <p className="text-xs text-slate-600 dark:text-slate-300">
                      الوضع النشط حالياً:{' '}
                      <strong className="text-amber-600 dark:text-amber-400">
                        {isDark ? 'المظهر الليلي (Dark)' : 'المظهر النهاري (Light)'}
                      </strong>
                    </p>
                    <button
                      type="button"
                      onClick={onToggleTheme}
                      className="w-full min-h-[40px] flex items-center justify-center gap-2 rounded-xl bg-emerald-700 hover:bg-emerald-600 text-white text-xs font-bold transition-colors"
                    >
                      {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
                      <span>
                        {isDark ? 'التبديل إلى الوضع النهاري' : 'التبديل إلى الوضع الليلي'}
                      </span>
                    </button>
                  </div>
                )}
              </div>

              {/* Option 2: Ramadan Preview */}
              <div className="rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden">
                <button
                  type="button"
                  onClick={() => toggleSettingOption('ramadan')}
                  className="flex w-full min-h-[44px] items-center justify-between gap-2 px-3 py-2.5 text-sm font-bold hover:bg-slate-100 dark:hover:bg-slate-900 transition-colors"
                >
                  <span className="flex items-center gap-2.5">
                    <Sparkles className="h-5 w-5 text-amber-500 shrink-0" />
                    <span>معاينة قسم شهر رمضان المبارك</span>
                  </span>
                  {expandedSettingOption === 'ramadan' ? (
                    <ChevronUp className="h-4 w-4 shrink-0" />
                  ) : (
                    <ChevronDown className="h-4 w-4 shrink-0" />
                  )}
                </button>

                {expandedSettingOption === 'ramadan' && (
                  <div className="border-t border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-900/70 p-3 space-y-2">
                    <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                      حالة المعاينة:{' '}
                      <strong className="text-amber-600 dark:text-amber-400">
                        {ramadanPreview ? 'مُفعّلة وتظهر في مواقيت الصلاة' : 'متوقفة حالياً'}
                      </strong>
                      . تعرض مواعيد الإمساك والإفطار والتهجد.
                    </p>
                    <button
                      type="button"
                      onClick={() => {
                        onToggleRamadanPreview();
                        navigate('home');
                      }}
                      className="w-full min-h-[40px] rounded-xl bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold transition-colors"
                    >
                      {ramadanPreview ? 'إخفاء معاينة رمضان' : 'تفعيل وعرض قسم رمضان'}
                    </button>
                  </div>
                )}
              </div>

              {/* Option 3: Adhan & Audio Dhikr */}
              <div className="rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden">
                <button
                  type="button"
                  onClick={() => toggleSettingOption('adhan')}
                  className="flex w-full min-h-[44px] items-center justify-between gap-2 px-3 py-2.5 text-sm font-bold hover:bg-slate-100 dark:hover:bg-slate-900 transition-colors"
                >
                  <span className="flex items-center gap-2.5">
                    <Volume2 className="h-5 w-5 text-emerald-500 shrink-0" />
                    <span>الأذان والأذكار الصوتية</span>
                  </span>
                  {expandedSettingOption === 'adhan' ? (
                    <ChevronUp className="h-4 w-4 shrink-0" />
                  ) : (
                    <ChevronDown className="h-4 w-4 shrink-0" />
                  )}
                </button>

                {expandedSettingOption === 'adhan' && (
                  <div className="border-t border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-900/70 p-3 space-y-2">
                    <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                      تحكم بصوت الـ ١١ مؤذناً، التنبيه المسبق قبل الأذان بـ ١٠ دقائق، ومنبه الأذكار الصوتية الدورية (١ إلى ٥ دقائق).
                    </p>
                    <button
                      type="button"
                      onClick={() => navigate('home')}
                      className="w-full min-h-[40px] rounded-xl bg-emerald-700 hover:bg-emerald-600 text-white text-xs font-bold transition-colors"
                    >
                      فتح لوحة الأذان والأذكار
                    </button>
                  </div>
                )}
              </div>

              {/* Option 4: Advanced Settings & Full Quran Offline Downloader */}
              <div className="rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden">
                <button
                  type="button"
                  onClick={() => toggleSettingOption('advanced')}
                  className="flex w-full min-h-[44px] items-center justify-between gap-2 px-3 py-2.5 text-sm font-bold hover:bg-slate-100 dark:hover:bg-slate-900 transition-colors"
                >
                  <span className="flex items-center gap-2.5">
                    <Settings className="h-5 w-5 text-amber-500 shrink-0" />
                    <span>الإعدادات المتقدمة والتحميل الكامل</span>
                  </span>
                  {expandedSettingOption === 'advanced' ? (
                    <ChevronUp className="h-4 w-4 shrink-0" />
                  ) : (
                    <ChevronDown className="h-4 w-4 shrink-0" />
                  )}
                </button>

                {expandedSettingOption === 'advanced' && (
                  <div className="border-t border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-900/70 p-3 space-y-2">
                    <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                      مدير تحميل القرآن الكريم بالكامل (١١٤ سورة بدون إنترنت)، إدارة المساحة، وإدارة أذونات الإشعارات.
                    </p>
                    <button
                      type="button"
                      onClick={() => navigate('settings')}
                      className="w-full min-h-[40px] rounded-xl bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold transition-colors"
                    >
                      فتح شاشة التحميل الكامل والإعدادات
                    </button>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <>
          {/* Ordered Main Menu 1 to 8 */}
          <div className="space-y-1.5">
            {[
              { id: 'home' as AppSection, label: 'مواقيت الصلاة', icon: Clock },
              { id: 'radio' as AppSection, label: 'إذاعة القرآن مباشر', icon: Radio },
              { id: 'quran' as AppSection, label: 'المصحف الشريف', icon: BookOpen },
              { id: 'tafsir' as AppSection, label: 'تفسير القرآن الكريم', icon: BookText },
              { id: 'hadith' as AppSection, label: 'الأحاديث النبوية', icon: ScrollText },
              { id: 'hisn' as AppSection, label: 'حصن المسلم وفقه الصلوات', icon: ShieldCheck },
              { id: 'qibla' as AppSection, label: 'القبلة', icon: Compass },
            ].map((item) => {
              const Icon = item.icon;
              const active = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => navigate(item.id)}
                  className={`flex w-full min-h-[44px] items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-bold transition-colors ${
                    active
                      ? 'bg-emerald-700 text-white'
                      : 'hover:bg-slate-100 dark:hover:bg-slate-900 text-slate-800 dark:text-slate-200'
                  }`}
                >
                  <Icon className="h-5 w-5 shrink-0" />
                  <span>{item.label}</span>
                </button>
              );
            })}

            {/* 8th Entry: Settings */}
            <button
              type="button"
              onClick={() => setShowSettingsSubMenu(true)}
              className={`flex w-full min-h-[44px] items-center justify-between gap-2.5 rounded-xl border px-3 py-2.5 text-sm font-bold transition-colors ${
                activeTab === 'settings'
                  ? 'border-amber-500 bg-amber-600 text-white'
                  : 'border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-900 text-slate-800 dark:text-slate-200'
              }`}
            >
              <span className="flex items-center gap-3">
                <Settings className="h-5 w-5 shrink-0" />
                <span>الإعدادات</span>
              </span>
              <ChevronDown className="h-4 w-4 shrink-0 rotate-90" />
            </button>
          </div>

          {/* PWA Install Button */}
          {!isInstalled && (isInstallable || isIOS) && (
            <div className="border-t border-slate-200 dark:border-slate-800 pt-4">
              {isInstallable ? (
                <button
                  type="button"
                  onClick={install}
                  className="flex w-full min-h-[48px] items-center justify-center gap-2 rounded-xl bg-amber-600 hover:bg-amber-500 px-4 py-3 text-sm font-extrabold text-white shadow-md transition-colors"
                >
                  <Download className="h-5 w-5" />
                  <span>تثبيت التطبيق على الهاتف (PWA)</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => setShowIOSGuide(true)}
                  className="flex w-full min-h-[48px] items-center justify-center gap-2 rounded-xl border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-sm font-bold text-amber-700 dark:text-amber-300 transition-colors"
                >
                  <Share2 className="h-5 w-5" />
                  <span>إضافة للشاشة الرئيسية (iPhone)</span>
                </button>
              )}
            </div>
          )}
            </>
          )}
        </div>

        <div className="border-t border-slate-200 dark:border-slate-800 p-3 text-center text-xs text-slate-600 dark:text-slate-400">
          لوجه الله تعالى - مع تحيات المطور Amir Lamay
        </div>
      </aside>

      {/* Backdrop click closes */}
      <button
        type="button"
        aria-label="إغلاق القائمة الجانبية"
        onClick={handleClose}
        className="flex-1 cursor-default"
      />

      {showIOSGuide && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-sm rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-5 space-y-3 text-slate-900 dark:text-white shadow-2xl">
            <h3 className="text-base font-extrabold">التثبيت على iPhone و iPad</h3>
            <p className="text-sm leading-relaxed text-slate-600 dark:text-slate-300">
              1. اضغط على زر <strong>المشاركة (Share)</strong> في شريط Safari بالأسفل.
              <br />
              2. مرر للأسفل واختر <strong>إضافة إلى الشاشة الرئيسية (Add to Home Screen)</strong>.
            </p>
            <button
              type="button"
              onClick={() => setShowIOSGuide(false)}
              className="w-full min-h-[44px] rounded-xl bg-emerald-700 text-white text-sm font-bold"
            >
              فهمت
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
