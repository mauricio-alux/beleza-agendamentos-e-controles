-- Align non-approved SaaS campaign catalog templates with conditional commercial blocks.
-- Approved provider templates are intentionally not changed here to avoid changing
-- the positional contract already submitted to Meta/WhatsApp.

with template_updates (
  nome,
  conteudo,
  variaveis
) as (
  values
    (
      'campaign_promotion',
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
      '["nome_cliente", "nome_salao", "nome_servico", "beneficios_campanha", "vigencia_campanha"]'::jsonb
    ),
    (
      'campaign_flash_sale',
      $template$
Ola, {{1}}!

Promocao por tempo limitado!

Servico:
{{2}}

{{3}}

{{4}}

Aproveite enquanto durar.

[Agendar Agora]
$template$,
      '["nome_cliente", "nome_servico", "beneficios_campanha", "vigencia_campanha"]'::jsonb
    )
)
update public.templates_mensagem template
set
  conteudo = updates.conteudo,
  variaveis = updates.variaveis,
  metadata = coalesce(template.metadata, '{}'::jsonb)
    || jsonb_build_object(
      'provider_parameter_format', 'positional',
      'provider_variable_mapping', (
        select jsonb_object_agg(variable_name, variable_index)
        from jsonb_array_elements_text(updates.variaveis) with ordinality as mapping(variable_name, variable_index)
      ),
      'supports_conditional_commercial_blocks', true,
      'seed_fix', '20260715110000_campaign_commercial_template_blocks'
    ),
  updated_at = now()
from template_updates updates
where template.tenant_id is null
  and template.nome = updates.nome
  and template.canal = 'whatsapp'
  and template.deleted_at is null
  and coalesce(template.aprovado_provider, false) = false
  and (
    template.conteudo is distinct from updates.conteudo
    or template.variaveis is distinct from updates.variaveis
  );
