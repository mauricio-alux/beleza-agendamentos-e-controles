"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useContextAvailability } from "@/hooks/useContextAvailability";
import { setPreferredTenant } from "@/lib/recurring-access.storage";
import { resolveAppEntry } from "@/lib/internal-entry";
import { writeLastContext } from "@/lib/last-context";
import { APP_BRAND } from "@/config/app-brand";
import { Button } from "@/components/ui/button";

export function AppEntry() {
  const { client, professional, session, checking, refresh } = useContextAvailability();
  const router = useRouter();
  const intent = useSearchParams().get("context");
  const [state, setState] = useState<"loading" | "choice" | "error">("loading");

  useEffect(() => {
    if (checking) { setState("loading"); return; }
    let active = true;
    let run = 0;
    async function resolve() {
      const ticket = ++run;
      setState("loading");
      try {
        const destination = await resolveAppEntry({ client, professional, session }, intent);
        if (!active || ticket !== run) return;
        // Configuration must never redirect the dispatcher back to itself.
        if (destination === "/app" || destination?.startsWith("/app?") || destination?.startsWith("/app/")) {
          setState("error"); return;
        }
        if (destination) {
          if (destination === "/acesso" && client.state === "available" && client.slug) setPreferredTenant({ slug: client.slug, source: "access" });
          if (destination !== "/acesso" && destination !== "/login") writeLastContext("professional");
          router.replace(destination);
        }
        else setState("choice");
      } catch { if (active && ticket === run) setState("error"); }
    }
    void resolve();
    return () => { active = false; };
  }, [client, professional, session, checking, router, intent]);

  return (
    <main className="grid min-h-screen place-items-center bg-background p-6">
      <section className="w-full max-w-md space-y-5 rounded-2xl border border-border bg-white p-6 shadow-soft">
        <h1 className="font-display text-3xl">{APP_BRAND.appName}</h1>
        {state === "loading" ? <p role="status">Preparando seu acesso...</p> : (
          <>
            <h2 className="text-xl font-semibold">{state === "error" ? "Não foi possível confirmar seu acesso." : "Como deseja acessar?"}</h2>
            {state === "error" ? <Button onClick={() => void refresh()}>Tentar novamente</Button> : null}
            <div className="space-y-2">
              <Button asChild className="w-full"><Link href="/app?context=client">Acessar como cliente</Link></Button>
              <p className="text-sm text-muted-foreground">Agende serviços e acompanhe seus atendimentos.</p>
            </div>
            <div className="space-y-2">
              <Button asChild variant="outline" className="w-full"><Link href="/app?context=professional">Acessar área profissional</Link></Button>
              <p className="text-sm text-muted-foreground">Gerencie agenda, clientes e seu estabelecimento.</p>
            </div>
          </>
        )}
      </section>
    </main>
  );
}
