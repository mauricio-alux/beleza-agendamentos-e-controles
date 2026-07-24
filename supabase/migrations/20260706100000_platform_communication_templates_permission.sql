-- Platform permission for MasterAdmin communication template maintenance.

insert into public.permissions (codigo, recurso, acao, escopo, descricao)
values (
  'platform.communication.templates.manage',
  'platform.communication.templates',
  'manage',
  'platform',
  'Gerenciar templates globais e por tenant da comunicacao'
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
join public.permissions p on p.codigo = 'platform.communication.templates.manage'
where r.nome = 'MasterAdmin'
  and r.escopo = 'platform'
on conflict (role_id, permission_id) do nothing;
