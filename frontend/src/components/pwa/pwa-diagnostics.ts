export type PwaEvent =
  | "manifest detected" | "manifest not detected"
  | "service worker registration attempted" | "service worker registered"
  | "service worker registration failed" | "service worker update failed"
  | "service worker controlling page" | "service worker not controlling page"
  | "beforeinstallprompt received" | "deferred prompt stored" | "deferred prompt consumed"
  | "install CTA visible" | "install CTA clicked"
  | "deferred prompt available=true" | "deferred prompt available=false"
  | "prompt invoked" | "userChoice=accepted" | "userChoice=dismissed"
  | "prompt error" | "fallback displayed reason=no-event"
  | "fallback displayed reason=prompt-error" | "appinstalled received"
  | "standalone=true" | "standalone=false"
  | "prompt finished" | "userChoice=unknown" | "initialization" | "display-mode"
  | "visibilitychange" | "pagehide" | "pageshow" | "focus" | "blur";

// Explicit opt-in for a DEV deployment (including its production-mode build).
// Never accept user data, errors, URLs or storage values as log payloads.
export function pwaLog(event: PwaEvent, details: Details = {}) {
  if (!enabled()) return;
  console.info(`[PWA-DIAG] ${event}`);
  if (typeof window === 'undefined') return;
  const safe = cleanDetails(details);
  if (event === 'initialization') safe.context = environment();
  if (event === 'visibilitychange') safe.visibility = document.visibilityState;
  rows = [...timeline(), {at:Date.now(),event,details:safe}].slice(-250);
  try { window.localStorage.setItem(DIAG_KEY, JSON.stringify(rows)); } catch { /* Memory fallback. */ }
  window.dispatchEvent(new Event('pwa-diagnostic-change'));
}

