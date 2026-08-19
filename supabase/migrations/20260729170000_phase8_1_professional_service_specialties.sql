-- Bellory - Fase 8.1: relacao final Profissional x Servico x Especialidade.
-- Migration exclusivamente aditiva. Nao remove tabelas legadas.

create table if not exists public.profissional_servico_especialidades (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  profissional_id uuid not null references public.profissionais(id) on delete cascade,
  servico_tenant_especialidade_id uuid not null references public.servico_tenant_especialidades(id) on delete cascade,
  ativo boolean not null default true,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  constraint profissional_servico_especialidades_unique unique (
    profissional_id,
    servico_tenant_especialidade_id
  )
);

create index if not exists idx_prof_servico_especialidades_tenant_profissional
  on public.profissional_servico_especialidades (tenant_id, profissional_id)
  where deleted_at is null;

create index if not exists idx_prof_servico_especialidades_combinacao
  on public.profissional_servico_especialidades (servico_tenant_especialidade_id, ativo)
  where deleted_at is null;

drop trigger if exists set_updated_at on public.profissional_servico_especialidades;
create trigger set_updated_at
before update on public.profissional_servico_especialidades
for each row
execute function public.set_updated_at();

alter table public.profissional_servico_especialidades enable row level security;

drop policy if exists profissional_servico_especialidades_select_by_tenant
  on public.profissional_servico_especialidades;
create policy profissional_servico_especialidades_select_by_tenant
on public.profissional_servico_especialidades
for select
to authenticated
using (public.has_tenant_access(tenant_id));

drop policy if exists profissional_servico_especialidades_insert_by_tenant
  on public.profissional_servico_especialidades;
create policy profissional_servico_especialidades_insert_by_tenant
on public.profissional_servico_especialidades
for insert
to authenticated
with check (public.has_tenant_access(tenant_id));

drop policy if exists profissional_servico_especialidades_update_by_tenant
  on public.profissional_servico_especialidades;
create policy profissional_servico_especialidades_update_by_tenant
on public.profissional_servico_especialidades
for update
to authenticated
using (public.has_tenant_access(tenant_id))
with check (public.has_tenant_access(tenant_id));

insert into public.profissional_servico_especialidades (
  tenant_id,
  profissional_id,
  servico_tenant_especialidade_id,
  ativo,
  metadata,
  deleted_at
)
select distinct
  ps.tenant_id,
  ps.profissional_id,
  ste.id,
  ps.ativo and ste.ativo,
  jsonb_build_object(
    'origem', 'fase_8_1_backfill_profissional_servicos',
    'profissional_servico_legado_id', ps.id,
    'servico_legado_id', ps.servico_id
  ),
  case when ps.deleted_at is null and ste.ativo then null else coalesce(ps.deleted_at, now()) end
from public.profissional_servicos ps
join public.servico_tenants st
  on st.tenant_id = ps.tenant_id
 and st.metadata->'legacy_servico_ids' ? ps.servico_id::text
join public.servico_tenant_especialidades ste
  on ste.servico_tenant_id = st.id
join public.profissional_especialidades pe
  on pe.tenant_id = ps.tenant_id
 and pe.profissional_id = ps.profissional_id
 and pe.especialidade_id = ste.especialidade_id
 and pe.deleted_at is null
 and pe.ativo is not false
where ps.servico_id is not null
on conflict (profissional_id, servico_tenant_especialidade_id) do update
  set ativo = excluded.ativo,
      deleted_at = excluded.deleted_at,
      metadata = profissional_servico_especialidades.metadata || excluded.metadata,
      updated_at = now();

create or replace function public.update_professional_operational_links(
  p_tenant_id uuid,
  p_profissional_id uuid,
  p_professional_patch jsonb default '{}'::jsonb,
  p_replace_specialties boolean default false,
  p_especialidade_ids uuid[] default '{}',
  p_replace_services boolean default false,
  p_servico_ids uuid[] default '{}',
  p_percentual_comissao numeric default null
) returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_profissional record;
  v_now timestamptz := now();
  v_specialty_ids uuid[] := coalesce(p_especialidade_ids, '{}');
  v_service_ids uuid[] := coalesce(p_servico_ids, '{}');
