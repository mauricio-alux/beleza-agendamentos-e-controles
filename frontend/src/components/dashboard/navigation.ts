import {
  BarChart3,
  CalendarDays,
  Megaphone,
  Scissors,
  Settings,
  Sparkles,
  UsersRound,
  WalletCards,
  UserRoundCog
} from "lucide-react";
import type { AuthSession } from "@/services/auth.service";
import { hasPermission } from "@/lib/permissions";

export const dashboardNavItems = [
  { label: "Dashboard", href: "/dashboard", icon: BarChart3, permission: "dashboard.read" },
  { label: "Agenda", href: "/agenda", icon: CalendarDays, permission: "agenda.read" },
  { label: "Clientes", href: "/clientes", icon: UsersRound, permission: "clientes.read" },
  { label: "Servicos", href: "/servicos", icon: Scissors, permission: "servicos.read" },
  { label: "Equipe", href: "/equipe", icon: UserRoundCog, permission: "equipe.read" },
  { label: "Campanhas", href: "/campanhas", icon: Megaphone, permission: "campanhas.read" },
  { label: "Financeiro", href: "/financeiro", icon: WalletCards, permission: "financeiro.read" },
  { label: "Relatorios", href: "/relatorios", icon: BarChart3, permission: "relatorios.read" },
  { label: "Configuracoes", href: "/configuracoes", icon: Settings, permission: "tenant.read" }
];

export const quickActions = [
  { label: "Novo agendamento", href: "/agenda", icon: CalendarDays, permission: "agenda.write" },
  { label: "Novo cliente", href: "/clientes?novo=1", icon: UsersRound, permission: "clientes.write" },
  { label: "Novo servico", href: "/servicos", icon: Scissors, permission: "servicos.write" },
  { label: "Nova campanha", href: "/campanhas", icon: Sparkles, permission: "campanhas.manage" }
];

const ROUTE_PERMISSIONS = [
  { prefix: "/agenda/novo", permission: "agenda.write" },
  { prefix: "/agenda", permission: "agenda.read" },
  { prefix: "/clientes", permission: "clientes.read" },
  { prefix: "/servicos", permission: "servicos.read" },
  { prefix: "/equipe", permission: "equipe.read" },
  { prefix: "/campanhas", permission: "campanhas.read" },
  { prefix: "/financeiro", permission: "financeiro.read" },
  { prefix: "/relatorios", permission: "relatorios.read" },
  { prefix: "/configuracoes", permission: "tenant.read" },
  { prefix: "/dashboard", permission: "dashboard.read" }
];

function getSessionRole(session: AuthSession | null | undefined) {
  return session?.active_membership?.role || session?.tipo_usuario || session?.usuario?.tipo_usuario;
}

function isPersonalRole(role?: string) {
  return ["Funcionario", "Terceiro", "Profissional"].includes(role || "");
}

function isAutonomoPartner(session: AuthSession | null | undefined) {
  return getSessionRole(session) === "Autonomo"
    && session?.active_membership?.is_owner !== true
    && session?.active_membership?.vinculo_tipo !== "owner";
}

export function getDashboardNavItems(session: AuthSession | null | undefined) {
  const role = getSessionRole(session);
  const personalRole = isPersonalRole(role);
  const limitedToPersonalOperation = personalRole || isAutonomoPartner(session);

  return dashboardNavItems
    .filter((item) => !limitedToPersonalOperation || ["/dashboard", "/agenda"].includes(item.href))
    .filter((item) => hasPermission(session, item.permission))
    .map((item) => {
      if (!personalRole) return item;
      if (item.href === "/dashboard") return { ...item, label: "Meus Atendimentos" };
      if (item.href === "/agenda") return { ...item, label: "Minha Agenda" };
      return item;
    });
}

export function getRequiredPermission(pathname: string) {
  return ROUTE_PERMISSIONS.find(({ prefix }) => (
    pathname === prefix || pathname.startsWith(`${prefix}/`)
  ))?.permission;
}

export function canAccessDashboardPath(session: AuthSession | null | undefined, pathname: string) {
  const role = getSessionRole(session);
  const personalSettingsPath = pathname === "/configuracoes/perfil"
    || pathname.startsWith("/configuracoes/perfil/")
    || pathname === "/configuracoes/seguranca"
    || pathname.startsWith("/configuracoes/seguranca/");

  if (personalSettingsPath) {
    return true;
  }

  if (isPersonalRole(role)) {
    if (pathname === "/dashboard" || pathname.startsWith("/dashboard/")) return true;
    if (pathname === "/agenda" || pathname.startsWith("/agenda/")) {
      return pathname !== "/agenda/novo" && !pathname.startsWith("/agenda/novo/");
    }
    return false;
  }

  if (isAutonomoPartner(session)) {
    const personalOperationPath = pathname === "/dashboard"
      || pathname.startsWith("/dashboard/")
      || pathname === "/agenda"
      || pathname.startsWith("/agenda/");

    if (!personalOperationPath) return false;
  }

  const requiredPermission = getRequiredPermission(pathname);
  return !requiredPermission || hasPermission(session, requiredPermission);
}
