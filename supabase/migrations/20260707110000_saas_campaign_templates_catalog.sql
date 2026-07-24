-- Initial SaaS campaign template catalog.
-- These rows are base models for tenant campaigns and do not trigger sends.
-- Existing templates with the same name are preserved.

with seed_templates (
  nome,
  conteudo,
  variaveis,
  finalidade
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
      '["nome_cliente", "nome_salao", "nome_servico", "beneficios_campanha", "vigencia_campanha"]'::jsonb,
      'Promocao de servicos.'
    ),
    (
      'campaign_birthday',
      $template$
Ola, {{1}}!

Feliz aniversario!

A equipe da {{2}} deseja um excelente dia.
Preparamos uma condicao especial para voce.

Esperamos sua visita.

[Agendar Agora]
$template$,
      '["nome_cliente", "nome_salao"]'::jsonb,
      'Aniversario do cliente.'
    ),
    (
      'campaign_inactive_client',
      $template$
Ola, {{1}}!

Sentimos sua falta.

Ja faz algum tempo desde seu ultimo atendimento na {{2}}.
Gostariamos de recebe-lo novamente.

Confira nossas novidades.

[Agendar Agora]
$template$,
      '["nome_cliente", "nome_salao"]'::jsonb,
      'Reativacao de clientes inativos.'
    ),
    (
      'campaign_return_reminder',
      $template$
Ola, {{1}}!

Esta na hora do seu proximo atendimento.

Servico recomendado:
{{2}}

Esperamos voce novamente.

[Agendar Agora]
$template$,
      '["nome_cliente", "nome_servico"]'::jsonb,
      'Sugestao de retorno.'
    ),
    (
      'campaign_new_service',
      $template$
Ola, {{1}}!

A {{2}} agora oferece um novo servico.

{{3}}

Agende quando desejar.

[Agendar Agora]
$template$,
      '["nome_cliente", "nome_salao", "nome_servico"]'::jsonb,
      'Novo servico disponivel.'
    ),
    (
      'campaign_new_professional',
      $template$
Ola, {{1}}!

Tem novidade na {{2}}.

Agora contamos com um novo profissional:
{{3}}

Conheca nossos servicos.

[Agendar Agora]
$template$,
      '["nome_cliente", "nome_salao", "nome_profissional"]'::jsonb,
      'Novo profissional.'
    ),
    (
      'campaign_holiday',
      $template$
Ola, {{1}}!

A equipe da {{2}} deseja um excelente(a):
{{3}}

Esperamos voce para comemorar conosco.

[Agendar Agora]
$template$,
      '["nome_cliente", "nome_salao", "data_comemorativa"]'::jsonb,
      'Datas comemorativas.'
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
      '["nome_cliente", "nome_servico", "beneficios_campanha", "vigencia_campanha"]'::jsonb,
      'Promocao relampago.'
    ),
    (
      'campaign_loyalty',
      $template$
Ola, {{1}}!

Voce acumulou beneficios em nosso programa de fidelidade.

Confira sua vantagem exclusiva.

Esperamos voce.
$template$,
      '["nome_cliente"]'::jsonb,
      'Programa de fidelidade.'
    ),
    (
      'campaign_package',
      $template$
Ola, {{1}}!

Montamos um pacote especial para voce.

Inclui:
{{2}}

Valor:
{{3}}

Agende quando desejar.

[Agendar Agora]
$template$,
      '["nome_cliente", "descricao_pacote", "valor_pacote"]'::jsonb,
      'Pacotes promocionais.'
    ),
    (
      'campaign_seasonal',
      $template$
Ola, {{1}}!

A {{2}} preparou condicoes especiais para esta temporada.

Confira nossos servicos.

[Agendar Agora]
$template$,
      '["nome_cliente", "nome_salao"]'::jsonb,
      'Campanhas sazonais.'
    ),
    (
      'campaign_custom',
      $template$
Ola, {{1}}!

{{2}}

[Agendar Agora]
$template$,
      '["nome_cliente", "mensagem"]'::jsonb,
      'Template livre para campanhas criadas manualmente pelo salao.'
    )
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
  'marketing',
  null,
  seed.conteudo,
  seed.variaveis,
  false,
  jsonb_build_object(
    'provider_template_name', seed.nome,
    'language', 'pt_BR',
    'categoria_provider', 'Marketing',
    'categoria', 'campanha',
    'escopo', 'tenant',
    'owner', 'tenant',
    'catalogo', 'campanhas_saas',
    'is_catalog_template', true,
    'finalidade', seed.finalidade,
    'seed', '20260707110000_saas_campaign_templates_catalog'
  ),
  true
from seed_templates seed
where not exists (
  select 1
  from public.templates_mensagem existing
  where existing.tenant_id is null
    and existing.nome = seed.nome
    and existing.deleted_at is null
);
