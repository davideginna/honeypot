'use strict';

const STATE_KEY = 'dieta.state';
const WEIGHTS_KEY = 'dieta.weights';
const WATER_KEY = 'dieta.water';
const SEEN_KEY = 'dieta.achievements';
const SHOP_KEY = 'dieta.shop';
const CATS = ['Frutta e verdura', 'Carne e pesce', 'Latticini e uova', 'Pane e cereali', 'Legumi', 'Frutta secca', 'Dispensa', 'Bevande', 'Pronti e snack'];
const SLOT_ORDER = ['sveglia', 'colazione', 'spuntino', 'pranzo', 'merenda', 'cena', 'sera'];
const REDUCED_SLOTS = ['pranzo', 'cena', 'veloce'];
const REDUCTION = 0.8; // pranzo e cena: -20%
const GLASS_ML = 250, WATER_GOAL = 8; // 8 bicchieri = 2 L
const DAY_NAMES = ['lunedì', 'martedì', 'mercoledì', 'giovedì', 'venerdì', 'sabato', 'domenica'];

const P = d => `<path d="${d}"/>`;
const ICONS = {
  sveglia: P('M12 2c-.6 0-1 .4-1 1 0 0-5 5.5-5 10a6 6 0 0 0 12 0c0-4.5-5-10-5-10 0-.6-.4-1-1-1m0 17a4 4 0 0 1-4-4h2a2 2 0 0 0 2 2z'),
  colazione: P('M2 21h18v-2H2zM20 8h-2V5h2zm0-5H4v10a4 4 0 0 0 4 4h6a4 4 0 0 0 4-4v-3h2a2 2 0 0 0 2-2V5a2 2 0 0 0-2-2'),
  spuntino: P('M18 7c-1.1 0-2.1.4-3 1V4h-2v4c-.9-.6-1.9-1-3-1-3.3 0-5 3-5 6 0 4 3 8 5.5 8 1 0 1.6-.5 2.5-.5s1.5.5 2.5.5C18 21 21 17 21 13c0-3-1.7-6-3-6'),
  pranzo: P('M11 9H9V2H7v7H5V2H3v7c0 2.1 1.7 3.8 3.8 4v9h2.5v-9C11.3 12.8 13 11.1 13 9V2h-2zm5-3v8h2.5v8H21V2c-2.8 0-5 2.2-5 4'),
  cena: P('M12 3a9 9 0 1 0 9 9c0-.5 0-.9-.1-1.4A5.4 5.4 0 0 1 12.2 4c0-.4 0-.7.1-1z'),
  sera: P('M4 19h16v2H4zM20 3H4v10a4 4 0 0 0 4 4h6a4 4 0 0 0 4-4v-3h2a2 2 0 0 0 2-2V5a2 2 0 0 0-2-2m0 5h-2V5h2z'),
  veloce: P('M7 2v11h3v9l7-12h-4l4-8z'),
  water: P('M12 2S5 9.5 5 14a7 7 0 0 0 14 0c0-4.5-7-12-7-12'),
  scale: P('M12 3a9 9 0 0 0-9 9v7a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7a9 9 0 0 0-9-9m0 2a7 7 0 0 1 6.9 6h-3.2L13 7.6 11.6 8.4 13.3 11H5.1A7 7 0 0 1 12 5'),
  oil: P('M10 2h4v3l2 3v12a2 2 0 0 1-2 2h-4a2 2 0 0 1-2-2V8l2-3z'),
  fire: P('M13.5.7s.7 2.6.7 4.8c0 2-1.3 3.7-3.4 3.7S7.3 7.5 7.3 5.5l.1-.4C5.3 7.6 4 10.9 4 14.5a8 8 0 0 0 16 0C20 8.1 16.9 2.4 13.5.7'),
  fish: P('M12 4C7 4 3 8 2 12c1 4 5 8 10 8 3 0 5.5-1.3 7.2-3L22 19v-14l-2.8 2C17.5 5.3 15 4 12 4m-4 7a1 1 0 1 1 0 2 1 1 0 0 1 0-2'),
  ham: P('M20 4c-2-2-6-1-9 2l-6 6c-2 2-2 5 0 7s5 2 7 0l6-6c3-3 4-7 2-9m-3 4a2 2 0 1 1-3-3 2 2 0 0 1 3 3'),
  leaf: P('M17 8C8 10 5.9 16.2 3.8 21.3l1.9.7 1-2.3c.5.2 1 .3 1.3.3C19 20 22 3 22 3c-1 2-8 2.3-13 3.3S2 11.5 2 13.5 3.8 17.3 3.8 17.3C7 8 17 8 17 8'),
  bean: P('M16 3c-3 0-4 2-6 3S4 7 3 11s2 10 8 10c7 0 10-7 10-12 0-3-2-6-5-6'),
  grain: P('M12 2 9 6l3 3 3-3zm-4 6-3 4 3 3 3-3zm8 0-3 3 3 3 3-3zm-4 5-3 3 3 3 3-3zm0 6h-1v3h2v-3z'),
  cheese: P('M2 19h20v-8L9 4 2 11zm6-6a1.5 1.5 0 1 1 0 3 1.5 1.5 0 0 1 0-3m7 2a1 1 0 1 1 0 2 1 1 0 0 1 0-2'),
  cup: P('M4 4h14v4h2a2 2 0 0 1 2 2v2a2 2 0 0 1-2 2h-2.3A6 6 0 0 1 12 18H10a6 6 0 0 1-6-6zm14 6v2h2v-2z M2 20h18v2H2z'),
  bolt: P('M7 2v11h3v9l7-12h-4l4-8z'),
  store: P('M4 4h16v2H4zm0 3h16l1 5v2h-1v6H4v-6H3v-2zm2 7v4h6v-4z'),
  moon: P('M12 3a9 9 0 1 0 9 9c0-.5 0-.9-.1-1.4A5.4 5.4 0 0 1 12.2 4c0-.4 0-.7.1-1z'),
  swap: P('M6.99 11 3 15l3.99 4v-3H14v-2H6.99zM21 9l-3.99-4v3H10v2h7.01v3z'),
  run: P('M13.5 5.5a2 2 0 1 0 0-4 2 2 0 0 0 0 4M9.8 8.9 7 23h2.1l1.8-8 2.1 2v6h2v-7.5l-2.1-2 .6-3A7.3 7.3 0 0 0 19 13v-2c-1.9 0-3.5-1-4.3-2.4l-1-1.6c-.4-.6-1-1-1.7-1-.3 0-.5.1-.8.1L6 8.3V13h2V9.6z'),
  trophy: P('M19 5h-2V3H7v2H5a2 2 0 0 0-2 2v1a5 5 0 0 0 4.4 5A5 5 0 0 0 11 15.9V19H7v2h10v-2h-4v-3.1a5 5 0 0 0 3.6-2.9A5 5 0 0 0 21 8V7a2 2 0 0 0-2-2M5 8V7h2v3.8A3 3 0 0 1 5 8m14 0a3 3 0 0 1-2 2.8V7h2z'),
  lock: P('M18 8h-1V6A5 5 0 0 0 7 6v2H6a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V10a2 2 0 0 0-2-2m-6 9a2 2 0 1 1 0-4 2 2 0 0 1 0 4m3.1-9H8.9V6a3.1 3.1 0 0 1 6.2 0z'),
  plus: P('M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6z'),
  minus: P('M19 13H5v-2h14z'),
};
ICONS.merenda = ICONS.spuntino;
const RULE_ICONS = {
  Condimenti: 'oil', Pesi: 'scale', Cotture: 'fire', 'Carne/Pesce': 'fish', Affettati: 'ham', Verdure: 'leaf',
  Legumi: 'bean', Cereali: 'grain', Formaggi: 'cheese', Yogurt: 'cup', 'Pasto veloce': 'bolt', 'Fuori casa': 'store',
  'Fame la sera': 'moon', Scambi: 'swap', Acqua: 'water', Pesata: 'scale',
};
const EXTRA_ICONS = ['leaf', 'spuntino', 'colazione', 'run'];

