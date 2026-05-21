"use client";

import Link from "next/link";
import { ArrowLeft, CheckCircle2, Loader2, XCircle } from "lucide-react";
import { useEffect, useState } from "react";
import { DashboardCard } from "@/components/dashboard/DashboardCard";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { agendaService, type Appointment } from "@/services/agenda.service";
import { formatTime, toCurrency } from "@/components/agenda/date";

type AppointmentDetailProps = {
  id: string;
};

export function AppointmentDetail({ id }: AppointmentDetailProps) {
  const { session } = useAuth();
  const [appointment, setAppointment] = useState<Appointment | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  async function load() {
    if (!session) return;
    setIsLoading(true);
    setError("");
    try {
      setAppointment(await agendaService.getById(session, id));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Nao foi possivel carregar o agendamento.");
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session, id]);

  async function confirm() {
    if (!session) return;
    await agendaService.confirm(session, id);
    await load();
  }

  async function cancel() {
    if (!session) return;
    await agendaService.cancel(session, id, "Cancelado pelo painel");
    await load();
  }

  if (isLoading) {
    return (
      <div className="grid min-h-[45vh] place-items-center">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  if (!appointment || error) {
    return (
      <DashboardCard>
        <p className="text-sm font-semibold text-primary">{error || "Agendamento nao encontrado."}</p>
      </DashboardCard>
    );
  }

  const service = appointment.servicos?.[0];

  return (
    <div className="grid gap-5">
      <section className="rounded-[1.75rem] border border-white/80 bg-white/86 p-5 shadow-soft backdrop-blur sm:p-6">
        <Button asChild variant="outline">
          <Link href="/agenda">
            <ArrowLeft className="h-4 w-4" />
            Voltar
          </Link>
        </Button>
        <p className="mt-5 text-xs font-bold uppercase tracking-[0.18em] text-accent">Agendamento</p>
        <h1 className="mt-1 font-display text-3xl text-foreground sm:text-4xl">
          {appointment.cliente?.nome || "Cliente"}
        </h1>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">
          {formatTime(appointment.data_inicio)} ate {formatTime(appointment.data_fim)} · {service?.nome_servico || "Servico"}
        </p>
      </section>

      <DashboardCard title="Resumo do atendimento">
        <div className="grid gap-3 sm:grid-cols-2">
          <Info label="Status" value={appointment.status} />
          <Info label="Valor" value={toCurrency(appointment.valor_total)} />
          <Info label="Profissional" value={appointment.profissional?.nome_publico || "Profissional"} />
          <Info label="WhatsApp" value={appointment.cliente?.telefone || "-"} />
        </div>
        <div className="mt-5 flex flex-wrap gap-2">
          {appointment.status === "pendente" ? (
            <Button type="button" variant="accent" onClick={confirm}>
              <CheckCircle2 className="h-4 w-4" />
              Confirmar
            </Button>
          ) : null}
          {appointment.status !== "cancelado" ? (
            <Button type="button" variant="outline" onClick={cancel}>
              <XCircle className="h-4 w-4" />
              Cancelar
            </Button>
          ) : null}
        </div>
      </DashboardCard>
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-border bg-background/80 p-4">
      <p className="text-xs font-bold uppercase tracking-[0.16em] text-muted-foreground">{label}</p>
      <p className="mt-2 font-bold text-foreground">{value}</p>
    </div>
  );
}
