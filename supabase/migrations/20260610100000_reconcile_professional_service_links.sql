-- Materializes legacy professional/service capabilities only when an exact,
-- active specialty relationship already exists on both sides. Future changes
-- remain explicit through the team maintenance flow.

with legacy_aliases(legacy_name, canonical_key) as (
  values
    ('escova', 'escova_simples'),
    ('progressiva', 'escova_progressiva'),
    ('colorimetria', 'coloracao_global')
),
canonical_specialties as (
  select distinct on (e.taxonomy_specialty_key)
    e.taxonomy_specialty_key,
    e.id
  from public.especialidades e
  where e.tenant_id is null
    and e.is_official = true
    and e.ativo = true
    and e.deleted_at is null
    and e.taxonomy_specialty_key is not null
  order by e.taxonomy_specialty_key, e.created_at
)
insert into public.profissional_especialidades (
  tenant_id,
  profissional_id,
  especialidade_id,
  ativo,
  deleted_at
)
select distinct
  pe.tenant_id,
  pe.profissional_id,
  canonical.id,
  true,
  null
from public.profissional_especialidades pe
join public.especialidades legacy
  on legacy.id = pe.especialidade_id
join legacy_aliases alias
  on alias.legacy_name = lower(trim(legacy.nome))
join canonical_specialties canonical
  on canonical.taxonomy_specialty_key = alias.canonical_key
where pe.ativo = true
  and pe.deleted_at is null
  and not exists (
    select 1
    from public.profissional_especialidades existing
    where existing.profissional_id = pe.profissional_id
      and existing.especialidade_id = canonical.id
      and existing.deleted_at is null
  )
on conflict do nothing;

with canonical_specialties as (
  select distinct on (e.taxonomy_specialty_key)
    e.taxonomy_specialty_key,
    e.id
  from public.especialidades e
  where e.tenant_id is null
    and e.is_official = true
    and e.ativo = true
    and e.deleted_at is null
    and e.taxonomy_specialty_key is not null
  order by e.taxonomy_specialty_key, e.created_at
)
insert into public.servico_especialidades (
  tenant_id,
  servico_id,
  especialidade_id,
  ativo,
  deleted_at
)
select distinct
  s.tenant_id,
  s.id,
  canonical.id,
  true,
  null
from public.servicos s
join public.taxonomia_servico_especialidades taxonomy_link
  on taxonomy_link.servico_key = s.taxonomy_service_key
join canonical_specialties canonical
  on canonical.taxonomy_specialty_key = taxonomy_link.especialidade_key
where s.ativo = true
  and s.deleted_at is null
  and s.taxonomy_service_key is not null
on conflict (tenant_id, servico_id, especialidade_id) do update
set
  ativo = true,
  deleted_at = null,
  updated_at = now();

insert into public.profissional_servicos (
  tenant_id,
  profissional_id,
  servico_id,
  duracao_minutos,
  preco,
  percentual_comissao,
  ativo,
  deleted_at
)
select distinct
  p.tenant_id,
  p.id,
  s.id,
  s.duracao_minutos,
  s.preco,
  p.percentual_comissao,
  true,
  null
from public.profissionais p
join public.profissional_especialidades pe
  on pe.tenant_id = p.tenant_id
 and pe.profissional_id = p.id
 and pe.ativo = true
 and pe.deleted_at is null
join public.servico_especialidades se
  on se.tenant_id = p.tenant_id
 and se.especialidade_id = pe.especialidade_id
 and se.ativo = true
 and se.deleted_at is null
join public.especialidades e
  on e.id = pe.especialidade_id
 and e.ativo = true
 and e.deleted_at is null
 and (e.tenant_id is null or e.tenant_id = p.tenant_id)
join public.servicos s
  on s.id = se.servico_id
 and s.tenant_id = p.tenant_id
 and s.ativo = true
 and s.deleted_at is null
where p.ativo = true
  and p.deleted_at is null
  and e.taxonomy_category_key = coalesce(s.taxonomy_category_key, s.categoria)
on conflict (profissional_id, servico_id) do update
set
  tenant_id = excluded.tenant_id,
  duracao_minutos = excluded.duracao_minutos,
  preco = excluded.preco,
  percentual_comissao = excluded.percentual_comissao,
  ativo = true,
  deleted_at = null,
  updated_at = now();
