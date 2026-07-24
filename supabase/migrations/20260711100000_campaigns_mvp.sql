-- Campaigns MVP: tenant campaigns over the centralized WhatsApp queue.

alter table public.campanhas
  drop constraint if exists campanhas_status_check;

alter table public.campanhas
  add constraint campanhas_status_check check (
    status in (
      'rascunho',
      'validando',
      'pronta',
      'agendada',
      'gerando_mensagens',
      'em_processamento',
      'pausada',
      'concluida',
      'cancelada',
      'falhou'
    )
  );

alter table public.campanhas
  add column if not exists template_id uuid references public.templates_mensagem(id) on delete set null,
  add column if not exists criterios_segmentacao jsonb not null default '{}'::jsonb,
  add column if not exists parametros_template jsonb not null default '{}'::jsonb,
  add column if not exists agendada_para timestamptz,
  add column if not exists iniciada_em timestamptz,
  add column if not exists concluida_em timestamptz,
  add column if not exists cancelada_em timestamptz,
  add column if not exists total_destinatarios integer not null default 0,
  add column if not exists total_geradas integer not null default 0,
  add column if not exists total_processadas integer not null default 0,
  add column if not exists total_enviadas integer not null default 0,
  add column if not exists total_entregues integer not null default 0,
  add column if not exists total_lidas integer not null default 0,
  add column if not exists total_falhas integer not null default 0,
  add column if not exists total_canceladas integer not null default 0,
  add column if not exists criado_por uuid references public.usuarios(id) on delete set null,
  add column if not exists tracking_token text;

update public.campanhas
set criterios_segmentacao = coalesce(nullif(criterios_segmentacao, '{}'::jsonb), publico_alvo, '{}'::jsonb)
where criterios_segmentacao = '{}'::jsonb
  and publico_alvo <> '{}'::jsonb;

create unique index if not exists idx_campanhas_tracking_token
  on public.campanhas (tracking_token)
  where tracking_token is not null
    and deleted_at is null;

create index if not exists idx_campanhas_tenant_template
  on public.campanhas (tenant_id, template_id)
  where deleted_at is null;

create index if not exists idx_campanhas_tenant_scheduled
  on public.campanhas (tenant_id, status, agendada_para)
  where deleted_at is null;

create index if not exists idx_campanhas_created_at
  on public.campanhas (tenant_id, created_at desc)
  where deleted_at is null;

alter table public.campanha_envios
  drop constraint if exists campanha_envios_status_check;

alter table public.campanha_envios
  add constraint campanha_envios_status_check check (
    status in ('pendente', 'agendado', 'processando', 'enviado', 'entregue', 'lido', 'erro', 'cancelado', 'ignorado')
  );

create unique index if not exists idx_campanha_envios_campaign_client_template
  on public.campanha_envios (tenant_id, campanha_id, cliente_id, template_id)
  where deleted_at is null;

create index if not exists idx_campanha_envios_campaign_status
  on public.campanha_envios (tenant_id, campanha_id, status)
  where deleted_at is null;

alter table public.cupons
  drop constraint if exists cupons_tipo_desconto_check;

alter table public.cupons
  add constraint cupons_tipo_desconto_check check (
    tipo_desconto in ('valor', 'percentual', 'preco_promocional')
  );

alter table public.cupons
  add column if not exists nome varchar(150),
  add column if not exists tipo_codigo varchar(30) not null default 'generico',
  add column if not exists valor_minimo numeric(10,2),
  add column if not exists limite_usos_por_cliente integer,
  add column if not exists total_reservas integer not null default 0,
  add column if not exists total_usos integer not null default 0,
  add column if not exists metadata jsonb not null default '{}'::jsonb;

update public.cupons
set total_usos = greatest(total_usos, qtd_utilizada)
where qtd_utilizada > total_usos;

create table if not exists public.cupom_servicos (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  cupom_id uuid not null references public.cupons(id) on delete cascade,
  servico_id uuid not null references public.servicos(id) on delete cascade,
  ativo boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  constraint cupom_servicos_unique unique (tenant_id, cupom_id, servico_id)
);

alter table public.cupom_servicos enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'cupom_servicos'
      and policyname = 'cupom_servicos_tenant_access'
  ) then
    create policy cupom_servicos_tenant_access
    on public.cupom_servicos
    for all
    to authenticated
    using (deleted_at is null and public.has_tenant_access(tenant_id))
    with check (public.has_tenant_access(tenant_id));
  end if;
end $$;

alter table public.cupom_usos
  add column if not exists campanha_id uuid references public.campanhas(id) on delete set null,
  add column if not exists valor_original numeric(10,2),
  add column if not exists valor_final numeric(10,2),
  add column if not exists status varchar(30) not null default 'utilizado',
  add column if not exists reservado_em timestamptz,
  add column if not exists utilizado_em timestamptz,
  add column if not exists cancelado_em timestamptz,
  add column if not exists metadata jsonb not null default '{}'::jsonb;

alter table public.cupom_usos
  drop constraint if exists cupom_usos_status_check;

alter table public.cupom_usos
  add constraint cupom_usos_status_check check (
    status in ('reservado', 'utilizado', 'cancelado', 'expirado')
  );

update public.cupom_usos
set utilizado_em = coalesce(utilizado_em, usado_em),
    status = coalesce(status, 'utilizado')
where utilizado_em is null;

create index if not exists idx_cupom_servicos_coupon
  on public.cupom_servicos (tenant_id, cupom_id)
  where deleted_at is null;

create index if not exists idx_cupom_usos_coupon_status
  on public.cupom_usos (tenant_id, cupom_id, status)
  where deleted_at is null;

create index if not exists idx_cupom_usos_campaign
  on public.cupom_usos (tenant_id, campanha_id)
  where campanha_id is not null
    and deleted_at is null;

create index if not exists idx_mensagens_whatsapp_campaign
  on public.mensagens_whatsapp (tenant_id, campanha_id, status_envio)
  where campanha_id is not null
    and deleted_at is null;
