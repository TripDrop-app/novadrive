"use client";

import { useEffect } from "react";

/** One-time clear of stale TripDrop / broken SW caches on tripdrop.app */
const CLEANUP_KEY = "peralna-sw-cleanup-v2";

export function SwCleanup() {
  useEffect(() => {
    if (typeof window === "undefined" || !("serviceWorker" in navigator)) return;

    async function run() {
      try {
        if (sessionStorage.getItem(CLEANUP_KEY) !== "done") {
          const regs = await navigator.serviceWorker.getRegistrations();
          for (const reg of regs) {
            await reg.unregister();
          }
          if ("caches" in window) {
            const keys = await caches.keys();
            await Promise.all(keys.map((k) => caches.delete(k)));
          }
          sessionStorage.setItem(CLEANUP_KEY, "done");
          window.location.reload();
          return;
        }

        const reg = await navigator.serviceWorker.getRegistration();
        if (reg) {
          await reg.update();
        }
      } catch {
        // ignore — app works without SW
      }
    }

    void run();
  }, []);

  return null;
}
