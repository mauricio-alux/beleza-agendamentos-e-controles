const { z } = require('zod');
const { validBirthDate } = require('../public-booking/identity-policy');

const createClientSchema = z.object({
  data_nascimento: z.string({ required_error: 'Informe a data de nascimento.' }).refine(validBirthDate, 'Informe uma data de nascimento válida e não futura.'),
  nome: z.string().min(2).max(150),
  telefone: z.string().min(8).max(20),
  email: z.string().email().nullable().optional(),
  observacoes: z.string().max(1000).nullable().optional(),
  endereco: z.object({
    cep: z.string().max(12).optional(),
    uf: z.string().max(2).optional(),
    cidade: z.string().max(120).optional(),
    logradouro: z.string().max(180).optional(),
    numero: z.string().max(20).optional()
  }).optional(),
  aceita_campanhas: z.boolean().optional(),
  status: z.enum(['ativo', 'inativo']).optional()
}).strict();

const updateClientSchema = createClientSchema.partial();

const bookingTokenSchema = z.object({
  slug: z.string().trim().min(2).max(120).regex(/^[a-z0-9-]+$/i).optional()
}).strict();

module.exports = {
  createClientSchema,
  updateClientSchema,
  bookingTokenSchema
};
