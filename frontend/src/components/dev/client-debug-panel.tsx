"use client";

import {
  Bug,
  Check,
  ChevronDown,
  ChevronUp,
  Clipboard,
  RefreshCcw,
  Smartphone
} from "lucide-react";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";

type Props = {
  slug: string;
  tenant?: {
    id: string;
    nome_fantasia: string;
  } | null;
  client?: {
    id?: string;
    nome?: string;
    telefone?: string;
  } | null;
  token?: string;
};

type Snapshot = {
  token: string;
  deviceHash: string;
  browserHash: string;
  sessionId: string;
};

const EMPTY_SNAPSHOT: Snapshot = {
  token: "",
  deviceHash: "",
  browserHash: "",
  sessionId: ""
};

function firstStoredValue(storage: Storage, keys: string[]) {
  for (const key of keys) {
    const value = storage.getItem(key);
    if (value) return value;
  }
  return "";
}

function removeTokenFromUrl() {
  const url = new URL(window.location.href);
  url.searchParams.delete("tk");
  window.history.replaceState({}, "", url.toString());
}

export function ClientDebugPanel({ slug, tenant, client, token = "" }: Props) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [snapshot, setSnapshot] = useState<Snapshot>(EMPTY_SNAPSHOT);
  const isClientSchedulingFlow = pathname === "/agendar"
    || pathname.startsWith("/agendar/");
  const enabled = process.env.NODE_ENV === "development"
    && process.env.NEXT_PUBLIC_DEV_MODE === "true"
    && isClientSchedulingFlow;
  const identityKey = `esthya:booking-identity:${slug}`;
  const sessionKey = `esthya:booking-session:${slug}`;

  const refresh = useCallback(() => {
    if (!enabled) return;
    setSnapshot({
      token: token || firstStoredValue(window.localStorage, [identityKey, "cliente_token"]),
      deviceHash: firstStoredValue(window.localStorage, ["device_hash"])
        || firstStoredValue(window.sessionStorage, ["device_hash"]),
      browserHash: firstStoredValue(window.localStorage, ["browser_hash"])
        || firstStoredValue(window.sessionStorage, ["browser_hash"]),
      sessionId: firstStoredValue(window.sessionStorage, [sessionKey, "session_context"])
        || firstStoredValue(window.localStorage, ["session_context"])
    });
  }, [enabled, identityKey, sessionKey, token]);

  useEffect(() => {
    refresh();
    window.addEventListener("focus", refresh);
    window.addEventListener("storage", refresh);
    return () => {
      window.removeEventListener("focus", refresh);
      window.removeEventListener("storage", refresh);
    };
  }, [refresh]);

  const sessionContext = useMemo(() => (
    snapshot.sessionId
      ? {
        session_id: snapshot.sessionId,
        referrer: document.referrer || null,
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        locale: window.navigator.language
      }
      : null
  ), [snapshot.sessionId]);

  const diagnostic = useMemo(() => ({
    cliente: client?.id ? {
      id: client.id,
      nome: client.nome || null,
      whatsapp: client.telefone || null
    } : null,
    token: snapshot.token || null,
    tenant: tenant ? {
      id: tenant.id,
      nome: tenant.nome_fantasia,
      slug
    } : null,
    device_hash: snapshot.deviceHash || null,
    browser_hash: snapshot.browserHash || null,
    session_context: sessionContext
  }), [client, sessionContext, slug, snapshot, tenant]);

  if (!enabled) return null;

  function clearToken() {
    window.localStorage.removeItem(identityKey);
    window.localStorage.removeItem("cliente_token");
    removeTokenFromUrl();
    window.location.reload();
  }

  function simulateNewDevice() {
    const localKeys = Array.from(
      { length: window.localStorage.length },
      (_, index) => window.localStorage.key(index)
    ).filter((key): key is string => Boolean(key));
    const sessionKeys = Array.from(
      { length: window.sessionStorage.length },
      (_, index) => window.sessionStorage.key(index)
    ).filter((key): key is string => Boolean(key));

    localKeys
      .filter((key) => (
        ["cliente_token", "device_hash", "browser_hash", "session_context"].includes(key)
        || key.includes(":booking-identity:")
      ))
      .forEach((key) => window.localStorage.removeItem(key));

    sessionKeys
      .filter((key) => (
        ["device_hash", "browser_hash", "session_context"].includes(key)
        || key.includes(":booking-session:")
      ))
      .forEach((key) => window.sessionStorage.removeItem(key));

    removeTokenFromUrl();
    window.location.reload();
  }

  async function copyToken() {
    if (!snapshot.token) return;
    if (window.navigator.clipboard) {
      await window.navigator.clipboard.writeText(snapshot.token);
    } else {
      const input = document.createElement("textarea");
      input.value = snapshot.token;
      input.style.position = "fixed";
      input.style.opacity = "0";
      document.body.appendChild(input);
      input.select();
      document.execCommand("copy");
      input.remove();
    }
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  }

  return (
    <aside className="fixed inset-x-0 bottom-0 z-[100] border-t border-violet-300 bg-[#211b2d] text-white shadow-[0_-10px_35px_rgba(33,27,45,0.22)]">
      <div className="mx-auto max-w-6xl px-4">
        <button
          type="button"
          className="flex min-h-12 w-full items-center justify-between gap-4 text-left"
          onClick={() => setOpen((current) => !current)}
          aria-expanded={open}
        >
          <span className="flex min-w-0 items-center gap-3">
            <Bug className="h-4 w-4 shrink-0 text-violet-300" />
            <span>
              <strong className="block text-xs uppercase text-violet-200">DEV Panel</strong>
              <span className="block truncate text-xs text-white/70">
                {client?.id ? `${client.nome || "Cliente"} identificado` : "Nenhum cliente identificado."}
              </span>
            </span>
          </span>
          {open ? <ChevronDown className="h-4 w-4" /> : <ChevronUp className="h-4 w-4" />}
        </button>

        {open ? (
          <div className="grid max-h-[70vh] gap-4 overflow-y-auto border-t border-white/15 py-4 lg:grid-cols-[1fr_1.15fr]">
            <div className="space-y-3">
              <DebugValue label="Cliente" value={client?.nome || "Nenhum cliente identificado."} />
              <DebugValue label="WhatsApp" value={client?.telefone} />
              <DebugValue label="ID do cliente" value={client?.id} mono />
              <DebugValue label="Token atual" value={snapshot.token} mono />
              <DebugValue
                label="Estabelecimento atual"
                value={tenant ? `${tenant.nome_fantasia} (${tenant.id})` : ""}
                mono
              />
              <DebugValue label="Device Hash" value={snapshot.deviceHash} mono />
              <DebugValue label="Browser Hash" value={snapshot.browserHash} mono />
              <DebugValue label="SessionContext" value={snapshot.sessionId} mono />

              <div className="flex flex-wrap gap-2 pt-1">
                <Button type="button" variant="outline" onClick={clearToken}>
                  <RefreshCcw className="h-4 w-4" />
                  Limpar token
                </Button>
                <Button type="button" variant="outline" onClick={simulateNewDevice}>
                  <Smartphone className="h-4 w-4" />
                  Simular novo dispositivo
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={copyToken}
                  disabled={!snapshot.token}
                >
                  {copied ? <Check className="h-4 w-4" /> : <Clipboard className="h-4 w-4" />}
                  {copied ? "Token copiado" : "Copiar token"}
                </Button>
              </div>
            </div>

            <div>
              <p className="mb-2 text-xs font-bold uppercase text-violet-200">Log de diagnostico</p>
              <pre className="max-h-72 overflow-auto whitespace-pre-wrap break-all border border-white/15 bg-black/25 p-3 text-xs leading-5 text-white/80">
                {JSON.stringify(diagnostic, null, 2)}
              </pre>
            </div>
          </div>
        ) : null}
      </div>
    </aside>
  );
}

function DebugValue({
  label,
  value,
  mono = false
}: {
  label: string;
  value?: string;
  mono?: boolean;
}) {
  return (
    <div className="grid gap-1 sm:grid-cols-[120px_1fr] sm:gap-3">
      <span className="text-xs font-bold uppercase text-violet-200">{label}</span>
      <span className={`break-all text-xs text-white/80 ${mono ? "font-mono" : ""}`}>
        {value || "Nao disponivel"}
      </span>
    </div>
  );
}
