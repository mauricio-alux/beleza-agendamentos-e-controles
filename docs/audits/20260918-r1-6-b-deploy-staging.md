# R1.6-B — Deploy controlado e validação em staging

**Checkpoint histórico de 22/09/2026: R1.6-B concluída funcionalmente; Android e iOS
aprovados no escopo/dispositivos testados. Cleanup das fixtures exclusivas concluído,
documentação consolidada e checkpoint Git pendente por segurança.** A variação
visual residual iOS é cosmética, não bloqueante e sem causa confirmada. Seções
anteriores abaixo são histórico; o fechamento ao final prevalece sobre seus gates
intermediários. Último deployment aprovado: `4859a35c-0565-4998-94f3-7d6d3e85782a`.

Nota RD-H10: este relatório preserva a evidência histórica R1.6-B. O deployment,
manifest e validação física atuais estão em [Current State](../current-state.md).
As referências abaixo a start_url `/acesso` e ausência de id descrevem aquela
versão; hoje start_url é `/app` e id é `/acesso`.

Data: 18/09/2026. Escopo: TXT “Aplicar via CODEX”, etapa incremental de deploy. Baseline: `20260918-r1-6-b-aplicacao-remota-migrations.md`.

**R1.6-B — STAGING COM PENDÊNCIA — NÃO INICIAR TESTE FÍSICO.**

## Pré-check e publicação

- Working tree já continha alterações não commitadas. Nenhum código foi alterado nesta etapa. Os 242 testes, TypeScript, build local e 8 cenários Chrome locais não foram repetidos.
- Snapshot sanitizado gerado por `deploy/staging/prepare-context.ps1`, diretamente do working tree, em `.codex-logs/staging-context-20260918-142505`. Não inclui Git, logs ou arquivos `.env`.
- Comparação de hashes confirmou igualdade entre working tree e snapshot para 12 arquivos críticos: repository/service de identidade, identity-policy, identity-rate-limit, service/validators de public-booking, public.routes, serviço frontend de public-booking, PublicBookingPage, LocateAccess, RecurringAccessPage e recurring-access.storage. Essa comparação verifica o conteúdo enviado; não constitui uma nova validação funcional local.
- Variáveis necessárias presentes: SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY, APP_URL, NEXT_PUBLIC_APP_URL, NEXT_PUBLIC_APP_NAME e RAILWAY_DOCKERFILE_PATH. Origem staging, projeto Supabase esperado e caminho Dockerfile conferidos sem registrar secrets. Nenhuma variável foi alterada.
- Trial confirmado antes do deploy: ativo, 26 dias restantes, saldo de créditos aproximado de US$ 4,644153. Nenhum plano pago, cartão ou recurso adicional foi contratado. Saldo informado é pré-deploy.
- Projeto existente `pwa-dev-staging` (`645d7750-d32a-4313-83ee-503e21082fec`), serviço único `pwa-staging` (`70734c21-172a-4612-8f25-23026fdff0de`). Ambiente Railway denominado `production` é o ambiente deste projeto DEV/STAGING, não a aplicação de produção.
- Upload único do snapshot por Railway CLI `up --path-as-root`, com projeto/serviço/ambiente explícitos. Não depende de commit/push. O build Docker remoto integra o deployment autorizado.
- Deployment: `a1a44c55-6b74-413b-a90a-de05887df295`, criado em `2026-09-18T17:24:57.694Z`, resultado **SUCCESS**.
- Réplica `6ab32401-4069-4343-8bf9-caf5b68ec198`: **RUNNING**. Sem segundo deploy ou rollback.
- URL: https://pwa-staging-production.up.railway.app

## Infraestrutura

Executado `node deploy/staging/smoke.cjs https://pwa-staging-production.up.railway.app bellory-test-studio`, exit 0: HTTP gate PASS, 24 requisições e 16 chunks aprovados.

Os 12 recursos foram verificados com os parâmetros credentials include e omit: `/`, `/acesso`, `/agendar/bellory-test-studio`, `/pwa-diagnostics`, `/_staging/health`, `/api/public/health`, `/api/public/booking/bellory-test-studio`, `/manifest.webmanifest`, `/sw.js` e os ícones pwa-icon-192, pwa-icon-512 e maskable-icon-512. Respostas 200, tipos de conteúdo adequados, assinaturas PNG válidas e ausência de redirects/interstitials inesperados. Chunks responderam sem HTML indevido.

Health confirmou gateway, frontend, backend e ready. Manifest manteve start_url `/acesso`, scope `/`, display standalone, nome/short_name e ausência de id esperada pelo smoke.

Limite: include/omit acima foram exercitados em Node, sem cookies reais do navegador. O gate completo de credenciais/CORS em navegador, registro/controle de SW e diagnóstico PWA funcional não foi concluído. `/pwa-diagnostics` foi validado como recurso HTTP. Não houve teste físico ou simulação de instalação Android/iOS.

## Bloqueio funcional e interrupção

Chrome desktop com contexto novo abriu `/acesso` e exibiu “Localizar meu acesso”. Uma requisição de diagnóstico `POST /api/public/booking/access/locate`, com JSON vazio `{}`, retornou **404 e corpo vazio**. O corpo inválido foi proposital para verificar roteamento sem identificar cliente ou criar dados.

A rota existe em `backend/src/routes/public.routes.js:13`. Entretanto, `deploy/staging/gateway.cjs:9` só permite POST público de booking no padrão `/api/public/booking/[^/]+/(identity|appointments)`. A rota `/api/public/booking/access/locate` não é permitida; o gateway encerra com 404 em `gateway.cjs:35`, antes da validação do backend.

Impacto: o formulário inicial carrega, mas a localização de acesso sem referência local fica bloqueada. Isso reprova o gate funcional de `/acesso`. A requisição vazia não equivale à execução do cenário C0 com par telefone/nascimento válido.

Conforme seção 12 do TXT, a execução parou ao confirmar defeito que exige alteração de código. **Nenhuma correção foi aplicada.** Proposta para autorização posterior: permitir exclusivamente POST `/api/public/booking/access/locate` no gateway, acrescentar verificação direcionada de roteamento e fazer um novo deploy controlado, retomando o smoke. Não é necessário modificar manifest, SW ou storage para essa correção.

## Dados e cenários não executados

- DML de teste: nenhum. Personas, clientes, vínculos, tokens, eventos e agendamentos criados: nenhum. Cleanup pendente desta etapa: nenhum.
- Uma tentativa de consulta somente leitura para localizar fixtures DEV previamente marcadas foi rejeitada antes de executar pela revisão automática de aprovação, por incluir nomes, telefones, datas de nascimento e identificadores de fonte privada para uso local. A extração não foi repetida por outro caminho. Nenhum resultado sensível dessa consulta foi obtido.
- A alternativa de uma persona sintética mínima foi anunciada, mas não executada: o defeito do gateway foi confirmado antes de qualquer criação.
- TC válido sem reidentificação, cliente existente, nascimento incorreto, novo cliente, C0/C1/CN, upcoming restrito ao cliente e atribuição/retry de campanha: **NÃO TESTADOS nesta publicação**, devido à interrupção obrigatória e à indisponibilidade de fixture controlada confirmada para os cenários dependentes dela. Os resultados locais anteriores não foram apresentados como aprovação em staging.
- Não houve migration, seed, limpeza de massa, WhatsApp, mudança de variáveis, banco, volume, domínio, DNS ou novos recursos Railway.
- Manifest, SW, start_url, scope, display, ícones, instalação e storage não foram alterados nesta etapa. Isso não substitui a não regressão funcional do TC válido, ainda pendente.

