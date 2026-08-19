-- Formalize appointment_confirmed as the post-professional-confirmation
-- operational template with Reagendar and Cancelar actions.
-- This migration is idempotent and preserves aprovado_provider.

update public.templates_mensagem
set
  conteudo = $template$
Ola, {{1}}!

Seu atendimento foi confirmado.

Data: {{4}}
Horario: {{5}}
Servico: {{2}}
Profissional: {{3}}

Estamos aguardando voce.

Caso precise alterar seu atendimento, utilize uma das opcoes abaixo:

[Reagendar]

[Cancelar]
$template$,
  variaveis = '["nome_cliente", "nome_servico", "nome_profissional", "data_agendamento", "hora_agendamento"]'::jsonb,
  metadata = coalesce(metadata, '{}'::jsonb)
    || jsonb_build_object(
      'provider_template_name', coalesce(metadata->>'provider_template_name', 'appointment_confirmed'),
      'language', coalesce(metadata->>'language', 'pt_BR'),
      'categoria_provider', coalesce(metadata->>'categoria_provider', 'Utility'),
      'provider_parameter_format', 'positional',
      'provider_variable_mapping', jsonb_build_object(
        'nome_cliente', 1,
        'nome_servico', 2,
        'nome_profissional', 3,
        'data_agendamento', 4,
        'hora_agendamento', 5
      ),
      'required_actions', '["reschedule", "cancel"]'::jsonb,
      'actions', jsonb_build_array(
        jsonb_build_object(
          'id', 'reschedule',
          'title', 'Reagendar',
          'action_type', 'reschedule',
          'route', '/reagendar',
          'token_param', 'tk',
          'source', 'bellory_operational_rule'
        ),
        jsonb_build_object(
          'id', 'cancel',
          'title', 'Cancelar',
          'action_type', 'cancel',
          'route', '/acao_agendamento',
          'command', 'cancelar',
          'token_param', 'tk',
          'source', 'bellory_operational_rule'
        )
      ),
      'provider_buttons', jsonb_build_array(
        jsonb_build_object(
          'title', 'Reagendar',
          'provider_representation', 'url_button_or_cta',
          'action_type', 'reschedule'
        ),
        jsonb_build_object(
          'title', 'Cancelar',
          'provider_representation', 'url_button_or_cta',
          'action_type', 'cancel'
        )
      ),
      'operational_rule', jsonb_build_object(
        'event', 'appointment.confirmed',
        'status_after_professional_confirmation', 'pendente_cliente',
        'token_source', 'agendamentos.token_confirmacao',
        'routes', jsonb_build_object(
          'reschedule', '/reagendar?tk={token_operacional}',
          'cancel', '/acao_agendamento?cmd=cancelar&tk={token_operacional}'
        ),
        'provider_sync_required', true,
        'migration', '20260811100000_appointment_confirmed_actions'
      )
    ),
  ativo = true,
  updated_at = now()
where nome = 'appointment_confirmed'
  and canal = 'whatsapp'
  and deleted_at is null;
