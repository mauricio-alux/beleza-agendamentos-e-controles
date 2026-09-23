"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { pwaLog } from "./pwa-diagnostics";

type InstallEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};
const InstallContext = createContext<{
  event: InstallEvent | null;
  standalone: boolean;
  ready: boolean;
  consume: () => void;
}>({ event: null, standalone: false, ready: false, consume: () => undefined });

// Retain eligibility before success mounts; never initiate installation here.
export function PwaInstallProvider({ children }: { children: ReactNode }) {
  const [event, setEvent] = useState<InstallEvent | null>(null);
  const [standalone, setStandalone] = useState(false);
  const [ready, setReady] = useState(false);
  useEffect(() => {
    const display = window.matchMedia("(display-mode: standalone)");
    const fullscreen = window.matchMedia("(display-mode: fullscreen)");
    const update = () => {
      const active = display.matches || fullscreen.matches
        || (navigator as Navigator & { standalone?: boolean }).standalone === true;
      setStandalone(active);
      pwaLog(active ? "standalone=true" : "standalone=false");
    };
    const capture = (incoming: Event) => {
      pwaLog("beforeinstallprompt received");
      incoming.preventDefault(); setEvent(incoming as InstallEvent);
      pwaLog("deferred prompt stored");
    };
    const installed = () => { pwaLog("appinstalled received"); setEvent(null); setStandalone(true); };
    update();
    setReady(true);
    window.addEventListener("beforeinstallprompt", capture);
    window.addEventListener("appinstalled", installed);
    display.addEventListener("change", update);
    fullscreen.addEventListener("change", update);
    return () => {
      window.removeEventListener("beforeinstallprompt", capture);
      window.removeEventListener("appinstalled", installed);
      display.removeEventListener("change", update);
      fullscreen.removeEventListener("change", update);
    };
  }, []);
  return <InstallContext.Provider value={{ event, standalone, ready, consume: () => {
    pwaLog("deferred prompt consumed"); setEvent(null);
  } }}>{children}</InstallContext.Provider>;
}
export function usePwaInstall() { return useContext(InstallContext); }
