const { supabaseAdmin } = require('../../config/supabase');
const { isAdministrativeProfessional } = require('../../constants/team-professional-roles');

const ACTIVE_APPOINTMENT_STATUSES = ['pendente', 'pendente_atendente', 'pendente_cliente', 'confirmado', 'suspeito'];
const APPOINTMENT_SERVICE_SELECT = 'servicos:agendamento_servicos(*, servico_tenant:servico_tenants(id, servico_catalogo_id, servico_catalogo:servicos_catalogo(id, codigo_canonico, nome, categoria_key, natureza)))';
const APPOINTMENT_OPERATIONAL_SELECT = `
  *,
  cliente:clientes(*),
  profissional:profissionais(*),
  ${APPOINTMENT_SERVICE_SELECT}
`;
const APPOINTMENT_OPERATIONAL_SELECT_WITH_TENANT = `
  *,
  tenant:tenants(id, slug, nome_fantasia),
  cliente:clientes(*),
  profissional:profissionais(*),
  ${APPOINTMENT_SERVICE_SELECT}
`;

function isMissingAdvancedScheduleTable(error) {
  return ['42P01', '42703', 'PGRST204', 'PGRST205'].includes(error?.code);
}

function isMissingAgendaSecuritySchema(error) {
  return ['23514', '42703', 'PGRST204'].includes(error?.code);
}

function isMissingEmbeddedRelation(error) {
  return ['PGRST200', 'PGRST201', 'PGRST204', 'PGRST205'].includes(error?.code);
}

function normalizeStatusFilter(status) {
  if (!status) return [];
  if (Array.isArray(status)) return status.filter(Boolean);
  return String(status)
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
}

function normalizeTenantService(row) {
  const catalog = row.servico_catalogo || {};
  const configs = (row.especialidades_config || []).filter((item) => (
    item
    && item.ativo !== false
    && item.especialidade?.ativo !== false
    && !item.especialidade?.deleted_at
  )).map((item) => ({
    ...item,
    nome: item.especialidade?.nome || null,
    taxonomy_category_key: item.especialidade?.taxonomy_category_key || null
  }));
  const firstConfig = configs[0] || {};

  return {
    id: row.id,
    tenant_id: row.tenant_id,
    servico_tenant_id: row.id,
    servico_catalogo_id: row.servico_catalogo_id,
    codigo_canonico: catalog.codigo_canonico,
    nome: catalog.nome,
    descricao: catalog.descricao,
    categoria: catalog.categoria_key,
    taxonomy_category_key: catalog.categoria_key,
    natureza: catalog.natureza,
    ativo: row.ativo !== false,
    permite_online: configs.some((item) => item.aceita_agendamento_online !== false),
    duracao_minutos: firstConfig.duracao_minutos ?? null,
    preco: firstConfig.preco ?? null,
    metadata: row.metadata || {},
    catalogo_metadata: catalog.metadata || {},
    especialidade_ids: configs.map((item) => item.especialidade_id),
    especialidades_config: configs
  };
}

async function listProfessionals(tenantId, profissionalId = null) {
  let query = supabaseAdmin
    .from('profissionais')
    .select(`
      *,
      profissional_especialidades(
        especialidade_id,
        ativo,
        deleted_at
      )
    `)
    .eq('tenant_id', tenantId)
    .eq('ativo', true)
    .is('deleted_at', null)
    .order('ordem_exibicao', { ascending: true });

  if (profissionalId) {
    query = query.eq('id', profissionalId);
  }

  const { data, error } = await query;

  if (error) throw error;
  return (data || [])
    .filter((professional) => !isAdministrativeProfessional(professional.metadata?.tipo_usuario))
    .map((professional) => ({
      ...professional,
      especialidade_ids: (professional.profissional_especialidades || [])
        .filter((link) => link.ativo !== false && !link.deleted_at)
        .map((link) => link.especialidade_id)
    }));
}

async function listServices(tenantId) {
  const { data, error } = await supabaseAdmin
    .from('servico_tenants')
    .select(`
      id,
      tenant_id,
      servico_catalogo_id,
      ativo,
      metadata,
      servico_catalogo:servicos_catalogo(id,codigo_canonico,nome,descricao,categoria_key,natureza,ativo,metadata),
      especialidades_config:servico_tenant_especialidades(
        id,
        servico_tenant_id,
        especialidade_id,
        preco,
        duracao_minutos,
        dias_retorno_recomendado,
        aceita_agendamento_online,
        ativo,
        metadata,
        especialidade:especialidades(id,nome,taxonomy_category_key,ativo,deleted_at)
      )
    `)
    .eq('tenant_id', tenantId)
    .eq('ativo', true)
    .order('created_at', { ascending: true });

  if (error) throw error;
  return (data || []).map(normalizeTenantService);
}

