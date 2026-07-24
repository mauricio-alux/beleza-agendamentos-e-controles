-- Bellory SaaS - limpeza transacional de campanhas para DEV/HML/local/test.
--
-- Objetivo:
--   Remover somente dados transacionais do ciclo de campanhas, preservando
--   tenants, usuarios, clientes, profissionais, servicos, agendas, templates,
--   catalogos e configuracoes estruturais.
--
-- Uso no Supabase SQL Editor:
--
--   Dry-run por tenant:
--     set app.environment = 'development';
--     set app.cleanup_campaigns_scope = 'tenant';
--     set app.cleanup_campaigns_mode = 'dry_run';
--     set app.cleanup_campaigns_tenant_slug = 'espaco-vivian-beauty';
--     set app.cleanup_campaigns_confirm = 'DRY_RUN_CAMPAIGNS';
--
--   Limpeza real por tenant:
--     set app.environment = 'development';
--     set app.cleanup_campaigns_scope = 'tenant';
--     set app.cleanup_campaigns_mode = 'execute';
--     set app.cleanup_campaigns_tenant_slug = 'espaco-vivian-beauty';
--     set app.cleanup_campaigns_confirm = 'CLEAN_TENANT_CAMPAIGNS';
--
--   Dry-run global:
--     set app.environment = 'development';
--     set app.cleanup_campaigns_scope = 'all';
--     set app.cleanup_campaigns_mode = 'dry_run';
--     set app.cleanup_campaigns_confirm = 'DRY_RUN_CAMPAIGNS';
--
--   Limpeza real global:
--     set app.environment = 'development';
--     set app.cleanup_campaigns_scope = 'all';
--     set app.cleanup_campaigns_mode = 'execute';
--     set app.cleanup_campaigns_confirm = 'CLEAN_ALL_CAMPAIGNS';
--
-- Para tenant especifico, use somente um destes:
--   set app.cleanup_campaigns_tenant_id = '00000000-0000-0000-0000-000000000000';
--   set app.cleanup_campaigns_tenant_slug = 'tenant-slug';
--
-- Execute os SETs e este arquivo na mesma sessao SQL.

begin;

create temp table _campaign_cleanup_config (
  scope text not null,
  mode text not null,
  tenant_id uuid,
  tenant_slug text
);

create temp table _campaign_cleanup_report (
  ordem integer generated always as identity,
  tabela text not null,
  operacao text not null,
  linhas_afetadas integer not null,
  detalhe text,
  executado_em timestamptz not null default now()
);

do $$
declare
  env_name text := lower(coalesce(current_setting('app.environment', true), ''));
  cleanup_scope text := lower(coalesce(current_setting('app.cleanup_campaigns_scope', true), ''));
  cleanup_mode text := lower(coalesce(current_setting('app.cleanup_campaigns_mode', true), ''));
  confirmation text := coalesce(current_setting('app.cleanup_campaigns_confirm', true), '');
  tenant_id_setting text := nullif(trim(coalesce(current_setting('app.cleanup_campaigns_tenant_id', true), '')), '');
  tenant_slug_setting text := nullif(trim(coalesce(current_setting('app.cleanup_campaigns_tenant_slug', true), '')), '');
  target_tenant_id uuid;
