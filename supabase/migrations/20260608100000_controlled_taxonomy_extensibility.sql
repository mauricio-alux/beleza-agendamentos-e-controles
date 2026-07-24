-- Adds controlled tenant extensibility for services and specialties while
-- preserving the official Bellory category taxonomy.

alter table public.servicos
  add column if not exists taxonomy_category_key varchar(80),
  add column if not exists taxonomy_service_key varchar(120),
  add column if not exists is_official boolean not null default false,
  add column if not exists is_custom boolean not null default true,
  add column if not exists created_by_tenant uuid references public.tenants(id) on delete set null;

update public.servicos
set taxonomy_category_key = case lower(trim(coalesce(taxonomy_category_key, categoria)))
  when 'manicure' then 'unhas'
  when 'pedicure' then 'unhas'
  when 'estetica' then 'estetica_facial'
  when 'massagem' then 'massoterapia'
  when 'sobrancelha' then 'sobrancelhas'
  when 'tratamento' then 'terapia_capilar'
  when 'tintura_coloracao' then 'cabelo'
  else lower(trim(coalesce(taxonomy_category_key, categoria)))
end
where taxonomy_category_key is null
  and coalesce(taxonomy_category_key, categoria) is not null;

update public.servicos s
set taxonomy_service_key = ts.key,
    is_official = true,
    is_custom = false
from public.taxonomia_servicos ts
where lower(trim(s.nome)) = lower(trim(ts.nome));

update public.servicos
set created_by_tenant = tenant_id
where created_by_tenant is null;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'servicos_taxonomy_category_fk'
  ) then
    alter table public.servicos
      add constraint servicos_taxonomy_category_fk
      foreign key (taxonomy_category_key)
      references public.taxonomia_categorias(key)
      on delete restrict;
  end if;
end $$;

alter table public.servicos
  drop constraint if exists servicos_taxonomy_origin_check;

alter table public.servicos
  add constraint servicos_taxonomy_origin_check check (
    not (is_official = true and is_custom = true)
  );

alter table public.especialidades
  add column if not exists tenant_id uuid references public.tenants(id) on delete cascade,
  add column if not exists taxonomy_category_key varchar(80),
  add column if not exists taxonomy_specialty_key varchar(120),
  add column if not exists is_official boolean not null default true,
  add column if not exists is_custom boolean not null default false,
  add column if not exists created_by_tenant uuid references public.tenants(id) on delete set null,
  add column if not exists metadata jsonb not null default '{}'::jsonb;

update public.especialidades e
set taxonomy_specialty_key = te.key,
    taxonomy_category_key = te.categoria_key,
    is_official = true,
    is_custom = false
from public.taxonomia_especialidades te
where lower(trim(e.nome)) = lower(trim(te.nome));

update public.especialidades e
set taxonomy_category_key = case lower(trim(c.nome))
  when 'cabeleireira' then 'cabelo'
  when 'cabeleireira/o' then 'cabelo'
  when 'cabeleireiro' then 'cabelo'
  when 'barbeiro' then 'barba'
  when 'manicure' then 'unhas'
  when 'podologa' then 'podologia'
  when 'podologo' then 'podologia'
  when 'esteticista' then 'estetica_facial'
  when 'maquiadora' then 'maquiagem'
  when 'maquiador/a' then 'maquiagem'
  when 'massoterapeuta' then 'massoterapia'
  when 'lash designer' then 'cilios'
  when 'designer de sobrancelhas' then 'sobrancelhas'
  when 'terapeuta capilar' then 'terapia_capilar'
  else e.taxonomy_category_key
end
from public.cargos c
where c.id = e.cargo_id
  and e.taxonomy_category_key is null;

update public.especialidades
set taxonomy_category_key = 'cabelo'
where taxonomy_category_key is null;

update public.especialidades
set tenant_id = null,
    created_by_tenant = null
where is_official = true;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'especialidades_taxonomy_category_fk'
  ) then
    alter table public.especialidades
      add constraint especialidades_taxonomy_category_fk
      foreign key (taxonomy_category_key)
      references public.taxonomia_categorias(key)
      on delete restrict;
  end if;
end $$;

alter table public.especialidades
  drop constraint if exists especialidades_taxonomy_origin_check;

alter table public.especialidades
  add constraint especialidades_taxonomy_origin_check check (
    taxonomy_category_key is not null
    and not (is_official = true and is_custom = true)
    and (
      (is_official = true and tenant_id is null)
      or (is_custom = true and tenant_id is not null)
    )
  );

drop index if exists idx_especialidades_cargo_nome_unique;

create unique index if not exists idx_especialidades_official_cargo_nome_unique
  on public.especialidades (cargo_id, lower(nome))
  where deleted_at is null and tenant_id is null;

create unique index if not exists idx_especialidades_tenant_cargo_nome_unique
  on public.especialidades (tenant_id, cargo_id, lower(nome))
  where deleted_at is null and tenant_id is not null;

create index if not exists idx_especialidades_taxonomy_category
  on public.especialidades (taxonomy_category_key)
  where deleted_at is null;

create index if not exists idx_especialidades_tenant_category
  on public.especialidades (tenant_id, taxonomy_category_key)
  where deleted_at is null;

drop policy if exists especialidades_select_authenticated on public.especialidades;
create policy especialidades_select_authenticated
on public.especialidades
for select
to authenticated
using (
  deleted_at is null
  and ativo = true
  and (
    tenant_id is null
    or public.has_tenant_access(tenant_id)
  )
);

drop policy if exists especialidades_insert_master on public.especialidades;
create policy especialidades_insert_controlled on public.especialidades
for insert
to authenticated
with check (
  (
    is_official = true
    and is_custom = false
    and tenant_id is null
    and public.is_master_admin()
  )
  or (
    is_official = false
    and is_custom = true
    and tenant_id is not null
    and public.has_tenant_access(tenant_id)
  )
);

drop policy if exists especialidades_update_master on public.especialidades;
create policy especialidades_update_controlled on public.especialidades
for update
to authenticated
using (
  (
    tenant_id is null
    and public.is_master_admin()
  )
  or (
    tenant_id is not null
    and public.has_tenant_access(tenant_id)
  )
)
with check (
  (
    is_official = true
    and is_custom = false
    and tenant_id is null
    and public.is_master_admin()
  )
  or (
    is_official = false
    and is_custom = true
    and tenant_id is not null
    and public.has_tenant_access(tenant_id)
  )
);
