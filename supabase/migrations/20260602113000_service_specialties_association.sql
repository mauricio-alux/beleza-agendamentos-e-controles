-- Explicit tenant-scoped association between services and specialties.
-- This replaces name/category inference as the primary compatibility source.

create table if not exists public.servico_especialidades (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  servico_id uuid not null references public.servicos(id) on delete cascade,
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
    where conname = 'servico_especialidades_unique'
  ) then
    alter table public.servico_especialidades
      add constraint servico_especialidades_unique unique (tenant_id, servico_id, especialidade_id);
  end if;
end $$;

create index if not exists idx_servico_especialidades_tenant
  on public.servico_especialidades (tenant_id, ativo)
  where deleted_at is null;

create index if not exists idx_servico_especialidades_servico
  on public.servico_especialidades (tenant_id, servico_id)
  where deleted_at is null;

create index if not exists idx_servico_especialidades_especialidade
  on public.servico_especialidades (tenant_id, especialidade_id)
  where deleted_at is null;

drop trigger if exists set_updated_at on public.servico_especialidades;
create trigger set_updated_at
before update on public.servico_especialidades
for each row
execute function public.set_updated_at();

alter table public.servico_especialidades enable row level security;

drop policy if exists servico_especialidades_select_by_tenant on public.servico_especialidades;
create policy servico_especialidades_select_by_tenant
on public.servico_especialidades
for select
to authenticated
using (deleted_at is null and public.has_tenant_access(tenant_id));

drop policy if exists servico_especialidades_insert_by_tenant on public.servico_especialidades;
create policy servico_especialidades_insert_by_tenant
on public.servico_especialidades
for insert
to authenticated
with check (public.has_tenant_access(tenant_id));

drop policy if exists servico_especialidades_update_by_tenant on public.servico_especialidades;
create policy servico_especialidades_update_by_tenant
on public.servico_especialidades
for update
to authenticated
using (deleted_at is null and public.has_tenant_access(tenant_id))
with check (public.has_tenant_access(tenant_id));

-- Transitional seed: creates initial explicit links using the previous
-- compatibility conventions. It is additive and keeps tenant data intact.
insert into public.servico_especialidades (tenant_id, servico_id, especialidade_id)
select s.tenant_id, s.id, e.id
from public.servicos s
join public.especialidades e on e.ativo = true and e.deleted_at is null
join public.cargos c on c.id = e.cargo_id and c.ativo = true and c.deleted_at is null
where s.ativo = true
  and s.deleted_at is null
  and (
    (
      lower(e.nome) like '%corte%'
      and (
        lower(s.nome) like '%corte%'
        or lower(coalesce(s.categoria, '')) = 'cabelo'
      )
    )
    or (
      lower(e.nome) like '%escova%'
      and lower(s.nome) like '%escova%'
    )
    or (
      (lower(e.nome) like '%color%' or lower(e.nome) like '%tint%')
      and (
        lower(s.nome) like '%color%'
        or lower(s.nome) like '%tint%'
        or lower(coalesce(s.categoria, '')) = 'tintura_coloracao'
      )
    )
    or (
      (lower(e.nome) like '%luzes%' or lower(e.nome) like '%mecha%')
      and (
        lower(s.nome) like '%luzes%'
        or lower(s.nome) like '%mecha%'
      )
    )
    or (
      (lower(e.nome) like '%progressiva%' or lower(e.nome) like '%alis%')
      and (
        lower(s.nome) like '%progressiva%'
        or lower(s.nome) like '%alis%'
      )
    )
    or (
      lower(e.nome) like '%hidrata%'
      and (
        lower(s.nome) like '%hidrata%'
        or lower(coalesce(s.categoria, '')) = 'tratamento'
      )
    )
    or (
      lower(e.nome) like '%manicure%'
      and (
        lower(s.nome) like '%manicure%'
        or lower(coalesce(s.categoria, '')) = 'manicure'
      )
    )
    or (
      lower(e.nome) like '%pedicure%'
      and (
        lower(s.nome) like '%pedicure%'
        or lower(coalesce(s.categoria, '')) = 'pedicure'
      )
    )
    or (
      lower(e.nome) like '%fibra%'
      and lower(s.nome) like '%fibra%'
    )
    or (
      lower(e.nome) like '%gel%'
      and lower(s.nome) like '%gel%'
    )
    or (
      lower(e.nome) like '%blindagem%'
      and lower(s.nome) like '%blindagem%'
    )
    or (
      (lower(e.nome) like '%nail%' or lower(e.nome) like '%unha%')
      and (
        lower(s.nome) like '%nail%'
        or lower(s.nome) like '%unha%'
        or lower(s.nome) like '%manicure%'
        or lower(s.nome) like '%pedicure%'
      )
    )
    or (
      lower(e.nome) like '%barba%'
      and (
        lower(s.nome) like '%barba%'
        or lower(coalesce(s.categoria, '')) = 'barba'
      )
    )
    or (
      lower(e.nome) like '%maqui%'
      and (
        lower(s.nome) like '%maqui%'
        or lower(coalesce(s.categoria, '')) = 'maquiagem'
      )
    )
    or (
      lower(e.nome) like '%sobrancelha%'
      and (
        lower(s.nome) like '%sobrancelha%'
        or lower(coalesce(s.categoria, '')) = 'sobrancelha'
      )
    )
    or (
      (lower(e.nome) like '%cilio%' or lower(e.nome) like '%lash%')
      and (
        lower(s.nome) like '%cilio%'
        or lower(s.nome) like '%lash%'
        or lower(coalesce(s.categoria, '')) = 'cilios'
      )
    )
    or (
      lower(e.nome) like '%depil%'
      and (
        lower(s.nome) like '%depil%'
        or lower(coalesce(s.categoria, '')) = 'depilacao'
      )
    )
    or (
      (lower(e.nome) like '%relax%' or lower(e.nome) like '%terapeut%' or lower(e.nome) like '%drenagem%')
      and (
        lower(s.nome) like '%massagem%'
        or lower(s.nome) like '%relax%'
        or lower(s.nome) like '%terapeut%'
        or lower(s.nome) like '%drenagem%'
        or lower(coalesce(s.categoria, '')) in ('massagem', 'estetica')
      )
    )
    or (
      lower(e.nome) like '%limpeza de pele%'
      and (
        lower(s.nome) like '%limpeza%'
        or lower(s.nome) like '%pele%'
        or lower(coalesce(s.categoria, '')) = 'estetica'
      )
    )
  )
on conflict do nothing;
