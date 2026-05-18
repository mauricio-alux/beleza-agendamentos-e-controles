const { z } = require('zod');

const createUsuarioSchema = z.object({
  nome: z.string().min(2).max(150),
  email: z.string().email(),
  senha_temporaria: z.string().min(8),
  telefone: z.string().max(20).optional(),
  tipo_usuario: z.enum(['Administrador', 'Autonomo', 'Funcionario', 'Terceiro'])
});

module.exports = {
  createUsuarioSchema
};
