-- Synchronizes owner professional metadata with the active owner membership.
-- This fixes tenants promoted from Autonomo to Administrador before the team
-- card started persisting the promotion on profissionais.metadata.

update public.profissionais p
set metadata = jsonb_set(
  jsonb_set(
    coalesce(p.metadata, '{}'::jsonb),
    '{tipo_usuario}',
    to_jsonb(tm.role),
    true
  ),
  '{vinculo_tipo}',
  to_jsonb('owner'::text),
  true
)
from public.tenant_memberships tm
where tm.tenant_id = p.tenant_id
  and tm.usuario_id = p.usuario_id
  and tm.is_owner = true
  and tm.status = 'ativo'
  and tm.role in ('Administrador', 'Autonomo')
  and p.deleted_at is null
  and (
    p.metadata->>'tipo_usuario' is distinct from tm.role
    or p.metadata->>'vinculo_tipo' is distinct from 'owner'
  );
