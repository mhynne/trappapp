// Minimal service worker: appen skal installeres som PWA og gi en vennlig
// beskjed når nettet er borte. Vi mellomlagrer ikke sider – registrering av
// turer må gå mot serveren for at tidssjekkene skal virke.
const CACHE = "trappapp-v2";
const OFFLINE_URL = "/offline.html";

// Siste utvei hvis selv offline-siden mangler. Uten denne ville en tømt cache
// gi Response.error(), som nettleseren viser som «siden kan ikke nås» – altså
// som om appen var nede.
const FALLBACK = `<!doctype html><html lang="nb"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Uten nett – TrappApp</title>
<style>body{font-family:system-ui,sans-serif;background:#121412;color:#f4f6f3;
display:grid;place-items:center;min-height:100vh;margin:0;text-align:center;padding:24px}
a{color:#10b981}</style></head><body><div><h1>Får ikke kontakt</h1>
<p>Sjekk nettet og prøv igjen.</p><p><a href="/">Last inn på nytt</a></p></div></body></html>`;

async function cacheOfflinePage() {
  const cache = await caches.open(CACHE);
  try {
    await cache.add(OFFLINE_URL);
  } catch {
    // Offline-siden kunne ikke hentes nå. FALLBACK dekker tilfellet.
  }
}

self.addEventListener("install", (event) => {
  event.waitUntil(cacheOfflinePage());
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((key) => key !== CACHE).map((key) => caches.delete(key))),
      )
      // Legges inn på nytt her også, så en tømt cache reparerer seg selv.
      .then(cacheOfflinePage)
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET" || request.mode !== "navigate") return;

  event.respondWith(
    fetch(request).catch(async () => {
      const cache = await caches.open(CACHE);
      const cached = await cache.match(OFFLINE_URL);
      if (cached) return cached;

      // Siste forsøk på å hente den ferskt før vi gir opp.
      try {
        const fresh = await fetch(OFFLINE_URL);
        if (fresh.ok) {
          await cache.put(OFFLINE_URL, fresh.clone());
          return fresh;
        }
      } catch {
        // Nettet er virkelig borte.
      }

      return new Response(FALLBACK, {
        status: 503,
        headers: { "content-type": "text/html; charset=utf-8" },
      });
    }),
  );
});
