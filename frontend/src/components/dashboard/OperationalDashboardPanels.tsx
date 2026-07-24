"use client";

import { AlertTriangle, CalendarClock, Info, MessageCircleWarning, Scissors, UserRoundCheck } from "lucide-react";
import type { DashboardOperational, DashboardOperationalRanking } from "@/services/dashboard.service";
import { DashboardCard } from "@/components/dashboard/DashboardCard";
import { resolveEventLabel } from "@/lib/event-display";

type OperationalDashboardPanelsProps = {
  operational: DashboardOperational | null | undefined;
};

export function OperationalDashboardPanels({ operational }: OperationalDashboardPanelsProps) {
  if (!operational) return null;

  const overview = [
    {
      label: "Agendamentos do dia",
      value: operational.overview.scheduledToday,
      help: "Formula: todos os agendamentos com data de hoje, incluindo cancelados e no-show."
    },
    {
      label: "Aguardando atendente",
      value: operational.overview.pendingConfirmation,
      help: "Formula: agendamentos de hoje com status pendente, pendente_atendente ou suspeito."
    },
    {
      label: "Concluidos hoje",
      value: operational.overview.completedToday,
      help: "Formula: agendamentos de hoje com status concluido."
    },
    {
      label: "Cancelados hoje",
      value: operational.overview.cancellationsToday,
      help: "Formula: agendamentos de hoje com status cancelado."
    },
    {
      label: "No-show hoje",
      value: operational.overview.noShowToday,
      help: "Formula: agendamentos de hoje com status no_show."
    },
    {
      label: "Em andamento agora",
      value: operational.overview.inProgressToday,
      help: "Formula: agendamentos confirmados ou pendentes do cliente cujo horario atual esta entre inicio e fim."
    },
    {
      label: "Taxa de comparecimento",
      value: `${operational.overview.attendanceRate}%`,
      help: "Formula: concluidos hoje / (concluidos hoje + no-show hoje)."
    },
    {
      label: "Ocupacao da agenda",
      value: `${operational.overview.occupancyRate}%`,
      help: "Formula: agendamentos de hoje nao cancelados / profissionais com agendamento no dia x 8 horarios."
    }
  ];

  return (
    <section className="grid gap-5">
      <DashboardCard title="Visao operacional" description="Indicadores consolidados pelo backend em uma unica leitura.">
        <div className="grid min-w-0 gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {overview.map((item) => (
            <MetricTile key={item.label} label={item.label} value={String(item.value)} help={item.help} />
          ))}
        </div>
      </DashboardCard>

      <section className="grid gap-5 xl:grid-cols-[1fr_1fr]">
        <DashboardCard title="Clientes e Agenda" description="Sinais do ciclo operacional atual.">
          <div className="grid min-w-0 gap-3 sm:grid-cols-3">
            <MetricTile label="Clientes concluidos hoje" value={String(operational.overview.attendedClientsToday)} help="Formula: clientes distintos com agendamento concluido hoje." icon={<UserRoundCheck className="h-4 w-4" />} />
            <MetricTile label="Clientes novos no mes" value={String(operational.clients.newThisMonth)} help="Formula: clientes distintos no historico operacional do mes atual." icon={<UserRoundCheck className="h-4 w-4" />} />
            <MetricTile label="Clientes recorrentes no mes" value={String(operational.clients.recurringThisMonth)} help="Formula: clientes com mais de um registro no historico operacional do mes atual." icon={<UserRoundCheck className="h-4 w-4" />} />
          </div>
          <RankingList title="Status da agenda" items={operational.agenda.statusCounts} />
        </DashboardCard>

        <DashboardCard title="WhatsApp operacional" description="Mensagens registradas em mensagens_whatsapp hoje.">
          <div className="grid min-w-0 gap-3 sm:grid-cols-3">
            <MetricTile label="WhatsApps enviados hoje" value={String(operational.whatsapp.sent)} help="Formula: mensagens_whatsapp criadas hoje com status_envio enviado." icon={<MessageCircleWarning className="h-4 w-4" />} />
            <MetricTile label="WhatsApps pendentes hoje" value={String(operational.whatsapp.pending)} help="Formula: mensagens_whatsapp criadas hoje com status_envio pendente." icon={<MessageCircleWarning className="h-4 w-4" />} />
            <MetricTile label="Erros de WhatsApp hoje" value={String(operational.whatsapp.errors)} help="Formula: mensagens_whatsapp criadas hoje com status_envio erro." icon={<AlertTriangle className="h-4 w-4" />} />
          </div>
          <RankingList title="Eventos" items={operational.whatsapp.byEvent} labelFormatter={resolveEventLabel} />
        </DashboardCard>
      </section>

      <section className="grid gap-5 xl:grid-cols-[1fr_1fr]">
        <DashboardCard title="Servicos" description="Ranking mensal a partir do historico de atendimentos.">
          <RankingList title="Mais realizados" items={operational.services.mostPerformed} icon={<Scissors className="h-4 w-4" />} />
          <RankingList title="Receita por servico" items={operational.services.revenue} formatter={(value) => value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })} />
        </DashboardCard>

        <DashboardCard title="Profissionais" description="Ocupacao e ocorrencias do mes atual.">
          <RankingList title="Maior ocupacao" items={operational.professionals.mostOccupied} />
          <RankingList title="No-show por profissional" items={operational.professionals.noShow} />
        </DashboardCard>
      </section>

      <DashboardCard title="Indicadores operacionais" description="Tempos medios e automacoes do ciclo de atendimento.">
        <div className="grid min-w-0 gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <MetricTile label="Criacao ate confirmacao" value={`${operational.operational.averageConfirmationMinutes} min`} help="Formula: media de minutos entre created_at e confirmado_em nos agendamentos do mes." icon={<CalendarClock className="h-4 w-4" />} />
          <MetricTile label="Confirmacao ate conclusao" value={`${operational.operational.averageConfirmationToCompletionMinutes} min`} help="Formula: media de minutos entre confirmado_em e concluido_em nos agendamentos do mes." icon={<CalendarClock className="h-4 w-4" />} />
          <MetricTile label="Lembretes operacionais enviados" value={String(operational.operational.remindersSent)} help="Formula: eventos de historico/status e mensagens WhatsApp do mes que contenham reminder." />
          <MetricTile label="Conclusoes automaticas" value={String(operational.operational.automaticCompletions)} help="Formula: registros de historico do mes com status_novo concluido e origem auto_completion." />
        </div>
      </DashboardCard>
    </section>
  );
}

