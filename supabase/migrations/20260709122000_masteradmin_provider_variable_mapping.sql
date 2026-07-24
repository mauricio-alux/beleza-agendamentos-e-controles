-- Store explicit Meta positional mapping for MasterAdmin WhatsApp templates.
-- The internal body stays named for maintainability; provider sends use the
-- order declared in variaveis as {{1}}, {{2}}, ...

update public.templates_mensagem template
set
  metadata = coalesce(template.metadata, '{}'::jsonb) || jsonb_build_object(
    'provider_parameter_format', 'positional',
    'provider_variable_mapping', (
      select jsonb_object_agg(variable_name, variable_index)
      from jsonb_array_elements_text(template.variaveis) with ordinality as item(variable_name, variable_index)
    ),
    'variable_pattern', 'named',
    'seed_fix', '20260709122000_masteradmin_provider_variable_mapping'
  ),
  updated_at = now()
where template.tenant_id is null
  and template.nome like 'master\_%' escape '\'
  and template.canal = 'whatsapp'
  and template.deleted_at is null
  and jsonb_array_length(template.variaveis) > 0;
