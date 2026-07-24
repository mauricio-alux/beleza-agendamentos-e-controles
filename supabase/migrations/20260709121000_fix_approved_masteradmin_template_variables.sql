-- Fix MasterAdmin records that were already approved before the broader
-- named-variable repair. This does not change aprovado_provider.

update public.templates_mensagem
set
  conteudo = $template$
Ola, {{nome_responsavel}}!

Seu plano na plataforma foi ativado com sucesso.

Plano:
{{nome_plano}}

Empresa/Salao:
{{nome_empresa}}

Agora voce ja pode continuar usando os recursos da plataforma normalmente.
$template$,
  variaveis = '["nome_responsavel", "nome_plano", "nome_empresa"]'::jsonb,
  metadata = coalesce(metadata, '{}'::jsonb) || jsonb_build_object(
    'provider_template_name', 'master_plan_activated',
    'language', coalesce(metadata->>'language', 'pt_BR'),
    'categoria_provider', coalesce(metadata->>'categoria_provider', 'Utility'),
    'provider_parameter_format', 'positional',
    'provider_variable_mapping', jsonb_build_object(
      'nome_responsavel', 1,
      'nome_plano', 2,
      'nome_empresa', 3
    ),
    'variable_pattern', 'named',
    'seed_fix', '20260709121000_fix_approved_masteradmin_template_variables'
  ),
  updated_at = now()
where tenant_id is null
  and nome = 'master_plan_activated'
  and deleted_at is null
  and conteudo ~ '\{\{\s*[0-9]+\s*\}\}';
