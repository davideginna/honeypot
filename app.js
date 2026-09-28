'use strict';

const STATE_KEY = 'dieta.state';
const WEIGHTS_KEY = 'dieta.weights';
const WATER_KEY = 'dieta.water';
const CHECKIN_KEY = 'dieta.checkins';
const PUSH_KEY = 'dieta.pushsub';
const VAPID_PUBLIC = 'BK-4qV_LIIsKAzUtEpA8OuAqfzDUQAt1b1pA0gbjPkOhzpp1QftWtSqcpi6YVkbrAEs1my-TUR3ng0GNxZWJskw';
const CONFIG_EDIT_URL = 'https://github.com/davideginna/honeypot/edit/main/push/config.json';
const SEEN_KEY = 'dieta.achievements';
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
  { tab: 'plan', view: 'day', date: keyOf(today()), phase: 'auto', range: 'all', theme: 'auto', color: 'verde', weighDay: 0,
    notif: { weigh: true, weighTime: '08:00', water: true, waterFrom: '09:00', waterTo: '21:00', waterEvery: 90, checkin: true, checkinDay: 1, checkinTime: '09:00' } },
  load(STATE_KEY, {})
);
if (!state.weighEvery) state.weighEvery = 2; // settimane tra una pesata e l'altra
if (!state.weighAnchor) state.weighAnchor = keyOf(weekStart(today())); // settimana di riferimento
state.notif = Object.assign({ weigh: true, weighTime: '08:00', water: true, waterFrom: '09:00', waterTo: '21:00', waterEvery: 90, checkin: true, checkinDay: 1, checkinTime: '09:00' }, state.notif);
let userWeights = load(WEIGHTS_KEY, []);
let water = load(WATER_KEY, {});
let checkins = load(CHECKIN_KEY, {}); // { 'YYYY-MM': { d, kg, fm, waist, hips } }
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
function isWeighDay(d) {
  if (dow(d) !== state.weighDay) return false;
  const weeks = Math.round((weekStart(d) - parseKey(state.weighAnchor)) / (7 * 864e5));
  return ((weeks % state.weighEvery) + state.weighEvery) % state.weighEvery === 0;
}
function nextWeighDate(from = today()) {
  for (let i = 0; i < 7 * state.weighEvery; i++) if (isWeighDay(addDays(from, i))) return addDays(from, i);
  return from;
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
  // weigh-ins without skipping a period (1 or 2 weeks)
  const weeks = [...new Set(mine.map(w => keyOf(weekStart(parseKey(w.d)))))].sort();
  let bestWeeks = weeks.length ? 1 : 0, run = 1;
  for (let i = 1; i < weeks.length; i++) {
    run = (parseKey(weeks[i]) - parseKey(weeks[i - 1])) / 864e5 < 7 * state.weighEvery + 1 ? run + 1 : 1;
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
    { id: 'goal', t: 'Peso desiderato', d: state.goalKg ? `Arrivare a ${fmtKg(state.goalKg)} kg` : 'Imposta il peso desiderato', ic: 'trophy', ok: !!state.goalKg && minMine <= state.goalKg },
    { id: 'rec', t: 'Record', d: `Sotto il tuo minimo storico (${fmtKg(hmin)} kg)`, ic: 'trophy', ok: minMine < hmin },
    { id: 'bmi', t: 'BMI sotto 30', d: 'Fuori dalla fascia obesità', ic: 'run', ok: bmi(minMine) < 30 },
    { id: 'w4', t: 'Costanza', d: '4 pesate di fila senza saltarne una', ic: 'scale', ok: bestWeeks >= 4, pr: p(bestWeeks, 4), sub: `${bestWeeks} / 4 pesate` },
    { id: 'w12', t: 'Abitudine', d: '12 pesate di fila senza saltarne una', ic: 'scale', ok: bestWeeks >= 12, pr: p(bestWeeks, 12), sub: `${bestWeeks} / 12 pesate` },
    { id: 'h1', t: 'Idratato', d: '2 L d\'acqua in un giorno', ic: 'water', ok: bestWater >= 1 },
    { id: 'h7', t: 'Settimana idratata', d: '2 L al giorno per 7 giorni', ic: 'water', ok: bestWater >= 7, pr: p(bestWater, 7), sub: `${bestWater} / 7 giorni` },
    { id: 'ck1', t: 'Misurato', d: 'Primo check-in mensile', ic: 'scale', ok: Object.keys(checkins).length >= 1 },
    { id: 'ck3', t: 'Tre mesi di misure', d: '3 check-in mensili', ic: 'scale', ok: Object.keys(checkins).length >= 3, pr: p(Object.keys(checkins).length, 3), sub: `${Object.keys(checkins).length} / 3` },
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
  const titles = { shop: 'Lista della spesa', plan: 'La mia dieta', weight: 'Andamento', goals: 'Traguardi', rules: 'Regole' };
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
    main.innerHTML = state.tab === 'shop' ? shopView(shopDays()) : dayView(date);
  } else if (state.view === 'week') {
    const s = weekStart(date), e = addDays(s, 6);
    label = s.getMonth() === e.getMonth()
      ? `${s.getDate()}–${e.getDate()} ${fmt(e, { month: 'short' })}`
      : `${fmt(s, { day: 'numeric', month: 'short' })} – ${fmt(e, { day: 'numeric', month: 'short' })}`;
    todayBtn.disabled = sameDay(s, weekStart(t));
    main.innerHTML = state.tab === 'shop' ? shopView(shopDays()) : weekView(s);
  } else {
    label = fmt(date, { month: 'long', year: 'numeric' });
    todayBtn.disabled = date.getMonth() === t.getMonth() && date.getFullYear() === t.getFullYear();
    main.innerHTML = state.tab === 'shop'
      ? shopView(shopDays())
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

// ---------- monthly check-in ----------
// Body fat % from tape measurements, US Navy formula (men, cm)
const navyBodyFat = (waist, neck, height) =>
  waist > neck ? 495 / (1.0324 - 0.19077 * Math.log10(waist - neck) + 0.15456 * Math.log10(height)) - 450 : null;
const monthKey = d => keyOf(d).slice(0, 7);
const checkinDue = () => !checkins[monthKey(today())];
function checkinCompact() {
  if (!checkinDue()) return '';
  return `
    <section class="card weigh checkin">
      <div class="ico">${icon('trophy')}</div>
      <div class="grow"><div class="k">Check-in di ${fmt(today(), { month: 'long' })}</div><div>Peso e misure del mese</div></div>
      <button class="filled-btn" data-go-checkin>Compila</button>
    </section>`;
}
function checkinSection() {
  const t = today(), mk = monthKey(t);
  const list = Object.entries(checkins).sort((a, b) => b[0].localeCompare(a[0]));
  const form = checkinDue() ? `
    <section class="card" id="checkinCard">
      <div class="section-title" style="margin-top:0">Check-in di ${fmt(t, { month: 'long', year: 'numeric' })}</div>
      <p class="muted small" style="margin:0 0 14px">Una volta al mese. Dopo il salvataggio si chiude fino al mese prossimo.</p>
      <form id="ckForm">
        <div class="form-row">
          <div class="field"><label for="ckDate">Data</label><input id="ckDate" type="date" required value="${keyOf(t)}" min="${mk}-01" max="${keyOf(t)}"></div>
          <div class="field"><label for="ckKg">Peso (kg) *</label><input id="ckKg" type="number" inputmode="decimal" step="0.1" min="30" max="250" required></div>
          <div class="field"><label for="ckFm">Massa grassa (kg)</label><input id="ckFm" type="number" inputmode="decimal" step="0.1" min="1" max="120"></div>
          <div class="field"><label for="ckWaist">Vita (cm)</label><input id="ckWaist" type="number" inputmode="decimal" step="0.5" min="40" max="200"></div>
          <div class="field"><label for="ckHips">Fianchi (cm)</label><input id="ckHips" type="number" inputmode="decimal" step="0.5" min="40" max="200"></div>
          <div class="field"><label for="ckNeck">Collo (cm)</label><input id="ckNeck" type="number" inputmode="decimal" step="0.5" min="25" max="70"></div>
        </div>
        <p class="muted small" style="margin:12px 0 0">Senza bilancia impedenziometrica lascia vuota la massa grassa: la stimo da <b>vita</b> e <b>collo</b> (metodo US Navy). Metro da sarta, al mattino: vita all'altezza dell'ombelico a pancia rilassata, collo appena sotto il pomo d'Adamo.</p>
        <div class="form-actions"><button class="filled-btn" type="submit">Salva check-in</button></div>
      </form>
    </section>` : `
    <section class="card weigh done"><div class="ico">${icon('trophy')}</div>
      <div class="grow"><div class="k">Check-in del mese</div><div>Fatto ✓ · il prossimo dal 1° ${fmt(new Date(t.getFullYear(), t.getMonth() + 1, 1), { month: 'long' })}</div></div></section>`;
  const hist = list.length ? `
    <div class="section-title">Check-in mensili</div>
    <div class="card"><ul class="wlist">${list.map(([m, c]) => `<li><div class="d">${fmt(parseKey(c.d), { month: 'long', year: 'numeric' })}
      <small>${[c.fm && `grassa ${c.fmEst ? '~' : ''}${fmtKg(c.fm)} kg${c.fmEst ? ' (stima)' : ''}`, c.neck && `collo ${c.neck} cm`, c.waist && `vita ${c.waist} cm`, c.hips && `fianchi ${c.hips} cm`].filter(Boolean).join(' · ') || '—'}</small></div>
      <span class="kg">${fmtKg(c.kg)} kg</span>
      <button class="icon-btn" data-del-ck="${m}" aria-label="Elimina check-in ${m}"><svg viewBox="0 0 24 24"><path d="M6 19a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2V7H6zM19 4h-3.5l-1-1h-5l-1 1H5v2h14z"/></svg></button></li>`).join('')}</ul></div>` : '';
  return { form, hist };
}

function weighCard(date) {
  if (!isWeighDay(date)) return '';
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
    ${isToday ? checkinCompact() : ''}
    ${weighCard(date)}
    ${cards}${alt}
    ${waterCard(k)}
    <p class="muted small" style="margin:12px 4px">Olio a crudo · pesi a crudo.</p>`;
}

function weekView(start) {
  const t = today();
  const days = [...Array(7)].map((_, i) => addDays(start, i));
  return `<div class="week-grid">${days.map(d => {
    const m = phaseFor(d).days[dow(d)];
    // mobile shows the three main meals; wide screens show every slot, unclamped
    const main3 = ['colazione', 'pranzo', 'cena'];
    const rows = SLOT_ORDER.filter(s => s !== 'sveglia' && m[s])
      .map(s => `<dt${main3.includes(s) ? '' : ' class="extra"'}>${DATA.slots[s]}</dt><dd${main3.includes(s) ? '' : ' class="extra"'}>${mealText(m, s)}</dd>`).join('');
    const k = keyOf(d), wn = water[k] || 0;
    const extra = [
      isWeighDay(d) ? `<span class="mini">${icon('scale')}${weighedOn(k) ? 'pesato' : 'pesata'}</span>` : '',
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
  const used = Math.ceil((dow(first) + new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate()) / 7) * 7;
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
    <div class="month-layout">
    <div class="card cal-card">
      <div class="cal">${['L', 'M', 'M', 'G', 'V', 'S', 'D'].map(x => `<div class="wh">${x}</div>`).join('')}${cells.join('')}</div>
      <div class="legend"><span><i></i>pesata</span><span><i class="ring"></i>2 L d'acqua</span></div>
    </div>
    <div class="card filled">
      <div class="day-head" style="margin:0 0 8px"><h2 style="font-size:20px">${fmt(date, { weekday: 'long', day: 'numeric' })}</h2></div>
      <div class="wday" style="cursor:default"><dl>${SLOT_ORDER.filter(s => s !== 'sveglia' && m[s]).map(s => {
        const x = ['colazione', 'pranzo', 'cena'].includes(s) ? '' : ' class="extra"';
        return `<dt${x}>${DATA.slots[s]}</dt><dd${x}>${mealText(m, s)}</dd>`;
      }).join('')}</dl></div>
      <div class="form-actions"><button class="filled-btn" data-open="${keyOf(date)}">Apri giorno</button></div>
    </div>
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
function shopDays() {
  const d = parseKey(state.date);
  if (state.view === 'day') return [d];
  if (state.view === 'week') return [...Array(7)].map((_, i) => addDays(weekStart(d), i));
  return [...Array(new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate())].map((_, i) => new Date(d.getFullYear(), d.getMonth(), i + 1));
}
function shopView(days) {
  if (!ING) return '<p class="muted" style="padding:32px 8px;text-align:center">Lista non disponibile offline al primo avvio. Riprova online.</p>';
  const items = aggregate(days);
  const what = days.length === 1 ? 'per il giorno' : days.length === 7 ? 'per la settimana (lun–dom)' : 'per il mese';
  const byCat = CATS.concat([...new Set(items.map(e => e.c))].filter(c => !CATS.includes(c)))
    .map(c => [c, items.filter(e => e.c === c).sort((a, b) => a.n.localeCompare(b.n, 'it'))]).filter(([, l]) => l.length);
  return `
    <div class="shop-head"><div class="grow">${items.length} prodotti ${what}</div>
      <button class="tonal-btn" data-shop="copy">Copia per Bring</button></div>
    ${byCat.map(([c, list]) => `<section class="shop-cat"><h3>${esc(c)}</h3>${list.map(e => `
      <div class="shop-item"><span class="dotc"></span>
        <span class="nm">${esc(e.n)}${e.alt.size ? `<small>${esc([...e.alt].join(' · '))}</small>` : ''}</span>
        <span class="qt">${fmtAmount(e)}</span></div>`).join('')}</section>`).join('')}
    <p class="muted small" style="margin:8px 4px">Olio EVO: 1–2 cucchiai a pasto. Verdure a volontà.</p>`;
}
// one product per line: paste into Bring
function shopText() {
  const items = aggregate(shopDays());
  return CATS.flatMap(c => items.filter(e => e.c === c).sort((a, b) => a.n.localeCompare(b.n, 'it'))
    .map(e => `${e.n}${fmtAmount(e) && fmtAmount(e) !== 'q.b.' ? ' ' + fmtAmount(e).replace(' + q.b.', '') : ''}`)).join('\n');
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
  const ck = checkinSection();
  main.innerHTML = `
    ${ck.form}
    <section class="card weigh">
      <div class="ico">${icon('scale')}</div>
      <div class="grow"><div class="k">Prossima pesata</div>
        <div class="big">${sameDay(nextLabel, today()) ? 'Oggi' : fmt(nextLabel, { weekday: 'long', day: 'numeric', month: 'long' })}</div>
        <div class="muted small">${state.weighEvery === 1 ? 'Ogni settimana' : 'Ogni 2 settimane'}, al mattino a digiuno dopo il bagno</div></div>
      <label class="day-pick"><span class="sr">Giorno della pesata</span>
        <select id="weighDay">${DAY_NAMES.map((n, i) => `<option value="${i}"${i === state.weighDay ? ' selected' : ''}>${n.slice(0, 3)}</option>`).join('')}</select>
        <select id="weighEvery" aria-label="Frequenza pesata"><option value="1"${state.weighEvery === 1 ? ' selected' : ''}>1 sett.</option><option value="2"${state.weighEvery === 2 ? ' selected' : ''}>2 sett.</option></select></label>
    </section>
    <div class="stats">
      <div class="stat"><div class="k">Ultimo</div><div class="v">${fmtKg(last.kg)}</div><div class="s">${shortDate(last.d)}</div></div>
      <div class="stat"><div class="k">BMI</div><div class="v">${bmi.toFixed(1).replace('.', ',')}</div><div class="s">altezza ${DATA.height} cm</div></div>
      <div class="stat"><div class="k">${delta !== null ? 'Dalla ripartenza' : 'Minimo'}</div>
        <div class="v">${delta !== null ? (delta > 0 ? '+' : '') + fmtKg(delta) : fmtKg(min.kg)}</div>
        <div class="s">${delta !== null ? 'dal ' + shortDate(restart.d) : shortDate(min.d)}</div></div>
    </div>
    ${goalCard(last)}
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
    <div class="section-title">Grafici</div>
    <div class="filters">${ranges.map(([k, l]) => `<button class="fchip" data-range="${k}" aria-pressed="${state.range === k}">${l}</button>`).join('')}</div>
    <section class="card chart-card"><h3>Peso <small>kg</small></h3>
      <div class="chart-wrap" id="chWeight"></div>
      <div class="legend"><span><i style="background:var(--primary)"></i>visite dietista</span><span><i></i>tue pesate</span></div></section>
    <section class="card chart-card"><h3>BMI <small>altezza ${DATA.height} cm</small></h3>
      <div class="chart-wrap" id="chBmi"></div></section>
    <section class="card chart-card"><h3>Composizione corporea <small>kg · visite Bodygram</small></h3>
      <div class="chart-wrap" id="chBody"></div>
      <div class="legend"><span><i style="background:var(--primary)"></i>massa grassa</span><span><i style="background:var(--outline-var)"></i>massa magra</span></div></section>
    <section class="card chart-card"><h3>Circonferenza vita <small>cm · check-in mensili</small></h3>
      <div class="chart-wrap" id="chWaist"></div></section>
    <section class="card chart-card"><h3>Acqua <small>litri · ultimi 30 giorni</small></h3>
      <div class="chart-wrap" id="chWater"></div></section>
    ${ck.hist}
    <div class="section-title">Storico pesate</div>
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
  drawCharts();
}

function goalCard(last) {
  const g = state.goalKg;
  const input = `<div class="field goal-field"><label for="goalKg">Peso desiderato (kg)</label>
    <input id="goalKg" type="number" inputmode="decimal" step="0.5" min="40" max="200" value="${g ?? ''}" placeholder="es. 85"></div>`;
  if (!g) return `<section class="card goal-card">${input}<p class="muted small" style="margin:8px 0 0">Imposta il tuo obiettivo per vedere quanto manca.</p></section>`;
  const start = userWeights[0] ? userWeights[0].kg : last.kg;
  const left = last.kg - g;
  const pr = start > g ? Math.max(0, Math.min(1, (start - last.kg) / (start - g))) : (left <= 0 ? 1 : 0);
  const bmiGoal = g / Math.pow(DATA.height / 100, 2);
  return `<section class="card goal-card">
    <div class="goal-top"><div class="grow"><div class="k">Obiettivo</div>
      <div class="big">${left > 0 ? `Mancano <b>${fmtKg(left)} kg</b>` : 'Raggiunto 🎉'}</div>
      <div class="muted small">${fmtKg(g)} kg · BMI ${bmiGoal.toFixed(1).replace('.', ',')}</div></div>${input}</div>
    <div class="progress" style="margin-top:12px"><span style="width:${pr * 100}%"></span></div>
    <div class="muted xs" style="margin-top:6px">${Math.round(pr * 100)}% dalla ripartenza (${fmtKg(start)} kg)</div>
  </section>`;
}

// ---------- charts (inline SVG, one y-scale per chart) ----------
function chartFrame(wrap, H) {
  const W = Math.max(280, wrap.clientWidth);
  return { W, H, m: { t: 14, r: 12, b: 26, l: 34 } };
}
function yTicks(lo, hi, maxTicks = 5) {
  const raw = (hi - lo) / maxTicks;
  const step = [1, 2, 4, 5, 10, 20].find(s => s >= raw) || 50;
  const a = Math.floor(lo / step) * step, b = Math.ceil(hi / step) * step;
  const out = [];
  for (let v = a; v <= b + 1e-9; v += step) out.push(+v.toFixed(2));
  return out;
}
function timeTicks(x0, x1) {
  const span = (x1 - x0) / 864e5, d0 = new Date(x0), d1 = new Date(x1), out = [];
  if (span > 540) {
    for (let y = d0.getFullYear() + 1; y <= d1.getFullYear(); y++) out.push([new Date(y, 0, 1).getTime(), String(y)]);
  } else if (span < 45) {
    for (let d = new Date(x0); d.getTime() <= x1; d = addDays(d, Math.max(1, Math.ceil(span / 5)))) out.push([d.getTime(), `${d.getDate()}/${d.getMonth() + 1}`]);
  } else {
    const every = span > 200 ? 2 : 1;
    for (let d = new Date(d0.getFullYear(), d0.getMonth() + 1, 1), i = 0; d.getTime() <= x1; d = new Date(d.getFullYear(), d.getMonth() + 1, 1), i++) {
      if (!(i % every)) out.push([d.getTime(), fmt(d, { month: 'short' })]);
    }
  }
  return out;
}
// Crosshair + tooltip following the nearest x
function attachHover(wrap, svg, W, H, xs, tipHtml, yAt) {
  const tip = document.createElement('div');
  tip.className = 'tip'; wrap.appendChild(tip);
  const cross = svg.querySelector('.cross'), hl = svg.querySelector('.hl');
  const move = ev => {
    const r = svg.getBoundingClientRect();
    const px = (ev.clientX - r.left) * (W / r.width);
    let best = 0;
    xs.forEach((x, i) => { if (Math.abs(x - px) < Math.abs(xs[best] - px)) best = i; });
    const cx = xs[best], cy = yAt(best);
    cross.setAttribute('x1', cx); cross.setAttribute('x2', cx); cross.setAttribute('visibility', 'visible');
    if (hl) { hl.setAttribute('cx', cx); hl.setAttribute('cy', cy); hl.setAttribute('visibility', 'visible'); }
    tip.innerHTML = tipHtml(best);
    tip.style.left = Math.min(Math.max(cx * r.width / W, 56), r.width - 56) + 'px';
    tip.style.top = (cy * r.height / H - 10) + 'px'; tip.style.opacity = 1;
  };
  svg.addEventListener('pointermove', move);
  svg.addEventListener('pointerdown', move);
  svg.addEventListener('pointerleave', () => {
    tip.style.opacity = 0; cross.setAttribute('visibility', 'hidden'); if (hl) hl.setAttribute('visibility', 'hidden');
  });
}
function lineChart(wrap, pts, { H = 220, pad = 1, bands = [], unit = '', dec = 1, empty = 'Dati insufficienti.', goal = null } = {}) {
  if (pts.length < 2) { wrap.innerHTML = `<p class="muted small" style="padding:24px 8px;text-align:center">${empty}</p>`; return; }
  const { W, m } = chartFrame(wrap, H);
  const tx = pts.map(p => p.t), vs = pts.map(p => p.v);
  const x0 = tx[0], x1 = tx[tx.length - 1];
  const ticks = yTicks(Math.min(...vs, goal ?? Infinity) - pad, Math.max(...vs, goal ?? -Infinity) + pad);
  const y0 = ticks[0], y1 = ticks[ticks.length - 1];
  const X = t => m.l + (t - x0) / (x1 - x0 || 1) * (W - m.l - m.r);
  const Y = v => m.t + (y1 - Math.min(y1, Math.max(y0, v))) / (y1 - y0) * (H - m.t - m.b);
  const num = v => v.toLocaleString('it-IT', { minimumFractionDigits: dec, maximumFractionDigits: dec });
  let g = bands.filter(b => b.to > y0 && b.from < y1).map((b, i) =>
    `<rect class="band b${b.k}" x="${m.l}" width="${W - m.l - m.r}" y="${Y(b.to)}" height="${Y(b.from) - Y(b.to)}"/>` +
    `<text class="band-label" x="${W - m.r - 6}" y="${(Y(Math.min(b.to, y1)) + Y(Math.max(b.from, y0))) / 2 + 4}" text-anchor="end">${b.label}</text>`).join('');
  g += ticks.map(v => `<line class="grid" x1="${m.l}" x2="${W - m.r}" y1="${Y(v)}" y2="${Y(v)}"/><text class="axis" x="${m.l - 6}" y="${Y(v) + 4}" text-anchor="end">${v}</text>`).join('');
  g += timeTicks(x0, x1).map(([t, l]) => `<text class="axis" x="${X(t)}" y="${H - 7}" text-anchor="middle">${l}</text>`).join('');
  const segs = [[0]];
  for (let i = 1; i < pts.length; i++) {
    if ((tx[i] - tx[i - 1]) / 864e5 > 200) segs.push([i]); else segs[segs.length - 1].push(i);
  }
  const path = idx => idx.map((i, k) => `${k ? 'L' : 'M'}${X(tx[i]).toFixed(1)},${Y(vs[i]).toFixed(1)}`).join('');
  let lines = segs.map(sg => `<path class="line" d="${path(sg)}"/>`).join('');
  for (let k = 1; k < segs.length; k++) {
    const a = segs[k - 1][segs[k - 1].length - 1], b = segs[k][0];
    lines += `<path class="gap" d="M${X(tx[a])},${Y(vs[a])}L${X(tx[b])},${Y(vs[b])}"/>`;
  }
  const dots = pts.map((p, i) => `<circle class="pt${p.user ? ' user' : ''}" cx="${X(tx[i])}" cy="${Y(vs[i])}" r="4"/>`).join('');
  wrap.innerHTML = `<svg class="chart" style="height:${H}px" viewBox="0 0 ${W} ${H}" role="img" aria-label="da ${num(vs[0])} a ${num(vs[vs.length - 1])} ${unit}">
    ${g}${goal != null ? `<line class="goal-line" x1="${m.l}" x2="${W - m.r}" y1="${Y(goal)}" y2="${Y(goal)}"/><text class="band-label" x="${m.l + 4}" y="${Y(goal) - 5}">desiderato ${num(goal)} ${unit}</text>` : ''}${lines}${dots}<line class="cross" y1="${m.t}" y2="${H - m.b}" visibility="hidden"/><circle class="hl" r="6" visibility="hidden"/>
    <rect width="${W}" height="${H}" fill="transparent"/></svg>`;
  attachHover(wrap, $('svg', wrap), W, H, tx.map(X), i => `<b>${num(vs[i])} ${unit}</b><br>${shortDate(keyOf(new Date(tx[i])))}`, i => Y(vs[i]));
}
// bars: [{label, t, segs:[{v, cls}], tip}] stacked from 0
function barChart(wrap, bars, { H = 200, goal = null, unit = '', dec = 1, labelEvery = 1 } = {}) {
  const { W, m } = chartFrame(wrap, H);
  const totals = bars.map(b => b.segs.reduce((s, x) => s + x.v, 0));
  const ticks = yTicks(0, Math.max(goal || 0, ...totals, 0.1) * 1.05, 4);
  const y1 = ticks[ticks.length - 1];
  const Y = v => m.t + (y1 - v) / y1 * (H - m.t - m.b);
  const bw = (W - m.l - m.r) / bars.length;
  const w = Math.max(3, Math.min(40, bw * 0.62));
  const xs = bars.map((_, i) => m.l + bw * i + bw / 2);
  let g = ticks.map(v => `<line class="grid" x1="${m.l}" x2="${W - m.r}" y1="${Y(v)}" y2="${Y(v)}"/><text class="axis" x="${m.l - 6}" y="${Y(v) + 4}" text-anchor="end">${v.toLocaleString('it-IT')}</text>`).join('');
  g += bars.map((b, i) => (i % labelEvery ? '' : `<text class="axis" x="${xs[i]}" y="${H - 7}" text-anchor="middle">${b.label}</text>`)).join('');
  const r = Math.min(4, w / 2);
  const marks = bars.map((b, i) => {
    let base = 0;
    return b.segs.map((sg, k) => {
      if (!sg.v) return '';
      const top = Y(base + sg.v), bot = Y(base) - (k ? 2 : 0); // 2px surface gap between stacked fills
      base += sg.v;
      const h = Math.max(1, bot - top), x = xs[i] - w / 2, rr = Math.min(r, h);
      const isTop = k === b.segs.length - 1 || !b.segs.slice(k + 1).some(z => z.v);
      const d = isTop
        ? `M${x},${bot}V${top + rr}Q${x},${top} ${x + rr},${top}H${x + w - rr}Q${x + w},${top} ${x + w},${top + rr}V${bot}Z`
        : `M${x},${bot}V${top}H${x + w}V${bot}Z`;
      const lab = sg.label ? `<text class="bar-label" x="${xs[i]}" y="${top + (bot - top) / 2 + 4}" text-anchor="middle">${sg.label}</text>` : '';
      return `<path class="bar ${sg.cls}" d="${d}"/>${lab}`;
    }).join('');
  }).join('');
  const goalLine = goal ? `<line class="goal-line" x1="${m.l}" x2="${W - m.r}" y1="${Y(goal)}" y2="${Y(goal)}"/><text class="band-label" x="${m.l + 4}" y="${Y(goal) - 5}">obiettivo ${goal.toLocaleString('it-IT')} ${unit}</text>` : '';
  wrap.innerHTML = `<svg class="chart" style="height:${H}px" viewBox="0 0 ${W} ${H}" role="img">
    ${g}${marks}${goalLine}<line class="cross" y1="${m.t}" y2="${H - m.b}" visibility="hidden"/>
    <rect width="${W}" height="${H}" fill="transparent"/></svg>`;
  attachHover(wrap, $('svg', wrap), W, H, xs, i => bars[i].tip, i => Y(totals[i]));
}

function drawCharts() {
  if (!$('#chWeight')) return;
  let pts = allWeights();
  if (state.range === 'hist') pts = pts.filter(p => p.src === 'storico' && p.d >= '2023-01-01');
  if (state.range === 'mine') pts = pts.filter(p => p.src === 'mio');
  const tp = pts.map(p => ({ t: parseKey(p.d).getTime(), v: p.kg, user: p.src === 'mio' }));
  const empty = state.range === 'mine' ? 'Aggiungi almeno due pesate per vedere la ripartenza.' : 'Dati insufficienti.';
  lineChart($('#chWeight'), tp, { unit: 'kg', empty, goal: state.goalKg || null });
  const h2 = Math.pow(DATA.height / 100, 2);
  lineChart($('#chBmi'), tp.map(p => ({ ...p, v: p.v / h2 })), {
    unit: '', pad: 1.5, empty, bands: [
      { from: 18.5, to: 25, label: 'normopeso', k: 0 }, { from: 25, to: 30, label: 'sovrappeso', k: 1 },
      { from: 30, to: 35, label: 'obesità I', k: 2 }, { from: 35, to: 40, label: 'obesità II', k: 3 }],
  });
  const body = DATA.body.concat(Object.values(checkins).filter(c => c.fm).map(c => [c.d, c.kg, c.fm]))
    .sort((a, b) => a[0].localeCompare(b[0])).slice(-12);
  barChart($('#chBody'), body.map(([d, kg, fm], i, arr) => {
    const dt = parseKey(d);
    return {
      label: fmt(dt, { month: 'short' }).replace('.', ''),
      segs: [{ v: kg - fm, cls: 'lean' }, { v: fm, cls: 'fat', label: i === 0 || i === arr.length - 1 ? String(Math.round(fm)) : '' }],
      tip: `<b>${shortDate(d)}</b><br>grassa ${fmtKg(fm)} kg (${Math.round(fm / kg * 100)}%)<br>magra ${fmtKg(kg - fm)} kg`,
    };
  }), { H: 220 });
  const waist = Object.values(checkins).filter(c => c.waist).sort((a, b) => a.d.localeCompare(b.d))
    .map(c => ({ t: parseKey(c.d).getTime(), v: c.waist, user: true }));
  lineChart($('#chWaist'), waist, { unit: 'cm', pad: 2, dec: 1, empty: 'Compare dopo due check-in con la misura della vita.' });
  const t0 = today();
  const days = [...Array(30)].map((_, i) => addDays(t0, i - 29));
  barChart($('#chWater'), days.map(d => {
    const n = water[keyOf(d)] || 0;
    return { label: String(d.getDate()), segs: [{ v: n * GLASS_ML / 1000, cls: n >= WATER_GOAL ? 'water ok' : 'water' }],
      tip: `<b>${liters(n)} L</b><br>${fmt(d, { weekday: 'short', day: 'numeric', month: 'short' })}` };
  }), { H: 180, goal: WATER_GOAL * GLASS_ML / 1000, unit: 'L', labelEvery: 5 });
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
// ---------- reminders (web push via GitHub Actions) ----------
const b64ToBytes = b => Uint8Array.from(atob((b + '='.repeat((4 - b.length % 4) % 4)).replace(/-/g, '+').replace(/_/g, '/')), c => c.charCodeAt(0));
function pushConfig() {
  const n = state.notif, sub = load(PUSH_KEY, null);
  return {
    timezone: 'Europe/Rome',
    subscriptions: sub ? [sub] : [],
    weigh: { enabled: n.weigh, day: state.weighDay, time: n.weighTime, everyWeeks: state.weighEvery, anchor: state.weighAnchor },
    water: { enabled: n.water, from: n.waterFrom, to: n.waterTo, everyMinutes: Number(n.waterEvery) },
    checkin: { enabled: n.checkin, dayOfMonth: Number(n.checkinDay), time: n.checkinTime },
  };
}
async function enablePush() {
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) return snack('Notifiche non supportate da questo browser');
  const perm = await Notification.requestPermission();
  if (perm !== 'granted') return snack('Permesso notifiche negato');
  const reg = await navigator.serviceWorker.ready;
  const sub = await reg.pushManager.getSubscription() || await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: b64ToBytes(VAPID_PUBLIC) });
  save(PUSH_KEY, sub.toJSON());
  renderRules();
  snack('Notifiche attive su questo telefono: ora copia la configurazione');
}
function remindersCard() {
  const n = state.notif, sub = load(PUSH_KEY, null);
  const perm = 'Notification' in window ? Notification.permission : 'unsupported';
  const sw = (id, on) => `<button class="switch" role="switch" aria-checked="${on}" data-notif-toggle="${id}"><span></span></button>`;
  const time = (id, v) => `<input class="time" type="time" data-notif="${id}" value="${v}">`;
  return `
    <div class="section-title">Promemoria</div>
    <div class="card reminders">
      <div class="rem-row"><div class="grow"><b>Pesata</b><div class="muted small">${DAY_NAMES[state.weighDay]}, ${state.weighEvery === 1 ? 'ogni settimana' : 'ogni 2 settimane'}</div></div>${time('weighTime', n.weighTime)}${sw('weigh', n.weigh)}</div>
      <div class="rem-row"><div class="grow"><b>Acqua</b><div class="muted small">dalle
        ${time('waterFrom', n.waterFrom)} alle ${time('waterTo', n.waterTo)} ogni
        <select data-notif="waterEvery">${[60, 90, 120, 180].map(m => `<option value="${m}"${Number(n.waterEvery) === m ? ' selected' : ''}>${m < 120 ? m + ' min' : m / 60 + ' h'}</option>`).join('')}</select></div></div>${sw('water', n.water)}</div>
      <div class="rem-row"><div class="grow"><b>Check-in mensile</b><div class="muted small">giorno
        <select data-notif="checkinDay">${[...Array(28)].map((_, i) => `<option${Number(n.checkinDay) === i + 1 ? ' selected' : ''}>${i + 1}</option>`).join('')}</select> del mese</div></div>${time('checkinTime', n.checkinTime)}${sw('checkin', n.checkin)}</div>
      <ol class="steps">
        <li class="${sub && perm === 'granted' ? 'done' : ''}">${sub && perm === 'granted' ? 'Notifiche attive su questo telefono ✓' : '<button class="filled-btn" data-push="enable">Attiva notifiche</button>'}</li>
        <li>Dopo ogni modifica: <button class="tonal-btn" data-push="copy"${sub ? '' : ' disabled'}>Copia configurazione</button></li>
        <li><a class="text-btn" href="${CONFIG_EDIT_URL}" target="_blank" rel="noopener">Apri config su GitHub ↗</a> incolla tutto al posto del testo e premi “Commit changes”.</li>
      </ol>
      <div class="form-actions" style="justify-content:flex-start;margin-top:4px"><button class="text-btn" data-push="test"${perm === 'granted' ? '' : ' disabled'}>Invia notifica di prova</button></div>
      <p class="muted small" style="margin:8px 0 0">Gli orari possono arrivare con qualche minuto di ritardo (GitHub Actions, gratis).</p>
    </div>`;
}

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
    ${remindersCard()}
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
      const txt = shopText();
      navigator.clipboard.writeText(txt).then(() => snack('Lista copiata: incollala in Bring'), () => snack('Copia non riuscita'));
      return;
    }
    const pu = t.closest('[data-push]');
    if (pu) {
      if (pu.dataset.push === 'enable') enablePush().catch(err => snack('Errore: ' + err.message));
      if (pu.dataset.push === 'copy') navigator.clipboard.writeText(JSON.stringify(pushConfig(), null, 2)).then(() => snack('Configurazione copiata'));
      if (pu.dataset.push === 'test') navigator.serviceWorker.ready.then(r => r.showNotification('💧 Prova', { body: 'Le notifiche funzionano.', icon: 'icons/icon-192.png', badge: 'icons/icon-192.png', tag: 'test' }));
      return;
    }
    const nt = t.closest('[data-notif-toggle]');
    if (nt) { state.notif[nt.dataset.notifToggle] = !state.notif[nt.dataset.notifToggle]; persist(); renderRules(); return; }
    if (t.closest('[data-go-checkin]')) { state.tab = 'weight'; render(); scrollTo(0, 0); const f = $('#ckKg'); if (f) f.focus(); return; }
    const dck = t.closest('[data-del-ck]');
    if (dck) { delete checkins[dck.dataset.delCk]; save(CHECKIN_KEY, checkins); renderWeight(); snack('Check-in eliminato'); return; }
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
      const blob = new Blob([JSON.stringify({ weights: userWeights, water, checkins }, null, 1)], { type: 'application/json' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob); a.download = `dieta-backup-${keyOf(today())}.json`; a.click();
      setTimeout(() => URL.revokeObjectURL(a.href), 1000);
    }
  });
  main.addEventListener('submit', e => {
    if (e.target.id === 'ckForm') {
      e.preventDefault();
      const num = id => { const v = parseFloat(String($(id).value).replace(',', '.')); return Number.isFinite(v) ? v : null; };
      const d = $('#ckDate').value, kg = num('#ckKg');
      if (!d || !(kg >= 30 && kg <= 250)) return snack('Controlla data e peso');
      let fm = num('#ckFm'), fmEst = false;
      const waist = num('#ckWaist'), neck = num('#ckNeck');
      if (fm == null && waist && neck) {
        const bf = navyBodyFat(waist, neck, DATA.height);
        if (bf > 3 && bf < 60) { fm = Math.round(kg * bf) / 100; fmEst = true; }
      }
      checkins[d.slice(0, 7)] = { d, kg: Math.round(kg * 10) / 10, fm, fmEst, waist, neck, hips: num('#ckHips') };
      save(CHECKIN_KEY, checkins);
      userWeights = userWeights.filter(w => w.d !== d).concat({ d, kg: Math.round(kg * 10) / 10 }).sort((a, b) => a.d.localeCompare(b.d));
      save(WEIGHTS_KEY, userWeights);
      renderWeight(); scrollTo(0, 0); snack('Check-in salvato');
      checkNewAchievements();
      return;
    }
    if (e.target.id !== 'wForm') return;
    e.preventDefault();
    const d = $('#wDate').value, kg = parseFloat(String($('#wKg').value).replace(',', '.'));
    if (!d || !(kg >= 30 && kg <= 250)) return snack('Controlla data e peso');
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
    if (t.dataset.notif) {
      if (t.type === 'time' && !/^\d{2}:\d{2}$/.test(t.value)) { t.value = state.notif[t.dataset.notif]; snack('Scegli un orario'); return; }
      state.notif[t.dataset.notif] = t.value; persist(); return;
    }
    if (t.id === 'goalKg') {
      const v = parseFloat(String(t.value).replace(',', '.'));
      state.goalKg = v >= 40 && v <= 200 ? Math.round(v * 2) / 2 : null;
      persist(); renderWeight(); checkNewAchievements();
      return;
    }
    if (t.id === 'weighEvery') {
      state.weighEvery = Number(t.value); state.weighAnchor = keyOf(weekStart(today()));
      persist(); renderWeight(); return;
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
      if (obj.checkins && typeof obj.checkins === 'object') { checkins = Object.assign({}, obj.checkins, checkins); save(CHECKIN_KEY, checkins); }
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
  addEventListener('resize', () => { clearTimeout(rt); rt = setTimeout(() => state.tab === 'weight' && drawCharts(), 150); });
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
  const q = new URLSearchParams(location.search);
  if (q.has('tab')) state.tab = q.get('tab');
  if (q.has('water')) { state.tab = 'plan'; state.view = 'day'; state.date = keyOf(today()); }
  bind();
  render();
  if (q.has('water')) { setWater(keyOf(today()), (water[keyOf(today())] || 0) + 1); snack('+1 bicchiere d’acqua'); }
  if ([...q.keys()].length) history.replaceState(null, '', location.pathname);
  if ('serviceWorker' in navigator) navigator.serviceWorker.register('./sw.js').catch(() => {});
}

init();
