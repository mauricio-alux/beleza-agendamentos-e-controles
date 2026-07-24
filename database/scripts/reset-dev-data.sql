-- Bellory SaaS - reset operacional de dados DEV/HML.
--
-- Objetivo:
--   Limpar dados operacionais de testes sem apagar estrutura, seeds globais,
--   taxonomia, cargos, especialidades, roles, permissoes, tenants, usuarios,
--   memberships, assinaturas, configuracoes essenciais ou onboarding base.
--
-- Uso seguro:
--   1. Revise as whitelists abaixo.
--   2. Execute somente em DEV/HML/local.
--   3. Execute tudo em uma unica sessao SQL.
--
-- Confirmacao obrigatoria:
--   set app.environment = 'development';
--   set app.reset_dev_data_confirm = 'RESET_DEV_DATA';

begin;

do $$
declare
  env_name text := lower(coalesce(current_setting('app.environment', true), ''));
  confirmation text := coalesce(current_setting('app.reset_dev_data_confirm', true), '');
begin
  if confirmation <> 'RESET_DEV_DATA' then
    raise exception 'Reset bloqueado: execute set app.reset_dev_data_confirm = ''RESET_DEV_DATA'' antes do script.';
  end if;

  if env_name not in ('development', 'dev', 'homologation', 'hml', 'local', 'test') then
    raise exception 'Reset bloqueado: app.environment deve ser development/dev/homologation/hml/local/test. Valor atual: %', env_name;
  end if;
end $$;

create temp table _reset_report (
  ordem integer generated always as identity,
  tabela text not null,
  operacao text not null,
  linhas_afetadas integer not null,
  executado_em timestamptz not null default now()
);

create temp table _reset_protected_emails (
  email text primary key
);

create temp table _reset_protected_tenant_slugs (
  slug text primary key
);

-- Ajuste esta whitelist antes de executar em um ambiente compartilhado.
-- MasterAdmin tambem e protegido automaticamente por tipo_usuario.
insert into _reset_protected_emails (email)
values
  ('masteradmin@bellory.local')
on conflict do nothing;

-- Exemplo:
-- insert into _reset_protected_tenant_slugs (slug) values ('tenant-demo-protegido');

create temp table _reset_protected_users as
select u.id
from public.usuarios u
where u.deleted_at is null
  and (
    u.tipo_usuario = 'MasterAdmin'
    or lower(u.email) in (select lower(email) from _reset_protected_emails)
  );

create temp table _reset_protected_tenants as
select distinct t.id
from public.tenants t
left join public.tenant_memberships tm on tm.tenant_id = t.id
left join _reset_protected_users pu on pu.id = tm.usuario_id
where t.deleted_at is null
  and (
    lower(t.slug) in (select lower(slug) from _reset_protected_tenant_slugs)
    or pu.id is not null
  );

create temp table _reset_tenants as
select t.id
from public.tenants t
where t.deleted_at is null
  and not exists (
    select 1
    from _reset_protected_tenants pt
    where pt.id = t.id
  );

create temp table _reset_clients as
select distinct c.id
from public.clientes c
join public.cliente_tenants ct on ct.cliente_id = c.id
join _reset_tenants rt on rt.id = ct.tenant_id
where not exists (
  select 1
  from public.cliente_tenants protected_ct
  join _reset_protected_tenants pt on pt.id = protected_ct.tenant_id
  where protected_ct.cliente_id = c.id
);

create temp table _reset_services_to_delete as
select s.id
from public.servicos s
join _reset_tenants rt on rt.id = s.tenant_id
where coalesce(s.metadata->>'padrao', 'false') <> 'true'
  and coalesce(s.metadata->>'origem', '') not in (
    'onboarding_default',
    'onboarding_input',
    'onboarding_services_step'
  );

create temp table _reset_professionals_to_delete as
select p.id
from public.profissionais p
join _reset_tenants rt on rt.id = p.tenant_id
left join public.tenant_memberships tm on tm.profissional_id = p.id
left join _reset_protected_users pu on pu.id = p.usuario_id
where pu.id is null
  and coalesce(p.metadata->>'padrao', 'false') <> 'true'
  and coalesce(p.metadata->>'admin_salao', 'false') <> 'true'
  and coalesce(tm.is_owner, false) = false
  and coalesce(tm.is_primary, false) = false;

