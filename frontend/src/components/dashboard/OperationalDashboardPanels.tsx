"use client";

import { AlertTriangle, Info, MessageCircleWarning, Scissors, UserRoundCheck } from "lucide-react";
import type { DashboardOperational, DashboardOperationalRanking } from "@/services/dashboard.service";
import { DashboardCard } from "@/components/dashboard/DashboardCard";
import { resolveEventLabel } from "@/lib/event-display";
import { getAppointmentStatusLabel } from "@/components/agenda/status";

type OperationalDashboardPanelsProps = {
  operational: DashboardOperational | null | undefined;
};

export function OperationalDashboardPanels({ operational }: OperationalDashboardPanelsProps) {
  if (!operational) return null;

  const overview = [
    {
      label: "Agendamentos do dia",
      value: operational.overview.scheduledToday,
      help: "Período: hoje. Todos os agendamentos do dia, incluindo cancelados e clientes que não compareceram."
    },
    {
      label: "Aguardando estabelecimento",
      value: operational.overview.pendingConfirmation,
      help: "Período: hoje. Atendimentos que ainda precisam de confirmação do estabelecimento ou revisão operacional."
    },
    {
      label: "Em andamento agora",
      value: operational.overview.inProgressToday,
      help: "Período: agora. Atendimentos confirmados ou aguardando cliente cujo horário atual está entre início e fim."
    },
    {
      label: "Concluídos hoje",
      value: operational.overview.completedToday,
      help: "Período: hoje. Atendimentos concluídos."
    },
    {
      label: "Cancelados hoje",
      value: operational.overview.cancellationsToday,
      help: "Período: hoje. Atendimentos cancelados."
    },
    {
      label: "Clientes que não compareceram hoje",
      value: operational.overview.noShowToday,
      help: "Período: hoje. Atendimentos em que o cliente não compareceu."
    },
    {
      label: "Taxa de comparecimento",
      value: `${operational.overview.attendanceRate}%`,
      help: "Período: hoje. Compara atendimentos concluídos com os casos em que o cliente não compareceu."
    },
    {
      label: "Ocupação da agenda",
      value: `${operational.overview.occupancyRate}%`,
      help: "Período: hoje. Atendimentos não cancelados em relação à capacidade diária estimada."
    }
  ];

  return (
    <section className="grid gap-5">
      <DashboardCard title="Visão operacional" description="Prioridades do ciclo de atendimento de hoje.">
        <div className="grid min-w-0 gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {overview.map((item) => (
            <MetricTile key={item.label} label={item.label} value={String(item.value)} help={item.help} />
          ))}
        </div>
      </DashboardCard>

      <section className="grid gap-5 xl:grid-cols-[1fr_1fr]">
        <DashboardCard title="Clientes e agenda" description="Sinais do ciclo operacional atual.">
          <div className="grid min-w-0 gap-3 sm:grid-cols-3">
            <MetricTile label="Clientes atendidos hoje" value={String(operational.overview.attendedClientsToday)} help="Período: hoje. Clientes distintos com atendimento concluído." icon={<UserRoundCheck className="h-4 w-4" />} />
            <MetricTile label="Clientes novos no mês" value={String(operational.clients.newThisMonth)} help="Período: mês atual. Clientes distintos no histórico operacional." icon={<UserRoundCheck className="h-4 w-4" />} />
            <MetricTile label="Clientes recorrentes no mês" value={String(operational.clients.recurringThisMonth)} help="Período: mês atual. Clientes com mais de um registro no histórico operacional." icon={<UserRoundCheck className="h-4 w-4" />} />
          </div>
          <RankingList title="Status da agenda" items={operational.agenda.statusCounts} labelFormatter={getAppointmentStatusLabel} />
        </DashboardCard>

        <DashboardCard title="WhatsApp operacional" description="Mensagens registradas hoje, com falhas e pendências em destaque.">
          <div className="grid min-w-0 gap-3 sm:grid-cols-3">
            <MetricTile label="Mensagens com erro hoje" value={String(operational.whatsapp.errors)} help="Período: hoje. Mensagens registradas com erro de processamento." icon={<AlertTriangle className="h-4 w-4" />} />
            <MetricTile label="Mensagens pendentes hoje" value={String(operational.whatsapp.pending)} help="Período: hoje. Mensagens registradas como pendentes." icon={<MessageCircleWarning className="h-4 w-4" />} />
            <MetricTile label="Mensagens processadas hoje" value={String(operational.whatsapp.sent)} help="Período: hoje. Mensagens preparadas ou registradas como processadas no ambiente atual." icon={<MessageCircleWarning className="h-4 w-4" />} />
          </div>
          <RankingList title="Eventos" items={operational.whatsapp.byEvent} labelFormatter={resolveEventLabel} />
        </DashboardCard>
      </section>

      <section className="grid gap-5 xl:grid-cols-[1fr_1fr]">
        <DashboardCard title="Serviços" description="Ranking do mês atual a partir do histórico de atendimentos.">
          <RankingList title="Mais realizados" items={operational.services.mostPerformed} icon={<Scissors className="h-4 w-4" />} />
          <RankingList title="Receita por serviço" items={operational.services.revenue} formatter={(value) => value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })} />
        </DashboardCard>

        <DashboardCard title="Profissionais" description="Ocupação e ocorrências do mês atual.">
          <RankingList title="Maior ocupação" items={operational.professionals.mostOccupied} />
          <RankingList title="Clientes que não compareceram por profissional" items={operational.professionals.noShow} />
        </DashboardCard>
      </section>
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
          Sem dados para o período.
        </div>
      )}
    </div>
  );
}
