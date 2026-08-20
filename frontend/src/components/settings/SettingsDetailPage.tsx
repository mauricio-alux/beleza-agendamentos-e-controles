"use client";

import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { DashboardCard } from "@/components/dashboard/DashboardCard";
import { ServicesMerManager } from "@/components/services/ServicesMerManager";
import { OperationalSettingsForm } from "@/components/settings/OperationalSettingsForm";
import { SettingsShell } from "@/components/settings/SettingsShell";
import { SettingsState } from "@/components/settings/SettingsState";
import { TenantProfileForm } from "@/components/settings/TenantProfileForm";
import { TeamSettingsBridge } from "@/components/settings/TeamSettingsBridge";
import { UserProfileForm } from "@/components/settings/UserProfileForm";
import { Button } from "@/components/ui/button";
import { FeedbackMessage } from "@/components/ui/feedback-message";
import { useSettings } from "@/hooks/useSettings";
import type { SettingsSectionId } from "@/services/settings.service";

const DETAILS = {
  profile: {
    title: "Perfil",
    description: "Dados pessoais e contato do usuario conectado."
  },
  tenant: {
    title: "Salão",
    description: "Dados comerciais e identidade operacional do estabelecimento."
  },
  operation: {
    title: "Operação",
    description: "Parametros que orientam agendamento, cancelamento e inteligencia operacional."
  },
  services: {
    title: "Serviços do salão",
    description: "Cadastre duracao, preco e categoria dos servicos oferecidos."
  },
  specialties: {
    title: "Especialidades do salao",
    description: "Visao consolidada das especialidades, seus status e vinculos com servicos."
  },
  role_specialties: {
    title: "Cargos e especialidades",
    description: "Estrutura profissional de cargos e competencias."
  },
  service_specialties: {
    title: "Serviços",
    description: "Configuracoes operacionais de servico e especialidade."
  },
  team: {
    title: "Horários da equipe",
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
        title="Não foi possível carregar esta área"
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
        description="A navegacao respeita o papel do usuario no estabelecimento."
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
          <FeedbackMessage tone={error ? "error" : "success"} message={error || successMessage} />
        ) : null}

        {section === "services" ? (
          <ServicesMerManager embedded />
        ) : (
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

          {!["profile", "tenant", "operation", "team", "services"].includes(section) ? <SettingsModuleBridge section={section} /> : null}
        </DashboardCard>
        )}
      </div>
    </SettingsShell>
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
