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
