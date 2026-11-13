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
  Droplets,
  Volume2,
  Share2,
  BookText,
  ShieldCheck,
  ScrollText,
  Settings,
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
  onOpenGuide: (mode: 'wudu' | 'prayer') => void;
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
  onOpenGuide,
  ramadanPreview,
  onToggleRamadanPreview,
}: SideDrawerProps) {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showIOSGuide, setShowIOSGuide] = useState(false);

  if (!open) return null;

  const navigate = (tab: AppSection) => {
    onSelectTab(tab);
    onClose();
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
            onClick={onClose}
            aria-label="إغلاق القائمة"
            className="flex h-11 w-11 items-center justify-center rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-3 py-4 space-y-5">
          {/* Phase 4 Top Islamic Encyclopedia Sections (Tafsir first at very top) */}
          <div className="space-y-1.5">
            <p className="px-2 text-xs font-bold text-amber-600 dark:text-amber-400">
              الموسوعة الإسلامية
            </p>
            {[
              { id: 'tafsir' as AppSection, label: 'تفسير القرآن الكريم', icon: BookText },
              { id: 'hisn' as AppSection, label: 'حصن المسلم وفقه الصلوات', icon: ShieldCheck },
              {
                id: 'hadith' as AppSection,
                label: 'الأحاديث النبوية والتحميل المباشر',
                icon: ScrollText,
              },
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
                      ? 'bg-amber-600 text-white'
                      : 'hover:bg-slate-100 dark:hover:bg-slate-900 text-slate-800 dark:text-slate-200'
                  }`}
                >
                  <Icon className="h-5 w-5 shrink-0" />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </div>

          {/* Primary Navigation */}
          <div className="space-y-1.5 border-t border-slate-200 dark:border-slate-800 pt-4">
            <p className="px-2 text-xs font-bold text-slate-500 dark:text-slate-400">
              الأقسام الرئيسية
            </p>
            {[
              { id: 'home' as AppSection, label: 'الرئيسية ومواقيت الصلاة', icon: Clock },
              { id: 'radio' as AppSection, label: 'البث المباشر وإذاعة القرآن', icon: Radio },
              { id: 'qibla' as AppSection, label: 'بوصلة القبلة الحقيقية', icon: Compass },
              { id: 'quran' as AppSection, label: 'المصحف الشريف التفاعلي', icon: BookOpen },
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
          </div>

          {/* Education Shortcuts */}
          <div className="space-y-1.5 border-t border-slate-200 dark:border-slate-800 pt-4">
            <p className="px-2 text-xs font-bold text-slate-500 dark:text-slate-400">
              التعليم والعبادات
            </p>
            <button
              type="button"
              onClick={() => {
                onClose();
                onOpenGuide('wudu');
              }}
              className="flex w-full min-h-[44px] items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-bold hover:bg-slate-100 dark:hover:bg-slate-900 transition-colors"
            >
              <Droplets className="h-5 w-5 text-sky-500 shrink-0" />
              <span>تعليم الوضوء الصحيح</span>
            </button>
            <button
              type="button"
              onClick={() => {
                onClose();
                onOpenGuide('prayer');
              }}
              className="flex w-full min-h-[44px] items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-bold hover:bg-slate-100 dark:hover:bg-slate-900 transition-colors"
            >
              <BookOpen className="h-5 w-5 text-emerald-500 shrink-0" />
              <span>تعليم صفة الصلاة بالتشكيل</span>
            </button>
          </div>

          {/* Appearance & Preferences */}
          <div className="space-y-2 border-t border-slate-200 dark:border-slate-800 pt-4">
            <p className="px-2 text-xs font-bold text-slate-500 dark:text-slate-400">
              التخصيص والمعاينة
            </p>
            <button
              type="button"
              onClick={onToggleTheme}
              className="flex w-full min-h-[44px] items-center justify-between rounded-xl border border-slate-200 dark:border-slate-800 px-3 py-2.5 text-sm font-bold hover:bg-slate-100 dark:hover:bg-slate-900 transition-colors"
            >
              <span className="flex items-center gap-2.5">
                {isDark ? (
                  <Sun className="h-5 w-5 text-amber-400" />
                ) : (
                  <Moon className="h-5 w-5 text-indigo-600" />
                )}
                <span>{isDark ? 'التبديل إلى الوضع النهاري' : 'التبديل إلى الوضع الليلي'}</span>
              </span>
            </button>

            <button
              type="button"
              onClick={() => {
                onToggleRamadanPreview();
                navigate('home');
              }}
              className={`flex w-full min-h-[44px] items-center justify-between rounded-xl border px-3 py-2.5 text-sm font-bold transition-colors ${
                ramadanPreview
                  ? 'border-amber-500 bg-amber-500/15 text-amber-700 dark:text-amber-300'
                  : 'border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-900'
              }`}
            >
              <span className="flex items-center gap-2.5">
                <Sparkles className="h-5 w-5 text-amber-500" />
                <span>معاينة قسم شهر رمضان المبارك</span>
              </span>
              <span className="text-xs">{ramadanPreview ? 'مُفعّل' : 'إظهار'}</span>
            </button>

            <button
              type="button"
              onClick={() => {
                navigate('settings');
              }}
              className={`flex w-full min-h-[44px] items-center gap-2.5 rounded-xl border px-3 py-2.5 text-sm font-bold transition-colors ${
                activeTab === 'settings'
                  ? 'border-amber-500 bg-amber-600 text-white'
                  : 'border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-900'
              }`}
            >
              <Settings className="h-5 w-5 shrink-0" />
              <span>الإعدادات المتقدمة والتحميل الكامل</span>
            </button>

            <button
              type="button"
              onClick={() => {
                navigate('home');
              }}
              className="flex w-full min-h-[44px] items-center gap-2.5 rounded-xl border border-slate-200 dark:border-slate-800 px-3 py-2.5 text-sm font-bold hover:bg-slate-100 dark:hover:bg-slate-900 transition-colors"
            >
              <Volume2 className="h-5 w-5 text-emerald-500" />
              <span>الأذان والأذكار الصوتية (الرئيسية)</span>
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
        </div>

        <div className="border-t border-slate-200 dark:border-slate-800 p-3 text-center text-xs text-slate-600 dark:text-slate-400">
          لوجه الله تعالى - مع تحيات المطور Amir Lamay
        </div>
      </aside>

      {/* Backdrop click closes */}
      <button
        type="button"
        aria-label="إغلاق القائمة الجانبية"
        onClick={onClose}
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
