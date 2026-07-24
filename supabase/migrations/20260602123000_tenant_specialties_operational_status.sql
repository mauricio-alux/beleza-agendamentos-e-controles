-- Tenant-scoped operational status for global specialties.
-- Cargos and especialidades remain structural catalogs; tenants can enable or
-- disable their operational use without changing the global taxonomy.

create table if not exists public.tenant_especialidades (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  especialidade_id uuid not null references public.especialidades(id) on delete restrict,
  ativo boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'tenant_especialidades_unique'
  ) then
    alter table public.tenant_especialidades
      add constraint tenant_especialidades_unique unique (tenant_id, especialidade_id);
  end if;
end $$;

create index if not exists idx_tenant_especialidades_tenant
  on public.tenant_especialidades (tenant_id, ativo)
  where deleted_at is null;

create index if not exists idx_tenant_especialidades_especialidade
  on public.tenant_especialidades (tenant_id, especialidade_id)
  where deleted_at is null;

drop trigger if exists set_updated_at on public.tenant_especialidades;
create trigger set_updated_at
before update on public.tenant_especialidades
for each row
execute function public.set_updated_at();

alter table public.tenant_especialidades enable row level security;

drop policy if exists tenant_especialidades_select_by_tenant on public.tenant_especialidades;
create policy tenant_especialidades_select_by_tenant
on public.tenant_especialidades
for select
to authenticated
using (deleted_at is null and public.has_tenant_access(tenant_id));

drop policy if exists tenant_especialidades_insert_by_tenant on public.tenant_especialidades;
create policy tenant_especialidades_insert_by_tenant
on public.tenant_especialidades
for insert
to authenticated
with check (public.has_tenant_access(tenant_id));

drop policy if exists tenant_especialidades_update_by_tenant on public.tenant_especialidades;
create policy tenant_especialidades_update_by_tenant
on public.tenant_especialidades
for update
to authenticated
using (deleted_at is null and public.has_tenant_access(tenant_id))
with check (public.has_tenant_access(tenant_id));
