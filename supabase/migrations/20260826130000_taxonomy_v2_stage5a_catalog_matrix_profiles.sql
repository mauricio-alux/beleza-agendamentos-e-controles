-- Taxonomy V2 - Etapa 5A: controlled catalog, N:N matrices and operational profile expansion.
-- Additive global taxonomy only. Does not write tenant offers, tenant service configs,
-- professionals, agenda, appointments, reconcile state or commercial defaults.

update public.taxonomy_versions
set status = 'deprecated',
    updated_at = now(),
    metadata = coalesce(metadata, '{}'::jsonb) || jsonb_build_object(
      'superseded_by', '2.2.0',
      'superseded_reason', 'taxonomy_v2_stage5a_catalog_matrix_profiles'
    )
where version = '2.1.0'
  and status = 'active';

insert into public.taxonomy_versions (version, status, descricao, origem, metadata, activated_at)
select
  '2.2.0',
  'active',
  'Taxonomia V2 - Etapa 5A: expansao controlada do catalogo, matrizes N:N e perfis operacionais sem defaults comerciais.',
  'taxonomy_v2_stage5a_catalog_matrix_profiles',
  jsonb_build_object(
    'scope', 'etapa_5a_catalog_matrix_profiles',
    'tenant_offers_changed', 0,
    'tenant_service_specialties_changed', 0,
    'professionals_changed', 0,
    'appointments_changed', 0,
    'commercial_defaults_created', 0,
    'principal_policy', 'recommendation_ordering_only_never_execution_restriction'
  ),
  now()
where not exists (
  select 1 from public.taxonomy_versions where version = '2.2.0'
);

with taxonomy_categories(key, label) as (
  values
    ('body_piercing', 'Body Piercing'),
    ('bronzeamento', 'Bronzeamento'),
    ('fisioterapia', 'Fisioterapia'),
    ('pilates', 'Pilates'),
    ('tatuagem', 'Tatuagem'),
    ('terapias_integrativas', 'Terapias Integrativas')
)
insert into public.taxonomia_categorias (key, label, ativo)
select tc.key, tc.label, true
from taxonomy_categories tc
where not exists (
  select 1
  from public.taxonomia_categorias current
  where current.key = tc.key
);

with new_roles(nome, descricao) as (
  values
    ('Piercer', 'Profissional habilitado para body piercing e troca de joias corporais.'),
    ('Tecnica em bronzeamento', 'Profissional de bronzeamento estetico artificial e a jato.'),
    ('Fisioterapeuta', 'Profissional de fisioterapia em dominio proprio, sem equivalencia com massoterapia.'),
    ('Instrutora de Pilates', 'Profissional de aulas e sessoes de Pilates.'),
    ('Tatuador', 'Profissional de tatuagem e retoque de tatuagem.'),
    ('Terapeuta integrativo', 'Profissional de terapias integrativas de bem-estar.')
),
inserted_roles as (
  insert into public.cargos (nome, descricao, categoria_profissional, ativo)
  select nr.nome, nr.descricao, 'operacional', true
  from new_roles nr
  where not exists (
    select 1
    from public.cargos c
    where lower(trim(c.nome)) = lower(trim(nr.nome))
      and c.deleted_at is null
      and c.ativo = true
  )
  returning id, nome
)
insert into public.taxonomy_audit_log (taxonomy_version_id, entidade_tipo, entidade_id, acao, valor_posterior, origem, metadata)
select tv.id, 'cargo', ir.id, 'create_official_role', to_jsonb(ir),
  'taxonomy_v2_stage5a_catalog_matrix_profiles',
  jsonb_build_object('version', '2.2.0', 'scope', 'global_catalog')
from inserted_roles ir
cross join public.taxonomy_versions tv
where tv.version = '2.2.0';