begin
  if env_name in ('production', 'prod', 'prd') then
    raise exception 'Operacao bloqueada: limpeza de campanhas nao permitida neste ambiente.';
  end if;

  if env_name not in ('development', 'dev', 'homologation', 'hml', 'local', 'test') then
    raise exception
      'Limpeza bloqueada: app.environment deve ser development/dev/homologation/hml/local/test. Valor atual: %',
      env_name;
  end if;

  if cleanup_scope not in ('tenant', 'all') then
    raise exception 'Limpeza bloqueada: app.cleanup_campaigns_scope deve ser tenant ou all.';
  end if;

  if cleanup_mode not in ('dry_run', 'execute') then
    raise exception 'Limpeza bloqueada: app.cleanup_campaigns_mode deve ser dry_run ou execute.';
  end if;

  if cleanup_mode = 'dry_run' and confirmation <> 'DRY_RUN_CAMPAIGNS' then
    raise exception 'Dry-run bloqueado: use app.cleanup_campaigns_confirm = DRY_RUN_CAMPAIGNS.';
  end if;

  if cleanup_mode = 'execute' and cleanup_scope = 'tenant' and confirmation <> 'CLEAN_TENANT_CAMPAIGNS' then
    raise exception 'Limpeza de tenant bloqueada: use app.cleanup_campaigns_confirm = CLEAN_TENANT_CAMPAIGNS.';
  end if;

  if cleanup_mode = 'execute' and cleanup_scope = 'all' and confirmation <> 'CLEAN_ALL_CAMPAIGNS' then
    raise exception 'Limpeza global bloqueada: use app.cleanup_campaigns_confirm = CLEAN_ALL_CAMPAIGNS.';
  end if;

  if cleanup_scope = 'tenant' then
    if tenant_id_setting is null and tenant_slug_setting is null then
      raise exception 'Limpeza bloqueada: informe app.cleanup_campaigns_tenant_id ou app.cleanup_campaigns_tenant_slug.';
    end if;

    if tenant_id_setting is not null and tenant_slug_setting is not null then
      raise exception 'Limpeza bloqueada: informe tenant_id ou tenant_slug, nunca ambos.';
    end if;

    if tenant_id_setting is not null then
      begin
        target_tenant_id := tenant_id_setting::uuid;
      exception
        when invalid_text_representation then
          raise exception 'Limpeza bloqueada: app.cleanup_campaigns_tenant_id nao e um UUID valido.';
      end;
    end if;
  else
    if tenant_id_setting is not null or tenant_slug_setting is not null then
      raise exception 'Limpeza global bloqueada: remova tenant_id/tenant_slug da sessao.';
    end if;
  end if;

  if to_regclass('public.campanhas') is null then
    raise exception 'Limpeza bloqueada: tabela public.campanhas nao existe no schema atual.';
  end if;

  insert into _campaign_cleanup_config (scope, mode, tenant_id, tenant_slug)
  values (cleanup_scope, cleanup_mode, target_tenant_id, tenant_slug_setting);
end $$;

create temp table _campaign_cleanup_tenants (
  id uuid primary key,
  nome_fantasia text,
  slug text
);

insert into _campaign_cleanup_tenants (id, nome_fantasia, slug)
select t.id, t.nome_fantasia, t.slug
from public.tenants t
cross join _campaign_cleanup_config config
where t.deleted_at is null
  and (
    config.scope = 'all'
    or t.id = config.tenant_id
    or lower(t.slug) = lower(config.tenant_slug)
  );

do $$
declare
  cleanup_scope text;
  selected_tenant_id uuid;
  selected_tenant_slug text;
begin
  select config.scope, config.tenant_id, config.tenant_slug
    into cleanup_scope, selected_tenant_id, selected_tenant_slug
  from _campaign_cleanup_config config;

  if cleanup_scope = 'tenant' and not exists (select 1 from _campaign_cleanup_tenants) then
    raise exception 'Limpeza bloqueada: tenant nao encontrado. tenant_id=%, tenant_slug=%', selected_tenant_id, selected_tenant_slug;
  end if;
end $$;

create temp table _campaign_cleanup_campaigns (
  id uuid primary key,
  tenant_id uuid not null
);

insert into _campaign_cleanup_campaigns (id, tenant_id)
select c.id, c.tenant_id
from public.campanhas c
join _campaign_cleanup_tenants tenant_scope on tenant_scope.id = c.tenant_id;

create temp table _campaign_cleanup_sends (
  id uuid primary key,
  campanha_id uuid,
  tenant_id uuid
);

do $$
begin
  if to_regclass('public.campanha_envios') is not null then
    insert into _campaign_cleanup_sends (id, campanha_id, tenant_id)
    select e.id, e.campanha_id, e.tenant_id
    from public.campanha_envios e
    join _campaign_cleanup_campaigns c on c.id = e.campanha_id
    where e.tenant_id = c.tenant_id;
  end if;
