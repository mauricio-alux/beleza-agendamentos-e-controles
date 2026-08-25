-- Taxonomy V2 - Etapa 3.
-- Operational profiles and administrative defaults for tenant initialization.
-- This migration creates the permanent profile/default layer and does not
-- mutate tenant offers, professionals or historical appointments.

create table if not exists public.tipo_negocio_perfis_operacionais (
  id uuid primary key default gen_random_uuid(),
  tipo_negocio_id uuid not null references public.tipos_negocio(id) on delete cascade,
  classificacao varchar(20) not null
    check (classificacao in ('especializado', 'generalista')),
  nome varchar(150) not null,
  descricao text,
  ativo boolean not null default true,
  exige_confirmacao_onboarding boolean not null default false,
  taxonomy_version varchar(32) not null default '2.1.0',
  origem varchar(80) not null default 'taxonomy_v2_phase3_operational_profiles',
  metadata jsonb not null default '{}'::jsonb,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now(),
  deleted_at timestamptz,
  constraint tipo_negocio_perfis_operacionais_tipo_unique unique (tipo_negocio_id)
);

create index if not exists idx_tipo_negocio_perfis_operacionais_ativo
  on public.tipo_negocio_perfis_operacionais (ativo, classificacao)
  where deleted_at is null;

drop trigger if exists set_updated_at on public.tipo_negocio_perfis_operacionais;
create trigger set_updated_at
before update on public.tipo_negocio_perfis_operacionais
for each row
execute function public.set_updated_at();

create table if not exists public.perfil_operacional_servicos (
  id uuid primary key default gen_random_uuid(),
  perfil_operacional_id uuid not null references public.tipo_negocio_perfis_operacionais(id) on delete cascade,
  servico_catalogo_id uuid not null references public.servicos_catalogo(id) on delete restrict,
  recomendado boolean not null default true,
  obrigatorio boolean not null default false,
  ativo boolean not null default true,
  prioridade integer not null default 0,
  origem varchar(80) not null default 'tipo_negocio_servicos_catalogo',
  metadata jsonb not null default '{}'::jsonb,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now(),
  deleted_at timestamptz,
  constraint perfil_operacional_servicos_unique unique (perfil_operacional_id, servico_catalogo_id)
);

create index if not exists idx_perfil_operacional_servicos_perfil
  on public.perfil_operacional_servicos (perfil_operacional_id, ativo, recomendado, prioridade)
  where deleted_at is null;

drop trigger if exists set_updated_at on public.perfil_operacional_servicos;
create trigger set_updated_at
before update on public.perfil_operacional_servicos
for each row
execute function public.set_updated_at();

create table if not exists public.perfil_operacional_cargos (
  id uuid primary key default gen_random_uuid(),
  perfil_operacional_id uuid not null references public.tipo_negocio_perfis_operacionais(id) on delete cascade,
  cargo_id uuid not null references public.cargos(id) on delete restrict,
  recomendado boolean not null default true,
  principal boolean not null default false,
  ativo boolean not null default true,
  prioridade integer not null default 0,
  origem varchar(80) not null default 'cargo_especialidades_v2',
  metadata jsonb not null default '{}'::jsonb,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now(),
  deleted_at timestamptz,
  constraint perfil_operacional_cargos_unique unique (perfil_operacional_id, cargo_id)
);

create index if not exists idx_perfil_operacional_cargos_perfil
  on public.perfil_operacional_cargos (perfil_operacional_id, ativo, recomendado, prioridade)
  where deleted_at is null;

drop trigger if exists set_updated_at on public.perfil_operacional_cargos;
create trigger set_updated_at
before update on public.perfil_operacional_cargos
for each row
execute function public.set_updated_at();

