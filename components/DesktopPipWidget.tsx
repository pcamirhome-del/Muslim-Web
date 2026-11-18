'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Clock, MapPin, X } from 'lucide-react';
import {
  HijriDateInfo,
  NextPrayerInfo,
  UserLocation,
  getZonedClockParts,
} from '@/lib/prayer-utils';

interface DocumentPictureInPictureApi {
  requestWindow: (options?: { width?: number; height?: number }) => Promise<Window>;
  window?: Window | null;
}

interface DesktopPipWidgetProps {
  nextPrayer: NextPrayerInfo | null;
  location: UserLocation;
  hijri: HijriDateInfo | null;
  timezone: string;
}

const PIP_WIDGET_CSS = `
  *, *::before, *::after {
    box-sizing: border-box;
    margin: 0;
    padding: 0;
  }
  html, body {
    width: 100%;
    height: 100%;
    direction: rtl;
    font-family: 'Cairo', 'Tajawal', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
    background: #020617;
    color: #f8fafc;
    overflow: hidden;
    -webkit-font-smoothing: antialiased;
  }
  .pip-shell {
    position: relative;
    width: 100%;
    height: 100%;
    min-height: 100vh;
    padding: 14px;
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    gap: 10px;
    background:
      radial-gradient(circle at 85% 12%, rgba(16, 185, 129, 0.22), transparent 52%),
      radial-gradient(circle at 12% 88%, rgba(245, 158, 11, 0.18), transparent 55%),
      linear-gradient(155deg, rgba(6, 78, 59, 0.42) 0%, rgba(15, 23, 42, 0.95) 45%, rgba(2, 6, 23, 0.99) 100%);
    backdrop-filter: blur(20px);
  }
  .pip-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
    padding-bottom: 8px;
    border-bottom: 1px solid rgba(148, 163, 184, 0.16);
  }
  .pip-brand {
    display: flex;
    flex-direction: column;
    min-width: 0;
  }
  .pip-title {
    font-size: 13px;
    font-weight: 800;
    color: #fcd34d;
    line-height: 1.25;
  }
  .pip-location {
    display: flex;
    align-items: center;
    gap: 4px;
    font-size: 11px;
    font-weight: 600;
    color: #cbd5e1;
    margin-top: 2px;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .pip-close-btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 30px;
    height: 30px;
    border-radius: 10px;
    border: 1px solid rgba(148, 163, 184, 0.25);
    background: rgba(255, 255, 255, 0.06);
    color: #e2e8f0;
    cursor: pointer;
    flex-shrink: 0;
    transition: background 0.15s ease, color 0.15s ease;
  }
  .pip-close-btn:hover {
    background: rgba(244, 63, 94, 0.25);
    border-color: rgba(244, 63, 94, 0.5);
    color: #ffffff;
  }
  .pip-card {
    border-radius: 18px;
    border: 1px solid rgba(255, 255, 255, 0.11);
    background: rgba(15, 23, 42, 0.62);
    backdrop-filter: blur(16px);
    padding: 12px 14px;
    box-shadow: 0 10px 28px -10px rgba(0, 0, 0, 0.6);
  }
  .pip-clock-card {
    text-align: center;
  }
  .pip-clock-label {
    font-size: 11px;
    font-weight: 700;
    color: #6ee7b7;
    margin-bottom: 4px;
  }
  .pip-clock-row {
    display: flex;
    align-items: baseline;
    justify-content: center;
    gap: 6px;
    direction: ltr;
  }
  .pip-clock-time {
    font-family: 'JetBrains Mono', ui-monospace, SFMono-Regular, monospace;
    font-variant-numeric: tabular-nums;
    font-size: 28px;
    font-weight: 800;
    letter-spacing: 0.03em;
    color: #ffffff;
    line-height: 1.1;
  }
  .pip-clock-period {
    font-size: 12px;
    font-weight: 700;
    color: #fcd34d;
    direction: rtl;
  }
  .pip-date {
    font-size: 11px;
    font-weight: 600;
    color: #94a3b8;
    margin-top: 5px;
  }
  .pip-prayer-card {
    border-color: rgba(245, 158, 11, 0.38);
    background: linear-gradient(145deg, rgba(6, 78, 59, 0.45), rgba(15, 23, 42, 0.78));
    display: flex;
    flex-direction: column;
    gap: 10px;
  }
  .pip-prayer-top {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
  }
  .pip-prayer-tag {
    display: inline-flex;
    align-items: center;
    gap: 5px;
    font-size: 11px;
    font-weight: 700;
    color: #6ee7b7;
  }
  .pip-prayer-adhan {
    font-family: 'JetBrains Mono', ui-monospace, SFMono-Regular, monospace;
    font-variant-numeric: tabular-nums;
    font-size: 13px;
    font-weight: 700;
    color: #fcd34d;
  }
  .pip-prayer-name {
    font-size: 24px;
    font-weight: 800;
    color: #ffffff;
    line-height: 1.2;
  }
  .pip-countdown-box {
    border-radius: 14px;
    border: 1px solid rgba(245, 158, 11, 0.25);
    background: rgba(2, 6, 23, 0.55);
    padding: 8px 12px;
    text-align: center;
  }
  .pip-countdown-label {
    font-size: 10px;
    font-weight: 700;
    color: #cbd5e1;
  }
  .pip-countdown-value {
    font-family: 'JetBrains Mono', ui-monospace, SFMono-Regular, monospace;
    font-variant-numeric: tabular-nums;
    font-size: 26px;
    font-weight: 800;
    letter-spacing: 0.06em;
    color: #fbbf24;
    margin-top: 2px;
    direction: ltr;
  }
  .pip-footer {
    text-align: center;
    font-size: 10px;
    font-weight: 600;
    color: #64748b;
  }
`;

