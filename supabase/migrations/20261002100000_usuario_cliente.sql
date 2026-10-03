begin;
create table public.usuario_cliente (
  id uuid primary key default gen_random_uuid(),
  usuario_id uuid not null references public.usuarios(id) on delete cascade,
  cliente_id uuid not null references public.clientes(id) on delete cascade,
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  status_verificacao varchar(20) not null default 'pendente'
    check (status_verificacao in ('pendente','verificado','revogado')),
  origem_vinculo varchar(40) not null default 'telefone_coincidente',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (usuario_id, cliente_id, tenant_id),
  foreign key (tenant_id, cliente_id) references public.cliente_tenants(tenant_id, cliente_id) on delete cascade
);
create index idx_usuario_cliente_context on public.usuario_cliente(tenant_id, cliente_id);
alter table public.usuario_cliente enable row level security;
revoke all on public.usuario_cliente from anon, authenticated;
grant select, insert, update, delete on public.usuario_cliente to service_role;
-- No backfill. Application writes only pending candidates; verified is reserved for future proof.
commit;