## Checklist final

| Item | Resultado nesta etapa |
| --- | --- |
| Deploy staging realizado | SIM |
| Deployment SUCCESS | SIM |
| Health aprovado | SIM |
| /acesso aprovado | NÃO — página carrega, localização retorna 404 |
| /agendar/[slug] aprovado | SIM para carregamento HTTP; identificação NÃO TESTADA |
| TC válido sem reidentificação | NÃO — NÃO TESTADO |
| Cliente existente por telefone+nascimento | NÃO — NÃO TESTADO |
| Nascimento incorreto bloqueado | NÃO — NÃO TESTADO |
| Novo cliente validado | NÃO — NÃO TESTADO |
| PWA vazia C0 / C1 / CN | NÃO TESTADO |
| Upcoming restrito ao cliente autorizado | NÃO TESTADO |
| Atribuição de campanha em staging | NÃO TESTADO |
| Manifest / Service Worker / start_url alterados | NÃO |
| Storage incompatível alterado | NÃO |
| Migration adicional / seed / WhatsApp | NÃO |
| Commit / push | NÃO |

## Git e próximo passo

`git status --short` conferido antes e ao final. As alterações preexistentes foram preservadas; o único arquivo adicional desta etapa no status é este relatório. O snapshot operacional permanece em `.codex-logs`. Nenhum commit/push realizado.

Aguardar autorização para a correção específica do gateway antes de qualquer novo deploy. Staging permanece publicado com a pendência descrita. **Não iniciar teste físico.**

## Incremento de 21/09/2026 — correção do gateway e redeploy

Autorização: TXT “Aplicar via CODEX”, limitado à correção do bloqueio de locate, teste direcionado, redeploy no mesmo staging e smoke mínimo. Esta seção atualiza o bloqueador descrito acima; não aprova a validação funcional completa da R1.6-B.

### Correção e teste local

- Causa confirmada: allowlist do gateway rejeitava POST `/api/public/booking/access/locate` antes do Express.
- `deploy/staging/gateway.cjs`: adicionada uma única condição para o método POST e esse caminho exato. Nenhuma liberação genérica de `/api/public/*`.
- `deploy/staging/gateway.test.cjs`: teste direcionado com backend HTTP sintético confirma método, caminho, Content-Type e body `{}` preservados, além do retorno do backend. Outros métodos e rotas não permitidas continuam bloqueados sem alcançar o backend.
- Executado somente `node --test --test-name-pattern='locate POST' deploy/staging/gateway.test.cjs`: 1 aprovado, zero falhas, 4 testes não selecionados. Não repetidas suítes gerais, TypeScript, build local ou cenários Chrome.
- Backend, contrato, política de identidade, rate limit, tenant scope, TC, idempotência, C0/C1/CN e respostas genéricas não foram alterados. Nenhuma PII foi enviada em URL ou registrada.

### Publicação controlada

- Snapshot sanitizado: `.codex-logs/staging-context-20260921-100836`, criado pelo script existente. Comparação de hashes de todos os arquivos com o snapshot publicado em 18/09 encontrou diferenças somente em `deploy/staging/gateway.cjs` e `deploy/staging/gateway.test.cjs`; nenhum arquivo adicionado ou removido.
- Mesmo projeto `pwa-dev-staging` (`645d7750-d32a-4313-83ee-503e21082fec`), serviço `pwa-staging` (`70734c21-172a-4612-8f25-23026fdff0de`), ambiente Railway denominado `production` exclusivamente desse projeto staging. Nenhum serviço/projeto criado, produção da aplicação ou variável alterada.
- Um upload por CLI, com snapshot e projeto/serviço/ambiente explícitos. Build remoto faz parte do deploy solicitado.
- Deployment `ece8be3d-caaa-43ce-9f76-8726c893abf4`, criado em `2026-09-21T13:08:57.586Z`: **SUCCESS** confirmado pela CLI.
- URL: https://pwa-staging-production.up.railway.app

### Smoke mínimo e evidência de roteamento

| Verificação | Resultado |
| --- | --- |
| `GET /_staging/health` | 200; gateway, frontend, backend e ready = true |
| `GET /acesso` | 200 HTML |
| `GET /agendar/bellory-test-studio` | 200 HTML |
| `POST /api/public/booking/access/locate`, body `{}` | 422 JSON, `VALIDATION_ERROR`, `Cache-Control: no-store`; campos obrigatórios ausentes |

O POST agora alcança a validação Zod do controlador Express, antes da chamada ao serviço de identificação. Não retorna o antigo 404 vazio do gateway. O primeiro verificador provisório esperava 400 e falhou nessa expectativa; o middleware existente define 422 para ZodError. Após conferir esse contrato, somente o POST vazio foi repetido com a expectativa correta: **PASS**. Não foi necessário alterar backend nem ampliar o escopo.

Nenhum cliente existente foi consultado para provar roteamento. Nenhum telefone ou nascimento foi enviado; nenhum TC, cadastro, vínculo, evento ou agendamento foi criado por esse teste. Nenhum DML remoto, migration, seed, cleanup, WhatsApp, commit ou push. Manifest, SW, start_url, scope, display, InstallPwaPrompt, storage, recurring access e fluxos Android/iOS preservados. Alterações preexistentes do working tree preservadas.

### Pendências e encerramento

Continuam **não validados nesta publicação**: TC válido; cliente existente por telefone+nascimento; nascimento incorreto; novo cliente; C0; C1; CN; upcoming/isolamento; campanha/retry; validação física Android; validação física iOS. Esses cenários exigem autorização separada. Carregamento HTTP das páginas e roteamento aprovado não equivalem à aprovação funcional da R1.6-B.

Somente gateway, teste direcionado e este relatório foram alterados nesta execução. README, contexto mestre e roadmap não foram atualizados.

**R1.6-B — BLOQUEADOR DE GATEWAY CORRIGIDO EM STAGING — ROTEAMENTO APROVADO.**

Execução encerrada após o smoke mínimo; aguardar nova autorização.

## Smoke funcional essencial pós-correção do gateway

Data: 21/09/2026. Escopo autorizado pelo TXT “Aplicar via CODEX”: smoke funcional essencial, sem repetir baseline de infraestrutura, testes locais ou auditorias. Execução via API no staging existente; nenhum teste de navegador ou aparelho físico.