async function findProfessional(tenantId, profissionalId) {
  const { data, error } = await supabaseAdmin
    .from('profissionais')
    .select('*')
    .eq('tenant_id', tenantId)
    .eq('id', profissionalId)
    .eq('ativo', true)
    .is('deleted_at', null)
    .maybeSingle();

  if (error) throw error;
  return data;
}

async function findService(tenantId, servicoId) {
  const { data, error } = await supabaseAdmin
    .from('servico_tenants')
    .select(`
      id,
      tenant_id,
      servico_catalogo_id,
      ativo,
      metadata,
      servico_catalogo:servicos_catalogo(id,codigo_canonico,nome,descricao,categoria_key,natureza,ativo,metadata),
      especialidades_config:servico_tenant_especialidades(
        id,
        servico_tenant_id,
        especialidade_id,
        preco,
        duracao_minutos,
        dias_retorno_recomendado,
        aceita_agendamento_online,
        ativo,
        metadata,
        especialidade:especialidades(id,nome,taxonomy_category_key,ativo,deleted_at)
      )
    `)
    .eq('tenant_id', tenantId)
    .eq('id', servicoId)
    .eq('ativo', true)
    .maybeSingle();

  if (error) throw error;
  return data ? normalizeTenantService(data) : null;
}

async function listProfessionalSpecialtyIds(tenantId, profissionalId) {
  const { data, error } = await supabaseAdmin
    .from('profissional_especialidades')
    .select('especialidade_id')
    .eq('tenant_id', tenantId)
    .eq('profissional_id', profissionalId)
    .eq('ativo', true)
    .is('deleted_at', null);

  if (error) throw error;
  return (data || []).map((item) => item.especialidade_id).filter(Boolean);
}

async function listProfessionalServiceSpecialtyLinks(tenantId, profissionalId = null) {
  let query = supabaseAdmin
    .from('profissional_servico_especialidades')
    .select(`
      id,
      tenant_id,
      profissional_id,
      servico_tenant_especialidade_id,
      ativo,
      deleted_at,
      servico_tenant_especialidade:servico_tenant_especialidades!inner(
        id,
        servico_tenant_id,
        especialidade_id,
        preco,
        duracao_minutos,
        dias_retorno_recomendado,
        aceita_agendamento_online,
        ativo,
        metadata,
        servico_tenant:servico_tenants!inner(id,tenant_id,servico_catalogo_id,ativo),
        especialidade:especialidades(id,nome,taxonomy_category_key,ativo,deleted_at)
      )
    `)
    .eq('tenant_id', tenantId)
    .eq('ativo', true)
    .is('deleted_at', null)
    .eq('servico_tenant_especialidade.ativo', true)
    .eq('servico_tenant_especialidade.servico_tenant.tenant_id', tenantId)
    .eq('servico_tenant_especialidade.servico_tenant.ativo', true);

  if (profissionalId) {
    query = query.eq('profissional_id', profissionalId);
  }

  const { data, error } = await query;
  if (error) throw error;

  return (data || []).filter((item) => {
    const config = item.servico_tenant_especialidade;
    return config
      && config.especialidade?.ativo !== false
      && !config.especialidade?.deleted_at;
  });
}

async function listServiceSpecialtyLinks(tenantId, servicoId) {
  const { data, error } = await supabaseAdmin
    .from('servico_tenant_especialidades')
    .select(`
      *,
      servico_tenant:servico_tenants!inner(id,tenant_id,servico_catalogo_id,ativo),
      especialidade:especialidades(id,nome,taxonomy_category_key,ativo,deleted_at)
    `)
    .eq('servico_tenant.tenant_id', tenantId)
    .eq('servico_tenant_id', servicoId)
    .eq('ativo', true);

  if (error) throw error;
  return (data || []).filter((item) => item.especialidade?.ativo !== false && !item.especialidade?.deleted_at);
}

async function getTenantSettings(tenantId) {
  const { data, error } = await supabaseAdmin
    .from('configuracoes_tenant')
    .select('*')
    .eq('tenant_id', tenantId)
    .is('deleted_at', null)
    .maybeSingle();

  if (error) throw error;
  return data;
}

async function getTenant(tenantId) {
  const { data, error } = await supabaseAdmin
    .from('tenants')
    .select('*')
    .eq('id', tenantId)
    .is('deleted_at', null)
    .maybeSingle();

  if (error) throw error;
  return data;
}

async function getWeeklySchedule(tenantId, profissionalId, diaSemana) {
  const { data, error } = await supabaseAdmin
    .from('escalas_semanais')
    .select('*')
    .eq('tenant_id', tenantId)
    .eq('profissional_id', profissionalId)
    .eq('dia_semana', diaSemana)
    .eq('ativo', true)
    .is('deleted_at', null)
    .order('hora_inicio', { ascending: true });

  if (error) throw error;
  return data;
}

