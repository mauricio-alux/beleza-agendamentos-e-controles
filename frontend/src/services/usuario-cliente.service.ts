import { API_URL } from "@/config/app-brand";
import type { AuthSession } from "@/services/auth.service";
import { locatePublicAccess } from "@/services/public-booking.service";
export type ClientAssociation = { id: string; cliente_id: string; tenant_id: string; slug: string; displayName: string; telefone: string; status_verificacao: string };
import { ClientCredentialError as ClientAssociationError } from "@/lib/client-credential-error";
export { ClientAssociationError };
export { isDefinitiveClientCredentialError } from "@/lib/client-credential-error";
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
