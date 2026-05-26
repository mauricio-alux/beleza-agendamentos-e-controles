import type { AppointmentStatus } from "@/services/agenda.service";

export const appointmentStatusLabel: Record<AppointmentStatus, string> = {
  solicitado: "Solicitado",
  pendente: "Aguardando confirmacao",
  pendente_atendente: "Aguardando profissional",
  pendente_cliente: "Aguardando cliente",
  confirmado: "Confirmado",
  cancelado: "Cancelado",
  concluido: "Concluido",
  no_show: "No-show",
  reagendado: "Reagendado",
  expirado_atendente: "Expirado pelo profissional",
  expirado_cliente: "Expirado pelo cliente",
  suspeito: "Revisao necessaria"
};

export function getAppointmentStatusLabel(status: string) {
  return appointmentStatusLabel[status as AppointmentStatus] || status;
}

export function canAttendantConfirm(status: string, intendedStatus?: string) {
  return status === "pendente" || status === "pendente_atendente" || intendedStatus === "pendente_atendente";
}

export function canCancelAppointment(status: string) {
  return !["cancelado", "concluido", "expirado_atendente", "expirado_cliente"].includes(status);
}
