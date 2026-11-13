'use client';

import React, { useState } from 'react';
import { X, Droplets, Sparkles, CheckCircle2, AlertCircle, BookOpen } from 'lucide-react';
import {
  WUDU_STEPS,
  WUDU_OBLIGATIONS_AND_NULLIFIERS,
  PRAYER_STEPS,
} from '@/lib/data/wudu-prayer-guide';

interface WuduPrayerModalProps {
  mode: 'wudu' | 'prayer' | null;
  onClose: () => void;
  onSwitchMode: (mode: 'wudu' | 'prayer') => void;
}

export function WuduPrayerModal({ mode, onClose, onSwitchMode }: WuduPrayerModalProps) {
  const [wuduTab, setWuduTab] = useState<'steps' | 'rulings'>('steps');

  if (!mode) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/70 backdrop-blur-sm p-0 sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-label={mode === 'wudu' ? 'تعليم الوضوء الصحيح' : 'تعليم صفة الصلاة'}
    >
      <div className="relative flex max-h-[92vh] w-full max-w-3xl flex-col overflow-hidden rounded-t-3xl sm:rounded-3xl border border-amber-500/25 bg-white dark:bg-slate-950 text-slate-900 dark:text-white shadow-2xl">
        {/* Modal Header */}
        <div className="flex items-center justify-between gap-3 border-b border-slate-200 dark:border-slate-800 px-4 py-3.5 bg-slate-50/90 dark:bg-slate-900/90">
          <div className="flex items-center gap-2.5 min-w-0">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-600/15 text-emerald-700 dark:text-emerald-400">
              {mode === 'wudu' ? <Droplets className="h-5 w-5" /> : <BookOpen className="h-5 w-5" />}
            </span>
            <div className="min-w-0">
              <h2 className="text-base sm:text-lg font-bold truncate">
                {mode === 'wudu' ? 'تعليم الوضوء الصحيح' : 'تعليم صفة الصلاة خطوة بخطوة'}
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                {mode === 'wudu'
                  ? 'من النية والبسملة حتى الدعاء مع بيان الفرائض والسنن'
                  : 'من تكبيرة الإحرام حتى التسليم بالتشكيل الكامل'}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="إغلاق"
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Mode Switcher Bar (Max 4 buttons rule respected) */}
        <div className="grid grid-cols-2 gap-2 border-b border-slate-200 dark:border-slate-800 px-4 py-2.5 bg-slate-100/60 dark:bg-slate-900/60">
          <button
            type="button"
            onClick={() => onSwitchMode('wudu')}
            className={`min-h-[44px] rounded-xl px-2 py-2 text-xs sm:text-sm font-bold transition-colors ${
              mode === 'wudu'
                ? 'bg-emerald-700 text-white shadow-sm'
                : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700'
            }`}
          >
            تعليم الوضوء
          </button>
          <button
            type="button"
            onClick={() => onSwitchMode('prayer')}
            className={`min-h-[44px] rounded-xl px-2 py-2 text-xs sm:text-sm font-bold transition-colors ${
              mode === 'prayer'
                ? 'bg-emerald-700 text-white shadow-sm'
                : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700'
            }`}
          >
            تعليم الصلاة
          </button>
        </div>

        {/* Sub-tabs for Wudu */}
        {mode === 'wudu' && (
          <div className="grid grid-cols-2 gap-2 px-4 pt-3">
            <button
              type="button"
              onClick={() => setWuduTab('steps')}
              className={`min-h-[40px] rounded-xl px-2 py-1.5 text-xs font-bold transition-colors ${
                wuduTab === 'steps'
                  ? 'bg-amber-600 text-white'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
              }`}
            >
              خطوات الوضوء (8 خطوات)
            </button>
            <button
              type="button"
              onClick={() => setWuduTab('rulings')}
              className={`min-h-[40px] rounded-xl px-2 py-1.5 text-xs font-bold transition-colors ${
                wuduTab === 'rulings'
                  ? 'bg-amber-600 text-white'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
              }`}
            >
              الفرائض والسنن والنواقض
            </button>
          </div>
        )}

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
          {mode === 'wudu' && wuduTab === 'steps' && (
            <div className="space-y-3">
              {WUDU_STEPS.map((step) => (
                <div
                  key={step.stepNumber}
                  className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-900/75 p-4 space-y-2"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2.5">
                      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-emerald-700 text-white text-sm font-bold font-mono-num">
                        {step.stepNumber}
                      </span>
                      <h3 className="font-quran text-lg sm:text-xl font-bold text-slate-900 dark:text-amber-100 leading-snug">
                        {step.title}
                      </h3>
                    </div>
                    {step.ruling && (
                      <span className="text-xs font-bold text-emerald-700 dark:text-emerald-400 shrink-0">
                        {step.ruling}
                      </span>
                    )}
                  </div>
                  <p className="font-quran text-base sm:text-lg leading-relaxed text-slate-700 dark:text-slate-200">
                    {step.description}
                  </p>
                  {step.repeatCount && (
                    <p className="text-xs font-semibold text-amber-700 dark:text-amber-400">
                      التكرار: {step.repeatCount}
                    </p>
                  )}
                  {step.recitation && (
                    <div className="rounded-xl border border-amber-500/25 bg-amber-50/70 dark:bg-amber-950/30 p-3">
                      <p className="font-quran text-lg sm:text-xl leading-loose text-amber-950 dark:text-amber-200">
                        {step.recitation}
                      </p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {mode === 'wudu' && wuduTab === 'rulings' && (
            <div className="space-y-4">
              <div className="rounded-2xl border border-emerald-500/25 bg-emerald-50/60 dark:bg-emerald-950/25 p-4 space-y-2.5">
                <div className="flex items-center gap-2 text-emerald-800 dark:text-emerald-300 font-bold text-base">
                  <CheckCircle2 className="h-5 w-5 shrink-0" />
                  <h3>فرائض الوضوء (أركانه التي لا يصح إلا بها)</h3>
                </div>
                <ul className="space-y-1.5 font-quran text-lg text-slate-800 dark:text-slate-200 pr-2">
                  {WUDU_OBLIGATIONS_AND_NULLIFIERS.obligations.map((item, idx) => (
                    <li key={idx}>
                      {idx + 1}. {item}
                    </li>
                  ))}
                </ul>
              </div>

              <div className="rounded-2xl border border-amber-500/25 bg-amber-50/60 dark:bg-amber-950/25 p-4 space-y-2.5">
                <div className="flex items-center gap-2 text-amber-800 dark:text-amber-300 font-bold text-base">
                  <Sparkles className="h-5 w-5 shrink-0" />
                  <h3>سنن الوضوء المستحبة</h3>
                </div>
                <ul className="space-y-1.5 font-quran text-lg text-slate-800 dark:text-slate-200 pr-2">
                  {WUDU_OBLIGATIONS_AND_NULLIFIERS.sunnahs.map((item, idx) => (
                    <li key={idx}>
                      {idx + 1}. {item}
                    </li>
                  ))}
                </ul>
              </div>

              <div className="rounded-2xl border border-rose-500/25 bg-rose-50/60 dark:bg-rose-950/25 p-4 space-y-2.5">
                <div className="flex items-center gap-2 text-rose-800 dark:text-rose-300 font-bold text-base">
                  <AlertCircle className="h-5 w-5 shrink-0" />
                  <h3>نواقض الوضوء</h3>
                </div>
                <ul className="space-y-1.5 font-quran text-lg text-slate-800 dark:text-slate-200 pr-2">
                  {WUDU_OBLIGATIONS_AND_NULLIFIERS.nullifiers.map((item, idx) => (
                    <li key={idx}>
                      {idx + 1}. {item}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )}

          {mode === 'prayer' && (
            <div className="space-y-3">
              {PRAYER_STEPS.map((step) => (
                <div
                  key={step.stepNumber}
                  className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-900/75 p-4 space-y-2"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2.5">
                      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-amber-600 text-white text-sm font-bold font-mono-num">
                        {step.stepNumber}
                      </span>
                      <h3 className="font-quran text-lg sm:text-xl font-bold text-slate-900 dark:text-amber-100 leading-snug">
                        {step.title}
                      </h3>
                    </div>
                    {step.ruling && (
                      <span className="text-xs font-bold text-amber-700 dark:text-amber-400 shrink-0">
                        {step.ruling}
                      </span>
                    )}
                  </div>
                  <p className="font-quran text-base sm:text-lg leading-relaxed text-slate-700 dark:text-slate-200">
                    {step.description}
                  </p>
                  {step.repeatCount && (
                    <p className="text-xs font-semibold text-emerald-700 dark:text-emerald-400">
                      التكرار: {step.repeatCount}
                    </p>
                  )}
                  {step.recitation && (
                    <div className="rounded-xl border border-emerald-500/25 bg-emerald-50/60 dark:bg-emerald-950/30 p-3">
                      <p className="font-quran text-lg sm:text-xl leading-loose text-emerald-950 dark:text-emerald-100">
                        {step.recitation}
                      </p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
