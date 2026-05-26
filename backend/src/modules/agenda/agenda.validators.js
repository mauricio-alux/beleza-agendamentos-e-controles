const { z } = require('zod');

const uuid = z.string().uuid();
const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
const time = z.string().regex(/^\d{2}:\d{2}$/).nullable().optional();

const clienteSchema = z.object({
  nome: z.string().min(2).max(150),
  telefone: z.string().min(10).max(20),
  email: z.string().email().optional(),
  endereco: z.object({
    cep: z.string().max(12).optional(),
    uf: z.string().max(2).optional(),
    cidade: z.string().max(120).optional(),
    logradouro: z.string().max(180).optional(),
    numero: z.string().max(20).optional()
  }).optional()
});

const disponibilidadeSchema = z.object({
  data: isoDate,
  profissional_id: uuid,
  servico_id: uuid
});

const listAgendaSchema = z.object({
  data_inicio: z.string().datetime().optional(),
  data_fim: z.string().datetime().optional(),
  profissional_id: uuid.optional(),
  status: z.string().optional()
});

const agendaIntelligenceSchema = z.object({
  data: isoDate.optional(),
  profissional_id: uuid.optional(),
  servico_id: uuid.optional()
});

const createAgendaSchema = z.object({
  cliente_id: uuid.optional(),
  cliente: clienteSchema.optional(),
  profissional_id: uuid,
  servico_id: uuid,
  data_inicio: z.string().datetime(),
  observacoes: z.string().max(1000).optional(),
  client_context: z.object({
    client_token: z.string().max(120).optional(),
    device_hash: z.string().max(180).optional(),
    user_agent: z.string().max(300).optional(),
    timezone: z.string().max(80).optional(),
    locale: z.string().max(40).optional()
  }).optional()
}).refine((data) => data.cliente_id || data.cliente, {
  message: 'Cliente obrigatorio',
  path: ['cliente']
});

const updateAgendaSchema = z.object({
  observacoes: z.string().max(1000).optional(),
  status: z.enum([
    'solicitado',
    'pendente',
    'pendente_atendente',
    'pendente_cliente',
    'confirmado',
    'cancelado',
    'concluido',
    'no_show',
    'reagendado',
    'expirado_atendente',
    'expirado_cliente',
    'suspeito'
  ]).optional()
});

const cancelAgendaSchema = z.object({
  motivo: z.string().max(500).optional()
});

const rescheduleAgendaSchema = z.object({
  data_inicio: z.string().datetime(),
  motivo: z.string().max(500).optional()
});

const professionalScheduleDaySchema = z.object({
  weekday: z.coerce.number().int().min(0).max(6),
  work_start_morning: time,
  work_end_morning: time,
  work_start_afternoon: time,
  work_end_afternoon: time,
  break_start: time,
  break_end: time,
  is_working: z.boolean().optional(),
  is_exception: z.boolean().optional()
}).superRefine((item, ctx) => {
  const windows = [
    ['work_start_morning', 'work_end_morning'],
    ['work_start_afternoon', 'work_end_afternoon'],
    ['break_start', 'break_end']
  ];

  windows.forEach(([startKey, endKey]) => {
    const start = item[startKey];
    const end = item[endKey];

    if ((start && !end) || (!start && end)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: [startKey],
        message: 'Inicio e fim devem ser informados juntos'
      });
    }

    if (start && end && start >= end) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: [startKey],
        message: 'Horario inicial deve ser menor que o final'
      });
    }
  });

  if (item.is_working !== false && !item.work_start_morning && !item.work_start_afternoon) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['is_working'],
      message: 'Informe ao menos uma janela de trabalho ou marque como nao trabalha'
    });
  }

  if (item.work_end_morning && item.work_start_afternoon && item.work_end_morning > item.work_start_afternoon) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['work_start_afternoon'],
      message: 'As janelas de trabalho nao podem se sobrepor'
    });
  }
});

const professionalScheduleSchema = z.object({
  schedules: z.array(professionalScheduleDaySchema).min(1).max(14)
});

module.exports = {
  disponibilidadeSchema,
  agendaIntelligenceSchema,
  listAgendaSchema,
  createAgendaSchema,
  updateAgendaSchema,
  cancelAgendaSchema,
  rescheduleAgendaSchema,
  professionalScheduleSchema
};
