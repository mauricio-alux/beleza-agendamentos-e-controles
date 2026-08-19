create table if not exists public.tenant_automacoes_relacionamento (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  tipo varchar(50) not null,
  canal varchar(30) not null default 'whatsapp',
  ativo boolean not null default false,
  template_id uuid references public.templates_mensagem(id) on delete set null,
  horario_envio time not null default time '09:00',
  timezone text not null default 'America/Sao_Paulo',
  ultima_execucao_em timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  constraint tenant_automacoes_relacionamento_tipo_check check (tipo in ('birthday_greeting')),
  constraint tenant_automacoes_relacionamento_canal_check check (canal in ('whatsapp'))
);

create unique index if not exists idx_tenant_automacoes_relacionamento_unique
  on public.tenant_automacoes_relacionamento (tenant_id, tipo, canal)
  where deleted_at is null;

create index if not exists idx_tenant_automacoes_relacionamento_due
  on public.tenant_automacoes_relacionamento (tipo, canal, ativo, updated_at)
  where deleted_at is null;

alter table public.tenant_automacoes_relacionamento enable row level security;

do $$
begin
  create policy tenant_automacoes_relacionamento_select_by_tenant
  on public.tenant_automacoes_relacionamento
  for select
  to authenticated
  using (deleted_at is null and public.has_tenant_access(tenant_id));
exception
  when duplicate_object then null;
end;
$$;

do $$
begin
  create policy tenant_automacoes_relacionamento_insert_by_tenant
  on public.tenant_automacoes_relacionamento
  for insert
  to authenticated
  with check (public.has_tenant_access(tenant_id));
exception
  when duplicate_object then null;
end;
$$;

do $$
begin
  create policy tenant_automacoes_relacionamento_update_by_tenant
  on public.tenant_automacoes_relacionamento
  for update
  to authenticated
  using (deleted_at is null and public.has_tenant_access(tenant_id))
  with check (public.has_tenant_access(tenant_id));
exception
  when duplicate_object then null;
end;
$$;

insert into public.templates_mensagem (
  tenant_id,
  nome,
  canal,
  tipo,
  assunto,
  conteudo,
  variaveis,
  aprovado_provider,
  metadata,
  ativo
)
select
  null,
  'birthday_greeting',
  'whatsapp',
  'marketing',
  'Feliz aniversario',
  'Oi, {{1}}! Passando para desejar um feliz aniversario em nome de {{2}}. Que seu dia seja leve, bonito e cheio de bons momentos!',
  '["nome_cliente", "nome_salao"]'::jsonb,
  false,
  jsonb_build_object(
    'categoria', 'relacionamento',
    'categoria_provider', 'Marketing',
    'provider_template_name', 'birthday_greeting',
    'language', 'pt_BR',
    'provider_parameter_format', 'positional',
    'provider_variable_mapping', jsonb_build_object('nome_cliente', 1, 'nome_salao', 2),
    'automation_type', 'birthday_greeting',
    'requires_marketing_consent', true,
    'future_coupon_ready', true
  ),
  true
where not exists (
  select 1
  from public.templates_mensagem existing
  where existing.tenant_id is null
    and existing.nome = 'birthday_greeting'
    and existing.canal = 'whatsapp'
    and existing.deleted_at is null
);

insert into public.tenant_automacoes_relacionamento (
  tenant_id,
  tipo,
  canal,
  ativo,
  template_id,
  horario_envio,
  timezone,
  metadata
)
select
  tenant.id,
  'birthday_greeting',
  'whatsapp',
  false,
  template.id,
  time '09:00',
  'America/Sao_Paulo',
  jsonb_build_object(
    'nome', 'Feliz aniversario',
    'descricao', 'Automacao de relacionamento que envia mensagem no dia exato do aniversario do cliente.',
    'categoria', 'relacionamento',
    'requires_marketing_consent', true,
    'future_coupon_ready', true,
    'feb_29_rule', 'Em anos nao bissextos, aniversarios de 29/02 sao tratados em 28/02.'
  )
from public.tenants tenant
cross join lateral (
  select id
  from public.templates_mensagem
  where tenant_id is null
    and nome = 'birthday_greeting'
    and canal = 'whatsapp'
    and deleted_at is null
  order by updated_at desc
  limit 1
) template
where not exists (
  select 1
  from public.tenant_automacoes_relacionamento existing
  where existing.tenant_id = tenant.id
    and existing.tipo = 'birthday_greeting'
    and existing.canal = 'whatsapp'
    and existing.deleted_at is null
);