async function listWeeklySchedule(tenantId, profissionalId) {
  const { data, error } = await supabaseAdmin
    .from('escalas_semanais')
    .select('*')
    .eq('tenant_id', tenantId)
    .eq('profissional_id', profissionalId)
    .eq('ativo', true)
    .is('deleted_at', null)
    .order('dia_semana', { ascending: true })
    .order('hora_inicio', { ascending: true });

  if (error) throw error;
  return data || [];
}

async function listProfessionalSchedules(tenantId, profissional) {
  let query = supabaseAdmin
    .from('professional_schedules')
    .select('*')
    .eq('tenant_id', tenantId)
    .eq('professional_id', profissional.id)
    .is('deleted_at', null)
    .order('weekday', { ascending: true });

  if (!profissional.id && profissional.usuario_id) {
    query = query.eq('user_id', profissional.usuario_id);
  }

  const { data, error } = await query;

  if (isMissingAdvancedScheduleTable(error)) {
    return null;
  }

  if (error) throw error;
  return data || [];
}

async function listProfessionalSchedulesByWeekday(tenantId, profissional, weekday) {
  const schedules = await listProfessionalSchedules(tenantId, profissional);

  if (schedules === null) {
    return null;
  }

  const exceptionRows = schedules.filter((item) => item.weekday === weekday && item.is_exception);
  if (exceptionRows.length) {
    return exceptionRows;
  }

  return schedules.filter((item) => item.weekday === weekday && !item.is_exception);
}

async function replaceProfessionalSchedules(tenantId, profissional, schedules) {
  const now = new Date().toISOString();
  const inactivePayload = { deleted_at: now };

  const deactivateResponse = await supabaseAdmin
    .from('professional_schedules')
    .update(inactivePayload)
    .eq('tenant_id', tenantId)
    .eq('professional_id', profissional.id)
    .is('deleted_at', null);

  if (isMissingAdvancedScheduleTable(deactivateResponse.error)) {
    return replaceLegacyWeeklySchedule(tenantId, profissional.id, schedules);
  }

  if (deactivateResponse.error) throw deactivateResponse.error;

  const rows = schedules.map((item) => ({
    tenant_id: tenantId,
    professional_id: profissional.id,
    user_id: profissional.usuario_id || null,
    weekday: item.weekday,
    work_start_morning: item.work_start_morning || null,
    work_end_morning: item.work_end_morning || null,
    work_start_afternoon: item.work_start_afternoon || null,
    work_end_afternoon: item.work_end_afternoon || null,
    break_start: item.break_start || null,
    break_end: item.break_end || null,
    is_working: item.is_working !== false,
    is_exception: Boolean(item.is_exception)
  }));

  if (!rows.length) return [];

  const { data, error } = await supabaseAdmin
    .from('professional_schedules')
    .insert(rows)
    .select();

  if (error) throw error;
  return data || [];
}

async function replaceLegacyWeeklySchedule(tenantId, profissionalId, schedules) {
  const now = new Date().toISOString();
  const { error: deactivateError } = await supabaseAdmin
    .from('escalas_semanais')
    .update({ ativo: false, deleted_at: now })
    .eq('tenant_id', tenantId)
    .eq('profissional_id', profissionalId)
    .is('deleted_at', null);

  if (deactivateError) throw deactivateError;

  const rows = [];

  schedules.forEach((item) => {
    if (item.is_working === false) return;

    if (item.work_start_morning && item.work_end_morning) {
      rows.push({
        tenant_id: tenantId,
        profissional_id: profissionalId,
        dia_semana: item.weekday,
        hora_inicio: item.work_start_morning,
        hora_fim: item.work_end_morning,
        hora_intervalo_inicio: null,
        hora_intervalo_fim: null,
        ativo: true
      });
    }

    if (item.work_start_afternoon && item.work_end_afternoon) {
      rows.push({
        tenant_id: tenantId,
        profissional_id: profissionalId,
        dia_semana: item.weekday,
        hora_inicio: item.work_start_afternoon,
        hora_fim: item.work_end_afternoon,
        hora_intervalo_inicio: null,
        hora_intervalo_fim: null,
        ativo: true
      });
    }
  });

  if (!rows.length) return [];

  const { data, error } = await supabaseAdmin
    .from('escalas_semanais')
    .insert(rows)
    .select();

  if (error) throw error;
  return data || [];
}

