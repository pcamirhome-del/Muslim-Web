'use client';

import React, { useCallback, useEffect, useState } from 'react';
import {
  ADHAN_PRAYER_KEYS,
  DEFAULT_EGYPT_LOCATION,
  NextPrayerInfo,
  PRAYER_LABELS_AR,
  PrayerScheduleData,
  UserLocation,
  addMinutesToTime24,
  cleanTimeString,
  computeNextPrayer,
  fetchPrayerSchedule,
  getZonedClockParts,
  reverseGeocodeArabic,
} from '@/lib/prayer-utils';
import { BackgroundShell } from './BackgroundShell';
import { TopHeader } from './TopHeader';
import { OfflineIndicator } from './OfflineIndicator';
import { PhonePrayerWidget } from './PhonePrayerWidget';
import { CityPreset, PrayerTimesSection } from './PrayerTimesSection';
import { RamadanCard } from './RamadanCard';
import { AdhanAndDhikrPanel } from './AdhanAndDhikrPanel';
import { LiveRadioPlayer } from './LiveRadioPlayer';
import { FloatingMiniPlayer } from './FloatingMiniPlayer';
import { QiblaCompass } from './QiblaCompass';
import { QuranMushaf } from './QuranMushaf';
import { TafsirSection } from './TafsirSection';
import { HisnAlMuslimSection } from './HisnAlMuslimSection';
import { HadithAndDownloadsSection } from './HadithAndDownloadsSection';
import { SettingsSection } from './SettingsSection';
import { BottomNavBar } from './BottomNavBar';
import { AppSection, SideDrawer } from './SideDrawer';
import { WuduPrayerModal } from './WuduPrayerModal';
import { Footer } from './Footer';
import { useResilientRadio } from '@/hooks/useResilientRadio';