create or replace function pg_temp.reset_delete(target_table text, statement text)
returns void
language plpgsql
as $$
declare
  affected integer := 0;
begin
  if to_regclass(target_table) is null then
    insert into _reset_report (tabela, operacao, linhas_afetadas)
    values (target_table, 'skip_missing_table', 0);
    return;
  end if;

  execute statement;
  get diagnostics affected = row_count;

  insert into _reset_report (tabela, operacao, linhas_afetadas)
  values (target_table, 'delete', affected);
end $$;

create or replace function pg_temp.reset_update(target_table text, statement text)
returns void
language plpgsql
as $$
declare
  affected integer := 0;
begin
  if to_regclass(target_table) is null then
    insert into _reset_report (tabela, operacao, linhas_afetadas)
    values (target_table, 'skip_missing_table', 0);
    return;
  end if;

  execute statement;
  get diagnostics affected = row_count;

  insert into _reset_report (tabela, operacao, linhas_afetadas)
  values (target_table, 'update', affected);
end $$;

select pg_temp.reset_delete('public.ia_sugestoes',
  'delete from public.ia_sugestoes t using _reset_tenants rt where t.tenant_id = rt.id');
select pg_temp.reset_delete('public.ia_insights',
  'delete from public.ia_insights t using _reset_tenants rt where t.tenant_id = rt.id');
select pg_temp.reset_delete('public.automacao_execucoes',
  'delete from public.automacao_execucoes t using _reset_tenants rt where t.tenant_id = rt.id');
select pg_temp.reset_delete('public.automacoes',
  'delete from public.automacoes t using _reset_tenants rt where t.tenant_id = rt.id');

select pg_temp.reset_delete('public.mensagens_whatsapp',
  'delete from public.mensagens_whatsapp t using _reset_tenants rt where t.tenant_id = rt.id');
select pg_temp.reset_delete('public.notificacoes',
  'delete from public.notificacoes t using _reset_tenants rt where t.tenant_id = rt.id');
select pg_temp.reset_delete('public.jobs_notificacao',
  'delete from public.jobs_notificacao t using _reset_tenants rt where t.tenant_id = rt.id');
select pg_temp.reset_delete('public.campanha_envios',
  'delete from public.campanha_envios t using _reset_tenants rt where t.tenant_id = rt.id');
select pg_temp.reset_delete('public.campanha_publicos',
  'delete from public.campanha_publicos t using _reset_tenants rt where t.tenant_id = rt.id');
select pg_temp.reset_delete('public.cupom_usos',
  'delete from public.cupom_usos t using _reset_tenants rt where t.tenant_id = rt.id');
select pg_temp.reset_delete('public.cupons',
  'delete from public.cupons t using _reset_tenants rt where t.tenant_id = rt.id');
select pg_temp.reset_delete('public.campanhas',
  'delete from public.campanhas t using _reset_tenants rt where t.tenant_id = rt.id');

select pg_temp.reset_delete('public.recebimentos',
  'delete from public.recebimentos t using _reset_tenants rt where t.tenant_id = rt.id');
select pg_temp.reset_delete('public.comissoes_profissionais',
  'delete from public.comissoes_profissionais t using _reset_tenants rt where t.tenant_id = rt.id');
select pg_temp.reset_delete('public.lancamentos_financeiros',
  'delete from public.lancamentos_financeiros t using _reset_tenants rt where t.tenant_id = rt.id');
select pg_temp.reset_delete('public.indicadores_financeiros_snapshot',
  'delete from public.indicadores_financeiros_snapshot t using _reset_tenants rt where t.tenant_id = rt.id');
select pg_temp.reset_delete('public.formas_pagamento',
  'delete from public.formas_pagamento t using _reset_tenants rt where t.tenant_id = rt.id');
select pg_temp.reset_delete('public.contas_correntes',
  'delete from public.contas_correntes t using _reset_tenants rt where t.tenant_id = rt.id');

select pg_temp.reset_delete('public.cancelamentos',
  'delete from public.cancelamentos t using _reset_tenants rt where t.tenant_id = rt.id');
select pg_temp.reset_delete('public.confirmacoes',
  'delete from public.confirmacoes t using _reset_tenants rt where t.tenant_id = rt.id');
select pg_temp.reset_delete('public.no_show_registros',
  'delete from public.no_show_registros t using _reset_tenants rt where t.tenant_id = rt.id');