async function listAppointments(tenantId, filters = {}) {
  let appointmentIdsByService = null;

  if (filters.servico_id || filters.especialidade_id) {
    const { data: serviceLinks, error: serviceLinkError } = await supabaseAdmin
      .from('agendamento_servicos')
      .select('agendamento_id, servico_id, servico_tenant_id, servico_catalogo_id, especialidade_id')
      .eq('tenant_id', tenantId)
      .eq('ativo', true)
      .is('deleted_at', null);

    let scopedLinks = serviceLinks || [];
    if (filters.servico_id) {
      scopedLinks = scopedLinks.filter((item) => (
        item.servico_tenant_id === filters.servico_id
        || item.servico_id === filters.servico_id
        || item.servico_catalogo_id === filters.servico_id
      ));
    }
    if (filters.especialidade_id) {
      scopedLinks = scopedLinks.filter((item) => item.especialidade_id === filters.especialidade_id);
    }

    if (serviceLinkError) throw serviceLinkError;

    appointmentIdsByService = [...new Set(scopedLinks.map((item) => item.agendamento_id).filter(Boolean))];

    if (!appointmentIdsByService.length) {
      return [];
    }
  }

  let query = supabaseAdmin
    .from('agendamentos')
    .select(`
      *,
      cliente:clientes(*),
      profissional:profissionais(*),
      ${APPOINTMENT_SERVICE_SELECT}
    `)
    .eq('tenant_id', tenantId)
    .is('deleted_at', null)
    .order('data_inicio', { ascending: true });

  if (filters.data_inicio) query = query.gte('data_inicio', filters.data_inicio);
  if (filters.data_fim) query = query.lt('data_inicio', filters.data_fim);
  if (filters.profissional_id) query = query.eq('profissional_id', filters.profissional_id);
  if (appointmentIdsByService) query = query.in('id', appointmentIdsByService);

  const statusFilter = normalizeStatusFilter(filters.status);
  if (statusFilter.length === 1) query = query.eq('status', statusFilter[0]);
  if (statusFilter.length > 1) query = query.in('status', statusFilter);

  const { data, error } = await query;
  if (error) throw error;
  return data;
}

async function findAppointmentById(tenantId, id) {
  const { data, error } = await supabaseAdmin
    .from('agendamentos')
    .select(`
      *,
      cliente:clientes(*),
      profissional:profissionais(*),
      ${APPOINTMENT_SERVICE_SELECT}
    `)
    .eq('tenant_id', tenantId)
    .eq('id', id)
    .is('deleted_at', null)
    .maybeSingle();

  if (error) throw error;
  return data;
}

async function findAppointmentByOperationalToken(token) {
  let { data, error } = await supabaseAdmin
    .from('agendamentos')
    .select(APPOINTMENT_OPERATIONAL_SELECT_WITH_TENANT)
    .eq('token_confirmacao', token)
    .is('deleted_at', null)
    .maybeSingle();

  if (isMissingEmbeddedRelation(error)) {
    const fallback = await supabaseAdmin
      .from('agendamentos')
      .select(APPOINTMENT_OPERATIONAL_SELECT)
      .eq('token_confirmacao', token)
      .is('deleted_at', null)
      .maybeSingle();

    data = fallback.data;
    error = fallback.error;
  }

  if (error) throw error;
  return data;
}

async function listUpcomingClientAppointments(tenantId, clientIds, nowIso) {
  const normalizedClientIds = Array.isArray(clientIds) ? clientIds : [clientIds];
  const filteredClientIds = [...new Set(normalizedClientIds.filter(Boolean))];

  if (!filteredClientIds.length) return [];

  let { data, error } = await supabaseAdmin
    .from('agendamentos')
    .select(APPOINTMENT_OPERATIONAL_SELECT_WITH_TENANT)
    .eq('tenant_id', tenantId)
    .in('cliente_id', filteredClientIds)
    .gt('data_inicio', nowIso)
    .is('deleted_at', null)
    .order('data_inicio', { ascending: true });

  if (isMissingEmbeddedRelation(error)) {
    const fallback = await supabaseAdmin
      .from('agendamentos')
      .select(APPOINTMENT_OPERATIONAL_SELECT)
      .eq('tenant_id', tenantId)
      .in('cliente_id', filteredClientIds)
      .gt('data_inicio', nowIso)
      .is('deleted_at', null)
      .order('data_inicio', { ascending: true });

    data = fallback.data;
    error = fallback.error;
  }

  if (error) throw error;
  return data || [];
}

async function listAutoCompletableAppointments(tenantId, cutoffIso, limit = 100) {
  const { data, error } = await supabaseAdmin
    .from('agendamentos')
    .select(`
      *,
      cliente:clientes(*),
      profissional:profissionais(*),
      ${APPOINTMENT_SERVICE_SELECT}
    `)
    .eq('tenant_id', tenantId)
    .in('status', ['pendente_cliente', 'confirmado'])
    .lte('data_fim', cutoffIso)
    .is('deleted_at', null)
    .order('data_fim', { ascending: true })
    .limit(limit);

  if (error) throw error;
  return data || [];
}

