const teamRepository = require('./team.repository');

function sanitize(professional) {
  return {
    id: professional.id,
    tenant_id: professional.tenant_id,
    usuario_id: professional.usuario_id,
    nome_publico: professional.nome_publico,
    cargo: professional.cargo,
    especialidade: professional.especialidade,
    percentual_comissao: Number(professional.percentual_comissao || 0),
    aceita_agendamento_online: professional.aceita_agendamento_online !== false,
    instagram: professional.instagram,
    bio: professional.bio,
    ativo: professional.ativo !== false,
    ordem_exibicao: professional.ordem_exibicao || 0,
    created_at: professional.created_at
  };
}

async function list(tenantId) {
  const rows = await teamRepository.listByTenant(tenantId);
  return rows.map(sanitize);
}

async function create(tenantId, input) {
  const professionals = await teamRepository.listByTenant(tenantId);
  const professional = await teamRepository.create(tenantId, {
    nome_publico: input.nome_publico,
    cargo: input.cargo || 'Profissional',
    especialidade: input.especialidade || null,
    percentual_comissao: input.percentual_comissao || 0,
    aceita_agendamento_online: input.aceita_agendamento_online !== false,
    instagram: input.instagram || null,
    bio: input.bio || null,
    ordem_exibicao: professionals.length,
    metadata: {
      origem: 'dashboard_team'
    }
  });

  return sanitize(professional);
}

module.exports = {
  list,
  create
};
