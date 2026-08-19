-- Phase 1 of the service MER refactor.
-- Additive only: creates the new physical foundation without backfill,
-- cleanup, destructive changes, or consumer changes.

create table if not exists public.servicos_catalogo (
  id uuid primary key default gen_random_uuid(),
  codigo_canonico varchar(120) not null,
  nome varchar(150) not null,
  categoria_key varchar(80) not null references public.taxonomia_categorias(key) on delete restrict,
  descricao text,
  natureza varchar(30) not null default 'recorrente',
  ativo boolean not null default true,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint servicos_catalogo_codigo_canonico_unique unique (codigo_canonico),
  constraint servicos_catalogo_natureza_check check (natureza in ('recorrente', 'ocasional'))
);

create index if not exists idx_servicos_catalogo_categoria
  on public.servicos_catalogo (categoria_key);

create index if not exists idx_servicos_catalogo_ativo
  on public.servicos_catalogo (ativo)
  where ativo = true;

drop trigger if exists set_updated_at on public.servicos_catalogo;
create trigger set_updated_at
before update on public.servicos_catalogo
for each row
execute function public.set_updated_at();

alter table public.servicos_catalogo enable row level security;

drop policy if exists servicos_catalogo_select_authenticated on public.servicos_catalogo;
create policy servicos_catalogo_select_authenticated
on public.servicos_catalogo
for select
to authenticated
using (ativo = true);

drop policy if exists servicos_catalogo_insert_master_admin on public.servicos_catalogo;
create policy servicos_catalogo_insert_master_admin
on public.servicos_catalogo
for insert
to authenticated
with check (public.is_master_admin());

drop policy if exists servicos_catalogo_update_master_admin on public.servicos_catalogo;
create policy servicos_catalogo_update_master_admin
on public.servicos_catalogo
for update
to authenticated
using (public.is_master_admin())
with check (public.is_master_admin());

create table if not exists public.servico_tenants (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  servico_catalogo_id uuid not null references public.servicos_catalogo(id) on delete restrict,
  ativo boolean not null default true,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint servico_tenants_unique unique (tenant_id, servico_catalogo_id)
);

create index if not exists idx_servico_tenants_tenant_ativo
  on public.servico_tenants (tenant_id, ativo)
  where ativo = true;

create index if not exists idx_servico_tenants_catalogo
  on public.servico_tenants (servico_catalogo_id);

drop trigger if exists set_updated_at on public.servico_tenants;
create trigger set_updated_at
before update on public.servico_tenants
for each row
execute function public.set_updated_at();

alter table public.servico_tenants enable row level security;

drop policy if exists servico_tenants_select_by_tenant on public.servico_tenants;
create policy servico_tenants_select_by_tenant
on public.servico_tenants
for select
to authenticated
using (public.has_tenant_access(tenant_id));

drop policy if exists servico_tenants_insert_by_tenant on public.servico_tenants;
create policy servico_tenants_insert_by_tenant
on public.servico_tenants
for insert
to authenticated
with check (public.has_tenant_access(tenant_id));

drop policy if exists servico_tenants_update_by_tenant on public.servico_tenants;
create policy servico_tenants_update_by_tenant
on public.servico_tenants
for update
to authenticated
using (public.has_tenant_access(tenant_id))
with check (public.has_tenant_access(tenant_id));

-- The existing public.servico_especialidades table is still tenant-scoped and
-- currently stores transitional commercial fields. To avoid silently reusing a
-- table with incompatible semantics, this phase creates a new explicit
-- technical compatibility table.
create table if not exists public.servico_catalogo_especialidades (
  id uuid primary key default gen_random_uuid(),
  servico_catalogo_id uuid not null references public.servicos_catalogo(id) on delete cascade,
  especialidade_id uuid not null references public.especialidades(id) on delete restrict,
  ativo boolean not null default true,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint servico_catalogo_especialidades_unique unique (servico_catalogo_id, especialidade_id)
);

create index if not exists idx_servico_catalogo_especialidades_catalogo
  on public.servico_catalogo_especialidades (servico_catalogo_id, ativo)
  where ativo = true;

create index if not exists idx_servico_catalogo_especialidades_especialidade
  on public.servico_catalogo_especialidades (especialidade_id, ativo)
  where ativo = true;

drop trigger if exists set_updated_at on public.servico_catalogo_especialidades;
create trigger set_updated_at
before update on public.servico_catalogo_especialidades
for each row
execute function public.set_updated_at();

alter table public.servico_catalogo_especialidades enable row level security;

drop policy if exists servico_catalogo_especialidades_select_authenticated on public.servico_catalogo_especialidades;
create policy servico_catalogo_especialidades_select_authenticated
on public.servico_catalogo_especialidades
for select
to authenticated
using (ativo = true);

