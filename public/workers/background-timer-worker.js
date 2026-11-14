// Dedicated Background Web Worker for unthrottled Adhan, Pre-Adhan (10m), and Dhikr timers

let timerId = null;
let state = {
  timings: null,
  timezone: 'Africa/Cairo',
  adhanEnabled: true,
  adhanNotifEnabled: true,
  preAdhanEnabled: true,
  dhikrEnabled: false,
  dhikrIntervalMins: 3,
  nextDhikrAtMs: 0,
};

const ADHAN_KEYS = ['Fajr', 'Dhuhr', 'Asr', 'Maghrib', 'Isha'];
const firedAdhanSigs = new Set();
const firedPreAdhanSigs = new Set();

function cleanTime(raw) {
  if (!raw || typeof raw !== 'string') return '';
  return raw.trim().slice(0, 5);
}

function addMinutesToTime24(hhmm, deltaMinutes) {
  const parts = cleanTime(hhmm).split(':');
  if (parts.length < 2) return hhmm;
  const h = parseInt(parts[0], 10);
  const m = parseInt(parts[1], 10);
  if (Number.isNaN(h) || Number.isNaN(m)) return hhmm;
  const total = (((h * 60 + m + deltaMinutes) % 1440) + 1440) % 1440;
  const nh = Math.floor(total / 60);
  const nm = total % 60;
  return String(nh).padStart(2, '0') + ':' + String(nm).padStart(2, '0');
}

function getZonedHHMMAndDate(now, timeZone) {
  try {
    const fmt = new Intl.DateTimeFormat('en-US', {
      timeZone: timeZone || 'Africa/Cairo',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    });
    const parts = fmt.formatToParts(now);
    const map = {};
    for (const p of parts) {
      map[p.type] = p.value;
    }
    const hourNum = parseInt(map.hour || '0', 10) % 24;
    const hhmm = String(hourNum).padStart(2, '0') + ':' + (map.minute || '00');
    const dateKey = (map.year || '') + '-' + (map.month || '') + '-' + (map.day || '');
    return { hhmm, dateKey };
  } catch {
    const h = String(now.getHours()).padStart(2, '0');
    const m = String(now.getMinutes()).padStart(2, '0');
    return { hhmm: h + ':' + m, dateKey: now.toDateString() };
  }
}

function runTick() {
  const nowMs = Date.now();
  const now = new Date(nowMs);

  // Check Adhan & 10-minute Pre-Adhan
  if (
    state.timings &&
    (state.adhanEnabled || state.adhanNotifEnabled || state.preAdhanEnabled)
  ) {
    const { hhmm, dateKey } = getZonedHHMMAndDate(now, state.timezone);

    for (const key of ADHAN_KEYS) {
      const target = cleanTime(state.timings[key]);
      if (!target) continue;

      if ((state.adhanEnabled || state.adhanNotifEnabled) && target === hhmm) {
        const sig = dateKey + '-' + key + '-' + hhmm;
        if (!firedAdhanSigs.has(sig)) {
          firedAdhanSigs.add(sig);
          self.postMessage({
            type: 'WORKER_ADHAN_DUE',
            prayerKey: key,
            hhmm,
            signature: sig,
            nowMs,
          });
        }
      }

      if (state.preAdhanEnabled) {
        const preTarget = addMinutesToTime24(target, -10);
        if (preTarget === hhmm) {
          const preSig = dateKey + '-pre-' + key + '-' + hhmm;
          if (!firedPreAdhanSigs.has(preSig)) {
            firedPreAdhanSigs.add(preSig);
            self.postMessage({
              type: 'WORKER_PRE_ADHAN_DUE',
              prayerKey: key,
              hhmm,
              signature: preSig,
              nowMs,
            });
          }
        }
      }
    }
  }

  // Check Periodic Dhikr
  if (state.dhikrEnabled && state.nextDhikrAtMs > 0) {
    if (nowMs >= state.nextDhikrAtMs) {
      const intervalMs = Math.max(1, state.dhikrIntervalMins || 3) * 60 * 1000;
      state.nextDhikrAtMs = nowMs + intervalMs;
      self.postMessage({
        type: 'WORKER_DHIKR_DUE',
        nextDhikrAtMs: state.nextDhikrAtMs,
        nowMs,
      });
    }
  }

  const secondsLeft =
    state.dhikrEnabled && state.nextDhikrAtMs > nowMs
      ? Math.max(1, Math.ceil((state.nextDhikrAtMs - nowMs) / 1000))
      : Math.max(1, state.dhikrIntervalMins || 3) * 60;

  self.postMessage({
    type: 'TICK',
    nowMs,
    dhikrSecondsLeft: secondsLeft,
  });
}

function startTimer() {
  if (timerId !== null) return;
  timerId = setInterval(runTick, 1000);
}

self.addEventListener('message', (event) => {
  const data = event.data || {};
  if (data.type === 'START') {
    startTimer();
    runTick();
  } else if (data.type === 'STOP') {
    if (timerId !== null) {
      clearInterval(timerId);
      timerId = null;
    }
  } else if (data.type === 'SYNC_STATE' && data.payload) {
    const prevDhikrEnabled = state.dhikrEnabled;
    const prevIntervalMins = state.dhikrIntervalMins;
    state = {
      ...state,
      ...data.payload,
    };
    const intervalMs = Math.max(1, state.dhikrIntervalMins || 3) * 60 * 1000;
    if (data.payload.resetDhikrTimer || (!prevDhikrEnabled && state.dhikrEnabled) || prevIntervalMins !== state.dhikrIntervalMins) {
      state.nextDhikrAtMs = Date.now() + intervalMs;
    } else if (state.dhikrEnabled && !state.nextDhikrAtMs) {
      state.nextDhikrAtMs = Date.now() + intervalMs;
    }
    startTimer();
    runTick();
  }
});
