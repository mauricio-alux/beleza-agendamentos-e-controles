-- Taxonomy V2 - Etapa 5B.2: approved operational defaults for stage 5A services.
-- Global taxonomy/profile defaults only. Does not write tenant offers, tenant configs,
-- professionals, agenda, appointments or reconciliation state.

do $$
declare
  resolved_count integer;
begin
  with default_seed(tipo_slug, service_code, specialty_key, preco_min, preco_ref, preco_max, duracao, retorno, online, justification) as (
    values
      ('body-piercing', 'BODY_PIERCING', 'body_piercing_perfuracao_corporal', 80.00::numeric, 120.00::numeric, 180.00::numeric, 45, 90, false, 'Requer triagem, orientacao e confirmacao previa.'),
      ('bronzeamento', 'ARTIFICIAL_TANNING', 'bronzeamento_artificial', 80.00::numeric, 120.00::numeric, 160.00::numeric, 45, 15, true, 'Atendimento padronizavel, recorrente e adequado a agenda publica.'),
      ('bronzeamento', 'SPRAY_TANNING', 'bronzeamento_a_jato', 100.00::numeric, 150.00::numeric, 220.00::numeric, 45, 15, true, 'Atendimento padronizavel, recorrente e com duracao previsivel.'),
      ('estetica-facial', 'SKIN_CLEANSING', 'limpeza_de_pele', 120.00::numeric, 180.00::numeric, 250.00::numeric, 60, 30, true, 'Procedimento recorrente e comum no agendamento publico.'),
      ('estetica-facial', 'FACIAL_HYDRATION', 'estetica_facial', 90.00::numeric, 140.00::numeric, 200.00::numeric, 60, 30, true, 'Servico recorrente e simples de agendar diretamente.'),
      ('fisioterapia', 'PHYSIOTHERAPY_ASSESSMENT', 'avaliacao_fisioterapeutica', 120.00::numeric, 180.00::numeric, 250.00::numeric, 60, null::integer, true, 'Primeiro atendimento avaliativo; retorno depende do plano definido.'),
      ('fisioterapia', 'PHYSIOTHERAPY_SESSION', 'fisioterapia', 100.00::numeric, 160.00::numeric, 220.00::numeric, 60, 7, false, 'Depende de avaliacao ou plano terapeutico anterior.'),
      ('pilates', 'PILATES_CLASS', 'pilates', 60.00::numeric, 90.00::numeric, 140.00::numeric, 60, 7, true, 'Aula recorrente, geralmente semanal.'),
      ('tatuagem', 'TATTOO', 'tatuagem', 150.00::numeric, 300.00::numeric, 600.00::numeric, 120, null::integer, false, 'Depende de briefing, desenho, orcamento e duracao variavel.'),
      ('terapias-integrativas', 'REIKI', 'reiki', 80.00::numeric, 120.00::numeric, 180.00::numeric, 60, 15, true, 'Sessao recorrente com duracao padronizavel.'),
      ('terapias-integrativas', 'REFLEXOLOGY', 'reflexologia', 80.00::numeric, 120.00::numeric, 180.00::numeric, 45, 15, true, 'Sessao recorrente curta/media.')
  ),
  resolved_defaults as (
    select p.id as perfil_operacional_id, sc.id as servico_catalogo_id, e.id as especialidade_id
    from default_seed seed
    join public.tipos_negocio tn
      on tn.slug = seed.tipo_slug
     and tn.ativo = true
    join public.tipo_negocio_perfis_operacionais p
      on p.tipo_negocio_id = tn.id
     and p.ativo = true
     and p.deleted_at is null
    join public.servicos_catalogo sc
      on sc.codigo_canonico = seed.service_code
     and sc.ativo = true
    join public.especialidades e
      on e.taxonomy_specialty_key = seed.specialty_key
     and e.tenant_id is null
     and e.ativo = true
     and e.deleted_at is null
    join public.perfil_operacional_servicos pos
      on pos.perfil_operacional_id = p.id
     and pos.servico_catalogo_id = sc.id
     and pos.recomendado = true
     and pos.ativo = true
     and pos.deleted_at is null
    join public.servico_catalogo_especialidades sce
      on sce.servico_catalogo_id = sc.id
     and sce.especialidade_id = e.id
     and sce.ativo = true
  )
  select count(*) into resolved_count from resolved_defaults;

  if resolved_count <> 11 then
    raise exception 'Taxonomy V2 Stage 5B.2 expected 11 resolved defaults, found %', resolved_count;
  end if;
