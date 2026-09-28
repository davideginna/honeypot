// Feature tests in headless Chrome (phone size): backup, weights, water, shopping, reminders ↔ scheduler contract,
// theme, achievements, navigation, check-in. Each test starts from a clean localStorage.
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { startServer, launch } from './harness.mjs';
import { dueReminders } from '../push/schedule.mjs';

let srv, page;
const ev = e => page.eval(e);
const sleep = ms => new Promise(r => setTimeout(r, ms));

before(async () => {
  srv = await startServer();
  page = await launch();
  await page.goto(srv.base);
});
after(async () => { await page?.close(); srv?.server.close(); });

// clean storage, optional seeded keys ({ 'dieta.state': {...} }), then reload
async function fresh(seed = {}) {
  await ev(`localStorage.clear(); ${Object.entries(seed).map(([k, v]) => `localStorage.setItem(${JSON.stringify(k)}, ${JSON.stringify(JSON.stringify(v))});`).join('')}`);
  await page.reload();
}
const clearSnack = () => ev(`document.querySelector('#snackbar').textContent = ''`);
const snackText = () => page.text('#snackbar');
const setField = (sel, value) => ev(`(el => { el.value = ${JSON.stringify(value)}; el.dispatchEvent(new Event('change', { bubbles: true })); })(document.querySelector(${JSON.stringify(sel)}))`);
const stubClipboard = (reject = false) => ev(`(() => {
  window.__clip = null;
  navigator.clipboard.writeText = t => { window.__clip = t; return ${reject ? `Promise.reject(new Error('denied'))` : 'Promise.resolve()'}; };
})()`);
const stored = key => ev(`JSON.parse(localStorage.getItem(${JSON.stringify(key)}))`);
const todayKey = () => ev(`keyOf(today())`);

// ---------- backup ----------
test('export backup contains weights, water and check-ins', async () => {
  await fresh({
    'dieta.state': { tab: 'weight' },
    'dieta.weights': [{ d: '2026-01-05', kg: 99.1 }, { d: '2026-01-19', kg: 98.4 }],
    'dieta.water': { '2026-01-05': 6 },
    'dieta.checkins': { '2026-01': { d: '2026-01-05', kg: 99.1, fm: 30, fmEst: false, waist: 110, neck: 43, hips: null } },
  });
  await ev(`(() => {
    window.__blobs = [];
    window.__orig = { url: URL.createObjectURL, click: HTMLAnchorElement.prototype.click };
    URL.createObjectURL = b => { __blobs.push(b); return __orig.url.call(URL, b); };
    HTMLAnchorElement.prototype.click = function () { window.__dl = this.download; };
  })()`);
  await page.click('#exportBtn');
  const out = await ev(`(async () => {
    const r = { name: window.__dl, type: __blobs[0].type, data: JSON.parse(await __blobs[0].text()) };
    URL.createObjectURL = __orig.url; HTMLAnchorElement.prototype.click = __orig.click;
    return r;
  })()`);
  assert.equal(out.name, `dieta-backup-${await todayKey()}.json`);
  assert.equal(out.type, 'application/json');
  assert.deepEqual(Object.keys(out.data).sort(), ['checkins', 'water', 'weights']);
  assert.deepEqual(out.data.weights, [{ d: '2026-01-05', kg: 99.1 }, { d: '2026-01-19', kg: 98.4 }]);
  assert.deepEqual(out.data.water, { '2026-01-05': 6 });
  assert.equal(out.data.checkins['2026-01'].waist, 110);

  // round trip: import that file into an empty device
  await fresh({ 'dieta.state': { tab: 'weight' } });
  await importJson(JSON.stringify(out.data));
  assert.deepEqual(await stored('dieta.weights'), out.data.weights);
  assert.deepEqual(await stored('dieta.water'), out.data.water);
  assert.deepEqual(await stored('dieta.checkins'), out.data.checkins);
});

async function importJson(text) {
  await clearSnack();
  await ev(`(() => {
    const dt = new DataTransfer();
    dt.items.add(new File([${JSON.stringify(text)}], 'backup.json', { type: 'application/json' }));
    const inp = document.querySelector('#importIn');
    inp.files = dt.files;
    inp.dispatchEvent(new Event('change', { bubbles: true }));
  })()`);
  await page.waitFor(`document.querySelector('#snackbar').textContent !== ''`);
  return snackText();
}

