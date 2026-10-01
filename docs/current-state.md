# Current State

## RD-H10 — Fase 0.6C / PWA MyEsthya — 30/09/2026

Consolidação documental. Fonte dos resultados físicos: relato do Product Owner
no TXT “Aplicar via CODEX”, RD-H10. Os testes físicos foram executados pelo
responsável e aqui registrados, não repetidos nesta etapa. Resultados técnicos e
deploy são os já concluídos em RD-H9.1/RD-H9.2. Esta seção prevalece sobre os
checkpoints históricos abaixo.

### Decisão arquitetural — PWA única e entrada no SaaS

Uma única PWA MyEsthya atende clientes, administradores, autônomos,
funcionários/profissionais e demais usuários internos autorizados. Não existem
duas PWAs separadas, nem uma por tenant.

| Definição vigente | Valor |
| --- | --- |
| Manifest único | `/manifest.webmanifest` |
| `id` | `/acesso` |
| `start_url` | `/app` |
| `scope` | `/` |
| `display` | `standalone` |
| Service worker global | `/sw.js` |

`/app` é dispatcher/entrada neutra; `/acesso` é o fluxo recorrente cliente.
`/app` não concede autorização. Intenção de navegação não equivale a identidade:
a autorização permanece no backend e nos mecanismos existentes de autenticação e
identificação. TC cliente e sessão profissional são independentes; não correlacionar
automaticamente identidades por nome, telefone, e-mail ou tenant.

Desenho funcional confirmado pelo Product Owner:

- **Cliente:** WhatsApp/campanha/link → fluxo Web cliente → identificação/agendamento
  → oportunidade de instalar MyEsthya → retorno recorrente pelo ícone.
- **Profissional/admin/autônomo:** campanha/anúncio/landing → cadastro ou login
  profissional → acesso ao SaaS → oportunidade de instalar → retorno pelo ícone.

Links externos são entradas Web para fluxos específicos. O SaaS não depende de o
sistema operacional abrir obrigatoriamente a PWA instalada. A instalação serve
principalmente ao retorno recorrente; não há contrato de redirecionamento
obrigatório de links externos para a standalone.

### Decisão arquitetural — política de contextos RD-H5

| Contextos disponíveis | Comportamento definido |
| --- | --- |
| Nenhum | `/app` neutro; usuário escolhe o fluxo desejado |
| Somente cliente | Experiência cliente; sem “Acessar área profissional” e sem “Adicionar acesso profissional” |
| Somente profissional | Experiência profissional; sem “Acessar como cliente” e sem “Adicionar acesso de cliente” |
| Ambos | `last-context` pode escolher a entrada; alternância explícita, preservando ambos os contextos válidos |

`esthya:last-context` é preferência de navegação, nunca identidade ou autorização.
Contexto indisponível prevalece sobre essa preferência. Falha transitória não
comprova disponibilidade. No formulário de login, o retorno a um cliente já
validado é permitido; não é convite para adquirir outro contexto.

O produto não convida indiscriminadamente todo cliente a se tornar profissional,
nem todo profissional a se tornar cliente. O segundo contexto deve ser adquirido
legitimamente: link/WhatsApp/acesso cliente, ou campanha/landing/cadastro/login
profissional. A alternância só aparece depois de ambos estarem estabelecidos na
mesma PWA. Isso não cria autorização cruzada.

### Evidência física — CENÁRIO A: SOMENTE CLIENTE

**PASS FÍSICO.** iPhone 7 Plus, iOS 15.8.8; Arlete Sales, Bellory Test Studio.
PWA instalada, contexto cliente estabelecido e cliente reconhecida como Arlete
Sales. Acesso recorrente pelo ícone e encerramento/reabertura preservaram o
contexto, exibindo diretamente a experiência cliente. Após RD-H5, não aparecem
“Acessar área profissional” nem “Adicionar acesso profissional”. Dispositivo e
dados não foram modificados nesta consolidação.

### Evidência física — CENÁRIO B: SOMENTE PROFISSIONAL

**PASS FÍSICO.** iPhone 13 Pro; Marina Lopes,
`marina.admin@belloryteste.com`, Bellory Test Studio. Versão do iOS não informada
neste relato; não presumir a versão pelo modelo do aparelho.

1. Instalação antiga removida somente da Tela de Início; histórico/dados do Safari
   não foram apagados.
2. Safari abriu `/login`; Marina autenticou pelo fluxo profissional com
   “Continuar conectado neste dispositivo” marcado.
3. Após a correção RD-H9.1 publicada em RD-H9.2, o Dashboard carregou e ofereceu
   “Adicionar ao celular”.
4. Compartilhar → Adicionar à Tela de Início apresentou nome MyEsthya, ícone
   correto e “Abrir como app web” ativado; nova PWA instalada.
5. Primeira abertura pelo novo ícone exibiu `/app` neutro. A sessão do Safari não
   foi automaticamente assumida pela standalone.
6. “Acessar área profissional” → `/login` → novo login de Marina dentro da PWA
   → Dashboard Bellory Test Studio abriu normalmente.