create table if not exists public.perfil_operacional_defaults (
  id uuid primary key default gen_random_uuid(),
  perfil_operacional_id uuid not null references public.tipo_negocio_perfis_operacionais(id) on delete cascade,
  servico_catalogo_id uuid not null references public.servicos_catalogo(id) on delete restrict,
  especialidade_id uuid references public.especialidades(id) on delete restrict,
  region_scope varchar(20) not null default 'global'
    check (region_scope in ('global', 'country', 'state', 'city')),
  country varchar(2),
  state varchar(80),
  city varchar(120),
  preco_min_referencia numeric(10,2),
  preco_referencia numeric(10,2),
  preco_max_referencia numeric(10,2),
  duracao_minutos integer,
  dias_retorno_recomendado integer,
  aceita_agendamento_online boolean not null default true,
  fonte varchar(80) not null default 'administrative_reference',
  vigencia_inicio date not null default current_date,
  vigencia_fim date,
  ativo boolean not null default true,
  metadata jsonb not null default '{}'::jsonb,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now(),
  deleted_at timestamptz,
  constraint perfil_operacional_defaults_scope_check check (
    (region_scope = 'global' and country is null and state is null and city is null)
    or (region_scope = 'country' and country is not null and state is null and city is null)
    or (region_scope = 'state' and country is not null and state is not null and city is null)
    or (region_scope = 'city' and country is not null and state is not null and city is not null)
  ),
  constraint perfil_operacional_defaults_price_check check (
    preco_min_referencia is null or preco_referencia is null or preco_min_referencia <= preco_referencia
  ),
  constraint perfil_operacional_defaults_price_max_check check (
    preco_max_referencia is null or preco_referencia is null or preco_referencia <= preco_max_referencia
  ),
  constraint perfil_operacional_defaults_duration_check check (duracao_minutos is null or duracao_minutos > 0),
  constraint perfil_operacional_defaults_return_check check (dias_retorno_recomendado is null or dias_retorno_recomendado > 0)
);

create unique index if not exists idx_perfil_operacional_defaults_unique_active
  on public.perfil_operacional_defaults (
    perfil_operacional_id,
    servico_catalogo_id,
    coalesce(especialidade_id, '00000000-0000-0000-0000-000000000000'::uuid),
    region_scope,
    coalesce(country, ''),
    coalesce(state, ''),
    coalesce(city, '')
  )
  where deleted_at is null;

create index if not exists idx_perfil_operacional_defaults_lookup
  on public.perfil_operacional_defaults (
    perfil_operacional_id,
    servico_catalogo_id,
    especialidade_id,
    ativo,
    region_scope
  )
  where deleted_at is null;

drop trigger if exists set_updated_at on public.perfil_operacional_defaults;
create trigger set_updated_at
before update on public.perfil_operacional_defaults
for each row
execute function public.set_updated_at();

alter table public.tipo_negocio_perfis_operacionais enable row level security;
alter table public.perfil_operacional_servicos enable row level security;
alter table public.perfil_operacional_cargos enable row level security;
alter table public.perfil_operacional_defaults enable row level security;

drop policy if exists tipo_negocio_perfis_select_authenticated on public.tipo_negocio_perfis_operacionais;
create policy tipo_negocio_perfis_select_authenticated
on public.tipo_negocio_perfis_operacionais
for select
to authenticated
using (deleted_at is null and (ativo = true or public.is_master_admin()));

drop policy if exists tipo_negocio_perfis_write_master_admin on public.tipo_negocio_perfis_operacionais;
create policy tipo_negocio_perfis_write_master_admin
on public.tipo_negocio_perfis_operacionais
for all
to authenticated
using (public.is_master_admin())
with check (public.is_master_admin());

drop policy if exists perfil_operacional_servicos_select_authenticated on public.perfil_operacional_servicos;
create policy perfil_operacional_servicos_select_authenticated
on public.perfil_operacional_servicos
for select
to authenticated
using (deleted_at is null and (ativo = true or public.is_master_admin()));

drop policy if exists perfil_operacional_servicos_write_master_admin on public.perfil_operacional_servicos;
create policy perfil_operacional_servicos_write_master_admin
on public.perfil_operacional_servicos
for all
to authenticated
using (public.is_master_admin())
with check (public.is_master_admin());

drop policy if exists perfil_operacional_cargos_select_authenticated on public.perfil_operacional_cargos;
create policy perfil_operacional_cargos_select_authenticated
on public.perfil_operacional_cargos
for select
to authenticated
using (deleted_at is null and (ativo = true or public.is_master_admin()));

drop policy if exists perfil_operacional_cargos_write_master_admin on public.perfil_operacional_cargos;
create policy perfil_operacional_cargos_write_master_admin
on public.perfil_operacional_cargos
for all
to authenticated
using (public.is_master_admin())
with check (public.is_master_admin());

