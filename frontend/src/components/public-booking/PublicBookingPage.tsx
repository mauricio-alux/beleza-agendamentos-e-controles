"use client";

import {
  CalendarDays,
  Check,
  Clock3,
  Loader2,
  Scissors,
  Sparkles,
  UserRound,
  X
} from "lucide-react";
import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { ContextAccessLink } from "@/components/app/ContextAccessLink";
import { isDefinitiveClientCredentialError } from "@/lib/client-credential-error";
import { InstallPwaPrompt } from "@/components/pwa/InstallPwaPrompt";
import { Input } from "@/components/ui/input";
import { FeedbackMessage } from "@/components/ui/feedback-message";
import { PhoneInput } from "@/components/ui/phone-input";
import {
  createPublicAppointment,
  getPublicAvailability,
  getPublicBookingCatalog,
  getPublicClientMe,
  getUpcomingPublicAppointments,
  identifyPublicBookingClient,
  updatePublicClientMe,
  type AvailabilitySlot,
  type PublicBookingCatalog,
  type PublicClientMe,
  type PublicOperationalAppointment
} from "@/services/public-booking.service";
import {
  isValidPhone,
  normalizePhoneToE164,
  formatStoredPhone,
  type PhoneCountry
} from "@/utils/phone";
import { APP_BRAND } from "@/config/app-brand";
import { ClientDebugPanel } from "@/components/dev/client-debug-panel";
import { upsertKnownTenant } from "@/lib/recurring-access.storage";
import { getOrCreateSessionId } from "@/lib/session-id";

type Props = {
  slug: string;
  campaign?: string;
  linkToken?: string;
};

type ClientSelfForm = {
  nome: string;
  telefone: string;
  email: string;
  cep: string;
  uf: string;
  cidade: string;
  logradouro: string;
  numero: string;
  aceita_campanhas: boolean;
};

const EMPTY_CLIENT_SELF_FORM: ClientSelfForm = {
  nome: "",
  telefone: "",
  email: "",
  cep: "",
  uf: "",
  cidade: "",
  logradouro: "",
  numero: "",
  aceita_campanhas: true
};

function localDate(offsetDays = 0) {
  const date = new Date();
  date.setDate(date.getDate() + offsetDays);
  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, "0"),
    String(date.getDate()).padStart(2, "0")
  ].join("-");
}

function currency(value?: number | null) {
  if (value == null) return "Sob consulta";
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL"
  }).format(value);
}

function formatDateTime(value?: string) {
  if (!value) return "Horário não informado";
  return new Date(value).toLocaleString("pt-BR", {
    dateStyle: "short",
    timeStyle: "short"
  });
}

function profileToForm(profile: PublicClientMe): ClientSelfForm {
  return {
    nome: profile.nome || "",
    telefone: formatStoredPhone(profile.telefone, "BR"),
    email: profile.email || "",
    cep: profile.endereco?.cep || "",
    uf: profile.endereco?.uf || "",
    cidade: profile.endereco?.cidade || "",
    logradouro: profile.endereco?.logradouro || "",
    numero: profile.endereco?.numero || "",
    aceita_campanhas: profile.aceita_campanhas !== false
  };
}