with catalog_services(codigo_canonico, nome, categoria_key, natureza, descricao, domain_key) as (
  values
    ('BODY_PIERCING', 'Body piercing', 'body_piercing', 'recorrente', 'Perfuração corporal estética para colocação de joia.', 'body_piercing'),
    ('PIERCING_JEWELRY_CHANGE', 'Troca/instalacao de joia', 'body_piercing', 'ocasional', 'Troca, ajuste ou instalação de joia em piercing existente.', 'body_piercing'),
    ('ARTIFICIAL_TANNING', 'Bronzeamento artificial', 'bronzeamento', 'recorrente', 'Sessão estética de bronzeamento artificial.', 'bronzeamento'),
    ('SPRAY_TANNING', 'Bronzeamento a jato', 'bronzeamento', 'recorrente', 'Sessão estética de bronzeamento a jato.', 'bronzeamento'),
    ('PHYSIOTHERAPY_ASSESSMENT', 'Avaliacao fisioterapeutica', 'fisioterapia', 'ocasional', 'Avaliação inicial de fisioterapia em domínio próprio.', 'fisioterapia'),
    ('PHYSIOTHERAPY_SESSION', 'Sessao de fisioterapia', 'fisioterapia', 'recorrente', 'Atendimento de fisioterapia em domínio próprio.', 'fisioterapia'),
    ('PILATES_CLASS', 'Aula de Pilates', 'pilates', 'recorrente', 'Aula ou sessão de Pilates.', 'pilates'),
    ('TATTOO', 'Tatuagem', 'tatuagem', 'ocasional', 'Sessão de tatuagem.', 'tatuagem'),
    ('TATTOO_RETOUCH', 'Retoque de tatuagem', 'tatuagem', 'ocasional', 'Retoque de tatuagem existente.', 'tatuagem'),
    ('REIKI', 'Reiki', 'terapias_integrativas', 'recorrente', 'Sessão de Reiki e terapia energética.', 'terapias_integrativas'),
    ('REFLEXOLOGY', 'Reflexologia', 'terapias_integrativas', 'recorrente', 'Sessão de reflexologia como terapia integrativa.', 'terapias_integrativas'),
    ('AROMATHERAPY', 'Aromaterapia', 'terapias_integrativas', 'recorrente', 'Sessão de aromaterapia como terapia integrativa.', 'terapias_integrativas'),
    ('HAIR_CAUTERIZATION', 'Cauterizacao capilar', 'terapia_capilar', 'recorrente', 'Tratamento capilar reconstrutor por cauterização.', 'cabelo')
),
inserted_services as (
  insert into public.servicos_catalogo (codigo_canonico, nome, categoria_key, natureza, descricao, ativo, metadata)
  select
    cs.codigo_canonico,
    cs.nome,
    cs.categoria_key,
    cs.natureza,
    cs.descricao,
    true,
    jsonb_build_object(
      'taxonomy_version', '2.2.0',
      'relation_source', 'taxonomy_v2_stage5a_catalog_matrix_profiles',
      'domain_key', cs.domain_key,
      'tenant_offer_policy', 'catalog_available_not_tenant_active',
      'commercial_defaults', 'pending_stage_5b'
    )
  from catalog_services cs
  where not exists (
    select 1
    from public.servicos_catalogo sc
    where sc.codigo_canonico = cs.codigo_canonico
  )
  returning id, codigo_canonico, nome
)
insert into public.taxonomy_audit_log (taxonomy_version_id, entidade_tipo, entidade_id, acao, valor_posterior, origem, metadata)
select tv.id, 'servico_catalogo', isv.id, 'create_official_service', to_jsonb(isv),
  'taxonomy_v2_stage5a_catalog_matrix_profiles',
  jsonb_build_object('version', '2.2.0', 'scope', 'global_catalog')
from inserted_services isv
cross join public.taxonomy_versions tv
where tv.version = '2.2.0';

