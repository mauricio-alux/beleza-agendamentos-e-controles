import Link from "next/link";
import { ArrowLeft, CalendarCheck, MessageCircle, Sparkles, WandSparkles } from "lucide-react";
import { ReactNode } from "react";
import { APP_BRAND } from "@/config/app-brand";

type RegisterLayoutProps = {
  children: ReactNode;
};

const benefits = [
  "Trial criado automaticamente",
  "Salao pronto para configurar",
  "Agenda e WhatsApp preparados"
];

export function RegisterLayout({ children }: RegisterLayoutProps) {
  return (
    <main className="relative min-h-screen overflow-hidden bg-background">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_16%_14%,rgba(255,179,193,0.38),transparent_28%),radial-gradient(circle_at_84%_14%,rgba(123,75,255,0.16),transparent_28%),linear-gradient(135deg,#FFFDFC_0%,#FFE8E2_50%,#FFFDFC_100%)]" />
      <div className="relative mx-auto grid min-h-screen w-full max-w-7xl items-center gap-8 px-4 py-6 sm:px-6 lg:grid-cols-[0.9fr_1fr] lg:px-8">
        <section className="hidden min-h-[660px] flex-col justify-between rounded-[2rem] border border-white/70 bg-white/58 p-8 shadow-glow backdrop-blur-xl lg:flex">
          <Link
            href="/"
            className="inline-flex w-fit items-center gap-2 rounded-full border border-white/70 bg-white/75 px-4 py-2 text-sm font-semibold text-foreground shadow-sm transition hover:border-primary hover:text-primary"
          >
            <ArrowLeft className="h-4 w-4" />
            Voltar para o site
          </Link>

          <div className="space-y-7">
            <span className="inline-flex items-center gap-2 rounded-full bg-white px-4 py-2 text-xs font-bold uppercase tracking-[0.22em] text-accent shadow-soft">
              <Sparkles className="h-4 w-4" />
              Beauty Tech SaaS
            </span>
            <div className="max-w-lg space-y-4">
              <h2 className="font-display text-5xl leading-[1.05] text-foreground">
                Seu salao nasce pronto para crescer.
              </h2>
              <p className="text-lg leading-8 text-muted-foreground">
                Crie sua conta e deixe o {APP_BRAND.appName} montar a primeira estrutura: tenant, admin, trial,
                servicos iniciais e onboarding interno.
              </p>
            </div>
          </div>

          <div className="grid gap-3">
            {benefits.map((benefit, index) => {
              const Icon = index === 0 ? WandSparkles : index === 1 ? CalendarCheck : MessageCircle;
              return (
                <div key={benefit} className="flex items-center gap-3 rounded-2xl border border-white/80 bg-white/75 p-4 text-sm font-semibold text-foreground shadow-sm">
                  <span className="grid h-10 w-10 place-items-center rounded-full bg-secondary text-primary">
                    <Icon className="h-5 w-5" />
                  </span>
                  {benefit}
                </div>
              );
            })}
          </div>
        </section>

        <section className="mx-auto flex w-full max-w-md flex-col gap-5 py-8 sm:py-10 lg:max-w-lg">
          <Link
            href="/"
            className="inline-flex w-fit items-center gap-2 rounded-full border border-border bg-white/80 px-4 py-2 text-sm font-semibold text-muted-foreground shadow-sm transition hover:border-primary hover:text-primary lg:hidden"
          >
            <ArrowLeft className="h-4 w-4" />
            Voltar
          </Link>
          {children}
        </section>
      </div>
    </main>
  );
}