export function PublicBookingPage({ slug, campaign, linkToken }: Props) {
  const [catalog, setCatalog] = useState<PublicBookingCatalog | null>(null);
  const [serviceId, setServiceId] = useState("");
  const [specialtyId, setSpecialtyId] = useState("");
  const [professionalId, setProfessionalId] = useState("");
  const [date, setDate] = useState(localDate(1));
  const [slots, setSlots] = useState<AvailabilitySlot[]>([]);
  const [slot, setSlot] = useState("");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [birthDate, setBirthDate] = useState("");
  const [phoneCountry, setPhoneCountry] = useState<PhoneCountry>("BR");
  const [email, setEmail] = useState("");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(true);
  const [identityAttempt, setIdentityAttempt] = useState(0);
  const [identityUnavailable, setIdentityUnavailable] = useState(false);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [identityMessage, setIdentityMessage] = useState("");
  const [clientToken, setClientToken] = useState("");
  const [clientId, setClientId] = useState("");
  const [upcomingAppointments, setUpcomingAppointments] = useState<PublicOperationalAppointment[]>([]);
  const [loadingUpcoming, setLoadingUpcoming] = useState(false);
  const [rememberIdentity, setRememberIdentity] = useState(true);
  const [success, setSuccess] = useState(false);
  const [isClientDataOpen, setIsClientDataOpen] = useState(false);
  const [isClientDataEditing, setIsClientDataEditing] = useState(false);
  const [isClientDataLoading, setIsClientDataLoading] = useState(false);
  const [isClientDataSaving, setIsClientDataSaving] = useState(false);
  const [clientDataError, setClientDataError] = useState("");
  const [clientDataSuccess, setClientDataSuccess] = useState("");
  const [clientData, setClientData] = useState<PublicClientMe | null>(null);
  const [clientDataForm, setClientDataForm] = useState<ClientSelfForm>(EMPTY_CLIENT_SELF_FORM);
  const bookingChoiceRef = useRef<HTMLElement | null>(null);

  function rememberTenantAccess(hasLocalIdentity: boolean, displayName = catalog?.tenant.nome_fantasia) {
    if (!displayName || !hasLocalIdentity) return;
    upsertKnownTenant({
      slug,
      displayName,
      hasLocalIdentity: true
    }, {
      preferWhenEmpty: true,
      source: "booking"
    });
  }

  async function loadUpcomingAppointments(token: string) {
    if (!token) {
      setUpcomingAppointments([]);
      return;
    }

    setLoadingUpcoming(true);
    try {
      const data = await getUpcomingPublicAppointments(slug, token);
      setUpcomingAppointments(data.appointments || []);
    } catch (err) {
      console.warn("[public-booking] upcoming appointments unavailable", err);
      setUpcomingAppointments([]);
    } finally {
      setLoadingUpcoming(false);
    }
  }

  useEffect(() => {
    let active = true;
    setLoading(true);
    setIdentityUnavailable(false);
    const storageKey = `esthya:booking-identity:${slug}`;
    const storedToken = window.localStorage.getItem(storageKey) || undefined;
    const token = linkToken || storedToken;
    const sessionKey = `esthya:booking-session:${slug}`;
    const sessionId = getOrCreateSessionId(window.sessionStorage, sessionKey);

    getPublicBookingCatalog(slug)
      .then(async (data) => {
        if (!active) return;
        setCatalog(data);
        const service = data.servicos[0];
        const firstSpecialtyId = service?.especialidades_config?.[0]?.especialidade_id || "";
        const professional = service
          ? data.profissionais.find((item) => (
            item.servico_ids.includes(service.id)
            && (!firstSpecialtyId || item.especialidade_ids?.includes(firstSpecialtyId))
          ))
          : undefined;
        setServiceId(service?.id || "");
        setSpecialtyId(firstSpecialtyId);
        setProfessionalId(professional?.id || "");

        try {
          const identity = await identifyPublicBookingClient(slug, {
            token,
            campanha: campaign,
            origem: campaign ? "campanha" : "link_agendamento",
            sessao_id: sessionId,
            contexto: {
              referrer: document.referrer || undefined,
              user_agent: window.navigator.userAgent,
              timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
              locale: window.navigator.language
            }
          });

          if (!active || !identity.client) return;
          setClientToken(identity.token || token || "");
          setClientId(identity.clientId || "");
          setName(identity.client.nome || "");
          setEmail(identity.client.email || "");
          setPhone(formatStoredPhone(identity.client.telefone, "BR"));
          setPhoneCountry("BR");
          setIdentityMessage(`Bem-vindo de volta, ${identity.client.nome}. Seus dados foram reconhecidos.`);
          if (identity.token) window.localStorage.setItem(storageKey, identity.token);
          rememberTenantAccess(Boolean(identity.token || token), data.tenant.nome_fantasia);
          if (identity.token || token) {
            await loadUpcomingAppointments(identity.token || token || "");
          }
        } catch (error) {
          if (!active) return;
          setClientToken("");
          setClientId("");
          if (isDefinitiveClientCredentialError(error)) {
            if (window.localStorage.getItem(storageKey) === token) window.localStorage.removeItem(storageKey);
            setIdentityMessage("O link de identificacao nao e mais valido. Confirme seus dados para continuar.");
          } else {
            setIdentityUnavailable(true);
            setIdentityMessage("Não foi possível validar seu acesso agora. Tente novamente.");
          }
        }
      })
      .catch((err) => active && setError(err instanceof Error ? err.message : "Link indisponível."))
      .finally(() => active && setLoading(false));

    return () => {
      active = false;
    };
  }, [campaign, linkToken, slug, identityAttempt]);

  useEffect(() => {
    if (clientToken) {
      loadUpcomingAppointments(clientToken);
    }
  }, [clientToken]);

  const selectedService = catalog?.servicos.find((service) => service.id === serviceId);
  const selectedServiceSpecialties = selectedService?.especialidades_config || [];
  const selectedSpecialty = selectedServiceSpecialties.find((item) => item.especialidade_id === specialtyId) || selectedServiceSpecialties[0] || null;
  const compatibleProfessionals = useMemo(() => (
    catalog?.profissionais.filter((professional) => (
      professional.servico_ids.includes(serviceId)
      && (!specialtyId || professional.especialidade_ids?.includes(specialtyId))
    )) || []
  ), [catalog, serviceId, specialtyId]);
  const selectedProfessional = catalog?.profissionais.find((item) => item.id === professionalId);
  const orderedSlots = useMemo(() => [...slots].sort((left, right) => (
    new Date(left.inicio).getTime() - new Date(right.inicio).getTime()
  )), [slots]);
  const isIdentifiedClient = Boolean(clientToken && clientId && name.trim());
  const hasValidIdentityToken = isIdentifiedClient;
  const isNameValid = name.trim().length >= 2;
  const isPhoneValid = phoneCountry === "BR" && isValidPhone(phone, phoneCountry);
  const canSubmit = Boolean(slot && selectedService && selectedSpecialty && professionalId && isNameValid && (hasValidIdentityToken || (isPhoneValid && Boolean(birthDate))));

  useEffect(() => {
    if (!isIdentifiedClient || loading || success) return;
    const mediaQuery = window.matchMedia("(max-width: 1023px)");
    if (!mediaQuery.matches) return;
    window.setTimeout(() => {
      bookingChoiceRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 80);
  }, [isIdentifiedClient, loading, success]);

  useEffect(() => {
    if (!professionalId || !serviceId || !specialtyId || !date) {
      setSlots([]);
      return;
    }

    let active = true;
    setLoadingSlots(true);
    setSlot("");
    setError("");

    getPublicAvailability(slug, {
      data: date,
      profissional_id: professionalId,
      servico_id: serviceId,
      especialidade_id: specialtyId
    })
      .then((data) => active && setSlots(data.availability.slots || []))
      .catch((err) => {
        if (!active) return;
        setSlots([]);
        setError(err instanceof Error ? err.message : "Não foi possível carregar os horários.");
      })
      .finally(() => active && setLoadingSlots(false));

    return () => {
      active = false;
    };
  }, [date, professionalId, serviceId, specialtyId, slug]);

  function changeService(value: string) {
    setServiceId(value);
    const service = catalog?.servicos.find((item) => item.id === value);
    const nextSpecialtyId = service?.especialidades_config?.[0]?.especialidade_id || "";
    setSpecialtyId(nextSpecialtyId);
    const professionals = catalog?.profissionais.filter((item) => (
      item.servico_ids.includes(value)
      && (!nextSpecialtyId || item.especialidade_ids?.includes(nextSpecialtyId))
    )) || [];
    if (!professionals.some((item) => item.id === professionalId)) {
      setProfessionalId(professionals[0]?.id || "");
    }
  }

  function changeSpecialty(value: string) {
    setSpecialtyId(value);
    const professionals = catalog?.profissionais.filter((item) => (
      item.servico_ids.includes(serviceId)
      && item.especialidade_ids?.includes(value)
    )) || [];
    if (!professionals.some((item) => item.id === professionalId)) {
      setProfessionalId(professionals[0]?.id || "");
    }
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");

    if (!isNameValid) {
      setError("Informe seu nome para continuar.");
      return;
    }

    if (!hasValidIdentityToken && (!isPhoneValid || !birthDate)) {
      setError("Informe seu celular/WhatsApp para continuar.");
      return;
    }

    if (!slot) {
      setError("Selecione um horário para continuar.");
      return;
    }

    setSubmitting(true);

    try {
      const storageKey = `esthya:booking-identity:${slug}`;
      const sessionId = window.sessionStorage.getItem(`esthya:booking-session:${slug}`) || undefined;
      const client = hasValidIdentityToken ? undefined : {
        nome: name.trim(),
        telefone: normalizePhoneToE164(phone, phoneCountry),
        data_nascimento: birthDate,
        email: email.trim() || undefined
      };
      const identity = await identifyPublicBookingClient(slug, {
        token: clientToken || undefined,
        campanha: campaign,
        origem: campaign ? "campanha" : "link_agendamento",
        sessao_id: sessionId,
        cliente: client,
        contexto: {
          referrer: document.referrer || undefined,
          user_agent: window.navigator.userAgent,
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
          locale: window.navigator.language
        }
      });
      const resolvedToken = identity.token || clientToken;
      setClientId(identity.clientId || clientId);
      if (identity.client) {
        setName(identity.client.nome);
        setEmail(identity.client.email || "");
        setPhone(formatStoredPhone(identity.client.telefone, "BR"));
      }

      if (resolvedToken) {
        setClientToken(resolvedToken);
        if (rememberIdentity) {
          window.localStorage.setItem(storageKey, resolvedToken);
          rememberTenantAccess(true);
        } else {
          window.localStorage.removeItem(storageKey);
        }
        await loadUpcomingAppointments(resolvedToken);
      }

      await createPublicAppointment(slug, {
        profissional_id: professionalId,
        servico_id: serviceId,
        especialidade_id: specialtyId,
        data_inicio: slot,
        cliente: resolvedToken ? undefined : client,
        observacoes: notes.trim() || undefined,
        campanha: campaign,
        origem: campaign ? "campanha" : "link_agendamento",
        sessao_id: sessionId,
        client_context: {
          client_token: resolvedToken || undefined,
          user_agent: window.navigator.userAgent,
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
          locale: window.navigator.language
        }
      });
      setSuccess(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível solicitar o agendamento.");
    } finally {
      setSubmitting(false);
    }
  }

  async function openClientData() {
    if (!clientToken) return;

    setIsClientDataOpen(true);
    setIsClientDataEditing(false);
    setClientDataError("");
    setClientDataSuccess("");
    setIsClientDataLoading(true);

    try {
      const profile = await getPublicClientMe(slug, clientToken);
      setClientData(profile);
      setClientDataForm(profileToForm(profile));
    } catch (err) {
      setClientDataError(err instanceof Error ? err.message : "Nao foi possivel carregar seus dados.");
    } finally {
      setIsClientDataLoading(false);
    }
  }

  function closeClientData() {
    if (isClientDataEditing && clientData && JSON.stringify(clientDataForm) !== JSON.stringify(profileToForm(clientData))) {
      if (!window.confirm("Descartar alteracoes nao salvas?")) return;
    }

    setIsClientDataOpen(false);
    setIsClientDataEditing(false);
    setClientDataError("");
    setClientDataSuccess("");
  }

  async function saveClientData(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!clientToken) return;

    if (clientDataForm.nome.trim().length < 2) {
      setClientDataError("Informe seu nome para continuar.");
      return;
    }

    if (!isValidPhone(clientDataForm.telefone, "BR")) {
      setClientDataError("Informe um celular/WhatsApp valido para continuar.");
      return;
    }

    setIsClientDataSaving(true);
    setClientDataError("");
    setClientDataSuccess("");

    try {
      const profile = await updatePublicClientMe(slug, {
        token: clientToken,
        nome: clientDataForm.nome.trim(),
        telefone: normalizePhoneToE164(clientDataForm.telefone, "BR"),
        email: clientDataForm.email.trim() || null,
        endereco: {
          cep: clientDataForm.cep.trim() || undefined,
          uf: clientDataForm.uf.trim().toUpperCase() || undefined,
          cidade: clientDataForm.cidade.trim() || undefined,
          logradouro: clientDataForm.logradouro.trim() || undefined,
          numero: clientDataForm.numero.trim() || undefined
        },
        aceita_campanhas: clientDataForm.aceita_campanhas
      });

      setClientData(profile);
      setClientDataForm(profileToForm(profile));
      setName(profile.nome || "");
      setEmail(profile.email || "");
      setPhone(formatStoredPhone(profile.telefone, "BR"));
      setPhoneCountry("BR");
      setIdentityMessage(`Bem-vindo de volta, ${profile.nome}. Seus dados foram reconhecidos.`);
      setIsClientDataEditing(false);
      setClientDataSuccess("Seus dados foram atualizados com sucesso.");
    } catch (err) {
      setClientDataError(err instanceof Error ? err.message : "Nao foi possivel atualizar seus dados.");
    } finally {
      setIsClientDataSaving(false);
    }
  }

  function renderWithDebug(content: React.ReactNode) {
    return (
      <>
        {content}
        <ClientDebugPanel
          slug={slug}
          tenant={catalog?.tenant}
          client={clientId ? { id: clientId, nome: name, telefone: phone } : null}
          token={clientToken}
        />
      </>
    );
  }

  if (loading) {
    return renderWithDebug(
      <main className="grid min-h-screen place-items-center bg-[#fff8f8]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" aria-label="Carregando agendamento" />
      </main>
    );
  }

  if (identityUnavailable) {
    return renderWithDebug(<main className="grid min-h-screen place-items-center bg-[#fff8f8] px-6">
      <div role="alert" className="max-w-md text-center">
        <p>{identityMessage}</p>
        <Button className="mt-4" onClick={() => setIdentityAttempt(value => value + 1)}>Tentar novamente</Button>
      </div>
    </main>);
  }

  if (!catalog) {
    return renderWithDebug(
      <main className="grid min-h-screen place-items-center bg-[#fff8f8] px-6">
        <div className="max-w-md text-center">
          <Sparkles className="mx-auto h-9 w-9 text-primary" />
          <h1 className="mt-4 font-display text-3xl text-foreground">Link indisponível</h1>
          <p className="mt-2 text-sm text-muted-foreground">{error || "Este endereço não está ativo."}</p>
        </div>
      </main>
    );
  }

  if (success) {
    return renderWithDebug(
      <main className="grid min-h-screen place-items-center bg-[#fff8f8] px-6">
        <section className="w-full max-w-xl rounded-lg border border-primary/20 bg-white p-8 text-center shadow-soft">
          <span className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-primary text-white">
            <Check className="h-7 w-7" />
          </span>
          <p className="mt-5 text-xs font-bold uppercase text-accent">Solicitação enviada</p>
          <h1 className="mt-2 font-display text-3xl text-foreground">Seu horário foi reservado.</h1>
          <p className="mt-3 text-sm leading-6 text-muted-foreground">
            {catalog.tenant.nome_fantasia} recebeu o pedido e fará a confirmação do atendimento.
          </p>
          <div className="mt-6">
            <InstallPwaPrompt eligible={isIdentifiedClient && rememberIdentity} placement="booking-success" />
            <ContextAccessLink target="professional" />
          </div>
        </section>
      </main>
    );
  }

  const hasAvailableServices = catalog.servicos.length > 0;

  return renderWithDebug(
    <main className="min-h-screen bg-[#fff8f8] pb-12 text-foreground">
      <header className="border-b border-primary/15 bg-white/90">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-3 px-5 py-4 sm:px-8">
          <span className="grid h-10 w-10 place-items-center rounded-full bg-primary text-white">
            <Sparkles className="h-5 w-5" />
          </span>
          <div>
            <p className="font-display text-2xl">{APP_BRAND.appName}</p>
            <p className="text-xs text-muted-foreground">Agendamento online</p>
          </div>
          <div className="ml-auto"><ContextAccessLink target="professional" /></div>
        </div>
      </header>

      <section className="border-b border-primary/15 bg-secondary/55">
        <div className="mx-auto max-w-6xl px-5 py-8 sm:px-8 sm:py-10">
          <p className="text-xs font-bold uppercase text-accent">Agenda disponível</p>
          <h1 className="mt-2 font-display text-4xl sm:text-5xl">{catalog.tenant.nome_fantasia}</h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground">
            Escolha o serviço e encontre um horário disponível. A confirmação será enviada pelo salão.
          </p>
          {identityMessage ? (
            <div className="mt-3 flex max-w-2xl flex-col gap-3 rounded-lg border border-primary/25 bg-white px-4 py-3 text-sm font-semibold text-foreground sm:flex-row sm:items-center sm:justify-between">
              <p>{identityMessage}</p>
              {isIdentifiedClient ? (
                <Button type="button" variant="outline" onClick={openClientData} className="h-10 w-full sm:w-auto">
                  Meus dados
                </Button>
              ) : null}
            </div>
          ) : null}
          {(catalog.catalog_status?.unavailable_services || 0) > 0 ? (
            <p className="mt-3 hidden max-w-2xl rounded-lg border border-primary/20 bg-white/70 px-4 py-3 text-sm leading-6 text-muted-foreground sm:block">
              Alguns serviços estão temporariamente indisponíveis para agendamento online porque ainda não possuem um profissional habilitado.
            </p>
          ) : null}
        </div>
      </section>

      {!hasAvailableServices ? (
        <section className="mx-auto max-w-6xl px-5 py-8 sm:px-8">
          <div className="rounded-lg border border-primary/20 bg-white p-8 text-center shadow-soft">
            <CalendarDays className="mx-auto h-9 w-9 text-primary" />
            <h2 className="mt-4 text-xl font-bold">Nenhum serviço disponível no momento</h2>
            <p className="mx-auto mt-2 max-w-lg text-sm leading-6 text-muted-foreground">
              O salão ainda não possui serviços com profissionais habilitados para receber agendamentos online.
            </p>
          </div>
        </section>
      ) : (
      <>
      {!isIdentifiedClient ? (
      <section className="mx-auto max-w-6xl px-5 pt-8 sm:px-8">
        <div className="rounded-lg border border-border bg-white p-5 shadow-sm sm:p-6">
          <SectionTitle icon={UserRound} number="1" title="Seus dados" />
          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            <Field label="Nome" required>
              <Input value={name} onChange={(event) => setName(event.target.value)} placeholder="Como podemos chamar voce?" required />
            </Field>
            <Field label="Data de nascimento" required>
              <Input type="date" value={birthDate} onChange={(event) => setBirthDate(event.target.value)} required max={new Date().toISOString().slice(0, 10)} />
            </Field>
            <Field label="Email">
              <Input type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="opcional@email.com" />
            </Field>
            <div className="sm:col-span-2">
              <Field label="Celular/WhatsApp" required={!hasValidIdentityToken}>
                <PhoneInput
                  value={phone}
                  onChange={(value) => {
                    setPhone(value);
                    setClientToken("");
                    setClientId("");
                  }}
                  country={phoneCountry}
                  onCountryChange={(country) => {
                    setPhoneCountry(country);
                    setPhone("");
                    setClientToken("");
                    setClientId("");
                  }}
                  required={!hasValidIdentityToken}
                  invalid={!hasValidIdentityToken && phone.length > 0 && !isPhoneValid}
                />
                {!hasValidIdentityToken && phone.length > 0 && !isPhoneValid ? (
                  <p className="text-xs font-semibold text-primary">Informe um celular/WhatsApp valido para continuar.</p>
                ) : null}
              </Field>
            </div>
            <div className="sm:col-span-2">
              <Field label="Observacoes">
                <textarea
                  className="min-h-24 w-full resize-y rounded-2xl border border-input bg-white px-4 py-3 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                  value={notes}
                  onChange={(event) => setNotes(event.target.value)}
                  maxLength={1000}
                  placeholder="Alguma informacao importante para o atendimento?"
                />
              </Field>
            </div>
            <label className="sm:col-span-2 flex items-start gap-3 rounded-lg border border-border bg-secondary/35 p-4 text-sm">
              <input
                type="checkbox"
                className="mt-0.5 h-4 w-4 accent-primary"
                checked={rememberIdentity}
                onChange={(event) => setRememberIdentity(event.target.checked)}
              />
              <span>
                Reconhecer meus dados neste dispositivo para facilitar os proximos agendamentos.
              </span>
            </label>
          </div>
        </div>
      </section>
      ) : null}

      {(loadingUpcoming || upcomingAppointments.length > 0) ? (
        <section className="mx-auto max-w-6xl px-5 pt-8 sm:px-8">
          <div className="rounded-lg border border-primary/20 bg-white p-5 shadow-sm sm:p-6">
            <p className="text-xs font-bold uppercase text-accent">Seus horarios</p>
            <h2 className="mt-1 text-xl font-bold">Voce possui agendamentos futuros</h2>
            {loadingUpcoming ? (
              <div className="mt-4 flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                Consultando seus agendamentos...
              </div>
            ) : (
              <div className="mt-5 grid gap-3">
                {upcomingAppointments.map((appointment) => (
                  <div key={appointment.id} className="flex flex-col gap-4 rounded-lg border border-border bg-secondary/20 p-4 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p className="text-sm font-bold">{appointment.servico?.nome || "Atendimento"}</p>
                      <p className="mt-1 text-sm text-muted-foreground">
                        {formatDateTime(appointment.data_inicio)} · {appointment.profissional?.nome_publico || "Profissional"}
                      </p>
                      <span className="mt-2 inline-flex rounded-full bg-primary/10 px-3 py-1 text-xs font-bold uppercase text-primary">
                        {appointment.status}
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {appointment.operational?.links?.reagendar ? (
                        <a
                          className="inline-flex h-10 items-center justify-center rounded-2xl bg-primary px-4 text-sm font-bold text-white shadow-sm transition hover:bg-primary/90"
                          href={appointment.operational.links.reagendar}
                        >
                          Reagendar
                        </a>
                      ) : null}
                      {appointment.operational?.links?.cancelar ? (
                        <a
                          className="inline-flex h-10 items-center justify-center rounded-2xl border border-border bg-white px-4 text-sm font-bold transition hover:border-primary hover:text-primary"
                          href={appointment.operational.links.cancelar}
                        >
                          Cancelar
                        </a>
                      ) : null}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>
      ) : null}

      <form className="mx-auto grid max-w-6xl gap-6 px-5 py-8 sm:px-8 lg:grid-cols-[1fr_380px]" onSubmit={submit}>
        <div className="space-y-6">
          <section ref={bookingChoiceRef} className="scroll-mt-4 rounded-lg border border-border bg-white p-5 shadow-sm sm:p-6">
            <SectionTitle icon={Scissors} number={loadingUpcoming || upcomingAppointments.length > 0 ? "3" : "2"} title="Escolha o atendimento" mobilePlain={isIdentifiedClient} />
            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              <Field label="Serviço">
                <select className="h-12 w-full rounded-2xl border border-input bg-white px-4 text-sm" value={serviceId} onChange={(event) => changeService(event.target.value)}>
                  {catalog.servicos.map((service) => (
                    <option key={service.id} value={service.id}>
                      {service.nome}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Especialidade">
                <select className="h-12 w-full rounded-2xl border border-input bg-white px-4 text-sm" value={specialtyId} onChange={(event) => changeSpecialty(event.target.value)}>
                  {selectedServiceSpecialties.map((specialty) => (
                    <option key={specialty.especialidade_id} value={specialty.especialidade_id}>
                      {specialty.nome || "Especialidade"} · {currency(specialty.preco)} · {specialty.duracao_minutos || 0} min
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Profissional">
                <select className="h-12 w-full rounded-2xl border border-input bg-white px-4 text-sm" value={professionalId} onChange={(event) => setProfessionalId(event.target.value)}>
                  {compatibleProfessionals.map((professional) => (
                    <option key={professional.id} value={professional.id}>
                      {professional.nome_publico || "Profissional"}
                    </option>
                  ))}
                </select>
              </Field>
            </div>
          </section>

          <section className="rounded-lg border border-border bg-white p-5 shadow-sm sm:p-6">
            <SectionTitle icon={CalendarDays} number={loadingUpcoming || upcomingAppointments.length > 0 ? "4" : "3"} title="Escolha data e horário" mobilePlain={isIdentifiedClient} />
            <div className="mt-5">
              <Field label="Data">
                <Input type="date" min={localDate()} value={date} onChange={(event) => setDate(event.target.value)} />
              </Field>
            </div>
            <div className="mt-5 grid min-h-14 grid-cols-3 gap-2 sm:grid-cols-5">
              {loadingSlots ? (
                <div className="col-span-full flex items-center gap-2 py-4 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" /> Consultando horários...
                </div>
              ) : slots.length ? (
                orderedSlots.map((item) => (
                  <button
                    key={item.inicio}
                    type="button"
                    onClick={() => setSlot(item.inicio)}
                    className={`h-11 rounded-2xl border text-sm font-semibold transition ${
                      slot === item.inicio
                        ? "border-primary bg-primary text-white"
                        : "border-border bg-white hover:border-primary hover:text-primary"
                    }`}
                  >
                    {item.hora}
                  </button>
                ))
              ) : (
                <p className="col-span-full py-4 text-sm text-muted-foreground">Nenhum horário disponível nesta data.</p>
              )}
            </div>
          </section>

          {isIdentifiedClient ? (
            <section className="rounded-lg border border-border bg-white p-5 shadow-sm sm:p-6">
              <Field label="Observações para o atendimento">
                <textarea
                  className="min-h-24 w-full resize-y rounded-2xl border border-input bg-white px-4 py-3 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                  value={notes}
                  onChange={(event) => setNotes(event.target.value)}
                  maxLength={1000}
                  placeholder="Alguma informação importante para o atendimento?"
                />
              </Field>
            </section>
          ) : null}
        </div>

        <aside className="h-fit rounded-lg border border-primary/20 bg-white p-5 shadow-soft lg:sticky lg:top-6">
          <p className="text-xs font-bold uppercase text-accent">Resumo</p>
          <h2 className="mt-2 text-xl font-bold">{selectedService?.nome || "Escolha um serviço"}</h2>
          <div className="mt-5 space-y-3 text-sm">
            <Summary icon={Scissors} text={selectedSpecialty?.nome || "Especialidade"} />
            <Summary icon={UserRound} text={selectedProfessional?.nome_publico || "Profissional"} />
            <Summary icon={Clock3} text={`${selectedSpecialty?.duracao_minutos || 0} minutos`} />
            <Summary icon={CalendarDays} text={slot ? new Date(slot).toLocaleString("pt-BR", { dateStyle: "long", timeStyle: "short" }) : "Selecione um horário"} />
          </div>
          <div className="my-5 border-t border-border" />
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Valor</span>
            <strong className="text-xl">{currency(selectedSpecialty?.preco)}</strong>
          </div>
          {error ? <FeedbackMessage className="mt-4" tone="error" title="Confira os dados e tente novamente"
            message={error} autoFocus={false} /> : null}
          <Button className="mt-5 w-full" size="lg" disabled={submitting || !canSubmit}>
            {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
            Solicitar agendamento
          </Button>
        </aside>
      </form>
      </>
      )}
      {isClientDataOpen ? (
        <div className="fixed inset-0 z-50 flex items-end bg-foreground/35 px-3 py-4 backdrop-blur-sm sm:items-center sm:justify-center sm:p-6">
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="client-data-title"
            className="max-h-[92vh] w-full overflow-y-auto rounded-[1.5rem] border border-white/80 bg-white p-5 shadow-2xl sm:max-w-2xl sm:p-6"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-bold uppercase text-accent">Cliente identificado</p>
                <h2 id="client-data-title" className="mt-1 text-xl font-bold text-foreground">Meus dados</h2>
              </div>
              <Button type="button" variant="ghost" size="icon" onClick={closeClientData} aria-label="Fechar meus dados">
                <X className="h-5 w-5" aria-hidden="true" />
              </Button>
            </div>

            {isClientDataLoading ? (
              <div className="mt-6 flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                Carregando seus dados...
              </div>
            ) : (
              <form onSubmit={saveClientData} className="mt-5 grid gap-4">
                {!isClientDataEditing ? (
                  <div className="grid gap-3 rounded-lg border border-border bg-secondary/20 p-4 text-sm">
                    <ReadOnlyInfo label="Nome" value={clientDataForm.nome} />
                    <ReadOnlyInfo label="WhatsApp" value={formatStoredPhone(clientDataForm.telefone, "BR")} />
                    <ReadOnlyInfo label="Email" value={clientDataForm.email || "Nao informado"} />
                    <ReadOnlyInfo
                      label="Endereco"
                      value={[clientDataForm.logradouro, clientDataForm.numero, clientDataForm.cidade, clientDataForm.uf, clientDataForm.cep].filter(Boolean).join(", ") || "Nao informado"}
                    />
                    <ReadOnlyInfo label="Campanhas" value={clientDataForm.aceita_campanhas ? "Autorizadas" : "Nao autorizadas"} />
                  </div>
                ) : (
                  <div className="grid gap-4 sm:grid-cols-2">
                    <Field label="Nome" required>
                      <Input value={clientDataForm.nome} onChange={(event) => setClientDataForm((current) => ({ ...current, nome: event.target.value }))} required />
                    </Field>
                    <Field label="Email">
                      <Input type="email" value={clientDataForm.email} onChange={(event) => setClientDataForm((current) => ({ ...current, email: event.target.value }))} />
                    </Field>
                    <div className="sm:col-span-2">
                      <Field label="Celular/WhatsApp" required>
                        <PhoneInput
                          value={clientDataForm.telefone}
                          onChange={(value) => setClientDataForm((current) => ({ ...current, telefone: value }))}
                          country="BR"
                          onCountryChange={() => undefined}
                          required
                          invalid={clientDataForm.telefone.length > 0 && !isValidPhone(clientDataForm.telefone, "BR")}
                        />
                      </Field>
                    </div>
                    <Field label="CEP">
                      <Input value={clientDataForm.cep} onChange={(event) => setClientDataForm((current) => ({ ...current, cep: event.target.value }))} />
                    </Field>
                    <Field label="Estado">
                      <Input value={clientDataForm.uf} onChange={(event) => setClientDataForm((current) => ({ ...current, uf: event.target.value.toUpperCase().slice(0, 2) }))} />
                    </Field>
                    <Field label="Cidade">
                      <Input value={clientDataForm.cidade} onChange={(event) => setClientDataForm((current) => ({ ...current, cidade: event.target.value }))} />
                    </Field>
                    <Field label="Logradouro">
                      <Input value={clientDataForm.logradouro} onChange={(event) => setClientDataForm((current) => ({ ...current, logradouro: event.target.value }))} />
                    </Field>
                    <Field label="Numero">
                      <Input value={clientDataForm.numero} onChange={(event) => setClientDataForm((current) => ({ ...current, numero: event.target.value }))} />
                    </Field>
                    <label className="flex items-start gap-3 rounded-lg border border-border bg-secondary/25 p-4 text-sm sm:col-span-2">
                      <input
                        type="checkbox"
                        className="mt-0.5 h-4 w-4 accent-primary"
                        checked={clientDataForm.aceita_campanhas}
                        onChange={(event) => setClientDataForm((current) => ({ ...current, aceita_campanhas: event.target.checked }))}
                      />
                      <span>Autorizo receber campanhas e lembretes deste salao.</span>
                    </label>
                  </div>
                )}

                {clientDataError ? <p className="rounded-lg border border-primary/30 bg-secondary p-3 text-sm">{clientDataError}</p> : null}
                {clientDataSuccess ? <p className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm font-semibold text-emerald-800">{clientDataSuccess}</p> : null}

                <div className="grid gap-2 sm:grid-cols-2">
                  {isClientDataEditing ? (
                    <>
                      <Button type="button" variant="outline" onClick={() => {
                        if (clientData) setClientDataForm(profileToForm(clientData));
                        setIsClientDataEditing(false);
                        setClientDataError("");
                      }} disabled={isClientDataSaving}>
                        Cancelar
                      </Button>
                      <Button type="submit" disabled={isClientDataSaving}>
                        {isClientDataSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                        {isClientDataSaving ? "Salvando..." : "Salvar alteracoes"}
                      </Button>
                    </>
                  ) : (
                    <Button type="button" onClick={() => setIsClientDataEditing(true)} className="sm:col-span-2">
                      Editar dados
                    </Button>
                  )}
                </div>
              </form>
            )}
          </section>
        </div>
      ) : null}
    </main>
  );
}

function SectionTitle({
  icon: Icon,
  number,
  title,
  mobilePlain = false
}: {
  icon: typeof Scissors;
  number: string;
  title: string;
  mobilePlain?: boolean;
}) {
  return (
    <div className="flex items-center gap-3">
      <span className="grid h-9 w-9 place-items-center rounded-full bg-secondary text-primary">
        <Icon className="h-4 w-4" />
      </span>
      <div>
        {number ? <p className={`text-xs font-bold uppercase text-accent ${mobilePlain ? "hidden lg:block" : ""}`}>Etapa {number}</p> : null}
        <h2 className="text-lg font-bold">{title}</h2>
      </div>
    </div>
  );
}

function Field({ label, children, required = false }: { label: string; children: React.ReactNode; required?: boolean }) {
  return (
    <label className="grid gap-2 text-sm font-semibold">
      <span>
        {label}
        {required ? <span className="ml-1 text-primary" aria-hidden="true">*</span> : null}
      </span>
      {children}
    </label>
  );
}

function ReadOnlyInfo({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <p className="text-xs font-bold uppercase text-muted-foreground">{label}</p>
      <p className="mt-1 break-words font-semibold text-foreground">{value}</p>
    </div>
  );
}

function Summary({ icon: Icon, text }: { icon: typeof Clock3; text: string }) {
  return (
    <div className="flex items-start gap-3">
      <Icon className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
      <span>{text}</span>
    </div>
  );
}
