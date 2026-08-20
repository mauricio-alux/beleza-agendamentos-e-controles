"use client";

import { RefreshCcw } from "lucide-react";
import { ActivityFeed } from "@/components/dashboard/ActivityFeed";
import { AgendaPreview } from "@/components/dashboard/AgendaPreview";
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
            title="Não foi possível carregar o painel"
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
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-muted-foreground">Atualização operacional</p>
          <p className="mt-1 text-sm text-muted-foreground">
            {lastUpdatedAt ? `Última leitura às ${lastUpdatedAt.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}` : "Atualização automática ativa"}
          </p>
        </div>
        <Button type="button" variant="outline" onClick={refresh} disabled={isRefreshing}>
          <RefreshCcw className={isRefreshing ? "mr-2 h-4 w-4 animate-spin" : "mr-2 h-4 w-4"} />
          Atualizar
        </Button>
      </div>

      <DashboardCard title="Pendências importantes" description="O que precisa de atenção para a operação seguir sem travar.">
        <NotificationsCenter snapshot={snapshot} />
      </DashboardCard>

      {!scopedProfessional ? (
        <DashboardCard title="Ações rápidas" description="Comece pelas operações mais frequentes do salão.">
          <QuickActions roleConfig={snapshot.roleConfig} />
        </DashboardCard>
      ) : null}

      <section className={scopedProfessional ? "grid gap-5" : "grid gap-5 xl:grid-cols-[0.9fr_1.1fr]"}>
        <DashboardCard title="Próximos atendimentos" description="Horários mais próximos para acompanhamento imediato.">
          <NextAppointments appointments={snapshot.agenda.next} />
        </DashboardCard>

        <DashboardCard title="Agenda do dia" description="Atendimentos de hoje, priorizando os próximos horários.">
          <AgendaPreview appointments={snapshot.agenda.today} />
        </DashboardCard>
      </section>

      <DashboardWidgetsRegistry snapshot={snapshot} />

      <OperationalDashboardPanels operational={snapshot.operational} />

      {!scopedProfessional ? (
        <DashboardCard title="Atividades recentes" description="Eventos já ocorridos no salão e na conta.">
          <ActivityFeed activities={snapshot.activity.activities} />
        </DashboardCard>
      ) : null}
    </div>
  );
}
