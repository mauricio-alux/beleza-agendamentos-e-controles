-- RBAC foundation.
-- Internal granular permissions with simple predefined roles for SaaS users.

create table if not exists public.permissions (
  id uuid primary key default gen_random_uuid(),
  codigo varchar(120) not null unique,
  recurso varchar(80) not null,
  acao varchar(80) not null,
  escopo varchar(30) not null,
  descricao text,
  metadata jsonb not null default '{}'::jsonb,
  ativo boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint permissions_escopo_check check (escopo in ('platform', 'tenant', 'client'))
);

create table if not exists public.roles (
  id uuid primary key default gen_random_uuid(),
  nome varchar(80) not null,
  display_name varchar(120) not null,
  escopo varchar(30) not null,
  dashboard varchar(80) not null default 'tenant',
  descricao text,
  is_system boolean not null default true,
  metadata jsonb not null default '{}'::jsonb,
  ativo boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint roles_escopo_check check (escopo in ('platform', 'tenant', 'client')),
  constraint roles_unique unique (nome, escopo)
);

create table if not exists public.role_permissions (
  id uuid primary key default gen_random_uuid(),
  role_id uuid not null references public.roles(id) on delete cascade,
  permission_id uuid not null references public.permissions(id) on delete cascade,
  created_at timestamptz not null default now(),
  constraint role_permissions_unique unique (role_id, permission_id)
);

create table if not exists public.tenant_user_permissions (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  usuario_id uuid not null references public.usuarios(id) on delete cascade,
  permission_id uuid not null references public.permissions(id) on delete cascade,
  effect varchar(20) not null default 'allow',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint tenant_user_permissions_effect_check check (effect in ('allow', 'deny')),
  constraint tenant_user_permissions_unique unique (tenant_id, usuario_id, permission_id)
);

create index if not exists idx_permissions_recurso_acao on public.permissions (recurso, acao);
create index if not exists idx_roles_nome_escopo on public.roles (nome, escopo);
create index if not exists idx_role_permissions_role on public.role_permissions (role_id);
create index if not exists idx_tenant_user_permissions_user on public.tenant_user_permissions (tenant_id, usuario_id);

alter table public.tenant_memberships
  drop constraint if exists tenant_memberships_role_check;

alter table public.tenant_memberships
  add constraint tenant_memberships_role_check check (
    role in ('Administrador', 'Gerente', 'Profissional', 'Recepcionista', 'Financeiro', 'Autonomo', 'Funcionario', 'Terceiro', 'Cliente')
  );

alter table public.usuarios
  drop constraint if exists usuarios_tipo_usuario_check;

alter table public.usuarios
  add constraint usuarios_tipo_usuario_check check (
    tipo_usuario in ('MasterAdmin', 'Administrador', 'Gerente', 'Profissional', 'Recepcionista', 'Financeiro', 'Autonomo', 'Funcionario', 'Terceiro', 'Cliente')
  );

insert into public.permissions (codigo, recurso, acao, escopo, descricao)
values
  ('platform.dashboard.read', 'platform.dashboard', 'read', 'platform', 'Visualizar dashboard SaaS da Bellory'),
  ('platform.tenants.read', 'platform.tenants', 'read', 'platform', 'Visualizar tenants da plataforma'),
  ('platform.tenants.manage', 'platform.tenants', 'manage', 'platform', 'Administrar tenants da plataforma'),
  ('platform.subscriptions.read', 'platform.subscriptions', 'read', 'platform', 'Visualizar assinaturas SaaS'),
  ('platform.subscriptions.manage', 'platform.subscriptions', 'manage', 'platform', 'Administrar assinaturas SaaS'),
  ('platform.campaigns.manage', 'platform.campaigns', 'manage', 'platform', 'Gerenciar campanhas globais e templates'),
  ('platform.support.access', 'platform.support', 'access', 'platform', 'Acessar tenant em modo suporte auditado'),
  ('platform.audit.read', 'platform.audit', 'read', 'platform', 'Visualizar auditoria da plataforma'),
  ('dashboard.read', 'dashboard', 'read', 'tenant', 'Visualizar dashboard operacional'),
  ('agenda.read', 'agenda', 'read', 'tenant', 'Visualizar agenda'),
  ('agenda.write', 'agenda', 'write', 'tenant', 'Criar e editar agendamentos'),
  ('agenda.manage', 'agenda', 'manage', 'tenant', 'Gerenciar agenda completa'),
  ('clientes.read', 'clientes', 'read', 'tenant', 'Visualizar clientes'),
  ('clientes.write', 'clientes', 'write', 'tenant', 'Criar e editar clientes'),
  ('servicos.read', 'servicos', 'read', 'tenant', 'Visualizar servicos'),
  ('servicos.write', 'servicos', 'write', 'tenant', 'Criar e editar servicos'),
  ('servicos.manage', 'servicos', 'manage', 'tenant', 'Gerenciar catalogo de servicos'),
  ('campanhas.read', 'campanhas', 'read', 'tenant', 'Visualizar campanhas do tenant'),
  ('campanhas.manage', 'campanhas', 'manage', 'tenant', 'Gerenciar campanhas do tenant'),
  ('financeiro.read', 'financeiro', 'read', 'tenant', 'Visualizar financeiro'),
  ('financeiro.manage', 'financeiro', 'manage', 'tenant', 'Gerenciar financeiro'),
  ('equipe.read', 'equipe', 'read', 'tenant', 'Visualizar equipe'),
  ('equipe.manage', 'equipe', 'manage', 'tenant', 'Gerenciar equipe'),
  ('tenant.read', 'tenant', 'read', 'tenant', 'Visualizar configuracoes do salao'),
  ('tenant.manage', 'tenant', 'manage', 'tenant', 'Gerenciar configuracoes do salao'),
  ('cliente.dashboard.read', 'cliente.dashboard', 'read', 'client', 'Visualizar area do cliente final'),
  ('cliente.agendamentos.manage', 'cliente.agendamentos', 'manage', 'client', 'Gerenciar proprios agendamentos')
