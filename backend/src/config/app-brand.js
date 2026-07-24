function normalizeUrl(value, fallback) {
  return String(value || fallback).trim().replace(/\/+$/, '');
}

function domainFromUrl(value) {
  try {
    return new URL(value).host;
  } catch {
    return 'localhost';
  }
}

const appUrl = normalizeUrl(
  process.env.PLATFORM_WEBSITE || process.env.APP_URL,
  'http://127.0.0.1:3000'
);
const appDomain = String(process.env.APP_DOMAIN || domainFromUrl(appUrl)).trim();

const APP_BRAND = Object.freeze({
  appName: String(process.env.PLATFORM_NAME || process.env.APP_NAME || 'Plataforma').trim(),
  logoUrl: String(process.env.PLATFORM_LOGO_URL || process.env.APP_LOGO_URL || '').trim(),
  appDomain,
  appUrl,
  supportEmail: String(process.env.APP_SUPPORT_EMAIL || `contato@${appDomain}`).trim()
});

function buildAppUrl(path = '') {
  const normalizedPath = String(path || '').trim();
  if (!normalizedPath) return APP_BRAND.appUrl;
  return `${APP_BRAND.appUrl}/${normalizedPath.replace(/^\/+/, '')}`;
}

function buildBookingUrl(slug) {
  return buildAppUrl(`/agendar/${encodeURIComponent(String(slug || '').trim())}`);
}

module.exports = {
  APP_BRAND,
  buildAppUrl,
  buildBookingUrl
};
