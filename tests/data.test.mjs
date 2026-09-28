// Plain-node tests (no browser): data integrity and service-worker precache list.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile, access } from 'node:fs/promises';
import vm from 'node:vm';

const ROOT = new URL('../', import.meta.url);
const read = p => readFile(new URL(p, ROOT), 'utf8');
const exists = p => access(new URL(p, ROOT)).then(() => true, () => false);

test('diet.json: monthMap covers 12 months with existing plans, days have the required slots', async () => {
  const d = JSON.parse(await read('data/diet.json'));
  const ids = new Set(d.phases.map(p => p.id));
  assert.equal(ids.size, d.phases.length, 'phase ids are unique');
  assert.deepEqual(Object.keys(d.monthMap).map(Number).sort((a, b) => a - b), [...Array(12)].map((_, i) => i + 1));
  for (const [m, id] of Object.entries(d.monthMap)) assert.ok(ids.has(id), `month ${m} → ${id}`);
  // spuntino is missing on two days, so it is not required
  const required = ['sveglia', 'colazione', 'pranzo', 'merenda', 'cena'];
  const slots = Object.keys(d.slots);
  for (const p of d.phases) {
    assert.ok(p.rules in d.rules, `${p.id}: rules ${p.rules}`);
    assert.equal(p.days.length, 7, p.id);
    p.days.forEach((day, i) => {
      for (const s of required) assert.ok(typeof day[s] === 'string' && day[s].trim(), `${p.id}[${i}] has ${s}`);
      for (const s of Object.keys(day)) assert.ok(slots.includes(s), `${p.id}[${i}] unknown slot ${s}`);
    });
  }
});

test('ingredients.json: no unused keys, one category per canonical name', async () => {
  const d = JSON.parse(await read('data/diet.json'));
  const ing = JSON.parse(await read('data/ingredients.json'));
  const texts = new Set(d.phases.flatMap(p => p.days.flatMap(day => Object.values(day))));
  assert.deepEqual(Object.keys(ing).filter(k => !texts.has(k)).map(k => k.slice(0, 50)), [], 'unused ingredient keys');
  const cat = new Map();
  for (const items of Object.values(ing)) {
    for (const it of items) {
      assert.ok(typeof it.n === 'string' && it.n.trim() === it.n && it.n, `canonical name "${it.n}"`);
      cat.set(it.n, (cat.get(it.n) || new Set()).add(it.c));
    }
  }
  const multi = [...cat].filter(([, s]) => s.size > 1).map(([n, s]) => `${n}: ${[...s].join(', ')}`);
  assert.deepEqual(multi, []);
});

// ASSETS evaluated from sw.js itself (not regex-parsed)
async function swAssets() {
  const src = await read('sw.js');
  const ctx = { self: { addEventListener() {} }, location: { origin: 'http://x' } };
  vm.createContext(ctx);
  vm.runInContext(src + '\n;globalThis.__assets = ASSETS; globalThis.__cache = CACHE;', ctx);
  return { assets: ctx.__assets, cache: ctx.__cache };
}

test('service worker precaches every local file the app loads, all relative and present', async () => {
  const { assets, cache } = await swAssets();
  assert.match(cache, /^dieta-v\d+$/);
  assert.ok(assets.includes('./') && assets.includes('index.html'));
  for (const a of assets) {
    assert.ok(!a.startsWith('/') && !/^https?:/.test(a), `relative: ${a}`);
    if (a !== './') assert.ok(await exists(a), `exists on disk: ${a}`);
  }
  const html = await read('index.html');
  const fromHtml = [...html.matchAll(/(?:href|src)="([^"#?]+)"/g)].map(m => m[1]).filter(u => !/^[a-z]+:/i.test(u));
  const manifest = JSON.parse(await read('manifest.webmanifest'));
  const app = await read('app.js');
  const sw = await read('sw.js');
  const fromApp = [...app.matchAll(/fetch\('([^']+)'\)/g)].map(m => m[1]);
  const iconRefs = [...(app + sw).matchAll(/'(icons\/[^']+)'/g)].map(m => m[1]);
  assert.ok(fromApp.length >= 2, 'found app fetches');
  const needed = [...new Set([...fromHtml, ...manifest.icons.map(i => i.src), ...fromApp, ...iconRefs])];
  assert.deepEqual(needed.filter(u => !assets.includes(u)), [], 'missing from precache');
  for (const u of needed) assert.ok(await exists(u), `referenced file exists: ${u}`);
  assert.equal(manifest.start_url, './');
  assert.equal(manifest.scope, './');
});
