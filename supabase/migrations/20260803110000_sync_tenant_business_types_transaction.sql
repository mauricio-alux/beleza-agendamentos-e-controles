-- Bellory - sincronizacao transacional dos tipos de negocio do tenant.
-- Mantem a manutencao tenant-scoped sem alterar catalogo global.

create or replace function public.sync_tenant_business_types(
  p_tenant_id uuid,
  p_rows jsonb
)
returns setof public.tenant_tipos_negocio
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_tenant_id is null then
    raise exception 'tenant_id obrigatorio';
  end if;

  update public.tenant_tipos_negocio
     set ativo = false,
         principal = false,
         atualizado_em = now()
   where tenant_id = p_tenant_id;

  insert into public.tenant_tipos_negocio (
    tenant_id,
    tipo_negocio_id,
    principal,
    ativo,
    descricao_tipo_negocio
  )
  select
    p_tenant_id,
    row.tipo_negocio_id,
    coalesce(row.principal, false),
    true,
    row.descricao_tipo_negocio
  from jsonb_to_recordset(coalesce(p_rows, '[]'::jsonb)) as row(
    tipo_negocio_id uuid,
    principal boolean,
    descricao_tipo_negocio text
  )
  on conflict (tenant_id, tipo_negocio_id)
  do update set
    principal = excluded.principal,
    ativo = true,
    descricao_tipo_negocio = excluded.descricao_tipo_negocio,
    atualizado_em = now();

  return query
  select *
    from public.tenant_tipos_negocio
   where tenant_id = p_tenant_id
     and ativo = true
   order by principal desc, criado_em asc;
end;
$$;

revoke all on function public.sync_tenant_business_types(uuid, jsonb) from public, anon, authenticated;
grant execute on function public.sync_tenant_business_types(uuid, jsonb) to service_role;