// Material 3 tonal schemes
const K = ['primary', 'on-primary', 'primary-container', 'on-primary-container', 'secondary-container', 'on-secondary-container',
  'tertiary', 'tertiary-container', 'on-tertiary-container', 'surface', 'surface-low', 'surface-cont', 'surface-high', 'surface-highest',
  'on-surface', 'on-surface-var', 'outline', 'outline-var'];
const S = s => Object.fromEntries(s.split(' ').map((v, i) => [K[i], v]));
const COLORS = {
  verde: { name: 'Verde', light: S('#386A20 #FFFFFF #B8F397 #042100 #D9E7CB #131F0D #38656A #BCEBF0 #002023 #F8FAF0 #F2F5EA #ECEFE4 #E6E9DE #E1E4D9 #1A1C18 #43483E #74796D #C3C8BB'),
    dark: S('#9DD67D #0C3900 #205107 #B8F397 #3C4B35 #D9E7CB #A0CFD4 #1F4D52 #BCEBF0 #11140F #1A1C18 #1E201B #282B25 #33362F #E2E3DC #C3C8BB #8D9286 #43483E') },
  celeste: { name: 'Celeste', light: S('#006493 #FFFFFF #CAE6FF #001E30 #D3E5F5 #0C1D29 #65587B #EBDCFF #201634 #F7F9FF #F1F4FA #EBEEF4 #E5E8EE #E0E3E8 #181C20 #41474D #72787E #C1C7CE'),
    dark: S('#8ECDFF #00344F #004B70 #CAE6FF #374955 #D3E5F5 #CFC0E8 #4D4162 #EBDCFF #101418 #181C20 #1C2024 #262A2F #31353A #E0E2E8 #C1C7CE #8B9198 #41474D') },
  rosa: { name: 'Rosa', light: S('#8B4A62 #FFFFFF #FFD9E3 #3A071F #FFD9E1 #2B151C #7C5635 #FFDCC1 #2E1500 #FFF8F8 #FAF2F3 #F4ECED #EEE6E7 #E9E0E1 #22191C #514347 #837377 #D5C2C6'),
    dark: S('#FFB0CB #541D34 #6F334A #FFD9E3 #5A3F47 #FFD9E1 #EFBD94 #613F20 #FFDCC1 #191113 #22191C #261D20 #31282A #3C3235 #EFDFE1 #D5C2C6 #9E8C90 #514347') },
  rosso: { name: 'Rosso', light: S('#A4372C #FFFFFF #FFDAD5 #410001 #FFDAD5 #2C1512 #705C2E #FCDFA6 #261A00 #FFF8F7 #FFF0EE #FCEAE7 #F6E4E1 #F1DEDB #231918 #534341 #857370 #D8C2BE'),
    dark: S('#FFB4A9 #690003 #862217 #FFDAD5 #5D3F3B #FFDAD5 #DFC38C #574419 #FCDFA6 #1A1110 #231918 #271D1C #322826 #3D3231 #F1DEDB #D8C2BE #A08C89 #534341') },
};

const $ = (s, el = document) => el.querySelector(s);
const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const icon = (k, cls = '') => `<svg viewBox="0 0 24 24" aria-hidden="true" class="${cls}">${ICONS[k]}</svg>`;

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

let DATA, ING = null;
const state = Object.assign(
  { tab: 'plan', view: 'day', date: keyOf(today()), phase: 'auto', range: 'all', theme: 'auto', color: 'verde', weighDay: 0 },
  load(STATE_KEY, {})
);
let userWeights = load(WEIGHTS_KEY, []);
let water = load(WATER_KEY, {});
let shopChecks = load(SHOP_KEY, {});
const persist = () => save(STATE_KEY, state);

// ---------- theme ----------
const darkMq = matchMedia('(prefers-color-scheme: dark)');
function applyTheme() {
  const dark = state.theme === 'dark' || (state.theme === 'auto' && darkMq.matches);
  const pal = (COLORS[state.color] || COLORS.verde)[dark ? 'dark' : 'light'];
  const root = document.documentElement;
  Object.entries(pal).forEach(([k, v]) => root.style.setProperty('--' + k, v));
  root.style.colorScheme = dark ? 'dark' : 'light';
  root.dataset.theme = dark ? 'dark' : 'light';
  document.querySelectorAll('meta[name=theme-color]').forEach(m => m.setAttribute('content', pal['surface-cont']));
}
darkMq.addEventListener('change', applyTheme);

