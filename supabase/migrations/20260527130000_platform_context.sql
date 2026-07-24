-- Platform context for Bellory SaaS administration.
-- MasterAdmin manages Bellory as a platform, not tenant operations by default.

create table if not exists public.platform_campaigns (
  id uuid primary key default gen_random_uuid(),
  created_by_usuario_id uuid references public.usuarios(id) on delete set null,
  nome varchar(150) not null,
  descricao text,
  tipo varchar(50) not null default 'template',
  canal varchar(30) not null default 'whatsapp',
  status varchar(30) not null default 'rascunho',
  escopo varchar(30) not null default 'template',
  publico_alvo jsonb not null default '{}'::jsonb,
  conteudo jsonb not null default '{}'::jsonb,
  metadata jsonb not null default '{}'::jsonb,
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  constraint platform_campaigns_status_check check (
    status in ('rascunho', 'publicada', 'arquivada')
  ),
  constraint platform_campaigns_escopo_check check (
    escopo in ('bellory', 'global_tenants', 'template')
  )
);

create index if not exists idx_platform_campaigns_status_created
  on public.platform_campaigns (status, created_at);

create index if not exists idx_platform_campaigns_escopo
  on public.platform_campaigns (escopo);

drop trigger if exists set_updated_at on public.platform_campaigns;
create trigger set_updated_at
before update on public.platform_campaigns
for each row
execute function public.set_updated_at();

alter table public.platform_campaigns enable row level security;

drop policy if exists platform_campaigns_master_select on public.platform_campaigns;
create policy platform_campaigns_master_select
on public.platform_campaigns
for select
to authenticated
using (public.is_master_admin() and deleted_at is null);

drop policy if exists platform_campaigns_master_insert on public.platform_campaigns;
create policy platform_campaigns_master_insert
on public.platform_campaigns
for insert
to authenticated
with check (public.is_master_admin());

drop policy if exists platform_campaigns_master_update on public.platform_campaigns;
create policy platform_campaigns_master_update
on public.platform_campaigns
for update
to authenticated
using (public.is_master_admin() and deleted_at is null)
with check (public.is_master_admin());