function MetricTile({ label, value, icon, help }: { label: string; value: string; icon?: React.ReactNode; help?: string }) {
  return (
    <div className="min-h-24 min-w-0 rounded-2xl border border-border bg-background/80 p-4">
      <div className="flex items-start justify-between gap-3">
        <p className="min-w-0 break-words text-[11px] font-bold uppercase tracking-[0.1em] text-muted-foreground sm:text-xs sm:tracking-[0.14em]">{label}</p>
        <div className="flex flex-none items-center gap-2">
          {help ? (
            <span
              className="grid h-7 w-7 place-items-center rounded-full border border-border bg-white text-muted-foreground"
              title={help}
              aria-label={help}
            >
              <Info className="h-3.5 w-3.5" />
            </span>
          ) : null}
          {icon ? <span className="text-primary">{icon}</span> : null}
        </div>
      </div>
      <p className="mt-3 break-words text-2xl font-bold text-foreground">{value}</p>
    </div>
  );
}

function RankingList({
  title,
  items,
  icon,
  formatter = (value) => String(value),
  labelFormatter = (label) => label
}: {
  title: string;
  items: DashboardOperationalRanking[];
  icon?: React.ReactNode;
  formatter?: (value: number) => string;
  labelFormatter?: (label: string) => string;
}) {
  return (
    <div className="mt-5 grid gap-2">
      <p className="text-sm font-bold text-foreground">{title}</p>
      {items.length ? items.map((item) => (
        <div key={`${title}-${item.label}`} className="flex min-w-0 items-center justify-between gap-3 rounded-2xl border border-border bg-white px-3 py-2">
          <span className="inline-flex min-w-0 items-center gap-2 text-sm font-semibold text-foreground">
            {icon ? <span className="text-primary">{icon}</span> : null}
            <span className="min-w-0 break-words">{labelFormatter(item.label)}</span>
          </span>
          <span className="flex-none text-sm font-bold text-primary">{formatter(item.value)}</span>
        </div>
      )) : (
        <div className="rounded-2xl border border-dashed border-border bg-background/70 px-3 py-4 text-sm font-semibold text-muted-foreground">
          Sem dados para o periodo.
        </div>
      )}
    </div>
  );
}
