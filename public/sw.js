// Minimal service worker.
//
// Tidligere fanget denne alle hele sidelastinger (mode: "navigate") og hentet
// dem på nytt med fetch(), for å kunne vise en offline-side. Det viste seg å
// koste mer enn det smakte:
//
//   1. Manglet offline-siden i cachen, ga den Response.error(), som Safari
//      viste som «siden kan ikke nås» – appen så nede ut selv om den svarte.
//   2. Brukere på iOS måtte logge inn på nytt ved skanning, men ikke når de
//      klikket rundt inne i appen. Forskjellen er nøyaktig hva denne fanget:
//      skanning er en hel sidelasting, klikking inne i appen er det ikke.
//
// Appen henter ingenting av verdi fra å mellomlagre navigasjoner – turer må
// uansett registreres mot serveren. Derfor rører den dem ikke lenger, og
// nettleseren håndterer sidelastinger som normalt.
//
// Den er beholdt framfor å fjernes helt, slik at gamle versjoner som allerede
// er installert på folks telefoner blir byttet ut og ryddet opp etter.

const CACHE = "trappapp-v3";

self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.map((key) => caches.delete(key))))
      .then(() => self.clients.claim()),
  );
});

// Ingen fetch-lytter: forespørsler går rett til nettet, med informasjons-
// kapsler intakt.
