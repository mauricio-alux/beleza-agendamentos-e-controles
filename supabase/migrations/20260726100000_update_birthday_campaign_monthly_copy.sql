-- Clarifies campaign_birthday as a monthly birthday campaign.
-- Approved Meta templates are intentionally preserved and must be versioned/reapproved separately.

update public.templates_mensagem
set
  conteudo = $template$
Ola, {{1}}!

Este e o seu mes especial!

Para celebrar seu aniversario, a {{2}} preparou uma condicao especial para voce aproveitar durante este periodo.

Esperamos sua visita.

[Agendar Agora]
$template$,
  metadata = jsonb_set(
    coalesce(metadata, '{}'::jsonb),
    '{finalidade}',
    to_jsonb('Campanha para clientes aniversariantes do mes.'::text),
    true
  ),
  updated_at = now()
where tenant_id is null
  and nome = 'campaign_birthday'
  and canal = 'whatsapp'
  and aprovado_provider = false
  and deleted_at is null;
