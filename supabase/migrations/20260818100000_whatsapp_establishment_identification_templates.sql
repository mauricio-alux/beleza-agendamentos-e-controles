-- Identifica dinamicamente o estabelecimento nos templates WhatsApp elegiveis.
-- Templates aprovados na Meta/WhatsApp sao marcados para reprovacao ao alterar
-- conteudo/variaveis; os quatro templates operacionais internos excluidos
-- permanecem inalterados por regra de negocio.

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
Ola, {{1}}!

Recebemos sua solicitacao de atendimento na {{2}}.

Servico: {{3}}
Profissional: {{4}}
Data: {{5}}
Horario: {{6}}

Aguarde a confirmacao do salao.
$template$,
      '["nome_cliente", "nome_estabelecimento", "nome_servico", "nome_profissional", "data_agendamento", "hora_agendamento"]'::jsonb
    ),
    (
      'appointment_pending_client',
      'operacional',
      $template$
Ola, {{1}}! A {{2}} recebeu sua solicitacao de atendimento.
Servico: {{3}}
Profissional: {{4}}
Data: {{5}}
Horario: {{6}}
Para confirmar sua presenca, acesse: {{7}}
Caso necessario:
Cancelar: {{8}}
Reagendar: {{9}}
$template$,
      '["nome_cliente", "nome_estabelecimento", "nome_servico", "nome_profissional", "data_agendamento", "hora_agendamento", "link_confirmar", "link_cancelar", "link_reagendar"]'::jsonb
    ),
    (
      'appointment_confirmed',
      'operacional',
      $template$
Ola, {{1}}!

Seu atendimento na {{2}} foi confirmado.

Data: {{5}}
Horario: {{6}}
Servico: {{3}}
Profissional: {{4}}

Estamos aguardando voce.

Caso precise alterar seu atendimento, utilize uma das opcoes abaixo:

[Reagendar]

[Cancelar]
$template$,
      '["nome_cliente", "nome_estabelecimento", "nome_servico", "nome_profissional", "data_agendamento", "hora_agendamento"]'::jsonb
    ),
    (
      'appointment_rescheduled',
      'operacional',
      $template$
Ola, {{1}}.

Seu atendimento na {{2}} foi reagendado.

Servico: {{3}}
Profissional: {{4}}
Nova data: {{5}}
Novo horario: {{6}}
$template$,
      '["nome_cliente", "nome_estabelecimento", "nome_servico", "nome_profissional", "data_agendamento", "hora_agendamento"]'::jsonb
    ),
    (
      'appointment_cancelled',
      'operacional',
      $template$
Ola, {{1}}.

Seu atendimento na {{2}} foi cancelado.

Servico: {{3}}
Data: {{4}}
Horario: {{5}}
Motivo: {{6}}

Se desejar, voce pode fazer um novo agendamento.
$template$,
      '["nome_cliente", "nome_estabelecimento", "nome_servico", "data_agendamento", "hora_agendamento", "motivo_cancelamento"]'::jsonb
    ),
    (
      'appointment_cancelled_by_attendant',
      'operacional',
      $template$
Ola, {{1}}.

Seu atendimento na {{2}} foi cancelado pelo salao.

Servico: {{3}}
Data: {{4}}
Horario: {{5}}
Motivo: {{6}}

Se desejar, voce pode fazer um novo agendamento.
$template$,
      '["nome_cliente", "nome_estabelecimento", "nome_servico", "data_agendamento", "hora_agendamento", "motivo_cancelamento"]'::jsonb
    ),
    (
      'appointment_cancelled_by_client',
      'operacional',
      $template$
Ola, {{1}}.

Seu atendimento na {{2}} foi cancelado conforme solicitado.

Servico: {{3}}
Data: {{4}}
Horario: {{5}}

Se desejar, voce pode fazer um novo agendamento.
$template$,
      '["nome_cliente", "nome_estabelecimento", "nome_servico", "data_agendamento", "hora_agendamento"]'::jsonb
    ),
    (
      'appointment_reminder_24h',
      'operacional',
      $template$
Ola, {{1}}!

Voce possui atendimento amanha na {{2}}.

Servico: {{3}}
Profissional: {{4}}
Data: {{5}}
Horario: {{6}}
$template$,
      '["nome_cliente", "nome_estabelecimento", "nome_servico", "nome_profissional", "data_agendamento", "hora_agendamento"]'::jsonb
    ),
    (
      'appointment_reminder_2h',
      'operacional',
      $template$
Ola, {{1}}!

Seu atendimento de {{3}} na {{2}} ocorrera em aproximadamente 2 horas.

Horario: {{4}}
Profissional: {{5}}
$template$,
      '["nome_cliente", "nome_estabelecimento", "nome_servico", "hora_agendamento", "nome_profissional"]'::jsonb
    ),
    (
      'appointment_completed',
      'operacional',
      $template$
Ola, {{1}}!

Obrigado por realizar seu atendimento na {{2}}.

Servico: {{3}}

Esperamos ver voce novamente em breve.
$template$,
      '["nome_cliente", "nome_estabelecimento", "nome_servico"]'::jsonb
    ),
    (
      'appointment_no_show_client',
      'operacional',
      $template$
Ola, {{1}}.

Identificamos que voce nao compareceu ao atendimento agendado na {{2}}.

Servico: {{3}}
Data: {{4}}
Horario: {{5}}

Se desejar, voce pode fazer um novo agendamento.
$template$,
      '["nome_cliente", "nome_estabelecimento", "nome_servico", "data_agendamento", "hora_agendamento"]'::jsonb
    ),
    (
      'appointment_cancelled_salon',
      'operacional',
      $template$
Atencao.

Um atendimento da {{2}} foi cancelado pelo cliente.

Cliente: {{1}}
Servico: {{3}}
Data: {{4}}
Horario: {{5}}
Motivo: {{6}}
$template$,
      '["nome_cliente", "nome_estabelecimento", "nome_servico", "data_agendamento", "hora_agendamento", "motivo_cancelamento"]'::jsonb
    ),
    (
      'appointment_rescheduled_salon',
      'operacional',
      $template$
Atencao.

Um atendimento da {{2}} foi reagendado.

Cliente: {{1}}
Servico: {{3}}
Nova data: {{4}}
Novo horario: {{5}}
$template$,
      '["nome_cliente", "nome_estabelecimento", "nome_servico", "data_agendamento", "hora_agendamento"]'::jsonb
    ),
    (
      'appointment_pending_attendant_reminder_2h',
      'operacional',
      $template$
Prioridade alta!

Faltam aproximadamente 2 horas para um atendimento da {{2}} ainda sem confirmacao operacional.

Cliente: {{1}}
Servico: {{3}}
Data: {{4}}
Horario: {{5}}

[Confirmar]

[Abrir Agenda]
$template$,
      '["nome_cliente", "nome_estabelecimento", "nome_servico", "data_agendamento", "hora_agendamento"]'::jsonb
    ),
    (
      'campaign_promotion',
      'marketing',
      $template$
Ola, {{1}}!

A {{2}} preparou uma promocao especial para voce.

Servico:
{{3}}

{{4}}

{{5}}

Esperamos voce!

[Agendar Agora]
$template$,
      '["nome_cliente", "nome_estabelecimento", "nome_servico", "beneficios_campanha", "vigencia_campanha"]'::jsonb
    ),
    (
      'campaign_birthday',
      'marketing',
      $template$
Ola, {{1}}!

Este e o seu mes especial!

Para celebrar seu aniversario, a {{2}} preparou uma condicao especial para voce aproveitar durante este periodo.

Esperamos sua visita.

[Agendar Agora]
$template$,
      '["nome_cliente", "nome_estabelecimento"]'::jsonb
    ),
    (
      'campaign_inactive_client',
      'marketing',
      $template$
Ola, {{1}}!

Sentimos sua falta.

Ja faz algum tempo desde seu ultimo atendimento na {{2}}.
Gostariamos de recebe-lo novamente.

Confira nossas novidades.

[Agendar Agora]
$template$,
      '["nome_cliente", "nome_estabelecimento"]'::jsonb
    ),
    (
      'campaign_return_reminder',
      'marketing',
      $template$
Ola, {{1}}!

A {{2}} lembra: esta na hora do seu proximo atendimento.

Servico recomendado:
{{3}}

Esperamos voce novamente.

[Agendar Agora]
$template$,
      '["nome_cliente", "nome_estabelecimento", "nome_servico"]'::jsonb
    ),
    (
      'campaign_new_service',
      'marketing',
      $template$
Ola, {{1}}!

A {{2}} agora oferece um novo servico.

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
Ola, {{1}}!

Tem novidade na {{2}}.

Agora contamos com um novo profissional:
{{3}}

Conheca nossos servicos.

[Agendar Agora]
$template$,
      '["nome_cliente", "nome_estabelecimento", "nome_profissional"]'::jsonb
    ),
    (
      'campaign_holiday',
      'marketing',
      $template$
Ola, {{1}}!

A equipe da {{2}} deseja um excelente(a):
{{3}}

Esperamos voce para comemorar conosco.

[Agendar Agora]
$template$,
      '["nome_cliente", "nome_estabelecimento", "data_comemorativa"]'::jsonb
    ),
    (
      'campaign_flash_sale',
      'marketing',
      $template$
Ola, {{1}}!

A {{2}} preparou uma promocao por tempo limitado!

Servico:
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
Ola, {{1}}!

A {{2}} preparou beneficios para voce em nosso programa de fidelidade.

Confira sua vantagem exclusiva.

Esperamos voce.
$template$,
      '["nome_cliente", "nome_estabelecimento"]'::jsonb
    ),
    (
      'campaign_package',
      'marketing',
      $template$
Ola, {{1}}!

A {{2}} montou um pacote especial para voce.

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
Ola, {{1}}!

A {{2}} preparou condicoes especiais para esta temporada.

Confira nossos servicos.

[Agendar Agora]
$template$,
      '["nome_cliente", "nome_estabelecimento"]'::jsonb
    ),
    (
      'campaign_custom',
      'marketing',
      $template$
Ola, {{1}}!

Mensagem da {{2}}:

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
      'establishment_identification', true,
      'establishment_name_source', case
        when updates.tipo = 'marketing' then 'campanha.tenant_id -> tenants.nome_fantasia'
        else 'agendamento.tenant_id -> tenants.nome_fantasia'
      end,
      'requires_provider_reapproval', (
        coalesce(template.aprovado_provider, false)
        and (
          template.conteudo is distinct from updates.conteudo
          or template.variaveis is distinct from updates.variaveis
        )
      ),
      'approved_provider_before_establishment_identification', coalesce(template.aprovado_provider, false),
      'seed_fix', '20260818100000_whatsapp_establishment_identification_templates'
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
    or coalesce(template.metadata, '{}'::jsonb)->>'establishment_identification' is distinct from 'true'
  );