Fixture existente confirmada pelas marcações `seed=campaign_test_v3` e `campaign_test_seed=true`. Cliente técnico `074bfa2e-3330-49b5-b50a-27e9b615b5fa`, tenant `e62dacdc-08a8-431f-819e-7115d170e652`, link público `espaco-vivian-beauty`. Seleção restrita a fixtures marcadas; telefone, nascimento e TC permaneceram apenas em memória, sem impressão em resultados ou relatório. Nenhuma massa foi preparada.

| Cenário | Resultado e limite |
| --- | --- |
| A — TC válido | APROVADO na API: TC emitido em B e reapresentado sozinho a `/identity`, sem telefone/nascimento; reconheceu o mesmo cliente, retornou o mesmo TC, sem emissão adicional ou revogação. Não valida interface, instalação nem TC anterior ao deployment. |
| B — Cliente existente telefone+DOB | APROVADO: `/identity` com `lookup_only=true` retornou o cliente esperado; exatamente um TC adicional, vínculo tenant/cliente conferido por consulta dirigida. Cadastros e tokens anteriores preservados. |
| C — Nascimento incorreto | APROVADO: 422 `CLIENT_MATCH_UNAVAILABLE`, mensagem genérica, sem identidade. Comparação dirigida antes/depois confirmou cadastros, DOB e conjunto/estado dos tokens inalterados. |
| D — C0 | APROVADO: par sintético sem cliente correspondente, ausência conferida antes/depois; `/access/locate` retornou 422 genérico, mesma mensagem de C, sem identidade nem criação de cliente. Orientação para link/QR do estabelecimento confirmada no componente existente; UI não exercitada nesta rodada. |
| E — C1 | NÃO TESTADO — fixture controlada indisponível: a fixture selecionada corresponde a dois tenants elegíveis. Não preparada massa para tornar a correspondência única. |
| F — Upcoming isolado por cliente_id | NÃO TESTADO — fixture controlada indisponível para demonstrar isolamento: endpoint respondeu 200 com lista vazia. Isso não comprova exclusão de horários de outro cliente. Leitura dirigida confirmou filtro pelo ID autorizado no código, sem equivaler a aprovação funcional remota. |
| Novo cliente | NÃO TESTADO; nenhum cadastro criado. |
| CN | APROVADO, pois havia fixture trivial: descoberta retornou dois estabelecimentos somente com `slug`/`displayName`, sem identidade. Escolha explícita revalidou e emitiu TC para o cliente esperado no tenant escolhido, preservando os tokens anteriores da fixture. |
| Campanha/retry | NÃO TESTADO, fora desta rodada. |
| Android/iOS físicos | NÃO TESTADOS. |

DML remoto decorrente do fluxo autorizado: dois INSERTs aditivos de TC, registros de identificação/retorno e atualizações de uso/timestamps/metadados do vínculo. Nenhum INSERT/UPDATE de cadastro de cliente observado nas comparações dirigidas; nenhum agendamento criado. Eventos de acesso incidentais não constituem validação de campanha/retry. A comparação de C é dirigida a cadastro/DOB/tokens, não auditoria de todas as tabelas.

Nenhum defeito funcional encontrado nos cenários executados. Código de aplicação inalterado; sem migration, seed, cleanup, alteração de campanhas, WhatsApp, deploy, commit ou push. Somente este relatório foi atualizado. TC válido foi aprovado no limite da API; C1 e isolamento adversarial de upcoming permanecem pendentes. Não houve aprovação de gate físico completo.

**R1.6-B — SMOKE FUNCIONAL ESSENCIAL EM STAGING APROVADO.** Resultado limitado aos cenários executáveis acima; pendências explicitamente preservadas. Execução encerrada, aguardando nova autorização.

## Fechamento das lacunas do smoke funcional

Data: 21/09/2026. Autorização: TXT “Aplicar via CODEX”, exclusivamente C1, isolamento real de upcoming e novo cliente com fixtures mínimas. Baselines e cenários anteriormente aprovados não foram repetidos. Nenhuma alteração de código, migration, seed, deploy, campanha/retry, WhatsApp, commit ou push; somente este relatório foi atualizado.

Três fixtures existentes verificadas tinham dois tenants correspondentes. Criadas fixtures mínimas no tenant DEV `f6a5c4fe-ca5c-454e-ae53-37c78a081f50`, slug `bellory-test-studio`, com marcador `r16b_gap_smoke_20260921_cb8f5ddd-7a39-4a7a-84c2-fd6e5ddfbe07`. Telefones sintéticos tiveram ausência de colisão conferida antes da criação; nenhum dado de cliente real foi pesquisado. Dados sensíveis e tokens usados apenas em memória, sem impressão.

| Cenário | Evidência e resultado |
| --- | --- |
| C1 | APROVADO. Cliente A inicialmente com um único vínculo. POST `/api/public/booking/access/locate` retornou 200 com somente `slug` e `identity`, conforme contrato de seleção/revalidação automática. Slug e cliente corretos; consulta dirigida do TC confirmou tenant/cliente/estado ativo. Nenhum outro tenant ou identidade global retornado. |
| Upcoming positivo e negativo | APROVADO. Após C1, criado B no mesmo tenant com o mesmo telefone de A e nascimento distinto, sem alterar A. Criados exatamente dois horários futuros não sobrepostos, um para cada cliente. GET `/api/public/booking/bellory-test-studio/client/appointments/upcoming` com TC de A retornou 200 e exatamente o agendamento A; B excluído. Ausência de expansão por telefone comprovada nesse cenário. |
| Novo cliente | APROVADO, executado após C1/upcoming. POST `/api/public/booking/bellory-test-studio/identity` com dados sintéticos inéditos retornou `recognized=false`; confirmados cliente, DOB persistido, vínculo único e TC tenant-scoped. Nova submissão coerente, com outro request_id, retornou `recognized=true` e mesmo cliente; consulta confirmou apenas um cadastro para o telefone. Não foi teste de retry. |

### Inventário para cleanup posterior

Todos os registros abaixo pertencem exclusivamente às fixtures desta rodada e deverão ser removidos em cleanup dirigido posteriormente autorizado. **Nenhum cleanup executado.** Clientes e agendamentos possuem marcador técnico; dependentes são rastreáveis por IDs/FKs. A duplicidade sintética A/B é deliberada para o teste negativo e permanece até o cleanup; C1 foi comprovado antes de criar B.