async function listConflicts(tenantId, profissionalId, startIso, endIso, ignoreAppointmentId = null) {
  let query = supabaseAdmin
    .from('agendamentos')
    .select('*')
    .eq('tenant_id', tenantId)
    .eq('profissional_id', profissionalId)
    .in('status', ACTIVE_APPOINTMENT_STATUSES)
    .is('deleted_at', null)
    .lt('data_inicio', endIso)
    .gt('data_fim', startIso);

  if (ignoreAppointmentId) query = query.neq('id', ignoreAppointmentId);

  const { data, error } = await query;
  if (error) throw error;
  return data;
}

async function listBlocks(tenantId, profissionalId, startIso, endIso) {
  const { data, error } = await supabaseAdmin
    .from('bloqueios_agenda')
    .select('*')
    .eq('tenant_id', tenantId)
    .or(`profissional_id.eq.${profissionalId},profissional_id.is.null`)
    .eq('ativo', true)
    .is('deleted_at', null)
    .lt('data_inicio', endIso)
    .gt('data_fim', startIso);

  if (error) throw error;
  return data;
}

async function findClientById(tenantId, clienteId) {
  const { data, error } = await supabaseAdmin
    .from('cliente_tenants')
    .select('*, cliente:clientes(*)')
    .eq('tenant_id', tenantId)
    .eq('cliente_id', clienteId)
    .is('deleted_at', null)
    .maybeSingle();

  if (error) throw error;
  return data?.cliente || null;
}

async function findClientByPhone(tenantId, telefone) {
  const { data, error } = await supabaseAdmin
    .from('clientes')
    .select('*, vinculos:cliente_tenants!inner(*)')
    .eq('telefone', telefone)
    .eq('vinculos.tenant_id', tenantId)
    .is('deleted_at', null)
    .maybeSingle();

  if (error) throw error;
  return data;
}

async function createClient(tenantId, payload) {
  const { data: cliente, error } = await supabaseAdmin
    .from('clientes')
    .insert({
      nome: payload.nome,
      data_nascimento: payload.data_nascimento,
      telefone: payload.telefone,
      email: payload.email || null,
      metadata: payload.endereco ? { endereco: payload.endereco } : {}
    })
    .select()
    .single();

  if (error) throw error;

  const { error: linkError } = await supabaseAdmin
    .from('cliente_tenants')
    .insert({
      tenant_id: tenantId,
      cliente_id: cliente.id,
      nome_no_tenant: payload.nome,
      origem: 'dashboard'
    });

  if (linkError) {
    await supabaseAdmin.from('clientes').delete().eq('id', cliente.id).catch(() => null);
    throw linkError;
  }

  return cliente;
}

async function updateClientIdentity(tenantId, clienteId, payload) {
  const safePayload = Object.fromEntries(
    Object.entries(payload).filter(([, value]) => value !== undefined)
  );

  if (!Object.keys(safePayload).length) return null;

  const { data, error } = await supabaseAdmin
    .from('clientes')
    .update(safePayload)
    .eq('id', clienteId)
    .select()
    .single();

  if (isMissingAgendaSecuritySchema(error)) {
    if (Object.prototype.hasOwnProperty.call(safePayload, 'metadata')) {
      const fallbackResponse = await supabaseAdmin
        .from('clientes')
        .update({ metadata: safePayload.metadata })
        .eq('id', clienteId)
        .select()
        .single();

      if (fallbackResponse.error) throw fallbackResponse.error;
      return fallbackResponse.data;
    }

    return null;
  }

  if (error) throw error;

  const { data: linked, error: linkError } = await supabaseAdmin
    .from('cliente_tenants')
    .select('cliente_id')
    .eq('tenant_id', tenantId)
    .eq('cliente_id', clienteId)
    .is('deleted_at', null)
    .maybeSingle();

  if (linkError) throw linkError;
  return linked ? data : null;
}

async function createAppointment(payload, servicePayload) {
  let insertPayload = payload;
  let { data: agendamento, error } = await supabaseAdmin
    .from('agendamentos')
    .insert(insertPayload)
    .select()
    .single();

  if (isMissingAgendaSecuritySchema(error) && payload.status === 'pendente_atendente') {
    insertPayload = {
      ...payload,
      status: 'pendente',
      metadata: {
        ...(payload.metadata || {}),
        intended_status: 'pendente_atendente',
        compatibility_mode: 'agenda_security_migration_pending'
      }
    };

    const fallbackResponse = await supabaseAdmin
      .from('agendamentos')
      .insert(insertPayload)
      .select()
      .single();

    agendamento = fallbackResponse.data;
    error = fallbackResponse.error;
  }

  if (error) throw error;

  const { error: serviceError } = await supabaseAdmin
    .from('agendamento_servicos')
    .insert({
      ...servicePayload,
      agendamento_id: agendamento.id
    });

  if (serviceError) {
    await supabaseAdmin.from('agendamentos').delete().eq('id', agendamento.id).catch(() => null);
    throw serviceError;
  }

  return agendamento;
}

