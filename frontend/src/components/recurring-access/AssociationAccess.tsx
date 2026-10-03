"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { AuthSession } from "@/services/auth.service";
import { bookingIdentityKey, upsertKnownTenant } from "@/lib/recurring-access.storage";
import { useAuth } from "@/hooks/useAuth";
import { LocateAccess } from "./LocateAccess";
import { Button } from "@/components/ui/button";
import { listClientAssociations, locateClientAssociation, isDefinitiveClientCredentialError, type ClientAssociation } from "@/services/usuario-cliente.service";

function SelectedAssociation({ selected, session }: { selected: ClientAssociation; session: AuthSession }) {
  const router = useRouter();
  const [state, setState] = useState<"checking" | "identify" | "error">("checking");
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    let live = true;
    setState("checking");
    const key = bookingIdentityKey(selected.slug);
    let token: string | null = null;
    async function resume() {
      try {
        token = window.localStorage.getItem(key);
        if (!token) { if (live) setState("identify"); return; }
        const result = await locateClientAssociation(session, selected.id, { token });
        if (!live) return;
        if (result?.slug !== selected.slug || !result.identity?.token) throw new Error("Resposta de identificação indisponível.");
        window.localStorage.setItem(key, result.identity.token);
        upsertKnownTenant({ slug: selected.slug, displayName: selected.displayName, hasLocalIdentity: true },
          { makePreferred: true, source: "access" });
        router.push(`/agendar/${encodeURIComponent(selected.slug)}`);
      } catch (error) {
        if (!live) return;
        if (isDefinitiveClientCredentialError(error)) {
          try {
            if (window.localStorage.getItem(key) === token) {
              window.localStorage.removeItem(key);
              upsertKnownTenant({ slug: selected.slug, displayName: selected.displayName, hasLocalIdentity: false });
            }
          } catch { /* Identification remains available if storage is restricted. */ }
          setState("identify");
        } else setState("error");
      }
    }
    void resume();
    return () => { live = false; };
  }, [selected, session, attempt, router]);
  if (state === "checking") return <p role="status" className="mt-4">Validando seu acesso...</p>;
  if (state === "error") return <div role="alert" className="mt-4 grid gap-3">
    <p>Não foi possível validar seu acesso agora. Tente novamente.</p>
    <Button onClick={() => setAttempt(value => value + 1)}>Tentar novamente</Button>
  </div>;
  return <LocateAccess initialPhone={selected.telefone}
    locateAssociation={input => locateClientAssociation(session, selected.id, input)} />;
}

export function AssociationAccess() {
  const { session } = useAuth();
  const [items, setItems] = useState<ClientAssociation[]>([]);
  const [selected, setSelected] = useState<ClientAssociation | null>(null);
  const [message, setMessage] = useState("Carregando estabelecimentos...");
  useEffect(() => {
    let live = true;
    setItems([]); setSelected(null);
    if (!session) { setMessage("Entre na área profissional para consultar seus vínculos."); return; }
    listClientAssociations(session).then(rows => {
      if (!live) return;
      setItems(rows); setSelected(rows.length === 1 ? rows[0] : null);
      setMessage(rows.length ? "Escolha o estabelecimento" : "Nenhum vínculo disponível.");
    }).catch(() => { if (live) setMessage("Não foi possível consultar os vínculos. Tente novamente."); });
    return () => { live = false; };
  }, [session]);
  return <main className="mx-auto max-w-lg p-6">
    <h1 className="text-2xl font-bold">Acessar como cliente</h1>
    {selected && session ? <>
      <p className="mt-4">{selected.displayName}</p>
      <SelectedAssociation key={`${session.usuario.id}:${selected.id}`} selected={selected} session={session} />
      {items.length > 1 ? <Button variant="ghost" onClick={() => setSelected(null)}>Trocar estabelecimento</Button> : null}
    </> : <div className="mt-4 grid gap-3"><p>{message}</p>{items.map(item =>
      <Button key={item.id} variant="outline" onClick={() => setSelected(item)}>{item.displayName}</Button>)}</div>}
  </main>;
}
