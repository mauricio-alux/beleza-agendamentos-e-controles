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

function normalizeDisplayName(value, fallback) {
  const raw = String(value || fallback).trim();
  if (!raw) return String(fallback || '').trim();

  const hasLetter = /[a-zA-Z\u00C0-\u024F]/.test(raw);
  if (!hasLetter || (raw !== raw.toLowerCase() && raw !== raw.toUpperCase())) {
    return raw;
  }

  return raw
    .toLocaleLowerCase('pt-BR')
    .replace(/(^|\s)([a-z\u00E0-\u024F])/gu, (_, space, letter) => `${space}${letter.toLocaleUpperCase('pt-BR')}`);
}

const appUrl = normalizeUrl(
  process.env.PLATFORM_WEBSITE || process.env.APP_URL,
  'http://127.0.0.1:3000'
);
const publicAppUrl = normalizeUrl(
  process.env.PUBLIC_APP_URL || process.env.FRONTEND_URL || process.env.PLATFORM_WEBSITE || process.env.APP_URL,
  appUrl
);
const appDomain = String(process.env.APP_DOMAIN || domainFromUrl(appUrl)).trim();

const APP_BRAND = Object.freeze({
  appName: normalizeDisplayName(process.env.PLATFORM_NAME || process.env.APP_NAME, 'Plataforma'),
  logoUrl: String(process.env.PLATFORM_LOGO_URL || process.env.APP_LOGO_URL || '').trim(),
  appDomain,
  appUrl,
  publicAppUrl,
  supportEmail: String(process.env.APP_SUPPORT_EMAIL || `contato@${appDomain}`).trim()
});

function buildAppUrl(path = '') {
  const normalizedPath = String(path || '').trim();
  if (!normalizedPath) return APP_BRAND.appUrl;
  return `${APP_BRAND.appUrl}/${normalizedPath.replace(/^\/+/, '')}`;
}

function buildPublicAppUrl(path = '') {
  const normalizedPath = String(path || '').trim();
  if (!normalizedPath) return APP_BRAND.publicAppUrl;
  return `${APP_BRAND.publicAppUrl}/${normalizedPath.replace(/^\/+/, '')}`;
}

function buildBookingUrl(slug) {
  return buildPublicAppUrl(`/agendar/${encodeURIComponent(String(slug || '').trim())}`);
}

module.exports = {
  APP_BRAND,
  normalizeDisplayName,
  buildAppUrl,
  buildPublicAppUrl,
  buildBookingUrl
};