7. PWA encerrada completamente; Safari também encerrado. Reabertura exclusivamente
   pelo ícone reconheceu Marina e abriu o Dashboard sem novo login, sem tela
   neutra e sem novo “Preparando seu painel...”.

### Safari x standalone — evidência e limite

**Comportamento observado nos testes físicos executados:** a sessão estabelecida
no Safari não foi automaticamente utilizada pela nova standalone no iPhone 13 Pro.
Depois do login na própria PWA, a sessão profissional persistiu no retorno pelo
ícone. Não generalizar como contrato universal de todas as versões do iOS.

**Arquitetura / comportamento tecnicamente esperado:** Safari e PWA podem ter
estados locais distintos. Dados de negócio continuam centralizados no backend;
uma alteração via navegador deve ser refletida na PWA quando esta consultar o
backend. Isso não implica compartilhamento automático de sessão ou localStorage.
A sincronização de uma alteração de negócio entre os dois ambientes não foi
comprovada pelo roteiro físico acima.

### RD-H9 / RD-H9.1 — defeito, correção e evidência

Antes da correção, o login profissional de Marina no Safari permanecia por mais
de um minuto em “Preparando seu painel...”. Classificação: **G — loop/race de
frontend**. Causa identificada no código:

DashboardLayout → ContextAccessLink → useContextAvailability → revalidateSession()
→ isLoading global → desmontagem do Dashboard → remontagem → nova revalidação.

RD-H9.1 aplicou correção mínima no AuthProvider: separar loading inicial de
revalidação em segundo plano de uma sessão já aceita. Essa revalidação não deve
desmontar um Dashboard autenticado. Preservados: invalidação de sessão
definitivamente inválida; preservação em falha transitória; refresh/retry/
single-flight da correção 5H; política RD-H5.

**Validação técnica anterior:** 77/77 testes PASS; TypeScript PASS; build de
produção PASS, 45 páginas. Arquivos RD-H9.1: AuthProvider.tsx e
internal-entry.test.cjs. Nenhum teste/build reexecutado na RD-H10.

**Validação física após RD-H9.2:** uma única atualização da página existente no
Safari reaproveitou a sessão persistida e abriu o Dashboard Bellory Test Studio,
sem novo login. Posteriormente, login dentro da standalone e encerramento/
reabertura abriram normalmente o Dashboard; o loop não reapareceu.

**RD-H9.1: PASS TÉCNICO + PASS FÍSICO EM DEV/STAGING.**

### RD-H9.2 — publicação já concluída

- Deployment: `0489cdb0-d5c9-4ce0-9eb5-97746d21b0b9` — **SUCCESS**.
- Railway: projeto `pwa-dev-staging`, serviço `pwa-staging`.
- Ambiente chamado `production` dentro desse projeto é **DEV/STAGING, não produção real**.
- Domínio: https://pwa-staging-production.up.railway.app.
- Delta contra o snapshot anterior: somente `frontend/src/context/AuthProvider.tsx`;
  testes excluídos do upload, alterações residuais preservadas.
- Smoke mínimo: GET `/login`, `/dashboard`, `/app` — HTTP 200 nos três.
  Esses GETs não demonstram autenticação; a evidência física está descrita acima.

### Matriz de validação atual

| Cenário | Estado |
| --- | --- |
| Nenhum contexto → `/app` neutro | Comprovado fisicamente na primeira abertura da nova PWA profissional |
| A — Somente cliente | PASS FÍSICO |
| B — Somente profissional | PASS FÍSICO |
| C — Cliente + profissional da MESMA pessoa | PENDENTE DE VALIDAÇÃO FÍSICA |
| Duas pessoas diferentes no mesmo dispositivo | Não é cenário principal de produto |

Arlete + Marina no mesmo celular não representa o cenário normal de ambos os
contextos: são pessoas distintas. Não inferir aprovação do cenário C a partir dos
passes isolados A/B.

### Pendências futuras e próxima decisão

**Cenário C:** escolher uma única pessoa de teste; estabelecer legitimamente os
dois contextos no mesmo ambiente PWA; validar last-context, alternância explícita,
preservação de ambos, ausência de autorização cruzada e encerramento/reabertura.
Não implementado nem executado nesta etapa.

**Aquisição posterior no navegador:** se alguém já tem um contexto na standalone
e adquire o segundo somente no Safari, a PWA pode não conhecer automaticamente
esse estado local. É questão futura, não comportamento comprovado do cenário C.
“Continuar um link recebido” foi alternativa arquitetural anteriormente avaliada,
**não é decisão aprovada e não foi implementada**. Não presumir handoff automático.

**Segurança separada:** o repositório contém emissão de link legado
`/agendar/<slug>?tk=...` em `issueClientLink`
(backend/src/modules/public-booking/client-identity.service.js). Há token/credencial
no link; merece revisão de segurança separada. Nenhum valor de token é registrado
ou fluxo executado aqui. Não promover esse mecanismo como handoff navegador → PWA.

**Próxima decisão recomendada:** definir a pessoa e o roteiro legítimo de aquisição
dos dois contextos para o cenário C, incluindo como entrar no segundo fluxo na
standalone. Só então autorizar o teste; nenhuma solução nova está aprovada.

