# Fase 0.6B — R1.5 — Bootstrap / pairing tenant-first

Data: 16/09/2026. Escopo: exclusivamente o TXT `Aplicar via CODEX.txt`, versão lida nesta execução. Documento de investigação e decisão; não especifica uma entrega R2 já implementada.

## 1. Resumo executivo

**Não há mecanismo totalmente automático comprovado para o iOS 15.8.8 do teste.** Isso não demonstra impossibilidade absoluta da plataforma. A resposta operacional é INCONCLUSIVO para esse aparelho e NÃO como garantia multiplataforma universal.

O Android informado já realiza instalar → ícone → reconhecimento pelo caminho local existente. Deve continuar assim. Para um standalone vazio, o melhor candidato automático encontrado é transportar uma autorização temporária X em cookie durante a instalação, onde a plataforma documenta essa transferência. O WebKit documenta cópia de cookies ao adicionar à tela inicial a partir do iOS/iPadOS 17.2; não documenta nessa fonte a mesma capacidade para 15.8.8. Não copia os demais storages nem mantém sincronização posterior. Aplicar isso a um cookie curto de bootstrap é uma **hipótese de engenharia**, ainda não validada no projeto. [WebKit 17.2](https://webkit.org/blog/14787/webkit-features-in-safari-17-2/)

O melhor nível 2 é pairing por código descartável, preparado pelo contexto autorizado e digitado/colado no aplicativo vazio. Dispensa compartilhamento de storage e SMS. A hierarquia recomendada permanece: credencial local válida → bootstrap disponível e validado → pairing → recuperação futura por contato elegível/OTP.

## 2. Evidência atual

| Natureza | Evidência | Limite |
|---|---|---|
| Física, fornecida pelo usuário | Samsung Android 13, One UI 5.1, Chrome, Railway HTTPS: identidade, tenant e próximo horário preservados após instalação e reabertura | Não estender a todo navegador Android |
| Física, fornecida pelo usuário | iOS 15.8.8: Safari com preferência/identidade; standalone sem essas chaves; localStorage legível, mesmo origin e SW ativo | Prova ausência de continuidade dessas chaves; não prova isoladamente o comportamento de cookies, IDB ou CacheStorage |
| Nesta R1.5 | Auditoria do código relevante, documentação primária, comparação das alternativas e 39 testes existentes aprovados | Não houve transferência real de X nem emissão real de B |
| Pendente | Cookie temporário durante instalação; pairing entre contextos físicos; marcadores descartáveis dos demais canais | Exige instrumentação publicada e interação no aparelho |

Não foi executado teste físico Android nesta etapa. Não houve publicação, migração, acesso de escrita ao banco, SMS, commit ou push nesta execução. Achados de auditoria remota de etapas anteriores não foram revalidados aqui.

## 3. Arquitetura atual

Browser → `/agendar/[slug]` → identidade tenant-scoped local → instalação → `/acesso` → preferência/tenants conhecidos → validação de identidade → próximos horários. Quando o standalone não encontra identidade, o fluxo atual não possui protocolo X→B.

Pontos revisados:

- `frontend/src/lib/pwa-manifest.ts`: `start_url=/acesso`, `scope=/`, standalone, ícones PNG e marca parametrizada; sem `id` explícito. A geração atual está em `src/app/manifest.webmanifest/route.ts`; `src/app/manifest.ts` aparece removido nas alterações anteriores.
- `frontend/public/sw.js`: cache apenas de `/offline`; navegações preferem rede; APIs/identidade/horários ficam fora do tratamento. Não há ponte de mensagens de autenticação. Na ativação, remove caches de nomes diferentes do cache atual: um futuro marcador em CacheStorage poderia desaparecer por esse motivo, sem provar isolamento.
- `PwaServiceWorker.tsx`: registra `/sw.js` e solicita atualização. Mesmo script/scope não demonstra mesma instância/partição entre browser e standalone.
- `PwaInstallProvider.tsx` e `InstallPwaPrompt.tsx`: capturam eventos de instalação, detectam display-mode/navigator.standalone e orientam instalação manual no iOS. Esses eventos não entregam credencial ao contexto novo.
- `RecurringAccessPage.tsx`: lê preferência/tenants e identidade local; consulta os serviços existentes. O estado vazio tem link DEV para diagnóstico. Não consome autorização de bootstrap.
- `PublicBookingPage.tsx`: usa identidade por slug e sessão de agendamento em sessionStorage; recebe token de link e identidade local. Preferência é conveniência, não autenticação global.
- Fluxo legado `?tk=` e chamadas de profile/upcoming com token não são solução para o novo handoff: transportar A dessa forma é proibido no desenho novo. Não foram modificados nesta análise.
- `client-identity.service.js`: resolve token por tenant, validade e vínculo; há atualização de uso mesmo em caminhos com `track:false`. Emissão por identificação/RPC e emissão de link possuem caminhos de revogação. Reutilizá-los cegamente para B pode invalidar A. A emissão aditiva deverá ter autorização própria, sem executar identificação por telefone como prova.
- Diagnóstico existente, condicionado a `NEXT_PUBLIC_DEV_PWA_DIAGNOSTICS=true`, mostra presença/contagem e contexto sem precisar revelar bearer. Marca/configuração continuam centralizadas em `app-brand`.

## 4. Alternativas analisadas

### 4.1 localStorage, sessionStorage e IndexedDB

**Como:** ler marcador/identidade da mesma área de armazenamento. **Vantagem:** nenhuma interação quando disponível. **Limitação:** mesma origem não comprova continuidade entre aplicações; sessionStorage também não é canal persistente de instalação. **Segurança:** não duplicar A para tentar contornar isolamento. **iOS:** localStorage não continuou no aparelho informado; IDB requer marcador físico próprio. **Android:** caminho local aprovado naquele dispositivo, sem prova específica de IDB. **Conclusão:** manter o caminho local; não adotar troca de storage como solução sem evidência. Persistência/quota não equivalem a compartilhamento. [Política de armazenamento WebKit](https://webkit.org/blog/14403/updates-to-storage-policy/)

### 4.2 CacheStorage e mensagens via SW

**Como:** marcador sintético em cache ou troca de mensagens entre clientes visíveis ao worker. **Vantagem:** sem digitação se houver canal comum. **Limitação:** registro e seleção de clientes dependem da storage key; `includeUncontrolled` não atravessa partições. `MessageChannel` exige entrega inicial de uma porta; o worker pode terminar e não oferece memória permanente. **Segurança:** somente marcador descartável, nunca A, PII ou agendamentos; validar origem, cliente, propósito e nonce em eventual mensagem. **iOS:** nenhum canal comum demonstrado. **Android:** possível no contexto compartilhado, mas desnecessário para o caminho já funcional. **Conclusão:** diagnóstico exploratório, não ponte universal. [Service Workers, registros e Clients](https://www.w3.org/TR/service-workers/)

BroadcastChannel e eventos de storage também não constituem descoberta universal entre partições. Disponibilidade de uma API não comprova alcance entre Safari e aplicativo; não escolher isso como mecanismo único. [HTML — BroadcastChannel](https://html.spec.whatwg.org/multipage/web-messaging.html#broadcasting-to-other-browsing-contexts)

### 4.3 Cookie temporário first-party

**Como:** após autorização por A, backend guarda hash de X e envia cookie host-only, `Secure; HttpOnly; SameSite=Strict; Path=/`, com TTL inicial proposto de 5 minutos. Na primeira abertura vazia, POST same-origin recebe X automaticamente e o consome; B vai apenas para o novo contexto. **Vantagem:** não expõe X ao JavaScript e mantém `/acesso`. **Limitação:** depende da cópia no momento da instalação, não de sincronização; demora para abrir pode vencer X. **Segurança:** validar Origin/CSRF, propósito, tenant e estado de A; `HttpOnly` não impede XSS de disparar operações. **iOS:** candidato documentado em versões recentes, pendente no projeto; 15.8.8 não comprovado. **Android:** não alterar o caminho local; testar apenas contexto vazio controlado. **Conclusão:** melhor hipótese de nível 1, nunca requisito universal.

O cookie contém somente autorização de bootstrap, não autenticação global nem A. Uma autorização representa um tenant/cliente; não agregar identidades de tenants em um cookie. O contexto já autorizado não deve consumir X por navegação rotineira. Detecção de standalone orienta a UX, mas não é atestado de segurança. Um servidor não distingue magicamente uma PWA legítima de outro portador de X.

### 4.4 start_url e manifest dinâmicos

**Como:** materializar X temporário na URL inicial do manifest. **Vantagem:** se a plataforma preservar a URL, há transporte sem storage. **Limitação:** instalação, cache e atualização do manifest podem reter valor vencido ou capturar outro valor; reinstalação não garante atualização. Sem `id` explícito, variar `start_url` pode variar identidade da aplicação nas implementações que usam esse fallback. **Segurança:** manifest personalizado não pode entrar em cache público; `no-store` não apaga metadados já instalados. **iOS:** suporte a `id` foi anunciado no 16.4, não resolve o alvo 15.8.8. **Android:** precisa verificar identidade, atualização e reabertura. **Conclusão:** opção restrita, inferior ao cookie/pairing; preservar baseline `/acesso`, uma PWA e nenhum manifest por tenant. [Manifest W3C](https://www.w3.org/TR/appmanifest/), [WebKit iOS 16.4](https://webkit.org/blog/13878/web-push-for-web-apps-on-ios-and-ipados/)

### 4.5 Launch URL e capability temporária em URL

**Como:** uma URL efetivamente entregue ao aplicativo leva X, nunca A. **Vantagem:** independe de localStorage comum. **Limitação:** receber parâmetros depois do lançamento não resolve como entregá-los ao primeiro ícone; `/acesso` fixo não herda automaticamente a query da página Safari. Launch Handler controla lançamentos suportados, não cria uma ponte Safari→standalone. **Segurança:** TTL de minutos, single-use, consumir por POST, `Cache-Control: no-store`, `Referrer-Policy: no-referrer`, sem analytics/terceiros; remover query/fragmento imediatamente com `history.replaceState`. Isso não desfaz logs/histórico prévios. Query pode atingir servidor/proxy/SW; fragmento reduz exposição HTTP, mas continua acessível a JS, histórico, screenshots e compartilhamento. Roubo antes do consumo ainda permite corrida. **iOS/Android:** suporte e captura do link exigem teste específico. **Conclusão:** C, canal opcional; persistent bearer em qualquer URL nova é D. [Chrome Launch Handler](https://developer.chrome.com/docs/web-platform/launch-handler/)

### 4.6 opener, redirects, navegação e universal links

**Como:** tentar abrir/retornar a outro contexto e enviar mensagem. **Vantagem:** interação potencialmente pequena quando o vínculo existe. **Limitação:** abertura pelo ícone não garante `window.opener`; redirect pode permanecer no navegador; `postMessage` precisa de referência e destino validado. Universal links da Apple exigem integração de app/associated domains, ausente na PWA web atual. **Segurança:** validar origem/source e nunca enviar A. **iOS/Android:** não há garantia demonstrada para este cenário. **Conclusão:** não usar como única solução nem criar wrapper nativo nesta etapa. [Apple Universal Links](https://developer.apple.com/documentation/xcode/supporting-universal-links-in-your-app)

### 4.7 Clipboard e Web Share

**Como:** usuário copia um código no Safari e cola no aplicativo; share apenas onde houver destino compatível. **Vantagem:** reduz digitação. **Limitação:** gesto/permissão, conteúdo sobrescrito e ausência de destino PWA garantido. **Segurança:** clipboard não autentica; transferir só código efêmero, avisar que concede acesso, validar no servidor; não ler silenciosamente. **iOS:** API documenta restrições de gesto; colar manualmente é alternativa. **Android:** testar experiência, sem pressupor instalação como share target. **Conclusão:** facilitador de nível 2, não nível 1. [WebKit Clipboard](https://webkit.org/blog/10855/async-clipboard-api/), [Web Share W3C](https://www.w3.org/TR/web-share/)

### 4.8 Pairing por código

**Como:** Safari autorizado prepara X e código; pessoa abre o ícone e digita/cola; servidor resolve a autorização e emite B independente. **Vantagem:** transporte explícito entre contextos sem storage compartilhado. **Limitação:** uma interação e disponibilidade do contexto autorizado. **Segurança:** código é segredo temporário, sujeito a phishing e brute force; exige limites agregados e atomicidade. **iOS/Android:** usa formulário HTTPS comum, mas integração física ainda pendente. **Conclusão:** melhor nível 2. Não é senha permanente, OTP de contato nem comprovação de telefone.

## 5. Matriz de compatibilidade

A = comprovado no dispositivo/projeto; B = documentado, teste pendente; C = restrito; D = inadequado; E = não confiável como ponte. Classe não é certificação de segurança.

| Mecanismo | Android Chrome/PWA | iOS Safari/standalone | Automático? | Interação | Segurança | Vazamento | Storage comum? | Viabilidade | Teste físico? |
|---|---|---|---|---|---|---|---|---|---|
| Identidade local atual | A no Samsung informado | Ausente no 15.8.8 informado | Sim, se presente | Nenhuma | Validação tenant | Risco JS existente | Continuidade local | A Android | Não repetir Android agora |
| IndexedDB | C | C, não medido | Se contínuo | Nenhuma | Só marcador na prova | JS | Sim | C | Sim |
| CacheStorage | C | C, não medido | Se contínuo | Nenhuma | Nunca A/PII | Cache/JS | Sim | C diagnóstico | Sim |
| SW messaging | C | E como garantia | Condicional | Contextos ativos | Nonce/origem | Mensagem indevida | Mesma partição/clientes | C/E | Sim |
| BroadcastChannel/storage events | C | E como garantia | Condicional | Contextos ativos | Não autentica sozinho | JS/mensagens | Sim | C/E | Sim |
| Cookie X na instalação | C no contexto vazio | B no 17.2+; C no 15.8.8 | Candidato | Preparar/instalar | HttpOnly + consumo | Roubo/corrida | Cópia ou continuidade cookie, não localStorage | B/C | Sim |
| start_url fixo /acesso | A como baseline | A como baseline informado | Não transporta X | Nenhuma | Sem segredo | Baixo | Não | Manter | Não para baseline |
| Manifest/start_url dinâmico | C | C, especialmente 15.8.8 | Condicional | Instalar | Capability efêmera | Manifest/histórico/cache | Não | C; não escolhido | Sim se retomado |
| Launch URL | C | E como garantia | Não garante entrega | Abrir link | Depende do payload | Histórico/log | Não | C/E | Sim |
| Temporary bootstrap URL | C | C se recebida | Só após entrega | Link/handoff | Single-use/TTL | Elevado antes do consumo | Não | C | Sim |
| Redirect/opener/handoff | C | E como garantia | Não garantido | Navegação | Referências/origem | Destino errado | Não, mas precisa vínculo | C/E | Sim |
| Copy/paste/Web Share | C | C | Não | Copiar/colar/compartilhar | Código curto vivo | Clipboard/destinatário | Não | C, auxiliar | Sim |
| Pairing code | B como padrão web; integração pendente | B como padrão web; integração pendente | Não | Digitar/colar | Limites + transação | Código roubado/adivinhado | Não | Melhor nível 2 | Sim |
| Persistent bearer em URL/manifest/cache | D | D | Irrelevante | Irrelevante | Viola desenho | Alto | Irrelevante | Descartado | Não |

## 6. Melhor candidato para nível 1

Cookie X efêmero preparado antes da instalação, consumido apenas quando faltar credencial local. A cadeia proposta é concreta: resposta HTTPS com Set-Cookie → cópia de cookies pela plataforma ao instalar → cookie enviado pelo standalone → POST de consumo → B. **A cadeia ainda não foi demonstrada neste projeto.** Não há candidato suficientemente confiável para ser o único mecanismo no iOS 15.8.8.

Se todos os dados locais estiverem vazios, nenhum cookie tiver sido copiado e a URL fixa não contiver um canal de associação, o servidor não recebe informação que permita selecionar com segurança o X correto. Origin, IP, User-Agent e fingerprint não substituem esse segredo. Pairing fornece explicitamente essa informação.

## 7. Melhor candidato para nível 2

Safari: “Preparar acesso no aplicativo” → código agrupado → “Copiar código”. PWA vazia: “Concluir configuração” → digitar/colar → acesso. Não pedir telefone novamente. Confirmar o tenant após validação, sem expor dados ao consultar códigos inválidos.

Proposta inicial: 10 caracteres aleatórios de alfabeto com 32 símbolos legíveis (50 bits), agrupados 5–5, TTL de 5 minutos. Evitar escolher seis dígitos globais apenas por conveniência: com N autorizações simultâneas e q tentativas, a chance aproximada de acertar alguma é qN/10^6. O código precisa localizar X sem exigir que a PWA vazia saiba o tenant; isso é um índice temporário de autorização, não identidade global.

Guardar HMAC do código com segredo do servidor, impedir colisões entre códigos ativos, limitar preparação por A/tenant e tentativas por sessão de destino, origem de rede e serviço. Limite inicial de cinco tentativas por sessão é complementar: sessão/IP podem ser renovados, portanto não bastam sozinhos. Resposta genérica para inválido/expirado/revogado/consumido; não revelar cliente/tenant antes de validar. Dimensionar limites agregados antes de produção. Não contar uma tentativa inválida contra um X arbitrário nem permitir bloqueio de A por ataques ao pairing.

## 8. Nível 3

Somente integração futura: ausência de A utilizável, X e pairing válido → contato elegível → OTP → nova credencial. Definir depois elegibilidade, prova de contato, provider, custos e abuso. Nenhuma exigência de SMS no primeiro agendamento foi introduzida.

## 9. Segurança A + X → B

1. Preparação autenticada por A: servidor deriva tenant/cliente de A, não aceita esses vínculos fornecidos pelo browser como autoridade. Validar vínculo ativo, expiração e permissão de delegar. A origem atual da credencial precisa de revisão antes de delegação real: identificar por nome/telefone não é prova de posse de contato.
2. X aleatório com ao menos 128 bits (preferir 256), hash armazenado, finalidade exclusiva, emissor, criação/expiração, revogação/consumo. Código e cookie são apresentações alternativas ligadas à mesma autorização; consumir uma invalida a outra.
3. Revalidar A e vínculo no consumo; revogar X se emissor deixar de ser elegível. Não enviar A para o destinatário, cookie, SW ou manifest.
4. Uma transação valida e marca X consumido, insere exatamente um hash de B e mantém A intacta. Corridas entre cookie/código/replay devem resultar em um único vencedor. Locks somente em memória não provam atomicidade distribuída.
5. B novo, aleatório, tenant-scoped e independente. Não usar RPC de identificação que revoga tokens anteriores, nem emissão de link com revogação. Resposta sem cache e sem logs de segredo; gravar identidade local somente depois de sucesso.
6. Falha de rede após commit exige política explícita. Para primeira versão, rejeitar replay e preparar novo X usando A; não reemitir silenciosamente outra B. Uma futura entrega idempotente precisaria vínculo seguro com a requisição destinatária e prazo próprio.
7. Nenhuma atestação de dispositivo decorre de standalone/display-mode. X roubado pode ser consumido por terceiro; TTL, exposição mínima e consentimento reduzem, mas não eliminam esse risco.

Respostas objetivas: Q1 INCONCLUSIVO no iOS alvo, sem garantia universal; Q2 cookie/pairing dispensam localStorage comum; Q3 REQUER TESTE FÍSICO; Q4 caminho Android preservado por ausência de mudanças funcionais, integração futura exige regressão; Q5 nenhum A persistente deve ser transportado; Q6 cookie/handoff dependem de plataforma, nunca exclusivos; Q7 pairing necessário como fallback de projeto; Q8 credencial presente é menor fricção, seguida de cookie elegível e código copiável; Q9 manter a hierarquia do TXT.

## 10. Protótipo e limite de execução

Nenhum protótipo funcional foi criado ou publicado. Um modelo Node em memória provaria apenas regras implementadas pelo próprio modelo, não o transporte Safari→standalone que é a pergunta central. Não foi usado como evidência artificial.

Único arquivo criado nesta execução: este relatório. Nenhuma flag, rota, manifest, SW, banco ou configuração Railway foi alterada. Remoção: excluir somente este documento, se desejado.

**Ponto de parada da seção 23 do TXT:**

- Evidência: diagnóstico atual mede identidade local; não prepara cookie/código nem verifica X→B.
- Necessidade: para medir o transporte físico, publicar instrumentação DEV com autorização sintética, sem cliente/agendamento real.
- Impacto: novas rotas/botões DEV, cookie e marcadores temporários no staging; alteração de comportamento e novo deployment, ainda que reversíveis. Conferir Trial/créditos antes de qualquer publicação; não criar infraestrutura adicional.
- Alternativas: permanecer com evidência documental e pairing como candidato; ou autorizar prova isolada no staging existente. Não é necessário alterar banco para essa prova. Não publicar silenciosamente sob a autorização antiga de deployment.

Contrato proposto, **não implementado**: flag de servidor `R15_BOOTSTRAP_PROBE_ENABLED=false` por padrão, cumulativa com flag DEV existente; armazenamento sintético em memória, sem conexão com credenciais reais; namespace `r15-probe`; eventos booleanos e IDs opacos de execução, nunca segredos. Reinício perde autorizações; com múltiplas instâncias resultados negativos seriam inconclusivos. Limpeza deve expirar cookie e remover só esse namespace em cada contexto. Prova de transporte não certifica segurança/atomicidade de produção.

## 11. Testes

PowerShell, na raiz do repositório:

```powershell
$pwaTests = @(Get-ChildItem -LiteralPath frontend/src/components/pwa -Filter '*.test.js' | ForEach-Object { $_.FullName })
node --test frontend/src/lib/pwa-manifest.test.js frontend/src/components/recurring-access/RecurringAccessPage.diagnostics.test.js @pwaTests
```

Resultado nesta execução: **39 testes, 39 aprovados, 0 falhas**. Cobrem manifest/ícones, instalação, registro do SW, snapshots e link DEV. A primeira chamada com wildcard literal falhou na descoberta de arquivos no Windows; foi corrigida pela enumeração PowerShell acima. Não houve falha de teste nessa chamada inicial, pois nenhum teste foi executado.

Não foram executados build completo, teste de transferência física, atomicidade SQL, gates de novo deployment ou chamada que emitisse B. A única mudança é documental; esses testes existentes são controle de baseline, não prova do candidato.

## 12. Roteiro físico específico

### Controle disponível agora — sem modificar instalação

1. No Safari do iPhone informado, abrir `https://pwa-staging-production.up.railway.app/pwa-diagnostics` e registrar somente o relatório sanitizado: contexto, storage disponível/legível, presença/contagens, controle SW e versão do SO.
2. Abrir o ícone existente → `/acesso` → link DEV de diagnóstico. Confirmar standalone e comparar contagens. Não apagar ícone, dados Safari ou identidade.
3. Se houver credencial local válida, não forçar estado vazio e não executar bootstrap. A ausência de diagnóstico DEV deve ser registrada, não contornada com mudança de ambiente.

### Pré-condição dos testes seguintes

**As rotas e botões abaixo são proposta, NÃO estão publicados. Não tentar executá-los como se existissem.** Antes deles, aprovar a instrumentação descrita na seção 10, implementar/testar/publicar no staging existente e registrar a versão. Sem essa etapa, os testes de transporte permanecem pendentes.

URL proposta única: `https://pwa-staging-production.up.railway.app/pwa-diagnostics/r15`. Ela deve ser acessível pelo painel dentro do standalone, sem abrir Safari. Deve mostrar “PROTÓTIPO — identidade sintética”, contexto, run opaco, método, presença/consumo e validade de A/B sintéticos, sem valores secretos. Não escrever nas chaves funcionais `esthya:*`.

### Candidato cookie — iOS 15.8.8 e, separadamente, iOS 17.2+

1. URL: abrir a rota proposta acima no Safari, após publicação autorizada.
2. Estado: contexto browser; identidade real existente intacta; usar exclusivamente A sintético da prova. Registrar se já há instalação. Não usar o ícone existente para concluir sobre cópia durante uma nova instalação.
3. Tocar “Preparar cookie de teste”: servidor emite X sintético curto HttpOnly; painel mostra `bootstrapPrepared=true` e tempo restante, sem segredo.
4. Instalar pela folha Compartilhar → Adicionar à Tela de Início **em dispositivo de teste sem instalação útil preexistente**. Preservar o aparelho/ícone de uso atual. Um segundo ícone no mesmo aparelho pode reutilizar contexto: se usado, registrar essa incerteza, sem classificar como instalação limpa. Se só houver aparelho com instalação útil, adiar esta variante; não limpar dados.
5. Abrir pelo novo ícone dentro do TTL. Baseline continua `/acesso`; entrar no painel e na rota DEV por navegação interna. A prova instrumentada consulta cookie automaticamente dentro do painel; isso mede transporte, ainda não UX final automática em `/acesso`.
6. Observar `executionContext=standalone`, `bootstrapDetected`, `bootstrapConsumed`, `credentialContextCreated`; registrar indisponibilidade/expiração sem inferir sucesso pela presença de cookie no Safari.
7. Esperado candidato: cookie recebido e uma B sintética emitida. Resultado negativo no 15.8.8 não é surpreendente; distinguir expiração, instalação reutilizada e reinício do servidor de isolamento.
8. Confirmar B pelo endpoint sintético de validação e igualdade de escopo, com identificador opaco diferente de A. Repetir consumo deve falhar; reabrir deve manter B sintética se o storage local a preservou.
9. Voltar ao Safari e validar A sintético novamente; resultado deve continuar válido. Dados funcionais permanecem intactos. Isso não prova credenciais reais A/B; essa validação pertence à R2 autorizada.
10. “Limpar somente esta prova” em ambos os contextos: expirar cookie `r15-probe`, revogar run em memória e remover chaves sintéticas. Não `localStorage.clear()`, não excluir caches gerais, não unregister SW. Repetir cópia de instalação requer outro contexto de instalação controlado; recriar X no Safari não sincroniza um ícone já instalado.

### Candidato pairing — pode usar o standalone vazio já instalado

1. URL: mesma rota proposta no Safari.
2. Estado: browser com A sintético válido; credencial real preservada.
3. “Preparar código de teste”: gerar código temporário e mostrar botão Copiar. Não incluir código no relatório ou screenshots compartilhados.
4. Se o ícone já existe, não reinstalar. Caso contrário, instalar normalmente, sem depender de cookie.
5. Abrir ícone → diagnóstico DEV → rota proposta. Confirmar standalone e namespace sintético vazio.
6. Observar `pairingRequired`; colar por ação explícita ou digitar o código. Testar entrada manual mesmo se Clipboard API não estiver disponível.
7. Esperado: consumo único e `credentialContextCreated=true`, sem contato/SMS e sem copiar A.
8. Validar B sintético por backend, escopo igual, identificador diferente; repetir código deve falhar. Ensaiar expirado, revogado, escopo adulterado e duas submissões simultâneas. Memória de um processo não demonstra atomicidade de produção.
9. No Safari, validar A sintético ainda ativo; não executar endpoints reais que revoguem tokens ou emitam identidade por telefone.
10. Limpar só run/chaves sintéticas nos dois contextos. Não limpar clipboard automaticamente, pois pode conter conteúdo novo do usuário; informar que o código expirou.

### Exploração de storages/SW — hipótese secundária, não autenticação

Na mesma rota futura, “Preparar marcadores” grava apenas nonces diagnósticos em localStorage, IDB e CacheStorage, além de cookie separado. Após abrir o ícone, “Verificar marcadores” retorna presença/igualdade booleana. Nunca usar A. Para SW, instrumentação adicional autorizada deve medir resposta a desafio e visibilidade de cliente, com ambas as janelas abertas e depois Safari encerrado. Registrar ativação do SW: sua limpeza atual de caches pode invalidar a prova de CacheStorage. Não modificar essa política apenas para produzir resultado positivo. Limpar somente registros/cache `r15-probe` e mensagens transitórias. Não há B nesse teste, apenas descoberta de canal.

Manifest dinâmico e URL temporária não foram selecionados para prova nesta rodada. Se retomados, precisam de experimento separado que registre URL realmente lançada, versão/cache do manifest, reabertura após TTL, reinstalação controlada e identidade única da PWA; não basta navegar manualmente a uma URL e chamar isso de instalação automática.

### Android

Não repetir instalação física agora. Quando a instrumentação estiver autorizada e o usuário liberar nova rodada, aplicar os mesmos roteiros apenas em contexto sintético vazio separado. No Samsung já validado, controle mínimo: abrir ícone e observar acesso existente; nenhuma limpeza nem preparação de X quando A local for válida. A etapa atual não executou esse controle físico.

## 13. Impacto na R2

Reformular o primeiro acesso como resolução por capacidade, não por sistema operacional: validar local primeiro; tentar X somente se disponível; pairing explícito quando não houver canal; recovery separado. Especificar emissão aditiva, autoridade de A, autorização temporária, limites e consumo transacional. Não introduzir `iOS = OTP`.

Separar prova de transporte da implementação segura. R2 só deve tratar cookie como otimização após resultado físico por versão; pairing permanece alternativa independente. A infraestrutura de identidade existente precisa revisão dos caminhos que emitem/revogam credenciais antes de delegação real. Nenhuma dessas mudanças foi implementada.

## 14. Backlog separado

| Frente | Próximo trabalho |
|---|---|
| R2 | Decisão pós-teste, autoridade de A, X tenant/client/purpose-scoped, código, emissão B aditiva, revogação e transação concorrente |
| R3 | UX preparar/copiar/concluir, tenant correto, expiração e nova tentativa; acessibilidade e mensagens |
| OTP/provider real | Elegibilidade de contato, prova, orçamento/provider, abuso; somente recovery |
| Hardening | Rate limits distribuídos, HMAC/rotação, CSRF/XSS, logs sem segredos, replay, falha após commit e revisão de permissões de emissão |
| Multiplatform | Teste iOS 15.8.8 e recente, Android vazio em separado, instalação/reabertura/TTL/armazenamento indisponível |
| Produção | Autorização própria, configuração segura, observabilidade sanitizada, rollback, auditoria de custos e remoção de instrumentos DEV |

## 15. Status final

**FASE 0.6B — R1.5 ANÁLISE TÉCNICA CONCLUÍDA — TESTE FÍSICO NECESSÁRIO ANTES DA R2.**

A conclusão é análise concluída com transporte ainda não comprovado no dispositivo-alvo. Não equivale a bootstrap implementado, staging atualizado ou autorização para iniciar R2.