end $$;

create temp table _campaign_cleanup_coupons (
  id uuid primary key,
  campanha_id uuid,
  tenant_id uuid
);

do $$
begin
  if to_regclass('public.cupons') is not null then
    insert into _campaign_cleanup_coupons (id, campanha_id, tenant_id)
    select cupom.id, cupom.campanha_id, cupom.tenant_id
    from public.cupons cupom
    join _campaign_cleanup_campaigns c on c.id = cupom.campanha_id
    where cupom.tenant_id = c.tenant_id;
  end if;
end $$;

insert into _campaign_cleanup_report (tabela, operacao, linhas_afetadas, detalhe)
select 'scope.tenants', 'selected', count(*), 'Tenants no escopo'
from _campaign_cleanup_tenants;

insert into _campaign_cleanup_report (tabela, operacao, linhas_afetadas, detalhe)
select 'scope.campanhas', 'selected', count(*), 'Campanhas operacionais no escopo'
from _campaign_cleanup_campaigns;

insert into _campaign_cleanup_report (tabela, operacao, linhas_afetadas, detalhe)
select 'scope.campanha_envios', 'selected', count(*), 'Envios vinculados as campanhas no escopo'
from _campaign_cleanup_sends;

insert into _campaign_cleanup_report (tabela, operacao, linhas_afetadas, detalhe)
select 'scope.cupons', 'selected', count(*), 'Cupons vinculados as campanhas no escopo'
from _campaign_cleanup_coupons;

create or replace function pg_temp.cleanup_campaigns_lock(target_table text)
returns void
language plpgsql
as $$
begin
  if to_regclass(target_table) is not null then
    execute format('lock table %s in share row exclusive mode', target_table);
  end if;
end $$;

do $$
declare
  cleanup_mode text;
begin
  select config.mode into cleanup_mode from _campaign_cleanup_config config;

  if cleanup_mode = 'execute' then
    perform pg_temp.cleanup_campaigns_lock('public.mensagens_whatsapp');
    perform pg_temp.cleanup_campaigns_lock('public.jobs_notificacao');
    perform pg_temp.cleanup_campaigns_lock('public.ia_sugestoes');
    perform pg_temp.cleanup_campaigns_lock('public.campanha_acessos');
    perform pg_temp.cleanup_campaigns_lock('public.campanha_envios');
    perform pg_temp.cleanup_campaigns_lock('public.campanha_publicos');
    perform pg_temp.cleanup_campaigns_lock('public.cupom_usos');
    perform pg_temp.cleanup_campaigns_lock('public.cupom_servicos');
    perform pg_temp.cleanup_campaigns_lock('public.cupons');
    perform pg_temp.cleanup_campaigns_lock('public.campanhas');
  end if;
end $$;

create or replace function pg_temp.cleanup_campaigns_apply(
  target_table text,
  count_statement text,
  delete_statement text,
  detail text
)
returns void
language plpgsql
as $$
declare
  cleanup_mode text;
  affected integer := 0;
begin
  select config.mode into cleanup_mode from _campaign_cleanup_config config;

  if to_regclass(target_table) is null then
    insert into _campaign_cleanup_report (tabela, operacao, linhas_afetadas, detalhe)
    values (target_table, 'skip_missing_table', 0, detail);
    return;
  end if;

  if cleanup_mode = 'dry_run' then
    execute count_statement into affected;
    insert into _campaign_cleanup_report (tabela, operacao, linhas_afetadas, detalhe)
    values (target_table, 'would_delete', affected, detail);
    return;
  end if;

  execute delete_statement;
  get diagnostics affected = row_count;

  insert into _campaign_cleanup_report (tabela, operacao, linhas_afetadas, detalhe)
  values (target_table, 'delete', affected, detail);
end $$;

