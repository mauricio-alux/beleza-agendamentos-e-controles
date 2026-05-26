"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { DashboardCard } from "@/components/dashboard/DashboardCard";
import { settingsIconBySection, settingsSectionHints } from "@/components/settings/settings-copy";
import type { SettingsSection } from "@/services/settings.service";

type SettingsSectionCardProps = {
  section: SettingsSection;
};

export function SettingsSectionCard({ section }: SettingsSectionCardProps) {
  const Icon = settingsIconBySection[section.id];

  return (
    <Link href={section.href} className="group block h-full">
      <DashboardCard className="flex h-full flex-col justify-between">
        <div className="space-y-4">
          <span className="grid h-11 w-11 place-items-center rounded-2xl bg-secondary text-primary">
            <Icon className="h-5 w-5" />
          </span>
          <div>
            <h2 className="text-base font-bold text-foreground">{section.label}</h2>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">{section.description}</p>
          </div>
        </div>
        <div className="mt-5 flex items-center justify-between gap-4 text-sm font-semibold text-primary">
          <span>{settingsSectionHints[section.id]}</span>
          <ArrowRight className="h-4 w-4 flex-none transition group-hover:translate-x-1" />
        </div>
      </DashboardCard>
    </Link>
  );
}
