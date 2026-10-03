import { API_URL } from "@/config/app-brand";
import type { AuthSession } from "@/services/auth.service";
import { locatePublicAccess } from "@/services/public-booking.service";
export type ClientAssociation = { id: string; cliente_id: string; tenant_id: string; slug: string; displayName: string; telefone: string; status_verificacao: string };
export class ClientAssociationError extends Error {
  constructor(message: string, public status: number, public code?: string) { super(message); }
}
export function isDefinitiveClientCredentialError(error: unknown) {
  return error instanceof ClientAssociationError && (
    (error.status === 401 && error.code === "CLIENT_TOKEN_INVALID") ||
    (error.status === 410 && error.code === "CLIENT_TOKEN_EXPIRED") ||
    (error.status === 403 && error.code === "CLIENT_IDENTITY_UNAVAILABLE") ||
    (error.status === 422 && error.code === "CLIENT_MATCH_UNAVAILABLE")
  );
}
async function request<T>(session: AuthSession, path = "", body?: unknown): Promise<T> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15000);
  try {
    const response = await fetch(`${API_URL}/usuario-cliente${path}`, {
      signal: controller.signal,
      method: body ? "POST" : "GET", cache: "no-store",
      headers: { Authorization: `Bearer ${session.access_token}`, "Content-Type": "application/json" },
      ...(body ? { body: JSON.stringify(body) } : {})
    });
    const result = await response.json().catch(() => ({}));
    if (!response.ok) throw new ClientAssociationError(result.error?.message || "Não foi possível consultar seu acesso.", response.status, result.code || result.error?.code);
    return result.data;
  } finally { clearTimeout(timeout); }
}
export const listClientAssociations = (session: AuthSession) => request<ClientAssociation[]>(session);
export const locateClientAssociation = (session: AuthSession, id: string, input: { telefone: string; data_nascimento: string } | { token: string }) =>
  request<Awaited<ReturnType<typeof locatePublicAccess>>>(session, `/${encodeURIComponent(id)}/locate`, input);
