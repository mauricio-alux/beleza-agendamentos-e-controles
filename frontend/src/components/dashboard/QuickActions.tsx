"use client";

import Link from "next/link";
import { quickActions } from "@/components/dashboard/navigation";
import { useAuth } from "@/hooks/useAuth";
import { hasPermission } from "@/lib/permissions";
import type { DashboardRoleConfig } from "@/services/dashboard.service";

type QuickActionsProps = {
  roleConfig?: DashboardRoleConfig;
};

export function QuickActions({ roleConfig }: QuickActionsProps) {
  const { session } = useAuth();
  const actions = quickActions.filter((action) => {
    if (!hasPermission(session, action.permission)) return false;
    if (!roleConfig) return true;
    if (action.href === "/campanhas") return roleConfig.permissions.canViewCampaigns;
    if (action.href === "/financeiro") return roleConfig.permissions.canViewFinancials;
    if (action.href === "/agenda/novo") return roleConfig.permissions.canManageAppointments;
    return true;
  });

  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      {actions.map(({ label, href, icon: Icon }, index) => (
        <Link
          key={label}
          href={href}
          className={`group flex min-h-20 min-w-0 items-center gap-3 rounded-[1.25rem] border p-4 text-sm font-bold text-foreground shadow-sm transition duration-200 hover:-translate-y-0.5 hover:border-primary/40 hover:text-primary hover:shadow-blush sm:min-h-24 sm:rounded-[1.35rem] ${
            index < 2 ? "border-primary/20 bg-secondary/60" : "border-white/80 bg-white/90"
          }`}
        >
          <span className="grid h-11 w-11 flex-none place-items-center rounded-full bg-secondary text-primary transition group-hover:bg-primary group-hover:text-primary-foreground">
            <Icon className="h-5 w-5" />
          </span>
          <span className="min-w-0 break-words">{label}</span>
        </Link>
      ))}
    </div>
  );
}
