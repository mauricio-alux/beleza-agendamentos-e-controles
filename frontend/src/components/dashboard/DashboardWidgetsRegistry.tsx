import {
  CalendarDays,
  Clock3,
  HeartPulse,
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
          hint="Soma dos valores de agendamentos confirmados ou concluidos hoje."
          help="Formula: soma de valor_total em agendamentos do dia com status confirmado ou concluido, por tenant."
          icon={WalletCards}
          tone="primary"
        />
      ) : null}
      {widgets.includes("clients") ? (
        <KPIWidget
          label="Clientes ativos"
          value={snapshot.kpis.display.clientesAtivos}
          hint="Base vinculada ao tenant atual."
          help="Formula: total de cliente_tenants ativos do tenant atual."
          icon={UsersRound}
          tone="accent"
        />
      ) : null}
      {widgets.includes("occupancy") ? (
        <KPIWidget
          label="Capacidade ocupada hoje"
          value={snapshot.kpis.display.ocupacao}
          hint="Agendamentos nao cancelados sobre a capacidade diaria estimada."
          help="Formula: agendamentos de hoje com status diferente de cancelado / profissionais ativos x 8 horarios."
          icon={TrendingUp}
          tone="primary"
        />
      ) : null}
      {widgets.includes("appointments") ? (
        <KPIWidget
          label="Agenda ativa hoje"
          value={snapshot.kpis.display.atendimentosHoje}
          hint="Agendamentos de hoje que nao estao cancelados."
          help="Formula: total de agendamentos do dia por tenant, excluindo status cancelado."
          icon={CalendarDays}
          tone="neutral"
        />
      ) : null}
      {widgets.includes("ownAppointments") || widgets.includes("linkedAgenda") || widgets.includes("ownAgenda") ? (
        <KPIWidget
          label={widgets.includes("linkedAgenda") ? "Agenda vinculada" : "Agenda propria"}
          value={snapshot.kpis.display.atendimentosHoje}
          hint="Filtrado pelo vinculo profissional do usuario."
          help="Formula: total de agendamentos do dia do profissional vinculado, excluindo status cancelado."
          icon={CalendarDays}
          tone="neutral"
        />
      ) : null}
      {widgets.includes("ownClients") ? (
        <KPIWidget
          label="Clientes proprios"
          value={snapshot.kpis.display.clientesAtivos}
          hint="Clientes relacionados aos atendimentos do profissional."
          help="Formula: clientes distintos com agendamentos do profissional, excluindo status cancelado."
          icon={UsersRound}
          tone="accent"
        />
      ) : null}
      {widgets.includes("ownEarnings") ? (
        <KPIWidget
          label="Ganhos"
          value={snapshot.kpis.display.ganhosProprios || "R$ 0,00"}
          hint="Resultado pessoal do contexto ativo."
          help="Formula: soma de valor_total dos agendamentos do profissional hoje com status confirmado ou concluido."
          icon={WalletCards}
          tone="primary"
        />
      ) : null}
      {widgets.includes("personalMetrics") ? (
        <KPIWidget
          label="Metricas pessoais"
          value={snapshot.kpis.display.metricasPessoais || "0"}
          hint="Indicadores individuais preparados para marketplace."
          help="Formula atual: quantidade de agendamentos do dia no escopo profissional."
          icon={TrendingUp}
          tone="neutral"
        />
      ) : null}
      {widgets.includes("ownCampaigns") ? (
        <KPIWidget
          label="Campanhas proprias"
          value={String(snapshot.activity.campaigns.length)}
          hint="Campanhas do contexto de atendimento atual."
          help="Formula: quantidade de campanhas retornadas no resumo do Dashboard para o contexto atual."
          icon={HeartPulse}
          tone="accent"
        />
      ) : null}
      {widgets.includes("ownCommission") ? (
        <KPIWidget
          label="Comissao"
          value={snapshot.kpis.display.comissaoHoje || "R$ 0,00"}
          hint="Valor limitado ao contexto do profissional."
          help="Formula atual: soma de valor_total dos agendamentos do profissional hoje com status confirmado ou concluido."
          icon={WalletCards}
          tone="primary"
        />
      ) : null}
      {widgets.includes("ownSchedule") ? (
        <KPIWidget
          label="Horarios"
          value={snapshot.kpis.display.horariosConfigurados || "0"}
          hint="Janelas configuradas para este profissional."
          help="Formula: quantidade de dias/entradas de agenda configuradas como dia trabalhado para o profissional."
          icon={Clock3}
          tone="neutral"
        />
      ) : null}
      {widgets.includes("authorizedServices") ? (
        <KPIWidget
          label="Servicos executados"
          value={snapshot.kpis.display.servicosAutorizados || "0"}
          hint="Catalogo liberado para este prestador."
          help="Formula: quantidade de vinculos ativos em profissional_servicos para o profissional."
          icon={Scissors}
          tone="accent"
        />
      ) : null}
      {widgets.includes("ownLimitedEarnings") ? (
        <KPIWidget
          label="Ganhos proprios"
          value={snapshot.kpis.display.ganhosLimitados || "R$ 0,00"}
          hint="Visao limitada ao proprio atendimento."
          help="Formula: soma de valor_total dos agendamentos do profissional hoje com status confirmado ou concluido."
          icon={WalletCards}
          tone="primary"
        />
      ) : null}
      {canShowSaas ? (
        <KPIWidget
          label="Tenants ativos"
          value={snapshot.kpis.display.tenantsAtivos || "0"}
          hint="Visao SaaS restrita ao MasterAdmin."
          help="Formula: quantidade de tenants com status ativo."
          icon={Landmark}
          tone="accent"
        />
      ) : null}
      {canShowSaas ? (
        <KPIWidget
          label="Tenants em trial"
          value={snapshot.kpis.display.tenantsTrial || "0"}
          hint="Tenants em trial acompanhados no hub."
          help="Formula: quantidade de tenants com status trial."
          icon={HeartPulse}
          tone="primary"
        />
      ) : null}
    </section>
  );
}
