-- Prepared locally only. Requires explicit approval before remote application.
-- A single transaction serializes public registration and additive token issuance.
begin;
create or replace function public.identify_public_booking_client_v2(
  p_tenant_id uuid, p_link_id uuid, p_telefone text, p_nascimento date,
  p_nome text, p_email text, p_token_hash text, p_expires_at timestamptz,
  p_lookup_only boolean default false,
  p_campaign_key text default null, p_origin text default 'link_agendamento',
  p_session_id text default null, p_metadata jsonb default '{}'::jsonb,
  p_request_fingerprint text default null
) returns jsonb
language plpgsql security definer set search_path = public
as $$
declare
  v_ids uuid[];
  v_client uuid;
  v_birth date;
  v_campaign uuid;
  v_previous public.tokens_cliente%rowtype;
  v_recognized boolean := true;
  v_now timestamptz := now();
begin
  if p_telefone is null or p_telefone !~ '^\+55[1-9][0-9]{9,10}$'
    or p_nascimento is null or p_nascimento > current_date
    or p_token_hash is null or p_token_hash !~ '^[a-f0-9]{64}$'
    or p_expires_at is null or p_expires_at <= v_now then
    raise exception 'CLIENT_MATCH_UNAVAILABLE';
  end if;
  perform pg_advisory_xact_lock(hashtext(p_tenant_id::text), hashtext(p_telefone));
  perform 1 from public.tenants where id=p_tenant_id and ativo and deleted_at is null
    and status in ('ativo','trial') for share;
  if not found then raise exception 'CLIENT_MATCH_UNAVAILABLE'; end if;
  perform 1 from public.links_agendamento where id=p_link_id and tenant_id=p_tenant_id
    and ativo and acesso_publico and deleted_at is null
    and (expira_em is null or expira_em>v_now) for share;
  if not found then raise exception 'CLIENT_MATCH_UNAVAILABLE'; end if;

  -- Lock all matching phone rows, including ineligible rows, before deciding.
  perform 1 from public.clientes c join public.cliente_tenants ct on ct.cliente_id=c.id
    where ct.tenant_id=p_tenant_id and c.telefone=p_telefone for update of c,ct;
  select array_agg(c.id) into v_ids
    from public.clientes c join public.cliente_tenants ct on ct.cliente_id=c.id
    where ct.tenant_id=p_tenant_id and c.telefone=p_telefone
      and c.ativo and c.deleted_at is null and ct.ativo and ct.status='ativo' and ct.deleted_at is null;
  if coalesce(cardinality(v_ids),0)>1 then raise exception 'AMBIGUOUS_CLIENT_MATCH'; end if;
  if coalesce(cardinality(v_ids),0)=1 then
    v_client := v_ids[1];
    select data_nascimento into v_birth from public.clientes where id=v_client;
    if v_birth is null then raise exception 'PHONE_EXISTS_BIRTHDATE_MISSING'; end if;
    if v_birth <> p_nascimento then raise exception 'PHONE_EXISTS_BIRTHDATE_MISMATCH'; end if;
  else
    -- Do not bypass an ineligible existing registration by creating a duplicate.
    if p_lookup_only or exists (
      select 1 from public.clientes c join public.cliente_tenants ct on ct.cliente_id=c.id
        where ct.tenant_id=p_tenant_id and c.telefone=p_telefone
    ) then raise exception 'CLIENT_MATCH_UNAVAILABLE'; end if;
    if p_nome is null or length(trim(p_nome))<2 then raise exception 'CLIENT_MATCH_UNAVAILABLE'; end if;
    insert into public.clientes(nome,telefone,email,data_nascimento,metadata)
      values(trim(p_nome),p_telefone,nullif(lower(trim(p_email)),''),p_nascimento,
        jsonb_build_object('origem_identificacao',p_origin)) returning id into v_client;
    insert into public.cliente_tenants(tenant_id,cliente_id,nome_no_tenant,origem,status,ativo,metadata)
      values(p_tenant_id,v_client,trim(p_nome),p_origin,'ativo',true,
        jsonb_build_object('campanha_primeiro_acesso',p_campaign_key));
    v_recognized := false;
  end if;

  -- Recheck under the same transaction/row locks. Never reactivate or update base profile.
  perform 1 from public.clientes c join public.cliente_tenants ct on ct.cliente_id=c.id
    where c.id=v_client and ct.tenant_id=p_tenant_id and c.ativo and c.deleted_at is null
      and ct.ativo and ct.status='ativo' and ct.deleted_at is null;
  if not found then raise exception 'CLIENT_MATCH_UNAVAILABLE'; end if;
  -- Retry is checked only AFTER identity/eligibility validation, under the phone lock.
  select * into v_previous from public.tokens_cliente where token_hash=p_token_hash for update;
  if found then
    if v_previous.tenant_id<>p_tenant_id or v_previous.cliente_id<>v_client
      or not v_previous.ativo or v_previous.deleted_at is not null or v_previous.expira_em<=v_now
      or v_previous.tipo<>'agendamento_publico'
      or v_previous.metadata->'_identity'->>'fingerprint' is distinct from p_request_fingerprint
      or not (v_previous.metadata ? '_identity') then
      raise exception 'CLIENT_MATCH_UNAVAILABLE';
    end if;
    return jsonb_build_object('client_id',v_client,
      'recognized',(v_previous.metadata->'_identity'->>'recognized')::boolean,
      'expires_at',v_previous.expira_em);
  end if;

  if p_campaign_key is not null then
    select c.id into v_campaign from public.campanhas c
      where c.tenant_id=p_tenant_id and c.ativo and c.deleted_at is null
        and (lower(c.slug)=lower(p_campaign_key) or lower(c.nome)=lower(replace(p_campaign_key,'-',' ')))
      order by c.id limit 1;
  end if;
  insert into public.tokens_cliente(tenant_id,cliente_id,token_hash,tipo,expira_em,origem,metadata)
    values(p_tenant_id,v_client,p_token_hash,'agendamento_publico',p_expires_at,p_origin,
      coalesce(p_metadata,'{}'::jsonb) || jsonb_build_object('_identity',
        jsonb_build_object('recognized',v_recognized,'fingerprint',p_request_fingerprint)));
  update public.cliente_tenants set data_primeiro_acesso=coalesce(data_primeiro_acesso,v_now),
    data_ultimo_acesso=v_now,updated_at=v_now,
    metadata=case when v_recognized then coalesce(metadata,'{}'::jsonb)
      || jsonb_build_object('campanha_ultimo_acesso',p_campaign_key) else metadata end
    where tenant_id=p_tenant_id and cliente_id=v_client;
  insert into public.campanha_acessos(tenant_id,link_agendamento_id,campanha_id,cliente_id,
    campanha_chave,evento,origem,sessao_id,metadata)
    values(p_tenant_id,p_link_id,v_campaign,v_client,p_campaign_key,
      case when v_recognized then 'retorno' else 'identificacao' end,
      p_origin,p_session_id,coalesce(p_metadata,'{}'::jsonb));
  return jsonb_build_object('client_id',v_client,'recognized',v_recognized,'expires_at',p_expires_at);
end;
$$;
revoke all on function public.identify_public_booking_client_v2(uuid,uuid,text,date,text,text,text,timestamptz,boolean,text,text,text,jsonb,text)
  from public, anon, authenticated;
grant execute on function public.identify_public_booking_client_v2(uuid,uuid,text,date,text,text,text,timestamptz,boolean,text,text,text,jsonb,text)
  to service_role;
commit;
