'use client';

import React from 'react';
import { Play, Pause, Square, Maximize2, Radio, Loader2, Timer } from 'lucide-react';
import type { RadioStation } from '@/lib/data/radio-stations';
import type { RadioPlaybackStatus } from '@/hooks/useResilientRadio';

interface FloatingMiniPlayerProps {
  station: RadioStation;
  status: RadioPlaybackStatus;
  sleepTimerSecondsLeft: number | null;
  onTogglePlayPause: () => void;
  onExpand: () => void;
  onStop: () => void;
}

function formatTimerShort(secs: number): string {
  const m = Math.floor(secs / 60);
  const s = secs % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

export function FloatingMiniPlayer({
  station,
  status,
  sleepTimerSecondsLeft,
  onTogglePlayPause,
  onExpand,
  onStop,
}: FloatingMiniPlayerProps) {
  const isPlayingOrConnecting =
    status === 'playing' || status === 'connecting' || status === 'reconnecting';

  return (
    <div
      role="region"
      aria-label="المشغل المصغر للبث المباشر"
      className="fixed bottom-[68px] left-0 right-0 z-30 mx-auto max-w-5xl px-2 sm:px-4"
    >
      <div className="flex items-center justify-between gap-2 rounded-2xl border border-amber-500/40 bg-emerald-950/95 text-white px-3 py-2 shadow-2xl backdrop-blur-xl">
        {/* Clickable Info Area to Expand */}
        <button
          type="button"
          onClick={onExpand}
          className="flex min-w-0 flex-1 items-center gap-2.5 text-right"
        >
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-amber-500/20 text-amber-300">
            {status === 'connecting' || status === 'reconnecting' ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Radio className="h-4 w-4" />
            )}
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-extrabold truncate">{station.name}</p>
            <div className="flex items-center gap-2 text-[10px] text-amber-300">
              <span>
                {status === 'playing' && 'البث يعمل الآن'}
                {status === 'connecting' && 'جارٍ الاتصال...'}
                {status === 'reconnecting' && 'إعادة الاتصال الذكي...'}
                {status === 'paused' && 'متوقف مؤقتاً'}
                {status === 'error' && 'تعذر الاتصال'}
              </span>
              {sleepTimerSecondsLeft !== null && (
                <span className="inline-flex items-center gap-0.5 font-mono-num text-emerald-300">
                  <Timer className="h-3 w-3" />
                  {formatTimerShort(sleepTimerSecondsLeft)}
                </span>
              )}
            </div>
          </div>
        </button>

        {/* Compact Control Buttons (3 buttons) */}
        <div className="flex items-center gap-1.5 shrink-0">
          <button
            type="button"
            onClick={onTogglePlayPause}
            aria-label={isPlayingOrConnecting ? 'إيقاف مؤقت' : 'تشغيل'}
            className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-700 hover:bg-emerald-600 text-white transition-colors"
          >
            {isPlayingOrConnecting ? (
              <Pause className="h-4 w-4 fill-current" />
            ) : (
              <Play className="h-4 w-4 fill-current" />
            )}
          </button>

          <button
            type="button"
            onClick={onExpand}
            aria-label="تكبير المشغل"
            className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/10 hover:bg-white/20 text-amber-300 transition-colors"
          >
            <Maximize2 className="h-4 w-4" />
          </button>

          <button
            type="button"
            onClick={onStop}
            aria-label="إغلاق البث"
            className="flex h-9 w-9 items-center justify-center rounded-xl bg-rose-600 hover:bg-rose-500 text-white transition-colors"
          >
            <Square className="h-3.5 w-3.5 fill-current" />
          </button>
        </div>
      </div>
    </div>
  );
}
