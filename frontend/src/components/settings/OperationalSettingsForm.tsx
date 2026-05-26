"use client";

import { FormEvent, useEffect, useState } from "react";
import { Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { SettingsOperation } from "@/services/settings.service";

type OperationalSettingsFormProps = {
  operation: SettingsOperation;
  isSaving: boolean;
  onSave: (payload: Partial<SettingsOperation>) => Promise<SettingsOperation | null>;
};

export function OperationalSettingsForm({ operation, isSaving, onSave }: OperationalSettingsFormProps) {
  const [antecedencia, setAntecedencia] = useState(operation.antecedencia_minima_minutos);
  const [janela, setJanela] = useState(operation.janela_agendamento_dias);
  const [tolerancia, setTolerancia] = useState(operation.tolerancia_atraso_minutos);
  const [intervalo, setIntervalo] = useState(operation.intervalo_padrao_minutos);
  const [limiteCancelamento, setLimiteCancelamento] = useState(operation.limite_cancelamento_horas);
  const [evitaBuracos, setEvitaBuracos] = useState(operation.evita_buracos_agenda);
  const [permiteCancelamento, setPermiteCancelamento] = useState(operation.permite_cancelamento_cliente);
  const [confirmationPolicy, setConfirmationPolicy] = useState(operation.confirmation_policy);
  const [attendantTimeout, setAttendantTimeout] = useState(operation.attendant_confirmation_timeout_minutes);
  const [clientTimeout, setClientTimeout] = useState(operation.client_confirmation_timeout_minutes);
  const [weeklyLimit, setWeeklyLimit] = useState(operation.weekly_booking_limit);
  const [blockLimit, setBlockLimit] = useState(operation.block_when_weekly_limit_exceeded);

  useEffect(() => {
    setAntecedencia(operation.antecedencia_minima_minutos);
    setJanela(operation.janela_agendamento_dias);
    setTolerancia(operation.tolerancia_atraso_minutos);
    setIntervalo(operation.intervalo_padrao_minutos);
    setLimiteCancelamento(operation.limite_cancelamento_horas);
    setEvitaBuracos(operation.evita_buracos_agenda);
    setPermiteCancelamento(operation.permite_cancelamento_cliente);
    setConfirmationPolicy(operation.confirmation_policy);
    setAttendantTimeout(operation.attendant_confirmation_timeout_minutes);
    setClientTimeout(operation.client_confirmation_timeout_minutes);
    setWeeklyLimit(operation.weekly_booking_limit);
    setBlockLimit(operation.block_when_weekly_limit_exceeded);
  }, [operation]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await onSave({
      antecedencia_minima_minutos: Number(antecedencia),
      janela_agendamento_dias: Number(janela),
      tolerancia_atraso_minutos: Number(tolerancia),
      intervalo_padrao_minutos: Number(intervalo),
      limite_cancelamento_horas: Number(limiteCancelamento),
      evita_buracos_agenda: evitaBuracos,
      permite_cancelamento_cliente: permiteCancelamento,
      confirmation_policy: confirmationPolicy,
      attendant_confirmation_timeout_minutes: Number(attendantTimeout),
      client_confirmation_timeout_minutes: Number(clientTimeout),
      weekly_booking_limit: Number(weeklyLimit),
      block_when_weekly_limit_exceeded: blockLimit
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <NumberField label="Antecedencia minima (min)" value={antecedencia} onChange={setAntecedencia} />
        <NumberField label="Janela de agenda (dias)" value={janela} onChange={setJanela} />
        <NumberField label="Tolerancia de atraso (min)" value={tolerancia} onChange={setTolerancia} />
        <NumberField label="Intervalo padrao (min)" value={intervalo} onChange={setIntervalo} />
        <NumberField label="Limite cancelamento (h)" value={limiteCancelamento} onChange={setLimiteCancelamento} />
      </div>

      <div className="rounded-2xl border border-white/80 bg-white/90 p-4 shadow-sm">
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <div className="space-y-2 sm:col-span-2 xl:col-span-1">
            <Label htmlFor="confirmation-policy">Confirmacao do agendamento</Label>
            <select
              id="confirmation-policy"
              value={confirmationPolicy}
              onChange={(event) => setConfirmationPolicy(event.target.value as SettingsOperation["confirmation_policy"])}
              className="h-11 w-full rounded-full border border-border bg-white px-4 text-sm font-semibold text-foreground outline-none transition focus:border-primary"
            >
              <option value="flexible">Flexivel</option>
              <option value="strict">Rigorosa</option>
              <option value="auto_confirm">Confirmar automaticamente</option>
            </select>
          </div>
          <NumberField label="Prazo atendente (min)" value={attendantTimeout} onChange={setAttendantTimeout} />
          <NumberField label="Prazo cliente (min)" value={clientTimeout} onChange={setClientTimeout} />
          <NumberField label="Limite semanal por cliente" value={weeklyLimit} onChange={setWeeklyLimit} />
        </div>
        <p className="mt-3 text-xs leading-5 text-muted-foreground">
          Define se o horario precisa ser aprovado pelo salao e depois confirmado pelo cliente. O limite semanal gera sinal de seguranca; o bloqueio duro fica opcional.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <ToggleRow
          label="Evitar buracos na agenda"
          description="Prioriza horarios que reduzem espacos mortos."
          checked={evitaBuracos}
          onChange={setEvitaBuracos}
        />
        <ToggleRow
          label="Cliente pode cancelar"
          description="Libera cancelamento respeitando o limite configurado."
          checked={permiteCancelamento}
          onChange={setPermiteCancelamento}
        />
        <ToggleRow
          label="Bloquear limite semanal"
          description="Impede novas solicitacoes quando o cliente ultrapassar o limite semanal."
          checked={blockLimit}
          onChange={setBlockLimit}
        />
      </div>

      <div className="flex justify-end">
        <Button type="submit" disabled={isSaving}>
          <Save className="h-4 w-4" />
          {isSaving ? "Salvando..." : "Salvar operacao"}
        </Button>
      </div>
    </form>
  );
}

function NumberField({
  label,
  value,
  onChange
}: {
  label: string;
  value: number;
  onChange: (value: number) => void;
}) {
  const id = label.toLowerCase().replace(/[^a-z0-9]+/g, "-");

  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      <Input id={id} type="number" min={0} value={value} onChange={(event) => onChange(Number(event.target.value))} />
    </div>
  );
}

function ToggleRow({
  label,
  description,
  checked,
  onChange
}: {
  label: string;
  description: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <label className="flex min-h-24 cursor-pointer items-center gap-3 rounded-2xl border border-white/80 bg-white/90 p-4 shadow-sm">
      <input
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
        className="h-5 w-5 rounded border-border accent-primary"
      />
      <span>
        <span className="block text-sm font-bold text-foreground">{label}</span>
        <span className="mt-1 block text-xs leading-5 text-muted-foreground">{description}</span>
      </span>
    </label>
  );
}