| Tipo e finalidade | Identificadores técnicos |
| --- | --- |
| Cliente A — C1 e upcoming positivo | `403e4d04-15d6-4d14-bfda-22293c64ff05` |
| Cliente B — mesmo telefone, upcoming negativo | `e5e92a4a-c6e1-4b3f-b06b-3ab95ec12e41` |
| Cliente novo — cadastro público e repetição | `257117a2-8389-41c0-9c3c-65aeba10cd88` |
| Vínculos A / B / novo | `57b7fa8a-fef1-4517-b860-2ad169367263`; `305cafff-dec9-46c0-bae7-e48ef2cbfa3c`; `73cdbb46-178a-46a4-9ece-9814a6fddfe6` |
| Agendamentos A / B | `8996d29e-63ee-4b47-aa75-a4bb28a3c02a`; `5b5d02ca-a903-4a11-90ec-6e97eadf9cba` |
| Itens de serviço A / B | `0be9a06d-eedd-4c4d-a029-aa51585d973a`; `41be7664-3911-4df0-862d-07ede6abc7a1` |
| Registros de TC — A e duas emissões do novo cliente | `ac00b0c1-37a8-41b5-8ba4-8d088d572a02`; `73cdb699-392a-4a06-946f-7f865e722c06`; `fd729dd9-05d0-4330-b13c-098374158748` |
| Eventos incidentais em campanha_acessos | `101607c0-e748-4bc8-989b-90cff13510f4`; `de5a6795-bff6-4fed-8a7b-0280892ca73f`; `5bbfebaa-d485-4fcd-9026-9f9a0ecf9057` |

DML: INSERTs dos registros inventariados; UPDATE de marca técnica somente no cliente recém-criado pelo fluxo público; atualizações incidentais de uso/timestamps/metadados das próprias fixtures. Profissional e configuração de serviço de fixture existente foram apenas referenciados, sem alteração. Tokens operacionais dos dois horários foram preparados na inserção. Nenhum registro preexistente foi modificado para forçar cenários; working tree preexistente preservado.

**R1.6-B — COBERTURA FUNCIONAL DE STAGING SUFICIENTE PARA TESTE FÍSICO.** Testes físicos Android/iOS ainda não executados. Encerrado o escopo; aguardar nova autorização.

## Pendência de UX identificada no teste físico iOS

Em 21/09/2026, o usuário informou Android fisicamente APROVADO e iOS ainda em testes, com mensagem pouco destacada e dificuldade de editar telefone/nascimento. Investigação limitada a LocateAccess, formulário público e dependências diretas: LocateAccess desabilita campos apenas durante a requisição e libera busy em finally; o formulário público não aplica disabled/readOnly nesses campos. As submissões usam o estado atual; nenhuma causa concreta do bloqueio físico foi identificada. O controle date nativo e a máscara não foram alterados por hipótese. Solicitada identificação da tela e do comportamento observado no aparelho.

Correção local parcial: mensagens de erro dos dois formulários agora reutilizam FeedbackMessage com tone error, título de orientação, ícone, contraste e semântica de alerta. Em LocateAccess, feedback aparece antes dos campos; autoFocus=false evita que a nova apresentação capture o foco durante a correção. Mensagens genéricas do backend preservadas, sem indicar qual dado divergiu. Seletor do cenário de erro no verificador local ajustado de status para alert; seus oito cenários não foram executados.

Validação: seis testes direcionados de estado/edição já passaram antes da mudança visual. Após a mudança, sete testes de LocateAccess aprovados (edição pré-submit, preservação após erro, loading/botão, correção isolada e conjunta dos campos, descarte de seleção CN obsoleta e feedback) e um teste existente de TC persistido aprovado: oito aprovados, zero reprovados. Harness de componente com API simulada; não comprova teclado/picker nativo do Safari, Chrome Android ou standalone físico. Nenhuma alegação de correção da edição no iOS.

Sem alteração de backend, manifest, SW, start_url, storage, instalação, regras de identidade ou lógica por sistema operacional. Sem build, suíte completa, migration, DML remoto, seed, cleanup, WhatsApp, deploy, commit ou push. Android físico permanece como baseline informado pelo usuário; reteste físico iOS e causa do bloqueio de edição pendentes.

**R1.6-B — CORREÇÃO DE UX AINDA REQUER AJUSTE — NÃO REALIZAR REDEPLOY.**

### Redeploy autorizado da apresentação de UX para reteste físico iOS

Em 21/09/2026, nova versão do TXT autorizou publicar a melhoria visual já testada, mantendo a causa física da dificuldade de edição como pendente. Essa autorização posterior substitui a restrição de redeploy acima, sem afirmar que o bloqueio físico foi corrigido.

Pré-check aprovado: snapshot sanitizado `.codex-logs/staging-context-20260921-232357` comparado integralmente por hashes com o snapshot do deployment anterior. Diferenças somente em LocateAccess.tsx, PublicBookingPage.tsx e no novo LocateAccess.editing.test.js. Diffs dos componentes coincidem com a melhoria visual aprovada, sem alteração funcional inesperada. O script local pwa-access-local-check.cjs e este relatório não integram o contexto de aplicação enviado, conforme o preparador existente. Os oito testes direcionados não foram repetidos.

Mesmo projeto `645d7750-d32a-4313-83ee-503e21082fec`, serviço `70734c21-172a-4612-8f25-23026fdff0de`, ambiente Railway denominado production exclusivamente desse staging. Deployment anterior confirmado como `ece8be3d-caaa-43ce-9f76-8726c893abf4`; um único upload novo. Deployment **`c8e0dbac-a67a-46fc-9087-fb8e27df201e` — SUCCESS**, criado em `2026-09-22T02:24:11.205Z` (21/09 às 23:24:11 em São Paulo). URL mantida: https://pwa-staging-production.up.railway.app.

Smoke mínimo aprovado: health 200 com gateway/frontend/backend/ready=true; `/acesso` e `/agendar/bellory-test-studio` 200 HTML; POST locate com body `{}` retornou 422 VALIDATION_ERROR do backend. Sem PII e sem DML.

Artefato publicado confirmado nos chunks públicos referenciados pelo HTML atual, sem source maps: `/acesso` usa `page-63f8373505c15df6.js`; `/agendar/[slug]` usa `page-fcda569ece660480.js`. Ambos contêm o título “Confira os dados e tente novamente”, tone error e autoFocus=false. Portanto os dois componentes atualizados estão publicados.

SW servido comparado com o arquivo local: idêntico, ignorando somente finais de linha. Navegações usam rede com fallback `/offline`; o SW não intercepta nem guarda os chunks JavaScript. Chunks possuem nomes versionados e cache immutable; HTML de booking é no-store, HTML de acesso declara s-maxage e já referencia o bundle novo. Nenhuma evidência objetiva de bloqueio por cache/SW. Uma página já aberta pode manter o JavaScript em memória até nova navegação/recarregamento; isso não comprova bloqueio de atualização do PWA nem substitui o reteste no aparelho.

Nenhum código adicional, backend, manifest, SW, start_url, storage, env, recurso ou serviço alterado nesta execução. Sem migration, DML, seed, cleanup, WhatsApp, commit ou push. Somente esta seção do relatório atualizada. Causa física não investigada novamente; aguardar resultado do iPhone.

**R1.6-B — CORREÇÃO DE UX PUBLICADA EM STAGING — PRONTO PARA RETESTE FÍSICO iOS.**

### Ajustes finais de UX após reteste físico iOS — 22/09/2026

