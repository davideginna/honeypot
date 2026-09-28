import { test } from 'node:test';
import assert from 'node:assert/strict';
import { dueReminders, zonedToUtc } from './schedule.mjs';

const MIN = 60 * 1000;
const H = 60 * MIN;
const t = (iso) => Date.parse(iso);

function cfg(overrides = {}) {
  return {
    timezone: 'Europe/Rome',
    subscriptions: [],
    weigh: { enabled: false, day: 0, time: '08:00' },
    water: { enabled: false, from: '09:00', to: '21:00', everyMinutes: 90 },
    checkin: { enabled: false, dayOfMonth: 1, time: '09:00' },
    ...overrides,
  };
}
const weighOnly = cfg({ weigh: { enabled: true, day: 0, time: '08:00' } });
const waterOnly = cfg({ water: { enabled: true, from: '09:00', to: '21:00', everyMinutes: 90 } });
const checkinOnly = (dayOfMonth = 1) => cfg({ checkin: { enabled: true, dayOfMonth, time: '09:00' } });

/** Window of 15 minutes ending `after` ms after `atIso`. */
const around = (atIso, after = 5 * MIN) => [t(atIso) + after - 15 * MIN, t(atIso) + after];
const tags = (list) => list.map((r) => r.tag);

test('zonedToUtc handles CET and CEST', () => {
  assert.equal(zonedToUtc(2026, 9, 28, 8, 0, 'Europe/Rome'), t('2026-09-28T06:00:00Z'));
  assert.equal(zonedToUtc(2026, 10, 26, 8, 0, 'Europe/Rome'), t('2026-10-26T07:00:00Z'));
  assert.equal(zonedToUtc(2027, 3, 29, 8, 0, 'Europe/Rome'), t('2027-03-29T06:00:00Z'));
});

test('weigh fires Monday 08:00 Rome (CEST) and not Tuesday', () => {
  const [a, b] = around('2026-09-28T06:00:00Z');
  const due = dueReminders(weighOnly, a, b);
  assert.deepEqual(due, [{
    title: '⚖️ Giorno di pesata',
    body: "Al mattino, a digiuno, dopo il bagno. Segna il peso nell'app.",
    tag: 'weigh',
    url: './?tab=weight',
  }]);
  const [c, d] = around('2026-09-29T06:00:00Z');
  assert.deepEqual(dueReminders(weighOnly, c, d), []);
});

test('weigh is not sent at 08:00 UTC on a CEST Monday (off by offset)', () => {
  const [a, b] = around('2026-09-28T08:00:00Z');
  assert.deepEqual(dueReminders(weighOnly, a, b), []);
});

test('weigh respects DST in autumn 2026 (CEST before, CET after 25 Oct)', () => {
  // 2026-10-19 Monday, still CEST: 08:00 = 06:00Z
  assert.deepEqual(tags(dueReminders(weighOnly, ...around('2026-10-19T06:00:00Z'))), ['weigh']);
  assert.deepEqual(tags(dueReminders(weighOnly, ...around('2026-10-19T07:00:00Z'))), []);
  // 2026-10-26 Monday, CET: 08:00 = 07:00Z
  assert.deepEqual(tags(dueReminders(weighOnly, ...around('2026-10-26T07:00:00Z'))), ['weigh']);
  assert.deepEqual(tags(dueReminders(weighOnly, ...around('2026-10-26T06:00:00Z'))), []);
});

test('weigh respects DST in spring 2027 (CET before, CEST after 28 Mar)', () => {
  // 2027-03-22 Monday, CET: 08:00 = 07:00Z
  assert.deepEqual(tags(dueReminders(weighOnly, ...around('2027-03-22T07:00:00Z'))), ['weigh']);
  // 2027-03-29 Monday, CEST: 08:00 = 06:00Z
  assert.deepEqual(tags(dueReminders(weighOnly, ...around('2027-03-29T06:00:00Z'))), ['weigh']);
  assert.deepEqual(tags(dueReminders(weighOnly, ...around('2027-03-29T07:00:00Z'))), []);
});

