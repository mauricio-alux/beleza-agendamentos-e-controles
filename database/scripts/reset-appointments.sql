-- Esthya/Bellory - reset de dados de agendamento para DEV/HML.
--
-- Este script preserva tenants, clientes, cliente_tenants, tokens_cliente,
-- usuarios, profissionais, servicos, campanhas, cupons, configuracoes e demais
-- cadastros. Ele remove agendamentos e rastros operacionais gerados por eles.
--
-- Modo tenant:
--   set app.environment = 'development';
--   set app.reset_appointments_scope = 'tenant';
--   set app.reset_appointments_tenant_id = '00000000-0000-0000-0000-000000000000';
--   set app.reset_appointments_confirm = 'RESET_TENANT_APPOINTMENTS';
--
-- Modo global:
--   set app.environment = 'development';
--   set app.reset_appointments_scope = 'all';
--   set app.reset_appointments_confirm = 'RESET_ALL_APPOINTMENTS';
--
-- Execute os SETs e este arquivo na mesma sessao SQL.

begin;

create temp table _appointment_reset_config (
  scope text not null,
  tenant_id uuid
);

do $$
declare
  env_name text := lower(coalesce(current_setting('app.environment', true), ''));
  reset_scope text := lower(coalesce(current_setting('app.reset_appointments_scope', true), ''));
  confirmation text := coalesce(current_setting('app.reset_appointments_confirm', true), '');
  tenant_setting text := nullif(trim(coalesce(
    current_setting('app.reset_appointments_tenant_id', true),
    ''
  )), '');
  target_tenant_id uuid;
begin
  if env_name not in ('development', 'dev', 'homologation', 'hml', 'local', 'test') then
    raise exception
      'Reset bloqueado: app.environment deve ser development/dev/homologation/hml/local/test. Valor atual: %',
      env_name;
  end if;

  if reset_scope not in ('tenant', 'all') then
    raise exception
      'Reset bloqueado: app.reset_appointments_scope deve ser tenant ou all.';
  end if;

  if reset_scope = 'tenant' then
    if confirmation <> 'RESET_TENANT_APPOINTMENTS' then
      raise exception
        'Reset bloqueado: use app.reset_appointments_confirm = RESET_TENANT_APPOINTMENTS.';
    end if;

    if tenant_setting is null then
      raise exception
        'Reset bloqueado: informe app.reset_appointments_tenant_id.';
    end if;

    begin
      target_tenant_id := tenant_setting::uuid;
    exception
      when invalid_text_representation then
        raise exception
          'Reset bloqueado: app.reset_appointments_tenant_id nao e um UUID valido.';
    end;

    if not exists (
      select 1
      from public.tenants
      where id = target_tenant_id
        and deleted_at is null
    ) then
      raise exception
        'Reset bloqueado: tenant % nao encontrado ou excluido.',
        target_tenant_id;
    end if;
  else
    if confirmation <> 'RESET_ALL_APPOINTMENTS' then
      raise exception
        'Reset global bloqueado: use app.reset_appointments_confirm = RESET_ALL_APPOINTMENTS.';
    end if;

    if tenant_setting is not null then
      raise exception
        'Reset global bloqueado: remova app.reset_appointments_tenant_id da sessao ou defina-o como vazio.';
    end if;
  end if;

  insert into _appointment_reset_config (scope, tenant_id)
  values (reset_scope, target_tenant_id);
end $$;

-- Evita que novos agendamentos sejam criados enquanto o conjunto do reset e
-- calculado e removido.
lock table public.agendamentos in share row exclusive mode;

create temp table _appointment_reset_ids (
  id uuid primary key,
  tenant_id uuid not null
);

create temp table _appointment_reset_tenants (
  id uuid primary key
);

insert into _appointment_reset_ids (id, tenant_id)
select a.id, a.tenant_id
from public.agendamentos a
cross join _appointment_reset_config config
where config.scope = 'all'
   or a.tenant_id = config.tenant_id;

insert into _appointment_reset_tenants (id)
select t.id
from public.tenants t
cross join _appointment_reset_config config
where config.scope = 'all'
   or t.id = config.tenant_id;

create temp table _appointment_reset_report (
  ordem integer generated always as identity,
  tabela text not null,
  operacao text not null,
  linhas_afetadas integer not null,
  executado_em timestamptz not null default now()
);

create or replace function pg_temp.reset_appointments_delete(
  target_table text,
  statement text
)
returns void
language plpgsql
as $$
declare
  affected integer := 0;
begin
  if to_regclass(target_table) is null then
    insert into _appointment_reset_report (tabela, operacao, linhas_afetadas)
    values (target_table, 'skip_missing_table', 0);
    return;
  end if;

  execute statement;
  get diagnostics affected = row_count;

  insert into _appointment_reset_report (tabela, operacao, linhas_afetadas)
  values (target_table, 'delete', affected);
end $$;

insert into _appointment_reset_report (tabela, operacao, linhas_afetadas)
select 'scope.agendamentos', 'selected', count(*)
from _appointment_reset_ids;

insert into _appointment_reset_report (tabela, operacao, linhas_afetadas)
select 'scope.tenants', 'selected', count(*)
from _appointment_reset_tenants;