with specialty_seed(key, nome, categoria_key, primary_role, descricao) as (
  values
    ('body_piercing_perfuracao_corporal', 'Perfuracao corporal', 'body_piercing', 'Piercer', 'Técnica de perfuração corporal estética.'),
    ('body_piercing_troca_joia', 'Troca de joia', 'body_piercing', 'Piercer', 'Técnica de troca e instalação de joia corporal.'),
    ('bronzeamento_artificial', 'Bronzeamento artificial', 'bronzeamento', 'Tecnica em bronzeamento', 'Modalidade de bronzeamento artificial.'),
    ('bronzeamento_a_jato', 'Bronzeamento a jato', 'bronzeamento', 'Tecnica em bronzeamento', 'Modalidade de bronzeamento a jato.'),
    ('avaliacao_fisioterapeutica', 'Avaliacao fisioterapeutica', 'fisioterapia', 'Fisioterapeuta', 'Avaliação inicial de fisioterapia.'),
    ('fisioterapia', 'Fisioterapia', 'fisioterapia', 'Fisioterapeuta', 'Atendimento de fisioterapia.'),
    ('pilates', 'Pilates', 'pilates', 'Instrutora de Pilates', 'Aula ou sessão de Pilates.'),
    ('tatuagem', 'Tatuagem', 'tatuagem', 'Tatuador', 'Técnica de tatuagem.'),
    ('retoque_tatuagem', 'Retoque de tatuagem', 'tatuagem', 'Tatuador', 'Técnica de retoque de tatuagem.'),
    ('reiki', 'Reiki', 'terapias_integrativas', 'Terapeuta integrativo', 'Terapia energética Reiki.'),
    ('polimento_unhas', 'Polimento de unhas', 'unhas', 'Manicure', 'Técnica de polimento aplicada a serviços de unhas.')
),
primary_roles as (
  select ss.*, c.id as cargo_id
  from specialty_seed ss
  join public.cargos c
    on lower(trim(c.nome)) = lower(trim(ss.primary_role))
   and c.ativo = true
   and c.deleted_at is null
),
inserted_specialties as (
  insert into public.especialidades (
    cargo_id,
    nome,
    descricao,
    taxonomy_category_key,
    taxonomy_specialty_key,
    is_official,
    is_custom,
    tenant_id,
    created_by_tenant,
    ativo,
    metadata
  )
  select
    pr.cargo_id,
    pr.nome,
    pr.descricao,
    pr.categoria_key,
    pr.key,
    true,
    false,
    null,
    null,
    true,
    jsonb_build_object(
      'taxonomy_version', '2.2.0',
      'relation_source', 'taxonomy_v2_stage5a_catalog_matrix_profiles',
      'primary_role', pr.primary_role,
      'tenant_customizations_promoted_by_id', false
    )
  from primary_roles pr
  where not exists (
    select 1
    from public.especialidades e
    where e.taxonomy_specialty_key = pr.key
      and e.tenant_id is null
      and e.deleted_at is null
      and e.ativo = true
  )
  returning id, nome, taxonomy_specialty_key
)
insert into public.taxonomy_audit_log (taxonomy_version_id, entidade_tipo, entidade_id, acao, valor_posterior, origem, metadata)
select tv.id, 'especialidade', isp.id, 'create_official_specialty', to_jsonb(isp),
  'taxonomy_v2_stage5a_catalog_matrix_profiles',
  jsonb_build_object('version', '2.2.0', 'scope', 'global_catalog')
from inserted_specialties isp
cross join public.taxonomy_versions tv
where tv.version = '2.2.0';