Conforme resultado informado pelo usuário no TXT, fluxo funcional iOS/PWA standalone aprovado fisicamente: edição, correção, nova submissão, reconhecimento e acesso personalizado. Seletor nativo de nascimento aceito e preservado. Restaram alerta deslocado horizontalmente e erro persistente após iniciar a correção.

Ajustes locais somente em LocateAccess: formulário e labels com coluna explícita `minmax(0, 1fr)`, largura limitada e mínimo zero; campos limitados ao espaço disponível; alerta com border-box, largura limitada e quebra de texto. A estrutura anterior usava coluna implícita automática, suscetível ao dimensionamento intrínseco dos filhos. Essa vulnerabilidade estrutural foi corrigida; a causa geométrica exata no iPhone não foi reproduzida nesta execução. Ícone flex-none e conteúdo min-w-0 existentes preservados; sem CSS por OS, sniffing ou alteração do componente compartilhado. Alterar telefone ou DOB limpa somente a mensagem local da tentativa anterior, mantendo validação nativa e mensagens independentes da página.

Validação direcionada: seis testes de LocateAccess (edição inicial, rejeição, correção de telefone/DOB/ambos e apresentação do erro) e um teste existente de TC válido persistido: **7 aprovados, 0 reprovados**. Demais cenários excluídos por filtro. Testes ajustados comprovam limpeza antes de nova submissão, valores atuais, editabilidade e reapresentação após nova rejeição. Harness sem geometria de browser: revisão estrutural de CSS realizada, sem teste artificial de overflow e sem aprovação de responsividade física. Redeploy autorizado e reteste visual mobile/desktop continuam pendentes.

Nenhuma alteração nesta execução de backend, manifest, SW, start_url, storage, regras de identidade ou fixtures. Sem migration, DML, seed, cleanup, WhatsApp, deploy, commit ou push. Alterações preexistentes no workspace preservadas.

**R1.6-B — AJUSTES FINAIS DE UX IMPLEMENTADOS — PRONTO PARA REDEPLOY E VALIDAÇÃO VISUAL FINAL.**

### Redeploy dos ajustes finais de UX — bloqueio de autenticação em 22/09/2026

TXT autorizou redeploy no mesmo staging. Pré-check local: snapshot sanitizado `.codex-logs/staging-context-20260922-102826` comparado por hashes com o último publicado (`staging-context-20260921-232357`); diferenças exclusivamente em LocateAccess.tsx e LocateAccess.editing.test.js, correspondentes exatamente aos ajustes e testes aprovados na rodada anterior. Nenhuma alteração funcional inesperada. Testes não repetidos.

A consulta Railway CLI de deployments, com projeto `645d7750-d32a-4313-83ee-503e21082fec`, serviço `70734c21-172a-4612-8f25-23026fdff0de` e ambiente `production` desse staging explicitamente informados, retornou `Unauthorized. Please login with railway login`. Pré-check remoto incompleto; nenhum upload ou deploy iniciado, nenhum novo deployment ID. É necessário restabelecer a autenticação Railway para continuar. Smoke pós-deploy, confirmação do bundle e verificação de cache/SW não executados nesta rodada; validação visual física iOS permanece pendente. Nenhum código, configuração remota ou dado alterado; sem migration, DML, seed, cleanup, WhatsApp, commit ou push.

### Redeploy retomado após login manual — 22/09/2026

Autenticação confirmada pela CLI fora do sandbox, necessária para acessar a sessão manual no perfil Windows. `railway status` confirmou projeto `pwa-dev-staging` (`645d7750-d32a-4313-83ee-503e21082fec`), serviço `pwa-staging` (`70734c21-172a-4612-8f25-23026fdff0de`), environment interno `production` (`1d97dd15-10b7-48ed-bae1-525e3033017d`) e deployment anterior `c8e0dbac-a67a-46fc-9087-fb8e27df201e`. Nenhum vínculo, environment ou variável alterado.

Snapshot sanitizado novo `.codex-logs/staging-context-20260922-120621`, integralmente idêntico por hashes ao snapshot do pré-check aprovado anterior. Upload único com destino explícito. Deployment **`4859a35c-0565-4998-94f3-7d6d3e85782a` — SUCCESS**, criado em `2026-09-22T15:06:49.645Z` (12:06:49 em São Paulo). URL mantida: https://pwa-staging-production.up.railway.app. Somente build remoto inerente ao deploy; sete testes aprovados não repetidos.

Smoke mínimo: `/_staging/health` HTTP 200, gateway/frontend/backend/ready=true; `/acesso` e `/agendar/bellory-test-studio` HTTP 200 HTML. Versão atual de LocateAccess confirmada no chunk público referenciado pelo HTML de acesso, `/_next/static/chunks/app/acesso/page-4dfd4e2f34aee320.js`: limites responsivos do formulário/alerta, controle `date` e limpeza da mensagem nos dois onChange presentes.

SW público HTTP 200 e idêntico ao local, normalizando apenas finais de linha. Navegações buscam rede com fallback offline; chunks não são interceptados pelo SW e usam nomes versionados/cache immutable. HTML atual de acesso referencia o novo chunk; booking retorna no-store. Nenhuma evidência objetiva de bloqueio da versão atual por cache/SW. Isso não comprova atualização de uma página já aberta no aparelho. **Validação visual física final iOS ainda pendente.**

Somente este relatório alterado nesta execução, além do snapshot operacional. Sem código adicional, alteração de backend, manifest, SW, start_url, storage, banco ou fixtures; sem migration, DML, seed, cleanup, WhatsApp, commit ou push.

**R1.6-B — AJUSTES FINAIS DE UX PUBLICADOS EM STAGING — PRONTO PARA VALIDAÇÃO VISUAL FÍSICA FINAL iOS.**

### Variação visual residual após preenchimento — 22/09/2026

Novo reteste informado pelo usuário: funcional iOS, limpeza do alerta ao editar ambos os campos e recuperação permanecem aprovados; scroll horizontal eliminado. Resta aumento aparente da largura após preencher o telefone, anterior ao alerta.

Inspeção limitada a LocateAccess, estilos usados, Button/FeedbackMessage e container pai: telefone é input tel direto, sem máscara, wrapper/ícone auxiliar, size dinâmico ou classe condicional por valor. Formulário e labels usam coluna minmax(0, 1fr); campos têm w-full/min-w-0/max-w-full e box-sizing global border-box. Pai flex-col e suas classes não dependem do telefone. Alerta só entra após rejeição, com autoFocus=false, e não explica o início anterior à submissão. Botão não muda ao preencher telefone. Nenhuma causa objetiva de expansão por valor encontrada.

Hipótese mais provável, ainda não confirmada: alteração da escala/viewport visual ao focar o input no iPhone, percebida como alargamento; campo herda text-sm do label. Sem medição no aparelho, não é possível distinguir esse efeito de mudança real das caixas CSS. Nenhuma correção de CSS ou código de aplicação aplicada por hipótese.

