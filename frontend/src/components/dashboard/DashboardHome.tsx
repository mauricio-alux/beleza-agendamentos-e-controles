"use client";

import { RefreshCcw } from "lucide-react";
import { ActivityFeed } from "@/components/dashboard/ActivityFeed";
import { AgendaPreview } from "@/components/dashboard/AgendaPreview";
import { CampaignPreview } from "@/components/dashboard/CampaignPreview";
import { DashboardCard } from "@/components/dashboard/DashboardCard";
import { DashboardLoadingState } from "@/components/dashboard/DashboardLoadingState";
import { DashboardWidgetsRegistry } from "@/components/dashboard/DashboardWidgetsRegistry";
import { NextAppointments } from "@/components/dashboard/NextAppointments";
import { NotificationsCenter } from "@/components/dashboard/NotificationsCenter";
import { OperationalDashboardPanels } from "@/components/dashboard/OperationalDashboardPanels";
import { QuickActions } from "@/components/dashboard/QuickActions";
import { WelcomeBanner } from "@/components/dashboard/WelcomeBanner";
import { Button } from "@/components/ui/button";
import { FeedbackMessage } from "@/components/ui/feedback-message";
import { useDashboardContext } from "@/context/DashboardProvider";

export function DashboardHome() {
  const { snapshot, isLoading, isRefreshing, error, lastUpdatedAt, refresh } = useDashboardContext();

  if (isLoading) {
    return <DashboardLoadingState />;
  }

  if (!snapshot || error) {
    return (
      <DashboardCard>
        <div className="grid gap-4">
          <FeedbackMessage
            tone="error"
          title="Nao foi possivel carregar o painel"
            message={error || "Tente novamente em alguns instantes."}
          />
          <div>
            <Button type="button" variant="outline" onClick={refresh} disabled={isRefreshing}>
              <RefreshCcw className={isRefreshing ? "mr-2 h-4 w-4 animate-spin" : "mr-2 h-4 w-4"} />
              Atualizar
            </Button>
          </div>
        </div>
      </DashboardCard>
    );
  }

  const scopedProfessional = snapshot.roleConfig.permissions.isScopedProfessionalDashboard === true;

  return (
    <div className="grid gap-5">
      <WelcomeBanner snapshot={snapshot} />

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-muted-foreground">Atualizacao operacional</p>
          <p className="mt-1 text-sm text-muted-foreground">
            {lastUpdatedAt ? `Ultima leitura as ${lastUpdatedAt.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}` : "Polling leve ativo"}
          </p>
        </div>
        <Button type="button" variant="outline" onClick={refresh} disabled={isRefreshing}>
          <RefreshCcw className={isRefreshing ? "mr-2 h-4 w-4 animate-spin" : "mr-2 h-4 w-4"} />
          Atualizar
        </Button>
      </div>

      {!scopedProfessional ? (
        <DashboardCard title="Acoes rapidas" description="Comece pelas operacoes mais frequentes do salao.">
          <QuickActions roleConfig={snapshot.roleConfig} />
        </DashboardCard>
      ) : null}

      <DashboardWidgetsRegistry snapshot={snapshot} />

      <OperationalDashboardPanels operational={snapshot.operational} />

      <section className={snapshot.roleConfig.permissions.canViewCampaigns ? "grid gap-5 xl:grid-cols-[1.15fr_0.85fr]" : "grid gap-5"}>
        <DashboardCard title="Agenda do dia" description="Visao executiva dos horarios mais importantes.">
          <AgendaPreview appointments={snapshot.agenda.today} />
        </DashboardCard>

        {snapshot.roleConfig.permissions.canViewCampaigns ? (
          <DashboardCard title="Campanhas futuras" description="Espaco reservado para relacionamento e retorno de clientes.">
            <CampaignPreview campaigns={snapshot.activity.campaigns} />
          </DashboardCard>
        ) : null}
      </section>

      <section className={scopedProfessional ? "grid gap-5" : "grid gap-5 xl:grid-cols-[0.9fr_1.1fr]"}>
        <DashboardCard title="Proximos atendimentos" description="Resumo visual dos proximos horarios confirmados.">
          <NextAppointments appointments={snapshot.agenda.next} />
        </DashboardCard>

        {!scopedProfessional ? (
          <DashboardCard title="Atividades recentes" description="Eventos importantes do salao e da conta.">
            <ActivityFeed activities={snapshot.activity.activities} />
          </DashboardCard>
        ) : null}
      </section>

      <section className={scopedProfessional ? "grid gap-5" : "grid gap-5 xl:grid-cols-[0.95fr_1.05fr]"}>
        <DashboardCard title="Notificacoes" description="Alertas operacionais preparados para automacoes futuras.">
          <NotificationsCenter notifications={snapshot.activity.notifications} />
        </DashboardCard>

        {!scopedProfessional ? (
          <DashboardCard title="Arquitetura realtime-ready" description="Polling inicial agora, realtime preparado para evolucao.">
            <div className="grid gap-3 sm:grid-cols-3">
              {snapshot.realtime.future.map((item) => (
                <div key={item} className="rounded-2xl border border-border bg-background/80 p-3">
                  <p className="text-sm font-bold capitalize text-foreground">{item}</p>
                  <p className="mt-1 text-xs leading-5 text-muted-foreground">Preparado para etapa futura.</p>
                </div>
              ))}
            </div>
          </DashboardCard>
        ) : null}
      </section>
    </div>
  );
}
