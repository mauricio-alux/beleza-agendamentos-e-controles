require('dotenv').config();

const { supabaseAdmin } = require('../src/config/supabase');

const APPLY = process.argv.includes('--apply');

async function selectAll(table, columns) {
  const { data, error } = await supabaseAdmin
    .from(table)
    .select(columns);

  if (error) throw error;
  return data || [];
}

async function run() {
  const [
    professionals,
    professionalSpecialties,
    serviceSpecialtyConfigs,
    currentLinks
  ] = await Promise.all([
    selectAll('profissionais', 'id,tenant_id,ativo,deleted_at'),
    selectAll('profissional_especialidades', 'tenant_id,profissional_id,especialidade_id,ativo,deleted_at'),
    selectAll('servico_tenant_especialidades', 'id,servico_tenant_id,especialidade_id,ativo,servico_tenant:servico_tenants(id,tenant_id,ativo)'),
    selectAll('profissional_servico_especialidades', 'profissional_id,servico_tenant_especialidade_id,ativo,deleted_at')
  ]);

  const activeProfessionals = professionals.filter((item) => item.ativo !== false && !item.deleted_at);
  const activeSpecialtiesByProfessional = new Map();
  professionalSpecialties
    .filter((item) => item.ativo !== false && !item.deleted_at)
    .forEach((item) => {
      const key = `${item.tenant_id}:${item.profissional_id}`;
      if (!activeSpecialtiesByProfessional.has(key)) {
        activeSpecialtiesByProfessional.set(key, new Set());
      }
      activeSpecialtiesByProfessional.get(key).add(item.especialidade_id);
    });

  const currentKeys = new Set(
    currentLinks
      .filter((item) => item.ativo !== false && !item.deleted_at)
      .map((item) => `${item.profissional_id}:${item.servico_tenant_especialidade_id}`)
  );

  const rows = [];
  activeProfessionals.forEach((professional) => {
    const specialtyIds = activeSpecialtiesByProfessional.get(`${professional.tenant_id}:${professional.id}`);
    if (!specialtyIds?.size) return;

    serviceSpecialtyConfigs
      .filter((config) => (
        config.ativo !== false
        && config.servico_tenant?.ativo !== false
        && config.servico_tenant?.tenant_id === professional.tenant_id
        && specialtyIds.has(config.especialidade_id)
      ))
      .forEach((config) => {
        const key = `${professional.id}:${config.id}`;
        if (currentKeys.has(key)) return;

        rows.push({
          tenant_id: professional.tenant_id,
          profissional_id: professional.id,
          servico_tenant_especialidade_id: config.id,
          ativo: true,
          deleted_at: null,
          metadata: {
            origem: 'reconcile_professional_service_specialty_links',
            criterio: 'profissional_especialidade_intersecta_servico_tenant_especialidade'
          }
        });
      });
  });

  const report = {
    modo: APPLY ? 'apply' : 'audit',
    profissionais_ativos: activeProfessionals.length,
    vinculos_existentes: currentKeys.size,
    vinculos_planejados: rows.length
  };

  if (!APPLY || !rows.length) {
    console.log(JSON.stringify(report, null, 2));
    return;
  }

  const { error } = await supabaseAdmin
    .from('profissional_servico_especialidades')
    .upsert(rows, { onConflict: 'profissional_id,servico_tenant_especialidade_id' });

  if (error) throw error;
  console.log(JSON.stringify({ ...report, aplicados: rows.length }, null, 2));
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