with aliases(entity_type, canonical_kind, canonical_value, alias, normalizado) as (
  values
    ('servico_catalogo', 'codigo_canonico', 'BODY_PIERCING', 'Piercing corporal', 'piercing corporal'),
    ('servico_catalogo', 'codigo_canonico', 'BODY_PIERCING', 'Perfuracao corporal', 'perfuracao corporal'),
    ('servico_catalogo', 'codigo_canonico', 'PIERCING_JEWELRY_CHANGE', 'Troca de piercing', 'troca de piercing'),
    ('cargo', 'nome', 'Tecnica em bronzeamento', 'Bronzeadora', 'bronzeadora'),
    ('cargo', 'nome', 'Instrutora de Pilates', 'Instrutor de Pilates', 'instrutor de pilates'),
    ('cargo', 'nome', 'Tatuador', 'Tatuadora', 'tatuadora'),
    ('servico_catalogo', 'codigo_canonico', 'REIKI', 'Terapia energetica', 'terapia energetica'),
    ('especialidade', 'taxonomy_specialty_key', 'polimento_unhas', 'Polimento', 'polimento')
),
resolved_aliases as (
  select a.entity_type, sc.id as entidade_id, a.alias, a.normalizado
  from aliases a
  join public.servicos_catalogo sc
    on a.entity_type = 'servico_catalogo'
   and a.canonical_kind = 'codigo_canonico'
   and sc.codigo_canonico = a.canonical_value
   and sc.ativo = true
  union all
  select a.entity_type, c.id as entidade_id, a.alias, a.normalizado
  from aliases a
  join public.cargos c
    on a.entity_type = 'cargo'
   and a.canonical_kind = 'nome'
   and lower(trim(c.nome)) = lower(trim(a.canonical_value))
   and c.ativo = true
   and c.deleted_at is null
  union all
  select a.entity_type, e.id as entidade_id, a.alias, a.normalizado
  from aliases a
  join public.especialidades e
    on a.entity_type = 'especialidade'
   and a.canonical_kind = 'taxonomy_specialty_key'
   and e.taxonomy_specialty_key = a.canonical_value
   and e.tenant_id is null
   and e.ativo = true
   and e.deleted_at is null
),
inserted_aliases as (
  insert into public.taxonomy_aliases (
    entidade_tipo,
    entidade_id,
    alias,
    locale,
    normalizado,
    ativo,
    taxonomy_version,
    relation_source,
    metadata
  )
  select
    ra.entity_type,
    ra.entidade_id,
    ra.alias,
    'pt-BR',
    ra.normalizado,
    true,
    '2.2.0',
    'taxonomy_v2_stage5a_catalog_matrix_profiles',
    jsonb_build_object('scope', 'stage_5a_aliases', 'canonical_entity_type', ra.entity_type)
  from resolved_aliases ra
  where not exists (
    select 1
    from public.taxonomy_aliases ta
    where ta.entidade_tipo = ra.entity_type
      and ta.locale = 'pt-BR'
      and ta.normalizado = ra.normalizado
      and ta.deleted_at is null
      and ta.ativo = true
  )
  returning id, entidade_tipo, alias
)
insert into public.taxonomy_audit_log (taxonomy_version_id, entidade_tipo, entidade_id, acao, valor_posterior, origem, metadata)
select tv.id, 'taxonomy_aliases', ia.id, 'create_taxonomy_alias', to_jsonb(ia),
  'taxonomy_v2_stage5a_catalog_matrix_profiles',
  jsonb_build_object('version', '2.2.0', 'scope', 'aliases')
from inserted_aliases ia
cross join public.taxonomy_versions tv
where tv.version = '2.2.0';