begin
  select id, tenant_id
    into v_profissional
  from public.profissionais
  where id = p_profissional_id
    and tenant_id = p_tenant_id
    and deleted_at is null
  for update;

  if not found then
    raise exception 'Profissional nao encontrado.'
      using errcode = 'P0002';
  end if;

  if p_professional_patch is not null and p_professional_patch <> '{}'::jsonb then
    update public.profissionais
       set nome_publico = coalesce(p_professional_patch->>'nome_publico', nome_publico),
           cargo_id = coalesce((p_professional_patch->>'cargo_id')::uuid, cargo_id),
           cargo = coalesce(p_professional_patch->>'cargo', cargo),
           percentual_comissao = coalesce((p_professional_patch->>'percentual_comissao')::numeric, percentual_comissao),
           ativo = coalesce((p_professional_patch->>'ativo')::boolean, ativo),
           aceita_agendamento_online = coalesce((p_professional_patch->>'aceita_agendamento_online')::boolean, aceita_agendamento_online),
           instagram = case when p_professional_patch ? 'instagram' then nullif(p_professional_patch->>'instagram', '') else instagram end,
           bio = case when p_professional_patch ? 'bio' then nullif(p_professional_patch->>'bio', '') else bio end,
           especialidade = case when p_professional_patch ? 'especialidade' then nullif(p_professional_patch->>'especialidade', '') else especialidade end,
           metadata = case
             when p_professional_patch ? 'metadata' then coalesce(metadata, '{}'::jsonb) || coalesce(p_professional_patch->'metadata', '{}'::jsonb)
             else metadata
           end,
           updated_at = v_now
     where id = p_profissional_id
       and tenant_id = p_tenant_id;
  end if;

  if p_replace_specialties then
    update public.profissional_especialidades
       set ativo = false,
           deleted_at = v_now,
           updated_at = v_now
     where tenant_id = p_tenant_id
       and profissional_id = p_profissional_id
       and deleted_at is null
       and not (especialidade_id = any(v_specialty_ids));

    insert into public.profissional_especialidades (
      tenant_id,
      profissional_id,
      especialidade_id,
      ativo,
      deleted_at
    )
    select
      p_tenant_id,
      p_profissional_id,
      e.id,
      true,
      null
    from public.especialidades e
    where e.id = any(v_specialty_ids)
      and e.deleted_at is null
      and e.ativo is not false
      and (e.tenant_id is null or e.tenant_id = p_tenant_id)
    on conflict (profissional_id, especialidade_id) do update
      set ativo = true,
          deleted_at = null,
          updated_at = v_now;
  end if;

  if p_replace_services then
    update public.profissional_servico_especialidades pse
       set ativo = false,
           deleted_at = v_now,
           updated_at = v_now
     where pse.tenant_id = p_tenant_id
       and pse.profissional_id = p_profissional_id
       and pse.deleted_at is null;

    insert into public.profissional_servico_especialidades (
      tenant_id,
      profissional_id,
      servico_tenant_especialidade_id,
      ativo,
      metadata,
      deleted_at
    )
    select distinct
      p_tenant_id,
      p_profissional_id,
      ste.id,
      true,
      jsonb_build_object(
        'origem', 'update_professional_operational_links',
        'percentual_comissao', p_percentual_comissao
      ),
      null
    from public.servico_tenant_especialidades ste
    join public.servico_tenants st
      on st.id = ste.servico_tenant_id
     and st.tenant_id = p_tenant_id
     and st.ativo is not false
    where ste.ativo is not false
      and ste.servico_tenant_id = any(v_service_ids)
      and (
        cardinality(v_specialty_ids) = 0
        or ste.especialidade_id = any(v_specialty_ids)
      )
    on conflict (profissional_id, servico_tenant_especialidade_id) do update
      set ativo = true,
          deleted_at = null,
          metadata = profissional_servico_especialidades.metadata || excluded.metadata,
          updated_at = v_now;
  end if;
end;
$$;

revoke all on function public.update_professional_operational_links(
  uuid,
  uuid,
  jsonb,
  boolean,
  uuid[],
  boolean,
  uuid[],
  numeric
) from public;

grant execute on function public.update_professional_operational_links(
  uuid,
  uuid,
  jsonb,
  boolean,
  uuid[],
  boolean,
  uuid[],
  numeric
) to authenticated, service_role;

comment on table public.profissional_servico_especialidades is
  'Relacao final da Fase 8.1: profissional autorizado a executar uma combinacao servico_tenant_especialidade.';