test('import merges backup: weights by date (backup wins), water and check-ins (device wins)', async () => {
  await fresh({
    'dieta.state': { tab: 'weight' },
    'dieta.weights': [{ d: '2026-02-02', kg: 99 }, { d: '2026-02-09', kg: 98.5 }],
    'dieta.water': { '2026-02-02': 3 },
    'dieta.checkins': { '2026-02': { d: '2026-02-02', kg: 99, waist: 111 } },
  });
  const msg = await importJson(JSON.stringify({
    weights: [{ d: '2026-02-02', kg: 97.8 }, { d: '2026-02-16', kg: 97.5 }, { d: 'ieri', kg: 90 }, { d: '2026-02-23', kg: '96' }],
    water: { '2026-02-02': 7, '2026-02-03': 8 },
    checkins: { '2026-02': { d: '2026-02-10', kg: 98, waist: 109 }, '2026-01': { d: '2026-01-12', kg: 100, waist: 112 } },
  }));
  assert.equal(msg, 'Importate 2 pesate', 'invalid rows skipped');
  assert.deepEqual(await stored('dieta.weights'), [{ d: '2026-02-02', kg: 97.8 }, { d: '2026-02-09', kg: 98.5 }, { d: '2026-02-16', kg: 97.5 }]);
  assert.deepEqual(await stored('dieta.water'), { '2026-02-02': 3, '2026-02-03': 8 });
  const ck = await stored('dieta.checkins');
  assert.equal(ck['2026-02'].waist, 111, 'existing check-in kept');
  assert.equal(ck['2026-01'].waist, 112, 'new month imported');
  assert.equal(await ev(`[...document.querySelectorAll('.wlist [data-del]')].map(b => b.dataset.del).join()`), '2026-02-16,2026-02-09,2026-02-02', 'list re-rendered');
  await page.reload();
  assert.equal(await ev(`userWeights.length`), 3, 'persisted');
});

test('import of an invalid file shows "File non valido" and changes nothing', async () => {
  await fresh({ 'dieta.state': { tab: 'weight' }, 'dieta.weights': [{ d: '2026-02-02', kg: 99 }], 'dieta.water': { '2026-02-02': 2 } });
  assert.equal(await importJson('{ not json'), 'File non valido');
  assert.equal(await importJson('null'), 'File non valido');
  assert.deepEqual(await stored('dieta.weights'), [{ d: '2026-02-02', kg: 99 }]);
  assert.deepEqual(await stored('dieta.water'), { '2026-02-02': 2 });
});

// ---------- weights ----------
test('weigh-ins: same date overwrites, out-of-range kg rejected, delete removes', async () => {
  await fresh({ 'dieta.state': { tab: 'weight' } });
  const submit = async (d, kg, bypassValidation = false) => {
    await clearSnack();
    await ev(`(() => {
      document.querySelector('#wDate').value = ${JSON.stringify(d)};
      document.querySelector('#wKg').value = ${JSON.stringify(kg)};
      const f = document.querySelector('#wForm');
      ${bypassValidation ? `f.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }))` : 'f.requestSubmit()'};
    })()`);
    await sleep(50);
  };
  await submit('2026-03-02', '98.46');
  await submit('2026-03-09', '97.9');
  await submit('2026-03-02', '98.2');
  assert.deepEqual(await stored('dieta.weights'), [{ d: '2026-03-02', kg: 98.2 }, { d: '2026-03-09', kg: 97.9 }], 'overwritten, rounded, sorted');

  await submit('2026-03-16', '20'); // blocked by the input's min
  await submit('2026-03-16', '20', true); // JS check
  assert.equal(await snackText(), 'Controlla data e peso');
  await submit('2026-03-16', '300', true);
  assert.equal(await snackText(), 'Controlla data e peso');
  assert.equal((await stored('dieta.weights')).length, 2, 'nothing saved');

  await clearSnack();
  await page.click('[data-del="2026-03-02"]');
  assert.equal(await snackText(), 'Pesata eliminata');
  assert.deepEqual(await stored('dieta.weights'), [{ d: '2026-03-09', kg: 97.9 }]);
  assert.equal(await page.count('[data-del="2026-03-02"]'), 0);
  assert.equal(await page.count('.wlist [data-del]'), 1, 'historical visits have no delete button');
});