export function IslamicApp() {
  const [activeTab, setActiveTab] = useState<AppSection>('home');
  const [isDark, setIsDark] = useState<boolean>(true);
  const [drawerOpen, setDrawerOpen] = useState<boolean>(false);
  const [guideMode, setGuideMode] = useState<'wudu' | 'prayer' | null>(null);
  const [ramadanPreview, setRamadanPreview] = useState<boolean>(false);

  const radio = useResilientRadio();

  const [location, setLocation] = useState<UserLocation>(DEFAULT_EGYPT_LOCATION);
  const [schedule, setSchedule] = useState<PrayerScheduleData | null>(null);
  const [loadingPrayer, setLoadingPrayer] = useState<boolean>(true);
  const [prayerError, setPrayerError] = useState<string | null>(null);
  const [gpsLoading, setGpsLoading] = useState<boolean>(false);
  const [nextPrayer, setNextPrayer] = useState<NextPrayerInfo | null>(null);

  // Register Service Worker & read URL shortcut tab + saved theme/location
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').catch(() => {});
    }

    const initTimer = setTimeout(() => {
      const params = new URLSearchParams(window.location.search);
      const tabParam = params.get('tab') as AppSection | null;
      if (
        tabParam &&
        ['home', 'radio', 'qibla', 'quran', 'tafsir', 'hisn', 'hadith', 'settings'].includes(
          tabParam
        )
      ) {
        setActiveTab(tabParam);
      }

      try {
        const savedTheme = localStorage.getItem('noor_theme');
        if (savedTheme === 'light') {
          setIsDark(false);
          document.documentElement.classList.remove('dark');
        } else {
          setIsDark(true);
          document.documentElement.classList.add('dark');
        }

        const savedLoc = localStorage.getItem('noor_location');
        if (savedLoc) {
          const parsed = JSON.parse(savedLoc) as UserLocation;
          if (parsed && typeof parsed.latitude === 'number') {
            setLocation(parsed);
          }
        }
      } catch {
        // ignore storage errors
      }
    }, 0);

    return () => clearTimeout(initTimer);
  }, []);

  const toggleTheme = useCallback(() => {
    setIsDark((prev) => {
      const next = !prev;
      if (next) {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
      try {
        localStorage.setItem('noor_theme', next ? 'dark' : 'light');
      } catch {}
      return next;
    });
  }, []);

  // Load prayer schedule whenever location changes
  const loadSchedule = useCallback(async (loc: UserLocation) => {
    setLoadingPrayer(true);
    setPrayerError(null);
    try {
      const data = await fetchPrayerSchedule(loc);
      setSchedule(data);
    } catch (err) {
      setPrayerError(
        err instanceof Error ? err.message : 'تعذر تحميل مواقيت الصلاة. تحقق من الاتصال.'
      );
    } finally {
      setLoadingPrayer(false);
    }
  }, []);

  useEffect(() => {
    const t = setTimeout(() => {
      loadSchedule(location);
    }, 0);
    return () => clearTimeout(t);
  }, [location, loadSchedule]);

  // Update next prayer countdown every second + fire background Adhan/Pre-Adhan notifications when not on home tab
  const activeTimezone = schedule?.timezone || location.timezone;
  useEffect(() => {
    if (!schedule) return;
    const tick = () => {
      const now = new Date();
      setNextPrayer(computeNextPrayer(schedule.timings, now, activeTimezone));

      if (activeTab !== 'home' && typeof Notification !== 'undefined' && Notification.permission === 'granted') {
        const clock = getZonedClockParts(now, activeTimezone);
        if (clock.seconds === 0) {
          const hhmm = `${String(clock.hours24).padStart(2, '0')}:${String(clock.minutes).padStart(2, '0')}`;
          try {
            const adhanNotifOn = localStorage.getItem('noor_adhan_notif_enabled') !== 'false';
            const preAdhanOn = localStorage.getItem('noor_pre_adhan_enabled') !== 'false';
            for (const key of ADHAN_PRAYER_KEYS) {
              const target = cleanTimeString(schedule.timings[key]);
              if (adhanNotifOn && target === hhmm) {
                const sig = `${now.toDateString()}-${key}-${hhmm}`;
                if (localStorage.getItem('noor_last_adhan_sig') !== sig) {
                  localStorage.setItem('noor_last_adhan_sig', sig);
                  new Notification(`حان الآن موعد أذان ${PRAYER_LABELS_AR[key]}`, {
                    body: `توقيت ${location.city}`,
                    icon: '/pwa-192x192.png',
                  });
                }
              }
              if (preAdhanOn && addMinutesToTime24(target, -10) === hhmm) {
                const preSig = `${now.toDateString()}-pre-${key}-${hhmm}`;
                if (localStorage.getItem('noor_last_preadhan_sig') !== preSig) {
                  localStorage.setItem('noor_last_preadhan_sig', preSig);
                  new Notification(`اقترب موعد صلاة ${PRAYER_LABELS_AR[key]}`, {
                    body: 'تبقى ١٠ دقائق على دخول وقت الصلاة',
                    icon: '/pwa-192x192.png',
                  });
                }
              }
            }
          } catch {
            // ignore notification/storage errors
          }
        }
      }
    };
    tick();
    const timer = setInterval(tick, 1000);
    return () => clearInterval(timer);
  }, [schedule, activeTimezone, activeTab, location.city]);

  // GPS Auto-Location Handler
  const handleRequestGPS = useCallback(() => {
    if (!('geolocation' in navigator)) {
      setPrayerError('المتصفح لا يدعم تحديد الموقع الجغرافي (GPS).');
      return;
    }

    setGpsLoading(true);
    setPrayerError(null);

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        const geo = await reverseGeocodeArabic(lat, lng);
        const browserTz = Intl.DateTimeFormat().resolvedOptions().timeZone || 'Africa/Cairo';
        const isEgypt =
          geo.country.includes('مصر') ||
          geo.country.toLowerCase().includes('egypt') ||
          browserTz === 'Africa/Cairo';

        const updated: UserLocation = {
          city: geo.city,
          country: geo.country,
          latitude: lat,
          longitude: lng,
          method: isEgypt ? 5 : 3,
          timezone: browserTz,
          isEgyptDefault: false,
        };

        setLocation(updated);
        try {
          localStorage.setItem('noor_location', JSON.stringify(updated));
        } catch {}
        setGpsLoading(false);
      },
      () => {
        setGpsLoading(false);
        setPrayerError('تعذر الحصول على إذن الموقع (GPS). يمكنك اختيار المدينة من القائمة.');
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }, []);

  const handleSelectPreset = useCallback((preset: CityPreset) => {
    const updated: UserLocation = {
      city: preset.city,
      country: preset.country,
      latitude: preset.latitude,
      longitude: preset.longitude,
      method: preset.method,
      timezone: preset.timezone,
      isEgyptDefault: preset.isEgyptDefault,
    };
    setLocation(updated);
    try {
      localStorage.setItem('noor_location', JSON.stringify(updated));
    } catch {}
  }, []);

  const handleChangeMethod = useCallback((methodId: number) => {
    setLocation((prev) => {
      const updated = { ...prev, method: methodId };
      try {
        localStorage.setItem('noor_location', JSON.stringify(updated));
      } catch {}
      return updated;
    });
  }, []);

  const showRamadanSection = Boolean(schedule && (schedule.isRamadan || ramadanPreview));
  const showFloatingMiniPlayer = Boolean(
    radio.activeStation && (radio.isMinimized || activeTab !== 'radio')
  );

  return (
    <BackgroundShell isHome={activeTab === 'home'} isDark={isDark}>
      <TopHeader
        timezone={activeTimezone}
        hijri={schedule?.hijri || null}
        isDark={isDark}
        onToggleTheme={toggleTheme}
        onOpenDrawer={() => setDrawerOpen(true)}
        onSelectGuide={(mode) => setGuideMode(mode)}
        activeTab={activeTab}
        onGoHome={() => setActiveTab('home')}
      />

      <OfflineIndicator />

      <main className="flex-1 px-3 sm:px-5 py-4 space-y-5">
        {activeTab === 'home' && (
          <>
            <PhonePrayerWidget
              nextPrayer={nextPrayer}
              location={location}
              timezone={activeTimezone}
            />

            <PrayerTimesSection
              schedule={schedule}
              loading={loadingPrayer}
              error={prayerError}
              location={location}
              nextPrayerKey={nextPrayer?.key || null}
              gpsLoading={gpsLoading}
              onRequestGPS={handleRequestGPS}
              onSelectPreset={handleSelectPreset}
              onChangeMethod={handleChangeMethod}
              onRefresh={() => loadSchedule(location)}
              ramadanPreview={ramadanPreview}
              onToggleRamadanPreview={() => setRamadanPreview((v) => !v)}
            />

            {showRamadanSection && schedule && (
              <RamadanCard
                timings={schedule.timings}
                isActualRamadan={schedule.isRamadan}
                onClosePreview={() => setRamadanPreview(false)}
              />
            )}

            <AdhanAndDhikrPanel
              timings={schedule?.timings || null}
              timezone={activeTimezone}
            />
          </>
        )}

        {activeTab === 'radio' && (
          <LiveRadioPlayer
            stations={radio.stations}
            loadingStations={radio.loadingStations}
            activeStation={radio.activeStation}
            status={radio.status}
            activeStreamIndex={radio.activeStreamIndex}
            reconnectAttempt={radio.reconnectAttempt}
            isMuted={radio.isMuted}
            onToggleMute={() => radio.setIsMuted((m) => !m)}
            volume={radio.volume}
            onChangeVolume={(v) => {
              radio.setIsMuted(false);
              radio.setVolume(v);
            }}
            errorMsg={radio.errorMsg}
            isMinimized={radio.isMinimized}
            onMinimize={() => radio.setIsMinimized(true)}
            onExpand={() => radio.setIsMinimized(false)}
            sleepTimerSecondsLeft={radio.sleepTimerSecondsLeft}
            onSetSleepTimer={radio.setSleepTimerMinutes}
            onCancelSleepTimer={radio.cancelSleepTimer}
            onStartStream={(s) => {
              radio.setIsMinimized(false);
              radio.startStream(s);
            }}
            onTogglePlayPause={radio.togglePlayPause}
            onStopStream={radio.stopStream}
          />
        )}

        {activeTab === 'qibla' && (
          <QiblaCompass
            location={location}
            onRequestGPS={handleRequestGPS}
            gpsLoading={gpsLoading}
          />
        )}

        {activeTab === 'quran' && <QuranMushaf />}

        {activeTab === 'tafsir' && <TafsirSection />}

        {activeTab === 'hisn' && <HisnAlMuslimSection />}

        {activeTab === 'hadith' && <HadithAndDownloadsSection />}

        {activeTab === 'settings' && (
          <SettingsSection isDark={isDark} onToggleTheme={toggleTheme} />
        )}
      </main>

      <Footer hasMiniPlayer={showFloatingMiniPlayer} />

      {showFloatingMiniPlayer && radio.activeStation && (
        <FloatingMiniPlayer
          station={radio.activeStation}
          status={radio.status}
          sleepTimerSecondsLeft={radio.sleepTimerSecondsLeft}
          onTogglePlayPause={radio.togglePlayPause}
          onExpand={() => {
            radio.setIsMinimized(false);
            setActiveTab('radio');
          }}
          onStop={radio.stopStream}
        />
      )}

      <BottomNavBar
        activeTab={activeTab}
        onSelectTab={(tab) => setActiveTab(tab)}
        onOpenDrawer={() => setDrawerOpen(true)}
      />

      <SideDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        activeTab={activeTab}
        onSelectTab={(tab) => setActiveTab(tab)}
        isDark={isDark}
        onToggleTheme={toggleTheme}
        onOpenGuide={(mode) => setGuideMode(mode)}
        ramadanPreview={ramadanPreview}
        onToggleRamadanPreview={() => setRamadanPreview((v) => !v)}
      />

      <WuduPrayerModal
        mode={guideMode}
        onClose={() => setGuideMode(null)}
        onSwitchMode={(mode) => setGuideMode(mode)}
      />
    </BackgroundShell>
  );
}
