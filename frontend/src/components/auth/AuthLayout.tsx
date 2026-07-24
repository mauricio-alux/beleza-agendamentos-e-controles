import Link from "next/link";
import { ArrowLeft, CalendarCheck, MessageCircle, ShieldCheck, Sparkles } from "lucide-react";
import { ReactNode } from "react";
import { APP_BRAND } from "@/config/app-brand";

type AuthLayoutProps = {
  children: ReactNode;
};

const highlights = [
  { icon: CalendarCheck, label: "Agenda inteligente" },
  { icon: MessageCircle, label: "WhatsApp operacional" },
  { icon: ShieldCheck, label: "Sessão segura" }
];

export function AuthLayout({ children }: AuthLayoutProps) {
  return (
    <main className="relative min-h-screen overflow-hidden bg-background">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_18%_18%,rgba(255,179,193,0.36),transparent_30%),radial-gradient(circle_at_85%_12%,rgba(123,75,255,0.15),transparent_28%),linear-gradient(135deg,#FFFDFC_0%,#FFE8E2_52%,#FFFDFC_100%)]" />
      <div className="relative mx-auto grid min-h-screen w-full max-w-7xl items-center gap-8 px-4 py-6 sm:px-6 lg:grid-cols-[0.92fr_1fr] lg:px-8">
        <section className="hidden min-h-[640px] flex-col justify-between rounded-[2rem] border border-white/70 bg-white/55 p-8 shadow-glow backdrop-blur-xl lg:flex">
          <Link
            href="/"
            className="inline-flex w-fit items-center gap-2 rounded-full border border-white/70 bg-white/70 px-4 py-2 text-sm font-semibold text-foreground shadow-sm transition hover:border-primary hover:text-primary"
          >
            <ArrowLeft className="h-4 w-4" />
            Voltar para o site
          </Link>

          <div className="space-y-7">
            <span className="inline-flex items-center gap-2 rounded-full bg-white px-4 py-2 text-xs font-bold uppercase tracking-[0.22em] text-accent shadow-soft">
              <Sparkles className="h-4 w-4" />
              Beauty Tech
            </span>
            <div className="max-w-lg space-y-4">
              <h1 className="font-display text-5xl leading-[1.05] text-foreground">
                Entre no {APP_BRAND.appName} com a leveza que sua operação merece.
              </h1>
              <p className="text-lg leading-8 text-muted-foreground">
                Acesse sua conta para continuar a configuração do salão, acompanhar clientes e preparar as
                automações que fazem a rotina fluir.
              </p>
            </div>
          </div>

          <div className="grid gap-3">
            {highlights.map(({ icon: Icon, label }) => (
              <div
                key={label}
                className="flex items-center gap-3 rounded-2xl border border-white/80 bg-white/75 p-4 text-sm font-semibold text-foreground shadow-sm"
              >
                <span className="grid h-10 w-10 place-items-center rounded-full bg-secondary text-primary">
                  <Icon className="h-5 w-5" />
                </span>
                {label}
              </div>
            ))}
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
