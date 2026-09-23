export type PreferredTenantSource = "booking" | "switcher" | "access";

export type PreferredTenant = {
  slug: string;
  updatedAt: string;
  source: PreferredTenantSource;
};

export type KnownTenant = {
  slug: string;
  displayName: string;
  lastAccessAt: string;
  hasLocalIdentity: boolean;
};

export const PREFERRED_TENANT_KEY = "esthya:preferred-tenant";
export const KNOWN_TENANTS_KEY = "esthya:known-tenants";
export const BOOKING_IDENTITY_PREFIX = "esthya:booking-identity:";

const SLUG_PATTERN = /^[a-z0-9-]{2,120}$/i;
const MAX_KNOWN_TENANTS = 12;

function getStorage(storage?: Storage | null) {
  if (storage) return storage;
  if (typeof window === "undefined") return null;
  return window.localStorage;
}

function safeParse(value: string | null) {
  if (!value) return null;
  try {
    return JSON.parse(value) as unknown;
  } catch {
    return null;
  }
}

function nowIso() {
  return new Date().toISOString();
}

export function bookingIdentityKey(slug: string) {
  return `${BOOKING_IDENTITY_PREFIX}${slug.trim()}`;
}

export function isValidTenantSlug(value: unknown): value is string {
  return typeof value === "string" && SLUG_PATTERN.test(value.trim());
}

function sanitizeDisplayName(value: unknown, fallback: string) {
  const text = typeof value === "string" ? value.trim() : "";
  return (text || fallback).slice(0, 120);
}

function sanitizePreferredTenant(value: unknown): PreferredTenant | null {
  if (!value || typeof value !== "object") return null;
  const item = value as Partial<PreferredTenant>;
  if (!isValidTenantSlug(item.slug)) return null;

  return {
    slug: item.slug.trim(),
    updatedAt: typeof item.updatedAt === "string" ? item.updatedAt : nowIso(),
    source: item.source === "booking" || item.source === "switcher" || item.source === "access"
      ? item.source
      : "access"
  };
}

function sanitizeKnownTenant(value: unknown): KnownTenant | null {
  if (!value || typeof value !== "object") return null;
  const item = value as Partial<KnownTenant>;
  if (!isValidTenantSlug(item.slug)) return null;
  const slug = item.slug.trim();

  return {
    slug,
    displayName: sanitizeDisplayName(item.displayName, slug),
    lastAccessAt: typeof item.lastAccessAt === "string" ? item.lastAccessAt : nowIso(),
    hasLocalIdentity: item.hasLocalIdentity === true
  };
}

function writeKnownTenants(storage: Storage, tenants: KnownTenant[]) {
  storage.setItem(KNOWN_TENANTS_KEY, JSON.stringify(tenants));
}

export function getPreferredTenant(storageInput?: Storage | null) {
  const storage = getStorage(storageInput);
  if (!storage) return null;
  const preferred = sanitizePreferredTenant(safeParse(storage.getItem(PREFERRED_TENANT_KEY)));
  if (!preferred) storage.removeItem(PREFERRED_TENANT_KEY);
  return preferred;
}

export function setPreferredTenant(
  tenant: { slug: string; source?: PreferredTenantSource; updatedAt?: string },
  storageInput?: Storage | null
) {
  const storage = getStorage(storageInput);
  if (!storage || !isValidTenantSlug(tenant.slug)) return null;

  const preferred: PreferredTenant = {
    slug: tenant.slug.trim(),
    updatedAt: tenant.updatedAt || nowIso(),
    source: tenant.source || "access"
  };
  storage.setItem(PREFERRED_TENANT_KEY, JSON.stringify(preferred));
  return preferred;
}

export function clearPreferredTenant(storageInput?: Storage | null) {
  const storage = getStorage(storageInput);
  if (!storage) return;
  storage.removeItem(PREFERRED_TENANT_KEY);
}