test('"Pesati" on the weigh-in card opens the form prefilled with that day', async () => {
  // weigh day = today's weekday, every week
  const dw = await ev(`dow(today())`);
  const tk = await todayKey();
  await fresh({ 'dieta.state': { weighDay: dw, weighEvery: 1, date: tk, view: 'day' } });
  await page.click('[data-go-weigh]');
  assert.equal(await ev(`state.tab`), 'weight');
  assert.equal(await ev(`document.querySelector('#wDate').value`), tk);
  await ev(`document.querySelector('#wKg').value = '96'; document.querySelector('#wForm').requestSubmit()`);
  await page.click('[data-tab=plan]');
  assert.match(await page.text('.weigh.done'), /Fatto: 96,0 kg/);
  assert.equal(await page.count('[data-go-weigh]'), 0);
});

// ---------- water ----------
test('water: capped at 16 glasses, tapping the last full glass removes it', async () => {
  const tk = await todayKey();
  await fresh({ 'dieta.state': { date: tk, view: 'day' } });
  await ev(`for (let i = 0; i < 20; i++) document.querySelector('[data-water="1"]').click()`);
  assert.equal(await ev(`water[${JSON.stringify(tk)}]`), 16);
  assert.match(await page.text('.water .v'), /^4 /);
  assert.equal(await page.count('.glass.full'), 8);
  await page.click('[data-water-set="3"]');
  assert.equal(await ev(`water[${JSON.stringify(tk)}]`), 3, 'glass sets the count');
  await page.click('[data-water-set="3"]');
  assert.equal(await ev(`water[${JSON.stringify(tk)}]`), 2, 'tapping the last full glass decrements');
  await page.click('[data-water-set="1"]');
  await page.click('[data-water-set="1"]');
  assert.equal(await ev(`${JSON.stringify(tk)} in water`), false, 'zero removes the key');
  await ev(`for (let i = 0; i < 3; i++) document.querySelector('[data-water="-1"]').click()`);
  assert.equal(await ev(`${JSON.stringify(tk)} in water`), false, 'never negative');
});

test('water: month calendar rings days with at least 8 glasses', async () => {
  await fresh({ 'dieta.state': { date: '2026-05-13', view: 'month' }, 'dieta.water': { '2026-05-10': 8, '2026-05-11': 7, '2026-05-12': 12 } });
  assert.deepEqual(await ev(`[...document.querySelectorAll('.cal button.hyd')].map(b => b.dataset.pick)`), ['2026-05-10', '2026-05-12']);
  assert.equal(await ev(`document.querySelector('[data-pick="2026-05-12"]').classList.contains('sel')`), false);
  await page.click('[data-pick="2026-05-11"]');
  await page.click('[data-open="2026-05-11"]');
  await page.click('[data-water="1"]');
  await page.click('[data-view=month]');
  assert.ok(await ev(`document.querySelector('[data-pick="2026-05-11"]').classList.contains('hyd')`), 'goal reached from the day view');
});

// ---------- shopping ----------
test('shopText: one line per product, category order, no q.b.', async () => {
  await fresh({ 'dieta.state': { tab: 'shop', view: 'week', date: '2026-09-16' } });
  const r = await ev(`(() => {
    const items = aggregate(shopDays());
    const txt = shopText();
    const lines = txt.split('\\n');
    const byName = Object.fromEntries(items.map(e => [e.n, e]));
    const rowName = l => items.map(e => e.n).filter(n => l === n || l.startsWith(n + ' ')).sort((a, b) => b.length - a.length)[0];
    const names = lines.map(rowName);
    return { lines, names, cats: names.map(n => n && CATS.indexOf(byName[n].c)), qbOnly: items.filter(e => fmtAmount(e) === 'q.b.').map(e => e.n),
      lemon: lines.find(l => l.startsWith('Limone')), lemonAmt: fmtAmount(byName['Limone']), n: items.length };
  })()`);
  assert.equal(r.lines.length, r.n, 'one line per product');
  assert.equal(r.names.filter(Boolean).length, r.n, 'every line starts with a product name');
  assert.equal(new Set(r.names).size, r.n, 'no duplicates');
  assert.ok(r.lines.every(l => !/q\.b\./.test(l)), 'no q.b. in Bring text');
  assert.ok(r.cats.every((c, i) => i === 0 || c >= r.cats[i - 1]), 'grouped in CATS order');
  const collator = new Intl.Collator('it');
  for (let i = 1; i < r.names.length; i++) {
    if (r.cats[i] === r.cats[i - 1]) assert.ok(collator.compare(r.names[i - 1], r.names[i]) <= 0, `sorted: ${r.names[i - 1]} / ${r.names[i]}`);
  }
  assert.ok(r.qbOnly.length > 0, 'fixture has q.b.-only products');
  for (const n of r.qbOnly) assert.ok(r.lines.includes(n), `q.b.-only product is the bare name: ${n}`);
  assert.equal(r.lemon, 'Limone ' + r.lemonAmt.replace(' + q.b.', ''));
});