Adicionado e executado somente teste estrutural comparando hierarquia/classes/propriedades de dimensionamento nos estados vazio, telefone preenchido, DOB preenchida e rejeição: **1 aprovado, 0 reprovados**, sete testes anteriores excluídos por filtro. Estrutura existente permanece idêntica, exceto inserção esperada do feedback na rejeição. Harness não mede geometria nem executa os componentes compartilhados: **validação geométrica física pendente**.

Alterados somente LocateAccess.editing.test.js e este relatório. Sem deploy, alteração funcional, backend, manifest, SW, start_url, storage, migration, DML, seed, cleanup, WhatsApp, commit ou push.

**R1.6-B — VARIAÇÃO VISUAL RESIDUAL SEM CAUSA CONFIRMADA — NÃO APLICAR CORREÇÕES CSS ESPECULATIVAS.**

## Encerramento controlado — 22/09/2026

Baseline autoritativo do TXT: R1.6-B funcionalmente concluída, Android recorrente aprovado fisicamente no dispositivo moderno testado e iOS identificação/recuperação aprovado no PWA standalone testado. Edição/reenvio, reconhecimento personalizado, destaque/limpeza do alerta aprovados e scroll horizontal eliminado. Variação visual residual iOS não bloqueante, sem causa confirmada; hipótese de escala/auto-zoom não tratada como diagnóstico. Nenhum CSS alterado.

### Fase A — cleanup concluído

Projeto Supabase DEV vinculado conferido pelo ref djbuzarzbpcpixudpnmg e tenant técnico do inventário de 21/09 confirmado. Três clientes e dois agendamentos apresentaram o marcador exclusivo da rodada; IDs dos vínculos, TCs, itens e eventos coincidiram integralmente com o inventário deste relatório. Massa compartilhada usada no smoke anterior, tenant, profissional e catálogo não foram candidatos.

Conferidas FKs de entrada para clientes/agendamentos e demais quatro tabelas; nenhum dependente adicional, nenhuma FK de entrada adicional nas quatro tabelas filhas e nenhum trigger de DELETE não interno nas seis tabelas. Os 16 IDs foram listados explicitamente por tabela. Transação com locks curtos, timeout, reconferência de IDs/marcadores/tenant e abort por dependente não inventariado. Exclusão filhos antes dos pais; filtros exclusivamente por IDs.

| Tabela | Removidos |
| --- | ---: |
| campanha_acessos | 3 |
| agendamento_servicos | 2 |
| tokens_cliente | 3 |
| cliente_tenants | 3 |
| agendamentos | 2 |
| clientes | 3 |

Fingerprints internos dos demais registros das seis tabelas antes/depois: idênticos, sem exportação de conteúdo pessoal. Quantidades de DELETE e ausência dos IDs verificadas antes do COMMIT. Consulta independente posterior confirmou ausência dos clientes e de referências diretas aos IDs de clientes/agendamentos em todas as FKs inspecionadas. Nenhum órfão produzido, nenhuma migration/schema permanente alterado. Tabelas temporárias de guardas descartadas ao encerrar. Cleanup exclusivo desta rodada concluído; sem saneamento da massa DEV preexistente.

### Fase B — documentação consolidada

README, project-context e roadmap atualizados; docs/current-state.md criado. Descrições antigas de identidade pública por telefone em 7H corrigidas para telefone + DOB. Registrados tenant-first, ausência de identidade global, TC tenant-scoped/aditivo, upcoming por cliente_id, PWA única e limites dos testes físicos. Backlog mantém hardening RLS tokens_cliente, UX residual, rate limit distribuído/governança de perfil e bootstrap/pairing/OTP opcional. Leitura cruzada direcionada dos quatro documentos realizada; sem auditoria histórica geral.

### Fases C/D — gate Git interrompido antes do staging

HEAD: 85a0683b. Inventário por arquivo: 127 entradas, 38 modificadas, 1 deletada e 88 untracked. A=91, B=5, C=2, D=26, E=3. São 98 candidatos por escopo (A/B/C), sem aprovação final para staging, e 29 excluídos por dúvida/escopo (D/E).

Bloqueador: PublicBookingPage.tsx e public-booking.service.ts misturam no diff contra HEAD a R1.6-B com formulário/modal de edição de perfil, PublicClientMeUpdate e updatePublicClientMe. As fontes consultadas não comprovam aprovação específica de todo esse diff preexistente de perfil. O relatório de implementação adverte que todo o diff contra HEAD não pode ser atribuído à R1.6-B. Publicação do working tree não substitui comprovação de origem por alteração. Aplicado o gate da seção 18 do TXT: não separar automaticamente os trechos nem criar checkpoint com origem incerta.

Deletion de manifest.ts corresponde à substituição por manifest.webmanifest e biblioteca PWA; não deve ser staged isoladamente. Untracked de PWA/testes/infraestrutura classificados, sem adição automática. Snapshots JSON remotos e DOCX excluídos. Scripts locais de cleanup ficam em .codex-logs ignorado. Cadastro, serviços, dashboard e mensagens gerais não foram presumidos aprovados.

Nenhum git add, reset, restore, clean, stash, commit, amend ou push. Index vazio; secrets/PII no conjunto staged: não aplicável, pois não houve staging. Nenhum commit documental isolado para simular checkpoint funcional. Push: NÃO REALIZADO — aguardando autorização.

Nenhum código funcional alterado nesta execução, teste funcional repetido, build, deploy, migration, seed ou WhatsApp. DML somente do cleanup autorizado. Alterações acumuladas preservadas.

**R1.6-B — FASE FUNCIONAL ENCERRADA E DOCUMENTAÇÃO CONSOLIDADA. CHECKPOINT GIT PENDENTE POR SEGURANÇA.**

### Inventário seletivo do working tree

Nota de checkpoint consolidado — 22/09/2026: baseline do TXT libera definitivamente os dois bloqueadores pelos gates combinados. Revisados somente os 24 arquivos restantes: A=0, B=1 (roteiro de diagnóstico PWA), C=0, D=21 (cadastro, serviços, dashboard/clientes e taxonomia de outras etapas), E=0, F=2 (testes de cadastro explicitamente associados a caso real, não incluídos). Seleção explícita de 104 arquivos: os 98 candidatos anteriores, dois bloqueadores liberados, três testes dos gates finais e o roteiro PWA. Restam 26 arquivos fora: os 23 desta revisão e três artefatos/snapshots anteriormente excluídos. Nenhum excluído foi modificado ou descartado.

Imports/requires diretos do conjunto resolvidos contra HEAD mais a seleção; nenhuma dependência de arquivo novo excluído. A chamada de normalizeUserMessage no serviço público usa os três argumentos já suportados em HEAD, sem exigir o diff de mensagens de serviços/cadastro excluído. As quatro migrations previamente comprovadas como aplicadas são selecionadas, incluindo as duas R1.6-B, sem execução remota. Verificação dirigida não encontrou credenciais/PII real no conjunto; contatos de testes são mocks/sintéticos e placeholders. Nenhum .env, dump, configuração privada ou fixture remota removida incluído. PNGs são somente os três ícones aprovados. Index inicialmente vazio.