end $$;

with default_seed(tipo_slug, service_code, specialty_key, preco_min, preco_ref, preco_max, duracao, retorno, online, justification) as (
  values
    ('body-piercing', 'BODY_PIERCING', 'body_piercing_perfuracao_corporal', 80.00::numeric, 120.00::numeric, 180.00::numeric, 45, 90, false, 'Requer triagem, orientacao e confirmacao previa.'),
    ('bronzeamento', 'ARTIFICIAL_TANNING', 'bronzeamento_artificial', 80.00::numeric, 120.00::numeric, 160.00::numeric, 45, 15, true, 'Atendimento padronizavel, recorrente e adequado a agenda publica.'),
    ('bronzeamento', 'SPRAY_TANNING', 'bronzeamento_a_jato', 100.00::numeric, 150.00::numeric, 220.00::numeric, 45, 15, true, 'Atendimento padronizavel, recorrente e com duracao previsivel.'),
    ('estetica-facial', 'SKIN_CLEANSING', 'limpeza_de_pele', 120.00::numeric, 180.00::numeric, 250.00::numeric, 60, 30, true, 'Procedimento recorrente e comum no agendamento publico.'),
    ('estetica-facial', 'FACIAL_HYDRATION', 'estetica_facial', 90.00::numeric, 140.00::numeric, 200.00::numeric, 60, 30, true, 'Servico recorrente e simples de agendar diretamente.'),
    ('fisioterapia', 'PHYSIOTHERAPY_ASSESSMENT', 'avaliacao_fisioterapeutica', 120.00::numeric, 180.00::numeric, 250.00::numeric, 60, null::integer, true, 'Primeiro atendimento avaliativo; retorno depende do plano definido.'),
    ('fisioterapia', 'PHYSIOTHERAPY_SESSION', 'fisioterapia', 100.00::numeric, 160.00::numeric, 220.00::numeric, 60, 7, false, 'Depende de avaliacao ou plano terapeutico anterior.'),
    ('pilates', 'PILATES_CLASS', 'pilates', 60.00::numeric, 90.00::numeric, 140.00::numeric, 60, 7, true, 'Aula recorrente, geralmente semanal.'),
    ('tatuagem', 'TATTOO', 'tatuagem', 150.00::numeric, 300.00::numeric, 600.00::numeric, 120, null::integer, false, 'Depende de briefing, desenho, orcamento e duracao variavel.'),
    ('terapias-integrativas', 'REIKI', 'reiki', 80.00::numeric, 120.00::numeric, 180.00::numeric, 60, 15, true, 'Sessao recorrente com duracao padronizavel.'),
    ('terapias-integrativas', 'REFLEXOLOGY', 'reflexologia', 80.00::numeric, 120.00::numeric, 180.00::numeric, 45, 15, true, 'Sessao recorrente curta/media.')
),
resolved_defaults as (
  select
    p.id as perfil_operacional_id,
    sc.id as servico_catalogo_id,
    e.id as especialidade_id,
    seed.tipo_slug,
    seed.service_code,
    seed.specialty_key,
    seed.preco_min,
    seed.preco_ref,
    seed.preco_max,
    seed.duracao,
    seed.retorno,
    seed.online,
    seed.justification
  from default_seed seed
  join public.tipos_negocio tn
    on tn.slug = seed.tipo_slug
   and tn.ativo = true
  join public.tipo_negocio_perfis_operacionais p
    on p.tipo_negocio_id = tn.id
   and p.ativo = true
   and p.deleted_at is null
  join public.servicos_catalogo sc
    on sc.codigo_canonico = seed.service_code
   and sc.ativo = true
  join public.especialidades e
    on e.taxonomy_specialty_key = seed.specialty_key
   and e.tenant_id is null
   and e.ativo = true
   and e.deleted_at is null
  join public.perfil_operacional_servicos pos
    on pos.perfil_operacional_id = p.id
   and pos.servico_catalogo_id = sc.id
   and pos.recomendado = true
   and pos.ativo = true
   and pos.deleted_at is null
  join public.servico_catalogo_especialidades sce
    on sce.servico_catalogo_id = sc.id
   and sce.especialidade_id = e.id
   and sce.ativo = true
),
upserted_defaults as (
  insert into public.perfil_operacional_defaults (
    perfil_operacional_id,
    servico_catalogo_id,
    especialidade_id,
    region_scope,
    country,
    state,
    city,
    preco_min_referencia,
    preco_referencia,
    preco_max_referencia,
    duracao_minutos,
    dias_retorno_recomendado,
    aceita_agendamento_online,
    fonte,
    vigencia_inicio,
    ativo,
    metadata
  )
  select
    rd.perfil_operacional_id,
    rd.servico_catalogo_id,
    rd.especialidade_id,
    'state',
    'BR',
    'SP',
    null,
    rd.preco_min,
    rd.preco_ref,
    rd.preco_max,
    rd.duracao,
    rd.retorno,
    rd.online,
    'administrative_reference',
    date '2026-08-27',
    true,
    jsonb_build_object(
      'taxonomy_version', '2.2.0',
      'stage', 'taxonomy_v2_stage5b2_operational_defaults',
      'price_policy', 'administrative_reference_not_market_price',
      'fallback_policy', 'city_state_country_global',
      'region_basis', 'BR_SP',
      'config_origin', 'profile_default',
      'tenant_overwrite_policy', 'never_auto_propagate_to_existing_tenants',
      'no_auto_tenant_propagation', true,
      'justification', rd.justification
    )
  from resolved_defaults rd
  on conflict (
    perfil_operacional_id,
    servico_catalogo_id,
    coalesce(especialidade_id, '00000000-0000-0000-0000-000000000000'::uuid),
    region_scope,
    coalesce(country, ''),
    coalesce(state, ''),
    coalesce(city, '')
  ) where deleted_at is null do update
  set
    preco_min_referencia = excluded.preco_min_referencia,
    preco_referencia = excluded.preco_referencia,
    preco_max_referencia = excluded.preco_max_referencia,
    duracao_minutos = excluded.duracao_minutos,
    dias_retorno_recomendado = excluded.dias_retorno_recomendado,
    aceita_agendamento_online = excluded.aceita_agendamento_online,
    fonte = excluded.fonte,
    vigencia_inicio = excluded.vigencia_inicio,
    ativo = true,
    metadata = perfil_operacional_defaults.metadata || excluded.metadata,
    atualizado_em = now()
  returning id, perfil_operacional_id, servico_catalogo_id, especialidade_id, region_scope, country, state, city
)
insert into public.taxonomy_audit_log (
  taxonomy_version_id,
  entidade_tipo,
  entidade_id,
  acao,
  valor_posterior,
  origem,
  metadata
)
select
  tv.id,
  'perfil_operacional_defaults',
  ud.id,
  'upsert_operational_default',
  to_jsonb(ud),
  'taxonomy_v2_stage5b2_operational_defaults',
  jsonb_build_object(
    'taxonomy_version', '2.2.0',
    'scope', 'operational_defaults',
    'region_scope', 'state',
    'country', 'BR',
    'state', 'SP',
    'tenant_tables_changed', 0,
    'appointments_changed', 0
  )
from upserted_defaults ud
cross join public.taxonomy_versions tv
where tv.version = '2.2.0';