// ---------- plan helpers ----------
function phaseFor(date) {
  const id = state.phase !== 'auto' ? state.phase : DATA.monthMap[date.getMonth() + 1];
  return DATA.phases.find(p => p.id === id) || DATA.phases[0];
}
const NO_REDUCE = /^\)?\s*(?:di\s+)?(?:verdur|fagiolin|asparag|carot|fungh|valerian|zucchin|finocch|spinac|passata|pomodor|cavol|friariell|lattug|rucol|cipoll|sedan|peperon|melanzan|limon|acet|spezi|zenzer|cannell|senap|mela|kiwi|foglie|erb|insalat|bieta)/i;
const QTY = /(\d+(?:[,.]\d+)?)(\s*(?:[–-]|o)\s*(\d+(?:[,.]\d+)?))?\s*(g|gr|ml|Kcal|kcal|%|l)\b/g;
const roundQ = v => (v >= 20 ? Math.round(v / 5) * 5 : Math.round(v));
// Bold every quantity; when reduce is set, scale grams/ml except vegetables & seasonings.
function formatQty(text, reduce) {
  const raw = String(text);
  return esc(raw).replace(QTY, (m, a, rng, b, unit, off, str) => {
    const after = str.slice(off + m.length, off + m.length + 30);
    const before = str.slice(Math.max(0, off - 8), off);
    if (!reduce || !/^(g|gr|ml)$/.test(unit) || NO_REDUCE.test(after) || /almeno\s*$/.test(before)) {
      return `<mark class="q">${m}</mark>`;
    }
    const num = s => parseFloat(s.replace(',', '.'));
    const na = roundQ(num(a) * REDUCTION);
    const out = b ? `${na}${rng.replace(b, String(roundQ(num(b) * REDUCTION)))} ${unit}` : `${na} ${unit}`;
    return `<mark class="q red" title="prima: ${m}">${out}</mark>`;
  });
}
function currentSlot(meals) {
  const n = new Date(), h = n.getHours() + n.getMinutes() / 60;
  const slot = h < 7.5 ? 'sveglia' : h < 10 ? 'colazione' : h < 12 ? 'spuntino' : h < 15 ? 'pranzo'
    : h < 18.5 ? 'merenda' : h < 21.5 ? 'cena' : 'sera';
  if (meals[slot]) return slot;
  return SLOT_ORDER.slice(SLOT_ORDER.indexOf(slot)).find(s => meals[s]) || null;
}
const mealText = (meals, s) => formatQty(meals[s], REDUCED_SLOTS.includes(s));

