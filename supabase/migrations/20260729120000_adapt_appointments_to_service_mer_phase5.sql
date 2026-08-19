-- Bellory - Fase 5: snapshots de Agenda/Historico para o novo MER de Servicos.
-- Migration nao destrutiva: preserva colunas legadas e adiciona referencias ao novo MER.

alter table public.agendamento_servicos
  alter column servico_id drop not null,
  add column if not exists servico_catalogo_id uuid references public.servicos_catalogo(id) on delete restrict,
  add column if not exists servico_tenant_id uuid references public.servico_tenants(id) on delete restrict,
  add column if not exists servico_tenant_especialidade_id uuid references public.servico_tenant_especialidades(id) on delete restrict;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'agendamento_servicos_service_reference_check'
      and conrelid = 'public.agendamento_servicos'::regclass
  ) then
    alter table public.agendamento_servicos
      add constraint agendamento_servicos_service_reference_check
      check (servico_id is not null or servico_tenant_id is not null);
  end if;
end $$;

create index if not exists idx_agendamento_servicos_servico_tenant
  on public.agendamento_servicos (tenant_id, servico_tenant_id)
  where deleted_at is null;

create index if not exists idx_agendamento_servicos_servico_tenant_especialidade
  on public.agendamento_servicos (tenant_id, servico_tenant_especialidade_id)
  where deleted_at is null;

alter table public.cliente_historico_atendimentos
  add column if not exists especialidade_id uuid references public.especialidades(id) on delete set null,
  add column if not exists servico_especialidade_id uuid references public.servico_especialidades(id) on delete set null,
  add column if not exists servico_catalogo_id uuid references public.servicos_catalogo(id) on delete set null,
  add column if not exists servico_tenant_id uuid references public.servico_tenants(id) on delete set null,
  add column if not exists servico_tenant_especialidade_id uuid references public.servico_tenant_especialidades(id) on delete set null,
  add column if not exists nome_especialidade varchar(150),
  add column if not exists duracao_minutos integer;

create index if not exists idx_cliente_historico_servico_tenant
  on public.cliente_historico_atendimentos (tenant_id, servico_tenant_id, data_atendimento desc)
  where deleted_at is null;

create index if not exists idx_cliente_historico_servico_tenant_especialidade
  on public.cliente_historico_atendimentos (tenant_id, servico_tenant_especialidade_id, data_atendimento desc)
  where deleted_at is null;
