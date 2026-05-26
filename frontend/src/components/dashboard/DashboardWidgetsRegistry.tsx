import {
  CalendarDays,
  HeartPulse,
  Landmark,
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
          label="Faturamento hoje"
          value={snapshot.kpis.display.faturamentoHoje}
          hint="Calculado a partir dos atendimentos do tenant."
          icon={WalletCards}
          tone="primary"
        />
      ) : null}
      {widgets.includes("clients") ? (
        <KPIWidget
          label="Clientes ativos"
          value={snapshot.kpis.display.clientesAtivos}
          hint="Base vinculada ao tenant atual."
          icon={UsersRound}
          tone="accent"
        />
      ) : null}
      {widgets.includes("occupancy") ? (
        <KPIWidget
          label="Ocupacao"
          value={snapshot.kpis.display.ocupacao}
          hint="Resumo operacional preparado para a agenda."
          icon={TrendingUp}
          tone="primary"
        />
      ) : null}
      {widgets.includes("appointments") ? (
        <KPIWidget
          label="Atendimentos hoje"
          value={snapshot.kpis.display.atendimentosHoje}
          hint="Horarios do dia filtrados por tenant."
          icon={CalendarDays}
          tone="neutral"
        />
      ) : null}
      {canShowSaas ? (
        <KPIWidget
          label="Tenants ativos"
          value={snapshot.kpis.display.tenantsAtivos || "0"}
          hint="Visao SaaS restrita ao MasterAdmin."
          icon={Landmark}
          tone="accent"
        />
      ) : null}
      {canShowSaas ? (
        <KPIWidget
          label="Saude operacional"
          value={snapshot.kpis.display.tenantsTrial || "0"}
          hint="Tenants em trial acompanhados no hub."
          icon={HeartPulse}
          tone="primary"
        />
      ) : null}
    </section>
  );
}
