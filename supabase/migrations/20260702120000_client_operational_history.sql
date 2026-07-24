-- Bellory - historico operacional do cliente alimentado pela Agenda.

alter table public.cliente_tenants
  add column if not exists data_ultimo_atendimento timestamptz,
  add column if not exists total_atendimentos_concluidos integer not null default 0,
  add column if not exists total_valor_gasto numeric(10,2) not null default 0,
  add column if not exists data_ultimo_no_show timestamptz,
  add column if not exists total_no_show integer not null default 0,
  add column if not exists servico_mais_recente uuid references public.servicos(id) on delete set null,
  add column if not exists profissional_mais_recente uuid references public.profissionais(id) on delete set null;

update public.cliente_tenants
set
  data_ultimo_atendimento = coalesce(data_ultimo_atendimento, ultimo_atendimento),
  total_atendimentos_concluidos = greatest(total_atendimentos_concluidos, qtd_atendimentos),
  total_valor_gasto = greatest(total_valor_gasto, total_gasto)
where deleted_at is null;

create table if not exists public.cliente_historico_atendimentos (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  cliente_id uuid not null references public.clientes(id) on delete cascade,
  agendamento_id uuid not null references public.agendamentos(id) on delete cascade,
  profissional_id uuid references public.profissionais(id) on delete set null,
  servico_id uuid references public.servicos(id) on delete set null,
  status varchar(30) not null,
  data_atendimento timestamptz not null,
  valor_servico numeric(10,2),
  origem varchar(50) not null default 'agenda',
  metadata jsonb not null default '{}'::jsonb,
  ativo boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  constraint cliente_historico_atendimentos_status_check check (status in ('concluido', 'no_show')),
  constraint cliente_historico_atendimentos_unique unique (tenant_id, agendamento_id)
);

create index if not exists idx_cliente_historico_atendimentos_cliente
  on public.cliente_historico_atendimentos (tenant_id, cliente_id, data_atendimento desc);

create index if not exists idx_cliente_historico_atendimentos_status
  on public.cliente_historico_atendimentos (tenant_id, status, data_atendimento desc);

drop trigger if exists set_updated_at on public.cliente_historico_atendimentos;
create trigger set_updated_at
before update on public.cliente_historico_atendimentos
for each row execute function public.set_updated_at();

alter table public.cliente_historico_atendimentos enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'cliente_historico_atendimentos'
      and policyname = 'cliente_historico_atendimentos_select_by_tenant'
  ) then
    create policy cliente_historico_atendimentos_select_by_tenant
    on public.cliente_historico_atendimentos
    for select
    to authenticated
    using (deleted_at is null and public.has_tenant_access(tenant_id));
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'cliente_historico_atendimentos'
      and policyname = 'cliente_historico_atendimentos_insert_by_tenant'
  ) then
    create policy cliente_historico_atendimentos_insert_by_tenant
    on public.cliente_historico_atendimentos
    for insert
    to authenticated
    with check (public.has_tenant_access(tenant_id));
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'cliente_historico_atendimentos'
      and policyname = 'cliente_historico_atendimentos_update_by_tenant'
  ) then
    create policy cliente_historico_atendimentos_update_by_tenant
    on public.cliente_historico_atendimentos
    for update
    to authenticated
    using (deleted_at is null and public.has_tenant_access(tenant_id))
    with check (public.has_tenant_access(tenant_id));
  end if;
end $$;