test('"Copia per Bring" writes shopText() to the clipboard', async () => {
  await fresh({ 'dieta.state': { tab: 'shop', view: 'week', date: '2026-09-16' } });
  await stubClipboard();
  await clearSnack();
  await page.click('[data-shop=copy]');
  await page.waitFor(`window.__clip !== null`);
  assert.equal(await ev(`window.__clip === shopText()`), true);
  assert.equal(await snackText(), 'Lista copiata: incollala in Bring');
  await stubClipboard(true);
  await clearSnack();
  await page.click('[data-shop=copy]');
  await page.waitFor(`document.querySelector('#snackbar').textContent !== ''`);
  assert.equal(await snackText(), 'Copia non riuscita');
});

test('shopping totals: day ⊆ week ⊆ month for every product', async () => {
  // week of 16 Sep 2026 (14–20) lies inside September
  await fresh({ 'dieta.state': { tab: 'shop', view: 'day', date: '2026-09-16' } });
  const r = await ev(`(() => {
    const snap = view => { state.view = view; return Object.fromEntries(aggregate(shopDays()).map(e => [e.n, Object.fromEntries(e.parts.map(p => [p.u, p.q]))])); };
    const out = { day: snap('day'), week: snap('week'), month: snap('month') };
    state.view = 'day';
    return out;
  })()`);
  const bad = [];
  for (const [small, big] of [['day', 'week'], ['week', 'month']]) {
    for (const [n, parts] of Object.entries(r[small])) {
      if (!(n in r[big])) { bad.push(`${n} in ${small} not in ${big}`); continue; }
      for (const [u, q] of Object.entries(parts)) if (!(r[big][n][u] >= q - 1e-9)) bad.push(`${n} ${u}: ${small} ${q} > ${big} ${r[big][n][u]}`);
    }
  }
  assert.deepEqual(bad, []);
  assert.equal(r.day.Limone.pz, 0.5);
  assert.equal(r.week.Limone.pz, 3.5);
  assert.equal(r.month.Limone.pz, 15, 'half a lemon on each of 30 days');
  for (const [view, min] of [['day', 1], ['week', 7], ['month', 30]]) {
    await page.click(`[data-view=${view}]`);
    assert.ok(await page.count('.shop-item') >= 1);
    assert.match(await page.text('.shop-head .grow'), view === 'day' ? /per il giorno/ : view === 'week' ? /per la settimana/ : /per il mese/, `${view} (${min} days)`);
  }
});

// ---------- reminders ↔ push/schedule.mjs contract ----------
const MIN = 60e3;
const around = iso => [Date.parse(iso) - 10 * MIN, Date.parse(iso) + 5 * MIN];
const tagsAt = (cfg, iso) => dueReminders(cfg, ...around(iso)).map(r => r.tag).sort();

async function copyConfig() {
  await stubClipboard();
  await page.click('[data-push=copy]');
  await page.waitFor(`window.__clip !== null`);
  return JSON.parse(await ev(`window.__clip`));
}
const FAKE_SUB = { endpoint: 'https://push.example.test/abc', keys: { p256dh: 'p', auth: 'a' } };

