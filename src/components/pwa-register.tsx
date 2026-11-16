"use client";

import { useEffect } from "react";

/** Registers a static-asset-only service worker. Skips private API caching. */
export function PwaRegister() {
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!("serviceWorker" in navigator)) return;
    if (process.env.NODE_ENV === "development") return;

    void navigator.serviceWorker.register("/sw.js").catch(() => {
      // Non-fatal — app works without installability.
    });
  }, []);

  return null;
}
