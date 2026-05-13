const CACHE_NAME = 'quizmundo-v9';

const ARCHIVOS = [
  './',
  './index.html',
  './styles.css',
  './game.js',
  './datos.js',
  './manifest.json',
  './icon-192.png',
  './icon-512.png',
  './Audio/musicafondo.mp3',
  './Audio/musicajuego.mp3',
  './Audio/click.mp3',
  './Audio/correcto.mp3',
  './Audio/incorrecto.mp3',
  './Audio/tiempo.mp3',
];

// Instalar: guardar todos los archivos en caché
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(ARCHIVOS))
  );
  self.skipWaiting();
});

// Activar: borrar cachés viejas
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// Fetch: responder desde caché, si no desde red
self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request).then(cached => cached || fetch(event.request))
  );
});