-- Ensures administrative professionals can consult the dashboard, agenda,
-- and clients even when the earlier role seed was not applied.

insert into public.permissions (codigo, recurso, acao, escopo, descricao)
values
  ('dashboard.read', 'dashboard', 'read', 'tenant', 'Visualizar dashboard do tenant'),
  ('agenda.read', 'agenda', 'read', 'tenant', 'Visualizar agenda do tenant'),
  ('clientes.read', 'clientes', 'read', 'tenant', 'Visualizar clientes do tenant')
on conflict (codigo) do update
set
  recurso = excluded.recurso,
  acao = excluded.acao,
  escopo = excluded.escopo,
  descricao = excluded.descricao,
  ativo = true,
  updated_at = now();

insert into public.roles (nome, display_name, escopo, dashboard, descricao)
values (
  'Profissional Adm',
  'Profissional administrativo',
  'tenant',
  'admin_staff',
  'Apoio administrativo com consulta de agenda e clientes'
)
on conflict (nome, escopo) do update
set
  display_name = excluded.display_name,
  dashboard = excluded.dashboard,
  descricao = excluded.descricao,
  ativo = true,
  updated_at = now();

with role_permission_seed(permission_codigo) as (
  values
    ('dashboard.read'),
    ('agenda.read'),
    ('clientes.read')
)
insert into public.role_permissions (role_id, permission_id)
select r.id, p.id
from role_permission_seed seed
join public.roles r
  on r.nome = 'Profissional Adm'
 and r.escopo = 'tenant'
join public.permissions p
  on p.codigo = seed.permission_codigo
on conflict (role_id, permission_id) do nothing;
