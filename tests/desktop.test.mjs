// Desktop layout tests (1400px wide) + mobile counterpart for the same features.
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { startServer, launch } from './harness.mjs';

let srv, desk, phone;

before(async () => {
  srv = await startServer();
  desk = await launch({ width: 1400, height: 900 });
  phone = await launch();
  await desk.goto(srv.base);
  await phone.goto(srv.base);
});
after(async () => { await desk?.close(); await phone?.close(); srv?.server.close(); });

const visibleExtras = p => p.eval(`[...document.querySelectorAll('.wday .extra')].filter(e => getComputedStyle(e).display !== 'none').length`);

test('week boxes show every meal on desktop, only main meals on phone', async () => {
  await desk.click('[data-view=week]');
  await phone.click('[data-view=week]');
  assert.ok(await visibleExtras(desk) > 7, 'snacks visible on desktop');
  assert.equal(await visibleExtras(phone), 0, 'snacks hidden on phone');
  const clamp = await desk.eval(`getComputedStyle(document.querySelector('.wday dd')).webkitLineClamp`);
  assert.ok(clamp === 'none' || clamp === 'unset' || clamp === '', 'text not clamped on desktop: ' + clamp);
  const cols = await desk.eval(`getComputedStyle(document.querySelector('.week-grid')).gridTemplateColumns.split(' ').length`);
  assert.ok(cols >= 3, 'multi-column week grid: ' + cols);
});

test('month view on desktop: big calendar beside the day meals', async () => {
  await desk.click('[data-view=month]');
  const r = await desk.eval(`(() => {
    const cal = document.querySelector('.cal-card').getBoundingClientRect();
    const day = document.querySelector('.month-layout > .card.filled').getBoundingClientRect();
    return { calW: cal.width, calRight: cal.right, dayLeft: day.left, sameRow: Math.abs(cal.top - day.top) < 5 };
  })()`);
  assert.ok(r.calW >= 460, 'calendar at least 460px wide: ' + r.calW);
  assert.ok(r.sameRow && r.dayLeft > r.calRight, 'day card to the right of the calendar');
  assert.ok(await desk.eval(`[...document.querySelectorAll('.month-layout .extra')].some(e => getComputedStyle(e).display !== 'none')`), 'all meals in the day card');
});

test('month view on phone stacks calendar and day card', async () => {
  await phone.click('[data-view=month]');
  const stacked = await phone.eval(`(() => {
    const cal = document.querySelector('.cal-card').getBoundingClientRect();
    const day = document.querySelector('.month-layout > .card.filled').getBoundingClientRect();
    return day.top >= cal.bottom;
  })()`);
  assert.equal(stacked, true);
  assert.equal(await phone.eval(`document.documentElement.scrollWidth <= innerWidth`), true, 'no horizontal scroll');
});

test('picking a day in the month updates the side card', async () => {
  await desk.eval(`document.querySelector('[data-pick]:not(.out):not(.sel)').click()`);
  const sel = await desk.eval(`document.querySelector('.cal button.sel').getAttribute('data-pick')`);
  assert.equal(sel, await desk.eval(`state.date`));
});

test('no runtime errors on desktop or phone', () => {
  assert.deepEqual(desk.errors, []);
  assert.deepEqual(phone.errors, []);
});
