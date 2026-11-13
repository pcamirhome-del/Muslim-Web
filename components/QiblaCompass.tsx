'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Compass, Navigation, MapPin, CheckCircle2, Smartphone } from 'lucide-react';
import {
  UserLocation,
  calculateDistanceToKaabaKm,
  calculateQiblaBearing,
} from '@/lib/prayer-utils';

interface QiblaCompassProps {
  location: UserLocation;
  onRequestGPS: () => void;
  gpsLoading: boolean;
}

interface IOSDeviceOrientationEvent extends DeviceOrientationEvent {
  webkitCompassHeading?: number;
}

interface DeviceOrientationEventConstructorWithPermission {
  requestPermission?: () => Promise<'granted' | 'denied'>;
}

export function QiblaCompass({ location, onRequestGPS, gpsLoading }: QiblaCompassProps) {
  const [heading, setHeading] = useState<number | null>(null);
  const [sensorActive, setSensorActive] = useState(false);
  const [permissionRequired, setPermissionRequired] = useState(false);
  const [permissionDenied, setPermissionDenied] = useState(false);
  const lastVibrateRef = useRef<number>(0);

  const qiblaBearing = calculateQiblaBearing(location.latitude, location.longitude);
  const distanceKm = calculateDistanceToKaabaKm(location.latitude, location.longitude);

  const handleOrientation = useCallback((event: Event) => {
    const e = event as IOSDeviceOrientationEvent;
    let compassHeading: number | null = null;

    if (typeof e.webkitCompassHeading === 'number' && !Number.isNaN(e.webkitCompassHeading)) {
      compassHeading = e.webkitCompassHeading;
    } else if (typeof e.alpha === 'number' && e.alpha !== null) {
      // Android / W3C absolute orientation: alpha is counter-clockwise from North
      compassHeading = (360 - e.alpha) % 360;
    }

    if (compassHeading !== null) {
      setHeading((compassHeading + 360) % 360);
      setSensorActive(true);
    }
  }, []);

  const attachListeners = useCallback(() => {
    const win = window as unknown as {
      addEventListener: (
        type: string,
        listener: EventListenerOrEventListenerObject,
        options?: boolean | AddEventListenerOptions
      ) => void;
      removeEventListener: (
        type: string,
        listener: EventListenerOrEventListenerObject
      ) => void;
    };

    if ('ondeviceorientationabsolute' in window) {
      win.addEventListener('deviceorientationabsolute', handleOrientation, true);
    }
    window.addEventListener('deviceorientation', handleOrientation, true);

    return () => {
      if ('ondeviceorientationabsolute' in window) {
        win.removeEventListener('deviceorientationabsolute', handleOrientation);
      }
      window.removeEventListener('deviceorientation', handleOrientation);
    };
  }, [handleOrientation]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const DOE = window.DeviceOrientationEvent as unknown as
      | DeviceOrientationEventConstructorWithPermission
      | undefined;

    if (DOE && typeof DOE.requestPermission === 'function') {
      const t = setTimeout(() => setPermissionRequired(true), 0);
      return () => clearTimeout(t);
    }

    const cleanup = attachListeners();
    return cleanup;
  }, [attachListeners]);

  const requestIOSCompassPermission = async () => {
    try {
      const DOE = window.DeviceOrientationEvent as unknown as
        | DeviceOrientationEventConstructorWithPermission
        | undefined;
      if (DOE && typeof DOE.requestPermission === 'function') {
        const result = await DOE.requestPermission();
        if (result === 'granted') {
          setPermissionRequired(false);
          setPermissionDenied(false);
          attachListeners();
        } else {
          setPermissionDenied(true);
        }
      }
    } catch {
      setPermissionDenied(true);
    }
  };

  // Angle difference between user's heading and Qibla bearing
  const currentHeading = heading ?? 0;
  const relativeAngle = ((qiblaBearing - currentHeading) % 360 + 360) % 360;
  const signedDiff = relativeAngle > 180 ? relativeAngle - 360 : relativeAngle;
  const isAligned = sensorActive && Math.abs(signedDiff) <= 5;

  // Trigger subtle haptic vibration when aligned with Qibla
  useEffect(() => {
    if (!isAligned) return;
    const now = Date.now();
    if (now - lastVibrateRef.current > 2500) {
      lastVibrateRef.current = now;
      if (typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') {
        navigator.vibrate(60);
      }
    }
  }, [isAligned]);

  const dialRotation = sensorActive ? -currentHeading : 0;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="text-lg sm:text-xl font-bold flex items-center gap-2">
            <Compass className="h-5 w-5 text-amber-500" />
            <span>بوصلة القبلة الحقيقية</span>
          </h2>
          <p className="text-xs text-slate-600 dark:text-slate-300 mt-0.5">
            {location.city}
            {location.country ? ` · ${location.country}` : ''} · المسافة إلى مكة{' '}
            <span className="font-mono-num font-semibold">{distanceKm.toLocaleString('ar-EG')}</span> كم
          </p>
        </div>

        <button
          type="button"
          onClick={onRequestGPS}
          disabled={gpsLoading}
          className="min-h-[44px] flex items-center gap-1.5 rounded-xl bg-emerald-700 hover:bg-emerald-600 px-3 py-2 text-xs font-bold text-white transition-colors disabled:opacity-60"
        >
          <MapPin className="h-4 w-4" />
          <span>{gpsLoading ? 'جارٍ التحديد...' : 'تحديث موقعي (GPS)'}</span>
        </button>
      </div>

      {/* iOS Permission Prompt Button */}
      {permissionRequired && (
        <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4 text-center space-y-2.5">
          <p className="text-sm font-semibold">
            يتطلب جهاز iPhone / iPad موافقتك لتشغيل مستشعر البوصلة المغناطيسية
          </p>
          <button
            type="button"
            onClick={requestIOSCompassPermission}
            className="min-h-[44px] inline-flex items-center justify-center gap-2 rounded-xl bg-amber-600 hover:bg-amber-500 px-5 py-2.5 text-sm font-bold text-white transition-colors"
          >
            <Smartphone className="h-4 w-4" />
            <span>تفعيل بوصلة الحساسات</span>
          </button>
        </div>
      )}

      {permissionDenied && (
        <div className="rounded-2xl border border-rose-500/30 bg-rose-500/10 p-3 text-center text-xs font-medium text-rose-700 dark:text-rose-300">
          تم رفض إذن البوصلة. يمكنك تفعيل حساسات الحركة والاتجاه من إعدادات المتصفح، أو الاعتماد على زاوية القبلة المحسوبة بالأسفل.
        </div>
      )}

      {/* Compass Dial Card */}
      <div
        className={`relative flex flex-col items-center justify-center rounded-3xl border p-6 transition-colors duration-300 ${
          isAligned
            ? 'border-emerald-500 bg-emerald-500/10 shadow-lg shadow-emerald-500/15'
            : 'border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/70'
        }`}
      >
        {/* Top Phone Alignment Pointer */}
        <div className="mb-2 flex flex-col items-center">
          <div
            className={`h-4 w-1 rounded-full transition-colors ${
              isAligned ? 'bg-emerald-500' : 'bg-amber-500'
            }`}
          />
          <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 mt-0.5">
            مقدمة الهاتف
          </span>
        </div>

        {/* Rotating Compass Rose */}
        <div className="relative h-64 w-64 sm:h-72 sm:w-72 flex items-center justify-center">
          <div
            className="relative h-full w-full rounded-full border-4 border-slate-300 dark:border-slate-700 bg-white/80 dark:bg-slate-950/90 shadow-inner transition-transform duration-150 ease-out"
            style={{ transform: `rotate(${dialRotation}deg)` }}
          >
            {/* Cardinal Marks */}
            <span className="absolute top-2.5 left-1/2 -translate-x-1/2 text-xs font-extrabold text-rose-600 dark:text-rose-400">
              ش (N)
            </span>
            <span className="absolute bottom-2.5 left-1/2 -translate-x-1/2 text-xs font-bold text-slate-500">
              ج (S)
            </span>
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-500">
              شرق
            </span>
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-500">
              غرب
            </span>

            {/* Degree Ring Ticks */}
            {Array.from({ length: 12 }).map((_, i) => (
              <div
                key={i}
                className="absolute inset-2 pointer-events-none"
                style={{ transform: `rotate(${i * 30}deg)` }}
              >
                <div className="mx-auto h-2 w-0.5 bg-slate-400/60 dark:bg-slate-600" />
              </div>
            ))}

            {/* Qibla Bearing Vector inside Dial */}
            <div
              className="absolute inset-0 pointer-events-none"
              style={{ transform: `rotate(${qiblaBearing}deg)` }}
            >
              <div className="mx-auto mt-6 flex flex-col items-center">
                <div
                  className={`flex h-10 w-10 items-center justify-center rounded-xl border-2 shadow-md transition-colors ${
                    isAligned
                      ? 'border-emerald-300 bg-emerald-600 text-white'
                      : 'border-amber-300 bg-amber-600 text-white'
                  }`}
                >
                  <Navigation className="h-5 w-5" />
                </div>
                <div
                  className={`h-20 w-1 rounded-b-full ${
                    isAligned ? 'bg-emerald-500' : 'bg-amber-500'
                  }`}
                />
              </div>
            </div>
          </div>

          {/* Center Pivot Readout */}
          <div className="pointer-events-none absolute flex h-20 w-20 flex-col items-center justify-center rounded-full border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-md">
            <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400">
              زاوية القبلة
            </span>
            <span className="font-mono-num text-lg font-extrabold text-amber-600 dark:text-amber-400">
              {Math.round(qiblaBearing)}°
            </span>
          </div>
        </div>

        {/* Status Message */}
        <div className="mt-4 text-center space-y-1">
          {isAligned ? (
            <div className="inline-flex items-center gap-1.5 text-sm font-extrabold text-emerald-600 dark:text-emerald-400">
              <CheckCircle2 className="h-5 w-5" />
              <span>أنت متجه نحو القبلة تماماً</span>
            </div>
          ) : sensorActive ? (
            <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">
              {signedDiff > 0
                ? `أدر الهاتف لليمين بمقدار ${Math.round(Math.abs(signedDiff))}°`
                : `أدر الهاتف لليسار بمقدار ${Math.round(Math.abs(signedDiff))}°`}
            </p>
          ) : (
            <p className="text-xs text-slate-600 dark:text-slate-400 max-w-md leading-relaxed">
              تعمل البوصلة الحية تلقائياً على الهواتف المزودة بمستشعر مغناطيسي. اتجاه القبلة الدقيق من موقعك هو{' '}
              <span className="font-mono-num font-bold text-amber-600 dark:text-amber-400">
                {qiblaBearing.toFixed(1)}°
              </span>{' '}
              من الشمال الحقيقي.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
