/** Generate an opaque UUID without relying on secure-context-only APIs. */
export function createSessionId(): string {
  const crypto = globalThis.crypto;
  if (typeof crypto?.randomUUID === "function") return crypto.randomUUID();

  if (typeof crypto?.getRandomValues !== "function") {
    throw new Error("Este navegador nao permite gerar um identificador de sessao seguro.");
  }

  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  // UUID v4 version and RFC 4122 variant; all remaining bits are random.
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

export function getOrCreateSessionId(storage: Pick<Storage, "getItem" | "setItem">, key: string): string {
  const existing = storage.getItem(key);
  if (existing) return existing;

  const sessionId = createSessionId();
  storage.setItem(key, sessionId);
  return sessionId;
}
