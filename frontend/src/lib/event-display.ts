type EventDisplay = {
  title: string;
  description: string;
};

type EventDisplayInput = {
  title?: string | null;
  description?: string | null;
  type?: string | null;
};

const EVENT_DISPLAY_CATALOG: Record<string, EventDisplay> = {
  "appointment.created": {
    title: "Novo agendamento realizado",
    description: "Um novo atendimento foi registrado na agenda."
  },
  "appointment.confirmed": {
    title: "Agendamento confirmado",
    description: "O atendimento foi confirmado para execução."
  },
  "appointment.cancelled": {
    title: "Agendamento cancelado",
    description: "O atendimento foi cancelado e registrado no histórico."
  },
  "appointment.completed": {
    title: "Atendimento concluído",
    description: "O atendimento foi finalizado com sucesso."
  },
  "appointment.no_show": {
    title: "Cliente não compareceu",
    description: "O não comparecimento foi registrado na agenda."
  },
  "appointment.pending_client": {
    title: "Aguardando confirmação do cliente",
    description: "A confirmação foi solicitada ao cliente."
  },
  "appointment.pending_attendant": {
    title: "Aguardando confirmação do estabelecimento",
    description: "O atendimento precisa de confirmação operacional."
  },
  "appointment.pending_attendant_operational": {
    title: "Aguardando confirmação do estabelecimento",
    description: "O atendimento precisa de confirmação operacional."
  },
  "appointment.pending_attendant_reminder_30m": {
    title: "Lembrete enviado ao atendente (30 min)",
    description: "Alerta operacional registrado após 30 minutos."
  },
  "appointment.pending_attendant_reminder_60m": {
    title: "Lembrete enviado ao atendente (60 min)",
    description: "Alerta operacional registrado após 60 minutos."
  },
  "appointment.pending_attendant_reminder_2h": {
    title: "Lembrete prioritário registrado (2 h)",
    description: "Último alerta operacional antes da ação automática."
  },
  "appointment.reminder_24h": {
    title: "Lembrete registrado ao cliente (24 h)",
    description: "Lembrete do atendimento registrado com 24 horas de antecedência."
  },
  "appointment.reminder_2h": {
    title: "Lembrete registrado ao cliente (2 h)",
    description: "Lembrete do atendimento registrado com 2 horas de antecedência."
  },
  "appointment.rescheduled": {
    title: "Agendamento remarcado",
    description: "O atendimento recebeu um novo horário."
  },
  "appointment.updated": {
    title: "Agendamento atualizado",
    description: "O atendimento recebeu uma atualização operacional."
  },
  tenant_ready: {
    title: "Salão criado",
    description: "Estrutura inicial preparada para operação."
  },
  subscription: {
    title: "Plano ativo",
    description: "Conta pronta para evoluir a operação."
  }
};

function looksLikeTechnicalIdentifier(value?: string | null) {
  return /^[a-z]+(?:[._][a-z0-9]+)+$/i.test(String(value || "").trim());
}

function containsTechnicalIdentifier(value?: string | null) {
  return /\b[a-z]+(?:[._][a-z0-9]+){2,}\b/i.test(String(value || ""));
}

function getFallbackDisplay(activity: EventDisplayInput): EventDisplay {
  const title = activity.title || "Atividade registrada";
  const description = activity.description || "Atualização operacional registrada no painel.";

  return {
    title: looksLikeTechnicalIdentifier(title) ? "Atividade operacional registrada" : title,
    description: containsTechnicalIdentifier(description)
      ? "Atualização operacional registrada no painel."
      : description
  };
}

export function resolveEventDisplay(activity: EventDisplayInput): EventDisplay {
  const eventType = activity.type || (looksLikeTechnicalIdentifier(activity.title) ? activity.title : null);
  if (eventType && EVENT_DISPLAY_CATALOG[eventType]) {
    return EVENT_DISPLAY_CATALOG[eventType];
  }

  return getFallbackDisplay(activity);
}

export function resolveEventLabel(eventType?: string | null) {
  return resolveEventDisplay({
    title: eventType,
    type: eventType
  }).title;
}
