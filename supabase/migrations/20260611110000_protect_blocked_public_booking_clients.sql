-- Prevents public identification from reactivating a client explicitly blocked
-- by the tenant.

create or replace function public.identify_public_booking_client(
  p_tenant_id uuid,
  p_nome varchar,
  p_telefone varchar,
  p_email varchar,
  p_token_hash text,
  p_token_expires_at timestamptz,
  p_campaign_key varchar default null,
  p_origin varchar default 'link_agendamento',
  p_link_agendamento_id uuid default null,
  p_session_id varchar default null,
  p_metadata jsonb default '{}'::jsonb
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_cliente_id uuid;
  v_client_status varchar;
  v_campaign_id uuid;
  v_is_returning boolean := false;
  v_now timestamptz := now();
begin
  select c.id, ct.status
  into v_cliente_id, v_client_status
  from public.clientes c
  join public.cliente_tenants ct
    on ct.cliente_id = c.id
   and ct.tenant_id = p_tenant_id
   and ct.deleted_at is null
  where c.telefone = p_telefone
    and c.deleted_at is null
  order by ct.created_at
  limit 1
  for update of c, ct;

  if v_client_status = 'bloqueado' then
    raise exception 'CLIENT_IDENTITY_UNAVAILABLE';
  end if;

  if v_cliente_id is null then
    insert into public.clientes (nome, telefone, email, metadata)
    values (
      p_nome,
      p_telefone,
      nullif(lower(trim(p_email)), ''),
      jsonb_build_object('origem_identificacao', p_origin)
    )
    returning id into v_cliente_id;

    insert into public.cliente_tenants (
      tenant_id,
      cliente_id,
      nome_no_tenant,
      origem,
      data_primeiro_acesso,
      data_ultimo_acesso,
      metadata
    )
    values (
      p_tenant_id,
      v_cliente_id,
      p_nome,
      p_origin,
      v_now,
      v_now,
      jsonb_build_object('campanha_primeiro_acesso', p_campaign_key)
    );
  else
    v_is_returning := true;

    update public.clientes
    set
      nome = coalesce(nullif(trim(p_nome), ''), nome),
      email = coalesce(nullif(lower(trim(p_email)), ''), email),
      updated_at = v_now
    where id = v_cliente_id;

    update public.cliente_tenants
    set
      nome_no_tenant = coalesce(nullif(trim(p_nome), ''), nome_no_tenant),
      data_primeiro_acesso = coalesce(data_primeiro_acesso, v_now),
      data_ultimo_acesso = v_now,
      status = 'ativo',
      ativo = true,
      updated_at = v_now,
      metadata = coalesce(metadata, '{}'::jsonb)
        || jsonb_build_object('campanha_ultimo_acesso', p_campaign_key)
    where tenant_id = p_tenant_id
      and cliente_id = v_cliente_id
      and deleted_at is null;
  end if;

  update public.tokens_cliente
  set
    ativo = false,
    deleted_at = v_now,
    updated_at = v_now
  where tenant_id = p_tenant_id
    and cliente_id = v_cliente_id
    and tipo = 'agendamento_publico'
    and ativo = true
    and deleted_at is null;

  insert into public.tokens_cliente (
    tenant_id,
    cliente_id,
    token_hash,
    tipo,
    expira_em,
    origem,
    metadata
  )
  values (
    p_tenant_id,
    v_cliente_id,
    p_token_hash,
    'agendamento_publico',
    p_token_expires_at,
    p_origin,
    coalesce(p_metadata, '{}'::jsonb)
  );

  if p_campaign_key is not null then
    select c.id
    into v_campaign_id
    from public.campanhas c
    where c.tenant_id = p_tenant_id
      and c.ativo = true
      and c.deleted_at is null
      and (
        lower(c.slug) = lower(p_campaign_key)
        or lower(c.nome) = lower(replace(p_campaign_key, '-', ' '))
      )
    limit 1;
  end if;

  insert into public.campanha_acessos (
    tenant_id,
    link_agendamento_id,
    campanha_id,
    cliente_id,
    campanha_chave,
    evento,
    origem,
    sessao_id,
    metadata
  )
  values (
    p_tenant_id,
    p_link_agendamento_id,
    v_campaign_id,
    v_cliente_id,
    p_campaign_key,
    case when v_is_returning then 'retorno' else 'identificacao' end,
    p_origin,
    p_session_id,
    coalesce(p_metadata, '{}'::jsonb)
  );

  return v_cliente_id;
end;
$$;
