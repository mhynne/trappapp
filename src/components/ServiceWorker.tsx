"use client";

import { useEffect } from "react";

export function ServiceWorker() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production") return;
    if (!("serviceWorker" in navigator)) return;

    navigator.serviceWorker.register("/sw.js").catch(() => {
      // Uten service worker mister vi bare offline-siden. Ikke verdt å plage brukeren.
    });
  }, []);

  return null;
}