async function updateAppointment(tenantId, id, payload) {
  let updatePayload = payload;
  let { data, error } = await supabaseAdmin
    .from('agendamentos')
    .update(updatePayload)
    .eq('tenant_id', tenantId)
    .eq('id', id)
    .select()
    .single();

  const unsupportedSecurityStatus = [
    'pendente_atendente',
    'pendente_cliente',
    'expirado_atendente',
    'expirado_cliente',
    'suspeito',
    'solicitado'
  ].includes(payload.status);

  if (isMissingAgendaSecuritySchema(error) && unsupportedSecurityStatus) {
    updatePayload = {
      ...payload,
      status: payload.status === 'confirmado' ? 'confirmado' : 'pendente',
      metadata: {
        ...(payload.metadata || {}),
        intended_status: payload.status,
        compatibility_mode: 'agenda_security_migration_pending'
      }
    };

    const fallbackResponse = await supabaseAdmin
      .from('agendamentos')
      .update(updatePayload)
      .eq('tenant_id', tenantId)
      .eq('id', id)
      .select()
      .single();

    data = fallbackResponse.data;
    error = fallbackResponse.error;
  }

  if (error) throw error;
  return data;
}

async function createNoShowRecord(payload) {
  const { data, error } = await supabaseAdmin
    .from('no_show_registros')
    .insert(payload)
    .select()
    .single();

  if (error) throw error;
  return data;
}

function getPrimaryServiceContext(appointment) {
  const serviceLink = appointment.servicos?.[0] || null;
  const tenantService = serviceLink?.servico_tenant || null;
  const serviceCatalog = tenantService?.servico_catalogo || null;
  const serviceTenantId = serviceLink?.servico_tenant_id || tenantService?.id || null;
  const serviceCatalogId = serviceLink?.servico_catalogo_id || tenantService?.servico_catalogo_id || serviceCatalog?.id || null;
  const serviceConfigId = serviceLink?.servico_tenant_especialidade_id || null;
  const serviceName = serviceLink?.nome_servico || serviceCatalog?.nome || null;
  const serviceValue = Number(appointment.valor_total || serviceLink?.valor_servico || 0);
  const durationMinutes = Number(serviceLink?.duracao_minutos || 0) || null;

  return {
    serviceLink,
    serviceId: null,
    serviceTenantId,
    serviceCatalogId,
    serviceConfigId,
    serviceName,
    serviceValue,
    durationMinutes,
    specialtyId: serviceLink?.especialidade_id || null,
    serviceSpecialtyId: serviceLink?.servico_especialidade_id || null,
    specialtyName: serviceLink?.nome_especialidade || null
  };
}

async function findClientAppointmentHistory(tenantId, appointmentId) {
  const { data, error } = await supabaseAdmin
    .from('cliente_historico_atendimentos')
    .select('*')
    .eq('tenant_id', tenantId)
    .eq('agendamento_id', appointmentId)
    .maybeSingle();

  if (error) throw error;
  return data;
}

async function upsertClientAppointmentHistory(appointment, status, options = {}) {
  const serviceContext = getPrimaryServiceContext(appointment);
  const appointmentDate = appointment.data_inicio || new Date().toISOString();
  const existing = await findClientAppointmentHistory(appointment.tenant_id, appointment.id);
  const payload = {
    tenant_id: appointment.tenant_id,
    cliente_id: appointment.cliente_id,
    agendamento_id: appointment.id,
    profissional_id: appointment.profissional_id,
    servico_id: null,
    servico_catalogo_id: serviceContext.serviceCatalogId,
    servico_tenant_id: serviceContext.serviceTenantId,
    servico_tenant_especialidade_id: serviceContext.serviceConfigId,
    especialidade_id: serviceContext.specialtyId,
    servico_especialidade_id: serviceContext.serviceSpecialtyId,
    nome_especialidade: serviceContext.specialtyName,
    status,
    data_atendimento: appointmentDate,
    valor_servico: serviceContext.serviceValue,
    duracao_minutos: serviceContext.durationMinutes,
    origem: options.origem || 'agenda',
    metadata: {
      ...(existing?.metadata || {}),
      profissional_id: appointment.profissional_id,
      servico_id: null,
      servico_catalogo_id: serviceContext.serviceCatalogId,
      servico_tenant_id: serviceContext.serviceTenantId,
      servico_tenant_especialidade_id: serviceContext.serviceConfigId,
      nome_servico: serviceContext.serviceName,
      especialidade_id: serviceContext.specialtyId,
      servico_especialidade_id: serviceContext.serviceSpecialtyId,
      nome_especialidade: serviceContext.specialtyName,
      duracao_minutos: serviceContext.durationMinutes,
      data_atendimento: appointmentDate,
      valor_servico: serviceContext.serviceValue,
      last_synced_at: new Date().toISOString()
    },
    ativo: true,
    deleted_at: null
  };

  const { data, error } = await supabaseAdmin
    .from('cliente_historico_atendimentos')
    .upsert(payload, { onConflict: 'tenant_id,agendamento_id' })
    .select()
    .single();

  if (error) throw error;

  return {
    history: data,
    existing,
    serviceContext,
    appointmentDate,
    shouldIncrement: !existing || existing.status !== status
  };
}

