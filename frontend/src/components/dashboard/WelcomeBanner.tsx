import { Sparkles } from "lucide-react";
import type { DashboardSnapshot } from "@/services/dashboard.service";
import { APP_BRAND } from "@/config/app-brand";

type WelcomeBannerProps = {
  snapshot: DashboardSnapshot;
};

export function WelcomeBanner({ snapshot }: WelcomeBannerProps) {
  const trialDays = snapshot.subscription?.trial?.days_remaining;

  return (
    <section className="relative min-w-0 overflow-hidden rounded-[1.5rem] border border-white/80 bg-gradient-to-br from-white via-secondary to-white p-5 shadow-glow sm:rounded-[1.75rem] sm:p-6">
      <div className="absolute right-4 top-6 h-20 w-20 rounded-full bg-glow/35 blur-3xl sm:h-24 sm:w-24" />
      <div className="relative flex min-w-0 flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
        <div className="min-w-0 max-w-2xl space-y-3">
          <span className="inline-flex max-w-full items-center gap-2 rounded-full bg-white px-3 py-2 text-[11px] font-bold uppercase tracking-[0.16em] text-accent shadow-sm sm:px-4 sm:text-xs sm:tracking-[0.2em]">
            <Sparkles className="h-4 w-4" />
            <span className="truncate">Hub operacional</span>
          </span>
          <div>
            <h1 className="max-w-full break-words font-display text-2xl leading-tight text-foreground sm:text-4xl">
              {snapshot.salonName} esta pronto para operar.
            </h1>
            <p className="mt-2 max-w-full break-words text-sm leading-6 text-muted-foreground sm:text-base">
              Bem-vindo, {snapshot.userName}. O {APP_BRAND.appName} centraliza sua rotina para deixar o salao mais organizado,
              profissional e facil de crescer.
            </p>
          </div>
        </div>
        <div className="min-w-0 rounded-[1.25rem] border border-white/80 bg-white/80 p-4 shadow-sm lg:w-64 lg:flex-none">
          <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-muted-foreground sm:text-xs sm:tracking-[0.18em]">Plano atual</p>
          <p className="mt-2 truncate text-base font-bold text-foreground sm:text-lg">
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
