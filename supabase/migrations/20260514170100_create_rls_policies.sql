-- Bellory RLS policies for Supabase.
-- Service-role operations bypass RLS; application users are isolated by tenant.

create or replace function public.current_usuario_id()
returns uuid
language sql
stable
security definer
set search_path = public, auth
as $$
  select u.id
  from public.usuarios u
  where u.auth_user_id = auth.uid()
    and u.ativo = true
    and u.deleted_at is null
  order by u.created_at desc
  limit 1
$$;

create or replace function public.current_tenant_id()
returns uuid
language sql
stable
security definer
set search_path = public, auth
as $$
  select u.tenant_id
  from public.usuarios u
  where u.auth_user_id = auth.uid()
    and u.ativo = true
    and u.deleted_at is null
  order by u.created_at desc
  limit 1
$$;

create or replace function public.current_tipo_usuario()
returns text
language sql
stable
security definer
set search_path = public, auth
as $$
  select u.tipo_usuario
  from public.usuarios u
  where u.auth_user_id = auth.uid()
    and u.ativo = true
    and u.deleted_at is null
  order by u.created_at desc
  limit 1
$$;

create or replace function public.is_master_admin()
returns boolean
language sql
stable
security definer
set search_path = public, auth
as $$
  select coalesce(public.current_tipo_usuario() = 'MasterAdmin', false)
$$;

