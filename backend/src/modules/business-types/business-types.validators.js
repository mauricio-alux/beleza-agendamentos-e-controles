const { z } = require('zod');
const { SERVICE_CATEGORIES, normalizeServiceCategory } = require('../../constants/service-categories');

function slugify(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function validateSlug(input, ctx) {
  if (input.slug && !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(input.slug)) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['slug'],
      message: 'Slug invalido para tipo de negocio.'
    });
  }
}

const businessTypeBaseSchema = z.object({
  nome: z.string().min(2).max(120),
  slug: z.string().max(120).optional(),
  descricao: z.string().max(1000).nullable().optional(),
  icone: z.string().max(80).nullable().optional(),
  ativo: z.boolean().optional(),
  ordem_exibicao: z.number().int().min(0).optional()
});

const businessTypeSchema = businessTypeBaseSchema.transform((input) => ({
  ...input,
  slug: slugify(input.slug || input.nome)
})).superRefine(validateSlug);

const updateBusinessTypeSchema = businessTypeBaseSchema.partial().transform((input) => {
  if (input.slug || input.nome) {
    return {
      ...input,
      slug: slugify(input.slug || input.nome)
    };
  }
  return input;
}).superRefine(validateSlug);

const statusSchema = z.object({
  ativo: z.boolean()
});

const catalogAssociationSchema = z.object({
  servicos: z.array(z.object({
    servico_catalogo_id: z.string().uuid(),
    recomendado: z.boolean().default(false),
    ativo: z.boolean().default(true),
    ordem_exibicao: z.number().int().min(0).default(0)
  })).default([])
});

const officialServiceCategorySchema = z.string().refine(
  (value) => SERVICE_CATEGORIES.includes(value),
  { message: 'Categoria oficial ativa invalida.' }
);

const catalogPayloadSchema = z.object({
  codigo_canonico: z.string().min(2).max(120).regex(/^[A-Z0-9_]+$/).optional(),
  nome: z.string().min(2).max(150),
  descricao: z.string().max(1000).nullable().optional(),
  categoria_key: officialServiceCategorySchema,
  natureza: z.enum(['recorrente', 'ocasional']).default('recorrente'),
  ativo: z.boolean().optional(),
  metadata: z.record(z.any()).optional()
}).strict();

const updateCatalogPayloadSchema = catalogPayloadSchema.partial()
  .refine((payload) => Object.keys(payload).length > 0, {
    message: 'Informe ao menos um campo para atualizar'
  });

const catalogSpecialtiesSchema = z.object({
  especialidade_ids: z.array(z.string().uuid()).default([])
}).strict();

const tenantBusinessTypesSchema = z.object({
  principal_tipo_negocio_id: z.string().uuid().nullable().optional(),
  tipo_negocio_ids: z.array(z.string().uuid()).default([]),
  descricao_tipo_negocio: z.string().max(500).nullable().optional(),
  confirmar_remocao_com_impacto: z.boolean().optional()
});

const rolePayloadSchema = z.object({
  nome: z.string().min(2).max(100),
  descricao: z.string().max(1000).nullable().optional(),
  categoria_profissional: z.enum(['operacional', 'administrativo']).optional().default('operacional'),
  ativo: z.boolean().optional()
}).strict();

const updateRolePayloadSchema = rolePayloadSchema.partial()
  .refine((payload) => Object.keys(payload).length > 0, {
    message: 'Informe ao menos um campo para atualizar o cargo.'
  });

const specialtyPayloadSchema = z.object({
  cargo_id: z.string().uuid(),
  nome: z.string().min(2).max(120),
  taxonomy_category_key: z.preprocess((value) => normalizeServiceCategory(value), z.enum(SERVICE_CATEGORIES)),
  descricao: z.string().max(1000).nullable().optional(),
  ativo: z.boolean().optional()
}).strict();

const updateSpecialtyPayloadSchema = specialtyPayloadSchema.partial()
  .refine((payload) => Object.keys(payload).length > 0, {
    message: 'Informe ao menos um campo para atualizar a especialidade.'
  });

const operationalProfileUpdateSchema = z.object({
  classificacao: z.enum(['especializado', 'generalista']).optional(),
  nome: z.string().min(2).max(150).optional(),
  descricao: z.string().max(1000).nullable().optional(),
  ativo: z.boolean().optional(),
  exige_confirmacao_onboarding: z.boolean().optional(),
  metadata: z.record(z.any()).optional()
}).strict();

const operationalProfileDefaultSchema = z.object({
  perfil_operacional_id: z.string().uuid(),
  servico_catalogo_id: z.string().uuid(),
  especialidade_id: z.string().uuid().nullable().optional(),
  region_scope: z.enum(['global', 'country', 'state', 'city']).default('global'),
  country: z.string().length(2).nullable().optional(),
  state: z.string().max(80).nullable().optional(),
  city: z.string().max(120).nullable().optional(),
  preco_min_referencia: z.number().nonnegative().nullable().optional(),
  preco_referencia: z.number().nonnegative().nullable().optional(),
  preco_max_referencia: z.number().nonnegative().nullable().optional(),
  duracao_minutos: z.number().int().positive().nullable().optional(),
  dias_retorno_recomendado: z.number().int().positive().nullable().optional(),
  aceita_agendamento_online: z.boolean().default(true),
  fonte: z.string().max(80).optional(),
  metadata: z.record(z.any()).optional()
}).strict();

module.exports = {
  businessTypeSchema,
  updateBusinessTypeSchema,
  statusSchema,
  catalogAssociationSchema,
  catalogPayloadSchema,
  updateCatalogPayloadSchema,
  catalogSpecialtiesSchema,
  tenantBusinessTypesSchema,
  rolePayloadSchema,
  updateRolePayloadSchema,
  specialtyPayloadSchema,
  updateSpecialtyPayloadSchema,
  operationalProfileUpdateSchema,
  operationalProfileDefaultSchema,
  slugify
};
