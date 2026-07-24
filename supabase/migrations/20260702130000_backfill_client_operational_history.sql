-- Bellory - backfill idempotente do historico operacional do cliente.

do $$
declare
  existing_history_count integer := 0;
  eligible_appointments_count integer := 0;
  pending_insert_count integer := 0;
  inserted_count integer := 0;
  ignored_count integer := 0;
begin
  select count(*)
  into existing_history_count
  from public.cliente_historico_atendimentos;

  select count(*)
  into eligible_appointments_count
  from public.agendamentos a
  where a.status in ('concluido', 'no_show')
    and a.deleted_at is null;

  select count(*)
  into pending_insert_count
  from public.agendamentos a
  where a.status in ('concluido', 'no_show')
    and a.deleted_at is null
    and not exists (
      select 1
      from public.cliente_historico_atendimentos h
      where h.tenant_id = a.tenant_id
        and h.agendamento_id = a.id
    );

  raise notice 'cliente_historico_atendimentos existentes antes do backfill: %', existing_history_count;
  raise notice 'agendamentos elegiveis para backfill: %', eligible_appointments_count;
  raise notice 'registros que serao inseridos: %', pending_insert_count;

  with eligible_appointments as (
    select
      a.id,
      a.tenant_id,
      a.cliente_id,
      a.profissional_id,
      a.status,
      case
        when a.status = 'concluido' then coalesce(a.concluido_em, a.data_inicio)
        else a.data_inicio
      end as data_atendimento,
      a.valor_total,
      service_link.servico_id,
      service_link.nome_servico,
      service_link.valor_servico
    from public.agendamentos a
    left join lateral (
      select
        ags.servico_id,
        ags.nome_servico,
        ags.valor_servico
      from public.agendamento_servicos ags
      where ags.agendamento_id = a.id
        and ags.tenant_id = a.tenant_id
        and ags.deleted_at is null
      order by ags.created_at asc
      limit 1
    ) service_link on true
    where a.status in ('concluido', 'no_show')
      and a.deleted_at is null
  ),
  inserted_history as (
    insert into public.cliente_historico_atendimentos (
      tenant_id,
      cliente_id,
      agendamento_id,
      profissional_id,
      servico_id,
      status,
      data_atendimento,
      valor_servico,
      origem,
      metadata
    )
    select
      appointment.tenant_id,
      appointment.cliente_id,
      appointment.id,
      appointment.profissional_id,
      appointment.servico_id,
      appointment.status,
      appointment.data_atendimento,
      coalesce(nullif(appointment.valor_total, 0), appointment.valor_servico),
      'agenda_backfill',
      jsonb_strip_nulls(jsonb_build_object(
        'backfill', true,
        'backfilled_at', now(),
        'nome_servico', appointment.nome_servico,
        'valor_total_agendamento', appointment.valor_total,
        'valor_servico', appointment.valor_servico
      ))
    from eligible_appointments appointment
    on conflict (tenant_id, agendamento_id) do nothing
    returning 1
  )
  select count(*)
  into inserted_count
  from inserted_history;

  ignored_count := eligible_appointments_count - inserted_count;

  raise notice 'total de registros inseridos no backfill: %', inserted_count;
  raise notice 'total de registros ignorados por ja existirem: %', ignored_count;
end $$;