Conjunto preparado para um único commit local `feat(booking): consolida acesso recorrente e perfil público`, condicionado à revisão final do index. Hash e resultado final serão informados na resposta da execução, sem editar documento após o commit. Gates antigos de bloqueio neste relatório são históricos e foram superados pelas autorizações posteriores. Sem alteração funcional, novos testes, build, DML, migration, seed, cleanup, deploy ou push nesta tarefa.

Nota posterior — gate do aviso de serviços indisponíveis em 22/09/2026: **classificação B — auxiliar/redundante no fluxo disponível, sem prejuízo operacional comprovado nos estados testados**. Hunk em PublicBookingPage.tsx: inclusão de `hidden sm:block` no parágrafo condicionado a `catalog_status.unavailable_services > 0`; oculto abaixo de 640px e visível a partir de 640px. O aviso informa ausência de profissional habilitado para parte dos serviços; não identifica uma opção selecionável nem uma ação exigida. Com catálogo disponível, seleção de serviço/data permanece acessível no mobile. Com catálogo vazio, mensagem independente “Nenhum serviço disponível no momento” e explicação sobre profissionais habilitados permanecem visíveis. Não há ação de agendamento nesse estado em ambos os layouts por ausência de oferta, não pela ocultação do aviso. Não existe equivalente literal do aviso parcial no mobile; o estado vazio tem explicação equivalente quando necessária. Intenção histórica da ocultação não documentada; o aviso anterior existe no HEAD 85a0683b sem ocultação, e a alteração preexiste no working tree. Sem atribuir data/autoria exatas ou inventar intenção.

Teste mínimo novo frontend/scripts/unavailable-notice-local-check.cjs: **4 cenários Chrome local aprovados, 0 reprovados na execução final** — desktop 1280x844 com/sem aviso aplicável, mobile 390x844 com serviço selecionável e mobile com catálogo vazio explicado; limite 639/640 também conferido. Primeira tentativa interrompida por suposição do harness de somente GET, corrigida apenas para simular bootstrap de identidade já existente. APIs em memória e tráfego externo bloqueado; sem testar identidade, agendamento ou outros gates. Sem DML remoto ou fixtures persistidas. Servidor local encerrado. Nenhum código de produção alterado.

Hunk liberado para checkpoint. PublicBookingPage.tsx integralmente liberado pelos gates combinados; public-booking.service.ts permanece liberado. Nenhum hunk de aprovação incerta remanescente nesses dois bloqueadores, sem estender essa conclusão a todo o inventário Git. Sem staging Git, commit, push, deploy, migration, seed, cleanup ou WhatsApp. **GATE PUBLICBOOKINGPAGE — ARQUIVO INTEGRALMENTE LIBERADO PARA O CHECKPOINT CONSOLIDADO.**

Nota posterior — gate Meus dados em 22/09/2026: funcionalidade preexistente agora validada para checkpoint no escopo local automatizado. Nove testes backend dirigidos aprovados (quatro existentes de perfil/colisão/compartilhamento/consentimento e cinco novos de TC ausente, desconhecido, outro tenant, expirado e leitura por tenant/client exatos). Quatro cenários Chrome local aprovados: abertura/leitura/edição/envio dos valores atuais e sucesso; cancelar/fechar sem escrita; erro de salvamento com preservação e retry; erro de leitura com fechamento/reabertura. Modal sem overflow horizontal na medição de 390x844; sem teste físico. APIs simuladas em memória, tráfego externo bloqueado, nenhuma fixture persistida. Uma tentativa inicial não alcançou o servidor no sandbox; outra exigiu corrigir somente o seletor do teste para input tel. Execução final 4/4; nenhum defeito funcional confirmado. Testes adicionados: backend/src/modules/public-booking/self-profile.scope.test.js e frontend/scripts/profile-local-check.cjs. Biblioteca de browser em pasta temporária ignorada; servidor local encerrado.

Staging: NÃO TESTADO — nenhuma fixture remota usada; este gate é local e não afirma validação remota. Hunks de edição de perfil anteriormente E passam a “funcionalidade preexistente agora validada para checkpoint”, sem reescrever a aprovação histórica. Esta nota não aprova automaticamente os 98 candidatos nem hunks de outra finalidade: por exemplo, ocultação mobile do aviso de serviços indisponíveis em PublicBookingPage permanece fora do gate de perfil. A parte de perfil de public-booking.service.ts foi validada; R1.6-B/retry conservam gates anteriores. Sem código de produção alterado, testes gerais, build completo, DML, migration, deploy, staging Git, commit ou push. README/contexto/roadmap/current-state preservados.

A: R1.6-B/PWA/UX candidato; B: documentação consolidada; C: outra etapa com aplicação comprovada; D: arquivo misto/outra fase/origem não comprovada; E: artefato excluído. Categoria A não certifica cada hunk nem libera staging com o gate interrompido.

