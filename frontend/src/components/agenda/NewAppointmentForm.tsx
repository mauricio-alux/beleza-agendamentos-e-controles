"use client";

import { Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useState } from "react";
import { AgendaFilters } from "@/components/agenda/AgendaFilters";
import { CalendarView } from "@/components/agenda/CalendarView";
import { isPastDateInput } from "@/components/agenda/date";
import { SmartSlotSuggestions } from "@/components/agenda/SmartSlotSuggestions";
import { TimeSlots } from "@/components/agenda/TimeSlots";
import { DashboardCard } from "@/components/dashboard/DashboardCard";
import { LoadingButton } from "@/components/auth/LoadingButton";
import { Input } from "@/components/ui/input";
import { FeedbackMessage } from "@/components/ui/feedback-message";
import { Label } from "@/components/ui/label";
import { PhoneInput } from "@/components/ui/phone-input";
import { useAuth } from "@/hooks/useAuth";
import { clientsService, type SalonClient } from "@/services/clients.service";
import { useAgenda } from "@/hooks/useAgenda";
import { normalizePhoneToE164, type PhoneCountry } from "@/utils/phone";

export function NewAppointmentForm() {
  const router = useRouter();
  const { session } = useAuth();
  const [clients, setClients] = useState<SalonClient[]>([]);
  const [existingClientId, setExistingClientId] = useState("");
  const [birthDate, setBirthDate] = useState("");
  const [clientError, setClientError] = useState("");
  useEffect(() => {
    if (!session) return;
    let active = true;
    clientsService.list(session).then(rows => { if (active) setClients(rows); })
      .catch(() => { if (active) setClientError("Não foi possível carregar os clientes existentes."); });
    return () => { active = false; };
  }, [session]);
  const agenda = useAgenda({ preventPastAvailability: true });
  const isAvailabilityConfigured = Boolean(
    agenda.date
    && agenda.selectedProfessionalId
    && agenda.selectedServiceId
    && agenda.selectedSpecialtyId
  );
  const [selectedSlot, setSelectedSlot] = useState("");
  const [clientName, setClientName] = useState("");
  const [clientPhone, setClientPhone] = useState("");
  const [clientPhoneCountry, setClientPhoneCountry] = useState<PhoneCountry>("BR");
  const [clientEmail, setClientEmail] = useState("");
  const [cep, setCep] = useState("");
  const [uf, setUf] = useState("");
  const [cidade, setCidade] = useState("");
  const [logradouro, setLogradouro] = useState("");
  const [numero, setNumero] = useState("");
  const [isLoadingCep, setIsLoadingCep] = useState(false);
  const [cepMessage, setCepMessage] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    if (!isPastDateInput(agenda.date)) return;

    setSelectedSlot("");
    setClientName("");
    setClientPhone("");
    setClientPhoneCountry("BR");
    setClientEmail("");
    setCep("");
    setUf("");
    setCidade("");
    setLogradouro("");
    setNumero("");
    setCepMessage("");
    setSuccess("");

    const params = new URLSearchParams({ data: agenda.date });
    if (agenda.selectedProfessionalId) {
      params.set("profissional_id", agenda.selectedProfessionalId);
    }

    router.replace(`/agenda?${params.toString()}`);
  }, [agenda.date, agenda.selectedProfessionalId, router]);

  useEffect(() => {
    setSelectedSlot("");
    setSuccess("");
  }, [agenda.availabilityConfigKey]);

  useEffect(() => {
    const digits = cep.replace(/\D/g, "");

    if (digits.length < 8) {
      setCepMessage("");
      if (!digits.length) {
        setUf("");
        setCidade("");
        setLogradouro("");
        setNumero("");
      }
      return;
    }

    const controller = new AbortController();

    async function loadCep() {
      setIsLoadingCep(true);
      setCepMessage("");

      try {
        const response = await fetch(`https://viacep.com.br/ws/${digits}/json/`, { signal: controller.signal });
        const data = (await response.json()) as {
          erro?: boolean;
          uf?: string;
          localidade?: string;
          logradouro?: string;
        };

        if (data.erro) {
          setCepMessage("CEP nao encontrado.");
          return;
        }

        setUf(data.uf || "");
        setCidade(data.localidade || "");
        setLogradouro(data.logradouro || "");
      } catch (err) {
        if (!controller.signal.aborted) {
          setCepMessage("Não foi possível consultar o CEP.");
        }
      } finally {
        if (!controller.signal.aborted) {
          setIsLoadingCep(false);
        }
      }
    }

    loadCep();

    return () => controller.abort();
  }, [cep]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSuccess("");
    if (!event.currentTarget.reportValidity()) return;
    if (!selectedSlot) return;
    if (!existingClientId && (!clientName.trim() || !clientPhone.trim() || !birthDate)) {
      setClientError("Informe nome, WhatsApp e data de nascimento para o novo cliente."); return;
    }
    setClientError("");

    const created = await agenda.createAppointment({
      data_inicio: selectedSlot,
      cliente_id: existingClientId || undefined,
      cliente: existingClientId ? undefined : {
        data_nascimento: birthDate,
        nome: clientName.trim(),
        telefone: normalizePhoneToE164(clientPhone, clientPhoneCountry),
        email: clientEmail.trim() || undefined,
        endereco: cep.replace(/\D/g, "").length === 8
          ? {
              cep: cep.replace(/\D/g, ""),
              uf: uf.trim() || undefined,
              cidade: cidade.trim() || undefined,
              logradouro: logradouro.trim() || undefined,
              numero: numero.trim() || undefined
            }
          : undefined
      },
      client_context: {
        user_agent: window.navigator.userAgent,
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        locale: window.navigator.language
      }
    });

    if (created) {
      setBirthDate("");
      setExistingClientId("");
      setSuccess("Solicitação enviada. O horário fica reservado enquanto aguarda confirmação.");
      setSelectedSlot("");
      setClientName("");
      setClientPhone("");
      setClientPhoneCountry("BR");
      setClientEmail("");
      setCep("");
      setUf("");
      setCidade("");
      setLogradouro("");
      setNumero("");
      setCepMessage("");
    }
  }

  if (agenda.isLoading) {
    return (
      <div className="grid min-h-[45vh] place-items-center">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <form className="grid gap-5" onSubmit={handleSubmit}>
      <section className="rounded-[1.75rem] border border-white/80 bg-white/86 p-5 shadow-soft backdrop-blur sm:p-6">
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-accent">Novo atendimento</p>
        <h1 className="mt-1 font-display text-3xl text-foreground sm:text-4xl">Criar agendamento</h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
          Escolha data, profissional, serviço, especialidade e um horário disponível.
        </p>
      </section>

      {agenda.error || success ? (
        <FeedbackMessage
          tone={agenda.error ? "error" : "success"}
          message={agenda.error || success}
          className={agenda.error ? "p-5 text-base" : undefined}
        />
      ) : null}

      <div className="grid gap-5 xl:grid-cols-[360px_1fr]">
        <div className="space-y-5">
          <CalendarView date={agenda.date} onChange={agenda.setDate} />
          <DashboardCard title="Configuração">
            <AgendaFilters
              meta={agenda.meta}
              professionalId={agenda.selectedProfessionalId}
              serviceId={agenda.selectedServiceId}
              specialtyId={agenda.selectedSpecialtyId}
              onProfessionalChange={agenda.setSelectedProfessionalId}
              onServiceChange={agenda.setSelectedServiceId}
              onSpecialtyChange={agenda.setSelectedSpecialtyId}
              invalidFields={agenda.availabilityErrorFields}
              mode="creation"
            />
          </DashboardCard>
        </div>

        <div className="space-y-5">
          <DashboardCard title="Horários disponíveis">
            <div className="space-y-5">
              <SmartSlotSuggestions slots={agenda.smartSuggestions} onSelect={setSelectedSlot} />
              <TimeSlots
                availability={agenda.availability}
                selectedSlot={selectedSlot}
                onSelect={setSelectedSlot}
                isLoading={agenda.isRefreshingAvailability}
                isConfigured={isAvailabilityConfigured}
              />
            </div>
          </DashboardCard>

          <DashboardCard title="Cliente">
            {clientError ? <FeedbackMessage tone="error" message={clientError} /> : null}
            <label className="mb-4 grid gap-1 text-sm font-bold">Cliente existente ou novo
              <select value={existingClientId} onChange={(event) => setExistingClientId(event.target.value)} className="rounded-lg border p-3">
                <option value="">Criar novo cliente</option>
                {clients.map(client => <option key={client.id} value={client.id}>{client.nome} — {client.telefone}</option>)}
              </select>
            </label>
            <fieldset disabled={Boolean(existingClientId)} className={existingClientId ? "hidden" : ""}>
            <label className="mb-4 grid gap-1 text-sm font-bold">Data de nascimento (obrigatória para novo cliente)
              <Input type="date" required={!existingClientId} min="0001-01-01" max={new Date().toISOString().slice(0, 10)} value={birthDate}
                onChange={(event) => setBirthDate(event.target.value)}
                onInvalid={() => setClientError("Informe uma data de nascimento válida e não futura.")} />
            </label>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Nome">
                <Input value={clientName} onChange={(event) => setClientName(event.target.value)} placeholder="Nome do cliente" />
              </Field>
              <Field label="WhatsApp">
                <PhoneInput
                  value={clientPhone}
                  onChange={setClientPhone}
                  country={clientPhoneCountry}
                  onCountryChange={(country) => {
                    setClientPhoneCountry(country);
                    setClientPhone("");
                  }}
                />
              </Field>
              <Field label="Email">
                <Input value={clientEmail} onChange={(event) => setClientEmail(event.target.value)} placeholder="opcional@email.com" />
              </Field>
              <Field label="CEP (opcional)">
                <Input
                  value={cep}
                  onChange={(event) => setCep(formatCep(event.target.value))}
                  placeholder="00000-000"
                  maxLength={9}
                />
              </Field>
            </div>

            {cep.replace(/\D/g, "").length === 8 || isLoadingCep || cepMessage ? (
              <div className="mt-4 rounded-2xl border border-border bg-background/80 p-4">
                <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-[110px_1fr_1.4fr_120px]">
                  <Field label="Estado">
                    <Input value={uf} onChange={(event) => setUf(event.target.value.toUpperCase().slice(0, 2))} placeholder="UF" />
                  </Field>
                  <Field label="Cidade">
                    <Input value={cidade} onChange={(event) => setCidade(event.target.value)} placeholder="Cidade" />
                  </Field>
                  <Field label="Logradouro">
                    <Input value={logradouro} onChange={(event) => setLogradouro(event.target.value)} placeholder="Rua, avenida..." />
                  </Field>
                  <Field label="Numero">
                    <Input value={numero} onChange={(event) => setNumero(event.target.value)} placeholder="Opcional" />
                  </Field>
                </div>
                {isLoadingCep || cepMessage ? (
                  <p className="mt-3 text-xs font-semibold text-muted-foreground">
                    {isLoadingCep ? "Consultando CEP..." : cepMessage}
                  </p>
                ) : null}
              </div>
            ) : null}

            </fieldset>
            <LoadingButton className="mt-5 w-full" type="submit" isLoading={agenda.isSaving} disabled={!selectedSlot}>
              Criar agendamento
            </LoadingButton>
          </DashboardCard>
        </div>
      </div>
    </form>
  );
}

function formatCep(value: string) {
  const digits = value.replace(/\D/g, "").slice(0, 8);
  if (digits.length <= 5) return digits;
  return `${digits.slice(0, 5)}-${digits.slice(5)}`;
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      {children}
    </div>
  );
}
