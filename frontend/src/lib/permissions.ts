import type { AuthSession } from "@/services/auth.service";

export function hasPermission(session: AuthSession | null | undefined, permission?: string) {
  if (!permission) return true;
  return Boolean(session?.permissions?.includes(permission) || session?.permissionContext?.permissions?.includes(permission));
}
