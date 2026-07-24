-- Initial platform-level communication templates for MasterAdmin/SaaS processes.
-- These templates are global (tenant_id null) and are not sent automatically by
-- this migration. Existing templates with the same name are preserved.

with seed_templates (
  nome,
  tipo,
  conteudo,
  variaveis,
  finalidade
) as (
  values
    (
      'master_tenant_created',
      'administrativo',
      $template$
Ola, {{nome_responsavel}}!

Sua conta foi criada com sucesso.

Empresa/Salao:
{{nome_empresa}}

Acesse a plataforma para concluir suas configuracoes iniciais.
$template$,
      '["nome_responsavel", "nome_empresa"]'::jsonb,
      'Avisar o dono do salao/autonomo que sua conta foi criada.'
    ),
    (
      'master_trial_started',
      'administrativo',
      $template$
Ola, {{nome_responsavel}}!

Seu periodo de teste na plataforma foi iniciado.

Plano:
{{nome_plano}}

Data de inicio:
{{data_inicio}}

Data prevista para termino:
{{data_termino}}

Aproveite este periodo para configurar sua agenda, equipe, servicos e comunicacao com clientes.
$template$,
      '["nome_responsavel", "nome_plano", "data_inicio", "data_termino"]'::jsonb,
      'Avisar inicio do periodo de teste.'
    ),
    (
      'master_trial_ending',
      'administrativo',
      $template$
Ola, {{nome_responsavel}}!

Seu periodo de teste da plataforma esta proximo do fim.

Empresa/Salao:
{{nome_empresa}}

Termino previsto:
{{data_termino}}

Para continuar usando os recursos da plataforma, regularize seu plano.
$template$,
      '["nome_responsavel", "nome_empresa", "data_termino"]'::jsonb,
      'Avisar que o trial esta proximo do fim.'
    ),
    (
      'master_plan_activated',
      'financeiro',
      $template$
Ola, {{nome_responsavel}}!

Seu plano na plataforma foi ativado com sucesso.

Plano:
{{nome_plano}}

Empresa/Salao:
{{nome_empresa}}

Agora voce ja pode continuar usando os recursos da plataforma normalmente.
$template$,
      '["nome_responsavel", "nome_plano", "nome_empresa"]'::jsonb,
      'Confirmar ativacao do plano.'
    ),
    (
      'master_plan_suspended',
      'financeiro',
      $template$
Ola, {{nome_responsavel}}.

O acesso a plataforma foi temporariamente suspenso.

Empresa/Salao:
{{nome_empresa}}

Motivo:
{{motivo}}

Para regularizar, acesse sua conta ou entre em contato com o suporte da plataforma.
$template$,
      '["nome_responsavel", "nome_empresa", "motivo"]'::jsonb,
      'Avisar suspensao do plano.'
    ),
    (
      'master_payment_pending',
      'financeiro',
      $template$
Ola, {{nome_responsavel}}.

Identificamos uma pendencia relacionada ao seu plano na plataforma.

Empresa/Salao:
{{nome_empresa}}

Plano:
{{nome_plano}}

Vencimento:
{{data_vencimento}}

Regularize para evitar interrupcao dos servicos.
$template$,
      '["nome_responsavel", "nome_empresa", "nome_plano", "data_vencimento"]'::jsonb,
      'Avisar pendencia de pagamento.'
    ),
    (
      'master_payment_confirmed',
      'financeiro',
      $template$
Ola, {{nome_responsavel}}!

Recebemos a confirmacao do pagamento do seu plano na plataforma.

Empresa/Salao:
{{nome_empresa}}

Plano:
{{nome_plano}}

Obrigado por continuar com a plataforma.
$template$,
      '["nome_responsavel", "nome_empresa", "nome_plano"]'::jsonb,
      'Confirmar pagamento recebido.'
    ),
    (
      'master_support_opened',
      'suporte',
      $template$
Ola, {{nome_responsavel}}!

Recebemos sua solicitacao de suporte na plataforma.

Protocolo:
{{protocolo}}

Assunto:
{{assunto}}

Nossa equipe ira analisar e retornar assim que possivel.
$template$,
      '["nome_responsavel", "protocolo", "assunto"]'::jsonb,
      'Confirmar abertura de chamado de suporte.'
    ),
    (
      'master_support_updated',
      'suporte',
      $template$
Ola, {{nome_responsavel}}!

Seu chamado de suporte na plataforma foi atualizado.

Protocolo:
{{protocolo}}

Status:
{{status}}

Mensagem:
{{mensagem}}
$template$,
      '["nome_responsavel", "protocolo", "status", "mensagem"]'::jsonb,
      'Avisar atualizacao de chamado.'
    ),
    (
      'master_security_alert',
      'seguranca',
      $template$
Ola, {{nome_responsavel}}.

Identificamos uma atividade importante na sua conta da plataforma.

Evento:
{{evento}}

Data/Hora:
{{data_hora}}

Se voce reconhece essa atividade, nenhuma acao e necessaria.
Caso contrario, entre em contato com o suporte da plataforma.
$template$,
      '["nome_responsavel", "evento", "data_hora"]'::jsonb,
      'Avisar evento relevante de seguranca.'
    ),
    (
      'master_whatsapp_provider_error',
      'sistema',
      $template$
Atencao!

Foi identificado erro no envio de mensagens WhatsApp pela plataforma.

Tenant:
{{tenant}}

Evento:
{{evento}}

Template:
{{template}}

Erro:
{{erro}}

Verifique o painel de comunicacao.
$template$,
      '["tenant", "evento", "template", "erro"]'::jsonb,
      'Avisar MasterAdmin sobre erro na integracao WhatsApp.'
    ),
    (
      'master_template_not_approved',
      'sistema',
      $template$
Atencao!

Uma mensagem WhatsApp foi bloqueada porque o template nao esta aprovado no provider.

Tenant:
{{tenant}}

Template:
{{template}}

Evento:
{{evento}}

Acao necessaria:
Verificar aprovacao do template no WhatsApp Manager e atualizar templates_mensagem.
$template$,
      '["tenant", "template", "evento"]'::jsonb,
      'Avisar MasterAdmin que mensagem foi bloqueada por template nao aprovado.'
    ),
    (
      'master_tenant_onboarding_incomplete',
      'administrativo',
      $template$
Ola, {{nome_responsavel}}!

Seu cadastro na plataforma ainda esta incompleto.

Empresa/Salao:
{{nome_empresa}}

Etapa pendente:
{{etapa_pendente}}

Conclua essa etapa para liberar melhor uso da plataforma.
$template$,
      '["nome_responsavel", "nome_empresa", "etapa_pendente"]'::jsonb,
      'Avisar dono do salao/autonomo que o onboarding esta incompleto.'
    ),
    (
      'master_system_maintenance_notice',
      'sistema',
      $template$
Ola, {{nome_responsavel}}.

A plataforma passara por uma manutencao programada.

Data:
{{data}}

Horario:
{{horario}}

Impacto esperado:
{{impacto}}

Recomendamos evitar operacoes criticas durante esse periodo.
$template$,
      '["nome_responsavel", "data", "horario", "impacto"]'::jsonb,
      'Aviso de manutencao programada.'
    )
)
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
  seed.nome,
  'whatsapp',
  seed.tipo,
  null,
  seed.conteudo,
  seed.variaveis,
  false,
  jsonb_build_object(
    'provider_template_name', seed.nome,
    'language', 'pt_BR',
    'categoria_provider', 'Utility',
    'categoria', 'plataforma',
    'escopo', 'platform',
    'owner', 'masteradmin',
    'provider_parameter_format', 'positional',
    'provider_variable_mapping', (
      select jsonb_object_agg(variable_name, variable_index)
      from jsonb_array_elements_text(seed.variaveis) with ordinality as mapping(variable_name, variable_index)
    ),
    'finalidade', seed.finalidade,
    'seed', '20260707100000_masteradmin_communication_templates'
  ),
  true
from seed_templates seed
where not exists (
  select 1
  from public.templates_mensagem existing
  where existing.tenant_id is null
    and existing.nome = seed.nome
    and existing.deleted_at is null
);
