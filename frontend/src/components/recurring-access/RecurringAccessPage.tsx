"use client";
import { ContextAccessLink } from "@/components/app/ContextAccessLink";

import {
  ArrowRight,
  Building2,
  CalendarDays,
  Clock3,
  Loader2,
  LogOut,
  RefreshCcw,
  Scissors,
  UserRound
} from "lucide-react";
import Link from "next/link";
import { LocateAccess } from "./LocateAccess";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { InstallPwaPrompt } from "@/components/pwa/InstallPwaPrompt";
import {
  getPublicBookingCatalog,
  getPublicClientMe,
  getUpcomingPublicAppointments,
  identifyPublicBookingClient,
  type PublicBookingCatalog,
  type PublicClientMe,
  type PublicOperationalAppointment
} from "@/services/public-booking.service";
import {
  bookingIdentityKey,
  clearTenantRecurringAccess,
  getPreferredTenant,
  hasLocalBookingIdentity,
  listKnownTenants,
  setPreferredTenant,
  upsertKnownTenant,
  type KnownTenant
} from "@/lib/recurring-access.storage";
import { APP_BRAND } from "@/config/app-brand";
import { writeLastContext } from "@/lib/last-context";

type AccessState = "loading" | "empty" | "choose" | "recover" | "unavailable" | "ready";

function formatDateTime(value?: string) {
  if (!value) return "Horario nao informado";
  return new Date(value).toLocaleString("pt-BR", {
    dateStyle: "short",
    timeStyle: "short"
  });
}

function sortAppointments(appointments: PublicOperationalAppointment[]) {
  return [...appointments].sort((left, right) => (
    new Date(left.data_inicio).getTime() - new Date(right.data_inicio).getTime()
  ));
}

