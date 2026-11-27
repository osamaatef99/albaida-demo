// Albaida demo service worker: network first, cache fallback (offline shell)
const V='albaida-v6';
const FILES=["./", "index.html", "products.html", "offers.html", "finder.html", "services.html", "branches.html", "tools.html", "tips.html", "faq.html", "about.html", "contact.html", "roadmap.html", "privacy.html", "en.html", "en-products.html", "en-offers.html", "en-finder.html", "en-services.html", "en-branches.html", "en-tools.html", "en-tips.html", "en-faq.html", "en-about.html", "en-contact.html", "en-roadmap.html", "en-privacy.html", "404.html", "style.css", "app.js", "theme.js", "logo.svg", "favicon.svg", "icon-192.png"];
self.addEventListener('install', e => { e.waitUntil(caches.open(V).then(c => c.addAll(FILES)).then(() => self.skipWaiting())); });
self.addEventListener('activate', e => { e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== V).map(k => caches.delete(k)))).then(() => self.clients.claim())); });
self.addEventListener('fetch', e => {
  const r = e.request;
  if (r.method !== 'GET' || new URL(r.url).origin !== location.origin) return;
  e.respondWith(fetch(r).then(res => { if (res.ok) { const copy = res.clone(); caches.open(V).then(c => c.put(r, copy)); } return res; }).catch(() => caches.match(r).then(m => m || (r.mode === 'navigate' ? caches.match('404.html') : null)).then(m => m || new Response('', { status: 504, statusText: 'Offline' }))));
});
