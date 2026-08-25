-- Taxonomy V2 - Etapa 2: controlled official catalog expansion.
-- Additive only: expands global catalog and global N:N matrices.
-- It deliberately does not write to tenant offers, tenant service configs,
-- professionals, availability, appointments, onboarding state or campaigns.

update public.taxonomy_versions
set status = 'deprecated',
    updated_at = now(),
    metadata = coalesce(metadata, '{}'::jsonb) || jsonb_build_object(
      'superseded_by', '2.1.0',
      'superseded_reason', 'taxonomy_v2_catalog_expansion'
    )
where version = '2.0.0'
  and status = 'active';

insert into public.taxonomy_versions (version, status, descricao, origem, metadata, activated_at)
select
  '2.1.0',
  'active',
  'Taxonomia V2 - Etapa 2: expansao controlada do catalogo oficial sem alterar ofertas dos tenants.',
  'taxonomy_v2_catalog_expansion',
  jsonb_build_object(
    'scope', 'etapa_2_catalog_expansion',
    'tenant_offers_changed', 0,
    'tenant_service_specialties_changed', 0,
    'professionals_changed', 0,
    'appointments_changed', 0
  ),
  now()
where not exists (
  select 1 from public.taxonomy_versions where version = '2.1.0'
);

with new_roles(nome, descricao) as (
  values
    ('Colorista', 'Profissional de coloracao, tonalizacao e correcao de cor.'),
    ('Especialista em cabelos cacheados/crespos', 'Profissional especializado em cabelos cacheados, crespos e texturas afro.'),
    ('Nail Designer', 'Profissional de alongamento, manutencao, reparo e design de unhas.'),
    ('Micropigmentador(a)', 'Profissional de micropigmentacao estetica nao invasiva dentro da governanca da plataforma.'),
    ('Terapeuta de Spa', 'Profissional de rituais de spa e bem-estar estetico.'),
    ('Trancista', 'Profissional de trancas, estilos protetivos e penteados afro.')
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
  'cargo',
  ir.id,
  'create_official_role',
  to_jsonb(ir),
  'taxonomy_v2_catalog_expansion',
  jsonb_build_object('version', '2.1.0', 'scope', 'global_catalog')
from inserted_roles ir
cross join public.taxonomy_versions tv
where tv.version = '2.1.0';

with catalog_services(codigo_canonico, nome, categoria_key, natureza, descricao, domain_key) as (
  values
    ('NAIL_EXTENSION_REMOVAL', 'Remocao de alongamento', 'unhas', 'recorrente', 'Remocao segura e reparo de alongamentos de unhas.', 'unhas'),
    ('LASH_MAINTENANCE', 'Manutencao de cilios', 'cilios', 'recorrente', 'Manutencao de extensoes de cilios por tecnica.', 'cilios'),
    ('LASH_REMOVAL', 'Remocao de cilios', 'cilios', 'ocasional', 'Remocao segura de extensoes de cilios.', 'cilios'),
    ('THERAPEUTIC_MASSAGE_NON_CLINICAL', 'Massagem terapeutica nao clinica', 'massoterapia', 'recorrente', 'Massagem de alivio tensional e bem-estar sem escopo clinico.', 'massoterapia'),
    ('SPA_RITUAL', 'Ritual de spa', 'massoterapia', 'ocasional', 'Rituais de spa e bem-estar estetico.', 'spa'),
    ('PODOLOGY_AESTHETIC_PREVENTIVE', 'Podologia estetica/preventiva', 'podologia', 'recorrente', 'Cuidados esteticos e preventivos nao invasivos dos pes.', 'podologia'),
    ('BRAID_MAINTENANCE', 'Manutencao de trancas', 'cabelo', 'recorrente', 'Manutencao, ajuste e remocao de trancas.', 'trancas')
),
inserted_services as (
  insert into public.servicos_catalogo (
    codigo_canonico,
    nome,
    categoria_key,
    natureza,
    descricao,
    ativo,
    metadata
  )
  select
    cs.codigo_canonico,
    cs.nome,
    cs.categoria_key,
    cs.natureza,
    cs.descricao,
    true,
    jsonb_build_object(
      'taxonomy_version', '2.1.0',
      'relation_source', 'taxonomy_v2_catalog_expansion',
      'domain_key', cs.domain_key,
      'tenant_offer_policy', 'catalog_available_not_tenant_active'
    )
  from catalog_services cs
  where not exists (
    select 1
    from public.servicos_catalogo sc
    where sc.codigo_canonico = cs.codigo_canonico
  )
  returning id, codigo_canonico, nome
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
  'servico_catalogo',
  isv.id,
  'create_official_service',
  to_jsonb(isv),
  'taxonomy_v2_catalog_expansion',
  jsonb_build_object('version', '2.1.0', 'scope', 'global_catalog')
from inserted_services isv
cross join public.taxonomy_versions tv
where tv.version = '2.1.0';

with specialty_seed(key, nome, categoria_key, primary_role, descricao) as (
  values
    ('corte_cacheado_crespo', 'Corte cacheado/crespo', 'cabelo', 'Especialista em cabelos cacheados/crespos', 'Corte tecnico para cabelos cacheados, crespos e texturas afro.'),
    ('retoque_raiz', 'Retoque de raiz', 'cabelo', 'Colorista', 'Retoque de raiz em coloracao capilar.'),
    ('correcao_cor', 'Correcao de cor', 'cabelo', 'Colorista', 'Correcao tecnica de coloracao.'),
    ('morena_iluminada', 'Morena iluminada', 'cabelo', 'Colorista', 'Tecnica de iluminacao capilar.'),
    ('finalizacao_cacheada', 'Finalizacao cacheada', 'cabelo', 'Especialista em cabelos cacheados/crespos', 'Finalizacao para curvaturas cacheadas e crespas.'),
    ('acrilico', 'Acrilico', 'unhas', 'Nail Designer', 'Alongamento de unhas em acrilico.'),
    ('molde_f1', 'Molde F1', 'unhas', 'Nail Designer', 'Alongamento de unhas com molde F1.'),
    ('remocao_segura', 'Remocao segura', 'unhas', 'Nail Designer', 'Remocao segura de alongamento.'),
    ('reparo', 'Reparo', 'unhas', 'Nail Designer', 'Reparo tecnico de unha ou alongamento.'),
    ('manutencao_fio_a_fio', 'Manutencao fio a fio', 'cilios', 'Lash designer', 'Manutencao de cilios fio a fio.'),
    ('manutencao_volume_brasileiro', 'Manutencao volume brasileiro', 'cilios', 'Lash designer', 'Manutencao de volume brasileiro.'),
    ('manutencao_volume_russo', 'Manutencao volume russo', 'cilios', 'Lash designer', 'Manutencao de volume russo.'),
    ('remocao_extensao_cilios', 'Remocao de extensao', 'cilios', 'Lash designer', 'Remocao de extensao de cilios.'),
    ('alivio_tensional', 'Alivio tensional', 'massoterapia', 'Massoterapeuta', 'Tecnica de alivio tensional nao clinica.'),
    ('reflexologia', 'Reflexologia', 'massoterapia', 'Massoterapeuta', 'Reflexologia em contexto de bem-estar.'),
    ('aromaterapia', 'Aromaterapia', 'massoterapia', 'Terapeuta de Spa', 'Aromaterapia estetica e de bem-estar.'),
    ('pedras_quentes', 'Pedras quentes', 'massoterapia', 'Massoterapeuta', 'Massagem com pedras quentes.'),
    ('day_spa', 'Day spa', 'massoterapia', 'Terapeuta de Spa', 'Ritual de day spa.'),
    ('ritual_relaxante', 'Ritual relaxante', 'massoterapia', 'Terapeuta de Spa', 'Ritual relaxante de spa.'),
    ('ritual_corporal', 'Ritual corporal', 'estetica_corporal', 'Terapeuta de Spa', 'Ritual corporal estetico.'),
    ('cuidados_dos_pes', 'Cuidados dos pes', 'podologia', 'Podologa', 'Cuidados esteticos e preventivos dos pes.'),
    ('calosidades_simples', 'Calosidades simples', 'podologia', 'Podologa', 'Cuidados nao invasivos de calosidades simples.'),
    ('hidratacao_pes', 'Hidratacao dos pes', 'podologia', 'Podologa', 'Hidratacao estetica dos pes.'),
    ('corte_tecnico_nao_invasivo', 'Corte tecnico nao invasivo', 'podologia', 'Podologa', 'Corte tecnico nao invasivo.'),
    ('acompanhamento_podologico', 'Acompanhamento podologico', 'podologia', 'Podologa', 'Acompanhamento podologico estetico/preventivo.'),
    ('manutencao_trancas', 'Manutencao de trancas', 'cabelo', 'Trancista', 'Manutencao de trancas.'),
    ('remocao_trancas', 'Remocao de trancas', 'cabelo', 'Trancista', 'Remocao de trancas.'),
    ('visagismo_capilar', 'Visagismo capilar', 'cabelo', 'Cabeleireira', 'Visagismo aplicado ao cabelo e imagem.')
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
      'taxonomy_version', '2.1.0',
      'relation_source', 'taxonomy_v2_catalog_expansion',
      'primary_role', pr.primary_role
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
  'especialidade',
  isp.id,
  'create_official_specialty',
  to_jsonb(isp),
  'taxonomy_v2_catalog_expansion',
  jsonb_build_object('version', '2.1.0', 'scope', 'global_catalog')
from inserted_specialties isp
cross join public.taxonomy_versions tv
where tv.version = '2.1.0';

with cargo_specialty_seed(cargo_nome, specialty_key, principal) as (
  values
    ('Colorista', 'coloracao', true),
    ('Colorista', 'coloracao_global', true),
    ('Colorista', 'retoque_raiz', true),
    ('Colorista', 'tonalizacao', true),
    ('Colorista', 'correcao_cor', true),
    ('Colorista', 'morena_iluminada', true),
    ('Colorista', 'luzes', false),
    ('Colorista', 'mechas', false),
    ('Colorista', 'corte_cacheado_crespo', false),
    ('Especialista em cabelos cacheados/crespos', 'corte_cacheado_crespo', true),
    ('Especialista em cabelos cacheados/crespos', 'finalizacao_cacheada', true),
    ('Especialista em cabelos cacheados/crespos', 'tratamento_capilar', false),
    ('Nail Designer', 'alongamento_de_unhas', true),
    ('Nail Designer', 'gel', true),
    ('Nail Designer', 'fibra', true),
    ('Nail Designer', 'acrilico', true),
    ('Nail Designer', 'molde_f1', true),
    ('Nail Designer', 'banho_em_gel', false),
    ('Nail Designer', 'blindagem', false),
    ('Nail Designer', 'nail_art', true),
    ('Nail Designer', 'remocao_segura', true),
    ('Nail Designer', 'reparo', true),
    ('Micropigmentador(a)', 'micropigmentacao', true),
    ('Designer de sobrancelhas', 'micropigmentacao', false),
    ('Massoterapeuta', 'drenagem_linfatica', true),
    ('Esteticista', 'drenagem_linfatica', false),
    ('Massoterapeuta', 'alivio_tensional', true),
    ('Massoterapeuta', 'reflexologia', true),
    ('Massoterapeuta', 'pedras_quentes', true),
    ('Terapeuta de Spa', 'aromaterapia', true),
    ('Terapeuta de Spa', 'day_spa', true),
    ('Terapeuta de Spa', 'ritual_relaxante', true),
    ('Terapeuta de Spa', 'ritual_corporal', true),
    ('Massoterapeuta', 'ritual_relaxante', false),
    ('Trancista', 'trancas', true),
    ('Trancista', 'manutencao_trancas', true),
    ('Trancista', 'remocao_trancas', true),
    ('Cabeleireira', 'trancas', false),
    ('Cabeleireira', 'visagismo_capilar', true),
    ('Podologa', 'cuidados_dos_pes', true),
    ('Podologa', 'calosidades_simples', true),
    ('Podologa', 'hidratacao_pes', true),
    ('Podologa', 'corte_tecnico_nao_invasivo', true),
    ('Podologa', 'acompanhamento_podologico', true)
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
resolved as (
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
    '2.1.0',
    'taxonomy_v2_catalog_expansion',
    'Expansao controlada da matriz oficial Cargo x Especialidade da Taxonomia V2.',
    jsonb_build_object('cargo_nome', r.cargo_nome, 'taxonomy_specialty_key', r.specialty_key)
  from resolved r
  where not exists (
    select 1
    from public.cargo_especialidades ce
    where ce.cargo_id = r.cargo_id
      and ce.especialidade_id = r.especialidade_id
      and ce.deleted_at is null
  )
  returning id, cargo_id, especialidade_id, principal
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
  'cargo_especialidades',
  ics.id,
  'create_role_specialty_relation',
  to_jsonb(ics),
  'taxonomy_v2_catalog_expansion',
  jsonb_build_object('version', '2.1.0', 'principal_policy', 'recommendation_ordering_only_never_execution_restriction')
from inserted_cargo_specialties ics
cross join public.taxonomy_versions tv
where tv.version = '2.1.0';

with service_specialty_seed(service_code, specialty_key) as (
  values
    ('HAIR_CUT', 'corte_cacheado_crespo'),
    ('HAIR_COLORING', 'retoque_raiz'),
    ('HAIR_COLORING', 'correcao_cor'),
    ('HAIR_COLORING', 'coloracao_global'),
    ('HIGHLIGHTS', 'morena_iluminada'),
    ('BRUSHING', 'finalizacao_cacheada'),
    ('NAIL_EXTENSION', 'acrilico'),
    ('NAIL_EXTENSION', 'molde_f1'),
    ('NAIL_EXTENSION_REMOVAL', 'remocao_segura'),
    ('NAIL_EXTENSION_REMOVAL', 'reparo'),
    ('LASH_MAINTENANCE', 'manutencao_fio_a_fio'),
    ('LASH_MAINTENANCE', 'manutencao_volume_brasileiro'),
    ('LASH_MAINTENANCE', 'manutencao_volume_russo'),
    ('LASH_REMOVAL', 'remocao_extensao_cilios'),
    ('THERAPEUTIC_MASSAGE_NON_CLINICAL', 'alivio_tensional'),
    ('THERAPEUTIC_MASSAGE_NON_CLINICAL', 'reflexologia'),
    ('RELAXING_MASSAGE', 'aromaterapia'),
    ('RELAXING_MASSAGE', 'pedras_quentes'),
    ('SPA_RITUAL', 'day_spa'),
    ('SPA_RITUAL', 'ritual_relaxante'),
    ('SPA_RITUAL', 'ritual_corporal'),
    ('PODOLOGY_AESTHETIC_PREVENTIVE', 'cuidados_dos_pes'),
    ('PODOLOGY_AESTHETIC_PREVENTIVE', 'calosidades_simples'),
    ('PODOLOGY_AESTHETIC_PREVENTIVE', 'hidratacao_pes'),
    ('PODOLOGY_AESTHETIC_PREVENTIVE', 'corte_tecnico_nao_invasivo'),
    ('PODOLOGY_AESTHETIC_PREVENTIVE', 'acompanhamento_podologico'),
    ('BRAIDS', 'trancas'),
    ('BRAID_MAINTENANCE', 'manutencao_trancas'),
    ('BRAID_MAINTENANCE', 'remocao_trancas'),
    ('BROW_MICROPIGMENTATION', 'micropigmentacao'),
    ('EVENT_HAIRSTYLE', 'visagismo_capilar')
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
resolved as (
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
    ativo,
    metadata
  )
  select
    r.servico_catalogo_id,
    r.especialidade_id,
    true,
    jsonb_build_object(
      'taxonomy_version', '2.1.0',
      'relation_source', 'taxonomy_v2_catalog_expansion',
      'codigo_canonico', r.service_code,
      'taxonomy_specialty_key', r.specialty_key
    )
  from resolved r
  where not exists (
    select 1
    from public.servico_catalogo_especialidades sce
    where sce.servico_catalogo_id = r.servico_catalogo_id
      and sce.especialidade_id = r.especialidade_id
  )
  returning id, servico_catalogo_id, especialidade_id
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
  'servico_catalogo_especialidades',
  iss.id,
  'create_service_specialty_relation',
  to_jsonb(iss),
  'taxonomy_v2_catalog_expansion',
  jsonb_build_object('version', '2.1.0')
from inserted_service_specialties iss
cross join public.taxonomy_versions tv
where tv.version = '2.1.0';

with business_service_seed(tipo_slug, service_code, recomendado, ordem_exibicao) as (
  values
    ('nail-studio', 'NAIL_EXTENSION_REMOVAL', true, 60),
    ('salao-de-beleza', 'NAIL_EXTENSION_REMOVAL', false, 85),
    ('studio-de-cilios', 'LASH_MAINTENANCE', true, 30),
    ('studio-de-cilios', 'LASH_REMOVAL', true, 40),
    ('massoterapia', 'THERAPEUTIC_MASSAGE_NON_CLINICAL', true, 30),
    ('centro-de-bem-estar', 'THERAPEUTIC_MASSAGE_NON_CLINICAL', false, 35),
    ('spa-day-spa', 'SPA_RITUAL', true, 10),
    ('centro-de-bem-estar', 'SPA_RITUAL', false, 40),
    ('podologia', 'PODOLOGY_AESTHETIC_PREVENTIVE', true, 10),
    ('salao-de-beleza', 'BRAID_MAINTENANCE', false, 90),
    ('profissional-autonomo-multisservicos', 'BRAID_MAINTENANCE', false, 90)
),
resolved as (
  select tn.id as tipo_negocio_id, sc.id as servico_catalogo_id, seed.recomendado, seed.ordem_exibicao, seed.tipo_slug, seed.service_code
  from business_service_seed seed
  join public.tipos_negocio tn
    on tn.slug = seed.tipo_slug
   and tn.ativo = true
  join public.servicos_catalogo sc
    on sc.codigo_canonico = seed.service_code
   and sc.ativo = true
),
inserted_business_services as (
  insert into public.tipo_negocio_servicos_catalogo (
    tipo_negocio_id,
    servico_catalogo_id,
    recomendado,
    ativo,
    ordem_exibicao
  )
  select
    r.tipo_negocio_id,
    r.servico_catalogo_id,
    r.recomendado,
    true,
    r.ordem_exibicao
  from resolved r
  where not exists (
    select 1
    from public.tipo_negocio_servicos_catalogo tns
    where tns.tipo_negocio_id = r.tipo_negocio_id
      and tns.servico_catalogo_id = r.servico_catalogo_id
  )
  returning id, tipo_negocio_id, servico_catalogo_id, recomendado
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
  'tipo_negocio_servicos_catalogo',
  ibs.id,
  'create_business_type_service_relation',
  to_jsonb(ibs),
  'taxonomy_v2_catalog_expansion',
  jsonb_build_object('version', '2.1.0', 'tenant_offer_policy', 'catalog_available_not_tenant_active')
from inserted_business_services ibs
cross join public.taxonomy_versions tv
where tv.version = '2.1.0';

with alias_seed(entidade_tipo, lookup_kind, lookup_value, alias, normalizado) as (
  values
    ('cargo', 'nome', 'Colorista', 'Especialista em coloracao', 'especialista em coloracao'),
    ('cargo', 'nome', 'Colorista', 'Colorimetria', 'colorimetria'),
    ('cargo', 'nome', 'Especialista em cabelos cacheados/crespos', 'Especialista em cachos', 'especialista em cachos'),
    ('cargo', 'nome', 'Nail Designer', 'Designer de unhas', 'designer de unhas'),
    ('cargo', 'nome', 'Nail Designer', 'Alongamentista', 'alongamentista'),
    ('cargo', 'nome', 'Micropigmentador(a)', 'Micropigmentadora', 'micropigmentadora'),
    ('cargo', 'nome', 'Micropigmentador(a)', 'Micropigmentador', 'micropigmentador'),
    ('cargo', 'nome', 'Micropigmentador(a)', 'Dermopigmentador(a)', 'dermopigmentador(a)'),
    ('cargo', 'nome', 'Terapeuta de Spa', 'Spa therapist', 'spa therapist'),
    ('cargo', 'nome', 'Trancista', 'Tranceira', 'tranceira'),
    ('servico_catalogo', 'codigo', 'NAIL_EXTENSION_REMOVAL', 'Remocao de unhas', 'remocao de unhas'),
    ('servico_catalogo', 'codigo', 'THERAPEUTIC_MASSAGE_NON_CLINICAL', 'Massagem terapeutica', 'massagem terapeutica'),
    ('servico_catalogo', 'codigo', 'PODOLOGY_AESTHETIC_PREVENTIVE', 'Podologia estetica', 'podologia estetica')
),
resolved_aliases as (
  select a.entidade_tipo, c.id as entidade_id, a.alias, a.normalizado
  from alias_seed a
  join public.cargos c
    on a.entidade_tipo = 'cargo'
   and a.lookup_kind = 'nome'
   and lower(trim(c.nome)) = lower(trim(a.lookup_value))
   and c.ativo = true
   and c.deleted_at is null
  union all
  select a.entidade_tipo, sc.id as entidade_id, a.alias, a.normalizado
  from alias_seed a
  join public.servicos_catalogo sc
    on a.entidade_tipo = 'servico_catalogo'
   and a.lookup_kind = 'codigo'
   and sc.codigo_canonico = a.lookup_value
   and sc.ativo = true
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
    ra.entidade_tipo,
    ra.entidade_id,
    ra.alias,
    'pt-BR',
    ra.normalizado,
    true,
    '2.1.0',
    'taxonomy_v2_catalog_expansion',
    jsonb_build_object('scope', 'official_alias')
  from resolved_aliases ra
  where not exists (
    select 1
    from public.taxonomy_aliases ta
    where ta.entidade_tipo = ra.entidade_tipo
      and ta.locale = 'pt-BR'
      and ta.normalizado = ra.normalizado
      and ta.deleted_at is null
      and ta.ativo = true
  )
  returning id, entidade_tipo, entidade_id, alias
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
  'taxonomy_aliases',
  ia.id,
  'create_official_alias',
  to_jsonb(ia),
  'taxonomy_v2_catalog_expansion',
  jsonb_build_object('version', '2.1.0')
from inserted_aliases ia
cross join public.taxonomy_versions tv
where tv.version = '2.1.0';

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
  'taxonomy_v2_catalog_expansion',
  jsonb_build_object(
    'tenant_offers_changed', 0,
    'tenant_service_specialties_changed', 0,
    'professionals_changed', 0,
    'appointments_changed', 0
  )
from public.taxonomy_versions tv
where tv.version = '2.1.0'
  and not exists (
    select 1
    from public.taxonomy_audit_log log
    where log.taxonomy_version_id = tv.id
      and log.entidade_tipo = 'taxonomy_versions'
      and log.acao = 'activate_version'
      and log.origem = 'taxonomy_v2_catalog_expansion'
  );
