import { CalendarCheck, MessageCircle, TrendingUp, UsersRound } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { APP_BRAND } from "@/config/app-brand";

const dayItems = [
  { time: "09:00", name: "Corte + escova", client: "Marina", status: "Confirmado" },
  { time: "10:30", name: "Manicure", client: "Beatriz", status: "Lembrete enviado" },
  { time: "14:00", name: "Hidratação", client: "Camila", status: "Retorno sugerido" }
];

const metrics = [
  { label: "Clientes ativos", value: "128", icon: UsersRound },
  { label: "Ocupação", value: "82%", icon: CalendarCheck },
  { label: "Campanhas", value: "6", icon: MessageCircle },
  { label: "Faturamento", value: "R$ 8,4k", icon: TrendingUp }
];

export function DashboardMockup() {
  return (
    <div className="relative mx-auto w-full max-w-[42rem] animate-float-soft rounded-[2rem] border border-border bg-white p-3 shadow-blush">
      <div className="rounded-[1.5rem] border border-border bg-background p-4 sm:p-5">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
              Painel {APP_BRAND.appName}
            </p>
            <h2 className="mt-2 font-display text-2xl text-foreground">Studio Bella</h2>
          </div>
          <Badge className="border-primary/40 bg-primary/10 text-primary">Hoje</Badge>
        </div>

        <div className="mt-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
          {metrics.map((metric) => {
            const Icon = metric.icon;
            return (
              <div key={metric.label} className="rounded-2xl border border-border bg-white p-3">
                <Icon className="h-4 w-4 text-primary" aria-hidden="true" />
                <p className="mt-3 text-xl font-semibold text-foreground">{metric.value}</p>
                <p className="mt-1 text-[0.72rem] text-muted-foreground">{metric.label}</p>
              </div>
            );
          })}
        </div>

        <div className="mt-5 grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="rounded-2xl border border-border bg-white p-4">
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold">Agenda do dia</p>
              <span className="text-xs text-muted-foreground">3 próximos horários</span>
            </div>
            <div className="mt-4 grid gap-3">
              {dayItems.map((item) => (
                <div key={`${item.time}-${item.client}`} className="grid grid-cols-[3.5rem_1fr] gap-3 rounded-xl bg-muted p-3">
                  <p className="text-sm font-semibold text-primary">{item.time}</p>
                  <div>
                    <p className="text-sm font-semibold text-foreground">{item.name}</p>
                    <p className="text-xs text-muted-foreground">{item.client} · {item.status}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-2xl border border-border bg-[#2C2C2C] p-4 text-white">
            <p className="text-sm font-semibold">WhatsApp inteligente</p>
            <div className="mt-4 grid gap-3">
              <div className="ml-auto max-w-[88%] rounded-2xl rounded-tr-sm bg-primary p-3 text-sm">
                Oi, Ana! Seu horário amanhã às 10h está confirmado.
              </div>
              <div className="max-w-[88%] rounded-2xl rounded-tl-sm bg-white/12 p-3 text-sm text-white/90">
                Quero confirmar, obrigada!
              </div>
            </div>
            <div className="mt-5 rounded-2xl bg-white/10 p-3">
              <p className="text-xs text-white/70">Insight</p>
              <p className="mt-1 text-sm">12 clientes prontos para campanha de retorno.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