with type_service_seed(tipo_slug, service_code, recomendado, ordem_exibicao) as (
  values
    ('body-piercing', 'BODY_PIERCING', true, 10),
    ('body-piercing', 'PIERCING_JEWELRY_CHANGE', false, 20),
    ('bronzeamento', 'ARTIFICIAL_TANNING', true, 10),
    ('bronzeamento', 'SPRAY_TANNING', true, 20),
    ('estetica-facial', 'SKIN_CLEANSING', true, 10),
    ('estetica-facial', 'FACIAL_HYDRATION', true, 20),
    ('estetica-facial', 'FACIAL_DRAINAGE', false, 30),
    ('estetica-facial', 'AESTHETIC_PEELING', false, 40),
    ('estetica-facial', 'FACIAL_REVITALIZATION', false, 50),
    ('fisioterapia', 'PHYSIOTHERAPY_ASSESSMENT', true, 10),
    ('fisioterapia', 'PHYSIOTHERAPY_SESSION', true, 20),
    ('pilates', 'PILATES_CLASS', true, 10),
    ('tatuagem', 'TATTOO', true, 10),
    ('tatuagem', 'TATTOO_RETOUCH', false, 20),
    ('terapias-integrativas', 'REIKI', true, 10),
    ('terapias-integrativas', 'REFLEXOLOGY', true, 20),
    ('terapias-integrativas', 'AROMATHERAPY', false, 30),
    ('salao-de-beleza', 'HAIR_CAUTERIZATION', false, 95)
),
resolved_type_services as (
  select tn.id as tipo_negocio_id, sc.id as servico_catalogo_id, seed.recomendado, seed.ordem_exibicao, seed.tipo_slug, seed.service_code
  from type_service_seed seed
  join public.tipos_negocio tn
    on tn.slug = seed.tipo_slug
   and tn.ativo = true
  join public.servicos_catalogo sc
    on sc.codigo_canonico = seed.service_code
   and sc.ativo = true
),
inserted_type_services as (
  insert into public.tipo_negocio_servicos_catalogo (
    tipo_negocio_id,
    servico_catalogo_id,
    recomendado,
    ativo,
    ordem_exibicao
  )
  select r.tipo_negocio_id, r.servico_catalogo_id, r.recomendado, true, r.ordem_exibicao
  from resolved_type_services r
  where not exists (
    select 1
    from public.tipo_negocio_servicos_catalogo tns
    where tns.tipo_negocio_id = r.tipo_negocio_id
      and tns.servico_catalogo_id = r.servico_catalogo_id
  )
  returning id, tipo_negocio_id, servico_catalogo_id, recomendado
)
insert into public.taxonomy_audit_log (taxonomy_version_id, entidade_tipo, entidade_id, acao, valor_posterior, origem, metadata)
select tv.id, 'tipo_negocio_servicos_catalogo', its.id, 'create_business_type_service_relation', to_jsonb(its),
  'taxonomy_v2_stage5a_catalog_matrix_profiles',
  jsonb_build_object('version', '2.2.0', 'scope', 'business_type_service_matrix')
from inserted_type_services its
cross join public.taxonomy_versions tv
where tv.version = '2.2.0';

