'use client';

import React, { useEffect, useState } from 'react';
import { Clock, X, Check } from 'lucide-react';
import {
  DhikrAudioClip,
  DhikrScheduleTiming,
  formatTime24To12Ar,
} from '@/lib/data/audio-library';

interface DhikrTimeModalProps {
  clip: DhikrAudioClip | null;
  initialTiming: DhikrScheduleTiming;
  initialTime: string;
  onClose: () => void;
  onSave: (clipId: string, timing: DhikrScheduleTiming, time24: string) => void;
}

function DhikrTimeModalInner({
  clip,
  initialTiming,
  initialTime,
  onClose,
  onSave,
}: {
  clip: DhikrAudioClip;
  initialTiming: DhikrScheduleTiming;
  initialTime: string;
  onClose: () => void;
  onSave: (clipId: string, timing: DhikrScheduleTiming, time24: string) => void;
}) {
  const [timing, setTiming] = useState<DhikrScheduleTiming>(initialTiming || 'periodic');
  const [timeValue, setTimeValue] = useState<string>(
    /^\d{2}:\d{2}$/.test(initialTime) ? initialTime : '08:00'
  );

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/75 backdrop-blur-sm p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="dhikr-time-modal-title"
      onClick={onClose}
    >
      <div
        className="w-full max-w-sm rounded-3xl border border-amber-500/35 bg-white dark:bg-slate-900 p-5 text-slate-900 dark:text-white shadow-2xl space-y-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <h4
              id="dhikr-time-modal-title"
              className="text-sm sm:text-base font-extrabold flex items-center gap-2 text-emerald-700 dark:text-emerald-400"
            >
              <Clock className="h-4 w-4 shrink-0 text-amber-500" />
              <span>تحديد وقت تشغيل الذكر</span>
            </h4>
            <p className="text-xs font-bold text-slate-600 dark:text-slate-300 mt-1 truncate">
              {clip.label}
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="إغلاق نافذة التوقيت"
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="space-y-3 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/70 p-3.5">
          <div className="space-y-1.5">
            <label
              htmlFor="dhikr-modal-timing-select"
              className="block text-xs font-bold text-slate-700 dark:text-slate-200"
            >
              متى يتم تشغيل هذا المقطع؟
            </label>
            <select
              id="dhikr-modal-timing-select"
              value={timing}
              onChange={(e) => setTiming(e.target.value as DhikrScheduleTiming)}
              className="min-h-[44px] w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-xs sm:text-sm font-bold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
            >
              <option value="periodic">مع المنبه الدوري</option>
              <option value="before_prayer">قبل الصلاة</option>
              <option value="after_prayer">بعد الصلاة</option>
              <option value="custom_time">اختيار وقت</option>
              <option value="off">إيقاف</option>
            </select>
          </div>

          {timing === 'custom_time' && (
            <div className="space-y-2 border-t border-slate-200 dark:border-slate-800 pt-2.5">
              <label
                htmlFor="dhikr-custom-time-input"
                className="block text-xs font-bold text-slate-700 dark:text-slate-200"
              >
                اختر الساعة والدقيقة للتشغيل التلقائي يومياً:
              </label>
              <input
                id="dhikr-custom-time-input"
                type="time"
                dir="ltr"
                value={timeValue}
                onChange={(e) => setTimeValue(e.target.value || '08:00')}
                className="min-h-[48px] w-full rounded-xl border border-amber-500/40 bg-white dark:bg-slate-900 px-3 py-2 text-center text-base font-extrabold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
              <p className="text-center text-xs font-extrabold text-amber-600 dark:text-amber-400">
                موعد التشغيل المختار: الساعة {formatTime24To12Ar(timeValue)}
              </p>
            </div>
          )}
        </div>

        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => {
              const finalTime = /^\d{2}:\d{2}$/.test(timeValue) ? timeValue : '08:00';
              onSave(clip.id, timing, finalTime);
            }}
            className="min-h-[44px] flex items-center justify-center gap-1.5 rounded-xl bg-emerald-700 hover:bg-emerald-600 px-3 py-2 text-xs sm:text-sm font-extrabold text-white transition-colors"
          >
            <Check className="h-4 w-4 shrink-0" />
            <span>حفظ</span>
          </button>
          <button
            type="button"
            onClick={onClose}
            className="min-h-[44px] rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 px-3 py-2 text-xs sm:text-sm font-bold transition-colors"
          >
            إلغاء
          </button>
        </div>
      </div>
    </div>
  );
}

export function DhikrTimeModal({
  clip,
  initialTiming,
  initialTime,
  onClose,
  onSave,
}: DhikrTimeModalProps) {
  if (!clip) return null;
  return (
    <DhikrTimeModalInner
      key={`${clip.id}-${initialTiming}-${initialTime}`}
      clip={clip}
      initialTiming={initialTiming}
      initialTime={initialTime}
      onClose={onClose}
      onSave={onSave}
    />
  );
}
