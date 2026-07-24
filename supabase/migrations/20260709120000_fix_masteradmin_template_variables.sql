-- Align MasterAdmin/SaaS internal templates with the named-variable pattern
-- used by the application editor and renderer. Provider names remain stored
-- in metadata.provider_template_name for Meta/WhatsApp compatibility.

with seed_templates (
  nome,
  conteudo,
  variaveis
) as (
  values
    (
      'master_tenant_created',
      $template$
Ola, {{nome_responsavel}}!

Sua conta foi criada com sucesso.

Empresa/Salao:
{{nome_empresa}}

Acesse a plataforma para concluir suas configuracoes iniciais.
$template$,
      '["nome_responsavel", "nome_empresa"]'::jsonb
    ),
    (
      'master_trial_started',
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
      '["nome_responsavel", "nome_plano", "data_inicio", "data_termino"]'::jsonb
    ),
    (
      'master_trial_ending',
      $template$
Ola, {{nome_responsavel}}!

Seu periodo de teste da plataforma esta proximo do fim.

Empresa/Salao:
{{nome_empresa}}

Termino previsto:
{{data_termino}}

Para continuar usando os recursos da plataforma, regularize seu plano.
$template$,
      '["nome_responsavel", "nome_empresa", "data_termino"]'::jsonb
    ),
    (
      'master_plan_activated',
      $template$
Ola, {{nome_responsavel}}!

Seu plano na plataforma foi ativado com sucesso.

Plano:
{{nome_plano}}

Empresa/Salao:
{{nome_empresa}}

Agora voce ja pode continuar usando os recursos da plataforma normalmente.
$template$,
      '["nome_responsavel", "nome_plano", "nome_empresa"]'::jsonb
    ),
    (
      'master_plan_suspended',
      $template$
Ola, {{nome_responsavel}}.

O acesso a plataforma foi temporariamente suspenso.

Empresa/Salao:
{{nome_empresa}}

Motivo:
{{motivo}}

Para regularizar, acesse sua conta ou entre em contato com o suporte da plataforma.
$template$,
      '["nome_responsavel", "nome_empresa", "motivo"]'::jsonb
    ),
    (
      'master_payment_pending',
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
      '["nome_responsavel", "nome_empresa", "nome_plano", "data_vencimento"]'::jsonb
    ),
    (
      'master_payment_confirmed',
      $template$
Ola, {{nome_responsavel}}!

Recebemos a confirmacao do pagamento do seu plano na plataforma.

Empresa/Salao:
{{nome_empresa}}

Plano:
{{nome_plano}}

Obrigado por continuar com a plataforma.
$template$,
      '["nome_responsavel", "nome_empresa", "nome_plano"]'::jsonb
    ),
    (
      'master_support_opened',
      $template$
Ola, {{nome_responsavel}}!

Recebemos sua solicitacao de suporte na plataforma.

Protocolo:
{{protocolo}}

Assunto:
{{assunto}}

Nossa equipe ira analisar e retornar assim que possivel.
$template$,
      '["nome_responsavel", "protocolo", "assunto"]'::jsonb
    ),
    (
      'master_support_updated',
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
      '["nome_responsavel", "protocolo", "status", "mensagem"]'::jsonb
    ),
    (
      'master_security_alert',
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
      '["nome_responsavel", "evento", "data_hora"]'::jsonb
    ),
    (
      'master_whatsapp_provider_error',
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
      '["tenant", "evento", "template", "erro"]'::jsonb
    ),
    (
      'master_template_not_approved',
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
      '["tenant", "template", "evento"]'::jsonb
    ),
    (
      'master_tenant_onboarding_incomplete',
      $template$
Ola, {{nome_responsavel}}!

Seu cadastro na plataforma ainda esta incompleto.

Empresa/Salao:
{{nome_empresa}}

Etapa pendente:
{{etapa_pendente}}

Conclua essa etapa para liberar melhor uso da plataforma.
$template$,
      '["nome_responsavel", "nome_empresa", "etapa_pendente"]'::jsonb
    ),
    (
      'master_system_maintenance_notice',
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
      '["nome_responsavel", "data", "horario", "impacto"]'::jsonb
    )
)
update public.templates_mensagem existing
set
  conteudo = seed.conteudo,
  variaveis = seed.variaveis,
  metadata = coalesce(existing.metadata, '{}'::jsonb) || jsonb_build_object(
    'provider_template_name', seed.nome,
    'language', coalesce(existing.metadata->>'language', 'pt_BR'),
    'categoria_provider', coalesce(existing.metadata->>'categoria_provider', 'Utility'),
    'provider_parameter_format', 'positional',
    'provider_variable_mapping', (
      select jsonb_object_agg(variable_name, variable_index)
      from jsonb_array_elements_text(seed.variaveis) with ordinality as mapping(variable_name, variable_index)
    ),
    'variable_pattern', 'named',
    'seed_fix', '20260709120000_fix_masteradmin_template_variables'
  ),
  updated_at = now()
from seed_templates seed
where existing.tenant_id is null
  and existing.nome = seed.nome
  and existing.deleted_at is null
  and existing.aprovado_provider = false;