with service_specialty_seed(service_code, specialty_key) as (
  values
    ('BODY_PIERCING', 'body_piercing_perfuracao_corporal'),
    ('PIERCING_JEWELRY_CHANGE', 'body_piercing_troca_joia'),
    ('ARTIFICIAL_TANNING', 'bronzeamento_artificial'),
    ('SPRAY_TANNING', 'bronzeamento_a_jato'),
    ('PHYSIOTHERAPY_ASSESSMENT', 'avaliacao_fisioterapeutica'),
    ('PHYSIOTHERAPY_SESSION', 'fisioterapia'),
    ('PILATES_CLASS', 'pilates'),
    ('TATTOO', 'tatuagem'),
    ('TATTOO_RETOUCH', 'retoque_tatuagem'),
    ('REIKI', 'reiki'),
    ('REFLEXOLOGY', 'reflexologia'),
    ('AROMATHERAPY', 'aromaterapia'),
    ('HAIR_CAUTERIZATION', 'tratamento_capilar'),
    ('MANICURE', 'polimento_unhas'),
    ('PEDICURE', 'polimento_unhas'),
    ('NAIL_EXTENSION', 'polimento_unhas'),
    ('GEL_BATH', 'polimento_unhas'),
    ('GEL_POLISH', 'polimento_unhas'),
    ('NAIL_EXTENSION_MAINTENANCE', 'polimento_unhas')
),
canonical_specialties as (
  select distinct on (taxonomy_specialty_key)
    id,
    taxonomy_specialty_key
  from public.especialidades
  where tenant_id is null
    and is_official = true
    and is_custom = false
    and ativo = true
    and deleted_at is null
    and taxonomy_specialty_key is not null
  order by taxonomy_specialty_key, created_at asc
),
resolved_service_specialties as (
  select sc.id as servico_catalogo_id, cs.id as especialidade_id, seed.service_code, seed.specialty_key
  from service_specialty_seed seed
  join public.servicos_catalogo sc
    on sc.codigo_canonico = seed.service_code
   and sc.ativo = true
  join canonical_specialties cs
    on cs.taxonomy_specialty_key = seed.specialty_key
),
inserted_service_specialties as (
  insert into public.servico_catalogo_especialidades (
    servico_catalogo_id,
    especialidade_id,
    ativo
  )
  select r.servico_catalogo_id, r.especialidade_id, true
  from resolved_service_specialties r
  where not exists (
    select 1
    from public.servico_catalogo_especialidades sce
    where sce.servico_catalogo_id = r.servico_catalogo_id
      and sce.especialidade_id = r.especialidade_id
  )
  returning id, servico_catalogo_id, especialidade_id
)
insert into public.taxonomy_audit_log (taxonomy_version_id, entidade_tipo, entidade_id, acao, valor_posterior, origem, metadata)
select tv.id, 'servico_catalogo_especialidades', iss.id, 'create_service_specialty_relation', to_jsonb(iss),
  'taxonomy_v2_stage5a_catalog_matrix_profiles',
  jsonb_build_object('version', '2.2.0', 'scope', 'service_specialty_matrix')
from inserted_service_specialties iss
cross join public.taxonomy_versions tv
where tv.version = '2.2.0';

with cargo_specialty_seed(cargo_nome, specialty_key, principal) as (
  values
    ('Piercer', 'body_piercing_perfuracao_corporal', true),
    ('Piercer', 'body_piercing_troca_joia', true),
    ('Tecnica em bronzeamento', 'bronzeamento_artificial', true),
    ('Tecnica em bronzeamento', 'bronzeamento_a_jato', true),
    ('Fisioterapeuta', 'avaliacao_fisioterapeutica', true),
    ('Fisioterapeuta', 'fisioterapia', true),
    ('Instrutora de Pilates', 'pilates', true),
    ('Tatuador', 'tatuagem', true),
    ('Tatuador', 'retoque_tatuagem', true),
    ('Terapeuta integrativo', 'reiki', true),
    ('Terapeuta integrativo', 'reflexologia', true),
    ('Terapeuta integrativo', 'aromaterapia', true),
    ('Massoterapeuta', 'reflexologia', false),
    ('Terapeuta de Spa', 'aromaterapia', false),
    ('Cabeleireira', 'tratamento_capilar', false),
    ('Manicure', 'polimento_unhas', true),
    ('Nail Designer', 'polimento_unhas', false)
),
canonical_specialties as (
  select distinct on (taxonomy_specialty_key)
    id,
    taxonomy_specialty_key
  from public.especialidades
  where tenant_id is null
    and is_official = true
    and is_custom = false
    and ativo = true
    and deleted_at is null
    and taxonomy_specialty_key is not null
  order by taxonomy_specialty_key, created_at asc
),
resolved_cargo_specialties as (
  select c.id as cargo_id, cs.id as especialidade_id, seed.principal, seed.cargo_nome, seed.specialty_key
  from cargo_specialty_seed seed
  join public.cargos c
    on lower(trim(c.nome)) = lower(trim(seed.cargo_nome))
   and c.ativo = true
   and c.deleted_at is null
  join canonical_specialties cs
    on cs.taxonomy_specialty_key = seed.specialty_key
),
inserted_cargo_specialties as (
  insert into public.cargo_especialidades (
    cargo_id,
    especialidade_id,
    principal,
    ativo,
    taxonomy_version,
    relation_source,
    change_reason,
    metadata
  )
  select
    r.cargo_id,
    r.especialidade_id,
    r.principal,
    true,
    '2.2.0',
    'taxonomy_v2_stage5a_catalog_matrix_profiles',
    'Expansao controlada da matriz oficial Cargo x Especialidade da Taxonomia V2 Etapa 5A.',
    jsonb_build_object(
      'cargo_nome', r.cargo_nome,
      'taxonomy_specialty_key', r.specialty_key,
      'principal_policy', 'recommendation_ordering_only_never_execution_restriction'
    )
  from resolved_cargo_specialties r
  where not exists (
    select 1
    from public.cargo_especialidades ce
    where ce.cargo_id = r.cargo_id
      and ce.especialidade_id = r.especialidade_id
      and ce.deleted_at is null
  )
  returning id, cargo_id, especialidade_id, principal
)
insert into public.taxonomy_audit_log (taxonomy_version_id, entidade_tipo, entidade_id, acao, valor_posterior, origem, metadata)
select tv.id, 'cargo_especialidades', ics.id, 'create_role_specialty_relation', to_jsonb(ics),
  'taxonomy_v2_stage5a_catalog_matrix_profiles',
  jsonb_build_object('version', '2.2.0', 'principal_policy', 'recommendation_ordering_only_never_execution_restriction')
