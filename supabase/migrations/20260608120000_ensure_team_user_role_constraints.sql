-- Ensures current operational team roles are accepted even in environments
-- where the earlier team role refactor migration was not applied.

alter table public.tenant_memberships
  drop constraint if exists tenant_memberships_role_check;

alter table public.tenant_memberships
  add constraint tenant_memberships_role_check check (
    role in (
      'Administrador',
      'Gerente',
      'Profissional',
      'Recepcionista',
      'Financeiro',
      'Autonomo',
      'Funcionario',
      'Terceiro',
      'Profissional Adm',
      'Cliente'
    )
  );

alter table public.usuarios
  drop constraint if exists usuarios_tipo_usuario_check;

alter table public.usuarios
  add constraint usuarios_tipo_usuario_check check (
    tipo_usuario in (
      'MasterAdmin',
      'Administrador',
      'Gerente',
      'Profissional',
      'Recepcionista',
      'Financeiro',
      'Autonomo',
      'Funcionario',
      'Terceiro',
      'Profissional Adm',
      'Cliente'
    )
  );
