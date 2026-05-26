"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { settingsIconBySection } from "@/components/settings/settings-copy";
import type { SettingsSection } from "@/services/settings.service";

type MobileSettingsListProps = {
  sections: SettingsSection[];
};

export function MobileSettingsList({ sections }: MobileSettingsListProps) {
  return (
    <div className="space-y-2 lg:hidden">
      {sections.map((section) => {
        const Icon = settingsIconBySection[section.id];

        return (
          <Link
            key={section.id}
            href={section.href}
            className="flex min-h-16 items-center gap-3 rounded-2xl border border-white/80 bg-white/90 p-3 shadow-sm transition hover:-translate-y-0.5 hover:shadow-soft"
          >
            <span className="grid h-10 w-10 flex-none place-items-center rounded-2xl bg-secondary text-primary">
              <Icon className="h-5 w-5" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-bold text-foreground">{section.label}</span>
              <span className="mt-0.5 block truncate text-xs text-muted-foreground">{section.description}</span>
            </span>
            <ArrowRight className="h-4 w-4 flex-none text-primary" />
          </Link>
        );
      })}
    </div>
  );
}