test('weigh day index: 6 = Sunday', () => {
  const sunday = cfg({ weigh: { enabled: true, day: 6, time: '08:00' } });
  // 2026-10-04 is a Sunday (CEST)
  assert.deepEqual(tags(dueReminders(sunday, ...around('2026-10-04T06:00:00Z'))), ['weigh']);
  assert.deepEqual(tags(dueReminders(sunday, ...around('2026-09-28T06:00:00Z'))), []);
});

test('water every 90 min from 09:00 to 21:00 inclusive, none at 21:30', () => {
  // 2026-09-29, CEST (UTC+2). Scan the whole day in 15-min windows.
  const start = t('2026-09-28T22:00:00Z'); // 00:00 local
  const fired = [];
  for (let to = start + 15 * MIN; to <= start + 24 * H; to += 15 * MIN) {
    const due = dueReminders(waterOnly, to - 15 * MIN, to);
    if (due.length) {
      assert.deepEqual(tags(due), ['water']);
      fired.push(to);
    }
  }
  const local = fired.map((ms) =>
    new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/Rome', hour: '2-digit', minute: '2-digit' }).format(ms));
  assert.deepEqual(local, ['09:00', '10:30', '12:00', '13:30', '15:00', '16:30', '18:00', '19:30', '21:00']);
  // exact instants: 09:00 local → 07:00Z lands on window end
  assert.equal(fired[0], t('2026-09-29T07:00:00Z'));
  assert.deepEqual(dueReminders(waterOnly, t('2026-09-29T19:15:00Z'), t('2026-09-29T19:45:00Z')), []);
});

test('water payload shape', () => {
  assert.deepEqual(dueReminders(waterOnly, ...around('2026-09-29T07:00:00Z')), [{
    title: '💧 Acqua',
    body: "È ora di un bicchiere d'acqua (250 ml).",
    tag: 'water',
    url: './?water=1',
  }]);
});

test('only one water reminder per window', () => {
  // 3h window containing 09:00, 10:30 and 12:00 local
  const due = dueReminders(waterOnly, t('2026-09-29T06:59:00Z'), t('2026-09-29T09:59:00Z'));
  assert.deepEqual(tags(due), ['water']);
});

test('water follows local time on the DST-switch day (2026-10-25)', () => {
  // After the switch, CET: 09:00 local = 08:00Z
  assert.deepEqual(tags(dueReminders(waterOnly, ...around('2026-10-25T08:00:00Z'))), ['water']);
  assert.deepEqual(tags(dueReminders(waterOnly, ...around('2026-10-25T07:00:00Z'))), []);
});

test('checkin fires on day 1 at 09:00', () => {
  // 2026-10-01 09:00 CEST = 07:00Z
  assert.deepEqual(dueReminders(checkinOnly(1), ...around('2026-10-01T07:00:00Z')), [{
    title: '📏 Check-in del mese',
    body: 'Inserisci peso e misure del mese.',
    tag: 'checkin',
    url: './?tab=weight',
  }]);
  assert.deepEqual(dueReminders(checkinOnly(1), ...around('2026-10-02T07:00:00Z')), []);
});

test('checkin dayOfMonth 31 is clamped to the last day of February', () => {
  // 2027-02-28 09:00 CET = 08:00Z
  assert.deepEqual(tags(dueReminders(checkinOnly(31), ...around('2027-02-28T08:00:00Z'))), ['checkin']);
  assert.deepEqual(tags(dueReminders(checkinOnly(31), ...around('2027-02-27T08:00:00Z'))), []);
  // and still fires on the 31st in months that have it (2026-10-31, CET)
  assert.deepEqual(tags(dueReminders(checkinOnly(31), ...around('2026-10-31T08:00:00Z'))), ['checkin']);
  assert.deepEqual(tags(dueReminders(checkinOnly(31), ...around('2026-10-30T08:00:00Z'))), []);
});

test('disabled sections produce nothing', () => {
  const all = cfg();
  // 2027-03-01 is a Monday and the 1st: weigh, water and checkin would all fire
  const window = [t('2027-03-01T06:00:00Z'), t('2027-03-01T09:00:00Z')];
  assert.deepEqual(dueReminders(all, ...window), []);
  const enabled = cfg({
    weigh: { enabled: true, day: 0, time: '08:00' },
    water: { enabled: true, from: '09:00', to: '21:00', everyMinutes: 90 },
    checkin: { enabled: true, dayOfMonth: 1, time: '09:00' },
  });
  assert.deepEqual(tags(dueReminders(enabled, ...window)).sort(), ['checkin', 'water', 'weigh']);
});

test('window longer than 3h only considers the last 3h', () => {
  // Monday 2026-09-28: weigh at 06:00Z. Window ends 09:30Z (3.5h later) → weigh skipped.
  assert.deepEqual(dueReminders(weighOnly, t('2026-09-27T00:00:00Z'), t('2026-09-28T09:30:00Z')), []);
  // Ending 08:59Z (2h59 later) → weigh included.
  assert.deepEqual(tags(dueReminders(weighOnly, t('2026-09-27T00:00:00Z'), t('2026-09-28T08:59:00Z'))), ['weigh']);
  // Exactly 3h: 06:00Z is the (excluded) lower bound.
  assert.deepEqual(dueReminders(weighOnly, t('2026-09-27T00:00:00Z'), t('2026-09-28T09:00:00Z')), []);
});

test('half-open window (from, to]', () => {
  const at = t('2026-09-28T06:00:00Z');
  assert.deepEqual(tags(dueReminders(weighOnly, at - 15 * MIN, at)), ['weigh']); // to inclusive
  assert.deepEqual(dueReminders(weighOnly, at, at + 15 * MIN), []); // from exclusive
  assert.deepEqual(dueReminders(weighOnly, at - 1, at - 1), []); // empty window
  assert.deepEqual(dueReminders(weighOnly, at + 1, at), []); // inverted window
});

test('weigh every 2 weeks from the anchor Monday', () => {
  const cfg = {
    timezone: 'Europe/Rome',
    weigh: { enabled: true, day: 0, time: '08:00', everyWeeks: 2, anchor: '2026-09-28' },
    water: { enabled: false }, checkin: { enabled: false },
  };
  const at = iso => dueReminders(cfg, Date.parse(iso) - 10 * 60e3, Date.parse(iso)).map(r => r.tag);
  assert.deepEqual(at('2026-09-28T06:05:00Z'), ['weigh'], 'anchor week');
  assert.deepEqual(at('2026-10-05T06:05:00Z'), [], 'skipped week');
  assert.deepEqual(at('2026-10-12T06:05:00Z'), ['weigh'], 'two weeks later');
  assert.deepEqual(at('2026-10-26T07:05:00Z'), ['weigh'], 'after DST end (08:00 CET = 07:00Z)');
  assert.deepEqual(at('2026-09-14T06:05:00Z'), ['weigh'], 'weeks before the anchor too');
});

test('invalid or empty times skip only that reminder', () => {
  const cfg = {
    timezone: 'Europe/Rome',
    weigh: { enabled: true, day: 0, time: '08:00' },
    water: { enabled: true, from: '', to: '21:00', everyMinutes: 90 },
    checkin: { enabled: true, dayOfMonth: 1, time: 'xx' },
  };
  const at = iso => dueReminders(cfg, Date.parse(iso) - 10 * 60e3, Date.parse(iso)).map(r => r.tag);
  assert.deepEqual(at('2026-09-28T06:05:00Z'), ['weigh'], 'weigh still fires with broken water/checkin times');
  assert.deepEqual(at('2026-10-01T07:05:00Z'), [], 'broken checkin time: nothing, no throw');
});