export const DIAG_KEY = 'pwa:dev-diagnostics:v1';
export const enabled = () => process.env.NEXT_PUBLIC_DEV_PWA_DIAGNOSTICS === 'true';
type Details = { visibility?: string; context?: ReturnType<typeof environment>; deferred?: boolean; cooldown?: boolean; runningStandalone?: boolean; elapsedMs?: number; errorType?: string; previous?: string };
export type Entry = { at:number; event:PwaEvent; details:Details };
let rows: Entry[] = [];
let loaded = false;
const TTL = 86400000;
const eventPattern = /^(manifest (detected|not detected)|service worker (registration attempted|registered|registration failed|update failed|controlling page|not controlling page)|beforeinstallprompt received|deferred prompt (stored|consumed|available=true|available=false)|install CTA (visible|clicked)|prompt (invoked|finished|error)|userChoice=(accepted|dismissed|unknown)|fallback displayed reason=(no-event|prompt-error)|appinstalled received|standalone=(true|false)|initialization|display-mode|visibilitychange|pagehide|pageshow|focus|blur)$/;
export function cleanDetails(value: Details = {}): Details {
  const out: Details = {};
  if (['visible','hidden','prerender'].includes(value?.visibility || '')) out.visibility = value.visibility;
  if (!value || typeof value !== 'object') return out;
  for (const key of ['deferred','cooldown','runningStandalone'] as const) if (typeof value[key] === 'boolean') out[key] = value[key];
  if (typeof value.elapsedMs === 'number' && Number.isFinite(value.elapsedMs)) out.elapsedMs = Math.max(0,Math.min(TTL,value.elapsedMs));
  if (['Error','TypeError','NotAllowedError','InvalidStateError','AbortError','UnknownError'].includes(value.errorType || '')) out.errorType = value.errorType;
  if (['not-observed','accepted','dismissed','appinstalled-event'].includes(value.previous || '')) out.previous = value.previous;
  if (value.context && typeof value.context === 'object') {
    const c = value.context;
    try {
      const origin = new URL(c.origin).origin;
      if (origin === location.origin) out.context = {
        origin, pathname:safePath(c.pathname),url:origin+safePath(c.pathname),
        userAgent:typeof c.userAgent === 'string'?c.userAgent.slice(0,400):'',
        platform:typeof c.platform === 'string'?c.platform.slice(0,80):'',
        secureContext:c.secureContext===true,https:c.https===true,online:c.online===true,
        visibility:c.visibility==='hidden'?'hidden':'visible',runningStandalone:c.runningStandalone===true,
        displayMode:['standalone','browser','unknown'].includes(c.displayMode)?c.displayMode:'unknown',
        navigatorStandalone:typeof c.navigatorStandalone==='boolean'?c.navigatorStandalone:null
      };
    } catch { /* Invalid context discarded. */ }
  }
  return out;
}
export function timeline(): Entry[] {
  if (!enabled() || typeof window === 'undefined') return [];
  if (!loaded) {
    loaded = true;
    try {
      const raw = window.localStorage.getItem(DIAG_KEY);
      const data = raw && raw.length < 150000 ? JSON.parse(raw) : [];
      rows = Array.isArray(data) ? data.filter(e => e && typeof e.event === 'string' && eventPattern.test(e.event) && Number.isFinite(e.at) && e.at <= Date.now() && e.at > Date.now()-TTL).slice(-250).map(e => ({at:e.at,event:e.event,details:cleanDetails(e.details)})) : [];
    } catch { rows = []; }
  }
  rows = rows.filter(e => e.at > Date.now()-TTL);
  return rows.slice();
}
export function clearDiagnostics() {
  if (!enabled()) return;
  rows = []; loaded = true;
  try { window.localStorage.removeItem(DIAG_KEY); } catch { /* optional */ }
  window.dispatchEvent(new Event('pwa-diagnostic-change'));
}
export function previousInstall() {
  const last = timeline().filter(e => ['userChoice=accepted','userChoice=dismissed','appinstalled received'].includes(e.event)).at(-1)?.event;
  return last === 'appinstalled received' ? 'appinstalled-event' : last === 'userChoice=accepted' ? 'accepted' : last === 'userChoice=dismissed' ? 'dismissed' : 'not-observed';
}
export function safePath(path: string) {
  if (['/','/acesso','/pwa-diagnostics','/sw.js','/manifest.webmanifest'].includes(path)) return path;
  return path.startsWith('/agendar/') ? '/agendar/[slug]' : '/[redacted]';
}
export function actualStandalone() {
  return window.matchMedia('(display-mode: standalone)').matches || (navigator as Navigator & {standalone?:boolean}).standalone === true;
}
export function environment() {
  return {origin:location.origin,url:location.origin+safePath(location.pathname),pathname:safePath(location.pathname),userAgent:navigator.userAgent.slice(0,400),platform:navigator.platform?.slice(0,80),secureContext:window.isSecureContext,https:location.protocol==='https:',online:navigator.onLine,visibility:document.visibilityState,runningStandalone:actualStandalone(),displayMode:actualStandalone()?'standalone':window.matchMedia('(display-mode: browser)').matches?'browser':'unknown',navigatorStandalone:(navigator as Navigator & {standalone?:boolean}).standalone ?? null};
}
export function classification(events: Entry[], resourceFailure: boolean) {
  const last = events.filter(e => e.event.startsWith('userChoice=')).at(-1);
  const installed = events.some(e => e.event === 'appinstalled received' && (!last || e.at >= last.at - 60000));
  if (last?.event === 'userChoice=dismissed') return 'Instalação recusada pelo usuário/browser.';
  if (installed) return 'Evento appinstalled observado; verificar registro Android/WebAPK e abertura real. Não comprova conclusão do pacote.';
  if (last?.event === 'userChoice=accepted') return resourceFailure ? 'Suspeita de falha pós-aceite associada ao intermediário. Necessária confirmação adicional; appinstalled não observado.' : 'Aceite observado; appinstalled não observado nesta captura. Instalação não confirmada.';
  return events.some(e => e.event === 'beforeinstallprompt received') ? 'Promoção recebida; resultado de instalação não observado.' : 'beforeinstallprompt não observado nesta captura; não comprova falta de installability.';
}