select pg_temp.reset_delete('public.agendamento_status_historico',
  'delete from public.agendamento_status_historico t using _reset_tenants rt where t.tenant_id = rt.id');
select pg_temp.reset_delete('public.agendamento_servicos',
  'delete from public.agendamento_servicos t using _reset_tenants rt where t.tenant_id = rt.id');
select pg_temp.reset_delete('public.agendamentos',
  'delete from public.agendamentos t using _reset_tenants rt where t.tenant_id = rt.id');
select pg_temp.reset_delete('public.bloqueios_agenda',
  'delete from public.bloqueios_agenda t using _reset_tenants rt where t.tenant_id = rt.id');

select pg_temp.reset_delete('public.crm_interacoes',
  'delete from public.crm_interacoes t using _reset_tenants rt where t.tenant_id = rt.id');
select pg_temp.reset_delete('public.cliente_historico_atendimentos',
  'delete from public.cliente_historico_atendimentos t using _reset_tenants rt where t.tenant_id = rt.id');
select pg_temp.reset_delete('public.crm_scores',
  'delete from public.crm_scores t using _reset_tenants rt where t.tenant_id = rt.id');
select pg_temp.reset_delete('public.clientes_bloqueios',
  'delete from public.clientes_bloqueios t using _reset_tenants rt where t.tenant_id = rt.id');
select pg_temp.reset_delete('public.tokens_cliente',
  'delete from public.tokens_cliente t using _reset_clients rc where t.cliente_id = rc.id');
select pg_temp.reset_delete('public.cliente_tenants',
  'delete from public.cliente_tenants t using _reset_tenants rt where t.tenant_id = rt.id');
select pg_temp.reset_delete('public.clientes',
  'delete from public.clientes t using _reset_clients rc where t.id = rc.id');

select pg_temp.reset_delete('public.professional_schedules',
  'delete from public.professional_schedules t using _reset_professionals_to_delete rp where t.professional_id = rp.id');
select pg_temp.reset_delete('public.escalas_semanais',
  'delete from public.escalas_semanais t using _reset_professionals_to_delete rp where t.profissional_id = rp.id');
select pg_temp.reset_delete('public.profissional_especialidades',
  'delete from public.profissional_especialidades t using _reset_professionals_to_delete rp where t.profissional_id = rp.id');
select pg_temp.reset_delete('public.profissional_servicos',
  'delete from public.profissional_servicos t using _reset_professionals_to_delete rp where t.profissional_id = rp.id');
select pg_temp.reset_delete('public.profissional_servicos',
  'delete from public.profissional_servicos t using _reset_services_to_delete rs where t.servico_id = rs.id');

select pg_temp.reset_update('public.tenant_memberships',
  'update public.tenant_memberships tm set profissional_id = null, updated_at = now() from _reset_professionals_to_delete rp where tm.profissional_id = rp.id');

select pg_temp.reset_delete('public.profissionais',
  'delete from public.profissionais t using _reset_professionals_to_delete rp where t.id = rp.id');
select pg_temp.reset_delete('public.servico_especialidades',
  'delete from public.servico_especialidades t using _reset_services_to_delete rs where t.servico_id = rs.id');
select pg_temp.reset_delete('public.servicos',
  'delete from public.servicos t using _reset_services_to_delete rs where t.id = rs.id');

select pg_temp.reset_delete('public.tenant_especialidades',
  'delete from public.tenant_especialidades t using _reset_tenants rt where t.tenant_id = rt.id and coalesce(t.ativo, true) = false');
select pg_temp.reset_delete('public.event_logs',
  'delete from public.event_logs t using _reset_tenants rt where t.tenant_id = rt.id');
select pg_temp.reset_delete('public.tenant_settings_audit',
  'delete from public.tenant_settings_audit t using _reset_tenants rt where t.tenant_id = rt.id');

-- Resumo de escopo antes do commit.
insert into _reset_report (tabela, operacao, linhas_afetadas)
select 'scope.reset_tenants', 'count', count(*) from _reset_tenants;
insert into _reset_report (tabela, operacao, linhas_afetadas)
select 'scope.protected_tenants', 'count', count(*) from _reset_protected_tenants;
insert into _reset_report (tabela, operacao, linhas_afetadas)
select 'scope.protected_users', 'count', count(*) from _reset_protected_users;

select tabela, operacao, linhas_afetadas, executado_em
from _reset_report
order by ordem;

commit;
