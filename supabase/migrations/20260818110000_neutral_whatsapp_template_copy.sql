-- Ajusta a redacao dos templates WhatsApp para evitar artigos dependentes
-- de genero antes do nome dinamico do estabelecimento e padroniza acentos.

with template_updates (
  nome,
  tipo,
  conteudo,
  variaveis
) as (
  values
    (
      'appointment_created',
      'operacional',
      $template$
Olá, {{1}}!

Recebemos sua solicitação de atendimento em {{2}}.

Serviço: {{3}}
Profissional: {{4}}
Data: {{5}}
Horário: {{6}}

Aguarde a confirmação do estabelecimento.
$template$,
      '["nome_cliente", "nome_estabelecimento", "nome_servico", "nome_profissional", "data_agendamento", "hora_agendamento"]'::jsonb
    ),
    (
      'appointment_pending_client',
      'operacional',
      $template$
Olá, {{1}}! {{2}} recebeu sua solicitação de atendimento.
Serviço: {{3}}
Profissional: {{4}}
Data: {{5}}
Horário: {{6}}
Para confirmar sua presença, acesse: {{7}}
Caso necessário:
Cancelar: {{8}}
Reagendar: {{9}}
$template$,
      '["nome_cliente", "nome_estabelecimento", "nome_servico", "nome_profissional", "data_agendamento", "hora_agendamento", "link_confirmar", "link_cancelar", "link_reagendar"]'::jsonb
    ),
    (
      'appointment_confirmed',
      'operacional',
      $template$
Olá, {{1}}!

{{2}} confirmou seu atendimento.

Data: {{5}}
Horário: {{6}}
Serviço: {{3}}
Profissional: {{4}}

Estamos aguardando você.

Caso precise alterar seu atendimento, utilize uma das opções abaixo:

[Reagendar]

[Cancelar]
$template$,
      '["nome_cliente", "nome_estabelecimento", "nome_servico", "nome_profissional", "data_agendamento", "hora_agendamento"]'::jsonb
    ),
    (
      'appointment_rescheduled',
      'operacional',
      $template$
Olá, {{1}}.

{{2}} reagendou seu atendimento.

Serviço: {{3}}
Profissional: {{4}}
Nova data: {{5}}
Novo horário: {{6}}
$template$,
      '["nome_cliente", "nome_estabelecimento", "nome_servico", "nome_profissional", "data_agendamento", "hora_agendamento"]'::jsonb
    ),
    (
      'appointment_cancelled',
      'operacional',
      $template$
Olá, {{1}}.

Seu atendimento em {{2}} foi cancelado.

Serviço: {{3}}
Data: {{4}}
Horário: {{5}}
Motivo: {{6}}

Se desejar, você pode fazer um novo agendamento.
$template$,
      '["nome_cliente", "nome_estabelecimento", "nome_servico", "data_agendamento", "hora_agendamento", "motivo_cancelamento"]'::jsonb
    ),
    (
      'appointment_cancelled_by_attendant',
      'operacional',
      $template$
Olá, {{1}}.

{{2}} cancelou seu atendimento pelo seguinte motivo:

{{6}}

Serviço: {{3}}
Data: {{4}}
Horário: {{5}}

Se desejar, você pode fazer um novo agendamento.
$template$,
      '["nome_cliente", "nome_estabelecimento", "nome_servico", "data_agendamento", "hora_agendamento", "motivo_cancelamento"]'::jsonb
    ),
    (
      'appointment_cancelled_by_client',
      'operacional',
      $template$
Olá, {{1}}.

Seu atendimento em {{2}} foi cancelado conforme solicitado.

Serviço: {{3}}
Data: {{4}}
Horário: {{5}}

Se desejar, você pode fazer um novo agendamento.
$template$,
      '["nome_cliente", "nome_estabelecimento", "nome_servico", "data_agendamento", "hora_agendamento"]'::jsonb
    ),
    (
      'appointment_reminder_24h',
      'operacional',
      $template$
Olá, {{1}}!

Você possui atendimento amanhã em {{2}}.

Serviço: {{3}}
Profissional: {{4}}
Data: {{5}}
Horário: {{6}}
$template$,
      '["nome_cliente", "nome_estabelecimento", "nome_servico", "nome_profissional", "data_agendamento", "hora_agendamento"]'::jsonb
    ),
    (
      'appointment_reminder_2h',
      'operacional',
      $template$
Olá, {{1}}!

Seu atendimento de {{3}} em {{2}} ocorrerá em aproximadamente 2 horas.

Horário: {{4}}
Profissional: {{5}}
$template$,
      '["nome_cliente", "nome_estabelecimento", "nome_servico", "hora_agendamento", "nome_profissional"]'::jsonb
    ),
    (
      'appointment_completed',
      'operacional',
      $template$
Olá, {{1}}!

Obrigado por realizar seu atendimento em {{2}}.

Serviço: {{3}}

Esperamos ver você novamente em breve.
$template$,
      '["nome_cliente", "nome_estabelecimento", "nome_servico"]'::jsonb
    ),
    (
      'appointment_no_show_client',
      'operacional',
      $template$
Olá, {{1}}.

Identificamos que você não compareceu ao atendimento agendado em {{2}}.

Serviço: {{3}}
Data: {{4}}
Horário: {{5}}

Se desejar, você pode fazer um novo agendamento.
$template$,
      '["nome_cliente", "nome_estabelecimento", "nome_servico", "data_agendamento", "hora_agendamento"]'::jsonb
    ),
    (
      'appointment_cancelled_salon',
      'operacional',
      $template$
Atenção.

{{1}} cancelou o atendimento de {{3}} em {{2}}.

Data: {{4}}
Horário: {{5}}
Motivo: {{6}}
$template$,
      '["nome_cliente", "nome_estabelecimento", "nome_servico", "data_agendamento", "hora_agendamento", "motivo_cancelamento"]'::jsonb
    ),
    (
      'appointment_rescheduled_salon',
      'operacional',
      $template$
Atenção.

{{1}} reagendou o atendimento de {{3}} em {{2}}.

Nova data: {{4}}
Novo horário: {{5}}
$template$,
      '["nome_cliente", "nome_estabelecimento", "nome_servico", "data_agendamento", "hora_agendamento"]'::jsonb
    ),
    (
      'appointment_pending_attendant_reminder_2h',
      'operacional',
      $template$
Prioridade alta!

Faltam aproximadamente 2 horas para um atendimento em {{2}} ainda sem confirmação operacional.

Cliente: {{1}}
Serviço: {{3}}
Data: {{4}}
Horário: {{5}}

[Confirmar]

[Abrir Agenda]
$template$,
      '["nome_cliente", "nome_estabelecimento", "nome_servico", "data_agendamento", "hora_agendamento"]'::jsonb
    ),
    (
      'birthday_greeting',
      'marketing',
      $template$Oi, {{1}}! Passando para desejar um feliz aniversário em nome de {{2}}. Que seu dia seja leve, bonito e cheio de bons momentos!$template$,
      '["nome_cliente", "nome_salao"]'::jsonb
    ),
    (
      'campaign_promotion',
      'marketing',
      $template$
Olá, {{1}}!

{{2}} preparou uma promoção especial para você.

Serviço:
{{3}}

{{4}}

{{5}}

Esperamos você!

[Agendar Agora]
$template$,
      '["nome_cliente", "nome_estabelecimento", "nome_servico", "beneficios_campanha", "vigencia_campanha"]'::jsonb
    ),
    (
      'campaign_birthday',
      'marketing',
      $template$
Olá, {{1}}!

Este é o seu mês especial!

Para celebrar seu aniversário, {{2}} preparou uma condição especial para você aproveitar durante este período.

Esperamos sua visita.

[Agendar Agora]
$template$,
      '["nome_cliente", "nome_estabelecimento"]'::jsonb
    ),
    (
      'campaign_inactive_client',
      'marketing',
      $template$
Olá, {{1}}!

Sentimos sua falta.

Já faz algum tempo desde seu último atendimento em {{2}}.
Gostaríamos de recebê-lo novamente.

Confira nossas novidades.

[Agendar Agora]
$template$,
      '["nome_cliente", "nome_estabelecimento"]'::jsonb
    ),
    (
      'campaign_return_reminder',
      'marketing',
      $template$
Olá, {{1}}!

{{2}} lembra: está na hora do seu próximo atendimento.

Serviço recomendado:
{{3}}

Esperamos você novamente.

[Agendar Agora]
$template$,
      '["nome_cliente", "nome_estabelecimento", "nome_servico"]'::jsonb
    ),
    (
      'campaign_new_service',
      'marketing',
      $template$
Olá, {{1}}!

{{2}} agora oferece um novo serviço.

{{3}}

Agende quando desejar.

[Agendar Agora]
$template$,
      '["nome_cliente", "nome_estabelecimento", "nome_servico"]'::jsonb
    ),
    (
      'campaign_new_professional',
      'marketing',
      $template$
Olá, {{1}}!

{{2}} tem novidade.

Agora contamos com um novo profissional:
{{3}}

Conheça nossos serviços.

[Agendar Agora]
$template$,
      '["nome_cliente", "nome_estabelecimento", "nome_profissional"]'::jsonb
    ),
    (
      'campaign_holiday',
      'marketing',
      $template$
Olá, {{1}}!

{{2}} deseja um excelente(a):
{{3}}

Esperamos você para comemorar conosco.

[Agendar Agora]
$template$,
      '["nome_cliente", "nome_estabelecimento", "data_comemorativa"]'::jsonb
    ),
    (
      'campaign_flash_sale',
      'marketing',
      $template$
Olá, {{1}}!

{{2}} preparou uma promoção por tempo limitado!

Serviço:
{{3}}

{{4}}

{{5}}

Aproveite enquanto durar.

[Agendar Agora]
$template$,
      '["nome_cliente", "nome_estabelecimento", "nome_servico", "beneficios_campanha", "vigencia_campanha"]'::jsonb
    ),
    (
      'campaign_loyalty',
      'marketing',
      $template$
Olá, {{1}}!

{{2}} preparou benefícios para você em nosso programa de fidelidade.

Confira sua vantagem exclusiva.

Esperamos você.
$template$,
      '["nome_cliente", "nome_estabelecimento"]'::jsonb
    ),
    (
      'campaign_package',
      'marketing',
      $template$
Olá, {{1}}!

{{2}} montou um pacote especial para você.

Inclui:
{{3}}

Valor:
{{4}}

Agende quando desejar.

[Agendar Agora]
$template$,
      '["nome_cliente", "nome_estabelecimento", "descricao_pacote", "valor_pacote"]'::jsonb
    ),
    (
      'campaign_seasonal',
      'marketing',
      $template$
Olá, {{1}}!

{{2}} preparou condições especiais para esta temporada.

Confira nossos serviços.

[Agendar Agora]
$template$,
      '["nome_cliente", "nome_estabelecimento"]'::jsonb
    ),
    (
      'campaign_custom',
      'marketing',
      $template$
Olá, {{1}}!

{{2}} enviou esta mensagem:

{{3}}

[Agendar Agora]
$template$,
      '["nome_cliente", "nome_estabelecimento", "mensagem"]'::jsonb
    )
)
update public.templates_mensagem template
set
  conteudo = updates.conteudo,
  variaveis = updates.variaveis,
  aprovado_provider = case
    when template.conteudo is distinct from updates.conteudo
      or template.variaveis is distinct from updates.variaveis
    then false
    else template.aprovado_provider
  end,
  metadata = coalesce(template.metadata, '{}'::jsonb)
    || jsonb_build_object(
      'provider_parameter_format', 'positional',
      'provider_variable_mapping', (
        select jsonb_object_agg(variable_name, variable_index)
        from jsonb_array_elements_text(updates.variaveis) with ordinality as mapping(variable_name, variable_index)
      ),
      'neutral_establishment_copy', true,
      'accented_pt_br_copy', true,
      'requires_provider_reapproval', (
        coalesce(template.aprovado_provider, false)
        and (
          template.conteudo is distinct from updates.conteudo
          or template.variaveis is distinct from updates.variaveis
        )
      ),
      'approved_provider_before_neutral_copy', coalesce(template.aprovado_provider, false),
      'seed_fix', '20260818110000_neutral_whatsapp_template_copy'
    ),
  ativo = true,
  updated_at = now()
from template_updates updates
where template.nome = updates.nome
  and template.tipo = updates.tipo
  and template.canal = 'whatsapp'
  and template.deleted_at is null
  and updates.nome not in (
    'appointment_pending_attendant_reminder_60m',
    'appointment_pending_attendant_reminder_30m',
    'appointment_pending_attendant_operational',
    'appointment_no_show_salon'
  )
  and (
    template.conteudo is distinct from updates.conteudo
    or template.variaveis is distinct from updates.variaveis
    or coalesce(template.metadata, '{}'::jsonb)->>'neutral_establishment_copy' is distinct from 'true'
    or coalesce(template.metadata, '{}'::jsonb)->>'accented_pt_br_copy' is distinct from 'true'
  );
