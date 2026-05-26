"use client";

import Link from "next/link";
import { ArrowLeft, CheckCircle2 } from "lucide-react";
import { DashboardCard } from "@/components/dashboard/DashboardCard";
import { OperationalSettingsForm } from "@/components/settings/OperationalSettingsForm";
import { SettingsShell } from "@/components/settings/SettingsShell";
import { SettingsState } from "@/components/settings/SettingsState";
import { TenantProfileForm } from "@/components/settings/TenantProfileForm";
import { TeamSettingsBridge } from "@/components/settings/TeamSettingsBridge";
import { UserProfileForm } from "@/components/settings/UserProfileForm";
import { Button } from "@/components/ui/button";
import { useSettings } from "@/hooks/useSettings";
import type { SettingsSectionId } from "@/services/settings.service";

const DETAILS = {
  profile: {
    title: "Perfil",
    description: "Dados pessoais e contato do usuario conectado."
  },
  tenant: {
    title: "Salao",
    description: "Dados comerciais e identidade operacional do tenant."
  },
  operation: {
    title: "Operacao",
    description: "Parametros que orientam agendamento, cancelamento e inteligencia operacional."
  },
  services: {
    title: "Servicos do salao",
    description: "Cadastre duracao, preco e categoria dos servicos oferecidos."
  },
  team: {
    title: "Horarios da equipe",
    description: "Defina os dias e horarios de atendimento de cada profissional."
  },
  subscription: {
    title: "Assinatura",
    description: "Plano, limites e cobranca ficam separados da rotina diaria."
  },
  security: {
    title: "Seguranca",
    description: "Preferencias de acesso e protecao da conta."
  },
  platform: {
    title: "Plataforma",
    description: "Area reservada para MasterAdmin."
  }
} satisfies Record<SettingsSectionId, { title: string; description: string }>;

type SettingsDetailPageProps = {
  section: SettingsSectionId;
};

export function SettingsDetailPage({ section }: SettingsDetailPageProps) {
  const { summary, isLoading, isSaving, error, successMessage, refresh, saveProfile, saveTenant, saveOperation } =
    useSettings();
  const detail = DETAILS[section];

  if (isLoading) {
    return <SettingsState type="loading" />;
  }

  if (error && !summary) {
    return (
      <SettingsState
        type="error"
        title="Nao foi possivel carregar esta area"
        description={error}
        onRetry={refresh}
      />
    );
  }

  if (!summary || !summary.sections.some((item) => item.id === section)) {
    return (
      <SettingsState
        type="empty"
        title="Area indisponivel para este perfil"
        description="A navegacao respeita o papel do usuario no tenant."
      />
    );
  }

  return (
    <SettingsShell title={detail.title} description={detail.description} role={summary.role} sections={summary.sections}>
      <div className="space-y-4">
        <Button asChild variant="ghost" className="lg:hidden">
          <Link href="/configuracoes">
            <ArrowLeft className="h-4 w-4" />
            Voltar
          </Link>
        </Button>

        {(error || successMessage) ? (
          <div className="rounded-2xl border border-white/80 bg-white/90 px-4 py-3 text-sm font-semibold shadow-sm">
            <span className={error ? "text-destructive" : "text-primary"}>{error || successMessage}</span>
          </div>
        ) : null}

        <DashboardCard title={detail.title} description={detail.description}>
          {section === "profile" ? (
            <UserProfileForm profile={summary.profile} isSaving={isSaving} onSave={saveProfile} />
          ) : null}

          {section === "tenant" && summary.tenant ? (
            <TenantProfileForm tenant={summary.tenant} isSaving={isSaving} onSave={saveTenant} />
          ) : null}

          {section === "operation" && summary.operation ? (
            <OperationalSettingsForm operation={summary.operation} isSaving={isSaving} onSave={saveOperation} />
          ) : null}

          {section === "team" ? <TeamSettingsBridge /> : null}

          {section === "services" ? <ServicesSettingsBridge /> : null}

          {!["profile", "tenant", "operation", "team", "services"].includes(section) ? <SettingsModuleBridge section={section} /> : null}
        </DashboardCard>
      </div>
    </SettingsShell>
  );
}

function ServicesSettingsBridge() {
  const benefits = [
    "Duracao usada no calculo da agenda",
    "Preco usado em faturamento e KPIs",
    "Categoria usada em campanhas e relatorios"
  ];

  return (
    <div className="space-y-5">
      <p className="text-sm leading-6 text-muted-foreground">
        Organize os servicos oferecidos pelo seu negocio para que o Bellory calcule horarios, acompanhe resultados e
        prepare a operacao para campanhas futuras.
      </p>
      <div className="grid gap-3 sm:grid-cols-3">
        {benefits.map((benefit) => (
          <div key={benefit} className="flex min-h-20 items-start gap-3 rounded-2xl border border-white/80 bg-white/90 p-4 shadow-sm">
            <CheckCircle2 className="mt-0.5 h-5 w-5 flex-none text-primary" />
            <span className="text-sm font-semibold leading-5 text-foreground">{benefit}</span>
          </div>
        ))}
      </div>
      <Button asChild variant="outline">
        <Link href="/servicos">Gerenciar servicos</Link>
      </Button>
    </div>
  );
}

function SettingsModuleBridge({ section }: { section: SettingsSectionId }) {
  const targetBySection: Partial<Record<SettingsSectionId, string>> = {
    services: "/servicos",
    team: "/equipe",
    subscription: "/financeiro",
    security: "/configuracoes/perfil",
    platform: "/admin"
  };

  return (
    <div className="space-y-4">
      <p className="text-sm leading-6 text-muted-foreground">
        Esta manutencao permanece desacoplada para evitar que o Dashboard vire um ERP pesado. O acesso fica registrado
        aqui e o fluxo completo continua no modulo responsavel.
      </p>
      <Button asChild variant="outline">
        <Link href={targetBySection[section] || "/configuracoes"}>Abrir modulo</Link>
      </Button>
    </div>
  );
}
