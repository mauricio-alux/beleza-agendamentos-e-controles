"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { settingsIconBySection } from "@/components/settings/settings-copy";
import { cn } from "@/lib/utils";
import type { SettingsSection } from "@/services/settings.service";

type SettingsNavigationProps = {
  sections: SettingsSection[];
};

export function SettingsNavigation({ sections }: SettingsNavigationProps) {
  const pathname = usePathname();

  return (
    <aside className="hidden lg:block">
      <div className="sticky top-6 rounded-[1.5rem] border border-white/80 bg-white/86 p-3 shadow-soft backdrop-blur-xl">
        <Link
          href="/configuracoes"
          className={cn(
            "mb-2 flex min-h-11 items-center rounded-2xl px-3 text-sm font-bold transition",
            pathname === "/configuracoes" ? "bg-secondary text-primary" : "text-muted-foreground hover:bg-white"
          )}
        >
          Visao geral
        </Link>
        <nav className="space-y-1">
          {sections.map((section) => {
            const Icon = settingsIconBySection[section.id];
            const isActive = pathname === section.href;

            return (
              <Link
                key={section.id}
                href={section.href}
                className={cn(
                  "flex min-h-11 items-center gap-3 rounded-2xl px-3 text-sm font-semibold transition",
                  isActive ? "bg-secondary text-primary" : "text-muted-foreground hover:bg-white hover:text-foreground"
                )}
              >
                <Icon className="h-4 w-4" />
                {section.label}
              </Link>
            );
          })}
        </nav>
      </div>
    </aside>
  );
}
