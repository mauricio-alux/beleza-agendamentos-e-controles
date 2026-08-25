# Taxonomia V2 - Etapa 3

## A. Auditoria

1. Onboarding atual: `backend/src/modules/onboarding/onboarding.service.js` cria tenant, configuracao inicial, profissional owner, servicos, combinacoes operacionais, escala e link publico.
2. Criacao de tenant: `createTenant` grava `tenants`, vincula `tenant_tipos_negocio` e materializa a estrutura em `createTenantStructure`.
3. Estruturas reaproveitadas: `tipo_negocio_servicos_catalogo`, `servico_catalogo_especialidades`, `cargo_especialidades`, `servico_tenants`, `servico_tenant_especialidades` e `profissional_servico_especialidades`.
4. Defaults encontrados: havia defaults legados por nome no onboarding; a Etapa 3 criou defaults administrativos persistentes em `perfil_operacional_defaults`.
5. Localizacao encontrada: `tenants.endereco` e configuracoes do provider/frontend usam `cidade`, `estado` e `pais`/equivalentes.
6. Limitacoes encontradas: alguns tenants de teste nao possuem tipo de negocio ativo compatível com perfil operacional; reconcile amplo exige aprovacao explicita por conter updates reais.

## B. Perfil Operacional

7. Estrutura criada: `tipo_negocio_perfis_operacionais`, `perfil_operacional_servicos`, `perfil_operacional_cargos` e `perfil_operacional_defaults`.
8. Especializado/generalista: tipos especializados automatizam recomendados; generalistas exigem confirmacao e usam somente servicos recomendados.
9. Relacionamento com Taxonomia V2: perfis complementam as matrizes V2 e nao substituem `TipoNegocio x Servico`, `Servico x Especialidade` ou `Cargo x Especialidade`.
10. Governanca: escrita protegida por MasterAdmin/RLS e endpoints administrativos.

## C. Defaults

11. Duracao: persistida por `perfil_operacional_defaults`, preferencialmente por `Servico x Especialidade`.
12. Retorno: persistido como recomendacao em dias, sem obrigatoriedade taxonomica.
13. Preco: implementado como `administrative_reference`, sem promessa de preco real de mercado.
14. Regionalizacao: campos `region_scope`, `country`, `state`, `city`.
15. Fallback: Cidade -> Estado -> Pais -> Global no backend.
16. Origem dos valores: `administrative_reference`, versionada por metadata e `taxonomy_version`.

## D. Onboarding

17. Especializado: quando nao ha servicos manuais, o onboarding materializa o perfil operacional automaticamente.
18. Generalista: perfil generalista usa apenas recomendados ate confirmacao/configuracao posterior.
19. Materializacao no tenant: grava `servico_tenants`, `servico_tenant_especialidades` e vinculos do profissional owner quando aplicavel.
20. Personalizacao posterior: apos materializacao, valores comerciais permanecem tenant-owned nas tabelas operacionais.

## E. Admin

21. Telas alteradas: `/admin/taxonomia` recebeu secao de Perfis Operacionais.
22. Manutencao de perfis: backend expõe listagem e patch de classificacao/status/confirmacao.
23. Manutencao de defaults: backend expõe criacao de default administrativo.
24. Permissoes: rotas usam `platform.business_types.manage`.

## F. Tenants De Teste

25. Tipo de negocio: dry-run avaliou 7 tenants ativos.
26. Configuracao antes: capturada pelo script de reconcile via leitura de ofertas, combinacoes e agendamentos.
27. Perfil V2: encontrado para tenants com `tenant_tipos_negocio` ativo compatível.
28. Creates: planejados apenas para ofertas/combinacoes ausentes.
29. Updates: planejados apenas quando configuracoes diferem dos defaults administrativos.
30. Inativacoes: 0.
31. Noops: preservados para configuracoes ja equivalentes.

## G. Agendamentos

32. Quantidade antes: dry-run coletou contagens por tenant.
33. Quantidade depois: iguais as contagens antes.
34. Registros alterados: 0 no dry-run.
35. Resultado da comparacao/fingerprint: fingerprints antes/depois identicos no dry-run.

AGENDAMENTOS ALTERADOS = 0.

## H. Seguranca

36. Delecoes fisicas realizadas: 0.
37. Referencias historicas preservadas: reconcile nao altera `agendamentos`.
38. Integridade de FK: migration usa FKs restritivas para entidades globais e cascade apenas nas estruturas filhas do perfil.

## I. Qualidade

