-- Initial operational WhatsApp templates used by appointment workflows.
-- These rows are internal catalog records and must remain unapproved until
-- WhatsApp/Meta approves their provider counterparts.

with seed_templates (
  nome,
  tipo,
  conteudo,
  variaveis,
  destinatario,
  finalidade
) as (
  values
    (
      'appointment_created',
      'operacional',
      $template$
Ola, {{nome_cliente}}!

Recebemos sua solicitacao de atendimento.

Servico: {{nome_servico}}
Profissional: {{nome_profissional}}
Data: {{data_agendamento}}
Horario: {{hora_agendamento}}

Aguarde a confirmacao do salao.
$template$,
      '["nome_cliente", "nome_servico", "nome_profissional", "data_agendamento", "hora_agendamento"]'::jsonb,
      'cliente',
      'Avisar o cliente que a solicitacao de atendimento foi criada.'
    ),
    (
      'appointment_rescheduled',
      'operacional',
      $template$
Ola, {{nome_cliente}}.

Seu atendimento foi reagendado.

Servico: {{nome_servico}}
Profissional: {{nome_profissional}}
Nova data: {{data_agendamento}}
Novo horario: {{hora_agendamento}}
$template$,
      '["nome_cliente", "nome_servico", "nome_profissional", "data_agendamento", "hora_agendamento"]'::jsonb,
      'cliente',
      'Avisar o cliente sobre reagendamento do atendimento.'
    ),
    (
      'appointment_confirmed',
      'operacional',
      $template$
Ola, {{nome_cliente}}!

Seu atendimento foi confirmado.

Servico: {{nome_servico}}
Profissional: {{nome_profissional}}
Data: {{data_agendamento}}
Horario: {{hora_agendamento}}

Estamos aguardando voce.
$template$,
      '["nome_cliente", "nome_servico", "nome_profissional", "data_agendamento", "hora_agendamento"]'::jsonb,
      'cliente',
      'Confirmar ao cliente que o atendimento foi aprovado pelo salao.'
    ),
    (
      'appointment_cancelled',
      'operacional',
      $template$
Ola, {{nome_cliente}}.

Seu atendimento foi cancelado.

Servico: {{nome_servico}}
Data: {{data_agendamento}}
Horario: {{hora_agendamento}}
Motivo: {{motivo_cancelamento}}

Se desejar, voce pode fazer um novo agendamento.
$template$,
      '["nome_cliente", "nome_servico", "data_agendamento", "hora_agendamento", "motivo_cancelamento"]'::jsonb,
      'cliente',
      'Avisar o cliente sobre cancelamento do atendimento.'
    ),
    (
      'appointment_cancelled_by_attendant',
      'operacional',
      $template$
Ola, {{nome_cliente}}.

Seu atendimento foi cancelado pelo salao.

Servico: {{nome_servico}}
Data: {{data_agendamento}}
Horario: {{hora_agendamento}}
Motivo: {{motivo_cancelamento}}

Se desejar, voce pode fazer um novo agendamento.
$template$,
      '["nome_cliente", "nome_servico", "data_agendamento", "hora_agendamento", "motivo_cancelamento"]'::jsonb,
      'cliente',
      'Avisar o cliente quando o atendente cancelar o atendimento.'
    ),
    (
      'appointment_cancelled_by_client',
      'operacional',
      $template$
Ola, {{nome_cliente}}.

Seu atendimento foi cancelado conforme solicitado.

Servico: {{nome_servico}}
Data: {{data_agendamento}}
Horario: {{hora_agendamento}}

Se desejar, voce pode fazer um novo agendamento.
$template$,
      '["nome_cliente", "nome_servico", "data_agendamento", "hora_agendamento"]'::jsonb,
      'cliente',
      'Confirmar ao cliente o cancelamento solicitado por ele.'
    ),
    (
      'appointment_reminder_24h',
      'operacional',
      $template$
Ola, {{nome_cliente}}!

Voce possui atendimento amanha.

Servico: {{nome_servico}}
Profissional: {{nome_profissional}}
Data: {{data_agendamento}}
Horario: {{hora_agendamento}}
$template$,
      '["nome_cliente", "nome_servico", "nome_profissional", "data_agendamento", "hora_agendamento"]'::jsonb,
      'cliente',
      'Lembrar o cliente com 24 horas de antecedencia.'
    ),
    (
      'appointment_reminder_2h',
      'operacional',
      $template$
Ola, {{nome_cliente}}!

Seu atendimento de {{nome_servico}} ocorrera em aproximadamente 2 horas.

Horario: {{hora_agendamento}}
Profissional: {{nome_profissional}}
$template$,
      '["nome_cliente", "nome_servico", "hora_agendamento", "nome_profissional"]'::jsonb,
      'cliente',
      'Lembrar o cliente com 2 horas de antecedencia.'
    ),
    (
      'appointment_completed',
      'operacional',
      $template$
Ola, {{nome_cliente}}!

Obrigado por realizar seu atendimento na {{nome_salao}}.

Servico: {{nome_servico}}

Esperamos ver voce novamente em breve.
$template$,
      '["nome_cliente", "nome_salao", "nome_servico"]'::jsonb,
      'cliente',
      'Agradecer o cliente apos atendimento concluido.'
    ),
    (
      'appointment_no_show_client',
      'operacional',
      $template$
Ola, {{nome_cliente}}.

Identificamos que voce nao compareceu ao atendimento agendado.

Servico: {{nome_servico}}
Data: {{data_agendamento}}
Horario: {{hora_agendamento}}

Se desejar, voce pode fazer um novo agendamento.
$template$,
      '["nome_cliente", "nome_servico", "data_agendamento", "hora_agendamento"]'::jsonb,
      'cliente',
      'Avisar ou educar o cliente apos registro de no-show.'
    ),
    (
      'appointment_cancelled_salon',
      'operacional',
      $template$
Atencao.

Um atendimento foi cancelado pelo cliente.

Cliente: {{nome_cliente}}
Servico: {{nome_servico}}
Data: {{data_agendamento}}
Horario: {{hora_agendamento}}
Motivo: {{motivo_cancelamento}}
$template$,
      '["nome_cliente", "nome_servico", "data_agendamento", "hora_agendamento", "motivo_cancelamento"]'::jsonb,
      'salao',
      'Avisar o salao quando o cliente cancelar um atendimento.'
    ),
    (
      'appointment_rescheduled_salon',
      'operacional',
      $template$
Atencao.

Um atendimento foi reagendado.

Cliente: {{nome_cliente}}
Servico: {{nome_servico}}
Nova data: {{data_agendamento}}
Novo horario: {{hora_agendamento}}
$template$,
      '["nome_cliente", "nome_servico", "data_agendamento", "hora_agendamento"]'::jsonb,
      'salao',
      'Avisar o salao sobre reagendamento de atendimento.'
    ),
    (
      'appointment_pending_attendant_operational',
      'operacional',
      $template$
Atencao!

Existe um agendamento aguardando sua confirmacao.

Cliente: {{nome_cliente}}
Servico: {{nome_servico}}
Data: {{data_agendamento}}
Horario: {{hora_agendamento}}
$template$,
      '["nome_cliente", "nome_servico", "data_agendamento", "hora_agendamento"]'::jsonb,
      'salao',
      'Avisar o salao que existe atendimento pendente de confirmacao.'
    ),
    (
      'appointment_pending_attendant_reminder_60m',
      'operacional',
      $template$
Atencao!

Este agendamento continua aguardando confirmacao ha 60 minutos.

Cliente: {{nome_cliente}}
Servico: {{nome_servico}}
Data: {{data_agendamento}}
Horario: {{hora_agendamento}}
$template$,
      '["nome_cliente", "nome_servico", "data_agendamento", "hora_agendamento"]'::jsonb,
      'salao',
      'Relembrar o salao apos 60 minutos sem confirmacao.'
    ),
    (
      'appointment_pending_attendant_reminder_30m',
      'operacional',
      $template$
Atencao!

Este agendamento continua aguardando confirmacao ha 30 minutos.

Cliente: {{nome_cliente}}
Servico: {{nome_servico}}
Data: {{data_agendamento}}
Horario: {{hora_agendamento}}
$template$,
      '["nome_cliente", "nome_servico", "data_agendamento", "hora_agendamento"]'::jsonb,
      'salao',
      'Relembrar o salao apos 30 minutos sem confirmacao.'
    ),
    (
      'appointment_no_show_salon',
      'operacional',
      $template$
No-show registrado.

Cliente: {{nome_cliente}}
Servico: {{nome_servico}}
Data: {{data_agendamento}}
Horario: {{hora_agendamento}}
$template$,
      '["nome_cliente", "nome_servico", "data_agendamento", "hora_agendamento"]'::jsonb,
      'salao',
      'Avisar o salao sobre registro de no-show.'
    )
),
updated_templates as (
  update public.templates_mensagem existing
  set
    canal = 'whatsapp',
    tipo = seed.tipo,
    conteudo = seed.conteudo,
    variaveis = seed.variaveis,
    aprovado_provider = false,
    metadata = coalesce(existing.metadata, '{}'::jsonb) || jsonb_build_object(
      'provider_template_name', seed.nome,
      'language', 'pt_BR',
      'categoria_provider', 'Utility',
      'categoria', 'agendamento',
      'escopo', 'tenant',
      'owner', seed.destinatario,
      'destinatario', seed.destinatario,
      'finalidade', seed.finalidade,
      'seed', '20260709110000_operational_whatsapp_templates'
    ),
    ativo = true,
    updated_at = now()
  from seed_templates seed
  where existing.tenant_id is null
    and existing.nome = seed.nome
    and existing.deleted_at is null
  returning existing.nome
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
    'categoria', 'agendamento',
    'escopo', 'tenant',
    'owner', seed.destinatario,
    'destinatario', seed.destinatario,
    'finalidade', seed.finalidade,
    'seed', '20260709110000_operational_whatsapp_templates'
  ),
  true
from seed_templates seed
where not exists (
  select 1
  from updated_templates updated
  where updated.nome = seed.nome
);
