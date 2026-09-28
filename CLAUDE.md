# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

"La mia dieta": a static PWA (plain HTML/CSS/JS, no build step, no runtime dependencies) showing a diet plan by day / week (Mon–Sun) / month, plus weight tracking, water tracker, monthly check-ins, achievements, a shopping list, and push reminders. UI text is Italian. Published on GitHub Pages at https://davideginna.github.io/honeypot/ (public repo) — it is served under the `/honeypot/` subpath, so every URL (fetches, manifest `start_url`/`scope`, SW precache list, SW registration) must stay **relative**.

The parent folder (`../`) holds the owner's private medical documents (PDFs, .xls, dietitian emails). Never copy or commit anything from there into this repo.

## Commands

```bash
npm test                                   # app tests: unit + e2e in headless Chrome (Node >= 22, google-chrome)
node --test tests/unit.test.mjs            # one file
node --test --test-name-pattern="water" tests/e2e.test.mjs   # single test by name
cd push && npm ci && npm test              # push scheduler tests (node:test)
cd push && node send.mjs --dry-run --now=2026-09-28T06:05:00Z   # print reminders due, send nothing
```

No bundler/linter. Quick syntax check: `node --check app.js`. Local preview: serve the **parent** directory (e.g. `python3 -m http.server` from `..`) and open `/honeypot/` to reproduce the Pages subpath; `tests/harness.mjs` does the same with its own server. Override the browser binary with `CHROME=...`.

Deploy = push to `main` (Pages serves the repo root). **Bump `CACHE` in `sw.js` on every deploy**, otherwise installed clients keep the old cached app (SW is network-first with cache fallback). CI (`.github/workflows/test.yml`) runs both test suites on every push.

## Architecture

- `app.js` — the whole app, a single classic script. Top-level `function`s/`const`s are intentionally global: the tests call them directly via CDP `Runtime.evaluate` (e.g. `formatQty`, `phaseFor`, `aggregate`, `isWeighDay`, `pushConfig`, `navyBodyFat`). Renaming or wrapping them in a module breaks the tests.
  - Rendering is string templates into `#main`; one delegated click/change/submit handler set in `bind()` dispatches on `data-*` attributes.
  - `state` (tab, view, date, plan override, theme/color, weigh-in day/frequency/anchor, notification prefs, goal weight) persists to `localStorage` key `dieta.state`; other user data under `dieta.weights`, `dieta.water`, `dieta.checkins`, `dieta.achievements`, `dieta.pushsub`. All storage access goes through `load`/`save` (try/catch). There is no backend: user data lives only on the device (Esporta/Importa JSON backup).
  - Dates: always local (`keyOf`/`parseKey`), never `toISOString()`. `dow()` is Monday = 0; weeks are Mon–Sun.
  - Plan selection: `phaseFor(date)` maps calendar month → plan via `DATA.monthMap` unless `state.phase` overrides it.
  - Portions: `formatQty` scales grams/ml by `REDUCTION` (0.8) for `pranzo`/`cena`/`veloce` at render time, skipping vegetables/condiments (`NO_REDUCE` regex) and "almeno N g". Source data stays unreduced; `aggregate()` applies the same rule for the shopping list.
  - Theming: Material 3 tonal schemes in `COLORS` (verde/celeste/rosa/rosso × light/dark) applied as CSS custom properties by `applyTheme()`; `app.css` holds only the green fallback tokens.
  - Charts: hand-written inline SVG (`lineChart`, `barChart`, `attachHover`), one y-axis per chart, no chart library.
- `data/diet.json` — plans (`phases[].days[0..6]` keyed by meal slot: sveglia, colazione, spuntino, pranzo, merenda, cena, sera, veloce), `monthMap`, rule sets, dietitian extras, historical weights and Bodygram body composition. It was generated once from the dietitian's .xls sheets; edit it directly now.
- `data/ingredients.json` — maps **each exact meal text** in `diet.json` to structured ingredients `{n, q, u: g|ml|pz|null, c: category, alt?}` for the Spesa tab. If you change any meal text in `diet.json`, update/add the matching key here (the unit test "ingredients cover every meal text" enforces this). Canonical names must be spelled identically across entries so they aggregate.
- `sw.js` — precache + network-first fetch, plus `push`/`notificationclick` handlers. Notification URLs are relative (`./?tab=weight`, `./?water=1`); `init()` in `app.js` consumes these query params, then clears them.
- `push/` — server side of reminders with no server: `.github/workflows/push.yml` runs every 15 min, `send.mjs` reads `push/config.json` (subscriptions + schedule), computes due reminders with `schedule.mjs` (`dueReminders(config, fromMs, toMs]`, DST-aware via `Intl`, 3h window cap, last-run state kept in the Actions cache) and sends with `web-push`. VAPID public key is hardcoded in both `app.js` (`VAPID_PUBLIC`) and `push.yml`; the private key is the repo secret `VAPID_PRIVATE_KEY`. The user regenerates `push/config.json` from the app (Regole → Promemoria → "Copia configurazione") and pastes it in the GitHub web editor, so `pushConfig()` in `app.js` and the schema read by `schedule.mjs` must stay in sync (weigh `day` is 0 = Monday; `everyWeeks` + Monday `anchor` for biweekly weigh-ins). Send failures are logged, not fatal, to avoid failure-email floods. The workflow also makes a monthly keepalive commit so GitHub doesn't disable the schedule.
- `tests/harness.mjs` — dependency-free test harness: static server mimicking the Pages subpath + headless Chrome driven over CDP with Node's global `WebSocket`. `unit.test.mjs` evaluates app functions in the page; `e2e.test.mjs` drives real flows at 390px width (reload persistence, offline via the SW, deep links, no console errors).
