'use strict';

const STATE_KEY = 'dieta.state';
const WEIGHTS_KEY = 'dieta.weights';
const SLOT_ORDER = ['sveglia', 'colazione', 'spuntino', 'pranzo', 'merenda', 'cena', 'sera'];
const DAY_NAMES = ['lunedì', 'martedì', 'mercoledì', 'giovedì', 'venerdì', 'sabato', 'domenica'];
const DAY_TAGS = { 1: ['Lavoro'], 3: ['Lavoro', 'Spesa'] }; // martedì, giovedì
const ICONS = {
  sveglia: '<path d="M12 2c-.6 0-1 .4-1 1 0 0-5 5.5-5 10a6 6 0 0 0 12 0c0-4.5-5-10-5-10 0-.6-.4-1-1-1m0 17a4 4 0 0 1-4-4h2a2 2 0 0 0 2 2z"/>',
  colazione: '<path d="M2 21h18v-2H2zM20 8h-2V5h2zm0-5H4v10a4 4 0 0 0 4 4h6a4 4 0 0 0 4-4v-3h2a2 2 0 0 0 2-2V5a2 2 0 0 0-2-2"/>',
  spuntino: '<path d="M18 7c-1.1 0-2.1.4-3 1V4h-2v4c-.9-.6-1.9-1-3-1-3.3 0-5 3-5 6 0 4 3 8 5.5 8 1 0 1.6-.5 2.5-.5s1.5.5 2.5.5C18 21 21 17 21 13c0-3-1.7-6-3-6"/>',
  pranzo: '<path d="M11 9H9V2H7v7H5V2H3v7c0 2.1 1.7 3.8 3.8 4v9h2.5v-9C11.3 12.8 13 11.1 13 9V2h-2zm5-3v8h2.5v8H21V2c-2.8 0-5 2.2-5 4"/>',
  merenda: '<path d="M18 7c-1.1 0-2.1.4-3 1V4h-2v4c-.9-.6-1.9-1-3-1-3.3 0-5 3-5 6 0 4 3 8 5.5 8 1 0 1.6-.5 2.5-.5s1.5.5 2.5.5C18 21 21 17 21 13c0-3-1.7-6-3-6"/>',
  cena: '<path d="M12 3a9 9 0 1 0 9 9c0-.5 0-.9-.1-1.4A5.4 5.4 0 0 1 12.2 4c0-.4 0-.7.1-1z"/>',
  sera: '<path d="M4 19h16v2H4zM20 3H4v10a4 4 0 0 0 4 4h6a4 4 0 0 0 4-4v-3h2a2 2 0 0 0 2-2V5a2 2 0 0 0-2-2m0 5h-2V5h2z"/>',
  veloce: '<path d="M7 2v11h3v9l7-12h-4l4-8z"/>',
};

const $ = (s, el = document) => el.querySelector(s);
const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

// ---------- dates (always local, never toISOString) ----------
const pad = n => String(n).padStart(2, '0');
const keyOf = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const parseKey = k => { const [y, m, d] = k.split('-').map(Number); return new Date(y, m - 1, d); };
const today = () => { const n = new Date(); return new Date(n.getFullYear(), n.getMonth(), n.getDate()); };
const addDays = (d, n) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);
const dow = d => (d.getDay() + 6) % 7; // lunedì = 0
const weekStart = d => addDays(d, -dow(d));
const sameDay = (a, b) => keyOf(a) === keyOf(b);
const fmt = (d, o) => d.toLocaleDateString('it-IT', o);

// ---------- storage (best effort) ----------
function load(key, fallback) {
  try { const v = localStorage.getItem(key); return v ? JSON.parse(v) : fallback; } catch { return fallback; }
}
function save(key, val) { try { localStorage.setItem(key, JSON.stringify(val)); } catch { /* private mode */ } }

let DATA;
const state = Object.assign(
  { tab: 'plan', view: 'day', date: keyOf(today()), phase: 'auto', range: 'all', theme: 'auto' },
  load(STATE_KEY, {})
);
let userWeights = load(WEIGHTS_KEY, []);
const persist = () => save(STATE_KEY, state);

function applyTheme() {
  if (state.theme === 'auto') document.documentElement.removeAttribute('data-theme');
  else document.documentElement.setAttribute('data-theme', state.theme);
}

