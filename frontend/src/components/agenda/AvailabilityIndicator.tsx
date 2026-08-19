import { Sparkles } from "lucide-react";
import { APP_BRAND } from "@/config/app-brand";
import { FeedbackMessage } from "@/components/ui/feedback-message";
import { isTodayDateInput } from "@/components/agenda/date";
import type { AvailabilityResponse } from "@/services/agenda.service";

type AvailabilityIndicatorProps = {
  total: number;
  reason?: string | null;
  strategy?: string | null;
  availability?: AvailabilityResponse | null;
  hasResult?: boolean;
  isLoading?: boolean;
  isConfigured?: boolean;
};

function pluralizeMinutes(value?: number | null) {
  const minutes = Number(value || 0);
  return `${minutes} minuto${minutes === 1 ? "" : "s"}`;
}

function getNoAvailabilityCopy(availability?: AvailabilityResponse | null, fallbackReason?: string | null) {
  const reason = availability?.unavailability?.predominant_reason || "other";
  const details = availability?.unavailability;
  const dayLabel = availability?.data && isTodayDateInput(availability.data) ? "hoje" : "esta data";

  const titleByReason: Record<string, string> = {
    minimum_notice: `Não há horários disponíveis para ${dayLabel}.`,
    outside_working_hours: `Não há horários dentro do expediente para ${dayLabel}.`,
    service_duration: `Não há tempo suficiente para este atendimento em ${dayLabel}.`,
    schedule_conflict: `Não há horários livres para ${dayLabel}.`,
    professional_unavailable: "Profissional indisponível nesta data.",
    blocked_time: `Os horários de ${dayLabel} estão bloqueados.`,
    missing_scale: "Escala não encontrada para esta data.",
    no_matching_specialty: "Especialidade incompatível com o serviço selecionado.",
    no_professional_link: "Profissional sem vínculo com esta combinação.",
    other: fallbackReason || "Sem horários disponíveis"
  };

  const messageByReason: Record<string, string[]> = {
    minimum_notice: [
      `A antecedência mínima configurada é de ${pluralizeMinutes(details?.minimum_notice_minutes)}.`,
      details?.latest_work_end && details?.service_duration_minutes
        ? `Como o expediente termina às ${details.latest_work_end} e o atendimento dura ${pluralizeMinutes(details.service_duration_minutes)}, não existe tempo suficiente para iniciar um novo atendimento ${dayLabel}.`
        : `Não existe tempo suficiente para iniciar um novo atendimento ${dayLabel}.`,
      "Selecione outra data ou ajuste a antecedência mínima nas configurações da agenda."
    ],
    outside_working_hours: [
      "Os horários calculados ficam fora da escala ou dentro do intervalo do profissional.",
      "Selecione outra data ou revise a escala configurada."
    ],
    service_duration: [
      details?.latest_work_end && details?.service_duration_minutes
        ? `O atendimento dura ${pluralizeMinutes(details.service_duration_minutes)} e ultrapassa o fim do expediente as ${details.latest_work_end}.`
        : "A duração do serviço ultrapassa a janela disponível da escala.",
      "Selecione outro horário, outra data ou ajuste a duração do serviço."
    ],
    schedule_conflict: [
      "Todos os horários possíveis conflitam com agendamentos já existentes.",
      "Selecione outra data ou libere um horário na agenda."
    ],
    professional_unavailable: [
      "O profissional não possui janela de atendimento ativa para a data selecionada.",
      "Revise a escala do profissional ou escolha outro atendente."
    ],
    blocked_time: [
      "Todos os horários possíveis estão dentro de bloqueios cadastrados.",
      "Remova o bloqueio ou selecione outra data."
    ],
    missing_scale: [
      "Não há escala operacional cadastrada para calcular horários.",
      "Configure a escala do profissional ou o horário padrão do salão."
    ],
    no_matching_specialty: [
      "O serviço selecionado não possui especialidade compatível para esta configuração.",
      "Revise o vínculo entre serviço e especialidade."
    ],
    no_professional_link: [
      "O profissional selecionado não está vinculado a esta especialidade ou serviço.",
      "Revise os vínculos do profissional na equipe."
    ],
    other: [
      `O ${APP_BRAND.appName} considera escala, conflitos e duração do serviço.`,
      "Selecione outra data ou revise a configuração da agenda."
    ]
  };

  return {
    title: titleByReason[reason] || titleByReason.other,
    lines: messageByReason[reason] || messageByReason.other
  };
}

export function AvailabilityIndicator({
  total,
  reason,
  strategy,
  availability,
  hasResult = false,
  isLoading = false,
  isConfigured = false
}: AvailabilityIndicatorProps) {
  if (hasResult) {
    const unavailableCopy = total ? null : getNoAvailabilityCopy(availability, reason);

    return (
      <FeedbackMessage
        tone={total ? "success" : "warning"}
        title={total ? `${total} horários disponíveis encontrados` : unavailableCopy?.title}
        message={total
          ? (strategy ? "Os primeiros horários aparecem como recomendações para facilitar a escolha." : `O ${APP_BRAND.appName} considera escala, conflitos e duração do serviço.`)
          : (
            <span className="block space-y-1">
              {unavailableCopy?.lines.map((line) => (
                <span key={line} className="block">{line}</span>
              ))}
            </span>
          )}
      />
    );
  }

  const title = isLoading
    ? "Calculando horários disponíveis"
    : isConfigured
      ? "Aguardando retorno da disponibilidade"
      : "Configure data, atendente, serviço e especialidade";
  const description = isLoading
    ? "Consultando escala, conflitos e duração do serviço."
    : isConfigured
      ? "A consulta será atualizada automaticamente para a configuração atual."
      : `O ${APP_BRAND.appName} calcula os horários depois que a configuração estiver completa.`;

  return (
    <div className="flex items-center gap-3 rounded-2xl border border-white/80 bg-white/85 p-4 shadow-sm">
      <span className="grid h-10 w-10 place-items-center rounded-full bg-secondary text-primary">
        <Sparkles className="h-5 w-5" />
      </span>
      <div>
        <p className="text-sm font-bold text-foreground">
          {title}
        </p>
        <p className="text-xs leading-5 text-muted-foreground">
          {description}
        </p>
      </div>
    </div>
  );
}
