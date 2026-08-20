import {
  CalendarDays,
  Clock3,
  Landmark,
  Scissors,
  TrendingUp,
  UsersRound,
  WalletCards
} from "lucide-react";
import { KPIWidget } from "@/components/dashboard/KPIWidget";
import type { DashboardSnapshot } from "@/services/dashboard.service";

type DashboardWidgetsRegistryProps = {
  snapshot: DashboardSnapshot;
};

export function DashboardWidgetsRegistry({ snapshot }: DashboardWidgetsRegistryProps) {
  const widgets = snapshot.roleConfig.widgets;
  const canShowSaas = snapshot.roleConfig.permissions.canViewSaasMetrics;

  return (
    <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      {widgets.includes("revenue") ? (
        <KPIWidget
          label="Faturamento previsto hoje"
          value={snapshot.kpis.display.faturamentoHoje}
          hint="Agendamentos confirmados ou concluídos hoje."
          help="Período: hoje. Soma dos valores de agendamentos confirmados ou concluídos."
          icon={WalletCards}
          tone="primary"
        />
      ) : null}
      {widgets.includes("clients") ? (
        <KPIWidget
          label="Clientes ativos"
          value={snapshot.kpis.display.clientesAtivos}
          hint="Base vinculada ao estabelecimento atual."
          help="Origem: clientes ativos do estabelecimento atual."
          icon={UsersRound}
          tone="accent"
        />
      ) : null}
      {widgets.includes("occupancy") ? (
        <KPIWidget
          label="Capacidade ocupada hoje"
          value={snapshot.kpis.display.ocupacao}
          hint="Agendamentos não cancelados sobre a capacidade diária estimada."
          help="Período: hoje. Agendamentos não cancelados sobre a capacidade estimada."
          icon={TrendingUp}
          tone="primary"
        />
      ) : null}
      {widgets.includes("appointments") ? (
        <KPIWidget
          label="Agenda ativa hoje"
          value={snapshot.kpis.display.atendimentosHoje}
          hint="Agendamentos de hoje que não estão cancelados."
          help="Período: hoje. Agendamentos do estabelecimento, excluindo cancelados."
          icon={CalendarDays}
          tone="neutral"
        />
      ) : null}
      {widgets.includes("ownAppointments") || widgets.includes("linkedAgenda") || widgets.includes("ownAgenda") ? (
        <KPIWidget
          label={widgets.includes("linkedAgenda") ? "Agenda vinculada" : "Agenda própria"}
          value={snapshot.kpis.display.atendimentosHoje}
          hint="Filtrado pelo vínculo profissional do usuário."
          help="Período: hoje. Agendamentos do profissional vinculado, excluindo cancelados."
          icon={CalendarDays}
          tone="neutral"
        />
      ) : null}
      {widgets.includes("ownClients") ? (
        <KPIWidget
          label="Clientes próprios"
          value={snapshot.kpis.display.clientesAtivos}
          hint="Clientes relacionados aos atendimentos do profissional."
          help="Origem: clientes distintos com agendamentos do profissional, excluindo cancelados."
          icon={UsersRound}
          tone="accent"
        />
      ) : null}
      {widgets.includes("ownEarnings") ? (
        <KPIWidget
          label="Ganhos"
          value={snapshot.kpis.display.ganhosProprios || "R$ 0,00"}
          hint="Resultado pessoal do contexto ativo."
          help="Período: hoje. Valores dos agendamentos confirmados ou concluídos do profissional."
          icon={WalletCards}
          tone="primary"
        />
      ) : null}
      {widgets.includes("personalMetrics") ? (
        <KPIWidget
          label="Métricas pessoais"
          value={snapshot.kpis.display.metricasPessoais || "0"}
          hint="Atendimentos do dia no seu contexto."
          help="Período: hoje. Quantidade de agendamentos no escopo profissional."
          icon={TrendingUp}
          tone="neutral"
        />
      ) : null}
      {widgets.includes("ownCommission") ? (
        <KPIWidget
          label="Comissão"
          value={snapshot.kpis.display.comissaoHoje || "R$ 0,00"}
          hint="Valor limitado ao contexto do profissional."
          help="Período: hoje. Valores dos agendamentos confirmados ou concluídos do profissional."
          icon={WalletCards}
          tone="primary"
        />
      ) : null}
      {widgets.includes("ownSchedule") ? (
        <KPIWidget
          label="Horários"
          value={snapshot.kpis.display.horariosConfigurados || "0"}
          hint="Janelas configuradas para este profissional."
          help="Origem: dias ou entradas de agenda configuradas para o profissional."
          icon={Clock3}
          tone="neutral"
        />
      ) : null}
      {widgets.includes("authorizedServices") ? (
        <KPIWidget
          label="Serviços executados"
          value={snapshot.kpis.display.servicosAutorizados || "0"}
          hint="Catálogo liberado para este prestador."
          help="Origem: serviços ofertados com especialidades ativas do profissional."
          icon={Scissors}
          tone="accent"
        />
      ) : null}
      {widgets.includes("ownLimitedEarnings") ? (
        <KPIWidget
          label="Ganhos próprios"
          value={snapshot.kpis.display.ganhosLimitados || "R$ 0,00"}
          hint="Visão limitada ao próprio atendimento."
          help="Período: hoje. Valores dos agendamentos confirmados ou concluídos do profissional."
          icon={WalletCards}
          tone="primary"
        />
      ) : null}
      {canShowSaas ? (
        <KPIWidget
          label="Estabelecimentos ativos"
          value={snapshot.kpis.display.tenantsAtivos || "0"}
          hint="Visão restrita ao administrador da plataforma."
          help="Origem: estabelecimentos com status ativo."
          icon={Landmark}
          tone="accent"
        />
      ) : null}
      {canShowSaas ? (
        <KPIWidget
          label="Estabelecimentos em trial"
          value={snapshot.kpis.display.tenantsTrial || "0"}
          hint="Estabelecimentos em trial acompanhados no hub."
          help="Origem: estabelecimentos com status trial."
          icon={TrendingUp}
          tone="primary"
        />
      ) : null}
    </section>
  );
}