// ---------- plan helpers ----------
function phaseFor(date) {
  const id = state.phase !== 'auto' ? state.phase : DATA.monthMap[date.getMonth() + 1];
  return DATA.phases.find(p => p.id === id) || DATA.phases[0];
}
function highlightQty(text) {
  return esc(text).replace(
    /(\d+(?:[,.]\d+)?(?:\s*(?:[–-]|o)\s*\d+(?:[,.]\d+)?)?\s*(?:g|gr|ml|Kcal|kcal|%|l)\b)/g,
    '<mark class="q">$1</mark>'
  );
}
function currentSlot(meals) {
  const n = new Date(), h = n.getHours() + n.getMinutes() / 60;
  const slot = h < 7.5 ? 'sveglia' : h < 10 ? 'colazione' : h < 12 ? 'spuntino' : h < 15 ? 'pranzo'
    : h < 18.5 ? 'merenda' : h < 21.5 ? 'cena' : 'sera';
  if (meals[slot]) return slot;
  const idx = SLOT_ORDER.indexOf(slot);
  return SLOT_ORDER.slice(idx).find(s => meals[s]) || null;
}
const icon = slot => `<svg viewBox="0 0 24 24" aria-hidden="true">${ICONS[slot]}</svg>`;

// ---------- rendering ----------
const main = $('#main');

function render() {
  applyTheme();
  document.querySelectorAll('.navbar button').forEach(b => {
    if (b.dataset.tab === state.tab) b.setAttribute('aria-current', 'page'); else b.removeAttribute('aria-current');
  });
  $('#planControls').hidden = state.tab !== 'plan';
  $('.phase-chip').hidden = state.tab === 'weight';
  const titles = { plan: 'La mia dieta', weight: 'Peso', rules: 'Regole e consigli' };
  $('#title').textContent = titles[state.tab];
  renderPhaseSelect();
  if (state.tab === 'plan') renderPlan();
  else if (state.tab === 'weight') renderWeight();
  else renderRules();
  persist();
}

function renderPhaseSelect() {
  const sel = $('#phaseSelect');
  const date = parseKey(state.date);
  const auto = DATA.phases.find(p => p.id === DATA.monthMap[date.getMonth() + 1]);
  sel.innerHTML = `<option value="auto">Auto · ${esc(auto.label)}</option>` +
    DATA.phases.map(p => `<option value="${p.id}">${esc(p.label)}</option>`).join('');
  sel.value = state.phase;
}

function renderPlan() {
  const date = parseKey(state.date);
  document.querySelectorAll('.segmented button').forEach(b =>
    b.setAttribute('aria-selected', String(b.dataset.view === state.view)));
  const t = today();
  const todayBtn = $('#todayBtn');
  let label;
  if (state.view === 'day') {
    label = fmt(date, { weekday: 'short', day: 'numeric', month: 'short' });
    todayBtn.disabled = sameDay(date, t);
    main.innerHTML = dayView(date);
  } else if (state.view === 'week') {
    const s = weekStart(date), e = addDays(s, 6);
    label = s.getMonth() === e.getMonth()
      ? `${s.getDate()}–${e.getDate()} ${fmt(e, { month: 'short' })}`
      : `${fmt(s, { day: 'numeric', month: 'short' })} – ${fmt(e, { day: 'numeric', month: 'short' })}`;
    todayBtn.disabled = sameDay(s, weekStart(t));
    main.innerHTML = weekView(s);
  } else {
    label = fmt(date, { month: 'long', year: 'numeric' });
    todayBtn.disabled = date.getMonth() === t.getMonth() && date.getFullYear() === t.getFullYear();
    main.innerHTML = monthView(date);
  }
  $('#navLabel').textContent = label;
}

function dayChips(date, phase) {
  const tags = (DAY_TAGS[dow(date)] || []).map(t => `<span class="chip tert">${t}</span>`).join('');
  return `<span class="chip accent">${esc(phase.label)}</span>${tags}`;
}

