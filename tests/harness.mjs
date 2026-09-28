// Test harness: static server that mimics GitHub Pages (/honeypot/ subpath) + headless Chrome over CDP.
// No dependencies: Node >= 22 (global WebSocket, fetch).
import { createServer } from 'node:http';
import { readFile, mkdtemp, rm } from 'node:fs/promises';
import { spawn } from 'node:child_process';
import { tmpdir } from 'node:os';
import { join, extname, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const TYPES = {
  '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json',
  '.webmanifest': 'application/manifest+json', '.png': 'image/png', '.svg': 'image/svg+xml',
};
const sleep = ms => new Promise(r => setTimeout(r, ms));

export async function startServer() {
  const server = createServer(async (req, res) => {
    const url = new URL(req.url, 'http://x');
    if (!url.pathname.startsWith('/honeypot/')) { res.writeHead(404).end(); return; }
    let p = url.pathname.slice('/honeypot/'.length) || 'index.html';
    if (p.endsWith('/')) p += 'index.html';
    try {
      const body = await readFile(join(ROOT, p));
      res.writeHead(200, { 'content-type': TYPES[extname(p)] || 'application/octet-stream', 'cache-control': 'no-cache' }).end(body);
    } catch { res.writeHead(404).end(); }
  });
  await new Promise(r => server.listen(0, '127.0.0.1', r));
  return { server, base: `http://127.0.0.1:${server.address().port}/honeypot/` };
}

export async function launch({ width = 390, height = 844, scheme = 'light' } = {}) {
  const profile = await mkdtemp(join(tmpdir(), 'dieta-test-'));
  const port = 9400 + Math.floor(Math.random() * 500);
  const chrome = spawn(process.env.CHROME || 'google-chrome', [
    '--headless=new', `--remote-debugging-port=${port}`, `--user-data-dir=${profile}`,
    '--no-first-run', '--no-default-browser-check', '--disable-gpu', '--no-sandbox', 'about:blank',
  ], { stdio: 'ignore' });
  let targets;
  for (let i = 0; i < 60 && !targets; i++) {
    await sleep(250);
    try { targets = await (await fetch(`http://127.0.0.1:${port}/json`)).json(); } catch { /* starting */ }
  }
  if (!targets) throw new Error('Chrome did not start');
  const ws = new WebSocket(targets.find(t => t.type === 'page').webSocketDebuggerUrl);
  await new Promise((r, j) => { ws.onopen = r; ws.onerror = j; });
  let id = 0;
  const pending = new Map();
  const errors = [];
  ws.onmessage = e => {
    const m = JSON.parse(e.data);
    if (m.id && pending.has(m.id)) { pending.get(m.id)(m); pending.delete(m.id); }
    if (m.method === 'Runtime.exceptionThrown') errors.push(m.params.exceptionDetails.exception?.description || m.params.exceptionDetails.text);
    if (m.method === 'Runtime.consoleAPICalled' && m.params.type === 'error') errors.push(m.params.args.map(a => a.value ?? a.description).join(' '));
  };
  const cmd = (method, params = {}) => new Promise(r => { const i = ++id; pending.set(i, r); ws.send(JSON.stringify({ id: i, method, params })); });
  await cmd('Runtime.enable');
  await cmd('Page.enable');
  await cmd('Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor: 1, mobile: true });
  await cmd('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-color-scheme', value: scheme }] });

  const page = {
    errors,
    cmd,
    // Evaluate an expression in the page; throws on page exceptions.
    async eval(expr) {
      const r = await cmd('Runtime.evaluate', { expression: expr, awaitPromise: true, returnByValue: true });
      if (r.result?.exceptionDetails) throw new Error('page eval: ' + (r.result.exceptionDetails.exception?.description || r.result.exceptionDetails.text));
      return r.result?.result?.value;
    },
    async goto(url) {
      await cmd('Page.navigate', { url });
      await page.waitFor(`typeof DATA !== 'undefined' && !!DATA && document.querySelector('#main').children.length > 0`);
    },
    async reload() {
      await cmd('Page.reload');
      await sleep(300);
      await page.waitFor(`typeof DATA !== 'undefined' && !!DATA && document.querySelector('#main').children.length > 0`);
    },
    async waitFor(expr, timeout = 8000) {
      const end = Date.now() + timeout;
      while (Date.now() < end) {
        try { if (await page.eval(`!!(${expr})`)) return; } catch { /* page navigating */ }
        await sleep(100);
      }
      throw new Error('timeout waiting for: ' + expr);
    },
    async click(sel) {
      const ok = await page.eval(`(() => { const el = document.querySelector(${JSON.stringify(sel)}); if (!el) return false; el.click(); return true; })()`);
      if (!ok) throw new Error('no element: ' + sel);
      await sleep(80);
    },
    text: sel => page.eval(`document.querySelector(${JSON.stringify(sel)})?.textContent ?? null`),
    count: sel => page.eval(`document.querySelectorAll(${JSON.stringify(sel)}).length`),
    async offline(on) {
      await cmd('Network.enable');
      await cmd('Network.emulateNetworkConditions', { offline: on, latency: 0, downloadThroughput: -1, uploadThroughput: -1 });
    },
    async close() {
      try { ws.close(); } catch { /* closed */ }
      chrome.kill();
      await sleep(200);
      await rm(profile, { recursive: true, force: true }).catch(() => {});
    },
  };
  return page;
}
