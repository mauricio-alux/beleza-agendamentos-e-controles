-- Foundation/Core adjustments.
-- Adds onboarding progress, tenant settings audit, event logs and commercial
-- plan/link/service refinements without replacing the approved global MER.

alter table public.planos
  add column if not exists limite_agendamentos_mes integer,
  add column if not exists limite_whatsapp integer,
  add column if not exists fl_ia boolean not null default false,
  add column if not exists fl_crm boolean not null default true,
  add column if not exists fl_whatsapp boolean not null default true;

update public.planos
set
  fl_ia = coalesce(permite_ia, fl_ia),
  fl_whatsapp = coalesce(permite_whatsapp_cloud, fl_whatsapp)
where deleted_at is null;

alter table public.tenants
  drop constraint if exists tenants_status_check;

update public.tenants
set status = 'trial'
where status = 'inativo';

alter table public.tenants
  alter column status set default 'trial',
  add constraint tenants_status_check check (status in ('trial', 'ativo', 'suspenso', 'cancelado', 'inadimplente'));

alter table public.links_agendamento
  add column if not exists origem varchar(50) not null default 'onboarding',
  add column if not exists utm_source varchar(100),
  add column if not exists utm_campaign varchar(150),
  add column if not exists clicks integer not null default 0;

alter table public.links_agendamento
  add constraint links_agendamento_clicks_check check (clicks >= 0);

alter table public.profissional_servicos
  add column if not exists duracao_minutos integer,
  add column if not exists preco numeric(10,2),
  add column if not exists percentual_comissao numeric(5,2);

update public.profissional_servicos
set
  duracao_minutos = coalesce(duracao_minutos, duracao_especifica_minutos),
  preco = coalesce(preco, preco_especifico)
where deleted_at is null;

alter table public.profissional_servicos
  add constraint profissional_servicos_duracao_minutos_check check (duracao_minutos is null or duracao_minutos > 0),
  add constraint profissional_servicos_preco_check_v2 check (preco is null or preco >= 0),
  add constraint profissional_servicos_percentual_comissao_check check (
    percentual_comissao is null or (percentual_comissao >= 0 and percentual_comissao <= 100)
  );

create table if not exists public.tenant_settings_audit (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  usuario_id uuid references public.usuarios(id) on delete set null,
  campo varchar(120) not null,
  valor_antigo jsonb,
  valor_novo jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.onboarding_steps (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  usuario_id uuid references public.usuarios(id) on delete set null,
  step varchar(80) not null,
  status varchar(30) not null default 'pendente',
  completed_at timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  ativo boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  constraint onboarding_steps_status_check check (status in ('pendente', 'em_andamento', 'concluido', 'ignorado')),
  constraint onboarding_steps_unique unique (tenant_id, step)
);

create table if not exists public.event_logs (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid references public.tenants(id) on delete set null,
  usuario_id uuid references public.usuarios(id) on delete set null,
  event_type varchar(100) not null,
  origem varchar(80) not null default 'backend',
  ip_address inet,
  user_agent text,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_planos_flags on public.planos (fl_ia, fl_crm, fl_whatsapp);
create index if not exists idx_tenants_status_core on public.tenants (status);
create index if not exists idx_links_agendamento_utm on public.links_agendamento (tenant_id, origem, utm_source, utm_campaign);
create index if not exists idx_profissional_servicos_tenant_ativo on public.profissional_servicos (tenant_id, ativo);
create index if not exists idx_tenant_settings_audit_tenant_created on public.tenant_settings_audit (tenant_id, created_at);
create index if not exists idx_onboarding_steps_tenant_status on public.onboarding_steps (tenant_id, status);
create index if not exists idx_event_logs_event_type_created on public.event_logs (event_type, created_at);
create index if not exists idx_event_logs_tenant_created on public.event_logs (tenant_id, created_at);

drop trigger if exists set_updated_at on public.onboarding_steps;
create trigger set_updated_at
before update on public.onboarding_steps
for each row
execute function public.set_updated_at();

alter table public.tenant_settings_audit enable row level security;
alter table public.onboarding_steps enable row level security;
alter table public.event_logs enable row level security;

create policy tenant_settings_audit_select_by_tenant
on public.tenant_settings_audit
for select
to authenticated
using (public.has_tenant_access(tenant_id));

create policy tenant_settings_audit_insert_by_tenant
on public.tenant_settings_audit
for insert
to authenticated
with check (public.has_tenant_access(tenant_id));

create policy onboarding_steps_select_by_tenant
on public.onboarding_steps
for select
to authenticated
using (deleted_at is null and public.has_tenant_access(tenant_id));

create policy onboarding_steps_insert_by_tenant
on public.onboarding_steps
for insert
to authenticated
with check (public.has_tenant_access(tenant_id));

create policy onboarding_steps_update_by_tenant
on public.onboarding_steps
for update
to authenticated
using (deleted_at is null and public.has_tenant_access(tenant_id))
with check (public.has_tenant_access(tenant_id));

create policy event_logs_select_master_or_tenant
on public.event_logs
for select
to authenticated
using (
  public.is_master_admin()
  or (tenant_id is not null and public.has_tenant_access(tenant_id))
);

create policy event_logs_insert_authenticated
on public.event_logs
for insert
to authenticated
with check (
  public.is_master_admin()
  or tenant_id is null
  or public.has_tenant_access(tenant_id)
);
