// End-to-end tests: real flows in headless Chrome at phone size, under the /honeypot/ subpath.
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { startServer, launch } from './harness.mjs';

let srv, page;
const ev = e => page.eval(e);

before(async () => {
  srv = await startServer();
  page = await launch();
  await page.goto(srv.base);
});
after(async () => { await page?.close(); srv?.server.close(); });

test('first open shows today in day view', async () => {
  assert.equal(await ev(`state.tab`), 'plan');
  assert.equal(await ev(`state.view`), 'day');
  assert.equal(await page.text('.day-head h2'), 'Oggi');
  assert.ok(await page.count('.meal') >= 5, 'meals rendered');
  assert.equal(await page.count('.chip.tert'), 0, 'no Lavoro/Spesa tags');
  assert.equal(await ev(`document.documentElement.scrollWidth <= innerWidth`), true, 'no horizontal scroll');
  assert.equal(await ev(`!!document.querySelector('.logo')`), true, 'logo in top bar');
});

test('views switch and survive a reload', async () => {
  await page.click('[data-view=week]');
  assert.equal(await page.count('.wday'), 7);
  const first = await ev(`document.querySelector('.wday .dname').textContent`);
  assert.equal(first, 'lunedì', 'week starts on Monday');
  await page.click('[data-view=month]');
  assert.ok(await ev(`!!document.querySelector('#phaseSelect')`), 'plan select only in month view');
  await page.click('#nextBtn');
  const label = await page.text('#navLabel');
  await page.reload();
  assert.equal(await ev(`state.view`), 'month');
  assert.equal(await page.text('#navLabel'), label, 'same month restored');
  await page.click('#todayBtn');
  await page.click('[data-view=day]');
  assert.equal(await ev(`!!document.querySelector('#phaseSelect')`), false, 'no plan select in day view');
});

test('water tracker adds glasses and persists', async () => {
  await page.click('[data-water="1"]');
  await page.click('[data-water="1"]');
  assert.match(await page.text('.water .v'), /^0,5/);
  await page.click('[data-water-set="8"]');
  assert.match(await page.text('.water .v'), /^2/);
  await page.reload();
  assert.match(await page.text('.water .v'), /^2/);
  await page.click('[data-water="-1"]');
  assert.match(await page.text('.water .v'), /^1,75/);
});

test('shopping tab lists products and copies text', async () => {
  await page.click('[data-tab=shop]');
  await page.click('[data-view=week]');
  assert.ok(await page.count('.shop-item') > 20);
  assert.equal(await page.count('.shop-item input'), 0, 'plain list, no checkboxes');
  assert.match(await page.text('.shop-head .grow'), /settimana \(lun–dom\)/);
  await page.click('[data-view=day]');
  const dayCount = await page.count('.shop-item');
  await page.click('[data-view=month]');
  assert.ok(await page.count('.shop-item') >= dayCount);
});

test('weight entry, check-in hides until next month', async () => {
  await page.click('[data-tab=weight]');
  assert.ok(await ev(`!!document.querySelector('#ckForm')`), 'check-in form shown when due');
  await ev(`document.querySelector('#wKg').value = '97.4'; document.querySelector('#wForm').requestSubmit()`);
  assert.match(await page.text('.stat .v'), /97,4/);
  await ev(`document.querySelector('#ckKg').value = '97.2'; document.querySelector('#ckWaist').value = '108'; document.querySelector('#ckForm').requestSubmit()`);
  await page.waitFor(`!document.querySelector('#ckForm')`);
  assert.match(await page.text('.stat .v'), /97,2/, 'check-in weight becomes latest weight');
  await page.reload();
  assert.equal(await ev(`!!document.querySelector('#ckForm')`), false, 'stays closed after reload');
  await page.click('[data-tab=plan]');
  assert.equal(await page.count('.checkin'), 0, 'no check-in reminder in plan once done');
});

test('charts render', async () => {
  await page.click('[data-tab=weight]');
  for (const id of ['chWeight', 'chBmi', 'chBody', 'chWater']) {
    assert.ok(await ev(`!!document.querySelector('#${id} svg')`), id);
  }
  assert.ok(await page.count('#chBody .bar.fat') >= 9, 'body composition bars');
  assert.ok(await page.count('#chBmi .band') >= 2, 'BMI bands');
});

test('achievements and rules pages', async () => {
  await page.click('[data-tab=goals]');
  assert.ok(await page.count('.goal') >= 14);
  assert.ok(await page.count('.goal.ok') >= 2, 'first weigh-in + check-in unlocked');
  await page.click('[data-tab=rules]');
  assert.ok(await page.count('.rule-card') >= 10);
  assert.equal(await page.count('.swatch'), 4);
  await page.click('[data-color=rosso]');
  assert.equal(await ev(`getComputedStyle(document.documentElement).getPropertyValue('--primary').trim()`), '#A4372C');
  await page.click('[data-theme-set=dark]');
  assert.equal(await ev(`document.documentElement.dataset.theme`), 'dark');
  await page.click('[data-notif-toggle=water]');
  assert.equal(await ev(`state.notif.water`), false);
  await page.click('[data-notif-toggle=water]');
});

test('notification deep links', async () => {
  const before = await ev(`water[keyOf(today())] || 0`);
  await page.goto(srv.base + '?water=1');
  assert.equal(await ev(`water[keyOf(today())]`), before + 1, '+1 glass from notification');
  assert.equal(await ev(`location.search`), '', 'query cleaned');
  await page.goto(srv.base + '?tab=weight');
  assert.equal(await ev(`state.tab`), 'weight');
});

test('works offline after first visit', async () => {
  await page.waitFor(`navigator.serviceWorker.controller || navigator.serviceWorker.ready`, 8000);
  await ev(`navigator.serviceWorker.ready.then(() => true)`);
  await page.reload(); // ensure the page is controlled
  await page.offline(true);
  await page.reload();
  assert.ok(await page.count('#main > *') > 0, 'renders offline');
  await page.offline(false);
});

test('no runtime errors', () => {
  assert.deepEqual(page.errors, []);
});