on conflict (codigo) do update
set
  recurso = excluded.recurso,
  acao = excluded.acao,
  escopo = excluded.escopo,
  descricao = excluded.descricao,
  ativo = true,
  updated_at = now();

insert into public.roles (nome, display_name, escopo, dashboard, descricao)
values
  ('MasterAdmin', 'Administrador da plataforma', 'platform', 'platform', 'Gestao SaaS da Bellory'),
  ('Administrador', 'Administrador', 'tenant', 'tenant_admin', 'Visao completa da operacao do salao'),
  ('Gerente', 'Gerente', 'tenant', 'tenant_manager', 'Gestao operacional sem administracao SaaS'),
  ('Autonomo', 'Autonomo', 'tenant', 'tenant_owner', 'Operacao individual com controle amplo'),
  ('Profissional', 'Profissional', 'tenant', 'professional', 'Agenda, clientes e ganhos proprios'),
  ('Recepcionista', 'Recepcionista', 'tenant', 'reception', 'Agenda, clientes e confirmacoes'),
  ('Financeiro', 'Financeiro', 'tenant', 'finance', 'Faturamento, pagamentos e relatorios'),
  ('Funcionario', 'Funcionario', 'tenant', 'staff', 'Acesso operacional limitado'),
  ('Terceiro', 'Terceiro', 'tenant', 'third_party', 'Prestador externo com acesso restrito'),
  ('Cliente', 'Cliente', 'client', 'client', 'Area do cliente final')
on conflict (nome, escopo) do update
set
  display_name = excluded.display_name,
  dashboard = excluded.dashboard,
  descricao = excluded.descricao,
  ativo = true,
  updated_at = now();