select pg_temp.cleanup_campaigns_apply(
  'public.mensagens_whatsapp',
  $sql$
    select count(*)::int
    from public.mensagens_whatsapp t
    join _campaign_cleanup_tenants tenant_scope on tenant_scope.id = t.tenant_id
    where exists (
      select 1 from _campaign_cleanup_campaigns c where c.id = t.campanha_id
    )
       or exists (
      select 1 from _campaign_cleanup_sends e where e.id = t.campanha_envio_id
    )
  $sql$,
  $sql$
    delete from public.mensagens_whatsapp t
    using _campaign_cleanup_tenants tenant_scope
    where tenant_scope.id = t.tenant_id
      and (
        exists (select 1 from _campaign_cleanup_campaigns c where c.id = t.campanha_id)
        or exists (select 1 from _campaign_cleanup_sends e where e.id = t.campanha_envio_id)
      )
  $sql$,
  'Somente mensagens com campanha_id ou campanha_envio_id vinculado a campanha no escopo.'
);

select pg_temp.cleanup_campaigns_apply(
  'public.jobs_notificacao',
  $sql$
    select count(*)::int
    from public.jobs_notificacao t
    join _campaign_cleanup_campaigns c on c.id = t.campanha_id
    where t.tenant_id = c.tenant_id
  $sql$,
  $sql$
    delete from public.jobs_notificacao t
    using _campaign_cleanup_campaigns c
    where c.id = t.campanha_id
      and t.tenant_id = c.tenant_id
  $sql$,
  'Jobs/filas associados diretamente a campanha.'
);

select pg_temp.cleanup_campaigns_apply(
  'public.ia_sugestoes',
  $sql$
    select count(*)::int
    from public.ia_sugestoes t
    join _campaign_cleanup_campaigns c on c.id = t.campanha_id
    where t.tenant_id = c.tenant_id
  $sql$,
  $sql$
    delete from public.ia_sugestoes t
    using _campaign_cleanup_campaigns c
    where c.id = t.campanha_id
      and t.tenant_id = c.tenant_id
  $sql$,
  'Sugestoes de IA materializadas com campanha_id.'
);

select pg_temp.cleanup_campaigns_apply(
  'public.campanha_acessos',
  $sql$
    select count(*)::int
    from public.campanha_acessos t
    join _campaign_cleanup_campaigns c on c.id = t.campanha_id
    where t.tenant_id = c.tenant_id
  $sql$,
  $sql$
    delete from public.campanha_acessos t
    using _campaign_cleanup_campaigns c
    where c.id = t.campanha_id
      and t.tenant_id = c.tenant_id
  $sql$,
  'Acessos publicos atribuidos diretamente a campanha.'
);

select pg_temp.cleanup_campaigns_apply(
  'public.campanha_envios',
  $sql$
    select count(*)::int
    from public.campanha_envios t
    join _campaign_cleanup_campaigns c on c.id = t.campanha_id
    where t.tenant_id = c.tenant_id
  $sql$,
  $sql$
    delete from public.campanha_envios t
    using _campaign_cleanup_campaigns c
    where c.id = t.campanha_id
      and t.tenant_id = c.tenant_id
  $sql$,
  'Destinatarios/envios resolvidos por campanha.'
);

select pg_temp.cleanup_campaigns_apply(
  'public.campanha_publicos',
  $sql$
    select count(*)::int
    from public.campanha_publicos t
    join _campaign_cleanup_campaigns c on c.id = t.campanha_id
    where t.tenant_id = c.tenant_id
  $sql$,
  $sql$
    delete from public.campanha_publicos t
    using _campaign_cleanup_campaigns c
    where c.id = t.campanha_id
      and t.tenant_id = c.tenant_id
  $sql$,
  'Publicos e segmentacoes persistidos por campanha.'
);

