-- Initial RBAC baseline for administrative professionals.
-- Granular per-user overrides can extend/restrict these permissions later.

insert into public.permissions (codigo, recurso, acao, escopo, descricao)
values
  ('agenda.write', 'agenda', 'write', 'tenant', 'Criar e editar agendamentos'),
  ('clientes.write', 'clientes', 'write', 'tenant', 'Criar e editar clientes'),
  ('campanhas.read', 'campanhas', 'read', 'tenant', 'Visualizar campanhas do tenant'),
  ('financeiro.read', 'financeiro', 'read', 'tenant', 'Visualizar financeiro'),
  ('tenant.read', 'tenant', 'read', 'tenant', 'Visualizar configuracoes do salao')
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
  ('Profissional Adm', 'Profissional administrativo', 'tenant', 'admin_staff', 'Apoio administrativo sem execucao de servicos')
on conflict (nome, escopo) do update
set
  display_name = excluded.display_name,
  dashboard = excluded.dashboard,
  descricao = excluded.descricao,
  ativo = true,
  updated_at = now();

with role_permission_seed(role_nome, role_escopo, permission_codigo) as (
  values
    ('Profissional Adm', 'tenant', 'dashboard.read'),
    ('Profissional Adm', 'tenant', 'agenda.read'),
    ('Profissional Adm', 'tenant', 'clientes.read')
)
insert into public.role_permissions (role_id, permission_id)
select r.id, p.id
from role_permission_seed seed
join public.roles r on r.nome = seed.role_nome and r.escopo = seed.role_escopo
join public.permissions p on p.codigo = seed.permission_codigo
on conflict (role_id, permission_id) do nothing;
