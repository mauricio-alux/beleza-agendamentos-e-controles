"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { isInternalContext } from "@/lib/internal-entry";
import { readClientAvailability, type Availability, type ClientAvailability } from "@/lib/context-availability";
import type { AuthSession } from "@/services/auth.service";

export function useContextAvailability() {
  const { revalidateSession, session } = useAuth();
  const [client, setClient] = useState<ClientAvailability>({ state: "indeterminate" });
  const [professional, setProfessional] = useState<Availability>("indeterminate");
  const [validatedSession, setValidatedSession] = useState<AuthSession | null>(null);
  const [checking, setChecking] = useState(true);
  const generation = useRef(0);
  const refresh = useCallback(async () => {
    const ticket = ++generation.current;
    setChecking(true); setClient({ state: "indeterminate" }); setProfessional("indeterminate");
    const [customer, internal] = await Promise.allSettled([readClientAvailability(), revalidateSession()]);
    if (ticket !== generation.current) return;
    setClient(customer.status === "fulfilled" ? customer.value : { state: "indeterminate" });
    if (internal.status === "fulfilled") {
      const next = internal.value.session;
      setValidatedSession(next);
      setProfessional(next && isInternalContext(next) ? "available" : "unavailable");
    } else { setValidatedSession(null); setProfessional("indeterminate"); }
    setChecking(false);
  }, [revalidateSession]);
  const observedSession = useRef(session);
  // AuthProvider publishes only accepted sessions; do not revalidate a refresh twice.
  useEffect(() => {
    if (!checking && observedSession.current !== session) {
      observedSession.current = session;
      setValidatedSession(session);
      setProfessional(session && isInternalContext(session) ? "available" : "unavailable");
    }
  }, [session, checking]);
  useEffect(() => {
    void refresh();
    const resume = () => { if (document.visibilityState === "visible") void refresh(); };
    const storage = () => { void refresh(); };
    window.addEventListener("pageshow", resume);
    window.addEventListener("storage", storage);
    document.addEventListener("visibilitychange", resume);
    return () => { generation.current++; window.removeEventListener("pageshow", resume); window.removeEventListener("storage", storage); document.removeEventListener("visibilitychange", resume); };
  }, [refresh]);
  return { client, professional, session: validatedSession, checking, refresh };
}
