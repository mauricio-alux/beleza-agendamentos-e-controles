-- Makes profissional_servicos the only authorization source for scheduling.
-- Cargo and specialties remain organizational/profile attributes.

with professionals_with_cargo as (
  select
    p.id,
    p.tenant_id,
    p.percentual_comissao,
    coalesce(p.cargo_id, fallback_cargo.id) as resolved_cargo_id
  from public.profissionais p
  left join public.cargos fallback_cargo
    on p.cargo_id is null
   and lower(trim(fallback_cargo.nome)) = lower(trim(p.cargo))
   and fallback_cargo.ativo = true
   and fallback_cargo.deleted_at is null
  where p.ativo = true
    and p.deleted_at is null
),
candidate_links as (
  select distinct
    p.tenant_id,
    p.id as profissional_id,
    s.id as servico_id,
    s.duracao_minutos,
    s.preco,
    p.percentual_comissao
  from professionals_with_cargo p
  join public.especialidades e
    on e.cargo_id = p.resolved_cargo_id
   and e.ativo = true
   and e.deleted_at is null
   and (e.tenant_id is null or e.tenant_id = p.tenant_id)
  join public.servico_especialidades se
    on se.tenant_id = p.tenant_id
   and se.especialidade_id = e.id
   and se.ativo = true
   and se.deleted_at is null
  join public.servicos s
    on s.id = se.servico_id
   and s.tenant_id = p.tenant_id
   and s.ativo = true
   and s.deleted_at is null

  union

  select distinct
    p.tenant_id,
    p.id as profissional_id,
    s.id as servico_id,
    s.duracao_minutos,
    s.preco,
    p.percentual_comissao
  from professionals_with_cargo p
  join public.cargos c
    on c.id = p.resolved_cargo_id
   and c.ativo = true
   and c.deleted_at is null
  join public.taxonomia_especialidades te
    on lower(trim(te.cargo_nome)) = lower(trim(c.nome))
   and te.ativo = true
  join public.taxonomia_servico_especialidades tse
    on tse.especialidade_key = te.key
  join public.servicos s
    on s.tenant_id = p.tenant_id
   and s.taxonomy_service_key = tse.servico_key
   and s.ativo = true
   and s.deleted_at is null
)
insert into public.profissional_servicos (
  tenant_id,
  profissional_id,
  servico_id,
  duracao_minutos,
  preco,
  percentual_comissao,
  ativo,
  deleted_at
)
select
  tenant_id,
  profissional_id,
  servico_id,
  duracao_minutos,
  preco,
  percentual_comissao,
  true,
  null
from candidate_links
on conflict (profissional_id, servico_id) do update
set
  tenant_id = excluded.tenant_id,
  duracao_minutos = excluded.duracao_minutos,
  preco = excluded.preco,
  percentual_comissao = excluded.percentual_comissao,
  ativo = true,
  deleted_at = null,
  updated_at = now();