test('reminder settings in the UI update state.notif and persist', async () => {
  await fresh({ 'dieta.state': { tab: 'rules' } });
  await setField('[data-notif=weighTime]', '07:15');
  await setField('[data-notif=waterFrom]', '08:30');
  await setField('[data-notif=waterTo]', '20:00');
  await setField('[data-notif=waterEvery]', '180');
  await setField('[data-notif=checkinDay]', '28');
  await setField('[data-notif=checkinTime]', '21:45');
  await page.click('[data-notif-toggle=weigh]');
  await page.click('[data-notif-toggle=checkin]');
  const expected = { weigh: false, weighTime: '07:15', water: true, waterFrom: '08:30', waterTo: '20:00', waterEvery: '180', checkin: false, checkinDay: '28', checkinTime: '21:45' };
  assert.deepEqual(await ev(`state.notif`), expected);
  await page.reload();
  assert.deepEqual(await ev(`state.notif`), expected);
  assert.equal(await ev(`document.querySelector('[data-notif=waterEvery]').value`), '180');
  assert.equal(await ev(`document.querySelector('[data-notif=checkinDay]').value`), '28');
  assert.equal(await ev(`document.querySelector('[data-notif-toggle=weigh]').getAttribute('aria-checked')`), 'false');
  assert.equal(await ev(`document.querySelector('[data-push=copy]').disabled`), true, 'copy disabled without a subscription');
});

test('config copied from the app fires the right reminders in push/schedule.mjs', async () => {
  await fresh({ 'dieta.state': { tab: 'weight', weighEvery: 2, weighAnchor: '2026-09-28' }, 'dieta.pushsub': FAKE_SUB });
  await setField('#weighDay', '2'); // Wednesday
  await page.click('[data-tab=rules]');
  await setField('[data-notif=weighTime]', '07:30');
  await setField('[data-notif=waterFrom]', '10:00');
  await setField('[data-notif=waterTo]', '12:00');
  await setField('[data-notif=waterEvery]', '60');
  await setField('[data-notif=checkinDay]', '15');
  await setField('[data-notif=checkinTime]', '20:00');
  const cfg = await copyConfig();
  assert.equal(await snackText(), 'Configurazione copiata');
  assert.deepEqual(cfg.subscriptions, [FAKE_SUB]);
  assert.deepEqual(cfg.weigh, { enabled: true, day: 2, time: '07:30', everyWeeks: 2, anchor: '2026-09-28' });

  // weigh: Wednesday 07:30 Rome, every other week from the week of 28 Sep
  assert.deepEqual(tagsAt(cfg, '2026-09-30T05:30:00Z'), ['weigh']);
  assert.deepEqual(tagsAt(cfg, '2026-10-07T05:30:00Z'), [], 'off week');
  assert.deepEqual(tagsAt(cfg, '2026-10-14T05:30:00Z'), ['weigh']);
  assert.deepEqual(tagsAt(cfg, '2026-10-28T06:30:00Z'), ['weigh'], 'CET after 25 Oct');
  assert.deepEqual(tagsAt(cfg, '2026-10-28T05:30:00Z'), []);
  assert.deepEqual(tagsAt(cfg, '2026-09-29T05:30:00Z'), [], 'Tuesday');
  // water: 10:00, 11:00, 12:00 Rome
  for (const iso of ['2026-10-01T08:00:00Z', '2026-10-01T09:00:00Z', '2026-10-01T10:00:00Z', '2026-12-01T11:00:00Z']) assert.deepEqual(tagsAt(cfg, iso), ['water'], iso);
  for (const iso of ['2026-10-01T07:00:00Z', '2026-10-01T08:30:00Z', '2026-10-01T11:00:00Z']) assert.deepEqual(tagsAt(cfg, iso), [], iso);
  // check-in: day 15 at 20:00 Rome
  assert.deepEqual(tagsAt(cfg, '2026-10-15T18:00:00Z'), ['checkin']);
  assert.deepEqual(tagsAt(cfg, '2026-11-15T19:00:00Z'), ['checkin'], 'CET');
  assert.deepEqual(tagsAt(cfg, '2026-10-16T18:00:00Z'), []);

  // disabling water in the UI removes it from the schedule, the rest still fires
  await page.click('[data-notif-toggle=water]');
  const off = await copyConfig();
  assert.equal(off.water.enabled, false);
  for (const h of ['08', '09', '10']) assert.deepEqual(tagsAt(off, `2026-10-01T${h}:00:00Z`), []);
  assert.deepEqual(tagsAt(off, '2026-09-30T05:30:00Z'), ['weigh']);
  assert.deepEqual(tagsAt(off, '2026-10-15T18:00:00Z'), ['checkin']);
});

