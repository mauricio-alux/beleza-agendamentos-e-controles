-- Consolidates the dashboard RBAC matrix.
-- Tenant owners keep management permissions, while operational professionals
-- are restricted to their own dashboard and agenda context.

with tenant_permissions(codigo, recurso, acao, descricao) as (
  values
    ('dashboard.read', 'dashboard', 'read', 'Visualizar dashboard operacional'),
    ('agenda.read', 'agenda', 'read', 'Visualizar agenda'),
    ('agenda.write', 'agenda', 'write', 'Criar e editar agendamentos'),
    ('agenda.manage', 'agenda', 'manage', 'Gerenciar agenda completa'),
    ('clientes.read', 'clientes', 'read', 'Visualizar clientes'),
    ('clientes.write', 'clientes', 'write', 'Criar e editar clientes'),
    ('servicos.read', 'servicos', 'read', 'Visualizar servicos'),
    ('servicos.write', 'servicos', 'write', 'Criar e editar servicos'),
    ('servicos.manage', 'servicos', 'manage', 'Gerenciar catalogo de servicos'),
    ('campanhas.read', 'campanhas', 'read', 'Visualizar campanhas do tenant'),
    ('campanhas.manage', 'campanhas', 'manage', 'Gerenciar campanhas do tenant'),
    ('financeiro.read', 'financeiro', 'read', 'Visualizar financeiro'),
    ('financeiro.manage', 'financeiro', 'manage', 'Gerenciar financeiro'),
    ('relatorios.read', 'relatorios', 'read', 'Visualizar relatorios do tenant'),
    ('equipe.read', 'equipe', 'read', 'Visualizar equipe'),
    ('equipe.manage', 'equipe', 'manage', 'Gerenciar equipe'),
    ('tenant.read', 'tenant', 'read', 'Visualizar configuracoes do salao'),
    ('tenant.manage', 'tenant', 'manage', 'Gerenciar configuracoes do salao')
)
insert into public.permissions (codigo, recurso, acao, escopo, descricao)
select codigo, recurso, acao, 'tenant', descricao
from tenant_permissions
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
  ('Administrador', 'Administrador', 'tenant', 'tenant_admin', 'Gestao completa do proprio tenant'),
  ('Autonomo', 'Autonomo', 'tenant', 'tenant_owner', 'Gestao completa quando owner e contexto pessoal quando partner'),
  ('Funcionario', 'Funcionario', 'tenant', 'staff', 'Dashboard e agenda proprios em modo leitura'),
  ('Terceiro', 'Terceiro', 'tenant', 'third_party', 'Agenda e atendimentos atribuidos em modo leitura'),
  ('Profissional', 'Profissional', 'tenant', 'professional', 'Perfil legado restrito ao contexto profissional')
on conflict (nome, escopo) do update
set
  display_name = excluded.display_name,
  dashboard = excluded.dashboard,
  descricao = excluded.descricao,
  ativo = true,
  updated_at = now();

with management_roles(role_nome) as (
  values ('Administrador'), ('Autonomo')
),
management_permissions(permission_codigo) as (
  values
    ('dashboard.read'),
    ('agenda.read'),
    ('agenda.write'),
    ('agenda.manage'),
    ('clientes.read'),
    ('clientes.write'),
    ('servicos.read'),
    ('servicos.write'),
    ('servicos.manage'),
    ('campanhas.read'),
    ('campanhas.manage'),
    ('financeiro.read'),
    ('financeiro.manage'),
    ('relatorios.read'),
    ('equipe.read'),
    ('equipe.manage'),
    ('tenant.read'),
    ('tenant.manage')
)
insert into public.role_permissions (role_id, permission_id)
select role.id, permission.id
from management_roles role_seed
join public.roles role
  on role.nome = role_seed.role_nome
 and role.escopo = 'tenant'
cross join management_permissions permission_seed
join public.permissions permission
  on permission.codigo = permission_seed.permission_codigo
on conflict (role_id, permission_id) do nothing;

delete from public.role_permissions role_permission
using public.roles role, public.permissions permission
where role_permission.role_id = role.id
  and role_permission.permission_id = permission.id
  and role.escopo = 'tenant'
  and role.nome in ('Funcionario', 'Terceiro', 'Profissional')
  and permission.codigo not in ('dashboard.read', 'agenda.read');

with personal_roles(role_nome) as (
  values ('Funcionario'), ('Terceiro'), ('Profissional')
),
personal_permissions(permission_codigo) as (
  values ('dashboard.read'), ('agenda.read')
)
insert into public.role_permissions (role_id, permission_id)
select role.id, permission.id
from personal_roles role_seed
join public.roles role
  on role.nome = role_seed.role_nome
 and role.escopo = 'tenant'
cross join personal_permissions permission_seed
join public.permissions permission
  on permission.codigo = permission_seed.permission_codigo
on conflict (role_id, permission_id) do nothing;

delete from public.tenant_user_permissions user_permission
using public.tenant_memberships membership, public.permissions permission
where user_permission.tenant_id = membership.tenant_id
  and user_permission.usuario_id = membership.usuario_id
  and user_permission.permission_id = permission.id
  and user_permission.effect = 'allow'
  and membership.status = 'ativo'
  and membership.role in ('Funcionario', 'Terceiro', 'Profissional')
  and permission.codigo not in ('dashboard.read', 'agenda.read');