// ---------- weights / water / achievements ----------
function allWeights() {
  const hist = DATA.weights.map(([d, kg]) => ({ d, kg, src: 'storico' }));
  const mine = userWeights.map(w => ({ ...w, src: 'mio' }));
  return [...hist, ...mine].sort((a, b) => a.d.localeCompare(b.d));
}
const fmtKg = n => n.toLocaleString('it-IT', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
const shortDate = k => fmt(parseKey(k), { day: 'numeric', month: 'short', year: 'numeric' });
const liters = g => (g * GLASS_ML / 1000).toLocaleString('it-IT', { maximumFractionDigits: 2 });
function nextWeighDate(from = today()) {
  const diff = (state.weighDay - dow(from) + 7) % 7;
  return addDays(from, diff);
}
const weighedOn = k => userWeights.some(w => w.d === k);

function streak(test, from) {
  let n = 0;
  for (let d = from; test(d); d = addDays(d, -1)) n++;
  return n;
}
function computeAchievements() {
  const mine = userWeights;
  const start = mine[0], last = mine[mine.length - 1];
  const lost = start && last ? start.kg - last.kg : 0;
  const minMine = mine.length ? Math.min(...mine.map(w => w.kg)) : Infinity;
  const hmin = Math.min(...DATA.weights.map(w => w[1]));
  const bmi = kg => kg / Math.pow(DATA.height / 100, 2);
  const goal = k => (water[k] || 0) >= WATER_GOAL;
  let bestWater = 0;
  Object.keys(water).forEach(k => { if (goal(k)) bestWater = Math.max(bestWater, streak(d => goal(keyOf(d)), parseKey(k))); });
  // weekly weigh-ins in consecutive weeks
  const weeks = [...new Set(mine.map(w => keyOf(weekStart(parseKey(w.d)))))].sort();
  let bestWeeks = weeks.length ? 1 : 0, run = 1;
  for (let i = 1; i < weeks.length; i++) {
    run = (parseKey(weeks[i]) - parseKey(weeks[i - 1])) / 864e5 < 8 ? run + 1 : 1;
    bestWeeks = Math.max(bestWeeks, run);
  }
  const p = (v, max) => Math.max(0, Math.min(1, v / max));
  return [
    { id: 'first', t: 'Si riparte', d: 'Registra la prima pesata', ic: 'scale', ok: mine.length > 0, pr: p(mine.length, 1) },
    { id: 'l1', t: 'Primo chilo', d: '−1 kg dalla ripartenza', ic: 'trophy', ok: lost >= 1, pr: p(lost, 1), sub: `${fmtKg(Math.max(0, lost))} / 1 kg` },
    { id: 'l3', t: 'In marcia', d: '−3 kg dalla ripartenza', ic: 'trophy', ok: lost >= 3, pr: p(lost, 3), sub: `${fmtKg(Math.max(0, lost))} / 3 kg` },
    { id: 'l5', t: 'Cinque!', d: '−5 kg dalla ripartenza', ic: 'trophy', ok: lost >= 5, pr: p(lost, 5), sub: `${fmtKg(Math.max(0, lost))} / 5 kg` },
    { id: 'l10', t: 'Doppia cifra', d: '−10 kg dalla ripartenza', ic: 'trophy', ok: lost >= 10, pr: p(lost, 10), sub: `${fmtKg(Math.max(0, lost))} / 10 kg` },
    { id: 'u95', t: 'Sotto i 95', d: 'Pesata sotto 95 kg', ic: 'scale', ok: minMine < 95 },
    { id: 'u90', t: 'Sotto i 90', d: 'Pesata sotto 90 kg', ic: 'scale', ok: minMine < 90 },
    { id: 'rec', t: 'Record', d: `Sotto il tuo minimo storico (${fmtKg(hmin)} kg)`, ic: 'trophy', ok: minMine < hmin },
    { id: 'bmi', t: 'BMI sotto 30', d: 'Fuori dalla fascia obesità', ic: 'run', ok: bmi(minMine) < 30 },
    { id: 'w4', t: 'Costanza', d: 'Pesata 4 settimane di fila', ic: 'scale', ok: bestWeeks >= 4, pr: p(bestWeeks, 4), sub: `${bestWeeks} / 4 settimane` },
    { id: 'w12', t: 'Abitudine', d: 'Pesata 12 settimane di fila', ic: 'scale', ok: bestWeeks >= 12, pr: p(bestWeeks, 12), sub: `${bestWeeks} / 12 settimane` },
    { id: 'h1', t: 'Idratato', d: '2 L d\'acqua in un giorno', ic: 'water', ok: bestWater >= 1 },
    { id: 'h7', t: 'Settimana idratata', d: '2 L al giorno per 7 giorni', ic: 'water', ok: bestWater >= 7, pr: p(bestWater, 7), sub: `${bestWater} / 7 giorni` },
    { id: 'h30', t: 'Fonte inesauribile', d: '2 L al giorno per 30 giorni', ic: 'water', ok: bestWater >= 30, pr: p(bestWater, 30), sub: `${bestWater} / 30 giorni` },
  ];
}
function checkNewAchievements() {
  const seen = new Set(load(SEEN_KEY, []));
  const fresh = computeAchievements().filter(a => a.ok && !seen.has(a.id));
  if (!fresh.length) return;
  fresh.forEach(a => seen.add(a.id));
  save(SEEN_KEY, [...seen]);
  snack(`🏆 Traguardo: ${fresh.map(a => a.t).join(', ')}`);
}

// ---------- rendering ----------
const main = $('#main');

function render() {
  applyTheme();
  document.querySelectorAll('.navbar button').forEach(b => {
    if (b.dataset.tab === state.tab) b.setAttribute('aria-current', 'page'); else b.removeAttribute('aria-current');
  });
  $('#planControls').hidden = state.tab !== 'plan' && state.tab !== 'shop';
  const titles = { shop: 'Lista della spesa', plan: 'La mia dieta', weight: 'Peso', goals: 'Traguardi', rules: 'Regole' };
  $('#title').textContent = titles[state.tab];
  if (state.tab === 'plan' || state.tab === 'shop') renderPlan();
  else if (state.tab === 'weight') renderWeight();
  else if (state.tab === 'goals') renderGoals();
  else renderRules();
  persist();
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
    main.innerHTML = state.tab === 'shop' ? shopView([date], 'D' + state.date) : dayView(date);
  } else if (state.view === 'week') {
    const s = weekStart(date), e = addDays(s, 6);
    label = s.getMonth() === e.getMonth()
      ? `${s.getDate()}–${e.getDate()} ${fmt(e, { month: 'short' })}`
      : `${fmt(s, { day: 'numeric', month: 'short' })} – ${fmt(e, { day: 'numeric', month: 'short' })}`;
    todayBtn.disabled = sameDay(s, weekStart(t));
    main.innerHTML = state.tab === 'shop' ? shopView([...Array(7)].map((_, i) => addDays(s, i)), 'W' + keyOf(s)) : weekView(s);
  } else {
    label = fmt(date, { month: 'long', year: 'numeric' });
    todayBtn.disabled = date.getMonth() === t.getMonth() && date.getFullYear() === t.getFullYear();
    const n = new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
    main.innerHTML = state.tab === 'shop'
      ? shopView([...Array(n)].map((_, i) => new Date(date.getFullYear(), date.getMonth(), i + 1)), 'M' + state.date.slice(0, 7))
      : monthView(date);
  }
  $('#navLabel').textContent = label;
}

function waterCard(k) {
  const n = water[k] || 0;
  const glasses = [...Array(WATER_GOAL)].map((_, i) =>
    `<button class="glass${i < n ? ' full' : ''}" data-water-set="${i + 1}" aria-label="${i + 1} bicchieri">${icon('water')}</button>`).join('');
  return `
    <section class="card water">
      <div class="water-head">
        <div><div class="k">Acqua</div><div class="v">${liters(n)} <small>/ ${liters(WATER_GOAL)} L</small></div></div>
        <div class="water-btns">
          <button class="icon-btn tonal" data-water="-1" aria-label="Togli un bicchiere">${icon('minus')}</button>
          <button class="icon-btn filled" data-water="1" aria-label="Aggiungi un bicchiere">${icon('plus')}</button>
        </div>
      </div>
      <div class="progress"><span style="width:${Math.min(100, n / WATER_GOAL * 100)}%"></span></div>
      <div class="glasses">${glasses}</div>
      <div class="muted small">1 bicchiere = ${GLASS_ML} ml${n >= WATER_GOAL ? ' · obiettivo raggiunto 🎉' : ''}</div>
    </section>`;
}

function weighCard(date) {
  if (dow(date) !== state.weighDay) return '';
  const k = keyOf(date);
  const done = weighedOn(k);
  return `
    <section class="card weigh${done ? ' done' : ''}">
      <div class="ico">${icon('scale')}</div>
      <div class="grow"><div class="k">Giorno di pesata</div>
        <div>${done ? `Fatto: ${fmtKg(userWeights.find(w => w.d === k).kg)} kg` : 'Al mattino, a digiuno, dopo il bagno'}</div></div>
      ${done ? '' : `<button class="filled-btn" data-go-weigh="${k}">Pesati</button>`}
    </section>`;
}

