-- Bellory - Fase 8.3: remocao fisica final do MER legado de Servicos.
-- Requer backup remoto validado em backup_phase8_3_20260729_pre_drop.
-- Nao usa CASCADE e nao remove objetos do novo MER oficial.

do $phase83$
declare
  missing_backup text;
  external_fk_count integer;
  public_count integer;
  backup_count integer;
begin
  select string_agg(t.table_name, ', ' order by t.table_name)
    into missing_backup
  from (
    values
      ('servicos'),
      ('servico_especialidades'),
      ('profissional_servicos')
  ) as t(table_name)
  where to_regclass('backup_phase8_3_20260729_pre_drop.' || t.table_name) is null;

  if missing_backup is not null then
    raise exception 'Fase 8.3 bloqueada: backup ausente para %.', missing_backup;
  end if;

  select count(*)
    into external_fk_count
  from pg_constraint con
  where con.contype = 'f'
    and con.confrelid in (
      'public.servicos'::regclass,
      'public.servico_especialidades'::regclass,
      'public.profissional_servicos'::regclass
    )
    and con.conrelid not in (
      'public.servicos'::regclass,
      'public.servico_especialidades'::regclass,
      'public.profissional_servicos'::regclass
    );

  if external_fk_count > 0 then
    raise exception 'Fase 8.3 bloqueada: ainda existem % FKs externas para o MER legado.', external_fk_count;
  end if;

  execute 'select count(*) from public.servicos' into public_count;
  execute 'select count(*) from backup_phase8_3_20260729_pre_drop.servicos' into backup_count;
  if public_count <> backup_count then
    raise exception 'Fase 8.3 bloqueada: backup inconsistente para servicos (% <> %).', public_count, backup_count;
  end if;

  execute 'select count(*) from public.servico_especialidades' into public_count;
  execute 'select count(*) from backup_phase8_3_20260729_pre_drop.servico_especialidades' into backup_count;
  if public_count <> backup_count then
    raise exception 'Fase 8.3 bloqueada: backup inconsistente para servico_especialidades (% <> %).', public_count, backup_count;
  end if;

  execute 'select count(*) from public.profissional_servicos' into public_count;
  execute 'select count(*) from backup_phase8_3_20260729_pre_drop.profissional_servicos' into backup_count;
  if public_count <> backup_count then
    raise exception 'Fase 8.3 bloqueada: backup inconsistente para profissional_servicos (% <> %).', public_count, backup_count;
  end if;
end
$phase83$;

drop policy if exists profissional_servicos_insert_by_tenant on public.profissional_servicos;
drop policy if exists profissional_servicos_select_by_tenant on public.profissional_servicos;
drop policy if exists profissional_servicos_update_by_tenant on public.profissional_servicos;
drop policy if exists servico_especialidades_insert_by_tenant on public.servico_especialidades;
drop policy if exists servico_especialidades_select_by_tenant on public.servico_especialidades;
drop policy if exists servico_especialidades_update_by_tenant on public.servico_especialidades;
drop policy if exists servicos_insert_by_tenant on public.servicos;
drop policy if exists servicos_select_by_tenant on public.servicos;
drop policy if exists servicos_update_by_tenant on public.servicos;

drop trigger if exists set_updated_at on public.profissional_servicos;
drop trigger if exists set_updated_at on public.servico_especialidades;
drop trigger if exists set_updated_at on public.servicos;

alter table if exists public.profissional_servicos
  drop constraint if exists profissional_servicos_profissional_id_fkey,
  drop constraint if exists profissional_servicos_tenant_id_fkey,
  drop constraint if exists profissional_servicos_unique,
  drop constraint if exists profissional_servicos_pkey;

alter table if exists public.servico_especialidades
  drop constraint if exists servico_especialidades_especialidade_id_fkey,
  drop constraint if exists servico_especialidades_tenant_id_fkey,
  drop constraint if exists servico_especialidades_unique,
  drop constraint if exists servico_especialidades_pkey;

alter table if exists public.servicos
  drop constraint if exists servicos_created_by_tenant_fkey,
  drop constraint if exists servicos_taxonomy_category_fk,
  drop constraint if exists servicos_tenant_id_fkey,
  drop constraint if exists servicos_pkey;

drop table if exists public.profissional_servicos;
drop table if exists public.servico_especialidades;
drop table if exists public.servicos;
