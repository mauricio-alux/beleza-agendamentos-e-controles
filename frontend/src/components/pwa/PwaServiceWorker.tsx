"use client";

import { useEffect } from "react";
import { pwaLog } from "./pwa-diagnostics";

let registrationPromise: Promise<ServiceWorkerRegistration> | null = null;

function registerOnce() {
  if (registrationPromise) return;
  pwaLog("service worker registration attempted");
  registrationPromise = navigator.serviceWorker.register("/sw.js");
  registrationPromise.then((registration) => {
    pwaLog("service worker registered");
    registration.update().catch(() => pwaLog("service worker update failed"));
  }).catch(() => {
    registrationPromise = null;
    pwaLog("service worker registration failed");
  });
}

export function PwaServiceWorker() {
  useEffect(() => {
    if (!window.isSecureContext || !("serviceWorker" in navigator)) return;
    pwaLog(document.head.querySelector('link[rel="manifest"]') ? "manifest detected" : "manifest not detected");
    const reportController = () => pwaLog(navigator.serviceWorker.controller
      ? "service worker controlling page" : "service worker not controlling page");
    reportController();
    navigator.serviceWorker.addEventListener("controllerchange", reportController);
    if (document.readyState === "complete") registerOnce();
    else window.addEventListener("load", registerOnce, { once: true });
    return () => {
      window.removeEventListener("load", registerOnce);
      navigator.serviceWorker.removeEventListener("controllerchange", reportController);
    };
  }, []);

  return null;
}