create or replace function public.update_professional_operational_links(
  p_tenant_id uuid,
  p_profissional_id uuid,
  p_professional_patch jsonb default '{}'::jsonb,
  p_replace_specialties boolean default false,
  p_especialidade_ids uuid[] default array[]::uuid[],
  p_replace_services boolean default false,
  p_servico_ids uuid[] default array[]::uuid[],
  p_percentual_comissao numeric default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_cargo_id uuid;
  v_specialty_count integer;
  v_service_count integer;
  v_now timestamptz := now();
begin
  select coalesce(
    nullif(p_professional_patch->>'cargo_id', '')::uuid,
    p.cargo_id
  )
  into v_cargo_id
  from public.profissionais p
  where p.id = p_profissional_id
    and p.tenant_id = p_tenant_id
    and p.deleted_at is null
  for update;

  if not found then
    raise exception using
      errcode = 'P0002',
      message = 'Profissional nao encontrado.';
  end if;

  if p_replace_specialties then
    select count(distinct e.id)
    into v_specialty_count
    from public.especialidades e
    where e.id = any(coalesce(p_especialidade_ids, array[]::uuid[]))
      and e.cargo_id = v_cargo_id
      and e.ativo = true
      and e.deleted_at is null
      and (e.tenant_id is null or e.tenant_id = p_tenant_id)
      and not exists (
        select 1
        from public.tenant_especialidades te
        where te.tenant_id = p_tenant_id
          and te.especialidade_id = e.id
          and te.ativo = false
          and te.deleted_at is null
      );

    if v_specialty_count <> cardinality(coalesce(p_especialidade_ids, array[]::uuid[])) then
      raise exception using
        errcode = '23514',
        message = 'Uma ou mais especialidades sao invalidas ou incompativeis com o cargo.';
    end if;
  end if;

  if p_replace_services then
    select count(distinct s.id)
    into v_service_count
    from public.servicos s
    where s.id = any(coalesce(p_servico_ids, array[]::uuid[]))
      and s.tenant_id = p_tenant_id
      and s.ativo = true
      and s.deleted_at is null;

    if v_service_count <> cardinality(coalesce(p_servico_ids, array[]::uuid[])) then
      raise exception using
        errcode = '23514',
        message = 'Um ou mais servicos sao invalidos.';
    end if;
  end if;

  update public.profissionais p
  set
    nome_publico = case
      when p_professional_patch ? 'nome_publico'
        then p_professional_patch->>'nome_publico'
      else p.nome_publico
    end,
    cargo_id = case
      when p_professional_patch ? 'cargo_id'
        then nullif(p_professional_patch->>'cargo_id', '')::uuid
      else p.cargo_id
    end,
    cargo = case
      when p_professional_patch ? 'cargo'
        then nullif(p_professional_patch->>'cargo', '')
      else p.cargo
    end,
    especialidade = case
      when p_professional_patch ? 'especialidade'
        then nullif(p_professional_patch->>'especialidade', '')
      else p.especialidade
    end,
    percentual_comissao = case
      when p_professional_patch ? 'percentual_comissao'
        then (p_professional_patch->>'percentual_comissao')::numeric
      else p.percentual_comissao
    end,
    ativo = case
      when p_professional_patch ? 'ativo'
        then (p_professional_patch->>'ativo')::boolean
      else p.ativo
    end,
    aceita_agendamento_online = case
      when p_professional_patch ? 'aceita_agendamento_online'
        then (p_professional_patch->>'aceita_agendamento_online')::boolean
      else p.aceita_agendamento_online
    end,
    instagram = case
      when p_professional_patch ? 'instagram'
        then nullif(p_professional_patch->>'instagram', '')
      else p.instagram
    end,
    bio = case
      when p_professional_patch ? 'bio'
        then nullif(p_professional_patch->>'bio', '')
      else p.bio
    end,
    metadata = case
      when p_professional_patch ? 'metadata'
        then coalesce(p_professional_patch->'metadata', '{}'::jsonb)
      else p.metadata
    end,
    updated_at = v_now
  where p.id = p_profissional_id
    and p.tenant_id = p_tenant_id
    and p.deleted_at is null;

  if p_replace_specialties then
    update public.profissional_especialidades pe
    set
      ativo = false,
      deleted_at = v_now
    where pe.tenant_id = p_tenant_id
      and pe.profissional_id = p_profissional_id
      and pe.deleted_at is null;

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
      specialty_id,
      true,
      null
    from unnest(coalesce(p_especialidade_ids, array[]::uuid[])) specialty_id;
  end if;

  if p_replace_services then
    update public.profissional_servicos ps
    set
      ativo = false,
      deleted_at = v_now
    where ps.tenant_id = p_tenant_id
      and ps.profissional_id = p_profissional_id
      and ps.deleted_at is null;

    insert into public.profissional_servicos (
      tenant_id,
      profissional_id,
      servico_id,
      duracao_minutos,
      preco,
      percentual_comissao,
      ativo,
      deleted_at
    )
    select
      p_tenant_id,
      p_profissional_id,
      s.id,
      s.duracao_minutos,
      s.preco,
      p_percentual_comissao,
      true,
      null
    from public.servicos s
    where s.tenant_id = p_tenant_id
      and s.id = any(coalesce(p_servico_ids, array[]::uuid[]))
      and s.ativo = true
      and s.deleted_at is null
    on conflict (profissional_id, servico_id) do update
    set
      tenant_id = excluded.tenant_id,
      duracao_minutos = excluded.duracao_minutos,
      preco = excluded.preco,
      percentual_comissao = excluded.percentual_comissao,
      ativo = true,
      deleted_at = null,
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
) to service_role;
