export type AppContext = "client" | "professional";
export const LAST_CONTEXT_KEY = "esthya:last-context";

export function parseAppContext(value: unknown): AppContext | null {
  return value === "client" || value === "professional" ? value : null;
}

export function readLastContext(): AppContext | null {
  try {
    const value = JSON.parse(window.localStorage.getItem(LAST_CONTEXT_KEY) || "null");
    if (!value || value.version !== 1 || typeof value.updatedAt !== "string"
      || !Number.isFinite(Date.parse(value.updatedAt))) return null;
    return parseAppContext(value.context);
  } catch { return null; }
}

// Navigation preference only; never stores identity or authorization.
export function writeLastContext(context: AppContext) {
  if (!parseAppContext(context)) return;
  try {
    window.localStorage.setItem(LAST_CONTEXT_KEY, JSON.stringify({
      version: 1, context, updatedAt: new Date().toISOString()
    }));
  } catch { /* Storage failure must not prevent entry. */ }
}