test('app isWeighDay and scheduler agree week by week (60 weeks, DST, new year)', async () => {
  for (const every of [1, 2]) {
    await fresh({ 'dieta.state': { tab: 'rules', weighDay: 0, weighEvery: every, weighAnchor: '2026-10-05' }, 'dieta.pushsub': FAKE_SUB });
    await setField('[data-notif=weighTime]', '08:00');
    const cfg = await copyConfig();
    cfg.water.enabled = false; cfg.checkin.enabled = false;
    const days = await ev(`[...Array(60 * 7)].map((_, i) => addDays(new Date(2026, 8, 21), i)).filter(d => dow(d) <= 1).map(d => [keyOf(d), isWeighDay(d)])`);
    const { zonedToUtc } = await import('../push/schedule.mjs');
    const mismatches = [];
    let fired = 0;
    for (const [k, app] of days) {
      const [y, m, d] = k.split('-').map(Number);
      const at = zonedToUtc(y, m, d, 8, 0, 'Europe/Rome');
      const sched = dueReminders(cfg, at - 10 * MIN, at + 5 * MIN).some(r => r.tag === 'weigh');
      if (sched !== app) mismatches.push(`${k}: app ${app}, scheduler ${sched}`);
      if (sched) fired++;
    }
    assert.deepEqual(mismatches, [], `every ${every} week(s)`);
    assert.equal(fired, every === 1 ? 60 : 30);
  }
});

test('clearing a reminder time does not break the scheduler', async () => {
  await fresh({ 'dieta.state': { tab: 'rules', weighDay: 2, weighEvery: 1, weighAnchor: '2026-09-28' }, 'dieta.pushsub': FAKE_SUB });
  await setField('[data-notif=waterFrom]', '');
  const cfg = await copyConfig();
  let tags;
  assert.doesNotThrow(() => { tags = tagsAt(cfg, '2026-09-30T06:00:00Z'); });
  assert.deepEqual(tags, ['weigh'], 'weigh reminder still sent');
});

// ---------- theme ----------
test('each color × light/dark sets --primary and theme-color from COLORS', async () => {
  await fresh({ 'dieta.state': { tab: 'rules' } });
  const colors = await ev(`COLORS`);
  assert.deepEqual(Object.keys(colors), ['verde', 'celeste', 'rosa', 'rosso']);
  const seen = new Set();
  for (const c of Object.keys(colors)) {
    for (const mode of ['light', 'dark']) {
      await page.click(`[data-color=${c}]`);
      await page.click(`[data-theme-set=${mode}]`);
      const r = await ev(`({ p: getComputedStyle(document.documentElement).getPropertyValue('--primary').trim(), theme: document.documentElement.dataset.theme,
        metas: [...document.querySelectorAll('meta[name=theme-color]')].map(m => m.content), sel: document.querySelector('.swatch.sel').dataset.color })`);
      assert.equal(r.p.toUpperCase(), colors[c][mode].primary.toUpperCase(), `${c}/${mode}`);
      assert.equal(r.theme, mode);
      assert.equal(r.sel, c);
      assert.deepEqual(r.metas, [colors[c][mode]['surface-cont'], colors[c][mode]['surface-cont']], `${c}/${mode} meta`);
      seen.add(r.p.toUpperCase());
    }
  }
  assert.equal(seen.size, 8, 'eight distinct primaries');
  await page.reload();
  assert.equal(await ev(`state.color + '/' + state.theme`), 'rosso/dark', 'persisted');
});

test('automatic theme follows the system color scheme', async () => {
  await fresh({ 'dieta.state': { theme: 'auto', color: 'celeste' } });
  const primary = () => ev(`getComputedStyle(document.documentElement).getPropertyValue('--primary').trim().toUpperCase()`);
  assert.equal(await primary(), await ev(`COLORS.celeste.light.primary`));
  await page.cmd('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-color-scheme', value: 'dark' }] });
  await page.waitFor(`document.documentElement.dataset.theme === 'dark'`);
  assert.equal(await primary(), await ev(`COLORS.celeste.dark.primary`));
  await page.cmd('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-color-scheme', value: 'light' }] });
  await page.waitFor(`document.documentElement.dataset.theme === 'light'`);
});

// ---------- achievements ----------
test('achievement snack appears once, not again after reload', async () => {
  const tk = await todayKey();
  await fresh({ 'dieta.state': { date: tk, view: 'day' } });
  await clearSnack();
  await page.click('[data-water-set="8"]');
  assert.equal(await snackText(), '🏆 Traguardo: Idratato');
  assert.deepEqual(await stored('dieta.achievements'), ['h1']);
  await clearSnack();
  await page.click('[data-water="1"]');
  assert.equal(await snackText(), '', 'no repeat in the same session');
  await page.reload();
  await page.click('[data-water="-1"]');
  await page.click('[data-water="-1"]');
  await clearSnack();
  await page.click('[data-water="1"]');
  assert.equal(await ev(`water[${JSON.stringify(tk)}]`), 8);
  assert.equal(await snackText(), '', 'no repeat after reload');
});