create or replace function public.has_tenant_access(target_tenant_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public, auth
as $$
  select
    public.is_master_admin()
    or (
      target_tenant_id is not null
      and target_tenant_id = public.current_tenant_id()
    )
$$;

create or replace function public.has_optional_tenant_access(target_tenant_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public, auth
as $$
  select
    target_tenant_id is null
    or public.has_tenant_access(target_tenant_id)
$$;

create or replace function public.can_access_cliente(target_cliente_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public, auth
as $$
  select
    public.is_master_admin()
    or exists (
      select 1
      from public.cliente_tenants ct
      where ct.cliente_id = target_cliente_id
        and ct.deleted_at is null
        and public.has_tenant_access(ct.tenant_id)
    )
$$;

do $$
declare
  table_name text;
begin
  foreach table_name in array array[
    'planos',
    'tenants',
    'assinaturas',
    'pagamentos_assinatura',
    'usuarios',
    'configuracoes_tenant',
    'profissionais',
    'servicos',
    'profissional_servicos',
    'escalas_semanais',
    'bloqueios_agenda',
    'feriados',
    'links_agendamento',
    'clientes',
    'cliente_tenants',
    'tokens_cliente',
    'campanhas',
    'campanha_publicos',
    'cupons',
    'agendamentos',
    'agendamento_servicos',
    'agendamento_status_historico',
    'cancelamentos',
    'confirmacoes',
    'no_show_registros',
    'crm_interacoes',
    'crm_scores',
    'whatsapp_contas',
    'templates_mensagem',
    'campanha_envios',
    'mensagens_whatsapp',
    'notificacoes',
    'jobs_notificacao',
    'cupom_usos',
    'contas_correntes',
    'formas_pagamento',
    'lancamentos_financeiros',
    'recebimentos',
    'comissoes_profissionais',
    'indicadores_financeiros_snapshot',
    'automacoes',
    'automacao_execucoes',
    'modelos_prompt',
    'ia_sugestoes',
    'ia_insights'
  ] loop
    execute format('alter table public.%I enable row level security', table_name);
  end loop;
end;
$$;

-- Platform-level tables.
create policy planos_select_authenticated
on public.planos
for select
to authenticated
using (deleted_at is null);

create policy planos_insert_master
on public.planos
for insert
to authenticated
with check (public.is_master_admin());

create policy planos_update_master
on public.planos
for update
to authenticated
using (public.is_master_admin())
with check (public.is_master_admin());

create policy tenants_select_by_access
on public.tenants
for select
to authenticated
using (deleted_at is null and public.has_tenant_access(id));

create policy tenants_insert_authenticated
on public.tenants
for insert
to authenticated
with check (auth.uid() is not null);

create policy tenants_update_by_access
on public.tenants
for update
to authenticated
using (deleted_at is null and public.has_tenant_access(id))
with check (public.has_tenant_access(id));

create policy usuarios_select_by_access
on public.usuarios
for select
to authenticated
using (
  deleted_at is null
  and (
    public.is_master_admin()
    or auth_user_id = auth.uid()
    or public.has_tenant_access(tenant_id)
  )
);

create policy usuarios_insert_by_access
on public.usuarios
for insert
to authenticated
with check (
  public.is_master_admin()
  or auth_user_id = auth.uid()
  or public.has_tenant_access(tenant_id)
);

create policy usuarios_update_by_access
on public.usuarios
for update
to authenticated
using (
  deleted_at is null
  and (
    public.is_master_admin()
    or auth_user_id = auth.uid()
    or public.has_tenant_access(tenant_id)
  )
)
with check (
  public.is_master_admin()
  or auth_user_id = auth.uid()
  or public.has_tenant_access(tenant_id)
);

-- Tenant-scoped tables.
do $$
declare
  table_name text;
begin
  foreach table_name in array array[
    'assinaturas',
    'pagamentos_assinatura',
    'configuracoes_tenant',
    'profissionais',
    'servicos',
    'profissional_servicos',
    'escalas_semanais',
    'bloqueios_agenda',
    'cliente_tenants',
    'tokens_cliente',
    'campanhas',
    'campanha_publicos',
    'cupons',
    'agendamentos',
    'agendamento_servicos',
    'agendamento_status_historico',
    'cancelamentos',
    'confirmacoes',
    'no_show_registros',
    'crm_interacoes',
    'crm_scores',
    'whatsapp_contas',
    'campanha_envios',
    'mensagens_whatsapp',
    'notificacoes',
    'jobs_notificacao',
    'cupom_usos',
    'contas_correntes',
    'formas_pagamento',
    'lancamentos_financeiros',
    'recebimentos',
    'comissoes_profissionais',
    'indicadores_financeiros_snapshot',
    'automacoes',
    'automacao_execucoes',
    'ia_sugestoes',
    'ia_insights'
  ] loop
    execute format(
      'create policy %I on public.%I for select to authenticated using (deleted_at is null and public.has_tenant_access(tenant_id))',
      table_name || '_select_by_tenant',
      table_name
    );

    execute format(
      'create policy %I on public.%I for insert to authenticated with check (public.has_tenant_access(tenant_id))',
      table_name || '_insert_by_tenant',
      table_name
    );

    execute format(
      'create policy %I on public.%I for update to authenticated using (deleted_at is null and public.has_tenant_access(tenant_id)) with check (public.has_tenant_access(tenant_id))',
      table_name || '_update_by_tenant',
      table_name
    );
  end loop;
end;
$$;

-- Tables that can have global rows (tenant_id null) plus tenant-specific rows.
do $$
declare
  table_name text;
begin
  foreach table_name in array array[
    'feriados',
    'templates_mensagem',
    'modelos_prompt'
  ] loop
    execute format(
      'create policy %I on public.%I for select to authenticated using (deleted_at is null and public.has_optional_tenant_access(tenant_id))',
      table_name || '_select_optional_tenant',
      table_name
    );

    execute format(
      'create policy %I on public.%I for insert to authenticated with check (case when tenant_id is null then public.is_master_admin() else public.has_tenant_access(tenant_id) end)',
      table_name || '_insert_optional_tenant',
      table_name
    );

    execute format(
      'create policy %I on public.%I for update to authenticated using (deleted_at is null and public.has_optional_tenant_access(tenant_id)) with check (case when tenant_id is null then public.is_master_admin() else public.has_tenant_access(tenant_id) end)',
      table_name || '_update_optional_tenant',
      table_name
    );
  end loop;
end;
$$;

-- Public booking links can be read by anonymous visitors.
create policy links_agendamento_select_public
on public.links_agendamento
for select
to anon, authenticated
using (
  acesso_publico = true
  and ativo = true
  and deleted_at is null
  and (expira_em is null or expira_em > now())
);

create policy links_agendamento_select_by_tenant
on public.links_agendamento
for select
to authenticated
using (deleted_at is null and public.has_tenant_access(tenant_id));

create policy links_agendamento_insert_by_tenant
on public.links_agendamento
for insert
to authenticated
with check (public.has_tenant_access(tenant_id));

create policy links_agendamento_update_by_tenant
on public.links_agendamento
for update
to authenticated
using (deleted_at is null and public.has_tenant_access(tenant_id))
with check (public.has_tenant_access(tenant_id));

-- Global customer identity, visible through the cliente_tenants relationship.
create policy clientes_select_by_relationship
on public.clientes
for select
to authenticated
using (deleted_at is null and public.can_access_cliente(id));

create policy clientes_insert_authenticated
on public.clientes
for insert
to authenticated
with check (auth.uid() is not null);

create policy clientes_update_by_relationship
on public.clientes
for update
to authenticated
using (deleted_at is null and public.can_access_cliente(id))
with check (public.can_access_cliente(id));

-- Customer self-service without login should be mediated by backend/service role
-- or by future token-specific policies over tokens_cliente.
