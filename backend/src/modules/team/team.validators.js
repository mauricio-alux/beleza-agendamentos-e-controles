const { z } = require('zod');
const { TEAM_PROFESSIONAL_ROLES } = require('../../constants/team-professional-roles');
const { SERVICE_CATEGORIES, normalizeServiceCategory } = require('../../constants/service-categories');
const {
  validateCategoryValue,
  validateCargoName,
  validateSpecialtyName
} = require('../../utils/taxonomy-validator');

const tenantRoleSchema = z.enum(TEAM_PROFESSIONAL_ROLES);
const officialCategorySchema = z.preprocess((value) => (
  value === '' ? null : value === undefined ? value : normalizeServiceCategory(value)
), z.enum(SERVICE_CATEGORIES).nullable().optional());

const professionalBaseSchema = z.object({
  nome_publico: z.string().min(2).max(150),
  cargo_id: z.string().uuid(),
  especialidade_ids: z.array(z.string().uuid()).max(20).optional().default([]),
  servico_ids: z.array(z.string().uuid()).max(50).optional().default([]),
  tipo_usuario: tenantRoleSchema.optional().default('Funcionario'),
  criar_acesso: z.boolean().optional().default(false),
  email: z.string().email().optional(),
  telefone: z.string().max(30).optional(),
  senha_temporaria: z.string().min(8).max(100).optional(),
  percentual_comissao: z.coerce.number().min(0).max(100).optional(),
  aceita_agendamento_online: z.boolean().optional(),
  ativo: z.boolean().optional(),
  instagram: z.string().max(150).nullable().optional(),
  bio: z.string().max(1000).nullable().optional()
}).strict();

const professionalSchema = professionalBaseSchema.superRefine((value, ctx) => {
  const requiresAccess = value.tipo_usuario === 'Funcionario' || value.tipo_usuario === 'Terceiro' || value.criar_acesso;

  if (!requiresAccess) {
    return;
  }

  if (!value.email) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['email'],
      message: 'Informe o email para criar acesso ao sistema.'
    });
  }

  if (!value.senha_temporaria) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['senha_temporaria'],
      message: 'Informe uma senha temporaria com ao menos 8 caracteres.'
    });
  }
});

const updateProfessionalSchema = professionalBaseSchema.partial().refine((value) => Object.keys(value).length > 0, {
  message: 'Informe ao menos um campo para atualizar.'
});

const specialtyBaseSchema = z.object({
  cargo_id: z.string().uuid(),
  nome: z.string().min(2).max(120),
  taxonomy_category_key: officialCategorySchema,
  descricao: z.string().max(1000).nullable().optional(),
  ativo: z.boolean().optional()
}).strict();

const specialtySchema = specialtyBaseSchema.superRefine((value, ctx) => {
  validateSpecialtyName(ctx, value.nome);
  validateCategoryValue(ctx, value.taxonomy_category_key, ['taxonomy_category_key']);
});

const updateSpecialtySchema = specialtyBaseSchema.partial()
  .refine((value) => Object.keys(value).length > 0, {
    message: 'Informe ao menos um campo para atualizar a especialidade.'
  })
  .superRefine((value, ctx) => {
    if (value.nome !== undefined) {
      validateSpecialtyName(ctx, value.nome);
    }

    if (value.taxonomy_category_key !== undefined) {
      validateCategoryValue(ctx, value.taxonomy_category_key, ['taxonomy_category_key']);
    }
  });

const specialtyStatusSchema = z.object({
  ativo: z.boolean()
}).strict();

const roleBaseSchema = z.object({
  nome: z.string().min(2).max(100),
  descricao: z.string().max(1000).nullable().optional(),
  categoria_profissional: z.enum(['operacional', 'administrativo']).optional().default('operacional'),
  ativo: z.boolean().optional()
}).strict();

const roleSchema = roleBaseSchema.superRefine((value, ctx) => {
  validateCargoName(ctx, value.nome);
});

const updateRoleSchema = roleBaseSchema.partial()
  .refine((value) => Object.keys(value).length > 0, {
    message: 'Informe ao menos um campo para atualizar o cargo.'
  })
  .superRefine((value, ctx) => {
    if (value.nome !== undefined) {
      validateCargoName(ctx, value.nome);
    }
  });

module.exports = {
  professionalSchema,
  updateProfessionalSchema,
  specialtySchema,
  updateSpecialtySchema,
  specialtyStatusSchema,
  roleSchema,
  updateRoleSchema
};