39. Migrations: `20260825130000_operational_profiles_taxonomy_v2_phase3.sql` criada, validada em dry-run e aplicada no remoto.
40. Testes: `operational-profiles.service.test.js`, `taxonomy-v2-catalog-expansion.test.js` e `test:professional-services` passaram.
41. TypeScript: `npx tsc --noEmit` passou.
42. Build: `npm run build` passou.
43. Visual desktop/mobile: pendente; nao foi instalada dependencia nova.

## J. Pendencias

44. `especialidades.cargo_id`: segue como compatibilidade transitoria V1, com V2 usando `cargo_especialidades`.
45. Legados: defaults legados por nome permanecem como fallback para fluxos com input manual.
46. Customizacoes: especialidades customizadas tenant-scoped continuam separadas da relacao global oficial.
47. Inteligencia futura de precos: preparada por faixa, regiao, fonte e vigencia, sem consulta externa nesta etapa.
48. Itens para proxima etapa: aplicar reconcile de desenvolvimento somente com aprovacao explicita de escopo/tenant quando houver updates reais.

## K. Etapa 3B - Execucao Controlada Em 2026-08-25

52. Contrato operacional adicional: `--apply` sem `--tenant` agora falha no script de reconcile, impedindo execucao ampla acidental.
53. Idempotencia de apply: o aplicador nao regrava ofertas ou configuracoes com acao `noop`.
54. Tenants ativos avaliados: 7.
55. Tenants com perfil operacional resolvido pelo tipo principal atual: `Bellory Test studio` e `Espaco Vivian Beauty`.
56. Tenants sem perfil operacional resolvido: `BelaFlavia`, `Bella Rosa Studio`, `Carmem Hair`, `Roseli MakeUp` e `Viki`; todos permaneceram sem escrita.
57. `Bellory Test studio`: dry-run inicial indicou 12 creates, 16 updates, 0 inativacoes e 0 updates de agendamento.
58. `Bellory Test studio`: apply tenant-scoped materializou 3 `servico_tenants` e 25 `servico_tenant_especialidades`.
59. `Bellory Test studio`: dry-run posterior retornou 0 creates e 0 updates.
60. `Bellory Test studio`: 34 agendamentos antes e 34 depois; fingerprint `94e0f3c466525e46819ea82cac82bd772293868d384d3d987397f4459ed394f8` preservado.
61. `Espaco Vivian Beauty`: dry-run indicou 3 creates, 22 updates, 0 inativacoes e 0 updates de agendamento.
62. `Espaco Vivian Beauty`: 46 agendamentos antes e 46 depois no dry-run; fingerprint `c019d38a0c7274ed54d672fc4c3d6b95c1ac71afacc738fb8d3dc7a7218dd6f4` preservado.
63. `Espaco Vivian Beauty`: apply tenant-scoped foi bloqueado pela politica de aprovacao por conter escrita comercial em tenant ativo e permanece pendente de aprovacao explicita.
64. AGENDAMENTOS ALTERADOS = 0.

## L. Etapa 3C - Espaco Vivian Beauty Reconciliado Em 2026-08-25

