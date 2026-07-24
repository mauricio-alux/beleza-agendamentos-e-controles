"use client";

import { useMemo, useState } from "react";
import { AlertTriangle } from "lucide-react";
import { AppointmentModal } from "@/components/agenda/AppointmentModal";
import { Button } from "@/components/ui/button";

const CANCELLATION_REASONS = [
  "Profissional indisponivel",
  "Cliente solicitou alteracao",
  "Erro no agendamento",
  "Servico indisponivel",
  "Horario indisponivel",
  "Problema operacional do salao",
  "Outro motivo"
];

type CancellationReasonModalProps = {
  open: boolean;
  isSubmitting?: boolean;
  onClose: () => void;
  onConfirm: (motivo: string) => void;
};

export function CancellationReasonModal({
  open,
  isSubmitting = false,
  onClose,
  onConfirm
}: CancellationReasonModalProps) {
  const [selectedReason, setSelectedReason] = useState("");
  const [complement, setComplement] = useState("");
  const [error, setError] = useState("");
  const isOtherReason = selectedReason === "Outro motivo";
  const normalizedComplement = complement.trim();
  const finalReason = useMemo(() => {
    if (!selectedReason) return "";
    if (!isOtherReason) {
      return normalizedComplement ? `${selectedReason}: ${normalizedComplement}` : selectedReason;
    }
    return normalizedComplement;
  }, [isOtherReason, normalizedComplement, selectedReason]);

  function resetAndClose() {
    if (isSubmitting) return;
    setSelectedReason("");
    setComplement("");
    setError("");
    onClose();
  }

  function submit() {
    if (!selectedReason) {
      setError("Escolha o motivo do cancelamento.");
      return;
    }

    if (isOtherReason && !normalizedComplement) {
      setError("Informe o complemento do motivo.");
      return;
    }

    setError("");
    setSelectedReason("");
    setComplement("");
    onConfirm(finalReason);
  }

  return (
    <AppointmentModal open={open} title="Cancelar atendimento" onClose={resetAndClose}>
      <div className="space-y-4">
        <div className="rounded-2xl border border-primary/20 bg-secondary/60 p-3 text-sm text-foreground">
          <span className="inline-flex items-center gap-2 font-bold">
            <AlertTriangle className="h-4 w-4 text-primary" />
            Motivo do cancelamento
          </span>
        </div>

        <div className="grid gap-2 sm:grid-cols-2">
          {CANCELLATION_REASONS.map((reason) => {
            const active = selectedReason === reason;
            return (
              <button
                key={reason}
                type="button"
                className={`min-h-11 rounded-2xl border px-3 py-2 text-left text-sm font-semibold transition ${
                  active
                    ? "border-primary bg-secondary text-primary"
                    : "border-border bg-white text-foreground hover:border-primary/40"
                }`}
                onClick={() => {
                  setSelectedReason(reason);
                  setError("");
                }}
                disabled={isSubmitting}
              >
                {reason}
              </button>
            );
          })}
        </div>

        <label className="grid gap-2 text-sm font-semibold text-foreground">
          Complemento do motivo {isOtherReason ? <span className="text-primary">obrigatorio</span> : null}
          <textarea
            className="min-h-24 resize-none rounded-2xl border border-border bg-white px-4 py-3 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/15"
            value={complement}
            onChange={(event) => {
              setComplement(event.target.value);
              setError("");
            }}
            placeholder={isOtherReason ? "Descreva o motivo do cancelamento." : "Opcional"}
            maxLength={500}
            disabled={isSubmitting}
          />
        </label>

        {error ? <p className="text-sm font-semibold text-primary">{error}</p> : null}

        <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
          <Button type="button" variant="outline" onClick={resetAndClose} disabled={isSubmitting}>
            Voltar
          </Button>
          <Button type="button" onClick={submit} disabled={isSubmitting}>
            Confirmar cancelamento
          </Button>
        </div>
      </div>
    </AppointmentModal>
  );
}
