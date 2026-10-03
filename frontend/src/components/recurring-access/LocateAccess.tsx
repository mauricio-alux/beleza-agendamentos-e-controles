"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { FeedbackMessage } from "@/components/ui/feedback-message";
import { locatePublicAccess } from "@/services/public-booking.service";
import { bookingIdentityKey, upsertKnownTenant } from "@/lib/recurring-access.storage";

type LocateProps = {
  initialPhone?: string;
  locateAssociation?: (input: { telefone: string; data_nascimento: string }) => ReturnType<typeof locatePublicAccess>;
};
export function LocateAccess({ initialPhone = "", locateAssociation }: LocateProps = {}) {
  const router = useRouter();
  const [phone, setPhone] = useState(initialPhone);
  const [birth, setBirth] = useState("");
  const [tenants, setTenants] = useState<Array<{ slug: string; displayName: string }>>([]);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  async function locate(slug?: string) {
    setBusy(true);
    setMessage("");
    try {
      const result = locateAssociation
        ? await locateAssociation({ telefone: phone, data_nascimento: birth })
        : await locatePublicAccess({ telefone: phone, data_nascimento: birth, ...(slug ? { slug } : {}) });
      if (result.slug && result.identity?.token) {
        window.localStorage.setItem(bookingIdentityKey(result.slug), result.identity.token);
        upsertKnownTenant({ slug: result.slug, displayName: tenants.find(item => item.slug === result.slug)?.displayName,
          hasLocalIdentity: true }, { makePreferred: true, source: "access" });
        setPhone(""); setBirth(""); setTenants([]);
        router.push(locateAssociation ? "/acesso" : `/agendar/${encodeURIComponent(result.slug)}`);
      } else {
        setTenants(result.tenants || []);
      }
    } catch (error) {
      setTenants([]);
      setMessage(error instanceof Error ? error.message : "Não foi possível localizar seu acesso. Tente novamente.");
    } finally { setBusy(false); }
  }
  function submit(event: FormEvent<HTMLFormElement>) { event.preventDefault(); void locate(); }
  return (
    <form onSubmit={submit} className="mt-6 grid w-full min-w-0 max-w-full grid-cols-1 gap-4">
      <h2 className="text-xl font-bold">Localizar meu acesso</h2>
      {message ? <FeedbackMessage tone="error" title="Confira os dados e tente novamente"
        message={message} autoFocus={false} className="box-border w-full min-w-0 max-w-full whitespace-normal [overflow-wrap:anywhere]" /> : null}
      <label className="grid min-w-0 grid-cols-1 gap-1 text-sm">Celular/WhatsApp (Brasil)
        <input className="w-full min-w-0 max-w-full rounded-lg border p-3" type="tel" required value={phone} autoComplete="off"
          onChange={event => { setPhone(event.target.value); setTenants([]); setMessage(""); }} disabled={busy} />
      </label>
      <label className="grid min-w-0 grid-cols-1 gap-1 text-sm">Data de nascimento
        <input className="w-full min-w-0 max-w-full rounded-lg border p-3" type="date" required value={birth} autoComplete="off"
          max={new Date().toISOString().slice(0, 10)}
          onChange={event => { setBirth(event.target.value); setTenants([]); setMessage(""); }} disabled={busy} />
      </label>
      <Button type="submit" disabled={busy}>{busy ? "Localizando..." : "Continuar"}</Button>
      {tenants.length > 1 ? <div className="grid gap-2" aria-label="Escolha o estabelecimento">
        <p>Escolha o estabelecimento</p>
        {tenants.map(tenant => <Button type="button" variant="outline" key={tenant.slug} disabled={busy}
          onClick={() => void locate(tenant.slug)}>{tenant.displayName}</Button>)}
      </div> : null}
      <p className="text-sm text-muted-foreground">Para iniciar um primeiro agendamento, utilize o link ou QR do estabelecimento, ou solicite o link pelo WhatsApp.</p>
    </form>
  );
}
