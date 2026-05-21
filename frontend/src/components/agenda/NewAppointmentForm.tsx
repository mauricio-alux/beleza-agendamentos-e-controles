"use client";

import { AlertCircle, Loader2 } from "lucide-react";
import { FormEvent, useState } from "react";
import { AgendaFilters } from "@/components/agenda/AgendaFilters";
import { CalendarView } from "@/components/agenda/CalendarView";
import { TimeSlots } from "@/components/agenda/TimeSlots";
import { DashboardCard } from "@/components/dashboard/DashboardCard";
import { LoadingButton } from "@/components/auth/LoadingButton";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAgenda } from "@/hooks/useAgenda";
import { formatPhone, normalizePhoneToE164 } from "@/utils/phone";

export function NewAppointmentForm() {
  const agenda = useAgenda();
  const [selectedSlot, setSelectedSlot] = useState("");
  const [clientName, setClientName] = useState("");
  const [clientPhone, setClientPhone] = useState("");
  const [clientEmail, setClientEmail] = useState("");
  const [observacoes, setObservacoes] = useState("");
  const [success, setSuccess] = useState("");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSuccess("");
    if (!selectedSlot || !clientName.trim() || !clientPhone.trim()) return;

    const created = await agenda.createAppointment({
      data_inicio: selectedSlot,
      cliente: {
        nome: clientName.trim(),
        telefone: normalizePhoneToE164(clientPhone),
        email: clientEmail.trim() || undefined
      },
      observacoes: observacoes.trim() || undefined
    });

    if (created) {
      setSuccess("Agendamento criado com sucesso.");
      setSelectedSlot("");
      setClientName("");
      setClientPhone("");
      setClientEmail("");
      setObservacoes("");
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
            <TimeSlots availability={agenda.availability} selectedSlot={selectedSlot} onSelect={setSelectedSlot} />
          </DashboardCard>

          <DashboardCard title="Cliente">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Nome">
                <Input value={clientName} onChange={(event) => setClientName(event.target.value)} placeholder="Nome do cliente" />
              </Field>
              <Field label="WhatsApp">
                <Input
                  value={clientPhone}
                  onChange={(event) => setClientPhone(formatPhone(event.target.value))}
                  placeholder="(11) 99911-1774"
                />
              </Field>
              <Field label="Email">
                <Input value={clientEmail} onChange={(event) => setClientEmail(event.target.value)} placeholder="opcional@email.com" />
              </Field>
              <Field label="Observacoes">
                <Input value={observacoes} onChange={(event) => setObservacoes(event.target.value)} placeholder="Opcional" />
              </Field>
            </div>
            <LoadingButton className="mt-5 w-full" type="submit" isLoading={agenda.isSaving} disabled={!selectedSlot}>
              Criar agendamento
            </LoadingButton>
          </DashboardCard>
        </div>
      </div>
    </form>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      {children}
    </div>
  );
}
