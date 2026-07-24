-- Refactor team professional classification.
-- New team dropdown roles:
-- - Funcionario: beauty/wellness service provider with direct salon link.
-- - Terceiro: external/partner service provider.
-- - Profissional Adm: administrative/operational support, not a service executor.

alter table public.tenant_memberships
  drop constraint if exists tenant_memberships_role_check;

alter table public.tenant_memberships
  add constraint tenant_memberships_role_check check (
    role in ('Administrador', 'Gerente', 'Profissional', 'Recepcionista', 'Financeiro', 'Autonomo', 'Funcionario', 'Terceiro', 'Profissional Adm', 'Cliente')
  );

alter table public.usuarios
  drop constraint if exists usuarios_tipo_usuario_check;

alter table public.usuarios
  add constraint usuarios_tipo_usuario_check check (
    tipo_usuario in ('MasterAdmin', 'Administrador', 'Gerente', 'Profissional', 'Recepcionista', 'Financeiro', 'Autonomo', 'Funcionario', 'Terceiro', 'Profissional Adm', 'Cliente')
  );

update public.profissionais
set metadata = jsonb_set(
  coalesce(metadata, '{}'::jsonb),
  '{tipo_usuario}',
  to_jsonb(
    case metadata->>'tipo_usuario'
      when 'Profissional' then 'Funcionario'
      when 'Autonomo' then 'Terceiro'
      when 'Recepcionista' then 'Profissional Adm'
      else metadata->>'tipo_usuario'
    end
  ),
  true
)
where metadata->>'tipo_usuario' in ('Profissional', 'Autonomo', 'Recepcionista');

update public.profissionais
set
  aceita_agendamento_online = false,
  metadata = jsonb_set(coalesce(metadata, '{}'::jsonb), '{agenda_executante}', 'false'::jsonb, true)
where metadata->>'tipo_usuario' = 'Profissional Adm';

update public.profissional_servicos ps
set
  ativo = false,
  deleted_at = coalesce(ps.deleted_at, now())
from public.profissionais p
where ps.profissional_id = p.id
  and ps.tenant_id = p.tenant_id
  and p.metadata->>'tipo_usuario' = 'Profissional Adm'
  and ps.deleted_at is null;

update public.tenant_memberships
set role = case
  when role = 'Profissional' then 'Funcionario'
  when role = 'Recepcionista' then 'Profissional Adm'
  when role = 'Autonomo' and coalesce(is_owner, false) = false then 'Terceiro'
  else role
end
where role in ('Profissional', 'Recepcionista')
   or (role = 'Autonomo' and coalesce(is_owner, false) = false);

update public.usuarios u
set tipo_usuario = tm.role
from public.tenant_memberships tm
where tm.usuario_id = u.id
  and tm.is_primary = true
  and tm.status = 'ativo'
  and u.tipo_usuario <> 'MasterAdmin'
  and u.tipo_usuario in ('Profissional', 'Recepcionista', 'Autonomo')
  and tm.role in ('Funcionario', 'Terceiro', 'Profissional Adm', 'Autonomo');

insert into public.roles (nome, display_name, escopo, dashboard, descricao)
values
  ('Profissional Adm', 'Profissional Adm', 'tenant', 'admin_staff', 'Apoio administrativo sem execucao de servicos de beleza')
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
    ('Profissional Adm', 'tenant', 'clientes.read')
)
insert into public.role_permissions (role_id, permission_id)
select r.id, p.id
from role_permission_seed seed
join public.roles r on r.nome = seed.role_nome and r.escopo = seed.role_escopo
join public.permissions p on p.codigo = seed.permission_codigo
on conflict (role_id, permission_id) do nothing;