export function listKnownTenants(storageInput?: Storage | null) {
  const storage = getStorage(storageInput);
  if (!storage) return [];
  const parsed = safeParse(storage.getItem(KNOWN_TENANTS_KEY));
  const bySlug = new Map<string, KnownTenant>();
  (Array.isArray(parsed) ? parsed : []).forEach((item) => {
    const tenant = sanitizeKnownTenant(item);
    if (tenant) bySlug.set(tenant.slug, tenant);
  });
  // A token key also contains a tenant reference. Presence is not token validity.
  for (let index = 0; index < storage.length; index++) {
    const key = storage.key(index);
    if (!key?.startsWith(BOOKING_IDENTITY_PREFIX) || !storage.getItem(key)) continue;
    const slug = key.slice(BOOKING_IDENTITY_PREFIX.length);
    if (isValidTenantSlug(slug) && !bySlug.has(slug)) {
      bySlug.set(slug, { slug, displayName: slug, hasLocalIdentity: true, lastAccessAt: nowIso() });
    }
  }

  if (!Array.isArray(parsed) && bySlug.size === 0) {
    storage.removeItem(KNOWN_TENANTS_KEY);
    return [];
  }
  const tenants = [...bySlug.values()]
    .sort((left, right) => Date.parse(right.lastAccessAt) - Date.parse(left.lastAccessAt))
    .slice(0, MAX_KNOWN_TENANTS);
  writeKnownTenants(storage, tenants);
  return tenants;
}

export function upsertKnownTenant(
  tenant: { slug: string; displayName?: string; hasLocalIdentity?: boolean; lastAccessAt?: string },
  options: { preferWhenEmpty?: boolean; makePreferred?: boolean; source?: PreferredTenantSource } = {},
  storageInput?: Storage | null
) {
  const storage = getStorage(storageInput);
  if (!storage || !isValidTenantSlug(tenant.slug)) return null;

  const current = listKnownTenants(storage);
  const slug = tenant.slug.trim();
  const existing = current.find((item) => item.slug === slug);
  const knownTenant: KnownTenant = {
    slug,
    displayName: sanitizeDisplayName(tenant.displayName, existing?.displayName || slug),
    lastAccessAt: tenant.lastAccessAt || nowIso(),
    hasLocalIdentity: tenant.hasLocalIdentity ?? existing?.hasLocalIdentity ?? false
  };
  const next = [knownTenant, ...current.filter((item) => item.slug !== slug)]
    .slice(0, MAX_KNOWN_TENANTS);
  writeKnownTenants(storage, next);

  if (options.makePreferred || (options.preferWhenEmpty && !getPreferredTenant(storage))) {
    setPreferredTenant({ slug, source: options.source || "booking" }, storage);
  }

  return knownTenant;
}

export function removeKnownTenant(slug: string, storageInput?: Storage | null) {
  const storage = getStorage(storageInput);
  if (!storage || !isValidTenantSlug(slug)) return [];

  const normalized = slug.trim();
  const next = listKnownTenants(storage).filter((item) => item.slug !== normalized);
  writeKnownTenants(storage, next);
  storage.removeItem(bookingIdentityKey(normalized));

  if (getPreferredTenant(storage)?.slug === normalized) {
    if (next[0]) {
      setPreferredTenant({ slug: next[0].slug, source: "switcher" }, storage);
    } else {
      clearPreferredTenant(storage);
    }
  }

  return next;
}

export function clearRecurringAccess(storageInput?: Storage | null) {
  const storage = getStorage(storageInput);
  if (!storage) return;
  listKnownTenants(storage).forEach((tenant) => {
    storage.removeItem(bookingIdentityKey(tenant.slug));
  });
  storage.removeItem(PREFERRED_TENANT_KEY);
  storage.removeItem(KNOWN_TENANTS_KEY);
}

export function clearTenantRecurringAccess(slug: string, storageInput?: Storage | null) {
  const storage = getStorage(storageInput);
  if (!storage || !isValidTenantSlug(slug)) return [];
  return removeKnownTenant(slug, storage);
}

export function hasLocalBookingIdentity(slug: string, storageInput?: Storage | null) {
  const storage = getStorage(storageInput);
  return Boolean(storage && isValidTenantSlug(slug) && storage.getItem(bookingIdentityKey(slug.trim())));
}
