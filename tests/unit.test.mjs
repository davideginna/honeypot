// Unit tests: pure functions of app.js, evaluated inside the real page.
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { startServer, launch } from './harness.mjs';

let srv, page;
const ev = expr => page.eval(expr);

before(async () => {
  srv = await startServer();
  page = await launch();
  await page.goto(srv.base);
});
after(async () => { await page?.close(); srv?.server.close(); });

test('date helpers are local and Monday-based', async () => {
  assert.equal(await ev(`keyOf(new Date(2026, 0, 5))`), '2026-01-05');
  assert.equal(await ev(`keyOf(parseKey('2026-03-29'))`), '2026-03-29'); // DST switch day
  assert.equal(await ev(`dow(new Date(2026, 8, 28))`), 0, 'Monday = 0');
  assert.equal(await ev(`dow(new Date(2026, 9, 4))`), 6, 'Sunday = 6');
  assert.equal(await ev(`keyOf(weekStart(new Date(2026, 9, 4)))`), '2026-09-28', 'week runs Mon–Sun');
  assert.equal(await ev(`keyOf(weekStart(new Date(2026, 8, 28)))`), '2026-09-28');
  assert.equal(await ev(`keyOf(addDays(new Date(2026, 9, 24), 2))`), '2026-10-26', 'crosses DST end');
});

test('month → plan mapping', async () => {
  const phase = (y, m) => ev(`(state.phase = 'auto', phaseFor(new Date(${y}, ${m - 1}, 10)).id)`);
  assert.equal(await phase(2026, 9), 'settembre');
  assert.equal(await phase(2026, 10), 'ottobre');
  assert.equal(await phase(2027, 1), 'gennaio');
  assert.equal(await phase(2027, 5), 'aprile', 'May falls back to April');
  assert.equal(await phase(2027, 6), 'giugno');
  assert.equal(await phase(2027, 8), 'giugno', 'August uses June');
  assert.equal(await ev(`(state.phase = 'marzo', phaseFor(new Date(2026, 8, 10)).id)`), 'marzo', 'manual override');
  await ev(`state.phase = 'auto'`);
});

test('every plan has 7 days with lunch and dinner', async () => {
  const bad = await ev(`DATA.phases.flatMap(p => p.days.map((d, i) => (d.pranzo && d.cena && d.colazione) ? null : p.id + ':' + i)).filter(Boolean)`);
  assert.deepEqual(bad, []);
  assert.equal(await ev(`DATA.phases.every(p => p.days.length === 7)`), true);
  assert.equal(await ev(`DATA.phases.some(p => /rivisto|originale\\)/.test(p.label) && p.id === 'giugno')`), false, 'no "rivisto" label');
});

test('lunch/dinner quantities are reduced by 20%, vegetables are not', async () => {
  const f = (t, r = true) => ev(`formatQty(${JSON.stringify(t)}, ${r}).replace(/<[^>]+>/g, '')`);
  assert.equal(await f('200 g di pesce'), '160 g di pesce');
  assert.equal(await f('60 g di farro'), '50 g di farro');
  assert.equal(await f('10 g di grana'), '8 g di grana');
  assert.equal(await f('150 g di fagiolini'), '150 g di fagiolini', 'vegetables untouched');
  assert.equal(await f('funghi prezzemolati (almeno 100 g)'), 'funghi prezzemolati (almeno 100 g)');
  assert.equal(await f('passata di pomodoro (almeno 100 g)'), 'passata di pomodoro (almeno 100 g)');
  assert.equal(await f('200 g di pesce', false), '200 g di pesce', 'breakfast/snacks untouched');
  assert.match(await f('150-350 g di pesce'), /^120-280 g/);
  assert.equal(await ev(`formatQty('<b>x</b> 10 g', false).includes('<b>')`), false, 'html escaped');
});

