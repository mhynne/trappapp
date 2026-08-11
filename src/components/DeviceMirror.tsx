"use client";

import { useEffect } from "react";

import { restoreIdentity } from "@/app/actions";

const STORAGE_KEY = "trapp_device";

/**
 * Enhets-IDen ligger i en httpOnly-informasjonskapsel som nettleseren kan finne på
 * å slette. Vi speiler den i localStorage, og gjenoppretter kapselen hvis den blir
 * borte – ellers mister folk poengene sine uten grunn.
 */
export function DeviceMirror({ deviceToken }: { deviceToken: string | null }) {
  useEffect(() => {
    if (!deviceToken) return;

    let stored: string | null = null;
    try {
      stored = window.localStorage.getItem(STORAGE_KEY);
    } catch {
      return; // Privat nettlesing e.l. – da lever vi med kapselen alene.
    }

    if (!stored) {
      window.localStorage.setItem(STORAGE_KEY, deviceToken);
      return;
    }

    if (stored === deviceToken) return;

    restoreIdentity(stored).then((result) => {
      if (result.restored) {
        window.location.reload();
      } else {
        // Den lagrede IDen hører ikke til noen deltaker – la kapselen vinne.
        window.localStorage.setItem(STORAGE_KEY, deviceToken);
      }
    });
  }, [deviceToken]);

  return null;
}
