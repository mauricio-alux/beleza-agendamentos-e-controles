import { buildPublicBookingUrl } from "@/config/app-brand";

export function buildBookingPath(slug?: string | null) {
  const normalized = slug?.trim();
  return normalized ? `/agendar/${normalized}` : "";
}

export function bookingPathLabel(slug?: string | null) {
  return buildBookingPath(slug) || "/agendar/seu-salao";
}

export function bookingAbsoluteUrl(slug?: string | null) {
  return buildPublicBookingUrl(slug);
}
