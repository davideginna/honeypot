#!/usr/bin/env node
// Sends due reminders to every subscription in config.json.
// Usage: node send.mjs [--dry-run] [--now=<ISO date>]
// Env: PUSH_STATE (state file path), VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY.
// Never logs subscription endpoints or keys.

import { readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join, resolve } from 'node:path';
import { dueReminders } from './schedule.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const SUBJECT = 'https://davideginna.github.io/honeypot/';
const TTL = 3600;
const DEFAULT_LOOKBACK_MS = 30 * 60 * 1000;

const args = process.argv.slice(2);
const dryRun = args.includes('--dry-run');
const nowArg = args.find((a) => a.startsWith('--now='));
const now = nowArg ? Date.parse(nowArg.slice('--now='.length)) : Date.now();
if (!Number.isFinite(now)) {
  console.error('Invalid --now value');
  process.exit(2);
}

const statePath = resolve(process.env.PUSH_STATE || join(HERE, '..', 'push-state.json'));

async function readState() {
  try {
    const s = JSON.parse(await readFile(statePath, 'utf8'));
    if (Number.isFinite(s?.lastRun) && s.lastRun < now) return s.lastRun;
  } catch {
    /* missing or invalid → default */
  }
  return now - DEFAULT_LOOKBACK_MS;
}

const config = JSON.parse(await readFile(join(HERE, 'config.json'), 'utf8'));
const subs = Array.isArray(config.subscriptions)
  ? config.subscriptions.filter((s) => s && s.endpoint && s.keys?.p256dh && s.keys?.auth)
  : [];
const lastRun = await readState();
let due = [];
try {
  due = dueReminders(config, lastRun, now);
} catch (err) {
  // A malformed config must not fail every scheduled run.
  console.log(`config error: ${err.message}`);
}

console.log(
  `window ${new Date(lastRun).toISOString()} → ${new Date(now).toISOString()}; ` +
    `subscriptions: ${subs.length}; due: ${due.length}${due.length ? ` [${due.map((r) => r.tag).join(', ')}]` : ''}`,
);

if (dryRun) {
  for (const r of due) console.log(JSON.stringify(r));
  console.log('dry run: nothing sent, state not updated');
  process.exit(0);
}

let sent = 0, expired = 0, failed = 0;

if (due.length && subs.length) {
  const { default: webpush } = await import('web-push');
  const pub = process.env.VAPID_PUBLIC_KEY;
  const priv = process.env.VAPID_PRIVATE_KEY;
  if (!pub || !priv) {
    console.error('VAPID_PUBLIC_KEY / VAPID_PRIVATE_KEY not set');
    process.exit(1);
  }
  webpush.setVapidDetails(SUBJECT, pub, priv);

  for (const r of due) {
    const urgency = r.tag === 'water' ? 'normal' : 'high';
    const payload = JSON.stringify(r);
    for (const [i, sub] of subs.entries()) {
      try {
        await webpush.sendNotification(sub, payload, { TTL, urgency });
        sent++;
      } catch (err) {
        const code = err?.statusCode;
        if (code === 404 || code === 410) {
          expired++;
          console.log(`[${r.tag}] subscription #${i}: subscription expired (${code})`);
        } else {
          failed++;
          console.log(`[${r.tag}] subscription #${i}: send failed (${code ?? err?.name ?? 'error'})`);
        }
      }
    }
  }
}

console.log(`sent: ${sent}; expired: ${expired}; failed: ${failed}`);

await writeFile(statePath, JSON.stringify({ lastRun: now }) + '\n');

// Failures are only logged: a red run every 15 minutes would flood the inbox with emails.
if (failed > 0) console.log(`${failed} send(s) failed; will retry at the next scheduled reminder`);