test('goal-weight achievement unlocks when a weigh-in reaches the goal', async () => {
  await fresh({ 'dieta.state': { tab: 'weight', goalKg: 85 }, 'dieta.weights': [{ d: '2026-03-02', kg: 90 }], 'dieta.achievements': ['first', 'u95'] });
  assert.equal(await ev(`computeAchievements().find(a => a.id === 'goal').ok`), false);
  await clearSnack();
  await ev(`document.querySelector('#wDate').value = '2026-03-16'; document.querySelector('#wKg').value = '85'; document.querySelector('#wForm').requestSubmit()`);
  await page.waitFor(`document.querySelector('#snackbar').textContent.includes('Traguardo')`);
  assert.match(await snackText(), /Peso desiderato/);
  assert.ok((await stored('dieta.achievements')).includes('goal'));
  assert.match(await page.text('.goal-card .big'), /Raggiunto/);
  // lowering the goal below the minimum locks it again (the seen list is kept)
  await setField('#goalKg', '80');
  assert.equal(await ev(`computeAchievements().find(a => a.id === 'goal').ok`), false);
  await page.click('[data-tab=goals]');
  assert.equal(await ev(`[...document.querySelectorAll('.goal')].find(g => g.textContent.includes('Peso desiderato')).classList.contains('ok')`), false);
});

// ---------- navigation ----------
test('prev/next in day, week and month views (month end clamping)', async () => {
  await fresh({ 'dieta.state': { view: 'day', date: '2026-12-31' } });
  await page.click('#nextBtn');
  assert.equal(await ev(`state.date`), '2027-01-01');
  await page.click('#prevBtn');
  await page.click('#prevBtn');
  assert.equal(await ev(`state.date`), '2026-12-30');
  await page.click('[data-view=week]');
  await page.click('#nextBtn');
  assert.equal(await ev(`state.date`), '2027-01-06');
  assert.equal(await page.text('#navLabel'), '4–10 gen');
  await page.click('#prevBtn');
  assert.match(await page.text('#navLabel'), /^28 dic.* – 3 gen/);
  await fresh({ 'dieta.state': { view: 'month', date: '2027-01-31' } });
  await page.click('#nextBtn');
  assert.equal(await ev(`state.date`), '2027-02-28', '31 Jan → 28 Feb');
  await page.click('#nextBtn');
  assert.equal(await ev(`state.date`), '2027-03-28', 'day kept after clamping');
  await fresh({ 'dieta.state': { view: 'month', date: '2028-01-31' } });
  await page.click('#nextBtn');
  assert.equal(await ev(`state.date`), '2028-02-29', 'leap year');
  await fresh({ 'dieta.state': { view: 'month', date: '2027-03-31' } });
  await page.click('#prevBtn');
  assert.equal(await ev(`state.date`), '2027-02-28');
  assert.equal(await page.text('#navLabel'), 'febbraio 2027');
  assert.equal(await page.count('.cal button[data-pick]:not(.out)'), 28);
});

test('"Oggi" is disabled only when today is in view', async () => {
  const tk = await todayKey();
  await fresh({ 'dieta.state': { view: 'day', date: tk } });
  const disabled = () => ev(`document.querySelector('#todayBtn').disabled`);
  assert.equal(await disabled(), true);
  await page.click('#nextBtn');
  assert.equal(await disabled(), false);
  await page.click('#todayBtn');
  assert.equal(await ev(`state.date`), tk);
  assert.equal(await disabled(), true);
  // another day of the current week / month keeps it disabled in those views
  const other = await ev(`keyOf(addDays(today(), dow(today()) === 0 ? 1 : -1))`);
  await ev(`state.date = ${JSON.stringify(other)}; render()`);
  await page.click('[data-view=week]');
  assert.equal(await disabled(), true, 'same week');
  await page.click('#nextBtn');
  assert.equal(await disabled(), false, 'next week');
  await page.click('#todayBtn');
  await page.click('[data-view=month]');
  assert.equal(await disabled(), true, 'same month');
  await page.click('#prevBtn');
  assert.equal(await disabled(), false);
});