from inserted_cargo_specialties ics
cross join public.taxonomy_versions tv
where tv.version = '2.2.0';

with type_service_seed(tipo_slug, service_code, recomendado, ordem_exibicao) as (
  values
    ('body-piercing', 'BODY_PIERCING', true, 10),
    ('body-piercing', 'PIERCING_JEWELRY_CHANGE', false, 20),
    ('bronzeamento', 'ARTIFICIAL_TANNING', true, 10),
    ('bronzeamento', 'SPRAY_TANNING', true, 20),
    ('estetica-facial', 'SKIN_CLEANSING', true, 10),
    ('estetica-facial', 'FACIAL_HYDRATION', true, 20),
    ('estetica-facial', 'FACIAL_DRAINAGE', false, 30),
    ('estetica-facial', 'AESTHETIC_PEELING', false, 40),
    ('estetica-facial', 'FACIAL_REVITALIZATION', false, 50),
    ('fisioterapia', 'PHYSIOTHERAPY_ASSESSMENT', true, 10),
    ('fisioterapia', 'PHYSIOTHERAPY_SESSION', true, 20),
    ('pilates', 'PILATES_CLASS', true, 10),
    ('tatuagem', 'TATTOO', true, 10),
    ('tatuagem', 'TATTOO_RETOUCH', false, 20),
    ('terapias-integrativas', 'REIKI', true, 10),
    ('terapias-integrativas', 'REFLEXOLOGY', true, 20),
    ('terapias-integrativas', 'AROMATHERAPY', false, 30),
    ('salao-de-beleza', 'HAIR_CAUTERIZATION', false, 95)
),
resolved_type_services as (
  select tn.id as tipo_negocio_id, sc.id as servico_catalogo_id, seed.recomendado, seed.ordem_exibicao
  from type_service_seed seed
  join public.tipos_negocio tn
    on tn.slug = seed.tipo_slug
   and tn.ativo = true
  join public.servicos_catalogo sc
    on sc.codigo_canonico = seed.service_code
   and sc.ativo = true
)
insert into public.perfil_operacional_servicos (
  perfil_operacional_id,
  servico_catalogo_id,
  recomendado,
  obrigatorio,
  ativo,
  prioridade,
  origem,
  metadata
)
select
  p.id,
  r.servico_catalogo_id,
  r.recomendado,
  p.classificacao = 'especializado' and r.recomendado = true,
  true,
  r.ordem_exibicao,
  'taxonomy_v2_stage5a_catalog_matrix_profiles',
  jsonb_build_object(
    'taxonomy_version', '2.2.0',
    'defaults_status', 'pending_stage_5b',
    'tenant_overwrite_policy', 'never_auto_propagate_to_existing_tenants'
  )
