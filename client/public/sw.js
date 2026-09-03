// ============================================================
// SERVICE WORKER
//
// Guarda el armazon de la app para que abra sin senal. Los datos
// NO se cachean: mostrar cifras viejas en un sistema contable es
// peor que no mostrar nada, porque la persona toma decisiones con
// numeros que ya no son ciertos.
//
// Los movimientos creados sin senal viven en IndexedDB (ver
// lib/conexion.js) y se envian al reconectar.
// ============================================================

const VERSION = 'gestione-v1';
const ESENCIALES = ['/', '/index.html', '/manifest.webmanifest'];

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(VERSION).then((c) => c.addAll(ESENCIALES)).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches
      .keys()
      .then((claves) => Promise.all(claves.filter((k) => k !== VERSION).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url);

  // Nunca cachear la API: los datos financieros se piden frescos.
  if (url.pathname.startsWith('/api/')) return;
  if (e.request.method !== 'GET') return;

  // Navegacion: red primero, cache como respaldo si no hay senal.
  if (e.request.mode === 'navigate') {
    e.respondWith(
      fetch(e.request).catch(() => caches.match('/index.html'))
    );
    return;
  }

  // Recursos estaticos: cache primero, mas rapido y ahorra datos
  // moviles, que en el Distrito 6 se pagan.
  e.respondWith(
    caches.match(e.request).then(
      (guardado) =>
        guardado ??
        fetch(e.request).then((respuesta) => {
          if (respuesta.ok && url.origin === self.location.origin) {
            const copia = respuesta.clone();
            caches.open(VERSION).then((c) => c.put(e.request, copia));
          }
          return respuesta;
        })
    )
  );
});
