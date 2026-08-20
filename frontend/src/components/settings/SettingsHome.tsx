"use client";

import { SettingsSectionCard } from "@/components/settings/SettingsSectionCard";
import { MobileSettingsList } from "@/components/settings/MobileSettingsList";
import { SettingsShell } from "@/components/settings/SettingsShell";
import { SettingsState } from "@/components/settings/SettingsState";
import { settingsStatusItems } from "@/components/settings/settings-copy";
import { useSettings } from "@/hooks/useSettings";

export function SettingsHome() {
  const { summary, isLoading, error, refresh } = useSettings();

  if (isLoading) {
    return <SettingsState type="loading" />;
  }

  if (error || !summary) {
    return (
      <SettingsState
        type="error"
        title="Não foi possível carregar as configurações"
        description={error || "Tente novamente em alguns instantes."}
        onRetry={refresh}
      />
    );
  }

  return (
    <SettingsShell
      title="Central de configuracoes"
      description="Ajustes de perfil, negocio e operacao ficam aqui, fora da home diaria do Dashboard."
      role={summary.role}
      sections={summary.sections}
    >
      <div className="space-y-5">
        <div className="grid gap-3 sm:grid-cols-3">
          {settingsStatusItems.map(({ title, description, icon: Icon }) => (
            <div key={title} className="rounded-[1.25rem] border border-white/80 bg-white/88 p-4 shadow-sm">
              <Icon className="h-5 w-5 text-primary" />
              <h2 className="mt-3 text-sm font-bold text-foreground">{title}</h2>
              <p className="mt-1 text-xs leading-5 text-muted-foreground">{description}</p>
            </div>
          ))}
        </div>

        <MobileSettingsList sections={summary.sections} />

        <div className="hidden grid-cols-2 gap-4 lg:grid xl:grid-cols-3">
          {summary.sections.map((section) => (
            <SettingsSectionCard key={section.id} section={section} />
          ))}
        </div>
      </div>
    </SettingsShell>
  );
}
