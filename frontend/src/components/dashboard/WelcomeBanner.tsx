import { Sparkles } from "lucide-react";
import type { DashboardSnapshot } from "@/services/dashboard.service";

type WelcomeBannerProps = {
  snapshot: DashboardSnapshot;
};

export function WelcomeBanner({ snapshot }: WelcomeBannerProps) {
  const trialDays = snapshot.subscription?.trial?.days_remaining;

  return (
    <section className="relative overflow-hidden rounded-[1.75rem] border border-white/80 bg-gradient-to-br from-white via-secondary to-white p-5 shadow-glow sm:p-6">
      <div className="absolute right-6 top-6 h-24 w-24 rounded-full bg-glow/35 blur-3xl" />
      <div className="relative flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
        <div className="max-w-2xl space-y-3">
          <span className="inline-flex items-center gap-2 rounded-full bg-white px-4 py-2 text-xs font-bold uppercase tracking-[0.2em] text-accent shadow-sm">
            <Sparkles className="h-4 w-4" />
            Hub operacional
          </span>
          <div>
            <h1 className="font-display text-3xl leading-tight text-foreground sm:text-4xl">
              {snapshot.salonName} esta pronto para operar.
            </h1>
            <p className="mt-2 text-sm leading-6 text-muted-foreground sm:text-base">
              Bem-vindo, {snapshot.userName}. O Bellory centraliza sua rotina para deixar o salao mais organizado,
              profissional e facil de crescer.
            </p>
          </div>
        </div>
        <div className="rounded-[1.35rem] border border-white/80 bg-white/80 p-4 shadow-sm">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-muted-foreground">Plano atual</p>
          <p className="mt-2 text-lg font-bold text-foreground">
            {snapshot.subscription?.plano?.nome || "Plano inicial"}
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            {trialDays !== null && trialDays !== undefined
              ? `${trialDays} dias de trial restantes`
              : `Status: ${snapshot.tenantStatus}`}
          </p>
        </div>
      </div>
    </section>
  );
}
