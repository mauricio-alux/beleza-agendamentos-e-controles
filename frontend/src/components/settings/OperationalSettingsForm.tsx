"use client";

import { FormEvent, useEffect, useState } from "react";
import { Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { FieldLabel } from "@/components/ui/field-help";
import { Input } from "@/components/ui/input";
import type { SettingsOperation } from "@/services/settings.service";

type OperationalSettingsFormProps = {
  operation: SettingsOperation;
  isSaving: boolean;
  onSave: (payload: Partial<SettingsOperation>) => Promise<SettingsOperation | null>;
};

const OPERATION_HELP = {
  antecedencia:
    "Tempo minimo para o cliente marcar um novo horario. Exemplo: 60 impede agendamentos com menos de 1 hora de antecedencia.",
  janela:
    "Quantidade maxima de dias no futuro em que o cliente pode escolher um horario. Exemplo: 90 libera datas por ate 90 dias.",
  tolerancia:
    "Tempo de atraso aceito antes de o atendimento precisar de acao do salao, como ajustar a agenda ou marcar no-show.",
  toleranciaIntervalo:
    "Quantidade maxima de minutos que um atendimento pode ultrapassar o inicio do intervalo do profissional. Use 0 para bloquear qualquer invasao do intervalo.",
  toleranciaFimExpediente:
    "Quantidade maxima de minutos que um atendimento pode ultrapassar o horario final do expediente. Use 0 para bloquear qualquer atendimento alem do expediente.",
  intervalo:
    "Espaco usado para montar os horarios disponiveis. Exemplo: 30 cria opcoes a cada 30 minutos.",
  limiteCancelamento:
    "Minimo de horas antes do atendimento para o cliente cancelar sozinho. Depois disso, o cancelamento pode depender do atendente.",
  confirmationPolicy:
    "Define como o pedido vira agendamento. Flexivel combina aprovacao do salao e confirmacao do cliente; automatico confirma sem revisao manual.",
  attendantTimeout:
    "Tempo maximo para o atendente confirmar um novo pedido antes de o sistema seguir com lembretes ou tratamento automatico.",
  clientTimeout:
    "Tempo dado ao cliente para confirmar o horario quando essa etapa for necessaria.",
  weeklyLimit:
    "Quantidade de agendamentos que o mesmo cliente pode solicitar na semana. Ajuda a evitar excesso de reservas.",
  evitaBuracos:
    "Prioriza horarios que deixam menos espacos vazios entre atendimentos, ajudando a agenda ficar mais cheia e organizada.",
  permiteCancelamento:
    "Quando ativo, o cliente consegue cancelar pelo link respeitando o prazo configurado acima.",
  blockLimit:
    "Quando ativo, bloqueia novas solicitacoes se o cliente ultrapassar o limite semanal definido."
};

export function OperationalSettingsForm({ operation, isSaving, onSave }: OperationalSettingsFormProps) {
  const [antecedencia, setAntecedencia] = useState(operation.antecedencia_minima_minutos);
  const [janela, setJanela] = useState(operation.janela_agendamento_dias);
  const [tolerancia, setTolerancia] = useState(operation.tolerancia_atraso_minutos);
  const [toleranciaIntervalo, setToleranciaIntervalo] = useState(operation.tolerancia_intervalo_min ?? 0);
  const [toleranciaFimExpediente, setToleranciaFimExpediente] = useState(operation.tolerancia_fim_expediente_min ?? 0);
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
    setToleranciaIntervalo(operation.tolerancia_intervalo_min ?? 0);
    setToleranciaFimExpediente(operation.tolerancia_fim_expediente_min ?? 0);
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
      tolerancia_intervalo_min: Number(toleranciaIntervalo),
      tolerancia_fim_expediente_min: Number(toleranciaFimExpediente),
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
        <NumberField
          label="Antecedencia minima (min)"
          help={OPERATION_HELP.antecedencia}
          placeholder="60"
          value={antecedencia}
          onChange={setAntecedencia}
        />
        <NumberField
          label="Janela de agenda (dias)"
          help={OPERATION_HELP.janela}
          placeholder="90"
          value={janela}
          onChange={setJanela}
        />
        <NumberField
          label="Tolerancia de atraso (min)"
          help={OPERATION_HELP.tolerancia}
          placeholder="10"
          value={tolerancia}
          onChange={setTolerancia}
        />
        <NumberField
          label="Tolerancia de intervalo (min)"
          help={OPERATION_HELP.toleranciaIntervalo}
          placeholder="0"
          max={60}
          value={toleranciaIntervalo}
          onChange={setToleranciaIntervalo}
        />
        <NumberField
          label="Tolerancia fim expediente (min)"
          help={OPERATION_HELP.toleranciaFimExpediente}
          placeholder="0"
          max={60}
          value={toleranciaFimExpediente}
          onChange={setToleranciaFimExpediente}
        />
        <NumberField
          label="Intervalo padrao (min)"
          help={OPERATION_HELP.intervalo}
          placeholder="30"
          value={intervalo}
          onChange={setIntervalo}
        />
        <NumberField
          label="Limite cancelamento (h)"
          help={OPERATION_HELP.limiteCancelamento}
          placeholder="24"
          value={limiteCancelamento}
          onChange={setLimiteCancelamento}
        />
      </div>

      <div className="rounded-2xl border border-white/80 bg-white/90 p-4 shadow-sm">
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <div className="space-y-2 sm:col-span-2 xl:col-span-1">
            <FieldLabel
              htmlFor="confirmation-policy"
              label="Confirmacao do agendamento"
              help={OPERATION_HELP.confirmationPolicy}
            />
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
          <NumberField
            label="Prazo atendente (min)"
            help={OPERATION_HELP.attendantTimeout}
            placeholder="30"
            value={attendantTimeout}
            onChange={setAttendantTimeout}
          />
          <NumberField
            label="Prazo cliente (min)"
            help={OPERATION_HELP.clientTimeout}
            placeholder="60"
            value={clientTimeout}
            onChange={setClientTimeout}
          />
          <NumberField
            label="Limite semanal por cliente"
            help={OPERATION_HELP.weeklyLimit}
            placeholder="3"
            value={weeklyLimit}
            onChange={setWeeklyLimit}
          />
        </div>
        <p className="mt-3 text-xs leading-5 text-muted-foreground">
          Define se o horario precisa ser aprovado pelo salao e depois confirmado pelo cliente. O limite semanal gera sinal de seguranca; o bloqueio duro fica opcional.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <ToggleRow
          label="Evitar buracos na agenda"
          description="Prioriza horarios que reduzem espacos mortos."
          help={OPERATION_HELP.evitaBuracos}
          checked={evitaBuracos}
          onChange={setEvitaBuracos}
        />
        <ToggleRow
          label="Cliente pode cancelar"
          description="Libera cancelamento respeitando o limite configurado."
          help={OPERATION_HELP.permiteCancelamento}
          checked={permiteCancelamento}
          onChange={setPermiteCancelamento}
        />
        <ToggleRow
          label="Bloquear limite semanal"
          description="Impede novas solicitacoes quando o cliente ultrapassar o limite semanal."
          help={OPERATION_HELP.blockLimit}
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
  help,
  placeholder,
  max,
  value,
  onChange
}: {
  label: string;
  help: string;
  placeholder: string;
  max?: number;
  value: number;
  onChange: (value: number) => void;
}) {
  const id = label.toLowerCase().replace(/[^a-z0-9]+/g, "-");

  return (
    <div className="space-y-2">
      <FieldLabel htmlFor={id} label={label} help={help} />
      <Input
        id={id}
        type="number"
        min={0}
        max={max}
        placeholder={placeholder}
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
      />
    </div>
  );
}

function ToggleRow({
  label,
  description,
  help,
  checked,
  onChange
}: {
  label: string;
  description: string;
  help: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  const id = label.toLowerCase().replace(/[^a-z0-9]+/g, "-");

  return (
    <div className="flex min-h-24 items-center gap-3 rounded-2xl border border-white/80 bg-white/90 p-4 shadow-sm">
      <input
        id={id}
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
        className="h-5 w-5 rounded border-border accent-primary"
      />
      <span>
        <FieldLabel htmlFor={id} label={label} help={help} />
        <span className="mt-1 block text-xs leading-5 text-muted-foreground">{description}</span>
      </span>
    </div>
  );
}
