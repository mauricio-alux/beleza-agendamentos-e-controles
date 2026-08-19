"use client";

import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";

type EarlyCompletionConfirmationProps = {
  scheduledAt: string;
  currentAt: Date;
  onCancel: () => void;
  onConfirm: () => void;
};

export function isAppointmentScheduledForFuture(value: string, now = new Date()) {
  const scheduledAt = new Date(value);
  return !Number.isNaN(scheduledAt.getTime()) && scheduledAt > now;
}

export function EarlyCompletionConfirmation({
  scheduledAt,
  currentAt,
  onCancel,
  onConfirm
}: EarlyCompletionConfirmationProps) {
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/35 px-4 py-6 backdrop-blur-sm" role="presentation">
      <section
        aria-modal="true"
        role="dialog"
        aria-labelledby="early-completion-title"
        className="w-full max-w-lg rounded-lg border border-primary/25 bg-white p-6 shadow-soft"
      >
        <div className="flex items-start gap-3">
          <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-secondary text-primary">
            <AlertTriangle className="h-5 w-5" />
          </span>
          <div>
            <h2 id="early-completion-title" className="text-xl font-bold text-foreground">Atencao</h2>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              Este atendimento ainda nao iniciou.
            </p>
          </div>
        </div>

        <div className="mt-5 grid gap-3 rounded-lg border border-border bg-background/70 p-4 text-sm">
          <InfoRow label="Horário agendado" value={formatDateTime(scheduledAt)} />
          <InfoRow label="Horário atual" value={formatDateTime(currentAt.toISOString())} />
        </div>

        <p className="mt-5 text-sm leading-6 text-foreground">
          Deseja realmente concluir este atendimento antes do horario previsto?
        </p>

        <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancelar
          </Button>
          <Button type="button" variant="accent" onClick={onConfirm}>
            Concluir Mesmo Assim
          </Button>
        </div>
      </section>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
      <span className="font-semibold text-muted-foreground">{label}</span>
      <strong className="text-foreground">{value}</strong>
    </div>
  );
}

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short"
  }).format(new Date(value));
}
