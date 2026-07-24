-- Persists professional data, specialties, and services in one transaction.
-- The function repeats compatibility checks at the database boundary so
-- partial operational updates cannot be committed.

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
  v_incompatible_service text;
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

    select s.nome
    into v_incompatible_service
    from public.servicos s
    where s.id = any(coalesce(p_servico_ids, array[]::uuid[]))
      and not exists (
        select 1
        from public.servico_especialidades se
        join public.especialidades e
          on e.id = se.especialidade_id
         and e.ativo = true
         and e.deleted_at is null
         and (e.tenant_id is null or e.tenant_id = p_tenant_id)
        where se.tenant_id = p_tenant_id
          and se.servico_id = s.id
          and se.especialidade_id = any(coalesce(p_especialidade_ids, array[]::uuid[]))
          and se.ativo = true
          and se.deleted_at is null
          and e.taxonomy_category_key = coalesce(s.taxonomy_category_key, s.categoria)
      )
    order by s.nome
    limit 1;

    if v_incompatible_service is not null then
      raise exception using
        errcode = '23514',
        message = format(
          'O servico "%s" nao e compativel com as especialidades selecionadas.',
          v_incompatible_service
        );
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