export function RecurringAccessPage() {
  useEffect(() => { writeLastContext("client"); }, []);
  const [state, setState] = useState<AccessState>("loading");
  const [knownTenants, setKnownTenants] = useState<KnownTenant[]>([]);
  const [currentSlug, setCurrentSlug] = useState("");
  const [catalog, setCatalog] = useState<PublicBookingCatalog | null>(null);
  const [clientName, setClientName] = useState("");
  const [appointments, setAppointments] = useState<PublicOperationalAppointment[]>([]);
  const [profile, setProfile] = useState<PublicClientMe | null>(null);
  const [profileOpen, setProfileOpen] = useState(false);
  const [profileLoading, setProfileLoading] = useState(false);
  const [switcherOpen, setSwitcherOpen] = useState(false);
  const [message, setMessage] = useState("");

  const currentTenantName = catalog?.tenant.nome_fantasia
    || knownTenants.find((tenant) => tenant.slug === currentSlug)?.displayName
    || "Estabelecimento";
  const nextAppointment = useMemo(() => sortAppointments(appointments)[0] || null, [appointments]);

  const refreshKnownTenants = useCallback(() => {
    setKnownTenants(listKnownTenants());
  }, []);

  const markIdentityUnavailable = useCallback((slug: string, displayName: string) => {
    window.localStorage.removeItem(bookingIdentityKey(slug));
    upsertKnownTenant({ slug, displayName, hasLocalIdentity: false });
    refreshKnownTenants();
    setState("recover");
    setMessage("Precisamos confirmar sua identidade para acessar seus horarios e dados.");
  }, [refreshKnownTenants]);

  const loadTenant = useCallback(async (slug: string) => {
    const normalizedSlug = slug.trim();
    if (!normalizedSlug) {
      setState("empty");
      return;
    }

    setState("loading");
    setMessage("");
    setCurrentSlug(normalizedSlug);
    setProfile(null);
    setProfileOpen(false);

    let nextCatalog: PublicBookingCatalog | null = null;

    try {
      nextCatalog = await getPublicBookingCatalog(normalizedSlug);
      setCatalog(nextCatalog);
      upsertKnownTenant({
        slug: normalizedSlug,
        displayName: nextCatalog.tenant.nome_fantasia,
        hasLocalIdentity: hasLocalBookingIdentity(normalizedSlug)
      });
      refreshKnownTenants();

      const token = window.localStorage.getItem(bookingIdentityKey(normalizedSlug));
      if (!token) {
        setState("recover");
        setMessage("Precisamos confirmar sua identidade para acessar seus horarios e dados.");
        return;
      }

      const identity = await identifyPublicBookingClient(normalizedSlug, {
        token,
        origem: "acesso_recorrente",
        contexto: {
          referrer: document.referrer || undefined,
          user_agent: window.navigator.userAgent,
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
          locale: window.navigator.language
        }
      });

      if (!identity.client) {
        markIdentityUnavailable(normalizedSlug, nextCatalog.tenant.nome_fantasia);
        return;
      }

      setClientName(identity.client.nome || "");
      upsertKnownTenant({
        slug: normalizedSlug,
        displayName: nextCatalog.tenant.nome_fantasia,
        hasLocalIdentity: true
      }, { preferWhenEmpty: true, source: "access" });
      refreshKnownTenants();

      const upcoming = await getUpcomingPublicAppointments(normalizedSlug, identity.token || token);
      setAppointments(upcoming.appointments || []);
      setState("ready");
    } catch (error) {
      const text = error instanceof Error ? error.message : "Nao foi possivel carregar este acesso.";
      const isIdentityError = /token|identidade|cliente/i.test(text);

      if (isIdentityError && nextCatalog) {
        markIdentityUnavailable(normalizedSlug, nextCatalog.tenant.nome_fantasia);
        return;
      }

      setState("unavailable");
      setMessage(text);
    }
  }, [markIdentityUnavailable, refreshKnownTenants]);

  useEffect(() => {
    try {
    const tenants = listKnownTenants();
    setKnownTenants(tenants);
    const preferred = getPreferredTenant();
    const preferredSlug = preferred?.slug || (tenants.length === 1 ? tenants[0].slug : "");

    if (preferredSlug) {
      loadTenant(preferredSlug);
      return;
    }

    setState(tenants.length > 1 ? "choose" : "empty");
    } catch {
      setState("unavailable");
      setMessage("Não foi possível ler o acesso salvo neste dispositivo. Verifique as permissões de armazenamento e tente novamente.");
    }
  }, [loadTenant]);

  async function chooseTenant(slug: string) {
    setPreferredTenant({ slug, source: "switcher" });
    setSwitcherOpen(false);
    await loadTenant(slug);
  }

  async function openProfile() {
    if (!currentSlug) return;
    const token = window.localStorage.getItem(bookingIdentityKey(currentSlug));
    if (!token) {
      setState("recover");
      setMessage("Precisamos confirmar sua identidade para acessar seus dados.");
      return;
    }

    setProfileOpen(true);
    setProfileLoading(true);
    try {
      const nextProfile = await getPublicClientMe(currentSlug, token);
      setProfile(nextProfile);
    } catch {
      markIdentityUnavailable(currentSlug, currentTenantName);
      setProfileOpen(false);
    } finally {
      setProfileLoading(false);
    }
  }

  function signOutCurrentTenant() {
    if (!currentSlug) return;
    const nextTenants = clearTenantRecurringAccess(currentSlug);
    setKnownTenants(nextTenants);
    setCatalog(null);
    setClientName("");
    setAppointments([]);
    setProfile(null);
    setProfileOpen(false);

    if (nextTenants[0]) {
      loadTenant(nextTenants[0].slug);
      return;
    }

    setCurrentSlug("");
    setState("empty");
    setMessage("Seu acesso rapido foi removido deste dispositivo.");
  }

  return (
    <main className="min-h-screen bg-[#fff8f8] text-foreground">
      <div className="mx-auto flex min-h-screen w-full max-w-3xl flex-col px-5 py-6 sm:px-8">
        <header className="flex items-center justify-between gap-4 py-2">
          <div className="flex items-center gap-3">
            <span className="grid h-11 w-11 place-items-center rounded-full bg-primary text-white">
              <Scissors className="h-5 w-5" aria-hidden="true" />
            </span>
            <div>
              <p className="font-display text-2xl">{APP_BRAND.appName}</p>
              <p className="text-xs font-semibold text-muted-foreground">Acesso rapido</p>
            </div>
          </div>
          {knownTenants.length > 1 ? (
            <Button type="button" variant="ghost" onClick={() => setSwitcherOpen((current) => !current)}>
              <Building2 className="h-4 w-4" aria-hidden="true" />
              Trocar
            </Button>
          ) : null}
        </header>
        {(
          <div className="flex justify-end">
            <ContextAccessLink target="professional" />
          </div>
        )}

        {state === "loading" ? (
          <section className="grid flex-1 place-items-center" aria-live="polite">
            <div className="flex items-center gap-3 rounded-lg border border-primary/15 bg-white px-4 py-3 text-sm font-semibold shadow-sm">
              <Loader2 className="h-4 w-4 animate-spin text-primary" aria-hidden="true" />
              Carregando seu acesso...
            </div>
          </section>
        ) : null}

        {state === "empty" ? (
          <section className="flex flex-1 flex-col justify-center py-10">
            <p className="text-xs font-bold uppercase text-accent">Primeiro acesso</p>
            <h1 className="mt-2 font-display text-4xl leading-tight">Seu acesso rapido precisa ser configurado.</h1>
            <p className="mt-4 text-sm leading-6 text-muted-foreground">
              Abra o link de agendamento do estabelecimento uma vez. Depois disso, este dispositivo podera lembrar o acesso.
            </p>
            {process.env.NEXT_PUBLIC_DEV_PWA_DIAGNOSTICS === "true" ? (
              <Link href="/pwa-diagnostics" prefetch={false} className="mt-6 self-start text-xs text-muted-foreground underline underline-offset-4">
                Diagnóstico DEV
              </Link>
            ) : null}
            {message ? <p className="mt-4 rounded-lg border border-primary/20 bg-white p-3 text-sm">{message}</p> : null}
            <LocateAccess />
          </section>
        ) : null}

        {state === "choose" ? (
          <section className="flex flex-1 flex-col justify-center py-10">
            <p className="text-xs font-bold uppercase text-accent">Estabelecimentos</p>
            <h1 className="mt-2 font-display text-4xl leading-tight">Escolha um acesso salvo neste dispositivo.</h1>
            <div className="mt-6 grid gap-3">
              {knownTenants.map((tenant) => (
                <button
                  key={tenant.slug}
                  type="button"
                  onClick={() => chooseTenant(tenant.slug)}
                  className="flex min-h-16 items-center justify-between gap-4 rounded-lg border border-border bg-white px-4 py-3 text-left shadow-sm transition hover:border-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <span>
                    <strong className="block text-sm">{tenant.displayName}</strong>
                    <span className="text-xs text-muted-foreground">/{tenant.slug}</span>
                  </span>
                  <ArrowRight className="h-4 w-4 text-primary" aria-hidden="true" />
                </button>
              ))}
            </div>
          </section>
        ) : null}

        {state === "recover" || state === "unavailable" ? (
          <section className="flex flex-1 flex-col justify-center py-10">
            <p className="text-xs font-bold uppercase text-accent">{currentTenantName}</p>
            <h1 className="mt-2 font-display text-4xl leading-tight">
              {state === "recover" ? "Confirme sua identidade para continuar." : "Este acesso nao esta disponivel."}
            </h1>
            <p className="mt-4 text-sm leading-6 text-muted-foreground">{message}</p>
            <div className="mt-6 flex flex-col gap-3 sm:flex-row">
              {currentSlug ? (
                <Button asChild>
                  <Link href={`/agendar/${encodeURIComponent(currentSlug)}`}>
                    <RefreshCcw className="h-4 w-4" aria-hidden="true" />
                    Continuar
                  </Link>
                </Button>
              ) : null}
              {knownTenants.length > 1 ? (
                <Button type="button" variant="outline" onClick={() => setState("choose")}>
                  Trocar estabelecimento
                </Button>
              ) : null}
              {currentSlug ? (
                <Button type="button" variant="ghost" onClick={signOutCurrentTenant}>
                  Remover deste dispositivo
                </Button>
              ) : null}
            </div>
          </section>
        ) : null}

        {state === "ready" ? (
          <section className="flex flex-1 flex-col gap-5 py-8">
            <div>
              <p className="text-xs font-bold uppercase text-accent">{currentTenantName}</p>
              <h1 className="mt-2 font-display text-4xl leading-tight">
                {clientName ? `Ola, ${clientName}` : "Seu acesso esta pronto"}
              </h1>
            </div>

            <InstallPwaPrompt eligible />

            <section className="rounded-lg border border-primary/20 bg-white p-5 shadow-sm" aria-labelledby="next-appointment-title">
              <p className="text-xs font-bold uppercase text-accent">Proximo horario</p>
              <h2 id="next-appointment-title" className="mt-2 text-xl font-bold">
                {nextAppointment?.servico?.nome || "Nenhum horario futuro encontrado"}
              </h2>
              {nextAppointment ? (
                <>
                  <p className="mt-2 text-sm text-muted-foreground">
                    {formatDateTime(nextAppointment.data_inicio)} - {nextAppointment.profissional?.nome_publico || "Profissional"}
                  </p>
                  <div className="mt-4 flex flex-wrap gap-2">
                    {nextAppointment.operational?.links?.reagendar ? (
                      <Button asChild variant="outline">
                        <a href={nextAppointment.operational.links.reagendar}>Reagendar</a>
                      </Button>
                    ) : null}
                    {nextAppointment.operational?.links?.cancelar ? (
                      <Button asChild variant="ghost">
                        <a href={nextAppointment.operational.links.cancelar}>Cancelar</a>
                      </Button>
                    ) : null}
                  </div>
                </>
              ) : (
                <p className="mt-2 text-sm text-muted-foreground">
                  Quando houver um horario futuro neste estabelecimento, ele aparecera aqui.
                </p>
              )}
            </section>

            <nav className="grid gap-3" aria-label="Acoes do acesso recorrente">
              <Button asChild size="lg" className="w-full justify-between px-5">
                <Link href={`/agendar/${encodeURIComponent(currentSlug)}`}>
                  <span className="inline-flex items-center gap-2">
                    <CalendarDays className="h-4 w-4" aria-hidden="true" />
                    Agendar novo horario
                  </span>
                  <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </Link>
              </Button>
              <Button type="button" variant="outline" size="lg" className="w-full justify-start" onClick={() => setAppointments(sortAppointments(appointments))}>
                <Clock3 className="h-4 w-4" aria-hidden="true" />
                Meus horarios
              </Button>
              <Button type="button" variant="outline" size="lg" className="w-full justify-start" onClick={openProfile}>
                <UserRound className="h-4 w-4" aria-hidden="true" />
                Meus dados
              </Button>
              {knownTenants.length > 1 ? (
                <Button type="button" variant="ghost" size="lg" className="w-full justify-start" onClick={() => setSwitcherOpen((current) => !current)}>
                  <Building2 className="h-4 w-4" aria-hidden="true" />
                  Trocar estabelecimento
                </Button>
              ) : null}
              <Button type="button" variant="ghost" size="lg" className="w-full justify-start" onClick={signOutCurrentTenant}>
                <LogOut className="h-4 w-4" aria-hidden="true" />
                Sair deste dispositivo
              </Button>
            </nav>

            {appointments.length > 0 ? (
              <section className="rounded-lg border border-border bg-white p-5 shadow-sm" aria-labelledby="appointments-title">
                <h2 id="appointments-title" className="text-lg font-bold">Meus horarios</h2>
                <div className="mt-4 grid gap-3">
                  {sortAppointments(appointments).map((appointment) => (
                    <article key={appointment.id} className="rounded-lg border border-border bg-secondary/25 p-4">
                      <p className="text-sm font-bold">{appointment.servico?.nome || "Atendimento"}</p>
                      <p className="mt-1 text-sm text-muted-foreground">
                        {formatDateTime(appointment.data_inicio)} - {appointment.profissional?.nome_publico || "Profissional"}
                      </p>
                    </article>
                  ))}
                </div>
              </section>
            ) : null}
          </section>
        ) : null}

        {switcherOpen ? (
          <section className="mb-6 rounded-lg border border-border bg-white p-4 shadow-sm" aria-label="Estabelecimentos lembrados neste dispositivo">
            <p className="text-xs font-bold uppercase text-accent">Estabelecimentos lembrados neste dispositivo</p>
            <div className="mt-3 grid gap-2">
              {knownTenants.map((tenant) => (
                <button
                  key={tenant.slug}
                  type="button"
                  onClick={() => chooseTenant(tenant.slug)}
                  className="flex min-h-12 items-center justify-between gap-3 rounded-lg border border-border px-3 py-2 text-left text-sm hover:border-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  aria-current={tenant.slug === currentSlug ? "true" : undefined}
                >
                  <span>
                    <strong>{tenant.slug === currentSlug ? "* " : ""}{tenant.displayName}</strong>
                    <span className="block text-xs text-muted-foreground">/{tenant.slug}</span>
                  </span>
                  <ArrowRight className="h-4 w-4 text-primary" aria-hidden="true" />
                </button>
              ))}
            </div>
          </section>
        ) : null}

        {profileOpen ? (
          <div className="fixed inset-0 z-50 flex items-end bg-foreground/35 px-3 py-4 backdrop-blur-sm sm:items-center sm:justify-center sm:p-6">
            <section
              role="dialog"
              aria-modal="true"
              aria-labelledby="recurring-profile-title"
              className="max-h-[90vh] w-full overflow-y-auto rounded-2xl border border-white/80 bg-white p-5 shadow-2xl sm:max-w-xl"
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs font-bold uppercase text-accent">{currentTenantName}</p>
                  <h2 id="recurring-profile-title" className="mt-1 text-xl font-bold">Meus dados</h2>
                </div>
                <Button type="button" variant="ghost" onClick={() => setProfileOpen(false)}>
                  Fechar
                </Button>
              </div>
              {profileLoading ? (
                <div className="mt-6 flex items-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                  Carregando seus dados...
                </div>
              ) : profile ? (
                <dl className="mt-5 grid gap-3 text-sm">
                  <Info label="Nome" value={profile.nome} />
                  <Info label="WhatsApp" value={profile.telefone} />
                  <Info label="Email" value={profile.email || "Nao informado"} />
                  <Info label="Campanhas" value={profile.aceita_campanhas ? "Autorizadas" : "Nao autorizadas"} />
                  <Button asChild variant="outline" className="mt-2">
                    <Link href={`/agendar/${encodeURIComponent(currentSlug)}`}>Editar no agendamento</Link>
                  </Button>
                </dl>
              ) : null}
            </section>
          </div>
        ) : null}
      </div>
    </main>
  );
}

function Info({ label, value }: { label: string; value?: string | null }) {
  return (
    <div className="rounded-lg border border-border bg-secondary/20 p-3">
      <dt className="text-xs font-bold uppercase text-muted-foreground">{label}</dt>
      <dd className="mt-1 break-words font-semibold">{value || "-"}</dd>
    </div>
  );
}
