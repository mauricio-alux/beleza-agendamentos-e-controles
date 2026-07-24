-- Operational role selection during SaaS registration.
-- Autonomo owners can access Team to add the first professional; the backend
-- promotes them to Administrador when the team is actually created.

with role_permission_seed(role_nome, role_escopo, permission_codigo) as (
  values
    ('Autonomo', 'tenant', 'equipe.read'),
    ('Autonomo', 'tenant', 'equipe.manage')
)
insert into public.role_permissions (role_id, permission_id)
select r.id, p.id
from role_permission_seed seed
join public.roles r on r.nome = seed.role_nome and r.escopo = seed.role_escopo
join public.permissions p on p.codigo = seed.permission_codigo
on conflict (role_id, permission_id) do nothing;
