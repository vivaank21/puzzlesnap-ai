/**
 * sw.js — PuzzleSnap AI Service Worker
 * Caches the app shell (static assets) so the UI loads offline.
 * Captured images are NEVER cached here — they are transient in-memory
 * data URLs and must not persist in any browser storage.
 */

const CACHE = 'puzzlesnap-v1';

const SHELL = [
  '/',
  '/capture',
  '/play',
  '/leaderboard',
  '/analytics',
  '/about',
  '/help',
  '/settings',
  '/static/css/style.css',
  '/static/js/main.js',
  '/static/js/audio.js',
  '/static/js/gesture.js',
  '/static/js/puzzle.js',
];

// Install: pre-cache the shell
self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE).then((cache) => cache.addAll(SHELL))
  );
  self.skipWaiting();
});

// Activate: remove old caches
self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// Fetch: network-first for API routes (scores, settings, image processing),
// cache-first for shell assets.
self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url);

  // Never intercept API calls or camera/blob data
  if (url.pathname.startsWith('/api/') || e.request.method !== 'GET') {
    return; // fall through to network
  }

  e.respondWith(
    caches.match(e.request).then((cached) => {
      const networkFetch = fetch(e.request).then((res) => {
        if (res.ok && res.type === 'basic') {
          const clone = res.clone();
          caches.open(CACHE).then((c) => c.put(e.request, clone));
        }
        return res;
      });
      // Return cached copy immediately while updating in background
      return cached || networkFetch;
    })
  );
});