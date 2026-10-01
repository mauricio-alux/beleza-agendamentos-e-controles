"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { APP_BRAND } from "@/config/app-brand";
import { Button } from "@/components/ui/button";
import { usePwaInstall } from "./PwaInstallProvider";
import { pwaLog, actualStandalone, previousInstall } from "./pwa-diagnostics";

export const DISMISS_COOLDOWN_MS = 1000 * 60 * 60 * 24 * 14;
const DISMISS_KEY = "pwa-install-dismissed-at";

export function InstallPwaPrompt({ eligible, placement = "recurring" }: {
  eligible: boolean;
  placement?: "booking-success" | "recurring" | "operational";
}) {
  const { event, standalone, ready, consume } = usePwaInstall();
  const [dismissed, setDismissed] = useState(false);
  const [instructions, setInstructions] = useState(false);
  const [isIos, setIsIos] = useState(false);
  const [pending, setPending] = useState(false);
  useEffect(() => {
    if (eligible && ready && !standalone && !dismissed) pwaLog("install CTA visible");
  }, [eligible, ready, standalone, dismissed]);
  useEffect(() => {
    try {
      const at = Number(window.localStorage.getItem(DISMISS_KEY) || 0);
      setDismissed(at > 0 && Date.now() - at < DISMISS_COOLDOWN_MS);
    } catch { /* Storage is optional for installation. */ }
    setIsIos(/iPad|iPhone|iPod/.test(navigator.userAgent)
      || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1));
  }, []);

  function dismiss() {
    try { window.localStorage.setItem(DISMISS_KEY, String(Date.now())); } catch { /* Optional preference. */ }
    setDismissed(true);
    setInstructions(false);
  }
  async function install() {
    let cooldown = false;
    try { const at = Number(window.localStorage.getItem(DISMISS_KEY) || 0); cooldown = at > 0 && Date.now() - at < DISMISS_COOLDOWN_MS; } catch { /* optional */ }
    pwaLog("install CTA clicked", {deferred:!!event,cooldown,runningStandalone:actualStandalone(),previous:previousInstall()});
    pwaLog(event ? "deferred prompt available=true" : "deferred prompt available=false");
    if (!event) { pwaLog("fallback displayed reason=no-event"); setInstructions(true); return; }
    setPending(true);
    const started = Date.now();
    try {
      pwaLog("prompt invoked");
      await event.prompt();
      pwaLog("prompt finished", {elapsedMs:Date.now()-started});
      const choice = await event.userChoice;
      pwaLog(choice.outcome === "accepted" ? "userChoice=accepted" : choice.outcome === "dismissed" ? "userChoice=dismissed" : "userChoice=unknown", {elapsedMs:Date.now()-started});
      if (choice.outcome === "dismissed") dismiss();
      else setDismissed(true);
    } catch (error) { pwaLog("prompt error", {errorType:error instanceof Error ? error.name : "UnknownError",elapsedMs:Date.now()-started}); pwaLog("fallback displayed reason=prompt-error"); setInstructions(true); }
    finally { consume(); setPending(false); }
  }

  if (!eligible || !ready || standalone) return null;
  if (dismissed) {
    return placement !== "booking-success" ? (
      <Button type="button" variant="ghost" onClick={() => setDismissed(false)}>Adicionar ao celular</Button>
    ) : <Link className="text-sm font-semibold text-primary underline" href="/acesso">Acessar meus horários</Link>;
  }
  return (
    <section className="rounded-lg border border-primary/20 bg-white p-4 text-left shadow-sm" aria-label="Acesso rápido no celular">
      <h2 className="text-sm font-bold text-foreground">Tenha acesso rápido da próxima vez</h2>
      <p className="mt-1 text-sm leading-6 text-muted-foreground">
        {placement === "operational"
          ? `Instale ${APP_BRAND.appName} neste dispositivo para acessar seu estabelecimento diretamente pela tela inicial.`
          : `Adicione ${APP_BRAND.appName} ao seu celular para acessar seus horários e fazer novos agendamentos sem precisar procurar este link novamente.`}
      </p>
      <div className="mt-3 flex flex-wrap gap-2">
        <Button type="button" disabled={pending} onClick={install}>Adicionar ao celular</Button>
        <Button type="button" variant="ghost" onClick={dismiss}>Agora não</Button>
      </div>
      {instructions ? (
        <p role="status" className="mt-3 text-sm leading-6 text-muted-foreground">
          {isIos
            ? "No Safari, toque em Compartilhar e depois em Adicionar à Tela de Início. Se abriu pelo WhatsApp, abra este link no Safari primeiro."
            : "No menu do navegador, procure Instalar aplicativo ou Adicionar à tela inicial e confirme. Se essa opção não aparecer, abra este link no Chrome. A disponibilidade depende do navegador."}
        </p>
      ) : null}
      {placement === "booking-success" ? (
        <Link className="mt-3 inline-block text-sm font-semibold text-primary underline" href="/acesso">Acessar meus horários</Link>
      ) : null}
    </section>
  );
}

