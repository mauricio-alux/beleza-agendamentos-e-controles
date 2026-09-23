-- Reconcile active official hair specialties that still point to legacy
-- hairdresser cargo aliases. Keep the legacy cargos inactive/deleted and
-- preserve existing specialty IDs plus all tenant/professional dependencies.

do $$
declare
  v_canonical_cargo_id uuid := '87a58a4b-41bb-4cf5-8cfd-c0522ad6a47c';
  v_updated_count integer := 0;
begin
  if not exists (
    select 1
    from public.cargos c
    where c.id = v_canonical_cargo_id
      and c.nome = 'Cabeleireira'
      and c.ativo = true
      and c.deleted_at is null
  ) then
    raise exception 'Canonical cargo Cabeleireira is not active and available.';
  end if;

  if exists (
    select 1
    from public.taxonomia_especialidades te
    where te.key in ('corte_feminino', 'luzes')
      and (
        te.ativo is not true
        or te.cargo_nome <> 'Cabeleireira'
        or te.categoria_key <> 'cabelo'
      )
  ) then
    raise exception 'Official taxonomy does not confirm Cabeleireira as canonical cargo for Corte Feminino and Luzes.';
  end if;

  if exists (
    select 1
    from public.especialidades legacy
    join public.cargos legacy_cargo
      on legacy_cargo.id = legacy.cargo_id
    join public.taxonomia_especialidades te
      on te.key = legacy.taxonomy_specialty_key
     and te.nome = legacy.nome
     and te.cargo_nome = 'Cabeleireira'
     and te.ativo = true
    join public.especialidades duplicate
      on duplicate.cargo_id = v_canonical_cargo_id
     and lower(trim(duplicate.nome)) = lower(trim(legacy.nome))
     and duplicate.id <> legacy.id
     and duplicate.deleted_at is null
     and duplicate.ativo = true
    where legacy.ativo = true
      and legacy.deleted_at is null
      and legacy.is_official = true
      and legacy.tenant_id is null
      and lower(trim(legacy_cargo.nome)) in ('cabeleireira/o', 'cabeleireiro')
      and (legacy_cargo.ativo = false or legacy_cargo.deleted_at is not null)
  ) then
    raise exception 'Active canonical specialty duplicate found; dependency remap is required before cargo reconciliation.';
  end if;

  update public.especialidades e
  set cargo_id = v_canonical_cargo_id,
      metadata = coalesce(e.metadata, '{}'::jsonb) || jsonb_build_object(
        'origem_reconciliacao_cargo',
        '20260824190000_reconcile_legacy_hairdresser_specialty_cargo',
        'cargo_id_anterior',
        e.cargo_id,
        'cargo_canonico',
        'Cabeleireira'
      )
  from public.cargos legacy_cargo
  join public.taxonomia_especialidades te
    on te.cargo_nome = 'Cabeleireira'
   and te.ativo = true
  where e.cargo_id = legacy_cargo.id
    and e.taxonomy_specialty_key = te.key
    and e.nome = te.nome
    and e.taxonomy_category_key = te.categoria_key
    and e.ativo = true
    and e.deleted_at is null
    and e.is_official = true
    and e.tenant_id is null
    and lower(trim(legacy_cargo.nome)) in ('cabeleireira/o', 'cabeleireiro')
    and (legacy_cargo.ativo = false or legacy_cargo.deleted_at is not null);

  get diagnostics v_updated_count = row_count;
  raise notice 'Reconciled active hair specialties from legacy cargo aliases to Cabeleireira: %', v_updated_count;
end $$;