select pg_temp.cleanup_campaigns_apply(
  'public.cupom_usos',
  $sql$
    select count(*)::int
    from public.cupom_usos t
    join _campaign_cleanup_tenants tenant_scope on tenant_scope.id = t.tenant_id
    where exists (
      select 1 from _campaign_cleanup_campaigns c where c.id = t.campanha_id
    )
       or exists (
      select 1 from _campaign_cleanup_coupons coupon where coupon.id = t.cupom_id
    )
  $sql$,
  $sql$
    delete from public.cupom_usos t
    using _campaign_cleanup_tenants tenant_scope
    where tenant_scope.id = t.tenant_id
      and (
        exists (select 1 from _campaign_cleanup_campaigns c where c.id = t.campanha_id)
        or exists (select 1 from _campaign_cleanup_coupons coupon where coupon.id = t.cupom_id)
      )
  $sql$,
  'Usos/reservas de cupons vinculados a campanha ou cupom de campanha.'
);

select pg_temp.cleanup_campaigns_apply(
  'public.cupom_servicos',
  $sql$
    select count(*)::int
    from public.cupom_servicos t
    join _campaign_cleanup_coupons coupon on coupon.id = t.cupom_id
    where t.tenant_id = coupon.tenant_id
  $sql$,
  $sql$
    delete from public.cupom_servicos t
    using _campaign_cleanup_coupons coupon
    where coupon.id = t.cupom_id
      and t.tenant_id = coupon.tenant_id
  $sql$,
  'Vinculos de servico dos cupons criados para campanhas.'
);

select pg_temp.cleanup_campaigns_apply(
  'public.cupons',
  $sql$
    select count(*)::int
    from public.cupons t
    join _campaign_cleanup_coupons coupon on coupon.id = t.id
    where t.tenant_id = coupon.tenant_id
  $sql$,
  $sql$
    delete from public.cupons t
    using _campaign_cleanup_coupons coupon
    where coupon.id = t.id
      and t.tenant_id = coupon.tenant_id
  $sql$,
  'Cupons vinculados diretamente a campanhas.'
);

select pg_temp.cleanup_campaigns_apply(
  'public.campanhas',
  $sql$
    select count(*)::int
    from public.campanhas t
    join _campaign_cleanup_campaigns c on c.id = t.id
    where t.tenant_id = c.tenant_id
  $sql$,
  $sql$
    delete from public.campanhas t
    using _campaign_cleanup_campaigns c
    where c.id = t.id
      and t.tenant_id = c.tenant_id
  $sql$,
  'Campanhas operacionais do tenant.'
);

insert into _campaign_cleanup_report (tabela, operacao, linhas_afetadas, detalhe)
values
  ('preserved.tenants', 'preserved', 0, 'Tenants preservados.'),
  ('preserved.usuarios', 'preserved', 0, 'Usuarios preservados.'),
  ('preserved.clientes', 'preserved', 0, 'Clientes e cliente_tenants preservados.'),
  ('preserved.profissionais', 'preserved', 0, 'Profissionais preservados.'),
  ('preserved.servicos', 'preserved', 0, 'Servicos, categorias e especialidades preservados.'),
  ('preserved.agendamentos', 'preserved', 0, 'Agendas e agendamentos preservados.'),
  ('preserved.templates_mensagem', 'preserved', 0, 'Templates globais, MasterAdmin e catalogos SaaS preservados.'),
  ('preserved.platform_campaigns', 'preserved', 0, 'Campanhas globais/plataforma preservadas.'),
  ('preserved.whatsapp_config', 'preserved', 0, 'Contas e configuracoes WhatsApp preservadas.');

select
  report.ordem,
  config.mode as modo,
  config.scope as escopo,
  coalesce(string_agg(distinct tenant_scope.nome_fantasia || ' (' || tenant_scope.slug || ')', ', '), 'nenhum') as tenants,
  report.tabela,
  report.operacao,
  report.linhas_afetadas,
  report.detalhe,
  report.executado_em
from _campaign_cleanup_report report
cross join _campaign_cleanup_config config
left join _campaign_cleanup_tenants tenant_scope on true
group by
  report.ordem,
  config.mode,
  config.scope,
  report.tabela,
  report.operacao,
  report.linhas_afetadas,
  report.detalhe,
  report.executado_em
order by report.ordem;

commit;
