alter table public.clientes
  add column if not exists client_token varchar(120),
  add column if not exists trusted_device_hash varchar(120),
  add column if not exists trust_score integer not null default 0,
  add column if not exists last_known_device varchar(180),
  add column if not exists last_known_ip varchar(80),
  add column if not exists identity_status varchar(30) not null default 'normal';

alter table public.clientes
  drop constraint if exists clientes_identity_status_check,
  add constraint clientes_identity_status_check
    check (identity_status in ('normal', 'suspeito', 'bloqueado', 'validacao_pendente'));

create unique index if not exists idx_clientes_client_token
  on public.clientes (client_token)
  where client_token is not null and deleted_at is null;

create index if not exists idx_clientes_identity_status
  on public.clientes (identity_status);

alter table public.configuracoes_tenant
  add column if not exists confirmation_policy varchar(30) not null default 'flexible',
  add column if not exists attendant_confirmation_timeout_minutes integer not null default 30,
  add column if not exists client_confirmation_timeout_minutes integer not null default 60,
  add column if not exists weekly_booking_limit integer not null default 3,
  add column if not exists block_when_weekly_limit_exceeded boolean not null default false;

alter table public.configuracoes_tenant
  drop constraint if exists configuracoes_tenant_confirmation_policy_check,
  add constraint configuracoes_tenant_confirmation_policy_check
    check (confirmation_policy in ('strict', 'flexible', 'auto_confirm')),
  drop constraint if exists configuracoes_tenant_confirmation_timeouts_check,
  add constraint configuracoes_tenant_confirmation_timeouts_check
    check (
      attendant_confirmation_timeout_minutes between 5 and 1440
      and client_confirmation_timeout_minutes between 5 and 1440
      and weekly_booking_limit between 1 and 50
    );

alter table public.agendamentos
  drop constraint if exists agendamentos_status_check,
  add constraint agendamentos_status_check check (
    status in (
      'solicitado',
      'pendente',
      'pendente_atendente',
      'pendente_cliente',
      'confirmado',
      'cancelado',
      'concluido',
      'no_show',
      'reagendado',
      'expirado_atendente',
      'expirado_cliente',
      'suspeito'
    )
  );

create table if not exists public.clientes_bloqueios (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  cliente_id uuid references public.clientes(id) on delete cascade,
  telefone varchar(20),
  motivo text,
  ativo boolean not null default true,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create index if not exists idx_clientes_bloqueios_tenant
  on public.clientes_bloqueios (tenant_id, ativo)
  where deleted_at is null;
