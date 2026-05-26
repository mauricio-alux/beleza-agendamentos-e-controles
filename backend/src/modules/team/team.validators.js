const { z } = require('zod');

const professionalSchema = z.object({
  nome_publico: z.string().min(2).max(150),
  cargo: z.string().max(80).nullable().optional(),
  especialidade: z.string().max(100).nullable().optional(),
  percentual_comissao: z.coerce.number().min(0).max(100).optional(),
  aceita_agendamento_online: z.boolean().optional(),
  instagram: z.string().max(150).nullable().optional(),
  bio: z.string().max(1000).nullable().optional()
}).strict();

module.exports = {
  professionalSchema
};
