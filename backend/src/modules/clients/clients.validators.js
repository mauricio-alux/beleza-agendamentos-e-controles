const { z } = require('zod');

const clientSchema = z.object({
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
  aceita_campanhas: z.boolean().optional()
}).strict();

const bookingTokenSchema = z.object({
  slug: z.string().trim().min(2).max(120).regex(/^[a-z0-9-]+$/i).optional()
}).strict();

module.exports = {
  clientSchema,
  bookingTokenSchema
};
