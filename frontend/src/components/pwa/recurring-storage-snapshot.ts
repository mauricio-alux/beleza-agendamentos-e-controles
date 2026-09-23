import {enabled, safePath} from './pwa-diagnostics';

// Deliberately do not import recurring-access.storage: its readers can mutate evidence.
const preferredKey = 'esthya:preferred-tenant';
const knownKey = 'esthya:known-tenants';
const identityPrefix = 'esthya:booking-identity:';
const slugOf = (value: unknown): string | null => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const slug = (value as {slug?: unknown}).slug;
  return typeof slug === 'string' && /^[a-z0-9-]{2,120}$/i.test(slug.trim()) ? slug.trim() : null;
};
function parse(raw: string | null): unknown {
  try { return raw === null ? null : JSON.parse(raw); } catch { return null; }
}

export function recurringStorageSnapshot() {
  if (!enabled() || typeof window === 'undefined') return null;
  const navigatorStandalone = (navigator as Navigator & {standalone?: boolean}).standalone ?? null;
  const standalone = navigatorStandalone === true || window.matchMedia('(display-mode: standalone)').matches;
  const result = {
    executionContext: standalone ? 'standalone' : 'browser',
    origin: location.origin,
    pathname: safePath(location.pathname),
    navigatorStandalone,
    displayMode: standalone ? 'standalone' : window.matchMedia('(display-mode: fullscreen)').matches ? 'fullscreen' : window.matchMedia('(display-mode: browser)').matches ? 'browser' : 'unknown',
    localStorageAvailable: false,
    localStorageReadable: false,
    preferredTenantPresent: null as boolean | null,
    preferredTenantValid: null as boolean | null,
    knownTenantsCount: null as number | null,
    knownTenantsParseValid: null as boolean | null,
    selectedTenantIdentityPresent: null as boolean | null,
    tenantScopedIdentitiesCount: null as number | null
  };
  let storage: Storage;
  try {
    storage = window.localStorage;
    if (!storage) return result;
    result.localStorageAvailable = true;
  } catch { return result; }
  try {
    const preferredRaw = storage.getItem(preferredKey);
    const knownRaw = storage.getItem(knownKey);
    const preferredSlug = slugOf(parse(preferredRaw));
    const known = parse(knownRaw);
    const slugs = Array.isArray(known) ? [...new Set(known.map(slugOf).filter((s): s is string => s !== null))] : [];
    const selected = preferredSlug || (slugs.length === 1 ? slugs[0] : null);
    const identityPresent = selected ? Boolean(storage.getItem(identityPrefix + selected)) : null;
    result.preferredTenantPresent = preferredRaw !== null;
    result.preferredTenantValid = preferredSlug !== null;
    result.knownTenantsCount = knownRaw === null ? 0 : Array.isArray(known) ? slugs.length : null;
    result.knownTenantsParseValid = Array.isArray(known);
    result.selectedTenantIdentityPresent = identityPresent;
    result.localStorageReadable = true;
  } catch { return result; }
  try {
    let count = 0;
    for (let i = 0; i < storage.length; i++) {
      const key = storage.key(i);
      if (key?.startsWith(identityPrefix) && /^[a-z0-9-]{2,120}$/i.test(key.slice(identityPrefix.length)) && storage.getItem(key)) count++;
    }
    result.tenantScopedIdentitiesCount = count;
  } catch { /* Enumeration unavailable: preserve null, not a misleading zero. */ }
  return result;
}

export function recurringStorageReport(snapshot: ReturnType<typeof recurringStorageSnapshot>) {
  return ['RECURRING ACCESS STORAGE SNAPSHOT', JSON.stringify(snapshot, null, 2)].join('\n');
}