drop policy if exists servico_catalogo_especialidades_insert_master_admin on public.servico_catalogo_especialidades;
create policy servico_catalogo_especialidades_insert_master_admin
on public.servico_catalogo_especialidades
for insert
to authenticated
with check (public.is_master_admin());

drop policy if exists servico_catalogo_especialidades_update_master_admin on public.servico_catalogo_especialidades;
create policy servico_catalogo_especialidades_update_master_admin
on public.servico_catalogo_especialidades
for update
to authenticated
using (public.is_master_admin())
with check (public.is_master_admin());

create table if not exists public.servico_tenant_especialidades (
  id uuid primary key default gen_random_uuid(),
  servico_tenant_id uuid not null references public.servico_tenants(id) on delete cascade,
  especialidade_id uuid not null references public.especialidades(id) on delete restrict,
  preco numeric(10,2),
  duracao_minutos integer,
  dias_retorno_recomendado integer,
  aceita_agendamento_online boolean not null default true,
  ativo boolean not null default true,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint servico_tenant_especialidades_unique unique (servico_tenant_id, especialidade_id),
  constraint servico_tenant_especialidades_preco_check check (preco is null or preco >= 0),
  constraint servico_tenant_especialidades_duracao_check check (duracao_minutos is null or duracao_minutos > 0),
  constraint servico_tenant_especialidades_retorno_check check (dias_retorno_recomendado is null or dias_retorno_recomendado > 0)
);

create index if not exists idx_servico_tenant_especialidades_tenant_service
  on public.servico_tenant_especialidades (servico_tenant_id, ativo)
  where ativo = true;

create index if not exists idx_servico_tenant_especialidades_especialidade
  on public.servico_tenant_especialidades (especialidade_id, ativo)
  where ativo = true;

create index if not exists idx_servico_tenant_especialidades_online
  on public.servico_tenant_especialidades (servico_tenant_id, especialidade_id, aceita_agendamento_online)
  where ativo = true;

drop trigger if exists set_updated_at on public.servico_tenant_especialidades;
create trigger set_updated_at
before update on public.servico_tenant_especialidades
for each row
execute function public.set_updated_at();

alter table public.servico_tenant_especialidades enable row level security;

drop policy if exists servico_tenant_especialidades_select_by_tenant on public.servico_tenant_especialidades;
create policy servico_tenant_especialidades_select_by_tenant
on public.servico_tenant_especialidades
for select
to authenticated
using (
  exists (
    select 1
    from public.servico_tenants st
    where st.id = servico_tenant_id
      and public.has_tenant_access(st.tenant_id)
  )
);

drop policy if exists servico_tenant_especialidades_insert_by_tenant on public.servico_tenant_especialidades;
create policy servico_tenant_especialidades_insert_by_tenant
on public.servico_tenant_especialidades
for insert
to authenticated
with check (
  exists (
    select 1
    from public.servico_tenants st
    where st.id = servico_tenant_id
      and public.has_tenant_access(st.tenant_id)
  )
);

drop policy if exists servico_tenant_especialidades_update_by_tenant on public.servico_tenant_especialidades;
create policy servico_tenant_especialidades_update_by_tenant
on public.servico_tenant_especialidades
for update
to authenticated
using (
  exists (
    select 1
    from public.servico_tenants st
    where st.id = servico_tenant_id
      and public.has_tenant_access(st.tenant_id)
  )
)
with check (
  exists (
    select 1
    from public.servico_tenants st
    where st.id = servico_tenant_id
      and public.has_tenant_access(st.tenant_id)
  )
);

comment on table public.servicos_catalogo is
  'Global conceptual service catalog. Does not store tenant-specific price or duration.';

comment on column public.servicos_catalogo.natureza is
  'Service recurrence classification: recorrente or ocasional. Campaign rules must not infer recurrence by name.';

comment on table public.servico_tenants is
  'Tenant offering of a service catalog entry.';

comment on table public.servico_catalogo_especialidades is
  'Technical compatibility between a conceptual service and a specialty. Replaces the future semantic role of servico_especialidades after legacy cleanup.';

comment on table public.servico_tenant_especialidades is
  'Tenant operational/commercial configuration for a service and specialty combination. Future source of truth for price, duration, recommended return and online availability.';

comment on column public.servico_tenant_especialidades.duracao_minutos is
  'Future slot generation must require a valid duration for combinations available for online booking.';

comment on column public.servico_tenant_especialidades.preco is
  'May be null when the business model allows price on request.';

comment on column public.servico_tenant_especialidades.dias_retorno_recomendado is
  'May be null. Future inactive recovery fallback: combination return days, then global configurable fallback of 45 days except explicitly occasional services.';
