alter table public.configuracoes_tenant
  add column if not exists tolerancia_intervalo_min integer not null default 0,
  add column if not exists tolerancia_fim_expediente_min integer not null default 0;

alter table public.configuracoes_tenant
  drop constraint if exists configuracoes_tenant_schedule_tolerances_check,
  add constraint configuracoes_tenant_schedule_tolerances_check
    check (
      tolerancia_intervalo_min between 0 and 60
      and tolerancia_fim_expediente_min between 0 and 60
    );
