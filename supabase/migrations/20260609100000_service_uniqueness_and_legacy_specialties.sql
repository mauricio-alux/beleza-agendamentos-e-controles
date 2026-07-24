-- Prevents duplicate active services per tenant/category and consolidates
-- specialties that still reference deprecated makeup cargo aliases.

create unique index if not exists idx_servicos_tenant_nome_categoria_active_unique
  on public.servicos (
    tenant_id,
    lower(trim(nome)),
    coalesce(categoria, '')
  )
  where ativo = true and deleted_at is null;

create temp table legacy_makeup_specialty_map
on commit drop
as
select
  legacy_specialty.id as legacy_id,
  canonical_specialty.id as canonical_id
from public.cargos legacy_cargo
join public.especialidades legacy_specialty
  on legacy_specialty.cargo_id = legacy_cargo.id
 and legacy_specialty.deleted_at is null
join public.cargos canonical_cargo
  on lower(trim(canonical_cargo.nome)) = 'maquiadora'
 and canonical_cargo.ativo = true
 and canonical_cargo.deleted_at is null
join public.especialidades canonical_specialty
  on canonical_specialty.cargo_id = canonical_cargo.id
 and lower(trim(canonical_specialty.nome)) = lower(trim(legacy_specialty.nome))
 and canonical_specialty.ativo = true
 and canonical_specialty.deleted_at is null
where lower(trim(legacy_cargo.nome)) in ('maquiador/a', 'maquiador');

update public.profissional_especialidades link
set especialidade_id = map.canonical_id
from legacy_makeup_specialty_map map
where link.especialidade_id = map.legacy_id
  and link.deleted_at is null
  and not exists (
    select 1
    from public.profissional_especialidades existing
    where existing.profissional_id = link.profissional_id
      and existing.especialidade_id = map.canonical_id
      and existing.deleted_at is null
  );

update public.profissional_especialidades link
set
  ativo = false,
  deleted_at = now()
from legacy_makeup_specialty_map map
where link.especialidade_id = map.legacy_id
  and link.deleted_at is null;

update public.servico_especialidades canonical_link
set
  ativo = true,
  deleted_at = null
from public.servico_especialidades legacy_link
join legacy_makeup_specialty_map map
  on map.legacy_id = legacy_link.especialidade_id
where canonical_link.tenant_id = legacy_link.tenant_id
  and canonical_link.servico_id = legacy_link.servico_id
  and canonical_link.especialidade_id = map.canonical_id
  and legacy_link.deleted_at is null;

update public.servico_especialidades link
set especialidade_id = map.canonical_id
from legacy_makeup_specialty_map map
where link.especialidade_id = map.legacy_id
  and link.deleted_at is null
  and not exists (
    select 1
    from public.servico_especialidades existing
    where existing.tenant_id = link.tenant_id
      and existing.servico_id = link.servico_id
      and existing.especialidade_id = map.canonical_id
  );

update public.servico_especialidades link
set
  ativo = false,
  deleted_at = now()
from legacy_makeup_specialty_map map
where link.especialidade_id = map.legacy_id
  and link.deleted_at is null;

update public.especialidades specialty
set
  ativo = false,
  deleted_at = coalesce(specialty.deleted_at, now())
from legacy_makeup_specialty_map map
where specialty.id = map.legacy_id
  and specialty.deleted_at is null;
