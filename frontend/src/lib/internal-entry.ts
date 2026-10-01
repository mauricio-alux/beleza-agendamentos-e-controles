import type { AuthSession } from "@/services/auth.service";
import { onboardingService } from "@/services/onboarding.service";
import type { Availability } from "@/lib/context-availability";
import { parseAppContext, readLastContext } from "@/lib/last-context";

// Navigation only. Call with a session validated by the existing backend.
export async function resolveInternalEntry(session: AuthSession) {
  if (session.usuario.tipo_usuario_global === "MasterAdmin" || session.usuario.tipo_usuario === "MasterAdmin") {
    return "/admin";
  }
  const onboardingPath = process.env.NEXT_PUBLIC_AUTH_REDIRECT_PATH || "/onboarding";
  const dashboardPath = process.env.NEXT_PUBLIC_DASHBOARD_PATH || "/dashboard";
  try {
    const status = await onboardingService.getStatus(session);
    return status.progress >= 100 ? dashboardPath : onboardingPath;
  } catch { return onboardingPath; }
}

export function isInternalContext(session: AuthSession) {
  const role = session.active_membership?.role || session.tipo_usuario || session.usuario?.tipo_usuario;
  if (session.usuario?.tipo_usuario_global === "MasterAdmin" || role === "MasterAdmin") return true;
  return Boolean(session.active_membership?.status === "ativo"
    && session.active_membership.tenant_id === session.tenant?.id
    && role && role !== "Cliente"
    && session.permissionContext?.scope !== "client");
}

export async function resolveAppEntry(
  availability: { client: { state: Availability }; professional: Availability; session: AuthSession | null },
  intent?: unknown
): Promise<string | null> {
  const requested = parseAppContext(intent);
  if (requested === "client") return "/acesso";
  if (requested === "professional") {
    if (availability.professional === "indeterminate") throw new Error("Verificação profissional pendente.");
    return availability.professional === "available" && availability.session && isInternalContext(availability.session)
      ? resolveInternalEntry(availability.session) : "/login";
  }
  if (availability.client.state === "indeterminate" || availability.professional === "indeterminate") throw new Error("Verificação de acesso pendente.");
  const client = availability.client.state === "available";
  const professional = availability.professional === "available" && availability.session && isInternalContext(availability.session);
  if (client && (!professional || readLastContext() !== "professional")) return "/acesso";
  if (professional && availability.session) return resolveInternalEntry(availability.session);
  return null;
}