async function updateClientHistoryForCompletedAppointment(appointment) {
  const now = new Date().toISOString();
  const {
    serviceContext,
    appointmentDate,
    shouldIncrement
  } = await upsertClientAppointmentHistory(appointment, 'concluido', { origem: 'agenda' });
  const { serviceLink, serviceTenantId, serviceName, serviceValue: appointmentValue } = serviceContext;

  const { data: link, error: linkError } = await supabaseAdmin
    .from('cliente_tenants')
    .select('*')
    .eq('tenant_id', appointment.tenant_id)
    .eq('cliente_id', appointment.cliente_id)
    .is('deleted_at', null)
    .maybeSingle();

  if (linkError) throw linkError;

  if (link) {
    const metadata = {
      ...(link.metadata || {}),
      last_completed_appointment: {
        appointment_id: appointment.id,
        profissional_id: appointment.profissional_id,
        servico_tenant_id: serviceTenantId,
        nome_servico: serviceName,
        data_atendimento: appointmentDate,
        valor_pago: appointmentValue
      }
    };
    const totalValue = Number(link.total_valor_gasto ?? link.total_gasto ?? 0);
    const totalCompleted = Number(link.total_atendimentos_concluidos ?? link.qtd_atendimentos ?? 0);

    const { error } = await supabaseAdmin
      .from('cliente_tenants')
      .update({
        ultimo_atendimento: appointmentDate,
        data_ultimo_atendimento: appointmentDate,
        total_gasto: Number(link.total_gasto || 0) + (shouldIncrement ? appointmentValue : 0),
        total_valor_gasto: totalValue + (shouldIncrement ? appointmentValue : 0),
        qtd_atendimentos: Number(link.qtd_atendimentos || 0) + (shouldIncrement ? 1 : 0),
        total_atendimentos_concluidos: totalCompleted + (shouldIncrement ? 1 : 0),
        servico_mais_recente: null,
        profissional_mais_recente: appointment.profissional_id,
        metadata,
        updated_at: now
      })
      .eq('id', link.id);

    if (error) throw error;
  }

  if (!shouldIncrement) return;

  const { error: interactionError } = await supabaseAdmin
    .from('crm_interacoes')
    .insert({
      tenant_id: appointment.tenant_id,
      cliente_id: appointment.cliente_id,
      usuario_id: null,
      agendamento_id: appointment.id,
      tipo_interacao: 'atendimento_concluido',
      descricao: `Atendimento concluido: ${serviceLink?.nome_servico || serviceName || 'servico'}`,
      origem: 'agenda',
      score_relacionamento: 5,
      metadata: {
        profissional_id: appointment.profissional_id,
        servico_tenant_id: serviceTenantId,
        data_atendimento: appointmentDate,
        valor_pago: appointmentValue
      }
    });

  if (interactionError) throw interactionError;

  const { data: score, error: scoreError } = await supabaseAdmin
    .from('crm_scores')
    .select('*')
    .eq('tenant_id', appointment.tenant_id)
    .eq('cliente_id', appointment.cliente_id)
    .is('deleted_at', null)
    .maybeSingle();

  if (scoreError) throw scoreError;

  if (score) {
    const { error } = await supabaseAdmin
      .from('crm_scores')
      .update({
        score_relacionamento: Math.max(0, Number(score.score_relacionamento || 0) + 5),
        ultima_compra_em: appointmentDate,
        metadata: {
          ...(score.metadata || {}),
          last_completed_appointment_id: appointment.id
        },
        updated_at: now
      })
      .eq('id', score.id);

    if (error) throw error;
  } else {
    const { error } = await supabaseAdmin
      .from('crm_scores')
      .insert({
        tenant_id: appointment.tenant_id,
        cliente_id: appointment.cliente_id,
        score_relacionamento: 5,
        ultima_compra_em: appointmentDate,
        metadata: {
          last_completed_appointment_id: appointment.id
        }
      });

    if (error) throw error;
  }
}