function dayView(date) {
  const phase = phaseFor(date);
  const meals = phase.days[dow(date)];
  const isToday = sameDay(date, today());
  const now = isToday ? currentSlot(meals) : null;
  const k = keyOf(date);
  const cards = SLOT_ORDER.filter(s => meals[s]).map(s => `
    <article class="meal${s === now ? ' now' : ''}">
      <div class="ico">${icon(s)}</div>
      <div><h3>${DATA.slots[s]}${s === now ? '<span class="badge">adesso</span>' : ''}</h3>
      <p>${mealText(meals, s)}</p></div>
    </article>`).join('');
  const alt = meals.veloce ? `
    <div class="section-title">In alternativa</div>
    <article class="meal alt"><div class="ico">${icon('veloce')}</div>
      <div><h3>${DATA.slots.veloce}</h3><p>${mealText(meals, 'veloce')}</p></div></article>` : '';
  return `
    <div class="day-head"><h2>${isToday ? 'Oggi' : fmt(date, { weekday: 'long' })}</h2>
      <span class="muted">${fmt(date, { day: 'numeric', month: 'long', year: 'numeric' })}</span></div>
    ${weighCard(date)}
    ${cards}${alt}
    ${waterCard(k)}
    <p class="muted small" style="margin:12px 4px">Pranzo e cena: grammi ridotti del 20% (verdure escluse) · olio a crudo · pesi a crudo.</p>`;
}

function weekView(start) {
  const t = today();
  const days = [...Array(7)].map((_, i) => addDays(start, i));
  return `<div class="week-grid">${days.map(d => {
    const m = phaseFor(d).days[dow(d)];
    const rows = ['colazione', 'pranzo', 'cena'].filter(s => m[s])
      .map(s => `<dt>${DATA.slots[s]}</dt><dd>${mealText(m, s)}</dd>`).join('');
    const k = keyOf(d), wn = water[k] || 0;
    const extra = [
      dow(d) === state.weighDay ? `<span class="mini">${icon('scale')}${weighedOn(k) ? 'pesato' : 'pesata'}</span>` : '',
      wn ? `<span class="mini">${icon('water')}${liters(wn)} L</span>` : '',
    ].join('');
    return `<button class="card wday${sameDay(d, t) ? ' today' : ''}" data-open="${k}">
      <div class="wtop"><span class="dnum">${d.getDate()}</span><span class="dname">${fmt(d, { weekday: 'long' })}</span>${extra}</div>
      <dl>${rows}</dl></button>`;
  }).join('')}</div>
  <p class="muted small" style="margin:4px">Tocca un giorno per vedere tutti i pasti. Pranzi e cene si possono invertire.</p>`;
}

function monthView(date) {
  const t = today();
  const first = new Date(date.getFullYear(), date.getMonth(), 1);
  const start = weekStart(first);
  const weighed = new Set(userWeights.map(w => w.d));
  const used = addDays(start, 35).getMonth() !== date.getMonth() ? 35 : 42;
  const cells = [...Array(used)].map((_, i) => {
    const d = addDays(start, i), k = keyOf(d);
    const cls = [d.getMonth() !== date.getMonth() && 'out', sameDay(d, t) && 'today', sameDay(d, date) && 'sel',
      (water[k] || 0) >= WATER_GOAL && 'hyd'].filter(Boolean).join(' ');
    return `<button class="${cls}" data-pick="${k}" aria-label="${fmt(d, { weekday: 'long', day: 'numeric', month: 'long' })}">${d.getDate()}${weighed.has(k) ? '<span class="dot"></span>' : ''}</button>`;
  });
  const m = phaseFor(date).days[dow(date)];
  const auto = DATA.phases.find(p => p.id === DATA.monthMap[date.getMonth() + 1]);
  const options = `<option value="auto">Automatico (${esc(auto.label)})</option>` +
    DATA.phases.map(p => `<option value="${p.id}"${state.phase === p.id ? ' selected' : ''}>${esc(p.label)}</option>`).join('');
  return `
    <div class="field select-field">
      <label for="phaseSelect">Piano del mese</label>
      <select id="phaseSelect">${options.replace('value="auto"', `value="auto"${state.phase === 'auto' ? ' selected' : ''}`)}</select>
    </div>
    <div class="card">
      <div class="cal">${['L', 'M', 'M', 'G', 'V', 'S', 'D'].map(x => `<div class="wh">${x}</div>`).join('')}${cells.join('')}</div>
      <div class="legend"><span><i></i>pesata</span><span><i class="ring"></i>2 L d'acqua</span></div>
    </div>
    <div class="card filled">
      <div class="day-head" style="margin:0 0 8px"><h2 style="font-size:20px">${fmt(date, { weekday: 'long', day: 'numeric' })}</h2></div>
      <div class="wday" style="cursor:default"><dl>${['colazione', 'pranzo', 'cena'].filter(s => m[s]).map(s => `<dt>${DATA.slots[s]}</dt><dd>${mealText(m, s)}</dd>`).join('')}</dl></div>
      <div class="form-actions"><button class="filled-btn" data-open="${keyOf(date)}">Apri giorno</button></div>
    </div>`;
}

