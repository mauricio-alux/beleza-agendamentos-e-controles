"use client";

import {
  CalendarDays,
  Clock3,
  Loader2,
  Megaphone,
  TrendingUp,
  UsersRound,
  WalletCards,
  WandSparkles
} from "lucide-react";
import { ActivityFeed } from "@/components/dashboard/ActivityFeed";
import { DashboardCard } from "@/components/dashboard/DashboardCard";
import { EmptyState } from "@/components/dashboard/EmptyState";
import { KPIWidget } from "@/components/dashboard/KPIWidget";
import { QuickActions } from "@/components/dashboard/QuickActions";
import { WelcomeBanner } from "@/components/dashboard/WelcomeBanner";
import { useDashboard } from "@/hooks/useDashboard";

export function DashboardHome() {
  const { snapshot, isLoading, error } = useDashboard();

  if (isLoading) {
    return (
      <div className="grid min-h-[52vh] place-items-center">
        <div className="flex items-center gap-3 rounded-2xl border border-border bg-white px-5 py-4 text-sm font-semibold text-muted-foreground shadow-soft">
          <Loader2 className="h-5 w-5 animate-spin text-primary" />
          Carregando indicadores...
        </div>
      </div>
    );
  }

  if (!snapshot || error) {
    return (
      <DashboardCard>
        <EmptyState
          icon={WandSparkles}
          title="Nao foi possivel carregar o painel"
          description={error || "Tente novamente em alguns instantes."}
          actionLabel="Atualizar"
        />
      </DashboardCard>
    );
  }

  return (
    <div className="grid gap-5">
      <WelcomeBanner snapshot={snapshot} />

      <DashboardCard title="Acoes rapidas" description="Comece pelas operacoes mais frequentes do salao.">
        <QuickActions />
      </DashboardCard>

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <KPIWidget
          label="Faturamento hoje"
          value={snapshot.kpis.faturamentoHoje}
          hint="Pronto para conectar aos recebimentos."
          icon={WalletCards}
          tone="primary"
        />
        <KPIWidget
          label="Clientes ativos"
          value={snapshot.kpis.clientesAtivos}
          hint="Base vinculada ao tenant atual."
          icon={UsersRound}
          tone="accent"
        />
        <KPIWidget
          label="Ocupacao"
          value={snapshot.kpis.ocupacao}
          hint="Indicador preparado para a agenda."
          icon={TrendingUp}
          tone="primary"
        />
        <KPIWidget
          label="Atendimentos hoje"
          value={snapshot.kpis.atendimentosHoje}
          hint="Sem atendimentos confirmados hoje."
          icon={CalendarDays}
          tone="neutral"
        />
      </section>

      <section className="grid gap-5 xl:grid-cols-[1.15fr_0.85fr]">
        <DashboardCard title="Agenda do dia" description="Visao executiva dos horarios mais importantes.">
          <div className="space-y-3">
            {snapshot.appointments.map((appointment) => (
              <div key={appointment.id} className="flex items-center gap-3 rounded-2xl border border-border bg-background/80 p-3">
                <span className="grid h-12 w-12 flex-none place-items-center rounded-full bg-secondary text-primary">
                  <Clock3 className="h-5 w-5" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="font-bold text-foreground">{appointment.time}</p>
                  <p className="truncate text-sm text-muted-foreground">{appointment.client}</p>
                </div>
                <div className="hidden text-right sm:block">
                  <p className="text-sm font-semibold text-foreground">{appointment.service}</p>
                  <p className="text-xs text-accent">{appointment.status}</p>
                </div>
              </div>
            ))}
          </div>
        </DashboardCard>

        <DashboardCard title="Campanhas futuras" description="Espaco reservado para relacionamento e retorno de clientes.">
          <EmptyState
            icon={Megaphone}
            title="Campanhas inteligentes"
            description="O Bellory ja esta preparado para campanhas, retorno de clientes e WhatsApp operacional."
            actionLabel="Nova campanha"
          />
        </DashboardCard>
      </section>

      <section className="grid gap-5 xl:grid-cols-[0.9fr_1.1fr]">
        <DashboardCard title="Proximos atendimentos" description="Resumo visual dos proximos horarios confirmados.">
          <EmptyState
            icon={CalendarDays}
            title="Nenhum atendimento confirmado"
            description="Assim que a agenda for ativada, os proximos horarios aparecem aqui."
            actionLabel="Novo agendamento"
          />
        </DashboardCard>

        <DashboardCard title="Atividades recentes" description="Eventos importantes do salao e da conta.">
          <ActivityFeed activities={snapshot.activities} />
        </DashboardCard>
      </section>
    </div>
  );
}
