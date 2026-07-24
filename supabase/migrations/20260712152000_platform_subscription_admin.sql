-- MasterAdmin subscription maintenance and audit trail.

alter table public.assinaturas
  drop constraint if exists assinaturas_status_check;

alter table public.assinaturas
  add constraint assinaturas_status_check check (
    status in (
      'trial',
      'ativo',
      'ativa',
      'expirada',
      'vencida',
      'suspensa',
      'inadimplente',
      'cancelada',
      'pendente_pagamento'
    )
  );

alter table public.assinaturas
  add column if not exists proxima_renovacao date,
  add column if not exists expira_em date,
  add column if not exists bloqueio_motivo text,
  add column if not exists status_pagamento varchar(30) not null default 'pendente',
  add column if not exists origem_ultima_alteracao varchar(40),
  add column if not exists alterado_por_usuario_id uuid references public.usuarios(id) on delete set null,
  add column if not exists ultima_alteracao_observacao text,
  add column if not exists provider_event_id text;

create unique index if not exists idx_assinaturas_provider_event
  on public.assinaturas (provider_event_id)
  where provider_event_id is not null
    and deleted_at is null;

create table if not exists public.assinatura_historico (
  id uuid primary key default gen_random_uuid(),
  assinatura_id uuid not null references public.assinaturas(id) on delete cascade,
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  status_anterior varchar(30),
  status_novo varchar(30),
  plano_anterior uuid references public.planos(id) on delete set null,
  plano_novo uuid references public.planos(id) on delete set null,
  trial_ate_anterior date,
  trial_ate_novo date,
  data_fim_anterior date,
  data_fim_novo date,
  proxima_renovacao_anterior date,
  proxima_renovacao_novo date,
  expira_em_anterior date,
  expira_em_novo date,
  origem varchar(40) not null,
  tipo_alteracao varchar(40) not null,
  usuario_id uuid references public.usuarios(id) on delete set null,
  observacao text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_assinatura_historico_assinatura
  on public.assinatura_historico (assinatura_id, created_at desc);

create index if not exists idx_assinatura_historico_tenant
  on public.assinatura_historico (tenant_id, created_at desc);

alter table public.assinatura_historico enable row level security;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'assinatura_historico'
      and policyname = 'assinatura_historico_masteradmin_access'
  ) then
    create policy assinatura_historico_masteradmin_access
    on public.assinatura_historico
    for all
    to authenticated
    using (public.is_master_admin())
    with check (public.is_master_admin());
  end if;
end $$;

insert into public.permissions (codigo, recurso, acao, escopo, descricao)
values
  (
    'platform.subscriptions.read',
    'platform.subscriptions',
    'read',
    'platform',
    'Consultar assinaturas dos tenants'
  ),
  (
    'platform.subscriptions.manage',
    'platform.subscriptions',
    'manage',
    'platform',
    'Manter assinaturas dos tenants'
  )
on conflict (codigo) do update
set
  recurso = excluded.recurso,
  acao = excluded.acao,
  escopo = excluded.escopo,
  descricao = excluded.descricao,
  ativo = true,
  updated_at = now();

insert into public.role_permissions (role_id, permission_id)
select r.id, p.id
from public.roles r
join public.permissions p
  on p.codigo in ('platform.subscriptions.read', 'platform.subscriptions.manage')
where r.nome = 'MasterAdmin'
  and r.escopo = 'platform'
on conflict (role_id, permission_id) do nothing;