with role_permission_seed(role_nome, role_escopo, permission_codigo) as (
  values
    ('MasterAdmin', 'platform', 'platform.dashboard.read'),
    ('MasterAdmin', 'platform', 'platform.tenants.read'),
    ('MasterAdmin', 'platform', 'platform.tenants.manage'),
    ('MasterAdmin', 'platform', 'platform.subscriptions.read'),
    ('MasterAdmin', 'platform', 'platform.subscriptions.manage'),
    ('MasterAdmin', 'platform', 'platform.campaigns.manage'),
    ('MasterAdmin', 'platform', 'platform.support.access'),
    ('MasterAdmin', 'platform', 'platform.audit.read'),

    ('Administrador', 'tenant', 'dashboard.read'),
    ('Administrador', 'tenant', 'agenda.read'),
    ('Administrador', 'tenant', 'agenda.write'),
    ('Administrador', 'tenant', 'agenda.manage'),
    ('Administrador', 'tenant', 'clientes.read'),
    ('Administrador', 'tenant', 'clientes.write'),
    ('Administrador', 'tenant', 'servicos.read'),
    ('Administrador', 'tenant', 'servicos.write'),
    ('Administrador', 'tenant', 'servicos.manage'),
    ('Administrador', 'tenant', 'campanhas.read'),
    ('Administrador', 'tenant', 'campanhas.manage'),
    ('Administrador', 'tenant', 'financeiro.read'),
    ('Administrador', 'tenant', 'financeiro.manage'),
    ('Administrador', 'tenant', 'equipe.read'),
    ('Administrador', 'tenant', 'equipe.manage'),
    ('Administrador', 'tenant', 'tenant.read'),
    ('Administrador', 'tenant', 'tenant.manage'),

    ('Gerente', 'tenant', 'dashboard.read'),
    ('Gerente', 'tenant', 'agenda.read'),
    ('Gerente', 'tenant', 'agenda.write'),
    ('Gerente', 'tenant', 'agenda.manage'),
    ('Gerente', 'tenant', 'clientes.read'),
    ('Gerente', 'tenant', 'clientes.write'),
    ('Gerente', 'tenant', 'servicos.read'),
    ('Gerente', 'tenant', 'servicos.write'),
    ('Gerente', 'tenant', 'campanhas.read'),
    ('Gerente', 'tenant', 'campanhas.manage'),
    ('Gerente', 'tenant', 'financeiro.read'),
    ('Gerente', 'tenant', 'equipe.read'),
    ('Gerente', 'tenant', 'tenant.read'),

    ('Autonomo', 'tenant', 'dashboard.read'),
    ('Autonomo', 'tenant', 'agenda.read'),
    ('Autonomo', 'tenant', 'agenda.write'),
    ('Autonomo', 'tenant', 'agenda.manage'),
    ('Autonomo', 'tenant', 'clientes.read'),
    ('Autonomo', 'tenant', 'clientes.write'),
    ('Autonomo', 'tenant', 'servicos.read'),
    ('Autonomo', 'tenant', 'servicos.write'),
    ('Autonomo', 'tenant', 'servicos.manage'),
    ('Autonomo', 'tenant', 'campanhas.read'),
    ('Autonomo', 'tenant', 'financeiro.read'),
    ('Autonomo', 'tenant', 'tenant.read'),
    ('Autonomo', 'tenant', 'tenant.manage'),

    ('Profissional', 'tenant', 'dashboard.read'),
    ('Profissional', 'tenant', 'agenda.read'),
    ('Profissional', 'tenant', 'agenda.write'),
    ('Profissional', 'tenant', 'clientes.read'),
    ('Profissional', 'tenant', 'clientes.write'),
    ('Profissional', 'tenant', 'servicos.read'),
    ('Profissional', 'tenant', 'financeiro.read'),

    ('Recepcionista', 'tenant', 'dashboard.read'),
    ('Recepcionista', 'tenant', 'agenda.read'),
    ('Recepcionista', 'tenant', 'agenda.write'),
    ('Recepcionista', 'tenant', 'clientes.read'),
    ('Recepcionista', 'tenant', 'clientes.write'),
    ('Recepcionista', 'tenant', 'servicos.read'),
    ('Recepcionista', 'tenant', 'campanhas.read'),

    ('Financeiro', 'tenant', 'dashboard.read'),
    ('Financeiro', 'tenant', 'clientes.read'),
    ('Financeiro', 'tenant', 'financeiro.read'),
    ('Financeiro', 'tenant', 'financeiro.manage'),

    ('Funcionario', 'tenant', 'dashboard.read'),
    ('Funcionario', 'tenant', 'agenda.read'),
    ('Funcionario', 'tenant', 'clientes.read'),
    ('Funcionario', 'tenant', 'servicos.read'),

    ('Terceiro', 'tenant', 'dashboard.read'),
    ('Terceiro', 'tenant', 'agenda.read'),
    ('Terceiro', 'tenant', 'servicos.read'),

    ('Cliente', 'client', 'cliente.dashboard.read'),
    ('Cliente', 'client', 'cliente.agendamentos.manage')
)
insert into public.role_permissions (role_id, permission_id)
select r.id, p.id
from role_permission_seed seed
join public.roles r on r.nome = seed.role_nome and r.escopo = seed.role_escopo
join public.permissions p on p.codigo = seed.permission_codigo
on conflict (role_id, permission_id) do nothing;

alter table public.permissions enable row level security;
alter table public.roles enable row level security;
alter table public.role_permissions enable row level security;
alter table public.tenant_user_permissions enable row level security;

drop policy if exists permissions_select_authenticated on public.permissions;
create policy permissions_select_authenticated
on public.permissions
for select
to authenticated
using (ativo = true);

drop policy if exists roles_select_authenticated on public.roles;
create policy roles_select_authenticated
on public.roles
for select
to authenticated
using (ativo = true);

drop policy if exists role_permissions_select_authenticated on public.role_permissions;
create policy role_permissions_select_authenticated
on public.role_permissions
for select
to authenticated
using (true);

drop policy if exists tenant_user_permissions_select_by_access on public.tenant_user_permissions;
create policy tenant_user_permissions_select_by_access
on public.tenant_user_permissions
for select
to authenticated
using (public.has_tenant_access(tenant_id));

drop policy if exists tenant_user_permissions_master_write on public.tenant_user_permissions;
create policy tenant_user_permissions_master_write
on public.tenant_user_permissions
for all
to authenticated
using (public.is_master_admin())
with check (public.is_master_admin());