async function swipe(fromX, toX, y = 400, toY = y) {
  // synthetic touch events on #main (CDP touch input triggers Chrome's overscroll back-navigation)
  await ev(`(() => {
    const fire = (type, key, x, y) => {
      const e = new Event(type, { bubbles: true });
      Object.defineProperty(e, key, { value: [{ clientX: x, clientY: y }] });
      document.querySelector('#main').dispatchEvent(e);
    };
    fire('touchstart', 'touches', ${fromX}, ${y});
    fire('touchend', 'changedTouches', ${toX}, ${toY});
  })()`);
  await sleep(50);
}

test('swipe left/right moves the plan; vertical swipes and other tabs are ignored', async () => {
  await fresh({ 'dieta.state': { view: 'day', date: '2026-06-10' } });
  const y = 400;
  await swipe(320, 80, y);
  assert.equal(await ev(`state.date`), '2026-06-11', 'swipe left → next day');
  await swipe(80, 320, y);
  await swipe(80, 320, y);
  assert.equal(await ev(`state.date`), '2026-06-09', 'swipe right → previous day');
  await swipe(200, 150, y);
  assert.equal(await ev(`state.date`), '2026-06-09', 'short swipe ignored');
  await swipe(200, 290, y - 100, y + 100);
  assert.equal(await ev(`state.date`), '2026-06-09', 'mostly vertical swipe ignored');
  await page.click('[data-view=week]');
  await swipe(320, 80, y);
  assert.equal(await ev(`state.date`), '2026-06-16', 'week view: +7 days');
  await page.click('[data-tab=weight]');
  await swipe(320, 80, y);
  assert.equal(await ev(`state.date`), '2026-06-16', 'no swipe outside plan/shop');
});

// ---------- check-in ----------
test('check-in: date limited to the current month, manual fat mass wins, delete re-opens the form', async () => {
  await fresh({ 'dieta.state': { tab: 'weight' } });
  const t = await ev(`({ k: keyOf(today()), mk: monthKey(today()) })`);
  assert.equal(await ev(`document.querySelector('#ckDate').min`), `${t.mk}-01`);
  assert.equal(await ev(`document.querySelector('#ckDate').max`), t.k);
  assert.equal(await ev(`document.querySelector('#ckDate').value`), t.k);
  // a date in the previous month is refused by the form
  await ev(`(() => { const d = today(); document.querySelector('#ckDate').value = keyOf(new Date(d.getFullYear(), d.getMonth(), 0)); document.querySelector('#ckKg').value = '95'; document.querySelector('#ckForm').requestSubmit(); })()`);
  assert.deepEqual(await stored('dieta.checkins'), null, 'not saved');
  assert.equal(await ev(`document.querySelector('#ckDate').checkValidity()`), false);

  await ev(`(() => {
    const v = { ckDate: ${JSON.stringify(t.k)}, ckKg: '95', ckFm: '31.5', ckWaist: '108', ckNeck: '43', ckHips: '112' };
    Object.entries(v).forEach(([id, x]) => { document.getElementById(id).value = x; });
    document.querySelector('#ckForm').requestSubmit();
  })()`);
  await page.waitFor(`!document.querySelector('#ckForm')`);
  const ck = (await stored('dieta.checkins'))[t.mk];
  assert.equal(ck.fm, 31.5, 'typed fat mass kept');
  assert.equal(ck.fmEst, false, 'no estimate');
  assert.deepEqual([ck.waist, ck.neck, ck.hips], [108, 43, 112]);
  assert.ok((await stored('dieta.weights')).some(w => w.d === t.k && w.kg === 95), 'check-in weight added');
  assert.doesNotMatch(await ev(`document.querySelector('.wlist small').textContent`), /stima/);

  await clearSnack();
  await page.click(`[data-del-ck="${t.mk}"]`);
  assert.equal(await snackText(), 'Check-in eliminato');
  assert.ok(await ev(`!!document.querySelector('#ckForm')`), 'form re-opened');
  assert.deepEqual(await stored('dieta.checkins'), {});
  await ev(`state.date = keyOf(today()); state.view = 'day'`);
  await page.click('[data-tab=plan]');
  assert.equal(await page.count('.checkin'), 1, 'reminder back on the plan');
});

test('no runtime errors', () => {
  assert.deepEqual(page.errors, []);
});