drop policy if exists perfil_operacional_defaults_select_authenticated on public.perfil_operacional_defaults;
create policy perfil_operacional_defaults_select_authenticated
on public.perfil_operacional_defaults
for select
to authenticated
using (deleted_at is null and (ativo = true or public.is_master_admin()));

drop policy if exists perfil_operacional_defaults_write_master_admin on public.perfil_operacional_defaults;
create policy perfil_operacional_defaults_write_master_admin
on public.perfil_operacional_defaults
for all
to authenticated
using (public.is_master_admin())
with check (public.is_master_admin());

with classified as (
  select
    tn.id as tipo_negocio_id,
    tn.nome,
    tn.slug,
    case
      when tn.slug in ('salao-de-beleza', 'clinica-de-estetica', 'spa-day-spa', 'centro-de-bem-estar', 'profissional-autonomo-multisservicos') then 'generalista'
      else 'especializado'
    end as classificacao
  from public.tipos_negocio tn
  where tn.ativo = true
    and tn.slug <> 'outro'
),
inserted_profiles as (
  insert into public.tipo_negocio_perfis_operacionais (
    tipo_negocio_id,
    classificacao,
    nome,
    descricao,
    ativo,
    exige_confirmacao_onboarding,
    taxonomy_version,
    origem,
    metadata
  )
  select
    tipo_negocio_id,
    classificacao,
    'Perfil operacional - ' || nome,
    'Perfil inicial V2 para onboarding orientado ao tipo de negocio.',
    true,
    classificacao = 'generalista',
    '2.1.0',
    'taxonomy_v2_phase3_operational_profiles',
    jsonb_build_object(
      'seed_source', 'tipo_negocio_servicos_catalogo',
      'generalist_policy', 'recommended_services_only_until_user_confirmation',
      'specialized_policy', 'automated_initial_configuration'
    )
  from classified
  on conflict (tipo_negocio_id) do update
  set
    classificacao = excluded.classificacao,
    nome = excluded.nome,
    descricao = excluded.descricao,
    ativo = true,
    exige_confirmacao_onboarding = excluded.exige_confirmacao_onboarding,
    taxonomy_version = '2.1.0',
    origem = excluded.origem,
    metadata = tipo_negocio_perfis_operacionais.metadata || excluded.metadata,
    atualizado_em = now()
  returning id
)
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
  'tipo_negocio_perfis_operacionais',
  'upsert_operational_profiles',
  jsonb_build_object('affected_count', count(ip.id)),
  'taxonomy_v2_phase3_operational_profiles',
  jsonb_build_object('scope', 'operational_profiles_defaults_not_global_taxonomy_release')
from inserted_profiles ip
cross join public.taxonomy_versions tv
where tv.version = '2.1.0'
group by tv.id
having count(ip.id) > 0;

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
  tns.servico_catalogo_id,
  tns.recomendado,
  p.classificacao = 'especializado' and tns.recomendado = true,
  true,
  coalesce(tns.ordem_exibicao, 0),
  'tipo_negocio_servicos_catalogo',
  jsonb_build_object('taxonomy_version', '2.1.0')
from public.tipo_negocio_perfis_operacionais p
join public.tipo_negocio_servicos_catalogo tns
  on tns.tipo_negocio_id = p.tipo_negocio_id
 and tns.ativo = true
join public.servicos_catalogo sc
  on sc.id = tns.servico_catalogo_id
 and sc.ativo = true