test('ingredients cover every meal text', async () => {
  const ing = JSON.parse(await readFile(new URL('../data/ingredients.json', import.meta.url)));
  const diet = JSON.parse(await readFile(new URL('../data/diet.json', import.meta.url)));
  const missing = diet.phases.flatMap(p => p.days.flatMap(d => Object.entries(d)
    .filter(([s, t]) => s !== 'veloce' && !(t in ing)).map(([, t]) => t.slice(0, 40))));
  assert.deepEqual(missing, []);
  const cats = await ev(`CATS`);
  for (const [t, items] of Object.entries(ing)) {
    for (const it of items) {
      assert.ok(cats.includes(it.c), `category ${it.c} (${t.slice(0, 30)})`);
      assert.ok([null, 'g', 'ml', 'pz'].includes(it.u), `unit ${it.u}`);
      assert.equal(it.q === null, it.u === null, `q/u consistency for ${it.n}`);
    }
  }
});

test('shopping list aggregates a week Mon–Sun with reductions', async () => {
  const r = await ev(`(() => {
    state.phase = 'auto';
    const days = [...Array(7)].map((_, i) => addDays(new Date(2026, 8, 28), i));
    const items = aggregate(days);
    const get = n => items.find(e => e.n === n);
    return { n: items.length, lemon: fmtAmount(get('Limone')), names: items.map(e => e.n), dup: items.length !== new Set(items.map(e => e.n)).size };
  })()`);
  assert.ok(r.n > 20, 'has products');
  assert.equal(r.dup, false, 'one row per product');
  assert.match(r.lemon, /^× 4/, 'half lemon every morning → 4 lemons a week');
  // one Monday in September: lunch 90 g bread would be 72 g after reduction
  const bread = await ev(`fmtAmount(aggregate([new Date(2026, 8, 28)]).find(e => e.n === 'Pane integrale') || { parts: [] })`);
  assert.ok(bread === '' || /70 g|× /.test(bread), 'reduced bread: ' + bread);
  assert.equal(await ev(`fmtAmount({ parts: [{ q: 1250, u: 'g' }], qb: false })`), '1,3 kg');
  assert.equal(await ev(`fmtAmount({ parts: [{ q: 2, u: 'pz' }, { q: 330, u: 'ml' }], qb: true })`), '× 2 + 330 ml + q.b.');
  const txt = await ev(`(state.view = 'week', state.date = '2026-09-30', shopText())`);
  assert.ok(txt.split('\n').length === r.n, 'Bring text: one product per line');
});

test('weigh-in day and achievements', async () => {
  await ev(`state.weighDay = 0`);
  assert.equal(await ev(`keyOf(nextWeighDate(new Date(2026, 8, 29)))`), '2026-10-05');
  assert.equal(await ev(`keyOf(nextWeighDate(new Date(2026, 8, 28)))`), '2026-09-28');
  const a = await ev(`(() => {
    userWeights = [{ d: '2026-09-07', kg: 98 }, { d: '2026-09-14', kg: 97 }, { d: '2026-09-21', kg: 96.5 }, { d: '2026-09-28', kg: 94.8 }];
    water = { '2026-09-20': 8, '2026-09-21': 9 };
    checkins = { '2026-09': { d: '2026-09-28', kg: 94.8 } };
    const r = Object.fromEntries(computeAchievements().map(x => [x.id, x.ok]));
    userWeights = []; water = {}; checkins = {};
    return r;
  })()`);
  assert.equal(a.first, true);
  assert.equal(a.l3, true, '−3.2 kg');
  assert.equal(a.l5, false);
  assert.equal(a.u95, true);
  assert.equal(a.w4, true, '4 consecutive weeks');
  assert.equal(a.h1, true);
  assert.equal(a.h7, false);
  assert.equal(a.ck1, true);
});

test('push config follows app settings', async () => {
  const c = await ev(`(state.weighDay = 2, state.notif.waterEvery = '120', pushConfig())`);
  assert.equal(c.timezone, 'Europe/Rome');
  assert.equal(c.weigh.day, 2);
  assert.equal(c.water.everyMinutes, 120);
  assert.deepEqual(Object.keys(c).sort(), ['checkin', 'subscriptions', 'timezone', 'water', 'weigh']);
  await ev(`state.weighDay = 0`);
});