// ---------- shopping list ----------
function aggregate(days) {
  const map = new Map();
  days.forEach(d => {
    const meals = phaseFor(d).days[dow(d)];
    SLOT_ORDER.forEach(slot => {
      if (!meals[slot]) return;
      (ING[meals[slot]] || []).forEach(it => {
        const key = it.n + '|' + (it.u || '');
        const e = map.get(key) || { n: it.n, u: it.u, c: it.c, q: 0, qb: false, uses: 0, alt: new Set() };
        const f = REDUCED_SLOTS.includes(slot) && (it.u === 'g' || it.u === 'ml') && it.c !== 'Frutta e verdura' ? REDUCTION : 1;
        if (it.q == null) e.qb = true; else e.q += it.q * f;
        if (it.alt) e.alt.add(it.alt);
        e.uses++;
        map.set(key, e);
      });
    });
  });
  // one row per product: join the different units (e.g. "× 2 + 325 ml")
  const byName = new Map();
  map.forEach(e => {
    const g = byName.get(e.n) || { n: e.n, c: e.c, parts: [], qb: false, uses: 0, alt: new Set() };
    if (e.q) g.parts.push({ q: e.q, u: e.u });
    g.qb = g.qb || e.qb || !e.u;
    g.uses += e.uses;
    e.alt.forEach(a => g.alt.add(a));
    byName.set(e.n, g);
  });
  return [...byName.values()];
}
function fmtAmount(e) {
  const num = v => v.toLocaleString('it-IT', { maximumFractionDigits: 1 });
  const order = { pz: 0, g: 1, ml: 2 };
  const parts = e.parts.slice().sort((a, b) => order[a.u] - order[b.u]).map(({ q, u }) =>
    u === 'g' ? (q >= 1000 ? `${num(q / 1000)} kg` : `${Math.max(5, Math.round(q / 10) * 10)} g`)
      : u === 'ml' ? (q >= 1000 ? `${num(q / 1000)} L` : `${Math.max(5, Math.round(q / 10) * 10)} ml`)
        : `× ${Math.ceil(q)}`);
  if (e.qb) parts.push('q.b.');
  return parts.join(' + ');
}
function shopView(days, period) {
  if (!ING) return '<p class="muted" style="padding:32px 8px;text-align:center">Lista non disponibile offline al primo avvio. Riprova online.</p>';
  const items = aggregate(days);
  const got = new Set(shopChecks[period] || []);
  const left = items.filter(e => !got.has(e.n)).length;
  const what = days.length === 1 ? 'per il giorno' : days.length === 7 ? 'per la settimana (lun–dom)' : 'per il mese';
  const byCat = CATS.concat([...new Set(items.map(e => e.c))].filter(c => !CATS.includes(c)))
    .map(c => [c, items.filter(e => e.c === c).sort((a, b) => a.n.localeCompare(b.n, 'it'))]).filter(([, l]) => l.length);
  return `
    <div class="shop-head"><div class="grow">${left} da prendere ${what}</div>
      <button class="text-btn" data-shop="copy">Copia</button>
      <button class="text-btn" data-shop="reset"${got.size ? '' : ' disabled'}>Azzera</button></div>
    ${byCat.map(([c, list]) => `<section class="shop-cat"><h3>${esc(c)}</h3>${list.map(e => `
      <label class="shop-item${got.has(e.n) ? ' got' : ''}">
        <input type="checkbox" data-period="${period}" data-item="${esc(e.n)}"${got.has(e.n) ? ' checked' : ''}>
        <span class="nm">${esc(e.n)}${e.alt.size ? `<small>${esc([...e.alt].join(' · '))}</small>` : ''}</span>
        <span class="qt">${fmtAmount(e)}</span></label>`).join('')}</section>`).join('')}
    <p class="muted small" style="margin:8px 4px">Quantità a crudo, già ridotte del 20% per pranzo e cena. Olio EVO: 1–2 cucchiai a pasto. Verdure a volontà: prendine in abbondanza.</p>`;
}
function shopText(period) {
  const d = parseKey(state.date);
  const days = state.view === 'day' ? [d] : state.view === 'week' ? [...Array(7)].map((_, i) => addDays(weekStart(d), i))
    : [...Array(new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate())].map((_, i) => new Date(d.getFullYear(), d.getMonth(), i + 1));
  const got = new Set(shopChecks[period] || []);
  const items = aggregate(days).filter(e => !got.has(e.n));
  return `Spesa ${$('#navLabel').textContent}\n` + CATS.map(c => {
    const l = items.filter(e => e.c === c);
    return l.length ? `\n${c}\n` + l.map(e => `- ${e.n}${fmtAmount(e) ? ' ' + fmtAmount(e) : ''}`).join('\n') : '';
  }).join('\n').replace(/\n{3,}/g, '\n\n');
}