async function updateClientHistoryForNoShowAppointment(appointment) {
  const now = new Date().toISOString();
  const {
    serviceContext,
    appointmentDate,
    shouldIncrement
  } = await upsertClientAppointmentHistory(appointment, 'no_show', { origem: 'agenda' });
  const { serviceTenantId, serviceName } = serviceContext;

  const { data: link, error: linkError } = await supabaseAdmin
    .from('cliente_tenants')
    .select('*')
    .eq('tenant_id', appointment.tenant_id)
    .eq('cliente_id', appointment.cliente_id)
    .is('deleted_at', null)
    .maybeSingle();

  if (linkError) throw linkError;
  if (!link) return { shouldIncrement };

  const metadata = {
    ...(link.metadata || {}),
    last_no_show_appointment: {
      appointment_id: appointment.id,
      profissional_id: appointment.profissional_id,
      servico_tenant_id: serviceTenantId,
      nome_servico: serviceName,
      data_atendimento: appointmentDate
    }
  };

  const { error } = await supabaseAdmin
    .from('cliente_tenants')
    .update({
      data_ultimo_no_show: appointmentDate,
      total_no_show: Number(link.total_no_show || 0) + (shouldIncrement ? 1 : 0),
      servico_mais_recente: null,
      profissional_mais_recente: appointment.profissional_id || link.profissional_mais_recente || null,
      metadata,
      updated_at: now
    })
    .eq('id', link.id);

  if (error) throw error;

  return { shouldIncrement };
}

async function recordNoShowInteraction(appointment, motivo = null) {
  const { error } = await supabaseAdmin
    .from('crm_interacoes')
    .insert({
      tenant_id: appointment.tenant_id,
      cliente_id: appointment.cliente_id,
      usuario_id: null,
      agendamento_id: appointment.id,
      tipo_interacao: 'no_show',
      descricao: motivo || 'Cliente nao compareceu ao atendimento.',
      origem: 'agenda',
      score_relacionamento: -5,
      metadata: {
        profissional_id: appointment.profissional_id,
        data_atendimento: appointment.data_inicio
      }
    });

  if (error) throw error;
}

async function createStatusHistory(payload) {
  const { data, error } = await supabaseAdmin
    .from('agendamento_status_historico')
    .insert(payload)
    .select()
    .single();

  if (error) throw error;
  return data;
}

async function listAppointmentsForAnalytics(tenantId, filters = {}) {
  let query = supabaseAdmin
    .from('agendamentos')
    .select('id, tenant_id, profissional_id, cliente_id, data_inicio, data_fim, status, valor_total')
    .eq('tenant_id', tenantId)
    .is('deleted_at', null)
    .order('data_inicio', { ascending: true });

  if (filters.data_inicio) query = query.gte('data_inicio', filters.data_inicio);
  if (filters.data_fim) query = query.lt('data_inicio', filters.data_fim);
  if (filters.profissional_id) query = query.eq('profissional_id', filters.profissional_id);

  const { data, error } = await query;
  if (error) throw error;
  return data || [];
}

async function countClientAppointmentsSince(tenantId, clienteId, sinceIso) {
  const { count, error } = await supabaseAdmin
    .from('agendamentos')
    .select('id', { count: 'exact', head: true })
    .eq('tenant_id', tenantId)
    .eq('cliente_id', clienteId)
    .gte('created_at', sinceIso)
    .is('deleted_at', null);

  if (error) throw error;
  return count || 0;
}

module.exports = {
  ACTIVE_APPOINTMENT_STATUSES,
  listProfessionals,
  listServices,
  findProfessional,
  findService,
  listProfessionalSpecialtyIds,
  listProfessionalServiceSpecialtyLinks,
  listServiceSpecialtyLinks,
  getTenantSettings,
  getTenant,
  getWeeklySchedule,
  listWeeklySchedule,
  listProfessionalSchedules,
  listProfessionalSchedulesByWeekday,
  replaceProfessionalSchedules,
  listAppointments,
  findAppointmentById,
  findAppointmentByOperationalToken,
  listUpcomingClientAppointments,
  listAutoCompletableAppointments,
  listConflicts,
  listBlocks,
  findClientById,
  findClientByPhone,
  createClient,
  updateClientIdentity,
  createAppointment,
  updateAppointment,
  createNoShowRecord,
  upsertClientAppointmentHistory,
  updateClientHistoryForCompletedAppointment,
  updateClientHistoryForNoShowAppointment,
  recordNoShowInteraction,
  createStatusHistory,
  listAppointmentsForAnalytics,
  countClientAppointmentsSince
};