function dayView(date) {
  const phase = phaseFor(date);
  const meals = phase.days[dow(date)];
  const isToday = sameDay(date, today());
  const now = isToday ? currentSlot(meals) : null;
  const cards = SLOT_ORDER.filter(s => meals[s]).map(s => `
    <article class="meal${s === now ? ' now' : ''}">
      <div class="ico">${icon(s)}</div>
      <div><h3>${DATA.slots[s]}${s === now ? '<span class="badge">adesso</span>' : ''}</h3>
      <p>${highlightQty(meals[s])}</p></div>
    </article>`).join('');
  const alt = meals.veloce ? `
    <div class="section-title">In alternativa</div>
    <article class="meal alt"><div class="ico">${icon('veloce')}</div>
      <div><h3>${DATA.slots.veloce}</h3><p>${highlightQty(meals.veloce)}</p></div></article>` : '';
  return `
    <div class="day-head"><h2>${isToday ? 'Oggi' : fmt(date, { weekday: 'long' })}</h2>
      <span class="muted">${fmt(date, { day: 'numeric', month: 'long', year: 'numeric' })}</span></div>
    <div class="day-head" style="margin-top:-4px">${dayChips(date, phase)}</div>
    ${cards}${alt}
    <p class="muted" style="margin:16px 4px">Olio (1–2 cucchiai) a crudo · pesi a crudo · circa 2 L di acqua al giorno.</p>`;
}

function weekView(start) {
  const t = today();
  const days = [...Array(7)].map((_, i) => addDays(start, i));
  return `<div class="week-grid">${days.map(d => {
    const phase = phaseFor(d);
    const m = phase.days[dow(d)];
    const rows = ['colazione', 'pranzo', 'cena'].filter(s => m[s])
      .map(s => `<dt>${DATA.slots[s]}</dt><dd>${esc(m[s])}</dd>`).join('');
    const tags = (DAY_TAGS[dow(d)] || []).map(x => `<span class="chip tert">${x}</span>`).join(' ');
    return `<button class="card wday${sameDay(d, t) ? ' today' : ''}" data-open="${keyOf(d)}">
      <div class="wtop"><span class="dnum">${d.getDate()}</span><span class="dname">${fmt(d, { weekday: 'long' })}</span>${tags}</div>
      <dl>${rows}</dl></button>`;
  }).join('')}</div>
  <p class="muted" style="margin:4px">Tocca un giorno per vedere tutti i pasti. Pranzi e cene si possono invertire.</p>`;
}

function monthView(date) {
  const t = today();
  const first = new Date(date.getFullYear(), date.getMonth(), 1);
  const start = weekStart(first);
  const weighed = new Set(allWeights().map(w => w.d));
  const cells = [...Array(42)].map((_, i) => {
    const d = addDays(start, i);
    const cls = [d.getMonth() !== date.getMonth() && 'out', sameDay(d, t) && 'today', sameDay(d, date) && 'sel'].filter(Boolean).join(' ');
    return `<button class="${cls}" data-pick="${keyOf(d)}" aria-label="${fmt(d, { weekday: 'long', day: 'numeric', month: 'long' })}">${d.getDate()}${weighed.has(keyOf(d)) ? '<span class="dot"></span>' : ''}</button>`;
  });
  // trim the trailing row if entirely in the next month
  const used = addDays(start, 35).getMonth() !== date.getMonth() ? 5 : 6;
  const phase = phaseFor(date);
  const m = phase.days[dow(date)];
  return `
    <div class="card">
      <div class="cal">${['L', 'M', 'M', 'G', 'V', 'S', 'D'].map(x => `<div class="wh">${x}</div>`).join('')}${cells.slice(0, used * 7).join('')}</div>
      <div class="legend"><span><i></i>peso registrato</span><span>Piano del mese: <b>${esc(phaseFor(first).label)}</b></span></div>
    </div>
    <div class="card filled">
      <div class="day-head" style="margin:0 0 8px"><h2 style="font-size:20px">${fmt(date, { weekday: 'long', day: 'numeric' })}</h2>${(DAY_TAGS[dow(date)] || []).map(x => `<span class="chip tert">${x}</span>`).join('')}</div>
      <div class="wday" style="cursor:default"><dl>${['colazione', 'pranzo', 'cena'].filter(s => m[s]).map(s => `<dt>${DATA.slots[s]}</dt><dd>${esc(m[s])}</dd>`).join('')}</dl></div>
      <div class="form-actions"><button class="filled-btn" data-open="${keyOf(date)}">Apri giorno</button></div>
    </div>`;
}