65. Autorizacao explicita: o DOCX `1.2.4.5.4.7.2 TAXONOMIA V2 - ETAPA 3C` autorizou o apply tenant-scoped para `Espaco Vivian Beauty`, definido como massa de teste.
66. Tenant confirmado: `e62dacdc-08a8-431f-819e-7115d170e652`, slug `espaco-vivian-beauty`, nome `Espaco Vivian Beauty`, ativo.
67. Tipo de negocio principal: `Salao de Beleza`, id `87c0f57f-aaa5-4221-a80a-f903d1c96d5f`, slug `salao-de-beleza`.
68. Perfil Operacional resolvido: `3bddd1d3-df42-4153-87fc-2685d317f6b8`, classificacao `generalista`, policy `recommended_services_only_until_user_confirmation`.
69. Dry-run pre-apply: 3 creates, 22 updates, 0 inativacoes, `appointment_updates_planned = 0`, `appointment_changes = 0`.
70. Creates executados em `servico_tenant_especialidades`: `Corte de cabelo x Corte cacheado/crespo` com preco 80, duracao 60, retorno 45, online true; `Coloracao x Correcao de cor` com preco 120, duracao 90, retorno 45, online true; `Coloracao x Retoque de raiz` com preco 120, duracao 90, retorno 45, online true.
71. Origem dos 3 creates: defaults administrativos `administrative_reference`, respectivamente `c2ed2828-8591-4c1f-8aaa-765ac25f072d`, `25b39669-4ab1-4917-8024-f0b2a9ddf435` e `15b9614e-5ab5-4bf7-a478-0f4fc3953007`.
72. Motivo dos creates: combinacoes oficiais `Servico x Especialidade` ausentes no tenant; nenhuma duplicidade semantica detectada.
73. Updates executados em `servico_tenant_especialidades`: 22 configuracoes comerciais ajustadas aos defaults V2.
74. Updates por tipo de campo no dry-run pre-apply: preco 10, duracao 20, retorno 22, online 0, vinculo 0, status 1, outro 0.
75. Exemplos de antes/depois: `Alisamento x Alisamento e Transformacao` manteve preco 120 e duracao 60, retorno 60 -> 45; `Corte de cabelo x Corte Infantil` manteve preco 80, duracao 45 -> 60, retorno 70 -> 45; `Corte de cabelo x Corte Masculino` duracao 45 -> 60, retorno 70 -> 45, ativo false -> true.
76. Exemplos de antes/depois: `Coloracao x Tonalizacao` preco 90 -> 120, duracao 60 -> 90, retorno 60 -> 45; `Coloracao x Mechas` preco 80 -> 120, duracao 60 -> 90, retorno 60 -> 45.
77. Exemplos de antes/depois: `Hidratacao capilar` nas especialidades de hidratacao/tratamento/reconstrucao ajustou preco 70 -> 120, duracao 30 -> 60, retorno 40 -> 45; `Manicure` ajustou duracao 30 -> 60 e retorno 25 -> 45; `Pedicure` ajustou preco 40/45 -> 50, duracao 30/45 -> 60 e retorno null -> 45.
78. Apply executado somente para o tenant `e62dacdc-08a8-431f-819e-7115d170e652`; nenhum reconcile global foi executado.
79. Materializacao do apply: 0 `servico_tenants` criados/atualizados e 25 `servico_tenant_especialidades` materializados; 0 vinculos profissionais materializados pelo reconcile.
80. Pos-dry-run: 0 creates, 0 updates, 0 inativacoes e somente `noop` nas combinacoes do Perfil Operacional.
81. Agendamentos before oficial: 46 registros, fingerprint `c019d38a0c7274ed54d672fc4c3d6b95c1ac71afacc738fb8d3dc7a7218dd6f4`.
82. Agendamentos after oficial: 46 registros, fingerprint `c019d38a0c7274ed54d672fc4c3d6b95c1ac71afacc738fb8d3dc7a7218dd6f4`.
83. Campos de agendamento protegidos verificados: `id`, `tenant_id`, `cliente_id`, `profissional_id`, `data_inicio`, `data_fim`, `status`, `updated_at`; nenhum alterado pelo reconcile.
84. Servicos finais: 40 configuracoes do tenant, 40 ativas, 0 duplicidades `servico_tenant_id x especialidade_id`.
85. Distribuicao final de configuracoes: Alisamento 1, Corte de cabelo 5, Coloracao 7, Hidratacao capilar 4, Manicure 5, Pedicure 3, e demais ofertas preexistentes preservadas.
86. Equipe final: 10 vinculos profissionais no tenant, 10 ativos, 0 alterados diretamente pelo reconcile.
87. Agenda final: 46 agendamentos carregaveis com status `cancelado`, `concluido`, `no_show` e `pendente_atendente`, sem alteracao de servico, especialidade, profissional, data/hora ou status pelo reconcile.
88. Booking final: `/public/booking/espaco-vivian-beauty` respondeu 200, retornou 4 servicos e 3 profissionais, sem expor `perfil_operacional`.
89. Frontend publico: `/agendar/espaco-vivian-beauty` respondeu 200.
90. Testes executados: operational-profiles/taxonomy 8 passed; professional-services 34 passed, 1 skipped; appointment-status 5 passed; client-identity 14 passed; agenda/public booking diretos 21 passed.
91. Validacoes finais: `npm run check:migrations` passou; `npx tsc --noEmit` passou; `npm run build` passou; `supabase db push --dry-run` retornou `Remote database is up to date`.
92. Git: nenhum novo commit criado nesta etapa; commit estrutural anterior `baa92e23` preservado; nenhum push executado.
93. AGENDAMENTOS ALTERADOS = 0.

## M. Conclusao Final Da Etapa 3

94. Resultado final: Taxonomia V2 - Etapa 3 concluida para os tenants de teste reconciliaveis pelo fluxo atual.
95. `Bellory Test studio` reconciliado e idempotente.
96. `Espaco Vivian Beauty` reconciliado e idempotente apos autorizacao explicita da Etapa 3C.
97. Agendamentos historicos preservados nos dois tenants reconciliados.
98. Defaults globais permanecem como referencia inicial; configuracoes do tenant permanecem como autoridade comercial apos materializacao.
99. Nenhuma pendencia bloqueante permanece para o fechamento da Etapa 3.