export function useDesktopPipWidget() {
  const pipWindowRef = useRef<Window | null>(null);
  const [pipContainer, setPipContainer] = useState<HTMLElement | null>(null);
  const [pipBlockedNotice, setPipBlockedNotice] = useState<string | null>(null);

  const closeDesktopWidget = useCallback(() => {
    const win = pipWindowRef.current;
    pipWindowRef.current = null;
    setPipContainer(null);
    if (win && !win.closed) {
      try {
        win.close();
      } catch {
        // ignore close error
      }
    }
  }, []);

  const openDesktopWidget = useCallback(async () => {
    if (typeof window === 'undefined') return;
    setPipBlockedNotice(null);

    // Toggle closed if already open
    if (pipWindowRef.current && !pipWindowRef.current.closed) {
      closeDesktopWidget();
      return;
    }

    let targetWin: Window | null = null;
    const winWithPip = window as unknown as {
      documentPictureInPicture?: DocumentPictureInPictureApi;
    };

    if (
      winWithPip.documentPictureInPicture &&
      typeof winWithPip.documentPictureInPicture.requestWindow === 'function'
    ) {
      try {
        targetWin = await winWithPip.documentPictureInPicture.requestWindow({
          width: 320,
          height: 390,
        });
      } catch {
        targetWin = null;
      }
    }

    if (!targetWin) {
      targetWin = window.open(
        '',
        'noor_desktop_prayer_widget',
        'width=320,height=400,menubar=no,toolbar=no,location=no,status=no,scrollbars=no,resizable=yes'
      );
    }

    if (!targetWin) {
      setPipBlockedNotice('يرجى السماح بالنوافذ المنبثقة لفتح ويدجت سطح المكتب.');
      setTimeout(() => setPipBlockedNotice(null), 4000);
      return;
    }

    try {
      const pipDoc = targetWin.document;
      pipDoc.open();
      pipDoc.write(
        '<!DOCTYPE html><html lang="ar" dir="rtl"><head><meta charset="utf-8" /><title>ويدجت الصلاة — نور الإسلام</title></head><body></body></html>'
      );
      pipDoc.close();

      // Copy existing Google Fonts / stylesheets safely where permitted
      try {
        document.querySelectorAll('link[rel="stylesheet"]').forEach((linkEl) => {
          const href = linkEl.getAttribute('href');
          if (!href) return;
          const clonedLink = pipDoc.createElement('link');
          clonedLink.rel = 'stylesheet';
          clonedLink.href = new URL(href, window.location.origin).href;
          pipDoc.head.appendChild(clonedLink);
        });
      } catch {
        // ignore cross-origin style copy errors
      }

      // Inject guaranteed self-contained dark glassmorphic CSS
      const styleEl = pipDoc.createElement('style');
      styleEl.id = 'noor-pip-widget-styles';
      styleEl.textContent = PIP_WIDGET_CSS;
      pipDoc.head.appendChild(styleEl);

      const container = pipDoc.createElement('div');
      container.id = 'noor-pip-widget-root';
      container.style.width = '100%';
      container.style.height = '100%';
      pipDoc.body.appendChild(container);

      const handleWinClose = () => {
        if (pipWindowRef.current === targetWin) {
          pipWindowRef.current = null;
          setPipContainer(null);
        }
      };

      targetWin.addEventListener('pagehide', handleWinClose);
      targetWin.addEventListener('beforeunload', handleWinClose);

      pipWindowRef.current = targetWin;
      setPipContainer(container);
    } catch {
      setPipBlockedNotice('تعذر فتح نافذة ويدجت سطح المكتب في هذا المتصفح.');
      setTimeout(() => setPipBlockedNotice(null), 4000);
    }
  }, [closeDesktopWidget]);

  // Monitor popup closed state & clean up if parent page unloads
  useEffect(() => {
    if (!pipContainer) return;

    const watcher = setInterval(() => {
      if (!pipWindowRef.current || pipWindowRef.current.closed) {
        pipWindowRef.current = null;
        setPipContainer(null);
      }
    }, 800);

    const onParentUnload = () => {
      closeDesktopWidget();
    };
    window.addEventListener('pagehide', onParentUnload);

    return () => {
      clearInterval(watcher);
      window.removeEventListener('pagehide', onParentUnload);
    };
  }, [pipContainer, closeDesktopWidget]);

  useEffect(() => {
    return () => {
      closeDesktopWidget();
    };
  }, [closeDesktopWidget]);

  return {
    isPipOpen: Boolean(pipContainer),
    pipContainer,
    pipBlockedNotice,
    openDesktopWidget,
    closeDesktopWidget,
  };
}

