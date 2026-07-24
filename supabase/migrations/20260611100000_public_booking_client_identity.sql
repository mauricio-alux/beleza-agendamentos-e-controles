-- Adds progressive public-booking identity, campaign attribution, and
-- reusable tenant-scoped tokens. Raw tokens are never persisted.

alter table public.cliente_tenants
  add column if not exists data_primeiro_acesso timestamptz,
  add column if not exists data_ultimo_acesso timestamptz;

alter table public.tokens_cliente
  add column if not exists origem varchar(50),
  add column if not exists metadata jsonb not null default '{}'::jsonb;

alter table public.tokens_cliente
  drop constraint if exists tokens_cliente_tipo_check;

alter table public.tokens_cliente
  add constraint tokens_cliente_tipo_check check (
    tipo in (
      'link_magico',
      'confirmacao',
      'cancelamento',
      'dashboard_cliente',
      'agendamento_publico'
    )
  );

drop index if exists idx_tokens_cliente_token_hash;
create unique index if not exists idx_tokens_cliente_token_hash_unique
  on public.tokens_cliente (token_hash)
  where deleted_at is null;

create index if not exists idx_tokens_cliente_tenant_cliente
  on public.tokens_cliente (tenant_id, cliente_id, expira_em)
  where ativo = true and deleted_at is null;

alter table public.campanhas
  add column if not exists slug varchar(120);

create unique index if not exists idx_campanhas_tenant_slug_unique
  on public.campanhas (tenant_id, lower(slug))
  where slug is not null and deleted_at is null;

create table if not exists public.campanha_acessos (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  link_agendamento_id uuid references public.links_agendamento(id) on delete set null,
  campanha_id uuid references public.campanhas(id) on delete set null,
  cliente_id uuid references public.clientes(id) on delete set null,
  agendamento_id uuid references public.agendamentos(id) on delete set null,
  campanha_chave varchar(150),
  evento varchar(30) not null,
  origem varchar(50),
  sessao_id varchar(120),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  constraint campanha_acessos_evento_check check (
    evento in ('acesso', 'identificacao', 'retorno', 'agendamento')
  )
);

create index if not exists idx_campanha_acessos_tenant_created
  on public.campanha_acessos (tenant_id, created_at desc);

create index if not exists idx_campanha_acessos_campanha
  on public.campanha_acessos (tenant_id, campanha_id, created_at desc);

create index if not exists idx_campanha_acessos_cliente
  on public.campanha_acessos (tenant_id, cliente_id, created_at desc);

alter table public.campanha_acessos enable row level security;

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
  v_campaign_id uuid;
  v_is_returning boolean := false;
  v_now timestamptz := now();
begin
  select c.id
  into v_cliente_id
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

revoke all on function public.identify_public_booking_client(
  uuid,
  varchar,
  varchar,
  varchar,
  text,
  timestamptz,
  varchar,
  varchar,
  uuid,
  varchar,
  jsonb
) from public;

grant execute on function public.identify_public_booking_client(
  uuid,
  varchar,
  varchar,
  varchar,
  text,
  timestamptz,
  varchar,
  varchar,
  uuid,
  varchar,
  jsonb
) to service_role;