| Categoria | Arquivo |
| --- | --- |
| B | `README.md` |
| A | `backend/package-lock.json` |
| A | `backend/package.json` |
| A | `backend/scripts/campaign-test-data-v3.js` |
| D | `backend/src/modules/auth/auth.validators.js` |
| A | `backend/src/modules/public-booking/client-identity.repository.js` |
| A | `backend/src/modules/public-booking/client-identity.service.js` |
| A | `backend/src/modules/public-booking/client-identity.service.test.js` |
| A | `backend/src/modules/public-booking/public-booking.controller.js` |
| A | `backend/src/modules/public-booking/public-booking.repository.js` |
| A | `backend/src/modules/public-booking/public-booking.service.js` |
| A | `backend/src/modules/public-booking/public-booking.validators.js` |
| D | `backend/src/modules/services/service-specialty-update.test.js` |
| D | `backend/src/modules/services/services.service.js` |
| A | `backend/src/routes/public.routes.js` |
| D | `backend/src/utils/error-messages.js` |
| A | `backend/src/utils/normalize.js` |
| A | `docs/modules/booking-publico.md` |
| B | `docs/project-context.md` |
| B | `docs/roadmap.md` |
| A | `frontend/src/app/layout.tsx` |
| A | `frontend/src/app/manifest.ts` |
| D | `frontend/src/components/cadastro/RegisterForm.tsx` |
| D | `frontend/src/components/cadastro/TermsCheckbox.tsx` |
| D | `frontend/src/components/clients/ClientsManager.tsx` |
| D | `frontend/src/components/dashboard/DashboardCard.tsx` |
| D | `frontend/src/components/dashboard/DashboardHome.tsx` |
| D | `frontend/src/components/dashboard/MobileBottomNav.tsx` |
| D | `frontend/src/components/public-booking/PublicBookingPage.tsx` |
| A | `frontend/src/components/recurring-access/RecurringAccessPage.tsx` |
| D | `frontend/src/components/services/ServicesMerManager.tsx` |
| A | `frontend/src/components/ui/phone-input.tsx` |
| D | `frontend/src/hooks/useRegister.ts` |
| D | `frontend/src/lib/messages.ts` |
| A | `frontend/src/lib/recurring-access.storage.ts` |
| D | `frontend/src/services/public-booking.service.ts` |
| D | `frontend/src/services/register.service.ts` |
| D | `frontend/src/services/services.service.ts` |
| A | `frontend/src/utils/phone.ts` |
| A | `backend/scripts/campaign-test-phone.js` |
| D | `backend/src/modules/auth/auth.validators.test.js` |
| A | `backend/src/modules/public-booking/access-discovery.test.js` |
| A | `backend/src/modules/public-booking/identity-attribution.test.js` |
| A | `backend/src/modules/public-booking/identity-migration.test.js` |
| A | `backend/src/modules/public-booking/identity-policy.js` |
| A | `backend/src/modules/public-booking/identity-policy.test.js` |
| A | `backend/src/modules/public-booking/identity-rate-limit.js` |
| A | `deploy/staging/AUDIT.md` |
| A | `deploy/staging/Dockerfile` |
| A | `deploy/staging/Dockerfile.dockerignore` |
| A | `deploy/staging/POST-DEPLOY.md` |
| A | `deploy/staging/README.md` |
| A | `deploy/staging/browser-check.cjs` |
| A | `deploy/staging/gateway.cjs` |
| A | `deploy/staging/gateway.test.cjs` |
| A | `deploy/staging/prepare-context.ps1` |
| A | `deploy/staging/railway.json` |
| A | `deploy/staging/smoke.cjs` |
| A | `deploy/staging/start.cjs` |
| A | `deploy/staging/supervise.cjs` |
| A | `deploy/staging/supervise.test.cjs` |
| D | `docs/audits/20260824-auditoria-taxonomia-beleza-bem-estar-v2.md` |
| D | `docs/audits/20260825-especificacao-tecnica-taxonomia-beleza-bem-estar-v2.md` |
| A | `docs/audits/20260904-acesso-recorrente-tenant-first-fase-0-5.md` |
| A | `docs/audits/20260908-fase-0-6b-auditoria-https-mobile-pwa.md` |
| A | `docs/audits/20260908-fase-0-6bh-https-ativo.md` |
| A | `docs/audits/20260908-fase-0-6bh-https-temporario.md` |
| A | `docs/audits/20260908-public-booking-mobile-session-id.md` |
| A | `docs/audits/20260909-fase-0-6b-chunkloaderror-proxy.md` |
| A | `docs/audits/20260909-fase-0-6b-descoberta-instalacao-pwa.md` |
| A | `docs/audits/20260909-fase-0-6bh-cloudflare-quick-tunnel.md` |
| A | `docs/audits/20260910-fase-0-6b-diagnostico-installability.md` |
| A | `docs/audits/20260910-fase-0-6b-installability-corrigida.md` |
| A | `docs/audits/20260910-fase-0-6b-ngrok-development-domain.md` |
| A | `docs/audits/20260911-pwa-dev-panel.md` |
| A | `docs/audits/20260916-r1-5-bootstrap-pairing.md` |
| A | `docs/audits/20260917-r1-6-acesso-pwa-simplificado.md` |
| A | `docs/audits/20260917-r1-6-b-implementacao-acesso-pwa-simplificado.md` |
| A | `docs/audits/20260918-r1-6-b-aplicacao-remota-migrations.md` |
| A | `docs/audits/20260918-r1-6-b-correcao-gate-migrations.md` |
| B | `docs/audits/20260918-r1-6-b-deploy-staging.md` |
| A | `docs/audits/20260918-r1-6-b-gate-migrations.md` |
| E | `docs/audits/20260918-r1-6-b-remoto-antes.json` |
| E | `docs/audits/20260918-r1-6-b-remoto-depois.json` |
| B | `docs/current-state.md` |
| D | `docs/roteiros/20260911-depuracao-remota-pos-aceite.md` |
| E | `docs/roteiros/roteiro-teste-funcional-taxonomia-v2-masteradmin-tenant.docx` |
| A | `frontend/public/icons/maskable-icon-512.png` |
| A | `frontend/public/icons/pwa-icon-192.png` |
| A | `frontend/public/icons/pwa-icon-512.png` |
| A | `frontend/public/sw.js` |
| A | `frontend/scripts/pwa-access-local-check.cjs` |
| A | `frontend/src/app/manifest.webmanifest/route.ts` |
| A | `frontend/src/app/offline/page.tsx` |
| A | `frontend/src/app/pwa-diagnostics/page.tsx` |
| D | `frontend/src/components/cadastro/RegisterForm.validation.test.js` |
| D | `frontend/src/components/cadastro/register-validation.test.js` |
| D | `frontend/src/components/cadastro/register-validation.ts` |
| A | `frontend/src/components/pwa/InstallPwaPrompt.test.js` |
| A | `frontend/src/components/pwa/InstallPwaPrompt.tsx` |
| A | `frontend/src/components/pwa/PwaDiagnosticObserver.tsx` |
| A | `frontend/src/components/pwa/PwaDiagnosticsPanel.tsx` |
| A | `frontend/src/components/pwa/PwaInstallProvider.test.js` |
| A | `frontend/src/components/pwa/PwaInstallProvider.tsx` |
| A | `frontend/src/components/pwa/PwaServiceWorker.test.js` |
| A | `frontend/src/components/pwa/PwaServiceWorker.tsx` |
| A | `frontend/src/components/pwa/manifest-link.test.js` |
| A | `frontend/src/components/pwa/pwa-diagnostics.ts` |
| A | `frontend/src/components/pwa/pwa-panel.test.js` |
| A | `frontend/src/components/pwa/pwa-resource-checks.ts` |
| A | `frontend/src/components/pwa/recurring-storage-snapshot.test.js` |
| A | `frontend/src/components/pwa/recurring-storage-snapshot.ts` |
| A | `frontend/src/components/recurring-access/LocateAccess.editing.test.js` |
| A | `frontend/src/components/recurring-access/LocateAccess.tsx` |
| A | `frontend/src/components/recurring-access/RecurringAccessPage.access.test.js` |
| A | `frontend/src/components/recurring-access/RecurringAccessPage.diagnostics.test.js` |
| D | `frontend/src/components/services/ServicesMerManager.messages.test.js` |
| A | `frontend/src/lib/pwa-manifest.test.js` |
| A | `frontend/src/lib/pwa-manifest.ts` |
| A | `frontend/src/lib/session-id.test.js` |
| A | `frontend/src/lib/session-id.ts` |
| A | `frontend/src/services/public-booking.retry.test.js` |
| D | `frontend/src/services/register.service.test.js` |
| C | `supabase/migrations/20260824190000_reconcile_legacy_hairdresser_specialty_cargo.sql` |
| C | `supabase/migrations/20260826120000_fix_operational_profiles_updated_trigger.sql` |
| A | `supabase/migrations/20260917100000_restrict_public_booking_identity_rpc.sql` |
| A | `supabase/migrations/20260917101000_public_booking_identity_birth.sql` |