from public.tipo_negocio_perfis_operacionais p
join resolved_type_services r
  on r.tipo_negocio_id = p.tipo_negocio_id
join public.tipos_negocio tn
  on tn.id = p.tipo_negocio_id
where p.deleted_at is null
  and p.ativo = true
  and r.recomendado = true
  and tn.slug in (
    'body-piercing',
    'bronzeamento',
    'estetica-facial',
    'fisioterapia',
    'pilates',
    'tatuagem',
    'terapias-integrativas'
  )
on conflict (perfil_operacional_id, servico_catalogo_id) do update
set
  recomendado = true,
  obrigatorio = excluded.obrigatorio,
  ativo = true,
  prioridade = excluded.prioridade,
  origem = excluded.origem,
  metadata = perfil_operacional_servicos.metadata || excluded.metadata,
  atualizado_em = now();

insert into public.perfil_operacional_cargos (
  perfil_operacional_id,
  cargo_id,
  recomendado,
  principal,
  ativo,
  prioridade,
  origem,
  metadata
)
select
  p.id,
  ce.cargo_id,
  true,
  bool_or(ce.principal = true),
  true,
  min(pos.prioridade),
  'taxonomy_v2_stage5a_catalog_matrix_profiles',
  jsonb_build_object(
    'taxonomy_version', '2.2.0',
    'principal_policy', 'recommendation_ordering_only_never_execution_restriction'
  )
from public.tipo_negocio_perfis_operacionais p
join public.perfil_operacional_servicos pos
  on pos.perfil_operacional_id = p.id
 and pos.ativo = true
 and pos.deleted_at is null
join public.servico_catalogo_especialidades sce
  on sce.servico_catalogo_id = pos.servico_catalogo_id
 and sce.ativo = true
join public.cargo_especialidades ce
  on ce.especialidade_id = sce.especialidade_id
 and ce.ativo = true
 and ce.deleted_at is null
join public.cargos c
  on c.id = ce.cargo_id
 and c.ativo = true
 and c.deleted_at is null
join public.tipos_negocio tn
  on tn.id = p.tipo_negocio_id
where p.deleted_at is null
  and tn.slug in (
    'body-piercing',
    'bronzeamento',
    'estetica-facial',
    'fisioterapia',
    'pilates',
    'tatuagem',
    'terapias-integrativas'
  )
group by p.id, ce.cargo_id
on conflict (perfil_operacional_id, cargo_id) do update
set
  recomendado = true,
  principal = excluded.principal,
  ativo = true,
  prioridade = excluded.prioridade,
  origem = excluded.origem,
  metadata = perfil_operacional_cargos.metadata || excluded.metadata,
  atualizado_em = now();

insert into public.taxonomy_audit_log (
  taxonomy_version_id,
  entidade_tipo,
  acao,
  valor_posterior,
  origem,
  metadata
)
select
  tv.id,
  'taxonomy_versions',
  'activate_version',
  jsonb_build_object('version', tv.version, 'status', tv.status),
  'taxonomy_v2_stage5a_catalog_matrix_profiles',
  jsonb_build_object(
    'scope', 'etapa_5a_catalog_matrix_profiles',
    'commercial_defaults_created', 0,
    'tenants_changed', 0,
    'appointments_changed', 0
  )
from public.taxonomy_versions tv
where tv.version = '2.2.0'
  and not exists (
    select 1
    from public.taxonomy_audit_log log
    where log.taxonomy_version_id = tv.id
      and log.entidade_tipo = 'taxonomy_versions'
      and log.acao = 'activate_version'
      and log.origem = 'taxonomy_v2_stage5a_catalog_matrix_profiles'
  );
