'use client';

import React, { useState } from 'react';
import {
  ShieldCheck,
  BookOpenCheck,
  Sparkles,
  Scale,
  Award,
  AlertTriangle,
  RotateCcw,
  Plus,
} from 'lucide-react';
import {
  HISN_ADHKAR_CATEGORIES,
  HISN_PRAYERS_LIST,
} from '@/lib/data/hisn-prayers-data';

type HisnSubTab = 'prayers' | 'adhkar';

export function HisnAlMuslimSection() {
  const [subTab, setSubTab] = useState<HisnSubTab>('prayers');
  const [selectedPrayerId, setSelectedPrayerId] = useState<string>(HISN_PRAYERS_LIST[0].id);

  // Adhkar & Tasbeeh state
  const [selectedDhikrCat, setSelectedDhikrCat] = useState<
    'morning' | 'evening' | 'sleep' | 'after-prayer'
  >('morning');
  const [dhikrCounts, setDhikrCounts] = useState<Record<string, number>>({});
  const [tasbeehCount, setTasbeehCount] = useState<number>(0);
  const [tasbeehPhrase, setTasbeehPhrase] = useState<string>('سبحان الله وبحمده');

  const prayer =
    HISN_PRAYERS_LIST.find((p) => p.id === selectedPrayerId) || HISN_PRAYERS_LIST[0];
  const adhkarCat =
    HISN_ADHKAR_CATEGORIES.find((c) => c.id === selectedDhikrCat) ||
    HISN_ADHKAR_CATEGORIES[0];

  const incrementDhikr = (id: string, target: number) => {
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      navigator.vibrate(20);
    }
    setDhikrCounts((prev) => {
      const cur = prev[id] || 0;
      return { ...prev, [id]: cur >= target ? target : cur + 1 };
    });
  };

  const incrementTasbeeh = () => {
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      navigator.vibrate(25);
    }
    setTasbeehCount((c) => c + 1);
  };

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg sm:text-xl font-bold flex items-center gap-2">
          <ShieldCheck className="h-5 w-5 text-emerald-500 shrink-0" />
          <span>حصن المسلم وفقه الصلوات ومذاهب الأئمة الأربعة</span>
        </h2>
        <p className="text-xs text-slate-600 dark:text-slate-300 mt-0.5">
          دليل موسوعي شامل لجميع الصلوات وآراء المذاهب الأربعة، مع أذكار المسلم والمسبحة
          الإلكترونية.
        </p>
      </div>

      {/* Sub-Tabs (2 buttons <= 4 limit) */}
      <div className="grid grid-cols-2 gap-1.5">
        <button
          type="button"
          onClick={() => setSubTab('prayers')}
          className={`min-h-[44px] rounded-xl px-1 py-2 text-[10px] sm:text-xs font-bold leading-tight text-center break-words transition-colors ${
            subTab === 'prayers'
              ? 'bg-emerald-700 text-white'
              : 'border border-slate-200 dark:border-slate-700 bg-white/80 dark:bg-slate-900/80'
          }`}
        >
          فقه الصلوات والمذاهب الأربعة
        </button>
        <button
          type="button"
          onClick={() => setSubTab('adhkar')}
          className={`min-h-[44px] rounded-xl px-1 py-2 text-[10px] sm:text-xs font-bold leading-tight text-center break-words transition-colors ${
            subTab === 'adhkar'
              ? 'bg-amber-600 text-white'
              : 'border border-slate-200 dark:border-slate-700 bg-white/80 dark:bg-slate-900/80'
          }`}
        >
          أذكار حصن المسلم والمسبحة
        </button>
      </div>

      {subTab === 'prayers' ? (
        <div className="space-y-4">
          {/* Prayer Types Dropdown */}
          <div className="space-y-1.5">
            <label
              htmlFor="prayer-type-select"
              className="block text-xs font-extrabold text-amber-700 dark:text-amber-300"
            >
              أنواع الصلوات:
            </label>
            <select
              id="prayer-type-select"
              value={selectedPrayerId}
              onChange={(e) => setSelectedPrayerId(e.target.value)}
              className="w-full min-h-[46px] rounded-xl border border-amber-500/40 bg-white dark:bg-slate-900 px-3 py-2 text-xs sm:text-sm font-bold focus:outline-none focus:ring-2 focus:ring-amber-500"
            >
              {HISN_PRAYERS_LIST.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>

          {/* Encyclopedic Breakdown */}
          <div className="space-y-3">
            {/* Header & Classification */}
            <div className="rounded-2xl border border-emerald-500/35 bg-emerald-500/10 p-4 space-y-2">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h3 className="text-base sm:text-lg font-extrabold text-emerald-900 dark:text-emerald-200">
                  {prayer.name}
                </h3>
                <span className="rounded-lg bg-emerald-700 px-2.5 py-1 text-[11px] font-bold text-white">
                  {prayer.classification}
                </span>
              </div>
              <p className="text-xs sm:text-sm leading-relaxed">
                <strong>الحكم الشرعي:</strong> {prayer.ruling}
              </p>
            </div>

            {/* How-to, Rakaat, Recitation, Surahs, Special Duas */}
            <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-900/80 p-4 space-y-3">
              <h4 className="text-sm font-extrabold flex items-center gap-1.5 text-amber-700 dark:text-amber-300">
                <BookOpenCheck className="h-4 w-4 shrink-0" />
                <span>كيفية صلاتها بالتفصيل</span>
              </h4>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs leading-relaxed">
                <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white/75 dark:bg-slate-950/60 p-3">
                  <strong className="block text-emerald-700 dark:text-emerald-300 mb-1">
                    عدد الركعات:
                  </strong>
                  <span>{prayer.rakaat}</span>
                </div>
                <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white/75 dark:bg-slate-950/60 p-3">
                  <strong className="block text-emerald-700 dark:text-emerald-300 mb-1">
                    الجهر أو السر:
                  </strong>
                  <span>{prayer.recitationMode}</span>
                </div>
              </div>

              <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white/75 dark:bg-slate-950/60 p-3 text-xs leading-relaxed">
                <strong className="block text-amber-700 dark:text-amber-300 mb-1">
                  السور المستحب قراءتها:
                </strong>
                <span>{prayer.recommendedSurahs}</span>
              </div>

              <ol className="space-y-1.5 text-xs sm:text-sm leading-relaxed list-decimal list-inside">
                {prayer.howToSteps.map((step, i) => (
                  <li key={i} className="text-slate-800 dark:text-slate-200">
                    {step}
                  </li>
                ))}
              </ol>

              <div className="rounded-xl border border-amber-500/35 bg-amber-500/10 p-3 text-xs sm:text-sm leading-relaxed">
                <strong className="block text-amber-800 dark:text-amber-300 mb-1">
                  الأدعية والأذكار الخاصة بهذه الصلاة:
                </strong>
                <span>{prayer.specialDuas}</span>
              </div>
            </div>

            {/* Reward & Leaving Consequence */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-3.5 space-y-1.5">
                <h4 className="text-xs sm:text-sm font-extrabold flex items-center gap-1.5 text-emerald-800 dark:text-emerald-300">
                  <Award className="h-4 w-4 shrink-0" />
                  <span>الثواب والأجر المترتب عليها</span>
                </h4>
                <p className="text-xs leading-relaxed">{prayer.rewardAndPunishment.reward}</p>
              </div>

              <div className="rounded-2xl border border-rose-500/30 bg-rose-500/10 p-3.5 space-y-1.5">
                <h4 className="text-xs sm:text-sm font-extrabold flex items-center gap-1.5 text-rose-800 dark:text-rose-300">
                  <AlertTriangle className="h-4 w-4 shrink-0" />
                  <span>حكم تركها وهل يُعاقب تاركها؟</span>
                </h4>
                <p className="text-xs leading-relaxed">
                  {prayer.rewardAndPunishment.leavingConsequence}
                </p>
              </div>
            </div>

            {/* Four Madhhabs Opinion */}
            <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-900/80 p-4 space-y-3">
              <h4 className="text-sm font-extrabold flex items-center gap-1.5 text-amber-700 dark:text-amber-300">
                <Scale className="h-4 w-4 shrink-0" />
                <span>رأي الأئمة الأربعة في هذه الصلاة</span>
              </h4>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs leading-relaxed">
                <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white/80 dark:bg-slate-950/70 p-3 space-y-1">
                  <strong className="block text-emerald-700 dark:text-emerald-300">
                    ١. مذهب الإمام أبي حنيفة النعمان (الحنفي)
                  </strong>
                  <p>{prayer.madhhabs.hanafi}</p>
                </div>

                <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white/80 dark:bg-slate-950/70 p-3 space-y-1">
                  <strong className="block text-emerald-700 dark:text-emerald-300">
                    ٢. مذهب الإمام مالك بن أنس (المالكي)
                  </strong>
                  <p>{prayer.madhhabs.maliki}</p>
                </div>

                <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white/80 dark:bg-slate-950/70 p-3 space-y-1">
                  <strong className="block text-emerald-700 dark:text-emerald-300">
                    ٣. مذهب الإمام محمد بن إدريس الشافعي (الشافعي)
                  </strong>
                  <p>{prayer.madhhabs.shafii}</p>
                </div>

                <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white/80 dark:bg-slate-950/70 p-3 space-y-1">
                  <strong className="block text-emerald-700 dark:text-emerald-300">
                    ٤. مذهب الإمام أحمد بن حنبل (الحنبلي)
                  </strong>
                  <p>{prayer.madhhabs.hanbali}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Strict 4-Button Adhkar Category Row */}
          <div className="grid grid-cols-4 gap-1.5">
            {HISN_ADHKAR_CATEGORIES.map((cat) => (
              <button
                key={cat.id}
                type="button"
                onClick={() => setSelectedDhikrCat(cat.id)}
                className={`min-h-[44px] rounded-xl px-1 py-2 text-[10px] sm:text-xs font-bold leading-tight text-center break-words transition-colors ${
                  selectedDhikrCat === cat.id
                    ? 'bg-emerald-700 text-white'
                    : 'border border-slate-200 dark:border-slate-700 bg-white/80 dark:bg-slate-900/80'
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>

          {/* Adhkar Cards with Tap Counter */}
          <div className="space-y-2.5">
            {adhkarCat.items.map((item) => {
              const cur = dhikrCounts[item.id] || 0;
              const done = cur >= item.targetCount;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => incrementDhikr(item.id, item.targetCount)}
                  className={`w-full text-right rounded-2xl border p-3.5 space-y-2 transition-colors ${
                    done
                      ? 'border-emerald-500 bg-emerald-500/15'
                      : 'border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-900/80 hover:border-amber-500/50'
                  }`}
                >
                  <p className="text-sm sm:text-base font-semibold leading-relaxed">
                    {item.text}
                  </p>
                  <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                    <span className="text-slate-600 dark:text-slate-300">{item.virtue}</span>
                    <span
                      className={`font-mono-num rounded-lg px-2.5 py-1 font-extrabold text-white ${
                        done ? 'bg-emerald-600' : 'bg-amber-600'
                      }`}
                    >
                      {cur} / {item.targetCount}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Electronic Tasbeeh Counter */}
          <div className="rounded-2xl border border-amber-500/35 bg-amber-500/10 p-4 space-y-3 text-center">
            <h3 className="text-sm font-extrabold flex items-center justify-center gap-1.5 text-amber-800 dark:text-amber-300">
              <Sparkles className="h-4 w-4 shrink-0" />
              <span>المسبحة الإلكترونية</span>
            </h3>

            {/* 4-button phrase selector */}
            <div className="grid grid-cols-4 gap-1.5">
              {[
                'سبحان الله وبحمده',
                'الحمد لله',
                'الله أكبر',
                'أستغفر الله العظيم',
              ].map((phrase) => (
                <button
                  key={phrase}
                  type="button"
                  onClick={() => setTasbeehPhrase(phrase)}
                  className={`min-h-[42px] rounded-xl px-1 py-1.5 text-[10px] sm:text-xs font-bold leading-tight text-center break-words transition-colors ${
                    tasbeehPhrase === phrase
                      ? 'bg-amber-600 text-white'
                      : 'border border-amber-500/30 bg-white/80 dark:bg-slate-900/80'
                  }`}
                >
                  {phrase}
                </button>
              ))}
            </div>

            <div className="py-2">
              <p className="text-xs font-bold text-slate-600 dark:text-slate-300 mb-1">
                {tasbeehPhrase}
              </p>
              <p className="font-mono-num text-4xl font-extrabold text-emerald-700 dark:text-emerald-400">
                {tasbeehCount}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-2 max-w-xs mx-auto">
              <button
                type="button"
                onClick={incrementTasbeeh}
                className="min-h-[48px] flex items-center justify-center gap-1.5 rounded-xl bg-emerald-700 hover:bg-emerald-600 text-white text-sm font-extrabold shadow-md active:scale-95 transition-all"
              >
                <Plus className="h-5 w-5" />
                <span>سبّح</span>
              </button>
              <button
                type="button"
                onClick={() => setTasbeehCount(0)}
                className="min-h-[48px] flex items-center justify-center gap-1.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-bold hover:border-rose-500 transition-colors"
              >
                <RotateCcw className="h-4 w-4" />
                <span>تصفير</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
