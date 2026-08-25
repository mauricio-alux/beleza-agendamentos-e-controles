-- Taxonomy V2 foundation - Etapa 1.
-- Creates versioning, audit, aliases and the official Cargo x Especialidade
-- N:N matrix. This migration does not expand the catalog and keeps
-- especialidades.cargo_id as transitional V1 compatibility.

create table if not exists public.taxonomy_versions (
  id uuid primary key default gen_random_uuid(),
  version varchar(32) not null unique,
  status varchar(20) not null default 'active'
    check (status in ('draft', 'active', 'deprecated', 'archived')),
  descricao text,
  origem varchar(80) not null default 'taxonomy_v2_foundation',
  metadata jsonb not null default '{}'::jsonb,
  activated_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create table if not exists public.taxonomy_audit_log (
  id uuid primary key default gen_random_uuid(),
  taxonomy_version_id uuid references public.taxonomy_versions(id) on delete set null,
  entidade_tipo varchar(80) not null,
  entidade_id uuid,
  acao varchar(80) not null,
  valor_anterior jsonb,
  valor_posterior jsonb,
  origem varchar(80) not null default 'taxonomy_v2_foundation',
  ator_id uuid references public.usuarios(id) on delete set null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.cargo_especialidades (
  id uuid primary key default gen_random_uuid(),
  cargo_id uuid not null references public.cargos(id) on delete restrict,
  especialidade_id uuid not null references public.especialidades(id) on delete restrict,
  principal boolean not null default false,
  ativo boolean not null default true,
  taxonomy_version varchar(32) not null default '2.0.0',
  relation_source varchar(80) not null default 'migration_v1',
  change_reason text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create table if not exists public.taxonomy_aliases (
  id uuid primary key default gen_random_uuid(),
  entidade_tipo varchar(40) not null
    check (entidade_tipo in ('cargo', 'especialidade', 'servico_catalogo', 'tipo_negocio')),
  entidade_id uuid not null,
  alias text not null,
  locale varchar(12) not null default 'pt-BR',
  normalizado text not null,
  ativo boolean not null default true,
  taxonomy_version varchar(32) not null default '2.0.0',
  relation_source varchar(80) not null default 'taxonomy_v2_foundation',
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create index if not exists idx_taxonomy_versions_status
  on public.taxonomy_versions (status)
  where deleted_at is null;

create index if not exists idx_taxonomy_audit_log_version
  on public.taxonomy_audit_log (taxonomy_version_id);

create index if not exists idx_taxonomy_audit_log_entity
  on public.taxonomy_audit_log (entidade_tipo, entidade_id);

create index if not exists idx_cargo_especialidades_cargo
  on public.cargo_especialidades (cargo_id)
  where deleted_at is null and ativo = true;

create index if not exists idx_cargo_especialidades_especialidade
  on public.cargo_especialidades (especialidade_id)
  where deleted_at is null and ativo = true;

create unique index if not exists idx_cargo_especialidades_active_unique
  on public.cargo_especialidades (cargo_id, especialidade_id)
  where deleted_at is null;

create index if not exists idx_taxonomy_aliases_entity
  on public.taxonomy_aliases (entidade_tipo, entidade_id)
  where deleted_at is null and ativo = true;

create unique index if not exists idx_taxonomy_aliases_active_unique
  on public.taxonomy_aliases (entidade_tipo, locale, normalizado)
  where deleted_at is null and ativo = true;

drop trigger if exists set_updated_at on public.taxonomy_versions;
create trigger set_updated_at
before update on public.taxonomy_versions
for each row
execute function public.set_updated_at();

drop trigger if exists set_updated_at on public.cargo_especialidades;
create trigger set_updated_at
before update on public.cargo_especialidades
for each row
execute function public.set_updated_at();

drop trigger if exists set_updated_at on public.taxonomy_aliases;
create trigger set_updated_at
before update on public.taxonomy_aliases
for each row
execute function public.set_updated_at();

alter table public.taxonomy_versions enable row level security;
alter table public.taxonomy_audit_log enable row level security;
alter table public.cargo_especialidades enable row level security;
alter table public.taxonomy_aliases enable row level security;

drop policy if exists taxonomy_versions_select_authenticated on public.taxonomy_versions;
create policy taxonomy_versions_select_authenticated
on public.taxonomy_versions
for select
to authenticated
using (deleted_at is null);

drop policy if exists taxonomy_versions_write_master_admin on public.taxonomy_versions;
create policy taxonomy_versions_write_master_admin
on public.taxonomy_versions
for all
to authenticated
using (public.is_master_admin())
with check (public.is_master_admin());

drop policy if exists taxonomy_audit_log_select_master_admin on public.taxonomy_audit_log;
create policy taxonomy_audit_log_select_master_admin
on public.taxonomy_audit_log
for select
to authenticated
using (public.is_master_admin());

drop policy if exists taxonomy_audit_log_insert_master_admin on public.taxonomy_audit_log;
create policy taxonomy_audit_log_insert_master_admin
on public.taxonomy_audit_log
for insert
to authenticated
with check (public.is_master_admin());

drop policy if exists cargo_especialidades_select_authenticated on public.cargo_especialidades;
create policy cargo_especialidades_select_authenticated
on public.cargo_especialidades
for select
to authenticated
using (deleted_at is null and ativo = true);

drop policy if exists cargo_especialidades_write_master_admin on public.cargo_especialidades;
create policy cargo_especialidades_write_master_admin
on public.cargo_especialidades
for all
to authenticated
using (public.is_master_admin())
with check (public.is_master_admin());

drop policy if exists taxonomy_aliases_select_authenticated on public.taxonomy_aliases;
create policy taxonomy_aliases_select_authenticated
on public.taxonomy_aliases
for select
to authenticated
using (deleted_at is null and ativo = true);

drop policy if exists taxonomy_aliases_write_master_admin on public.taxonomy_aliases;
create policy taxonomy_aliases_write_master_admin
on public.taxonomy_aliases
for all
to authenticated
using (public.is_master_admin())
with check (public.is_master_admin());

insert into public.taxonomy_versions (version, status, descricao, origem, metadata, activated_at)
select
  '2.0.0',
  'active',
  'Taxonomia V2 - Etapa 1: fundacao N:N, aliases e auditoria sem expansao de catalogo.',
  'taxonomy_v2_foundation',
  jsonb_build_object(
    'scope', 'etapa_1_foundation',
    'legacy_especialidades_cargo_id', 'preserved_transitional',
    'cargo_especialidades_principal_policy', 'recommendation_ordering_only_never_execution_restriction'
  ),
  now()
where not exists (
  select 1
  from public.taxonomy_versions
  where version = '2.0.0'
);

with valid_v1 as (
  select distinct
    e.cargo_id,
    e.id as especialidade_id
  from public.especialidades e
  join public.cargos c on c.id = e.cargo_id
  where e.cargo_id is not null
    and e.tenant_id is null
    and coalesce(e.is_official, true) = true
    and coalesce(e.is_custom, false) = false
    and e.ativo = true
    and e.deleted_at is null
    and c.ativo = true
    and c.deleted_at is null
    and coalesce(c.categoria_profissional, 'operacional') = 'operacional'
),
inserted as (
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
    v.cargo_id,
    v.especialidade_id,
    true,
    true,
    '2.0.0',
    'migration_v1',
    'Migracao estrutural segura da relacao legado especialidades.cargo_id para matriz oficial N:N.',
    jsonb_build_object(
      'legacy_source', 'especialidades.cargo_id',
      'principal_policy', 'recommendation_ordering_only_never_execution_restriction'
    )
  from valid_v1 v
  where not exists (
    select 1
    from public.cargo_especialidades ce
    where ce.cargo_id = v.cargo_id
      and ce.especialidade_id = v.especialidade_id
      and ce.deleted_at is null
  )
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
  'cargo_especialidades',
  'backfill_v1_to_v2',
  jsonb_build_object('inserted_count', count(i.id)),
  'taxonomy_v2_foundation',
  jsonb_build_object('legacy_source', 'especialidades.cargo_id')
from inserted i
cross join public.taxonomy_versions tv
where tv.version = '2.0.0'
group by tv.id
having count(i.id) > 0;

with aliases(cargo_nome, alias, normalizado, canonical_decision) as (
  values
    ('Cabeleireira', 'Cabeleireiro', 'cabeleireiro', 'Cabeleireira/o'),
    ('Cabeleireira', 'Cabeleireira/o', 'cabeleireira/o', 'Cabeleireira/o'),
    ('Depiladora', 'Depilador', 'depilador', 'Depilador(a)'),
    ('Depiladora', 'Depilador(a)', 'depilador(a)', 'Depilador(a)'),
    ('Maquiadora', 'Maquiador', 'maquiador', 'Maquiador(a)'),
    ('Maquiadora', 'Maquiador(a)', 'maquiador(a)', 'Maquiador(a)'),
    ('Massoterapeuta', 'Massagista', 'massagista', 'Massoterapeuta'),
    ('Podologa', 'Podologo', 'podologo', 'Podologo(a)'),
    ('Podologa', 'Podologo(a)', 'podologo(a)', 'Podologo(a)')
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
    'cargo',
    c.id,
    a.alias,
    'pt-BR',
    a.normalizado,
    true,
    '2.0.0',
    'taxonomy_v2_foundation',
    jsonb_build_object(
      'canonical_decision', a.canonical_decision,
      'current_catalog_name', c.nome,
      'scope', 'alias_only_no_catalog_expansion'
    )
  from aliases a
  join public.cargos c on c.nome = a.cargo_nome
  where c.ativo = true
    and c.deleted_at is null
    and not exists (
      select 1
      from public.taxonomy_aliases ta
      where ta.entidade_tipo = 'cargo'
        and ta.locale = 'pt-BR'
        and ta.normalizado = a.normalizado
        and ta.deleted_at is null
        and ta.ativo = true
    )
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
  'taxonomy_aliases',
  'seed_canonical_role_aliases',
  jsonb_build_object('inserted_count', count(ia.id)),
  'taxonomy_v2_foundation',
  jsonb_build_object('scope', 'aliases_only_no_catalog_expansion')
from inserted_aliases ia
cross join public.taxonomy_versions tv
where tv.version = '2.0.0'
group by tv.id
having count(ia.id) > 0;

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
  'taxonomy_v2_foundation',
  jsonb_build_object('scope', 'etapa_1_foundation')
from public.taxonomy_versions tv
where tv.version = '2.0.0'
  and not exists (
    select 1
    from public.taxonomy_audit_log log
    where log.taxonomy_version_id = tv.id
      and log.entidade_tipo = 'taxonomy_versions'
      and log.acao = 'activate_version'
      and log.origem = 'taxonomy_v2_foundation'
  );

comment on table public.taxonomy_versions is
  'Versions of the official taxonomy. V2 Etapa 1 preserves V1 compatibility and records structural taxonomy releases.';

comment on table public.cargo_especialidades is
  'Official global Cargo x Especialidade N:N matrix. Local tenant custom specialties remain in especialidades with tenant_id and transitional cargo_id.';

comment on column public.cargo_especialidades.principal is
  'Recommendation and ordering hint only. It must never restrict professional execution or service eligibility.';

comment on table public.taxonomy_aliases is
  'Canonical alias registry for taxonomy entities. V2 Etapa 1 stores aliases in a proper table instead of metadata.';

comment on table public.taxonomy_audit_log is
  'Audit trail for global taxonomy changes, including version activation, structural backfills and alias decisions.';
