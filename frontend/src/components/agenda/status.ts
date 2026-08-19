import type { AppointmentStatus } from "@/services/agenda.service";

export const appointmentStatusLabel: Record<AppointmentStatus, string> = {
  solicitado: "Solicitado",
  pendente: "Aguardando confirmação",
  pendente_atendente: "Aguardando confirmação do estabelecimento",
  pendente_cliente: "Aguardando confirmação do cliente",
  confirmado: "Confirmado",
  cancelado: "Cancelado",
  concluido: "Concluído",
  no_show: "Cliente não compareceu",
  reagendado: "Reagendado",
  expirado_atendente: "Expirado pelo profissional",
  expirado_cliente: "Expirado pelo cliente",
  suspeito: "Revisão necessária"
};

export function getAppointmentStatusLabel(status: string) {
  return appointmentStatusLabel[status as AppointmentStatus] || status;
}

export function resolveAppointmentStatus(status: string, intendedStatus?: string) {
  if (status === "pendente" && intendedStatus) {
    return intendedStatus;
  }

  return status;
}

export function canAttendantConfirm(status: string, intendedStatus?: string) {
  const effectiveStatus = resolveAppointmentStatus(status, intendedStatus);
  return effectiveStatus === "pendente" || effectiveStatus === "pendente_atendente";
}

export function canCancelAppointment(status: string) {
  return !["cancelado", "concluido", "no_show", "expirado_atendente", "expirado_cliente"].includes(status);
}

export function canCompleteAppointment(status: string, intendedStatus?: string) {
  return ["pendente_cliente", "confirmado"].includes(resolveAppointmentStatus(status, intendedStatus));
}

export function canMarkNoShowAppointment(status: string, intendedStatus?: string) {
  return ["pendente_cliente", "confirmado"].includes(resolveAppointmentStatus(status, intendedStatus));
}

export function canRescheduleAppointment(status: string, intendedStatus?: string) {
  return ["pendente", "pendente_atendente", "pendente_cliente", "confirmado"].includes(
    resolveAppointmentStatus(status, intendedStatus)
  );
}

export function canMarkNoShowNow(status: string, dataInicio: string, intendedStatus?: string, now = new Date()) {
  if (!canMarkNoShowAppointment(status, intendedStatus)) {
    return false;
  }

  const startsAt = new Date(dataInicio);
  if (Number.isNaN(startsAt.getTime())) {
    return false;
  }

  return now >= startsAt;
}
