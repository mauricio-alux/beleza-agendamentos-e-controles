-- Bellory - Fase 8.2: migracao das FKs remanescentes do MER legado.
-- Migration de transicao. Nao remove fisicamente tabelas ou colunas legadas.

do $$
begin
  if exists (
    select 1
    from public.cupom_servicos
    where escopo = 'servico_legado'
      and deleted_at is null
  ) then
    raise exception 'Existem cupom_servicos ativos com escopo servico_legado. Recrie/migre esses registros antes da Fase 8.2.';
  end if;
end $$;

alter table if exists public.agendamento_servicos
  drop constraint if exists agendamento_servicos_servico_id_fkey,
  drop constraint if exists agendamento_servicos_servico_especialidade_id_fkey,
  drop constraint if exists agendamento_servicos_service_reference_check;

alter table if exists public.agendamento_servicos
  add constraint agendamento_servicos_service_reference_check check (
    servico_tenant_id is not null
    or nome_servico is not null
    or servico_id is not null
  );

alter table if exists public.cliente_historico_atendimentos
  drop constraint if exists cliente_historico_atendimentos_servico_id_fkey,
  drop constraint if exists cliente_historico_atendimentos_servico_especialidade_id_fkey;

alter table if exists public.campanhas
  drop constraint if exists campanhas_servico_id_fkey;

alter table if exists public.cliente_tenants
  drop constraint if exists cliente_tenants_servico_mais_recente_fkey;

alter table if exists public.cupom_servicos
  drop constraint if exists cupom_servicos_servico_id_fkey,
  drop constraint if exists cupom_servicos_scope_check,
  drop constraint if exists cupom_servicos_scope_reference_check;

alter table if exists public.cupom_servicos
  add constraint cupom_servicos_scope_check check (
    escopo in ('geral', 'servico', 'especialidade', 'combinacao')
  ),
  add constraint cupom_servicos_scope_reference_check check (
    (escopo = 'geral')
    or (escopo = 'servico' and servico_tenant_id is not null)
    or (escopo = 'especialidade' and especialidade_id is not null)
    or (escopo = 'combinacao' and servico_tenant_especialidade_id is not null)
  );

alter table if exists public.cupom_especialidades
  drop constraint if exists cupom_especialidades_servico_id_fkey,
  drop constraint if exists cupom_especialidades_servico_especialidade_id_fkey;

alter table if exists public.profissional_servicos
  drop constraint if exists profissional_servicos_servico_id_fkey;

alter table if exists public.servico_especialidades
  drop constraint if exists servico_especialidades_servico_id_fkey;

comment on column public.agendamento_servicos.servico_id is
  'Fase 8.2: coluna legada preservada apenas para transicao/snapshot historico; sem FK para public.servicos.';
comment on column public.agendamento_servicos.servico_especialidade_id is
  'Fase 8.2: coluna legada preservada apenas para transicao/snapshot historico; sem FK para public.servico_especialidades.';
comment on column public.cliente_historico_atendimentos.servico_id is
  'Fase 8.2: coluna legada preservada apenas para historico antigo; sem FK para public.servicos.';
comment on column public.cliente_historico_atendimentos.servico_especialidade_id is
  'Fase 8.2: coluna legada preservada apenas para historico antigo; sem FK para public.servico_especialidades.';
comment on column public.campanhas.servico_id is
  'Fase 8.2: coluna legada sem uso operacional; campanhas novas usam servico_catalogo_id, servico_tenant_id ou servico_tenant_especialidade_id.';
comment on column public.cupom_servicos.servico_id is
  'Fase 8.2: coluna legada sem uso operacional; escopos novos usam servico_tenant_id, especialidade_id ou servico_tenant_especialidade_id.';
comment on column public.cupom_especialidades.servico_id is
  'Fase 8.2: coluna legada sem FK; tabela preservada ate remocao final do legado.';
comment on column public.cupom_especialidades.servico_especialidade_id is
  'Fase 8.2: coluna legada sem FK; tabela preservada ate remocao final do legado.';
comment on column public.cliente_tenants.servico_mais_recente is
  'Fase 8.2: coluna legada sem FK; leituras novas devem usar historico/snapshots do novo MER.';
