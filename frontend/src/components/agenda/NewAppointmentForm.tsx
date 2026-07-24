"use client";

import { AlertCircle, Loader2 } from "lucide-react";
import { FormEvent, useEffect, useState } from "react";
import { AgendaFilters } from "@/components/agenda/AgendaFilters";
import { CalendarView } from "@/components/agenda/CalendarView";
import { SmartSlotSuggestions } from "@/components/agenda/SmartSlotSuggestions";
import { TimeSlots } from "@/components/agenda/TimeSlots";
import { DashboardCard } from "@/components/dashboard/DashboardCard";
import { LoadingButton } from "@/components/auth/LoadingButton";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PhoneInput } from "@/components/ui/phone-input";
import { useAgenda } from "@/hooks/useAgenda";
import { normalizePhoneToE164, type PhoneCountry } from "@/utils/phone";

export function NewAppointmentForm() {
  const agenda = useAgenda();
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
          setCepMessage("Nao foi possivel consultar o CEP.");
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
    if (!selectedSlot || !clientName.trim() || !clientPhone.trim()) return;

    const created = await agenda.createAppointment({
      data_inicio: selectedSlot,
      cliente: {
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
      setSuccess("Solicitacao enviada. O horario fica reservado enquanto aguarda confirmacao.");
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
          Escolha profissional, servico e um horario calculado pelo motor inteligente.
        </p>
      </section>

      {agenda.error || success ? (
        <div className="flex gap-3 rounded-2xl border border-primary/30 bg-secondary/80 p-4 text-sm text-foreground">
          <AlertCircle className="h-5 w-5 text-primary" />
          {success || agenda.error}
        </div>
      ) : null}

      <div className="grid gap-5 xl:grid-cols-[360px_1fr]">
        <div className="space-y-5">
          <CalendarView date={agenda.date} onChange={agenda.setDate} />
          <DashboardCard title="Configuracao">
            <AgendaFilters
              meta={agenda.meta}
              professionalId={agenda.selectedProfessionalId}
              serviceId={agenda.selectedServiceId}
              onProfessionalChange={agenda.setSelectedProfessionalId}
              onServiceChange={agenda.setSelectedServiceId}
            />
          </DashboardCard>
        </div>

        <div className="space-y-5">
          <DashboardCard title="Horarios disponiveis">
            <div className="space-y-5">
              <SmartSlotSuggestions slots={agenda.smartSuggestions} onSelect={setSelectedSlot} />
              <TimeSlots availability={agenda.availability} selectedSlot={selectedSlot} onSelect={setSelectedSlot} />
            </div>
          </DashboardCard>

          <DashboardCard title="Cliente">
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