export function DesktopPipWidgetPortal({
  container,
  onClose,
  nextPrayer,
  location,
  hijri,
  timezone,
}: DesktopPipWidgetProps & {
  container: HTMLElement | null;
  onClose: () => void;
}) {
  const [now, setNow] = useState<Date>(() => new Date());

  useEffect(() => {
    if (!container) return;
    const init = setTimeout(() => setNow(new Date()), 0);
    const timer = setInterval(() => {
      setNow(new Date());
    }, 1000);
    return () => {
      clearTimeout(init);
      clearInterval(timer);
    };
  }, [container]);

  if (!container) return null;

  const clock = getZonedClockParts(now, timezone);
  const timeDisplay = `${String(clock.hours12).padStart(2, '0')}:${String(clock.minutes).padStart(
    2,
    '0'
  )}:${String(clock.seconds).padStart(2, '0')}`;
  const hijriFormatted = hijri
    ? `${clock.weekdayAr} · ${hijri.day} ${hijri.monthAr} ${hijri.year} هـ`
    : clock.weekdayAr;

  return createPortal(
    <div className="pip-shell" dir="rtl">
      {/* Top Bar */}
      <div className="pip-header">
        <div className="pip-brand">
          <span className="pip-title">نور الإسلام</span>
          <span className="pip-location">
            <MapPin size={11} />
            <span>
              {location.city}
              {location.country ? ` · ${location.country}` : ''}
            </span>
          </span>
        </div>

        <button
          type="button"
          onClick={onClose}
          aria-label="إغلاق نافذة سطح المكتب"
          title="إغلاق"
          className="pip-close-btn"
        >
          <X size={15} />
        </button>
      </div>

      {/* Live Clock Card */}
      <div className="pip-card pip-clock-card">
        <p className="pip-clock-label">الساعة الآن</p>
        <div className="pip-clock-row">
          <span className="pip-clock-time">{timeDisplay}</span>
          <span className="pip-clock-period">{clock.periodFull}</span>
        </div>
        <p className="pip-date">{hijriFormatted}</p>
      </div>

      {/* Next Prayer & Countdown Card */}
      <div className="pip-card pip-prayer-card">
        <div className="pip-prayer-top">
          <span className="pip-prayer-tag">
            <Clock size={12} />
            <span>الصلاة القادمة</span>
          </span>
          <span className="pip-prayer-adhan">
            {nextPrayer ? nextPrayer.time12Ar : '--:--'}
          </span>
        </div>

        <div className="pip-prayer-name">{nextPrayer ? nextPrayer.nameAr : '—'}</div>

        <div className="pip-countdown-box">
          <p className="pip-countdown-label">الوقت المتبقي للأذان</p>
          <p className="pip-countdown-value">
            {nextPrayer ? nextPrayer.formattedCountdown : '00:00:00'}
          </p>
        </div>
      </div>

      <p className="pip-footer">نافذة سطح المكتب · تحديث لحظي متصل بالتطبيق</p>
    </div>,
    container
  );
}
