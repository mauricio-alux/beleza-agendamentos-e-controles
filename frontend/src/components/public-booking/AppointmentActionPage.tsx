"use client";

import { AlertCircle, CalendarDays, Check, Loader2, XCircle } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  getPublicAppointmentActionContext,
  runPublicAppointmentAction,
  type PublicOperationalAppointment
} from "@/services/public-booking.service";
import { APP_BRAND } from "@/config/app-brand";

type Props = {
  token?: string;
  command?: "confirmar" | "cancelar";
};

function currency(value?: number | null) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL"
  }).format(value || 0);
}

function formatDate(value?: string) {
  if (!value) return "Data nao informada";
  return new Date(value).toLocaleString("pt-BR", {
    dateStyle: "long",
    timeStyle: "short"
  });
}

export function AppointmentActionPage({ token = "", command }: Props) {
  const [appointment, setAppointment] = useState<PublicOperationalAppointment | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [reason, setReason] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    if (!token) {
      setError("Token de agendamento nao informado.");
      setLoading(false);
      return;
    }

    let active = true;
    setLoading(true);
    setError("");

    getPublicAppointmentActionContext(token, command)
      .then((data) => active && setAppointment(data))
      .catch((err) => active && setError(err instanceof Error ? err.message : "Nao foi possivel localizar o agendamento."))
      .finally(() => active && setLoading(false));

    return () => {
      active = false;
    };
  }, [command, token]);

  const title = useMemo(() => {
    if (command === "cancelar") return "Cancelar agendamento";
    if (command === "confirmar") return "Confirmar agendamento";
    return "Acao do agendamento";
  }, [command]);

  async function submit() {
    if (!token || !command) {
      setError("Acao invalida para este link.");
      return;
    }

    setSubmitting(true);
    setError("");
    setMessage("");

    try {
      const data = await runPublicAppointmentAction({
        token,
        cmd: command,
        motivo: command === "cancelar" ? reason.trim() || undefined : undefined
      });
      setAppointment(data);
      setMessage(command === "confirmar" ? "Agendamento confirmado com sucesso." : "Agendamento cancelado com sucesso.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Nao foi possivel concluir a acao.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="min-h-screen bg-[#fff8f8] text-foreground">
      <header className="border-b border-primary/15 bg-white/90">
        <div className="mx-auto flex max-w-4xl items-center gap-3 px-5 py-4">
          <span className="grid h-10 w-10 place-items-center rounded-full bg-primary text-white">
            <CalendarDays className="h-5 w-5" />
          </span>
          <div>
            <p className="font-display text-2xl">{APP_BRAND.appName}</p>
            <p className="text-xs text-muted-foreground">Agendamento online</p>
          </div>
        </div>
      </header>

      <section className="mx-auto max-w-4xl px-5 py-10">
        <div className="rounded-lg border border-primary/20 bg-white p-6 shadow-soft">
          <p className="text-xs font-bold uppercase text-accent">Link operacional</p>
          <h1 className="mt-2 font-display text-4xl">{title}</h1>

          {loading ? (
            <div className="mt-8 flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Carregando agendamento...
            </div>
          ) : appointment ? (
            <div className="mt-8 grid gap-5">
              <div className="rounded-lg border border-border bg-secondary/25 p-5">
                <h2 className="text-xl font-bold">{appointment.servico?.nome || "Servico"}</h2>
                <p className="mt-2 text-sm text-muted-foreground">
                  {appointment.tenant.nome_fantasia || "Salao"} · {appointment.profissional?.nome_publico || "Profissional"}
                </p>
                <p className="mt-2 text-sm">{formatDate(appointment.data_inicio)}</p>
                <p className="mt-2 text-sm font-bold">{currency(appointment.valor_total || appointment.servico?.preco)}</p>
                <p className="mt-3 inline-flex rounded-full bg-primary/10 px-3 py-1 text-xs font-bold uppercase text-primary">
                  {appointment.status}
                </p>
              </div>

              {command === "cancelar" ? (
                <label className="grid gap-2 text-sm font-semibold">
                  Motivo do cancelamento
                  <textarea
                    className="min-h-24 resize-y rounded-2xl border border-input bg-white px-4 py-3 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                    value={reason}
                    onChange={(event) => setReason(event.target.value)}
                    maxLength={500}
                    placeholder="Opcional"
                  />
                </label>
              ) : null}

              {message ? (
                <p className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700">
                  {message}
                </p>
              ) : null}
              {error ? (
                <p className="flex items-center gap-2 rounded-lg border border-primary/25 bg-secondary px-4 py-3 text-sm font-semibold">
                  <AlertCircle className="h-4 w-4 text-primary" />
                  {error}
                </p>
              ) : null}

              <Button className="w-full sm:w-fit" size="lg" onClick={submit} disabled={submitting || !command || Boolean(message)}>
                {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : command === "cancelar" ? <XCircle className="h-4 w-4" /> : <Check className="h-4 w-4" />}
                {command === "cancelar" ? "Cancelar agendamento" : "Confirmar agendamento"}
              </Button>
            </div>
          ) : (
            <p className="mt-6 rounded-lg border border-primary/25 bg-secondary px-4 py-3 text-sm font-semibold">
              {error || "Agendamento nao encontrado."}
            </p>
          )}
        </div>
      </section>
    </main>
  );
}
