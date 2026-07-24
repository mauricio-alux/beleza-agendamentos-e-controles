-- Autonomo context.
-- An Autonomo can own an individual operation or work as an independent partner in another tenant.

alter table public.tenant_memberships
  add column if not exists vinculo_tipo varchar(30) not null default 'member',
  add column if not exists is_owner boolean not null default false,
  add column if not exists marketplace_enabled boolean not null default false,
  add column if not exists marketplace_profile jsonb not null default '{}'::jsonb,
  add column if not exists metadata jsonb not null default '{}'::jsonb;

alter table public.tenant_memberships
  drop constraint if exists tenant_memberships_vinculo_tipo_check;

update public.tenant_memberships
set
  vinculo_tipo = case
    when role in ('Administrador', 'Autonomo') and is_primary = true then 'owner'
    when role = 'Terceiro' then 'partner'
    when role = 'Cliente' then 'client'
    else 'staff'
  end,
  is_owner = role in ('Administrador', 'Autonomo') and is_primary = true,
  metadata = metadata || jsonb_build_object(
    'autonomo_context_ready',
    case when role = 'Autonomo' then true else false end
  ),
  updated_at = now()
where vinculo_tipo = 'member'
   or vinculo_tipo is null;

alter table public.tenant_memberships
  add constraint tenant_memberships_vinculo_tipo_check check (
    vinculo_tipo in ('owner', 'staff', 'partner', 'marketplace', 'client')
  );

create index if not exists idx_tenant_memberships_autonomo_context
  on public.tenant_memberships (usuario_id, role, vinculo_tipo, is_owner);

create index if not exists idx_tenant_memberships_marketplace
  on public.tenant_memberships (marketplace_enabled, role)
  where marketplace_enabled = true;