where p.deleted_at is null
on conflict (perfil_operacional_id, servico_catalogo_id) do update
set
  recomendado = excluded.recomendado,
  obrigatorio = excluded.obrigatorio,
  ativo = true,
  prioridade = excluded.prioridade,
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
  'cargo_especialidades_v2',
  jsonb_build_object(
    'taxonomy_version', '2.1.0',
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
where p.deleted_at is null
group by p.id, ce.cargo_id
on conflict (perfil_operacional_id, cargo_id) do update
set
  recomendado = true,
  principal = excluded.principal,
  ativo = true,
  prioridade = excluded.prioridade,
  metadata = perfil_operacional_cargos.metadata || excluded.metadata,
  atualizado_em = now();

insert into public.perfil_operacional_defaults (
  perfil_operacional_id,
  servico_catalogo_id,
  especialidade_id,
  region_scope,
  preco_min_referencia,
  preco_referencia,
  preco_max_referencia,
  duracao_minutos,
  dias_retorno_recomendado,
  aceita_agendamento_online,
  fonte,
  metadata
)
select
  p.id,
  pos.servico_catalogo_id,
  sce.especialidade_id,
  'global',
  greatest(round((base.preco * 0.8)::numeric, 2), 0),
  base.preco,
  round((base.preco * 1.25)::numeric, 2),
  base.duracao_minutos,
  base.dias_retorno_recomendado,
  sc.natureza <> 'ocasional',
  'administrative_reference',
  jsonb_build_object(
    'taxonomy_version', '2.1.0',
    'price_policy', 'administrative_reference_not_market_price',
    'fallback_policy', 'city_state_country_global'
  )
from public.tipo_negocio_perfis_operacionais p
join public.perfil_operacional_servicos pos
  on pos.perfil_operacional_id = p.id
 and pos.ativo = true
 and pos.deleted_at is null
join public.servicos_catalogo sc
  on sc.id = pos.servico_catalogo_id
join public.servico_catalogo_especialidades sce
  on sce.servico_catalogo_id = sc.id
 and sce.ativo = true
cross join lateral (
  select
    case
      when sc.codigo_canonico like '%BRIDAL%' then 180.00
      when sc.codigo_canonico like '%MAKEUP%' then 120.00
      when sc.codigo_canonico like '%NAIL_EXTENSION%' then 120.00
      when sc.codigo_canonico like '%MICROPIGMENTATION%' then 350.00
      when sc.codigo_canonico like '%LASER%' then 180.00
      when sc.codigo_canonico like '%MASSAGE%' or sc.codigo_canonico like '%DRAINAGE%' then 120.00
      when sc.codigo_canonico like '%BROW%' then 70.00
      when sc.codigo_canonico like '%BEARD%' then 45.00
      when sc.codigo_canonico like '%HAIR_CUT%' then 80.00
      when sc.codigo_canonico like '%HAIR%' then 120.00
      when sc.codigo_canonico like '%MANICURE%' or sc.codigo_canonico like '%PEDICURE%' then 50.00
      else 90.00
    end::numeric(10,2) as preco,
    case
      when sc.codigo_canonico like '%BRIDAL%' then 180
      when sc.codigo_canonico like '%MAKEUP%' then 90
      when sc.codigo_canonico like '%NAIL_EXTENSION%' then 120
      when sc.codigo_canonico like '%MICROPIGMENTATION%' then 150
      when sc.codigo_canonico like '%LASER%' then 45
      when sc.codigo_canonico like '%MASSAGE%' or sc.codigo_canonico like '%DRAINAGE%' then 60
      when sc.codigo_canonico like '%BROW%' then 45
      when sc.codigo_canonico like '%BEARD%' then 45
      when sc.codigo_canonico like '%HAIR_COLORING%' then 90
      when sc.codigo_canonico like '%HAIR%' then 60
      else 60
    end as duracao_minutos,
    case
      when sc.natureza = 'ocasional' then null
      when sc.codigo_canonico like '%NAIL_EXTENSION%' then 21
      when sc.codigo_canonico like '%MICROPIGMENTATION%' then 30
      when sc.codigo_canonico like '%LASER%' then 30
      when sc.codigo_canonico like '%BROW%' then 30
      else 45
    end as dias_retorno_recomendado
) base
where p.deleted_at is null
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
  ativo = true,
  metadata = perfil_operacional_defaults.metadata || excluded.metadata,
  atualizado_em = now();

comment on table public.tipo_negocio_perfis_operacionais is
  'Operational profile for a business type. Complements Taxonomy V2 matrices with onboarding/default rules and does not replace global taxonomy.';

comment on table public.perfil_operacional_servicos is
  'Services recommended or applicable for an operational profile. Derived from TipoNegocio x Servico catalog matrix.';

comment on table public.perfil_operacional_cargos is
  'Roles recommended for an operational profile. A role recommendation never implies an existing professional.';

comment on table public.perfil_operacional_defaults is
  'Administrative reference defaults for profile initialization. Price values are configurable references, not real-time market prices.';
