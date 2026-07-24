-- Normalize WhatsApp templates to the Meta-copyable positional body format.
-- For canal = whatsapp, templates_mensagem.conteudo is the official body that
-- can be copied to WhatsApp Manager. The semantic variable names remain in the
-- ordered variaveis array.

do $$
declare
  template_record record;
  variable_record record;
  normalized_content text;
  provider_mapping jsonb;
  converted_from_named boolean;
  provider_category text;
begin
  for template_record in
    select id, nome, tipo, conteudo, variaveis, metadata
    from public.templates_mensagem
    where canal = 'whatsapp'
      and deleted_at is null
  loop
    normalized_content := template_record.conteudo;
    converted_from_named := normalized_content ~ '\{\{\s*[A-Za-z_][A-Za-z0-9_.-]*\s*\}\}';

    provider_mapping := (
      select coalesce(jsonb_object_agg(variable_name, variable_index), '{}'::jsonb)
      from jsonb_array_elements_text(template_record.variaveis) with ordinality as item(variable_name, variable_index)
    );

    for variable_record in
      select variable_name, variable_index
      from jsonb_array_elements_text(template_record.variaveis) with ordinality as item(variable_name, variable_index)
      order by variable_index
    loop
      normalized_content := regexp_replace(
        normalized_content,
        '\{\{\s*' || variable_record.variable_name || '\s*\}\}',
        '{{' || variable_record.variable_index::text || '}}',
        'g'
      );
    end loop;

    provider_category := coalesce(
      template_record.metadata->>'categoria_provider',
      case
        when lower(coalesce(template_record.tipo, '')) = 'marketing' then 'Marketing'
        else 'Utility'
      end
    );

    update public.templates_mensagem
    set
      conteudo = normalized_content,
      metadata = coalesce(template_record.metadata, '{}'::jsonb)
        || jsonb_build_object(
          'provider_template_name', coalesce(template_record.metadata->>'provider_template_name', template_record.nome),
          'provider_parameter_format', 'positional',
          'provider_variable_mapping', provider_mapping,
          'language', coalesce(template_record.metadata->>'language', 'pt_BR'),
          'categoria_provider', provider_category,
          'variable_pattern', 'positional',
          'seed_fix', '20260710100000_whatsapp_templates_positional_content'
        )
        || jsonb_build_object(
          'positional_normalization',
          jsonb_build_object(
            'migration', '20260710100000_whatsapp_templates_positional_content',
            'converted_from_named', converted_from_named,
            'approved_provider_preserved', true
          )
        ),
      updated_at = now()
    where id = template_record.id
      and (
        conteudo is distinct from normalized_content
        or coalesce(metadata->>'provider_parameter_format', '') <> 'positional'
        or metadata->'provider_variable_mapping' is distinct from provider_mapping
        or coalesce(metadata->>'provider_template_name', '') = ''
        or coalesce(metadata->>'language', '') = ''
        or coalesce(metadata->>'categoria_provider', '') = ''
      );
  end loop;
end $$;
