const CACHE = 'dieta-v11';
const ASSETS = [
  './', 'index.html', 'app.css', 'app.js', 'manifest.webmanifest', 'data/diet.json', 'data/ingredients.json',
  'icons/icon-any.svg', 'icons/icon-192.png', 'icons/icon-512.png', 'icons/maskable-512.png', 'icons/apple-touch-icon.png',
];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(caches.keys()
    .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});

// network first (fresh plan when online), cache fallback (works offline)
self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET' || new URL(e.request.url).origin !== location.origin) return;
  e.respondWith(
    fetch(e.request)
      .then(res => {
        if (res.ok) { const copy = res.clone(); caches.open(CACHE).then(c => c.put(e.request, copy)); }
        return res;
      })
      .catch(() => caches.match(e.request, { ignoreSearch: true }).then(r => r || caches.match('index.html')))
  );
});

// reminders sent by the scheduled GitHub Action (push/send.mjs)
self.addEventListener('push', e => {
  let data = {};
  try { data = e.data ? e.data.json() : {}; } catch { data = { body: e.data && e.data.text() }; }
  const opts = {
    body: data.body || '', tag: data.tag || 'dieta', renotify: true,
    icon: 'icons/icon-192.png', badge: 'icons/icon-192.png',
    data: { url: data.url || './' },
  };
  if (data.tag === 'water') opts.actions = [{ action: 'drink', title: '+1 bicchiere' }];
  e.waitUntil(self.registration.showNotification(data.title || 'La mia dieta', opts));
});

self.addEventListener('notificationclick', e => {
  e.notification.close();
  const url = new URL(e.action === 'drink' ? './?water=1' : e.notification.data.url, self.registration.scope).href;
  e.waitUntil(clients.matchAll({ type: 'window', includeUncontrolled: true }).then(list => {
    const win = list.find(c => c.url.startsWith(self.registration.scope));
    return win ? win.navigate(url).then(c => c && c.focus()) : clients.openWindow(url);
  }));
});