// ---------- weight ----------
function allWeights() {
  const hist = DATA.weights.map(([d, kg]) => ({ d, kg, src: 'storico' }));
  const mine = userWeights.map(w => ({ ...w, src: 'mio' }));
  return [...hist, ...mine].sort((a, b) => a.d.localeCompare(b.d));
}
const fmtKg = n => n.toLocaleString('it-IT', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
const shortDate = k => fmt(parseKey(k), { day: 'numeric', month: 'short', year: 'numeric' });

function renderWeight() {
  const all = allWeights();
  const last = all[all.length - 1];
  const bmi = last.kg / Math.pow(DATA.height / 100, 2);
  const restart = userWeights.length ? allWeights().find(w => w.src === 'mio') : null;
  const delta = restart && last !== restart ? last.kg - restart.kg : null;
  const min = all.reduce((a, b) => (b.kg < a.kg ? b : a));
  const ranges = [['all', 'Tutto'], ['hist', '2023–24'], ['mine', 'Ripartenza']];
  main.innerHTML = `
    <div class="stats">
      <div class="stat"><div class="k">Ultimo</div><div class="v">${fmtKg(last.kg)}</div><div class="s">${shortDate(last.d)}</div></div>
      <div class="stat"><div class="k">BMI</div><div class="v">${bmi.toFixed(1).replace('.', ',')}</div><div class="s">altezza ${DATA.height} cm</div></div>
      <div class="stat"><div class="k">${delta !== null ? 'Dalla ripartenza' : 'Minimo'}</div>
        <div class="v">${delta !== null ? (delta > 0 ? '+' : '') + fmtKg(delta) : fmtKg(min.kg)}</div>
        <div class="s">${delta !== null ? 'dal ' + shortDate(restart.d) : shortDate(min.d)}</div></div>
    </div>
    <div class="card">
      <div class="filters">${ranges.map(([k, l]) => `<button class="fchip" data-range="${k}" aria-pressed="${state.range === k}">${l}</button>`).join('')}</div>
      <div class="chart-wrap" id="chartWrap"></div>
      <div class="legend"><span><i style="background:var(--primary)"></i>storico dietista</span><span><i></i>tuoi inserimenti</span></div>
    </div>
    <div class="card">
      <div class="section-title" style="margin-top:0">Nuova pesata</div>
      <form id="wForm">
        <div class="form-row">
          <div class="field"><label for="wDate">Data</label><input id="wDate" type="date" required value="${keyOf(today())}" max="${keyOf(today())}"></div>
          <div class="field"><label for="wKg">Peso (kg)</label><input id="wKg" type="number" inputmode="decimal" step="0.1" min="30" max="250" required placeholder="${fmtKg(last.kg)}"></div>
        </div>
        <div class="form-actions"><button class="filled-btn" type="submit">Salva</button></div>
      </form>
    </div>
    <div class="section-title">Storico</div>
    <div class="card"><ul class="wlist">${all.slice().reverse().map((w, i, arr) => {
      const prev = arr[i + 1];
      const dd = prev ? w.kg - prev.kg : null;
      return `<li><div class="d">${shortDate(w.d)}<small>${w.src === 'mio' ? 'inserito da te' : 'visita dietista'}</small></div>
        <span class="delta">${dd === null ? '' : (dd > 0 ? '+' : '') + fmtKg(dd)}</span>
        <span class="kg">${fmtKg(w.kg)} kg</span>
        ${w.src === 'mio' ? `<button class="icon-btn" data-del="${w.d}" aria-label="Elimina ${shortDate(w.d)}"><svg viewBox="0 0 24 24"><path d="M6 19a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2V7H6zM19 4h-3.5l-1-1h-5l-1 1H5v2h14z"/></svg></button>` : '<span style="width:40px"></span>'}</li>`;
    }).join('')}</ul></div>
    <p class="muted" style="margin:8px 4px">I tuoi pesi restano salvati solo su questo dispositivo. Usa il backup per spostarli.</p>
    <div class="form-actions" style="justify-content:flex-start">
      <button class="outlined-btn" id="exportBtn">Esporta backup</button>
      <label class="outlined-btn" style="display:inline-flex;align-items:center">Importa<input id="importIn" type="file" accept="application/json" hidden></label>
    </div>`;
  drawChart();
}

function drawChart() {
  const wrap = $('#chartWrap');
  if (!wrap) return;
  let pts = allWeights();
  if (state.range === 'hist') pts = pts.filter(p => p.src === 'storico' && p.d >= '2023-01-01');
  if (state.range === 'mine') pts = pts.filter(p => p.src === 'mio');
  if (pts.length < 2) {
    wrap.innerHTML = `<p class="muted" style="padding:32px 8px;text-align:center">${state.range === 'mine'
      ? 'Aggiungi almeno due pesate per vedere l’andamento della ripartenza.' : 'Dati insufficienti.'}</p>`;
    return;
  }
  const W = Math.max(280, wrap.clientWidth), H = window.innerWidth >= 720 ? 300 : 240;
  const m = { t: 16, r: 12, b: 28, l: 36 };
  const tx = pts.map(p => parseKey(p.d).getTime());
  const x0 = tx[0], x1 = tx[tx.length - 1];
  const kgs = pts.map(p => p.kg);
  let y0 = Math.floor(Math.min(...kgs) - 1), y1 = Math.ceil(Math.max(...kgs) + 1);
  const step = (y1 - y0) > 12 ? 4 : 2;
  y0 = Math.floor(y0 / step) * step; y1 = Math.ceil(y1 / step) * step;
  const X = t => m.l + (t - x0) / (x1 - x0 || 1) * (W - m.l - m.r);
  const Y = v => m.t + (y1 - v) / (y1 - y0) * (H - m.t - m.b);
  let grid = '';
  for (let v = y0; v <= y1; v += step) {
    grid += `<line class="grid" x1="${m.l}" x2="${W - m.r}" y1="${Y(v)}" y2="${Y(v)}"/><text class="axis" x="${m.l - 6}" y="${Y(v) + 4}" text-anchor="end">${v}</text>`;
  }
  // x ticks: years if span > 18 months else months
  const span = (x1 - x0) / 864e5;
  const d0 = new Date(x0), d1 = new Date(x1);
  let xt = '';
  if (span > 540) {
    for (let y = d0.getFullYear() + 1; y <= d1.getFullYear(); y++) {
      const t = new Date(y, 0, 1).getTime();
      xt += `<text class="axis" x="${X(t)}" y="${H - 8}" text-anchor="middle">${y}</text>`;
    }
  } else {
    const every = span > 200 ? 2 : 1;
    for (let d = new Date(d0.getFullYear(), d0.getMonth() + 1, 1), i = 0; d.getTime() <= x1; d = new Date(d.getFullYear(), d.getMonth() + 1, 1), i++) {
      if (i % every) continue;
      xt += `<text class="axis" x="${X(d.getTime())}" y="${H - 8}" text-anchor="middle">${fmt(d, { month: 'short' })}</text>`;
    }
  }
  // lines: break at gaps > 200 days, bridge with a dotted segment
  const segs = [[0]];
  for (let i = 1; i < pts.length; i++) {
    if ((tx[i] - tx[i - 1]) / 864e5 > 200) segs.push([i]); else segs[segs.length - 1].push(i);
  }
  const path = idx => idx.map((i, k) => `${k ? 'L' : 'M'}${X(tx[i]).toFixed(1)},${Y(kgs[i]).toFixed(1)}`).join('');
  let lines = segs.map(s => `<path class="line" d="${path(s)}"/>`).join('');
  for (let s = 1; s < segs.length; s++) {
    const a = segs[s - 1][segs[s - 1].length - 1], b = segs[s][0];
    lines += `<path class="gap" d="M${X(tx[a])},${Y(kgs[a])}L${X(tx[b])},${Y(kgs[b])}"/>`;
  }
  const dots = pts.map((p, i) => `<circle class="pt${p.src === 'mio' ? ' user' : ''}" cx="${X(tx[i])}" cy="${Y(p.kg)}" r="4"/>`).join('');
  wrap.innerHTML = `<svg class="chart" viewBox="0 0 ${W} ${H}" role="img" aria-label="Andamento del peso: da ${fmtKg(kgs[0])} a ${fmtKg(kgs[kgs.length - 1])} kg">
    ${grid}${xt}${lines}${dots}
    <line class="cross" id="cross" y1="${m.t}" y2="${H - m.b}" visibility="hidden"/>
    <circle class="hl" id="hl" r="6" visibility="hidden"/>
    <rect x="0" y="0" width="${W}" height="${H}" fill="transparent" id="hit"/></svg><div class="tip" id="tip"></div>`;
  const svg = $('svg', wrap), tip = $('#tip'), cross = $('#cross'), hl = $('#hl');
  const move = ev => {
    const r = svg.getBoundingClientRect();
    const px = (ev.clientX - r.left) * (W / r.width);
    let best = 0;
    tx.forEach((t, i) => { if (Math.abs(X(t) - px) < Math.abs(X(tx[best]) - px)) best = i; });
    const cx = X(tx[best]), cy = Y(kgs[best]);
    cross.setAttribute('x1', cx); cross.setAttribute('x2', cx); cross.setAttribute('visibility', 'visible');
    hl.setAttribute('cx', cx); hl.setAttribute('cy', cy); hl.setAttribute('visibility', 'visible');
    tip.innerHTML = `<b>${fmtKg(kgs[best])} kg</b><br>${shortDate(pts[best].d)}`;
    const left = Math.min(Math.max(cx * r.width / W, 50), r.width - 50);
    tip.style.left = left + 'px'; tip.style.top = (cy * r.height / H - 10) + 'px'; tip.style.opacity = 1;
  };
  const leave = () => { tip.style.opacity = 0; cross.setAttribute('visibility', 'hidden'); hl.setAttribute('visibility', 'hidden'); };
  svg.addEventListener('pointermove', move);
  svg.addEventListener('pointerdown', move);
  svg.addEventListener('pointerleave', leave);
}

// ---------- rules ----------
function renderRules() {
  const phase = phaseFor(parseKey(state.date));
  const r = DATA.rules[phase.rules];
  const themes = [['auto', 'Automatico'], ['light', 'Chiaro'], ['dark', 'Scuro']];
  main.innerHTML = `
    <details class="rule" open><summary>${esc(r.title)}</summary><div class="body"><dl class="kv">
      ${r.items.map(([k, v]) => `<dt>${esc(k)}</dt><dd>${highlightQty(v)}</dd>`).join('')}</dl></div></details>
    ${DATA.extras.map(x => `<details class="rule"><summary>${esc(x.title)}</summary><div class="body"><ul class="bul">
      ${x.items.map(i => `<li>${highlightQty(i)}</li>`).join('')}</ul></div></details>`).join('')}
    <div class="section-title">Tema</div>
    <div class="theme-row">${themes.map(([k, l]) => `<button class="fchip" data-theme-set="${k}" aria-pressed="${state.theme === k}">${l}</button>`).join('')}</div>
    <p class="muted" style="margin:20px 4px">Il piano segue il mese corrente (Auto). Puoi fissarne uno dal menu in alto.</p>`;
}

// ---------- events ----------
function snack(msg) {
  const s = $('#snackbar');
  s.textContent = msg; s.classList.add('show');
  clearTimeout(snack.t); snack.t = setTimeout(() => s.classList.remove('show'), 2600);
}

function shift(dir) {
  const d = parseKey(state.date);
  let n;
  if (state.view === 'day') n = addDays(d, dir);
  else if (state.view === 'week') n = addDays(d, 7 * dir);
  else {
    const last = new Date(d.getFullYear(), d.getMonth() + dir + 1, 0).getDate();
    n = new Date(d.getFullYear(), d.getMonth() + dir, Math.min(d.getDate(), last));
  }
  state.date = keyOf(n);
  render();
}

function bind() {
  $('#prevBtn').onclick = () => shift(-1);
  $('#nextBtn').onclick = () => shift(1);
  $('#todayBtn').onclick = () => { state.date = keyOf(today()); render(); };
  document.querySelectorAll('.segmented button').forEach(b => b.onclick = () => { state.view = b.dataset.view; render(); });
  document.querySelectorAll('.navbar button').forEach(b => b.onclick = () => { state.tab = b.dataset.tab; render(); scrollTo(0, 0); });
  $('#phaseSelect').onchange = e => {
    state.phase = e.target.value; render();
    snack(state.phase === 'auto' ? 'Il piano segue il mese corrente' : 'Piano fissato: ' + phaseFor(parseKey(state.date)).label);
  };

  main.addEventListener('click', e => {
    const open = e.target.closest('[data-open]');
    if (open) { state.date = open.dataset.open; state.view = 'day'; render(); scrollTo(0, 0); return; }
    const pick = e.target.closest('[data-pick]');
    if (pick) { state.date = pick.dataset.pick; render(); return; }
    const rg = e.target.closest('[data-range]');
    if (rg) { state.range = rg.dataset.range; persist(); renderWeight(); return; }
    const th = e.target.closest('[data-theme-set]');
    if (th) { state.theme = th.dataset.themeSet; render(); return; }
    const del = e.target.closest('[data-del]');
    if (del) {
      const removed = userWeights.find(w => w.d === del.dataset.del);
      userWeights = userWeights.filter(w => w !== removed);
      save(WEIGHTS_KEY, userWeights); renderWeight();
      snack('Pesata eliminata');
      return;
    }
    if (e.target.id === 'exportBtn') {
      const blob = new Blob([JSON.stringify({ weights: userWeights }, null, 1)], { type: 'application/json' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob); a.download = `pesi-${keyOf(today())}.json`; a.click();
      setTimeout(() => URL.revokeObjectURL(a.href), 1000);
    }
  });
  main.addEventListener('submit', e => {
    if (e.target.id !== 'wForm') return;
    e.preventDefault();
    const d = $('#wDate').value, kg = parseFloat(String($('#wKg').value).replace(',', '.'));
    if (!d || !(kg > 30 && kg < 250)) return snack('Controlla data e peso');
    userWeights = userWeights.filter(w => w.d !== d).concat({ d, kg: Math.round(kg * 10) / 10 });
    userWeights.sort((a, b) => a.d.localeCompare(b.d));
    save(WEIGHTS_KEY, userWeights);
    if (state.range === 'hist') state.range = 'all';
    renderWeight(); snack(`Salvato ${fmtKg(kg)} kg`);
  });
  main.addEventListener('change', async e => {
    if (e.target.id !== 'importIn' || !e.target.files[0]) return;
    try {
      const obj = JSON.parse(await e.target.files[0].text());
      const list = (obj.weights || []).filter(w => /^\d{4}-\d{2}-\d{2}$/.test(w.d) && typeof w.kg === 'number');
      const map = new Map(userWeights.map(w => [w.d, w]));
      list.forEach(w => map.set(w.d, { d: w.d, kg: w.kg }));
      userWeights = [...map.values()].sort((a, b) => a.d.localeCompare(b.d));
      save(WEIGHTS_KEY, userWeights); renderWeight(); snack(`Importate ${list.length} pesate`);
    } catch { snack('File non valido'); }
  });

  // swipe left/right on the plan to move day/week/month
  let sx = null, sy = null;
  main.addEventListener('touchstart', e => { if (state.tab === 'plan') { sx = e.touches[0].clientX; sy = e.touches[0].clientY; } }, { passive: true });
  main.addEventListener('touchend', e => {
    if (sx === null) return;
    const dx = e.changedTouches[0].clientX - sx, dy = e.changedTouches[0].clientY - sy;
    sx = null;
    if (Math.abs(dx) > 70 && Math.abs(dx) > Math.abs(dy) * 1.5) shift(dx < 0 ? 1 : -1);
  }, { passive: true });

  let rt;
  addEventListener('resize', () => { clearTimeout(rt); rt = setTimeout(() => state.tab === 'weight' && drawChart(), 150); });
  // app reopened on a new day while "today" was shown: follow the calendar
  document.addEventListener('visibilitychange', () => { if (!document.hidden && state.tab === 'plan' && state.view === 'day') render(); });
}

async function init() {
  applyTheme();
  try {
    const res = await fetch('data/diet.json');
    DATA = await res.json();
  } catch {
    main.innerHTML = '<p class="muted" style="padding:32px">Impossibile caricare il piano. Riprova quando sei online.</p>';
    return;
  }
  if (!DATA.phases.some(p => p.id === state.phase)) state.phase = 'auto';
  bind();
  render();
  if ('serviceWorker' in navigator) navigator.serviceWorker.register('./sw.js').catch(() => {});
}

init();
