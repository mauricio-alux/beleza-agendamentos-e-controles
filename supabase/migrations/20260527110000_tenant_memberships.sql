-- Membership-based user architecture.
-- Users are global identities; tenant access is represented by tenant_memberships.

create table if not exists public.tenant_memberships (
  id uuid primary key default gen_random_uuid(),
  usuario_id uuid not null references public.usuarios(id) on delete cascade,
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  role varchar(30) not null,
  status varchar(30) not null default 'ativo',
  profissional_id uuid references public.profissionais(id) on delete set null,
  is_primary boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint tenant_memberships_role_check check (
    role in ('Administrador', 'Autonomo', 'Funcionario', 'Terceiro', 'Cliente')
  ),
  constraint tenant_memberships_status_check check (
    status in ('ativo', 'inativo', 'bloqueado', 'pendente')
  ),
  constraint tenant_memberships_unique unique (usuario_id, tenant_id)
);

create unique index if not exists tenant_memberships_one_primary_per_user
  on public.tenant_memberships (usuario_id)
  where is_primary = true and status = 'ativo';

create index if not exists idx_tenant_memberships_usuario
  on public.tenant_memberships (usuario_id);

create index if not exists idx_tenant_memberships_tenant
  on public.tenant_memberships (tenant_id);

create index if not exists idx_tenant_memberships_role
  on public.tenant_memberships (tenant_id, role);

insert into public.tenant_memberships (
  usuario_id,
  tenant_id,
  role,
  status,
  profissional_id,
  is_primary,
  created_at,
  updated_at
)
select
  u.id,
  u.tenant_id,
  case
    when u.tipo_usuario = 'MasterAdmin' then 'Administrador'
    else u.tipo_usuario
  end as role,
  case when u.ativo then 'ativo' else 'inativo' end as status,
  p.id as profissional_id,
  true as is_primary,
  coalesce(u.created_at, now()),
  now()
from public.usuarios u
left join public.profissionais p
  on p.usuario_id = u.id
  and p.tenant_id = u.tenant_id
  and p.deleted_at is null
where u.tenant_id is not null
  and u.deleted_at is null
  and u.tipo_usuario <> 'MasterAdmin'
on conflict (usuario_id, tenant_id) do update
set
  role = excluded.role,
  status = excluded.status,
  profissional_id = coalesce(public.tenant_memberships.profissional_id, excluded.profissional_id),
  is_primary = public.tenant_memberships.is_primary or excluded.is_primary,
  updated_at = now();

create or replace function public.current_tenant_id()
returns uuid
language sql
stable
security definer
set search_path = public, auth
as $$
  select tm.tenant_id
  from public.usuarios u
  join public.tenant_memberships tm on tm.usuario_id = u.id
  where u.auth_user_id = auth.uid()
    and u.ativo = true
    and u.deleted_at is null
    and tm.status = 'ativo'
  order by tm.is_primary desc, tm.created_at asc
  limit 1
$$;

create or replace function public.current_tipo_usuario()
returns text
language sql
stable
security definer
set search_path = public, auth
as $$
  select
    case
      when u.tipo_usuario = 'MasterAdmin' then 'MasterAdmin'
      else coalesce(tm.role, u.tipo_usuario)
    end
  from public.usuarios u
  left join public.tenant_memberships tm
    on tm.usuario_id = u.id
    and tm.status = 'ativo'
  where u.auth_user_id = auth.uid()
    and u.ativo = true
    and u.deleted_at is null
  order by tm.is_primary desc nulls last, tm.created_at asc nulls last
  limit 1
$$;

alter table public.tenant_memberships enable row level security;

drop policy if exists tenant_memberships_select_by_access on public.tenant_memberships;
create policy tenant_memberships_select_by_access
on public.tenant_memberships
for select
to authenticated
using (
  public.is_master_admin()
  or usuario_id = public.current_usuario_id()
  or public.has_tenant_access(tenant_id)
);

drop policy if exists tenant_memberships_insert_by_access on public.tenant_memberships;
create policy tenant_memberships_insert_by_access
on public.tenant_memberships
for insert
to authenticated
with check (
  public.is_master_admin()
  or public.has_tenant_access(tenant_id)
);

drop policy if exists tenant_memberships_update_by_access on public.tenant_memberships;
create policy tenant_memberships_update_by_access
on public.tenant_memberships
for update
to authenticated
using (
  public.is_master_admin()
  or public.has_tenant_access(tenant_id)
)
with check (
  public.is_master_admin()
  or public.has_tenant_access(tenant_id)
);
