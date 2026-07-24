-- Supports the operational completion lifecycle for appointments.
-- Confirmed appointments can be completed manually or automatically after
-- the tolerance window, while no-show appointments remain terminal.

alter table public.agendamentos
  drop constraint if exists agendamentos_status_check;

alter table public.agendamentos
  add constraint agendamentos_status_check check (
    status in (
      'solicitado',
      'pendente',
      'pendente_atendente',
      'pendente_cliente',
      'confirmado',
      'cancelado',
      'concluido',
      'no_show',
      'reagendado',
      'expirado_atendente',
      'expirado_cliente',
      'suspeito'
    )
  );

create index if not exists idx_agendamentos_auto_completion
  on public.agendamentos (tenant_id, data_fim)
  where status = 'confirmado'
    and deleted_at is null;

