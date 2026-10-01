import { API_URL } from "@/config/app-brand";
import { bookingIdentityKey, getPreferredTenant, listKnownTenants } from "@/lib/recurring-access.storage";

export type Availability = "available" | "unavailable" | "indeterminate";
export type ClientAvailability = { state: Availability; slug?: string };
let pending: Promise<ClientAvailability> | null = null;

// Navigation evidence only. No identity is granted and no token is removed here.
export async function probeClientContext(slug: string, token: string): Promise<Availability> {
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 15000);
    try {
      const response = await fetch(API_URL + "/public/booking/" + encodeURIComponent(slug) + "/client/context", {
        method: "POST", cache: "no-store", signal: controller.signal,
        headers: { "Content-Type": "application/json" }, body: JSON.stringify({ token })
      });
      const payload = await response.json();
      if (response.ok && typeof payload.data?.available === "boolean") return payload.data.available ? "available" : "unavailable";
      const code = payload.code || payload.error?.code;
      if ([401,403,404,410].includes(response.status) && ["CLIENT_TOKEN_INVALID", "CLIENT_TOKEN_EXPIRED", "CLIENT_IDENTITY_UNAVAILABLE", "BOOKING_LINK_EXPIRED", "BOOKING_UNAVAILABLE", "NOT_FOUND"].includes(code)) return "unavailable";
      return "indeterminate";
    } finally { clearTimeout(timer); }
  } catch { return "indeterminate"; }
}

export function readClientAvailability(): Promise<ClientAvailability> {
  if (pending) return pending;
  pending = (async (): Promise<ClientAvailability> => {
    try {
      const preferred = getPreferredTenant()?.slug;
      const slugs = [...new Set([preferred, ...listKnownTenants().map(t => t.slug)].filter((s): s is string => Boolean(s)))];
      const candidates = slugs.map(slug => ({ slug, token: window.localStorage.getItem(bookingIdentityKey(slug)) })).filter(c => c.token);
      if (!candidates.length) return { state: "unavailable" };
      const results = await Promise.all(candidates.map(async c => ({ slug: c.slug, state: await probeClientContext(c.slug, c.token!) })));
      return results.find(r => r.state === "available") || { state: results.some(r => r.state === "indeterminate") ? "indeterminate" : "unavailable" };
    } catch { return { state: "indeterminate" }; }
  })().finally(() => { pending = null; });
  return pending;
}
