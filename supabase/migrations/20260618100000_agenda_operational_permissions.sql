-- Granular agenda operational permissions.
-- Keeps tenant isolation in services/controllers while allowing attendants to
-- execute only the operational actions granted to their role/cargo.

insert into public.permissions (codigo, recurso, acao, escopo, descricao)
values
  ('agenda.confirm', 'agenda', 'confirm', 'tenant', 'Confirmar agendamentos pendentes'),
  ('agenda.cancel', 'agenda', 'cancel', 'tenant', 'Cancelar agendamentos'),
  ('agenda.reschedule', 'agenda', 'reschedule', 'tenant', 'Reagendar agendamentos'),
  ('agenda.complete', 'agenda', 'complete', 'tenant', 'Concluir atendimentos'),
  ('agenda.no_show', 'agenda', 'no_show', 'tenant', 'Marcar nao comparecimento')
on conflict (codigo) do update
set
  recurso = excluded.recurso,
  acao = excluded.acao,
  escopo = excluded.escopo,
  descricao = excluded.descricao,
  ativo = true,
  updated_at = now();

with role_permission_seed(role_nome, role_escopo, permission_codigo) as (
  values
    ('Administrador', 'tenant', 'agenda.confirm'),
    ('Administrador', 'tenant', 'agenda.cancel'),
    ('Administrador', 'tenant', 'agenda.reschedule'),
    ('Administrador', 'tenant', 'agenda.complete'),
    ('Administrador', 'tenant', 'agenda.no_show'),
    ('Gerente', 'tenant', 'agenda.confirm'),
    ('Gerente', 'tenant', 'agenda.cancel'),
    ('Gerente', 'tenant', 'agenda.reschedule'),
    ('Gerente', 'tenant', 'agenda.complete'),
    ('Gerente', 'tenant', 'agenda.no_show'),
    ('Autonomo', 'tenant', 'agenda.confirm'),
    ('Autonomo', 'tenant', 'agenda.cancel'),
    ('Autonomo', 'tenant', 'agenda.reschedule'),
    ('Autonomo', 'tenant', 'agenda.complete'),
    ('Autonomo', 'tenant', 'agenda.no_show'),
    ('Profissional', 'tenant', 'agenda.confirm'),
    ('Profissional', 'tenant', 'agenda.cancel'),
    ('Profissional', 'tenant', 'agenda.reschedule'),
    ('Profissional', 'tenant', 'agenda.complete'),
    ('Profissional', 'tenant', 'agenda.no_show'),
    ('Recepcionista', 'tenant', 'agenda.confirm'),
    ('Recepcionista', 'tenant', 'agenda.cancel'),
    ('Recepcionista', 'tenant', 'agenda.reschedule'),
    ('Profissional Adm', 'tenant', 'agenda.confirm'),
    ('Funcionario', 'tenant', 'agenda.confirm'),
    ('Funcionario', 'tenant', 'agenda.cancel'),
    ('Funcionario', 'tenant', 'agenda.reschedule'),
    ('Funcionario', 'tenant', 'agenda.complete'),
    ('Funcionario', 'tenant', 'agenda.no_show'),
    ('Terceiro', 'tenant', 'agenda.confirm'),
    ('Terceiro', 'tenant', 'agenda.cancel'),
    ('Terceiro', 'tenant', 'agenda.reschedule'),
    ('Terceiro', 'tenant', 'agenda.complete'),
    ('Terceiro', 'tenant', 'agenda.no_show')
)
insert into public.role_permissions (role_id, permission_id)
select r.id, p.id
from role_permission_seed seed
join public.roles r on r.nome = seed.role_nome and r.escopo = seed.role_escopo
join public.permissions p on p.codigo = seed.permission_codigo
on conflict (role_id, permission_id) do nothing;
