// Pure scheduling logic for the push reminders. No dependencies.
// All wall-clock times are interpreted in config.timezone (DST-correct via Intl).

export const MAX_WINDOW_MS = 3 * 60 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;

export const REMINDERS = {
  weigh: {
    title: '⚖️ Giorno di pesata',
    body: "Al mattino, a digiuno, dopo il bagno. Segna il peso nell'app.",
    tag: 'weigh',
    url: './?tab=weight',
  },
  water: {
    title: '💧 Acqua',
    body: "È ora di un bicchiere d'acqua (250 ml).",
    tag: 'water',
    url: './?water=1',
  },
  checkin: {
    title: '📏 Check-in del mese',
    body: 'Inserisci peso e misure del mese.',
    tag: 'checkin',
    url: './?tab=weight',
  },
};

const fmtCache = new Map();
function formatter(timeZone) {
  let f = fmtCache.get(timeZone);
  if (!f) {
    f = new Intl.DateTimeFormat('en-US', {
      timeZone,
      hourCycle: 'h23',
      year: 'numeric', month: 'numeric', day: 'numeric',
      hour: 'numeric', minute: 'numeric', second: 'numeric',
    });
    fmtCache.set(timeZone, f);
  }
  return f;
}

/** Wall-clock parts of instant `ms` in `timeZone`. month is 1-12. */
function localParts(ms, timeZone) {
  const p = {};
  for (const { type, value } of formatter(timeZone).formatToParts(new Date(ms))) {
    if (type !== 'literal') p[type] = Number(value);
  }
  return p;
}

/** Offset (ms) of `timeZone` from UTC at instant `ms`. */
function tzOffset(ms, timeZone) {
  const p = localParts(ms, timeZone);
  const asUtc = Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second);
  return asUtc - Math.floor(ms / 1000) * 1000;
}

/** UTC instant for a wall-clock time in `timeZone` (month 1-12). */
export function zonedToUtc(year, month, day, hour, minute, timeZone) {
  const naive = Date.UTC(year, month - 1, day, hour, minute);
  let ts = naive - tzOffset(naive, timeZone);
  // Second pass fixes instants near a DST transition.
  const off2 = tzOffset(ts, timeZone);
  ts = naive - off2;
  return ts;
}

// Returns minutes after midnight, or null for a missing/invalid "HH:MM" (that reminder is skipped).
function parseTime(s) {
  const m = /^(\d{1,2}):(\d{2})$/.exec(String(s ?? '').trim());
  if (!m) return null;
  const h = Number(m[1]), mi = Number(m[2]);
  if (h > 23 || mi > 59) return null;
  return h * 60 + mi;
}

function daysInMonth(year, month) {
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

/**
 * Reminders whose scheduled time falls in the half-open window (fromMs, toMs].
 * Windows longer than 3h are shortened to the last 3h. At most one water reminder.
 * @returns {{title:string, body:string, tag:string, url:string}[]}
 */
// Weigh-ins every `everyWeeks` weeks (default 1), counted from the Monday `anchor` (YYYY-MM-DD).
function inWeighWeek(w, mondayMs) {
  const every = Math.max(1, Number(w.everyWeeks) || 1);
  if (every === 1 || !/^\d{4}-\d{2}-\d{2}$/.test(w.anchor || '')) return true;
  const [y, m, d] = w.anchor.split('-').map(Number);
  const weeks = Math.round((mondayMs - Date.UTC(y, m - 1, d)) / (7 * DAY_MS));
  return ((weeks % every) + every) % every === 0;
}

export function dueReminders(config, fromMs, toMs) {
  const tz = config?.timezone || 'Europe/Rome';
  if (!(toMs > fromMs)) return [];
  const from = Math.max(fromMs, toMs - MAX_WINDOW_MS);
  const inWindow = (ts) => ts > from && ts <= toMs;

  // Local calendar days touched by the window (plus a margin of one day each side).
  const a = localParts(from, tz);
  const b = localParts(toMs, tz);
  const startDay = Date.UTC(a.year, a.month - 1, a.day) - DAY_MS;
  const endDay = Date.UTC(b.year, b.month - 1, b.day) + DAY_MS;

  const hits = { weigh: [], water: [], checkin: [] };
  const at = (y, m, d, minutes) => zonedToUtc(y, m, d, Math.floor(minutes / 60), minutes % 60, tz);

  for (let dayMs = startDay; dayMs <= endDay; dayMs += DAY_MS) {
    const dt = new Date(dayMs);
    const y = dt.getUTCFullYear(), m = dt.getUTCMonth() + 1, d = dt.getUTCDate();
    const weekday = (dt.getUTCDay() + 6) % 7; // 0 = Monday … 6 = Sunday

    const w = config?.weigh;
    if (w?.enabled && Number(w.day) === weekday && inWeighWeek(w, dayMs - weekday * DAY_MS)) {
      const t = parseTime(w.time);
      const ts = t == null ? NaN : at(y, m, d, t);
      if (inWindow(ts)) hits.weigh.push(ts);
    }

    const wa = config?.water;
    if (wa?.enabled) {
      const step = Number(wa.everyMinutes);
      const start = parseTime(wa.from), end = parseTime(wa.to);
      if (start != null && end != null && step > 0) {
        for (let t = start; t <= end; t += step) {
          const ts = at(y, m, d, t);
          if (inWindow(ts)) hits.water.push(ts);
        }
      }
    }

    const c = config?.checkin;
    if (c?.enabled) {
      const target = Math.min(Math.max(1, Math.floor(Number(c.dayOfMonth) || 1)), daysInMonth(y, m));
      if (d === target) {
        const t = parseTime(c.time);
        const ts = t == null ? NaN : at(y, m, d, t);
        if (inWindow(ts)) hits.checkin.push(ts);
      }
    }
  }

  // Each tag at most once per window (for water this collapses bursts).
  const out = [];
  for (const tag of ['weigh', 'checkin', 'water']) {
    if (hits[tag].length) out.push({ ...REMINDERS[tag] });
  }
  return out;
}
