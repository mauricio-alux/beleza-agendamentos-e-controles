-- Bellory global schema for PostgreSQL/Supabase.
-- Covers SaaS platform, tenant operations, scheduling, CRM, WhatsApp, IA,
-- campaigns and financial domains.

create extension if not exists pgcrypto;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table public.planos (
  id uuid primary key default gen_random_uuid(),
  nome varchar(80) not null,
  descricao text,
  preco_mensal numeric(10,2) not null default 0,
  limite_profissionais integer,
  limite_clientes integer,
  permite_whatsapp_cloud boolean not null default false,
  permite_ia boolean not null default false,
  metadata jsonb not null default '{}'::jsonb,
  ativo boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create table public.tenants (
  id uuid primary key default gen_random_uuid(),
  plano_id uuid references public.planos(id) on delete set null,
  nome_fantasia varchar(150) not null,
  razao_social varchar(150),
  cpf_cnpj varchar(20),
  email varchar(150),
  telefone varchar(20),
  tipo_negocio varchar(80),
  slug varchar(120) not null,
  status varchar(30) not null default 'ativo',
  logo_url text,
  timezone varchar(50) not null default 'America/Sao_Paulo',
  endereco jsonb not null default '{}'::jsonb,
  configuracoes jsonb not null default '{}'::jsonb,
  ativo boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  constraint tenants_status_check check (status in ('ativo', 'inativo', 'suspenso', 'cancelado'))
);

create table public.assinaturas (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  plano_id uuid not null references public.planos(id) on delete restrict,
  status varchar(30) not null default 'trial',
  data_inicio date not null default current_date,
  data_fim date,
  trial_ate date,
  valor_mensal numeric(10,2) not null default 0,
  metadata jsonb not null default '{}'::jsonb,
  ativo boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  constraint assinaturas_status_check check (status in ('trial', 'ativa', 'vencida', 'cancelada', 'suspensa'))
);

create table public.pagamentos_assinatura (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  assinatura_id uuid not null references public.assinaturas(id) on delete cascade,
  valor numeric(10,2) not null,
  vencimento date not null,
  pago_em timestamptz,
  status varchar(30) not null default 'pendente',
  metodo_pagamento varchar(50),
  provider varchar(50),
  provider_payment_id text,
  metadata jsonb not null default '{}'::jsonb,
  ativo boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  constraint pagamentos_assinatura_status_check check (status in ('pendente', 'pago', 'atrasado', 'cancelado', 'estornado'))
);

create table public.usuarios (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid references public.tenants(id) on delete set null,
  auth_user_id uuid unique references auth.users(id) on delete set null,
  nome varchar(150) not null,
  email varchar(150) not null,
  senha_hash text,
  telefone varchar(20),
  tipo_usuario varchar(30) not null,
  ultimo_login timestamptz,
  foto_url text,
  preferencias jsonb not null default '{}'::jsonb,
  ativo boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  constraint usuarios_tipo_usuario_check check (
    tipo_usuario in ('MasterAdmin', 'Administrador', 'Autonomo', 'Funcionario', 'Terceiro', 'Cliente')
  )
);

create table public.configuracoes_tenant (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null unique references public.tenants(id) on delete cascade,
  antecedencia_minima_minutos integer not null default 60,
  janela_agendamento_dias integer not null default 30,
  tolerancia_atraso_minutos integer not null default 10,
  intervalo_padrao_minutos integer not null default 15,
  evita_buracos_agenda boolean not null default true,
  permite_cancelamento_cliente boolean not null default true,
  limite_cancelamento_horas integer not null default 24,
  configuracoes_whatsapp jsonb not null default '{}'::jsonb,
  configuracoes_ia jsonb not null default '{}'::jsonb,
  ativo boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create table public.profissionais (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  usuario_id uuid references public.usuarios(id) on delete set null,
  nome_publico varchar(150),
  especialidade varchar(100),
  cargo varchar(80),
  percentual_comissao numeric(5,2) not null default 0,
  valor_fixo numeric(10,2) not null default 0,
  aceita_agendamento_online boolean not null default true,
  bio text,
  instagram varchar(150),
  foto_url text,
  ordem_exibicao integer not null default 0,
  metadata jsonb not null default '{}'::jsonb,
  ativo boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  constraint profissionais_percentual_comissao_check check (percentual_comissao >= 0 and percentual_comissao <= 100)
);

create table public.servicos (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  nome varchar(150) not null,
  descricao text,
  duracao_minutos integer not null,
  preco numeric(10,2) not null default 0,
  cor_agenda varchar(20),
  permite_online boolean not null default true,
  categoria varchar(100),
  ordem_exibicao integer not null default 0,
  metadata jsonb not null default '{}'::jsonb,
  ativo boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  constraint servicos_duracao_check check (duracao_minutos > 0),
  constraint servicos_preco_check check (preco >= 0)
);

create table public.profissional_servicos (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  profissional_id uuid not null references public.profissionais(id) on delete cascade,
  servico_id uuid not null references public.servicos(id) on delete cascade,
  preco_especifico numeric(10,2),
  duracao_especifica_minutos integer,
  ativo boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  constraint profissional_servicos_unique unique (profissional_id, servico_id),
  constraint profissional_servicos_duracao_check check (duracao_especifica_minutos is null or duracao_especifica_minutos > 0),
  constraint profissional_servicos_preco_check check (preco_especifico is null or preco_especifico >= 0)
);

create table public.escalas_semanais (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  profissional_id uuid not null references public.profissionais(id) on delete cascade,
  dia_semana integer not null,
  hora_inicio time not null,
  hora_fim time not null,
  hora_intervalo_inicio time,
  hora_intervalo_fim time,
  atende_feriado boolean not null default false,
  ativo boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  constraint escalas_semanais_dia_check check (dia_semana between 0 and 6),
  constraint escalas_semanais_horario_check check (hora_inicio < hora_fim),
  constraint escalas_semanais_intervalo_check check (
    (hora_intervalo_inicio is null and hora_intervalo_fim is null)
    or (hora_intervalo_inicio is not null and hora_intervalo_fim is not null and hora_intervalo_inicio < hora_intervalo_fim)
  )
);

create table public.bloqueios_agenda (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  profissional_id uuid references public.profissionais(id) on delete cascade,
  data_inicio timestamptz not null,
  data_fim timestamptz not null,
  motivo varchar(150),
  origem varchar(50) not null default 'manual',
  recorrente boolean not null default false,
  metadata jsonb not null default '{}'::jsonb,
  ativo boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  constraint bloqueios_agenda_periodo_check check (data_inicio < data_fim)
);

create table public.feriados (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid references public.tenants(id) on delete cascade,
  nome varchar(150) not null,
  data date not null,
  tipo varchar(30) not null default 'local',
  ativo boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  constraint feriados_tipo_check check (tipo in ('nacional', 'estadual', 'municipal', 'local'))
);

create table public.links_agendamento (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  profissional_id uuid references public.profissionais(id) on delete cascade,
  slug varchar(120) not null,
  titulo varchar(150),
  qr_code_url text,
  acesso_publico boolean not null default true,
  expira_em timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  ativo boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create table public.clientes (
  id uuid primary key default gen_random_uuid(),
  nome varchar(150) not null,
  telefone varchar(20) not null,
  email varchar(150),
  data_nascimento date,
  sexo varchar(20),
  observacoes text,
  metadata jsonb not null default '{}'::jsonb,
  ativo boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create table public.cliente_tenants (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  cliente_id uuid not null references public.clientes(id) on delete cascade,
  nome_no_tenant varchar(150),
  origem varchar(50) not null default 'link_agendamento',
  status varchar(30) not null default 'ativo',
  observacoes text,
  aceita_campanhas boolean not null default true,
  ultimo_atendimento timestamptz,
  total_gasto numeric(10,2) not null default 0,
  qtd_atendimentos integer not null default 0,
  score_relacionamento integer not null default 0,
  metadata jsonb not null default '{}'::jsonb,
  ativo boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  constraint cliente_tenants_unique unique (tenant_id, cliente_id),
  constraint cliente_tenants_status_check check (status in ('ativo', 'inativo', 'bloqueado')),
  constraint cliente_tenants_score_check check (score_relacionamento >= 0)
);

create table public.tokens_cliente (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  cliente_id uuid not null references public.clientes(id) on delete cascade,
  token_hash text not null,
  tipo varchar(30) not null default 'link_magico',
  expira_em timestamptz not null,
  usado_em timestamptz,
  ativo boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  constraint tokens_cliente_tipo_check check (tipo in ('link_magico', 'confirmacao', 'cancelamento', 'dashboard_cliente'))
);

create table public.campanhas (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  nome varchar(150) not null,
  descricao text,
  tipo varchar(50) not null,
  canal varchar(30) not null default 'whatsapp',
  imagem_url text,
  data_inicio date,
  data_fim date,
  status varchar(30) not null default 'rascunho',
  publico_alvo jsonb not null default '{}'::jsonb,
  metadata jsonb not null default '{}'::jsonb,
  ativo boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  constraint campanhas_status_check check (status in ('rascunho', 'agendada', 'ativa', 'pausada', 'concluida', 'cancelada'))
);

create table public.campanha_publicos (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  campanha_id uuid not null references public.campanhas(id) on delete cascade,
  nome varchar(150) not null,
  criterios jsonb not null default '{}'::jsonb,
  total_estimado integer not null default 0,
  ativo boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create table public.cupons (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  campanha_id uuid references public.campanhas(id) on delete set null,
  codigo varchar(50) not null,
  descricao text,
  tipo_desconto varchar(30) not null,
  valor_desconto numeric(10,2),
  percentual_desconto numeric(5,2),
  data_inicio date,
  data_fim date,
  limite_uso integer,
  qtd_utilizada integer not null default 0,
  ativo boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  constraint cupons_tipo_desconto_check check (tipo_desconto in ('valor', 'percentual')),
  constraint cupons_valor_check check (valor_desconto is null or valor_desconto >= 0),
  constraint cupons_percentual_check check (percentual_desconto is null or (percentual_desconto >= 0 and percentual_desconto <= 100))
);

create table public.agendamentos (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  cliente_id uuid not null references public.clientes(id) on delete restrict,
  profissional_id uuid not null references public.profissionais(id) on delete restrict,
  cupom_id uuid references public.cupons(id) on delete set null,
  data_inicio timestamptz not null,
  data_fim timestamptz not null,
  status varchar(30) not null default 'pendente',
  origem varchar(30) not null default 'link_agendamento',
  observacoes text,
  valor_total numeric(10,2) not null default 0,
  desconto_total numeric(10,2) not null default 0,
  confirmado_em timestamptz,
  cancelado_em timestamptz,
  concluido_em timestamptz,
  token_confirmacao text,
  metadata jsonb not null default '{}'::jsonb,
  ativo boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  constraint agendamentos_status_check check (status in ('pendente', 'confirmado', 'cancelado', 'concluido', 'no_show', 'reagendado')),
  constraint agendamentos_origem_check check (origem in ('link_agendamento', 'dashboard', 'whatsapp', 'manual', 'api')),
  constraint agendamentos_periodo_check check (data_inicio < data_fim),
  constraint agendamentos_valores_check check (valor_total >= 0 and desconto_total >= 0)
);

create table public.agendamento_servicos (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  agendamento_id uuid not null references public.agendamentos(id) on delete cascade,
  servico_id uuid not null references public.servicos(id) on delete restrict,
  nome_servico varchar(150) not null,
  duracao_minutos integer not null,
  valor_servico numeric(10,2) not null default 0,
  ativo boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  constraint agendamento_servicos_unique unique (agendamento_id, servico_id),
  constraint agendamento_servicos_duracao_check check (duracao_minutos > 0),
  constraint agendamento_servicos_valor_check check (valor_servico >= 0)
);

create table public.agendamento_status_historico (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  agendamento_id uuid not null references public.agendamentos(id) on delete cascade,
  usuario_id uuid references public.usuarios(id) on delete set null,
  status_anterior varchar(30),
  status_novo varchar(30) not null,
  motivo text,
  origem varchar(30) not null default 'sistema',
  metadata jsonb not null default '{}'::jsonb,
  ativo boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create table public.cancelamentos (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  agendamento_id uuid not null references public.agendamentos(id) on delete cascade,
  cliente_id uuid references public.clientes(id) on delete set null,
  usuario_id uuid references public.usuarios(id) on delete set null,
  motivo text,
  origem varchar(30) not null default 'cliente',
  cancelado_em timestamptz not null default now(),
  ativo boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create table public.confirmacoes (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  agendamento_id uuid not null references public.agendamentos(id) on delete cascade,
  cliente_id uuid not null references public.clientes(id) on delete cascade,
  canal varchar(30) not null default 'whatsapp',
  token_hash text,
  confirmado_em timestamptz,
  status varchar(30) not null default 'pendente',
  ativo boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  constraint confirmacoes_status_check check (status in ('pendente', 'confirmado', 'expirado', 'cancelado'))
);

create table public.no_show_registros (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  agendamento_id uuid not null references public.agendamentos(id) on delete cascade,
  cliente_id uuid not null references public.clientes(id) on delete cascade,
  profissional_id uuid not null references public.profissionais(id) on delete cascade,
  observacoes text,
  registrado_em timestamptz not null default now(),
  ativo boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create table public.crm_interacoes (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  cliente_id uuid not null references public.clientes(id) on delete cascade,
  usuario_id uuid references public.usuarios(id) on delete set null,
  agendamento_id uuid references public.agendamentos(id) on delete set null,
  tipo_interacao varchar(50) not null,
  descricao text,
  origem varchar(50) not null default 'sistema',
  score_relacionamento integer,
  metadata jsonb not null default '{}'::jsonb,
  ativo boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create table public.crm_scores (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  cliente_id uuid not null references public.clientes(id) on delete cascade,
  score_relacionamento integer not null default 0,
  frequencia_dias_media numeric(10,2),
  risco_abandono numeric(5,2),
  potencial_retorno numeric(5,2),
  ultima_compra_em timestamptz,
  proximo_retorno_sugerido date,
  metadata jsonb not null default '{}'::jsonb,
  ativo boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  constraint crm_scores_unique unique (tenant_id, cliente_id),
  constraint crm_scores_score_check check (score_relacionamento >= 0)
);

create table public.whatsapp_contas (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  usuario_id uuid references public.usuarios(id) on delete set null,
  tipo_uso varchar(30) not null default 'comum',
  telefone varchar(20) not null,
  provider varchar(50),
  provider_account_id text,
  phone_number_id text,
  business_account_id text,
  token_ref text,
  status varchar(30) not null default 'ativo',
  metadata jsonb not null default '{}'::jsonb,
  ativo boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  constraint whatsapp_contas_tipo_uso_check check (tipo_uso in ('comum', 'business', 'cloud_api')),
  constraint whatsapp_contas_status_check check (status in ('ativo', 'inativo', 'pendente', 'erro'))
);

create table public.templates_mensagem (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid references public.tenants(id) on delete cascade,
  nome varchar(100) not null,
  canal varchar(30) not null default 'whatsapp',
  tipo varchar(50) not null,
  assunto varchar(150),
  conteudo text not null,
  variaveis jsonb not null default '[]'::jsonb,
  aprovado_provider boolean not null default false,
  metadata jsonb not null default '{}'::jsonb,
  ativo boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create table public.campanha_envios (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  campanha_id uuid not null references public.campanhas(id) on delete cascade,
  cliente_id uuid not null references public.clientes(id) on delete cascade,
  template_id uuid references public.templates_mensagem(id) on delete set null,
  status varchar(30) not null default 'pendente',
  agendado_para timestamptz,
  enviado_em timestamptz,
  erro text,
  metadata jsonb not null default '{}'::jsonb,
  ativo boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  constraint campanha_envios_status_check check (status in ('pendente', 'enviado', 'erro', 'cancelado', 'ignorado'))
);

create table public.mensagens_whatsapp (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  whatsapp_conta_id uuid references public.whatsapp_contas(id) on delete set null,
  cliente_id uuid references public.clientes(id) on delete set null,
  agendamento_id uuid references public.agendamentos(id) on delete set null,
  campanha_id uuid references public.campanhas(id) on delete set null,
  campanha_envio_id uuid references public.campanha_envios(id) on delete set null,
  telefone_destino varchar(20) not null,
  direcao varchar(20) not null default 'saida',
  template_nome varchar(100),
  conteudo text,
  status_envio varchar(30) not null default 'pendente',
  provider_message_id text,
  enviado_em timestamptz,
  recebido_em timestamptz,
  erro_envio text,
  payload jsonb not null default '{}'::jsonb,
  ativo boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  constraint mensagens_whatsapp_direcao_check check (direcao in ('entrada', 'saida')),
  constraint mensagens_whatsapp_status_check check (status_envio in ('pendente', 'enviado', 'entregue', 'lido', 'erro', 'recebido'))
);

create table public.notificacoes (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  usuario_id uuid references public.usuarios(id) on delete cascade,
  cliente_id uuid references public.clientes(id) on delete cascade,
  titulo varchar(150) not null,
  mensagem text not null,
  tipo varchar(30) not null,
  lida boolean not null default false,
  data_leitura timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  ativo boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create table public.jobs_notificacao (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  agendamento_id uuid references public.agendamentos(id) on delete cascade,
  campanha_id uuid references public.campanhas(id) on delete cascade,
  cliente_id uuid references public.clientes(id) on delete cascade,
  tipo varchar(50) not null,
  canal varchar(30) not null default 'whatsapp',
  status varchar(30) not null default 'pendente',
  executar_em timestamptz not null,
  executado_em timestamptz,
  tentativas integer not null default 0,
  ultimo_erro text,
  payload jsonb not null default '{}'::jsonb,
  ativo boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  constraint jobs_notificacao_status_check check (status in ('pendente', 'processando', 'concluido', 'erro', 'cancelado'))
);

create table public.cupom_usos (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  cupom_id uuid not null references public.cupons(id) on delete cascade,
  cliente_id uuid references public.clientes(id) on delete set null,
  agendamento_id uuid references public.agendamentos(id) on delete set null,
  valor_desconto numeric(10,2) not null default 0,
  usado_em timestamptz not null default now(),
  ativo boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create table public.contas_correntes (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  nome varchar(120) not null,
  tipo varchar(50) not null default 'operacional',
  saldo_inicial numeric(10,2) not null default 0,
  saldo_atual numeric(10,2) not null default 0,
  ativo boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create table public.formas_pagamento (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  nome varchar(80) not null,
  tipo varchar(40) not null,
  taxa_percentual numeric(5,2) not null default 0,
  taxa_fixa numeric(10,2) not null default 0,
  prazo_recebimento_dias integer not null default 0,
  ativo boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create table public.lancamentos_financeiros (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  conta_corrente_id uuid references public.contas_correntes(id) on delete set null,
  agendamento_id uuid references public.agendamentos(id) on delete set null,
  cliente_id uuid references public.clientes(id) on delete set null,
  profissional_id uuid references public.profissionais(id) on delete set null,
  tipo varchar(20) not null,
  categoria varchar(80) not null,
  descricao text,
  valor numeric(10,2) not null,
  data_competencia date not null default current_date,
  data_vencimento date,
  data_pagamento timestamptz,
  status varchar(30) not null default 'pendente',
  metadata jsonb not null default '{}'::jsonb,
  ativo boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  constraint lancamentos_financeiros_tipo_check check (tipo in ('entrada', 'saida')),
  constraint lancamentos_financeiros_status_check check (status in ('pendente', 'pago', 'cancelado', 'vencido')),
  constraint lancamentos_financeiros_valor_check check (valor >= 0)
);

create table public.recebimentos (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  lancamento_id uuid not null references public.lancamentos_financeiros(id) on delete cascade,
  forma_pagamento_id uuid references public.formas_pagamento(id) on delete set null,
  valor_bruto numeric(10,2) not null,
  valor_taxa numeric(10,2) not null default 0,
  valor_liquido numeric(10,2) not null,
  recebido_em timestamptz not null default now(),
  provider varchar(50),
  provider_payment_id text,
  metadata jsonb not null default '{}'::jsonb,
  ativo boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  constraint recebimentos_valores_check check (valor_bruto >= 0 and valor_taxa >= 0 and valor_liquido >= 0)
);

create table public.comissoes_profissionais (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  profissional_id uuid not null references public.profissionais(id) on delete cascade,
  agendamento_id uuid references public.agendamentos(id) on delete set null,
  lancamento_id uuid references public.lancamentos_financeiros(id) on delete set null,
  percentual numeric(5,2) not null default 0,
  valor_base numeric(10,2) not null,
  valor_comissao numeric(10,2) not null,
  status varchar(30) not null default 'pendente',
  pago_em timestamptz,
  ativo boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  constraint comissoes_profissionais_status_check check (status in ('pendente', 'paga', 'cancelada')),
  constraint comissoes_profissionais_percentual_check check (percentual >= 0 and percentual <= 100),
  constraint comissoes_profissionais_valores_check check (valor_base >= 0 and valor_comissao >= 0)
);

create table public.indicadores_financeiros_snapshot (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  data_referencia date not null,
  periodo varchar(20) not null default 'diario',
  faturamento_bruto numeric(10,2) not null default 0,
  faturamento_liquido numeric(10,2) not null default 0,
  despesas numeric(10,2) not null default 0,
  lucro_estimado numeric(10,2) not null default 0,
  qtd_agendamentos integer not null default 0,
  ticket_medio numeric(10,2) not null default 0,
  taxa_ocupacao numeric(5,2),
  metadata jsonb not null default '{}'::jsonb,
  ativo boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  constraint indicadores_financeiros_unique unique (tenant_id, data_referencia, periodo)
);

create table public.automacoes (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  nome varchar(150) not null,
  tipo varchar(50) not null,
  gatilho varchar(80) not null,
  canal varchar(30) not null default 'whatsapp',
  configuracao jsonb not null default '{}'::jsonb,
  status varchar(30) not null default 'ativa',
  ativo boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  constraint automacoes_status_check check (status in ('ativa', 'pausada', 'inativa'))
);

create table public.automacao_execucoes (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  automacao_id uuid not null references public.automacoes(id) on delete cascade,
  cliente_id uuid references public.clientes(id) on delete set null,
  agendamento_id uuid references public.agendamentos(id) on delete set null,
  status varchar(30) not null default 'pendente',
  executado_em timestamptz,
  erro text,
  entrada jsonb not null default '{}'::jsonb,
  saida jsonb not null default '{}'::jsonb,
  ativo boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  constraint automacao_execucoes_status_check check (status in ('pendente', 'executando', 'concluida', 'erro', 'cancelada'))
);

create table public.modelos_prompt (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid references public.tenants(id) on delete cascade,
  nome varchar(120) not null,
  tipo varchar(80) not null,
  versao integer not null default 1,
  prompt text not null,
  parametros jsonb not null default '{}'::jsonb,
  ativo boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create table public.ia_sugestoes (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  cliente_id uuid references public.clientes(id) on delete set null,
  campanha_id uuid references public.campanhas(id) on delete set null,
  modelo_prompt_id uuid references public.modelos_prompt(id) on delete set null,
  tipo varchar(80) not null,
  titulo varchar(150),
  conteudo text,
  score numeric(5,2),
  status varchar(30) not null default 'pendente',
  entrada jsonb not null default '{}'::jsonb,
  saida jsonb not null default '{}'::jsonb,
  ativo boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  constraint ia_sugestoes_status_check check (status in ('pendente', 'aprovada', 'rejeitada', 'aplicada'))
);

create table public.ia_insights (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  tipo varchar(80) not null,
  titulo varchar(150) not null,
  descricao text,
  severidade varchar(30) not null default 'info',
  periodo_inicio date,
  periodo_fim date,
  dados jsonb not null default '{}'::jsonb,
  status varchar(30) not null default 'novo',
  ativo boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  constraint ia_insights_severidade_check check (severidade in ('info', 'atencao', 'critico', 'positivo')),
  constraint ia_insights_status_check check (status in ('novo', 'visualizado', 'arquivado'))
);

-- Unique and performance indexes.
create unique index idx_tenants_slug_unique on public.tenants (lower(slug)) where deleted_at is null;
create index idx_tenants_cpf_cnpj on public.tenants (cpf_cnpj);
create index idx_tenants_status on public.tenants (status);
create index idx_assinaturas_tenant_status on public.assinaturas (tenant_id, status);
create index idx_pagamentos_assinatura_tenant_status on public.pagamentos_assinatura (tenant_id, status);
create unique index idx_usuarios_email_unique on public.usuarios (lower(email)) where deleted_at is null;
create index idx_usuarios_tenant on public.usuarios (tenant_id);
create index idx_usuarios_tipo on public.usuarios (tipo_usuario);
create index idx_profissionais_tenant on public.profissionais (tenant_id);
create index idx_profissionais_usuario on public.profissionais (usuario_id);
create index idx_servicos_tenant on public.servicos (tenant_id);
create index idx_servicos_categoria on public.servicos (tenant_id, categoria);
create index idx_profissional_servicos_profissional on public.profissional_servicos (profissional_id);
create index idx_profissional_servicos_servico on public.profissional_servicos (servico_id);
create index idx_escalas_profissional_dia on public.escalas_semanais (profissional_id, dia_semana);
create index idx_bloqueios_periodo on public.bloqueios_agenda (tenant_id, data_inicio, data_fim);
create index idx_feriados_data on public.feriados (tenant_id, data);
create unique index idx_links_agendamento_slug_unique on public.links_agendamento (lower(slug)) where deleted_at is null;
create index idx_clientes_telefone on public.clientes (telefone);
create index idx_clientes_nome on public.clientes (nome);
create index idx_clientes_email on public.clientes (email);
create index idx_cliente_tenants_tenant on public.cliente_tenants (tenant_id);
create index idx_cliente_tenants_cliente on public.cliente_tenants (cliente_id);
create index idx_tokens_cliente_token_hash on public.tokens_cliente (token_hash);
create index idx_campanhas_tenant_status on public.campanhas (tenant_id, status);
create unique index idx_cupons_codigo_tenant_unique on public.cupons (tenant_id, lower(codigo)) where deleted_at is null;
create index idx_agendamentos_tenant_data on public.agendamentos (tenant_id, data_inicio);
create index idx_agendamentos_profissional_data on public.agendamentos (profissional_id, data_inicio);
create index idx_agendamentos_cliente on public.agendamentos (cliente_id);
create index idx_agendamentos_status on public.agendamentos (tenant_id, status);
create index idx_agendamento_servicos_agendamento on public.agendamento_servicos (agendamento_id);
create index idx_agendamento_status_historico_agendamento on public.agendamento_status_historico (agendamento_id, created_at);
create index idx_crm_interacoes_cliente on public.crm_interacoes (cliente_id);
create index idx_crm_interacoes_tenant_created on public.crm_interacoes (tenant_id, created_at);
create index idx_whatsapp_contas_tenant on public.whatsapp_contas (tenant_id, tipo_uso);
create index idx_templates_mensagem_tenant_tipo on public.templates_mensagem (tenant_id, tipo);
create index idx_campanha_envios_status on public.campanha_envios (tenant_id, status);
create index idx_mensagens_whatsapp_status on public.mensagens_whatsapp (status_envio);
create index idx_mensagens_whatsapp_cliente on public.mensagens_whatsapp (cliente_id);
create index idx_mensagens_whatsapp_agendamento on public.mensagens_whatsapp (agendamento_id);
create index idx_notificacoes_usuario_lida on public.notificacoes (usuario_id, lida);
create index idx_jobs_notificacao_execucao on public.jobs_notificacao (status, executar_em);
create index idx_lancamentos_financeiros_tenant_data on public.lancamentos_financeiros (tenant_id, data_competencia);
create index idx_lancamentos_financeiros_status on public.lancamentos_financeiros (tenant_id, status);
create index idx_recebimentos_lancamento on public.recebimentos (lancamento_id);
create index idx_comissoes_profissionais_status on public.comissoes_profissionais (profissional_id, status);
create index idx_indicadores_financeiros_periodo on public.indicadores_financeiros_snapshot (tenant_id, periodo, data_referencia);
create index idx_automacoes_tenant_status on public.automacoes (tenant_id, status);
create index idx_automacao_execucoes_status on public.automacao_execucoes (tenant_id, status);
create index idx_ia_sugestoes_status on public.ia_sugestoes (tenant_id, status);
create index idx_ia_insights_status on public.ia_insights (tenant_id, status);

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
    execute format(
      'create trigger set_updated_at before update on public.%I for each row execute function public.set_updated_at()',
      table_name
    );
  end loop;
end;
$$;
