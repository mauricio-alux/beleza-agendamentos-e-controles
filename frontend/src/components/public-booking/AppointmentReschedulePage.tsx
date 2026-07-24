"use client";

import { AlertCircle, ArrowLeft, CalendarDays, Check, Clock3, Loader2, UserRound } from "lucide-react";
import Link from "next/link";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  getPublicAppointmentByToken,
  getPublicAvailability,
  reschedulePublicAppointment,
  type AvailabilitySlot,
  type PublicOperationalAppointment
} from "@/services/public-booking.service";
import { APP_BRAND } from "@/config/app-brand";

type Props = {
  token?: string;
};

function localDate(offsetDays = 1) {
  const date = new Date();
  date.setDate(date.getDate() + offsetDays);
  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, "0"),
    String(date.getDate()).padStart(2, "0")
  ].join("-");
}

function formatDate(value?: string) {
  if (!value) return "Data nao informada";
  return new Date(value).toLocaleString("pt-BR", {
    dateStyle: "long",
    timeStyle: "short"
  });
}

export function AppointmentReschedulePage({ token = "" }: Props) {
  const [appointment, setAppointment] = useState<PublicOperationalAppointment | null>(null);
  const [date, setDate] = useState(localDate());
  const [slots, setSlots] = useState<AvailabilitySlot[]>([]);
  const [slot, setSlot] = useState("");
  const [reason, setReason] = useState("");
  const [loading, setLoading] = useState(true);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [submitting, setSubmitting] = useState(false);
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

    getPublicAppointmentByToken(token)
      .then((data) => {
        if (!active) return;
        setAppointment(data);
        if (data.data_inicio) {
          const currentDate = new Date(data.data_inicio);
          if (currentDate > new Date()) {
            setDate(currentDate.toISOString().slice(0, 10));
          }
        }
      })
      .catch((err) => active && setError(err instanceof Error ? err.message : "Nao foi possivel localizar o agendamento."))
      .finally(() => active && setLoading(false));

    return () => {
      active = false;
    };
  }, [token]);

  useEffect(() => {
    if (!appointment?.tenant.slug || !appointment.profissional?.id || !appointment.servico?.id || !date) {
      setSlots([]);
      return;
    }

    let active = true;
    setLoadingSlots(true);
    setSlot("");
    setError("");

    getPublicAvailability(appointment.tenant.slug, {
      data: date,
      profissional_id: appointment.profissional.id,
      servico_id: appointment.servico.id
    })
      .then((data) => active && setSlots(data.availability.slots || []))
      .catch((err) => active && setError(err instanceof Error ? err.message : "Nao foi possivel carregar horarios."))
      .finally(() => active && setLoadingSlots(false));

    return () => {
      active = false;
    };
  }, [appointment, date]);

  const orderedSlots = useMemo(() => [...slots].sort((left, right) => (
    new Date(left.inicio).getTime() - new Date(right.inicio).getTime()
  )), [slots]);
  const bookingReturnUrl = appointment?.tenant.slug
    ? `/agendar/${encodeURIComponent(appointment.tenant.slug)}`
    : "";

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setMessage("");

    if (!slot) {
      setError("Selecione um novo horario.");
      return;
    }

    setSubmitting(true);

    try {
      const data = await reschedulePublicAppointment({
        token,
        data_inicio: slot,
        motivo: reason.trim() || undefined
      });
      setAppointment(data);
      setMessage("Agendamento reagendado com sucesso. O novo horario aguardara confirmacao.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Nao foi possivel reagendar.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="min-h-screen bg-[#fff8f8] text-foreground">
      <header className="border-b border-primary/15 bg-white/90">
        <div className="mx-auto flex max-w-5xl items-center gap-3 px-5 py-4">
          <span className="grid h-10 w-10 place-items-center rounded-full bg-primary text-white">
            <CalendarDays className="h-5 w-5" />
          </span>
          <div>
            <p className="font-display text-2xl">{APP_BRAND.appName}</p>
            <p className="text-xs text-muted-foreground">Agendamento online</p>
          </div>
        </div>
      </header>

      <section className="mx-auto max-w-5xl px-5 py-10">
        <div className="rounded-lg border border-primary/20 bg-white p-6 shadow-soft">
          {bookingReturnUrl ? (
            <Link
              href={bookingReturnUrl}
              className="inline-flex h-10 items-center gap-2 rounded-2xl border border-border bg-white px-4 text-sm font-bold transition hover:border-primary hover:text-primary"
            >
              <ArrowLeft className="h-4 w-4" />
              Voltar para agendamento
            </Link>
          ) : null}
          <p className={`${bookingReturnUrl ? "mt-5" : ""} text-xs font-bold uppercase text-accent`}>Reagendamento</p>
          <h1 className="mt-2 font-display text-4xl">Escolha um novo horario</h1>

          {loading ? (
            <div className="mt-8 flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Carregando agendamento...
            </div>
          ) : appointment ? (
            <form className="mt-8 grid gap-6 lg:grid-cols-[1fr_320px]" onSubmit={submit}>
              <div className="space-y-5">
                <div className="rounded-lg border border-border bg-secondary/25 p-5">
                  <h2 className="text-xl font-bold">{appointment.servico?.nome || "Servico"}</h2>
                  <p className="mt-2 flex items-center gap-2 text-sm text-muted-foreground">
                    <UserRound className="h-4 w-4 text-primary" />
                    {appointment.profissional?.nome_publico || "Profissional"}
                  </p>
                  <p className="mt-2 flex items-center gap-2 text-sm text-muted-foreground">
                    <Clock3 className="h-4 w-4 text-primary" />
                    Atual: {formatDate(appointment.data_inicio)}
                  </p>
                </div>

                <label className="grid gap-2 text-sm font-semibold">
                  Data
                  <Input type="date" min={localDate(0)} value={date} onChange={(event) => setDate(event.target.value)} />
                </label>

                <div className="grid min-h-14 grid-cols-3 gap-2 sm:grid-cols-5">
                  {loadingSlots ? (
                    <div className="col-span-full flex items-center gap-2 py-4 text-sm text-muted-foreground">
                      <Loader2 className="h-4 w-4 animate-spin" /> Consultando horarios...
                    </div>
                  ) : orderedSlots.length ? (
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
                    <p className="col-span-full py-4 text-sm text-muted-foreground">Nenhum horario disponivel nesta data.</p>
                  )}
                </div>

                <label className="grid gap-2 text-sm font-semibold">
                  Observacao
                  <textarea
                    className="min-h-24 resize-y rounded-2xl border border-input bg-white px-4 py-3 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                    value={reason}
                    onChange={(event) => setReason(event.target.value)}
                    maxLength={500}
                    placeholder="Opcional"
                  />
                </label>
              </div>

              <aside className="h-fit rounded-lg border border-primary/20 bg-white p-5 shadow-soft">
                <p className="text-xs font-bold uppercase text-accent">Resumo</p>
                <h2 className="mt-2 text-xl font-bold">{appointment.tenant.nome_fantasia || "Salao"}</h2>
                <p className="mt-4 text-sm text-muted-foreground">
                  Novo horario: {slot ? formatDate(slot) : "selecione um horario"}
                </p>
                {message ? (
                  <p className="mt-4 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700">
                    {message}
                  </p>
                ) : null}
                {error ? (
                  <p className="mt-4 flex items-center gap-2 rounded-lg border border-primary/25 bg-secondary px-4 py-3 text-sm font-semibold">
                    <AlertCircle className="h-4 w-4 text-primary" />
                    {error}
                  </p>
                ) : null}
                <Button className="mt-5 w-full" size="lg" disabled={submitting || !slot || Boolean(message)}>
                  {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                  Reagendar
                </Button>
                {bookingReturnUrl ? (
                  <Link
                    href={bookingReturnUrl}
                    className="mt-3 inline-flex h-11 w-full items-center justify-center gap-2 rounded-2xl border border-border bg-white text-sm font-bold transition hover:border-primary hover:text-primary"
                  >
                    <ArrowLeft className="h-4 w-4" />
                    Voltar para agenda
                  </Link>
                ) : null}
              </aside>
            </form>
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