// ---------- weight ----------
function renderWeight() {
  const all = allWeights();
  const last = all[all.length - 1];
  const bmi = last.kg / Math.pow(DATA.height / 100, 2);
  const restart = userWeights[0];
  const delta = restart && userWeights.length > 1 ? last.kg - restart.kg : null;
  const min = all.reduce((a, b) => (b.kg < a.kg ? b : a));
  const ranges = [['all', 'Tutto'], ['hist', '2023–24'], ['mine', 'Ripartenza']];
  const nw = nextWeighDate();
  const nwDone = weighedOn(keyOf(nw)) && sameDay(nw, today());
  const nextLabel = nwDone ? nextWeighDate(addDays(today(), 1)) : nw;
  main.innerHTML = `
    <section class="card weigh">
      <div class="ico">${icon('scale')}</div>
      <div class="grow"><div class="k">Prossima pesata</div>
        <div class="big">${sameDay(nextLabel, today()) ? 'Oggi' : fmt(nextLabel, { weekday: 'long', day: 'numeric', month: 'long' })}</div>
        <div class="muted small">Una volta a settimana, al mattino a digiuno dopo il bagno</div></div>
      <label class="day-pick"><span class="sr">Giorno della pesata</span>
        <select id="weighDay">${DAY_NAMES.map((n, i) => `<option value="${i}"${i === state.weighDay ? ' selected' : ''}>${n.slice(0, 3)}</option>`).join('')}</select></label>
    </section>
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
      <div class="legend"><span><i style="background:var(--primary)"></i>visite dietista</span><span><i></i>tue pesate</span></div>
    </div>
    <div class="card">
      <div class="section-title" style="margin-top:0">Nuova pesata</div>
      <form id="wForm">
        <div class="form-row">
          <div class="field"><label for="wDate">Data</label><input id="wDate" type="date" required value="${state.weighPrefill || keyOf(today())}" max="${keyOf(today())}"></div>
          <div class="field"><label for="wKg">Peso (kg)</label><input id="wKg" type="number" inputmode="decimal" step="0.1" min="30" max="250" required placeholder="${fmtKg(last.kg)}"></div>
        </div>
        <div class="form-actions"><button class="filled-btn" type="submit">Salva</button></div>
      </form>
    </div>
    <div class="section-title">Storico</div>
    <div class="card"><ul class="wlist">${all.slice().reverse().map((w, i, arr) => {
      const prev = arr[i + 1];
      const dd = prev ? w.kg - prev.kg : null;
      return `<li><div class="d">${shortDate(w.d)}<small>${w.src === 'mio' ? 'tua pesata' : 'visita dietista'}</small></div>
        <span class="delta">${dd === null ? '' : (dd > 0 ? '+' : '') + fmtKg(dd)}</span>
        <span class="kg">${fmtKg(w.kg)} kg</span>
        ${w.src === 'mio' ? `<button class="icon-btn" data-del="${w.d}" aria-label="Elimina ${shortDate(w.d)}"><svg viewBox="0 0 24 24"><path d="M6 19a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2V7H6zM19 4h-3.5l-1-1h-5l-1 1H5v2h14z"/></svg></button>` : '<span style="width:40px"></span>'}</li>`;
    }).join('')}</ul></div>
    <p class="muted small" style="margin:8px 4px">Pesate e acqua restano salvate solo su questo dispositivo. Usa il backup per spostarle.</p>
    <div class="form-actions" style="justify-content:flex-start">
      <button class="outlined-btn" id="exportBtn">Esporta backup</button>
      <label class="outlined-btn" style="display:inline-flex;align-items:center">Importa<input id="importIn" type="file" accept="application/json" hidden></label>
    </div>`;
  delete state.weighPrefill;
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
  const span = (x1 - x0) / 864e5;
  const d0 = new Date(x0), d1 = new Date(x1);
  let xt = '';
  if (span > 540) {
    for (let y = d0.getFullYear() + 1; y <= d1.getFullYear(); y++) {
      xt += `<text class="axis" x="${X(new Date(y, 0, 1).getTime())}" y="${H - 8}" text-anchor="middle">${y}</text>`;
    }
  } else {
    const every = span > 200 ? 2 : 1;
    for (let d = new Date(d0.getFullYear(), d0.getMonth() + 1, 1), i = 0; d.getTime() <= x1; d = new Date(d.getFullYear(), d.getMonth() + 1, 1), i++) {
      if (i % every) continue;
      xt += `<text class="axis" x="${X(d.getTime())}" y="${H - 8}" text-anchor="middle">${fmt(d, { month: 'short' })}</text>`;
    }
    if (span < 45) {
      xt = pts.map((p, i) => `<text class="axis" x="${X(tx[i])}" y="${H - 8}" text-anchor="middle">${parseKey(p.d).getDate()}/${parseKey(p.d).getMonth() + 1}</text>`).join('');
    }
  }
  // break lines at gaps > 200 days, bridge with a dotted segment
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
    <rect x="0" y="0" width="${W}" height="${H}" fill="transparent"/></svg><div class="tip" id="tip"></div>`;
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
    tip.style.left = Math.min(Math.max(cx * r.width / W, 50), r.width - 50) + 'px';
    tip.style.top = (cy * r.height / H - 10) + 'px'; tip.style.opacity = 1;
  };
  const leave = () => { tip.style.opacity = 0; cross.setAttribute('visibility', 'hidden'); hl.setAttribute('visibility', 'hidden'); };
  svg.addEventListener('pointermove', move);
  svg.addEventListener('pointerdown', move);
  svg.addEventListener('pointerleave', leave);
}

// ---------- achievements ----------
function renderGoals() {
  const list = computeAchievements();
  const done = list.filter(a => a.ok).length;
  main.innerHTML = `
    <section class="card hero">
      <div class="hero-ico">${icon('trophy')}</div>
      <div><div class="big">${done} / ${list.length}</div><div class="muted small">traguardi sbloccati</div></div>
    </section>
    <div class="progress" style="margin:0 4px 16px"><span style="width:${done / list.length * 100}%"></span></div>
    <div class="goals">${list.map(a => `
      <article class="goal${a.ok ? ' ok' : ''}">
        <div class="gico">${icon(a.ok ? a.ic : 'lock')}</div>
        <h3>${esc(a.t)}</h3>
        <p>${esc(a.d)}</p>
        ${!a.ok && a.pr !== undefined && a.pr > 0 ? `<div class="progress sm"><span style="width:${a.pr * 100}%"></span></div><div class="muted xs">${a.sub || ''}</div>` : ''}
      </article>`).join('')}</div>
    <p class="muted small" style="margin:12px 4px">I traguardi di peso contano dalla prima pesata della ripartenza.</p>`;
}

// ---------- rules ----------
function renderRules() {
  const phase = phaseFor(parseKey(state.date));
  const r = DATA.rules[phase.rules];
  const themes = [['auto', 'Automatico'], ['light', 'Chiaro'], ['dark', 'Scuro']];
  main.innerHTML = `
    <div class="section-title" style="margin-top:4px">Aspetto</div>
    <div class="card">
      <div class="swatches">${Object.entries(COLORS).map(([k, c]) => `
        <button class="swatch${state.color === k ? ' sel' : ''}" data-color="${k}" aria-pressed="${state.color === k}">
          <span style="background:${c.light.primary}"><i style="background:${c.light['primary-container']}"></i></span>${c.name}</button>`).join('')}</div>
      <div class="theme-row" style="margin-top:12px">${themes.map(([k, l]) => `<button class="fchip" data-theme-set="${k}" aria-pressed="${state.theme === k}">${l}</button>`).join('')}</div>
    </div>
    <div class="section-title">Regole del piano</div>
    <div class="rules-grid">${r.items.map(([k, v]) => `
      <article class="rule-card">
        <div class="rico">${icon(RULE_ICONS[k] || 'leaf')}</div>
        <div><h3>${esc(k)}</h3><p>${formatQty(v, false)}</p></div>
      </article>`).join('')}</div>
    <div class="section-title">Menù extra della dietista</div>
    ${DATA.extras.map((x, i) => `
      <details class="rule">
        <summary><span class="rico sm">${icon(EXTRA_ICONS[i] || 'leaf')}</span><span class="grow">${esc(x.title)}</span>
          <svg class="chev" viewBox="0 0 24 24"><path d="M16.6 8.6 12 13.2 7.4 8.6 6 10l6 6 6-6z"/></svg></summary>
        <ul class="bul">${x.items.map(i => `<li>${formatQty(i, false)}</li>`).join('')}</ul>
      </details>`).join('')}`;
}

// ---------- events ----------
function snack(msg) {
  const s = $('#snackbar');
  s.textContent = msg; s.classList.add('show');
  clearTimeout(snack.t); snack.t = setTimeout(() => s.classList.remove('show'), 3000);
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

function setWater(k, n) {
  n = Math.max(0, Math.min(16, n));
  if (n) water[k] = n; else delete water[k];
  save(WATER_KEY, water);
  const card = $('.water');
  if (card) card.outerHTML = waterCard(k);
  checkNewAchievements();
}

function bind() {
  $('#prevBtn').onclick = () => shift(-1);
  $('#nextBtn').onclick = () => shift(1);
  $('#todayBtn').onclick = () => { state.date = keyOf(today()); render(); };
  document.querySelectorAll('.segmented button').forEach(b => b.onclick = () => { state.view = b.dataset.view; render(); });
  document.querySelectorAll('.navbar button').forEach(b => b.onclick = () => { state.tab = b.dataset.tab; render(); scrollTo(0, 0); });

  main.addEventListener('click', e => {
    const t = e.target;
    const open = t.closest('[data-open]');
    if (open) { state.date = open.dataset.open; state.view = 'day'; render(); scrollTo(0, 0); return; }
    const pick = t.closest('[data-pick]');
    if (pick) { state.date = pick.dataset.pick; render(); return; }
    const wa = t.closest('[data-water]');
    if (wa) { setWater(state.date, (water[state.date] || 0) + Number(wa.dataset.water)); return; }
    const ws = t.closest('[data-water-set]');
    if (ws) { const n = Number(ws.dataset.waterSet); setWater(state.date, (water[state.date] || 0) === n ? n - 1 : n); return; }
    const gw = t.closest('[data-go-weigh]');
    if (gw) { state.weighPrefill = gw.dataset.goWeigh; state.tab = 'weight'; render(); scrollTo(0, 0); $('#wKg').focus(); return; }
    const sh = t.closest('[data-shop]');
    if (sh) {
      const period = $('[data-period]') && $('[data-period]').dataset.period;
      if (!period) return;
      if (sh.dataset.shop === 'reset') { delete shopChecks[period]; save(SHOP_KEY, shopChecks); renderPlan(); return; }
      const txt = shopText(period);
      (navigator.share ? navigator.share({ text: txt }) : navigator.clipboard.writeText(txt).then(() => snack('Lista copiata')))
        .catch(() => navigator.clipboard && navigator.clipboard.writeText(txt).then(() => snack('Lista copiata')));
      return;
    }
    const rg = t.closest('[data-range]');
    if (rg) { state.range = rg.dataset.range; persist(); renderWeight(); return; }
    const th = t.closest('[data-theme-set]');
    if (th) { state.theme = th.dataset.themeSet; render(); return; }
    const co = t.closest('[data-color]');
    if (co) { state.color = co.dataset.color; render(); return; }
    const del = t.closest('[data-del]');
    if (del) {
      userWeights = userWeights.filter(w => w.d !== del.dataset.del);
      save(WEIGHTS_KEY, userWeights); renderWeight();
      snack('Pesata eliminata');
      return;
    }
    if (t.id === 'exportBtn') {
      const blob = new Blob([JSON.stringify({ weights: userWeights, water }, null, 1)], { type: 'application/json' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob); a.download = `dieta-backup-${keyOf(today())}.json`; a.click();
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
    checkNewAchievements();
  });
  main.addEventListener('change', async e => {
    const t = e.target;
    if (t.id === 'phaseSelect') {
      state.phase = t.value; render();
      snack(state.phase === 'auto' ? 'Il piano segue il mese' : 'Piano fissato: ' + phaseFor(parseKey(state.date)).label);
      return;
    }
    if (t.dataset.period) {
      const list = new Set(shopChecks[t.dataset.period] || []);
      if (t.checked) list.add(t.dataset.item); else list.delete(t.dataset.item);
      if (list.size) shopChecks[t.dataset.period] = [...list]; else delete shopChecks[t.dataset.period];
      save(SHOP_KEY, shopChecks);
      t.closest('.shop-item').classList.toggle('got', t.checked);
      const head = $('.shop-head .grow');
      if (head) head.textContent = head.textContent.replace(/^\d+/, main.querySelectorAll('[data-period]:not(:checked)').length);
      return;
    }
    if (t.id === 'weighDay') { state.weighDay = Number(t.value); persist(); renderWeight(); return; }
    if (t.id !== 'importIn' || !t.files[0]) return;
    try {
      const obj = JSON.parse(await t.files[0].text());
      const list = (obj.weights || []).filter(w => /^\d{4}-\d{2}-\d{2}$/.test(w.d) && typeof w.kg === 'number');
      const map = new Map(userWeights.map(w => [w.d, w]));
      list.forEach(w => map.set(w.d, { d: w.d, kg: w.kg }));
      userWeights = [...map.values()].sort((a, b) => a.d.localeCompare(b.d));
      if (obj.water && typeof obj.water === 'object') water = Object.assign({}, obj.water, water);
      save(WEIGHTS_KEY, userWeights); save(WATER_KEY, water);
      renderWeight(); snack(`Importate ${list.length} pesate`);
    } catch { snack('File non valido'); }
  });

  // swipe left/right on the plan to move day/week/month
  let sx = null, sy = null;
  main.addEventListener('touchstart', e => { if (state.tab === 'plan' || state.tab === 'shop') { sx = e.touches[0].clientX; sy = e.touches[0].clientY; } }, { passive: true });
  main.addEventListener('touchend', e => {
    if (sx === null) return;
    const dx = e.changedTouches[0].clientX - sx, dy = e.changedTouches[0].clientY - sy;
    sx = null;
    if (Math.abs(dx) > 70 && Math.abs(dx) > Math.abs(dy) * 1.5) shift(dx < 0 ? 1 : -1);
  }, { passive: true });

  let rt;
  addEventListener('resize', () => { clearTimeout(rt); rt = setTimeout(() => state.tab === 'weight' && drawChart(), 150); });
  document.addEventListener('visibilitychange', () => { if (!document.hidden && (state.tab === 'plan' || state.tab === 'shop')) render(); });
}

async function init() {
  applyTheme();
  try {
    DATA = await (await fetch('data/diet.json')).json();
  } catch {
    main.innerHTML = '<p class="muted" style="padding:32px">Impossibile caricare il piano. Riprova quando sei online.</p>';
    return;
  }
  try { ING = await (await fetch('data/ingredients.json')).json(); } catch { ING = null; }
  if (state.phase !== 'auto' && !DATA.phases.some(p => p.id === state.phase)) state.phase = 'auto';
  if (!COLORS[state.color]) state.color = 'verde';
  bind();
  render();
  if ('serviceWorker' in navigator) navigator.serviceWorker.register('./sw.js').catch(() => {});
}

init();
