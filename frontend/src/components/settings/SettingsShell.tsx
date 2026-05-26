"use client";

import { ReactNode } from "react";
import { SettingsNavigation } from "@/components/settings/SettingsNavigation";
import type { SettingsSection } from "@/services/settings.service";

type SettingsShellProps = {
  title: string;
  description: string;
  role?: string;
  sections: SettingsSection[];
  children: ReactNode;
};

export function SettingsShell({ title, description, role, sections, children }: SettingsShellProps) {
  return (
    <section className="space-y-5">
      <div className="rounded-[1.75rem] border border-white/80 bg-white/82 p-5 shadow-soft backdrop-blur-xl sm:p-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-accent">Configuracoes operacionais</p>
            <h1 className="mt-2 text-2xl font-bold text-foreground sm:text-3xl">{title}</h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">{description}</p>
          </div>
          {role ? (
            <span className="w-fit rounded-full border border-border bg-white/90 px-3 py-2 text-xs font-bold text-muted-foreground">
              {role}
            </span>
          ) : null}
        </div>
      </div>

      <div className="grid gap-5 lg:grid-cols-[17rem_minmax(0,1fr)]">
        <SettingsNavigation sections={sections} />
        <div className="min-w-0">{children}</div>
      </div>
    </section>
  );
}
