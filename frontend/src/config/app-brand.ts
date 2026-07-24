function normalizeUrl(value: string | undefined, fallback: string) {
  return (value || fallback).trim().replace(/\/+$/, "");
}

function domainFromUrl(value: string) {
  try {
    return new URL(value).host;
  } catch {
    return "localhost";
  }
}

const appUrl = normalizeUrl(
  process.env.NEXT_PUBLIC_PLATFORM_WEBSITE || process.env.NEXT_PUBLIC_APP_URL,
  "http://127.0.0.1:3000"
);
const appDomain = (process.env.NEXT_PUBLIC_APP_DOMAIN || domainFromUrl(appUrl)).trim();

export const APP_BRAND = Object.freeze({
  appName: (
    process.env.NEXT_PUBLIC_PLATFORM_NAME
    || process.env.NEXT_PUBLIC_APP_NAME
    || "Plataforma"
  ).trim(),
  logoUrl: (
    process.env.NEXT_PUBLIC_PLATFORM_LOGO_URL
    || process.env.NEXT_PUBLIC_APP_LOGO_URL
    || ""
  ).trim(),
  appDomain,
  appUrl,
  supportEmail: (process.env.NEXT_PUBLIC_APP_SUPPORT_EMAIL || `contato@${appDomain}`).trim()
});

export const API_URL = normalizeUrl(
  process.env.NEXT_PUBLIC_API_URL,
  "http://127.0.0.1:3001"
);

export function buildAppUrl(path = "") {
  const normalizedPath = path.trim();
  if (!normalizedPath) return APP_BRAND.appUrl;
  return `${APP_BRAND.appUrl}/${normalizedPath.replace(/^\/+/, "")}`;
}

export function buildPublicBookingUrl(slug?: string | null) {
  const normalized = slug?.trim();
  return normalized ? buildAppUrl(`/agendar/${encodeURIComponent(normalized)}`) : "";
}

export function withBrand(pageTitle?: string) {
  return pageTitle ? `${pageTitle} | ${APP_BRAND.appName}` : APP_BRAND.appName;
}