-- Rastros sem FK de cascata.
select pg_temp.reset_appointments_delete(
  'public.event_logs',
  $sql$
    delete from public.event_logs t
    using _appointment_reset_ids reset_item
    where t.payload->>'appointment_id' = reset_item.id::text
  $sql$
);

select pg_temp.reset_appointments_delete(
  'public.notificacoes',
  $sql$
    delete from public.notificacoes t
    using _appointment_reset_ids reset_item
    where t.metadata->>'appointment_id' = reset_item.id::text
  $sql$
);

select pg_temp.reset_appointments_delete(
  'public.campanha_acessos',
  $sql$
    delete from public.campanha_acessos t
    using _appointment_reset_ids reset_item
    where t.agendamento_id = reset_item.id
  $sql$
);

-- Integracoes, relacionamento e financeiro diretamente originados pelo
-- agendamento. Clientes, campanhas, cupons e cadastros financeiros permanecem.
select pg_temp.reset_appointments_delete(
  'public.automacao_execucoes',
  $sql$
    delete from public.automacao_execucoes t
    using _appointment_reset_ids reset_item
    where t.agendamento_id = reset_item.id
  $sql$
);

select pg_temp.reset_appointments_delete(
  'public.recebimentos',
  $sql$
    delete from public.recebimentos recebimento
    using public.lancamentos_financeiros lancamento,
          _appointment_reset_ids reset_item
    where recebimento.lancamento_id = lancamento.id
      and lancamento.agendamento_id = reset_item.id
  $sql$
);

select pg_temp.reset_appointments_delete(
  'public.comissoes_profissionais',
  $sql$
    delete from public.comissoes_profissionais t
    using _appointment_reset_ids reset_item
    where t.agendamento_id = reset_item.id
  $sql$
);

select pg_temp.reset_appointments_delete(
  'public.lancamentos_financeiros',
  $sql$
    delete from public.lancamentos_financeiros t
    using _appointment_reset_ids reset_item
    where t.agendamento_id = reset_item.id
  $sql$
);

select pg_temp.reset_appointments_delete(
  'public.cupom_usos',
  $sql$
    delete from public.cupom_usos t
    using _appointment_reset_ids reset_item
    where t.agendamento_id = reset_item.id
  $sql$
);

select pg_temp.reset_appointments_delete(
  'public.crm_interacoes',
  $sql$
    delete from public.crm_interacoes t
    using _appointment_reset_ids reset_item
    where t.agendamento_id = reset_item.id
  $sql$
);

select pg_temp.reset_appointments_delete(
  'public.cliente_historico_atendimentos',
  $sql$
    delete from public.cliente_historico_atendimentos t
    using _appointment_reset_ids reset_item
    where t.agendamento_id = reset_item.id
  $sql$
);

select pg_temp.reset_appointments_delete(
  'public.mensagens_whatsapp',
  $sql$
    delete from public.mensagens_whatsapp t
    using _appointment_reset_tenants tenant_scope
    where t.tenant_id = tenant_scope.id
  $sql$
);

-- Dependencias operacionais do agendamento. A exclusao explicita permite
-- apresentar a quantidade removida de cada tabela no relatorio final.
select pg_temp.reset_appointments_delete(
  'public.jobs_notificacao',
  $sql$
    delete from public.jobs_notificacao t
    using _appointment_reset_ids reset_item
    where t.agendamento_id = reset_item.id
  $sql$
);

select pg_temp.reset_appointments_delete(
  'public.no_show_registros',
  $sql$
    delete from public.no_show_registros t
    using _appointment_reset_ids reset_item
    where t.agendamento_id = reset_item.id
  $sql$
);

select pg_temp.reset_appointments_delete(
  'public.confirmacoes',
  $sql$
    delete from public.confirmacoes t
    using _appointment_reset_ids reset_item
    where t.agendamento_id = reset_item.id
  $sql$
);

select pg_temp.reset_appointments_delete(
  'public.cancelamentos',
  $sql$
    delete from public.cancelamentos t
    using _appointment_reset_ids reset_item
    where t.agendamento_id = reset_item.id
  $sql$
);

select pg_temp.reset_appointments_delete(
  'public.agendamento_status_historico',
  $sql$
    delete from public.agendamento_status_historico t
    using _appointment_reset_ids reset_item
    where t.agendamento_id = reset_item.id
  $sql$
);

select pg_temp.reset_appointments_delete(
  'public.agendamento_servicos',
  $sql$
    delete from public.agendamento_servicos t
    using _appointment_reset_ids reset_item
    where t.agendamento_id = reset_item.id
  $sql$
);

select pg_temp.reset_appointments_delete(
  'public.agendamentos',
  $sql$
    delete from public.agendamentos t
    using _appointment_reset_ids reset_item
    where t.id = reset_item.id
  $sql$
);

select
  config.scope,
  config.tenant_id,
  report.tabela,
  report.operacao,
  report.linhas_afetadas,
  report.executado_em
from _appointment_reset_report report
cross join _appointment_reset_config config
order by report.ordem;

commit;