### Integridade desta consolidação

Somente documentação existente atualizada. Sem código, testes, build, banco,
gateway, manifest/SW, Railway/deploy, login, sessões, usuários, tenants ou TCs.
Sem alteração dos dados de Marina/Arlete, commit ou push. Os nomes de teste acima
foram expressamente fornecidos para este registro; não incluem credenciais.

---

# Histórico — checkpoint R1.6-B de 22/09/2026

## Checkpoint histórico

- Data: 22/09/2026.
- Fase: R1.6-B concluída no escopo funcional definido.
- Cleanup controlado concluído; documentação consolidada.
- Gate Git: checkpoint pendente por segurança; nenhum staging/commit realizado.
- PublicBookingPage.tsx e public-booking.service.ts misturam R1.6-B com edição
  de perfil sem gate específico comprovado nas fontes consultadas.
- Push não autorizado nesta execução.
- Railway: projeto `pwa-dev-staging`, serviço `pwa-staging`.
- Environment interno `production` exclusivo de DEV/STAGING.
- Deployment aprovado: `4859a35c-0565-4998-94f3-7d6d3e85782a`.
- URL: https://pwa-staging-production.up.railway.app.

## Arquitetura no checkpoint R1.6-B

- Tenant-first: `/agendar/[slug]` inicia relação com estabelecimento.
- `/acesso` é a entrada recorrente, com referências locais de tenants.
- PWA única do SaaS, não por tenant.
- Sem identidade global do cliente; TC tenant-scoped.
- Telefone + DOB identificam/recuperam acesso conforme R1.6-B.
- Telefone sozinho não concede TC.
- TC válido permite retorno sem repetir telefone/DOB.
- Tokens aditivos no fluxo aprovado.
- Upcoming usa cliente_id autorizado, sem expansão por telefone.
- Gateway staging integra frontend Next.js e backend Node.js.
- Dados no Supabase DEV existente; isolamento obrigatório.

## Gates aprovados

- Duas migrations R1.6-B aplicadas remotamente; não reaplicar.
- Gateway corrigido e deployment staging SUCCESS.
- Health, `/acesso` e `/agendar/bellory-test-studio` aprovados.
- Bundle atualizado de LocateAccess confirmado no último deployment.
- TC válido, cliente existente, DOB incorreto e C0/C1/CN aprovados.
- Novo cliente e repetição sem duplicidade aprovados.
- Upcoming positivo/isolamento por cliente_id aprovados.
- Android recorrente aprovado no dispositivo moderno testado.
- iOS recuperação/identificação aprovada no PWA standalone testado.
- Edição telefone/DOB, reenvio e acesso personalizado aprovados.
- DOB continua usando seletor nativo.
- Alerta destacado e limpo ao alterar telefone ou DOB.
- Scroll horizontal eliminado conforme reteste informado.
- Resultados físicos limitados aos dispositivos testados.

## Cleanup desta rodada

- Removidas somente fixtures exclusivas do smoke R1.6-B de 21/09.
- 3 clientes, 3 vínculos, 3 TCs, 2 agendamentos, 2 itens e 3 eventos.
- IDs/marcadores conferidos no DEV antes do DELETE transacional.
- Demais registros das seis tabelas preservados por comparação na transação.
- Ausência posterior das fixtures e referências diretas confirmada.
- Massa DEV compartilhada, tenant, profissional e catálogo preservados.
- Nenhuma migration/schema permanente alterado.

## Pendências reais

- Hardening específico das policies RLS de `tokens_cliente`.
- Rate limit distribuído se houver múltiplas instâncias e governança do perfil
  compartilhado permanecem evoluções futuras registradas na implementação.
- Variação visual/escala residual iOS: cosmética, não bloqueante.
- Hipótese de escala/auto-zoom ligada à tipografia não é causa confirmada.
- Não aplicar CSS especulativo nem generalizar validação a todo Android/iOS.
- Bootstrap/pairing/OTP avançado é evolução opcional, não requisito atual.
- Demais frentes de estabilização e produto permanecem no roadmap.

## Próximo passo recomendado naquele checkpoint

- Comprovar origem/aprovação das alterações de perfil nos arquivos mistos antes
  de selecionar um checkpoint completo por arquivos inteiros.
- Depois priorizar backlog técnico em tarefa específica autorizada.
- Não reabrir R1.6-B funcional por ausência de reteste nesta execução.

## Restrições importantes

- Não reabrir gates aprovados sem alteração afetada.
- Não executar migrations, deploy ou seed automaticamente.
- Preservar multi-tenant e ausência de identidade global.
- Sem commit/push automático em futuras tarefas.
- Sem cleanup de massa DEV ou exclusão por telefone/data aproximada.
- Não registrar PII, tokens ou credenciais em documentos.

## Referências incrementais

- [Contexto](project-context.md): arquitetura e regras vigentes.
- [Roadmap](roadmap.md): backlog e próximos passos.
- [Relatório incremental](audits/20260918-r1-6-b-deploy-staging.md): evidências,
  inventário técnico e fechamento; seções antigas são histórico.
