# R1.6-B — Implementação do acesso PWA tenant-first simplificado

> Complemento posterior: [correção dos achados do gate de migrations](20260918-r1-6-b-correcao-gate-migrations.md). Atribuição transacional restaurada; 242 testes e oito cenários Chrome aprovados. Esse complemento contém o estado atual da migration 2, seu rollback e a análise dirigida de RLS.

Relatório encerrado em 2026-09-18. Base: `20260917-r1-6-acesso-pwa-simplificado.md` e TXT “Aplicar via CODEX”. Escopo exclusivamente local.

## 1. STATUS

**FASE 0.6B — R1.6-B IMPLEMENTAÇÃO LOCAL DO ACESSO PWA TENANT-FIRST SIMPLIFICADO CONCLUÍDA — AGUARDANDO AUTORIZAÇÃO PARA ALTERAÇÕES REMOTAS E VALIDAÇÃO EM STAGING.**

A versão seguinte do TXT resolveu expressamente a divergência funcional. A decisão agora conta clientes elegíveis pelo telefone normalizado dentro do tenant antes de comparar nascimento: nenhum telefone existente permite novo cadastro; um cliente exige nascimento existente e exato; mais de um cliente elegível bloqueia por ambiguidade, mesmo que somente um nascimento coincida. A proteção anterior contra recriação de cadastros inelegíveis foi preservada.

Nascimento divergente gera internamente PHONE_EXISTS_BIRTHDATE_MISMATCH; NULL gera PHONE_EXISTS_BIRTHDATE_MISSING; duplicidade gera AMBIGUOUS_CLIENT_MATCH. Externamente todos usam a mesma mensagem, status e código genéricos. Nenhum desses casos cria cadastro, altera nascimento ou emite TC.

A descoberta consulta telefone antes de avaliar a cardinalidade por tenant, impedindo que o filtro antecipado de nascimento oculte duplicatas. Nascimento divergente/NULL não autoriza o tenant; ambiguidade mantém a resposta genérica sem emissão. C0/C1/CN e revalidação da escolha foram preservados.

## 2. RESUMO DO QUE FOI IMPLEMENTADO

Identificação pública por telefone BR normalizado dentro do tenant, com cardinalidade verificada antes da comparação da data civil completa; emissão aditiva; remoção do reconhecimento silencioso por telefone; descoberta mínima de estabelecimentos somente no estado sem referência local; proteção de ambiguidade, elegibilidade e perfil compartilhado; agendamentos pessoais restritos ao cliente autorizado. Migrações preparadas e testadas localmente, sem aplicação remota.

## 3. FLUXO FINAL

- TC válido → resolveToken → mesmo tenant/cliente → fluxo existente, sem nascimento obrigatório ou emissão de novo TC.
- TC ausente/inválido + tenant conhecido → `/agendar/[slug]` → formulário normal com nome, e-mail, telefone e nascimento → backend decide existente/novo/bloqueado.
- PWA sem referência → “Localizar meu acesso”, apenas telefone+nascimento. C0 retorna orientação genérica sem cadastro/TC. C1 revalida e emite TC. CN mostra somente slug/nome público dos estabelecimentos; escolha repete POST e revalida antes da emissão.
- Storage indisponível não é tratado como PWA vazia. Identidades órfãs permitem recuperar referências de slug pelas chaves existentes.

## 4. BACKEND — ARQUIVOS DESTA IMPLEMENTAÇÃO

| Arquivo | Alteração |
| --- | --- |
| `backend/src/modules/public-booking/identity-policy.js` | Normalização do par, validação de data, elegibilidade, erro genérico e diagnóstico sanitizado. |
| `backend/src/modules/public-booking/identity-rate-limit.js` | Limite compartilhado pelos caminhos públicos, no-store e chaves HMAC sem PII bruta. |
| `backend/src/modules/public-booking/client-identity.repository.js` | Nova RPC transacional, descoberta de relacionamentos/links elegíveis e verificação de compartilhamento entre tenants. |
| `backend/src/modules/public-booking/client-identity.service.js` | Política única, TC aditivo, descoberta, cliente exato em upcoming e proteção de escrita compartilhada. |
| `backend/src/modules/public-booking/public-booking.repository.js` | Consulta de flags necessárias à elegibilidade do tenant. |
| `backend/src/modules/public-booking/public-booking.service.js` | Descoberta C0/C1/CN e identificação obrigatória no agendamento público sem TC. |
| `backend/src/modules/public-booking/public-booking.validators.js` | Nascimento obrigatório no caminho sem TC; TC tem precedência sobre dados enviados; schema de descoberta. |
| `backend/src/modules/public-booking/public-booking.controller.js` | Controlador da descoberta. |
| `backend/src/routes/public.routes.js` | Rota de descoberta, rate limit e no-store. |
| `backend/src/utils/normalize.js` | BR, DDD 55, rejeição de caracteres/dígitos excedentes, sem truncamento. |
| `backend/package.json`, `backend/package-lock.json` | PGlite como dependência de desenvolvimento para testes SQL locais. |

Endpoints: novo `POST /public/booking/access/locate`; alterados `POST /public/booking/:slug/identity` e `POST /public/booking/:slug/appointments`, com alias `/api` conforme montagem existente. Leitura de próximos agendamentos passa a usar somente o cliente do TC.

Nome/e-mail enviados na recuperação não sobrescrevem cadastro. Data NULL não corresponde e não é preenchida por usuário não identificado. Perfil separado mantém consentimento tenant-scoped; quando cliente base é compartilhado, alterações públicas dos campos base são bloqueadas. Valores inalterados enviados pelo formulário são ignorados, permitindo atualizar consentimento sem escrever no cliente compartilhado.

Rate limit por processo: 5 tentativas por par, 30 por IP e 300 agregadas, em janela de 15 minutos. Descoberta e escolha CN consomem tentativas. Reinício zera contadores; múltiplas instâncias exigiriam coordenação futura. Credenciais apresentadas seguem validação de TC no serviço; um campo `token` arbitrário na raiz de appointments não desativa o limite.

## 5. FRONTEND — ARQUIVOS DESTA IMPLEMENTAÇÃO

| Arquivo | Alteração |
| --- | --- |
| `frontend/src/components/public-booking/PublicBookingPage.tsx` | Campo nascimento no fallback, remoção do debounce de identificação e reutilização dos dados reconhecidos. |
| `frontend/src/components/recurring-access/LocateAccess.tsx` | Formulário de descoberta, C0/C1/CN, escolha e persistência apenas de tenant/TC. |
| `frontend/src/components/recurring-access/RecurringAccessPage.tsx` | Fallback somente quando vazio; preserva caminho recorrente e diferencia storage indisponível. |
| `frontend/src/lib/recurring-access.storage.ts` | Recupera slug de identidade órfã mantendo chaves e formato existentes. |
| `frontend/src/services/public-booking.service.ts` | Tipos com nascimento e POST de descoberta. |
| `frontend/src/utils/phone.ts` | DDD 55 e validação sem truncamento silencioso. |

Não há seleção “já sou cliente/primeiro agendamento”. Dados de recuperação não são enviados em URL nem persistidos em storage. Não foi criada regra por sistema operacional.

## 6. TOKEN

Emissão de recuperação é aditiva: token aleatório de 32 bytes, hash SHA-256 no banco, tipo e TTL existentes. TC anterior permanece válido; teste específico cobre resolução do token anterior após recuperação. Nova RPC não revoga tokens. `issueClientLink` administrativo autenticado ainda tem revogação coletiva; não é utilizado pela recuperação pública.

## 7. LOOKUP

Existe caminho público Node que emita TC somente por telefone? **Não na implementação local.** O lookup legado passa pela política de nascimento; appointments não reutiliza cliente silenciosamente por telefone. O helper legado de RPC permanece no repository, sem chamada no fluxo público novo.

A correção remota ainda não está ativa: a ACL da RPC antiga identificada na auditoria precisa receber a migration antes de considerar o ambiente remoto protegido. Não confundir código local corrigido com staging corrigido.

## 8. UPCOMING

Operações pessoais ainda expandem cliente por telefone? **Não no caminho corrigido.** `listRelatedClientIdsForAppointment` retorna apenas `[cliente_id]` autorizado. Testes cobrem IDs diferentes com o mesmo telefone, sem união de horários.

## 9. RPC E MIGRATIONS

- `supabase/migrations/20260917100000_restrict_public_booking_identity_rpc.sql`: revoga execução de todas as sobrecargas antigas para PUBLIC, anon e authenticated; concede a service_role.
- `supabase/migrations/20260917101000_public_booking_identity_birth.sql`: nova RPC restrita a service_role, com seleção elegível, bloqueio de ambiguidade, criação e emissão numa transação. Advisory lock por tenant/telefone e locks de registros protegem as chamadas desse caminho. Não cria coluna nem UNIQUE global de telefone.

Ambas foram reaplicadas nos testes locais para verificar idempotência e ACL real no PostgreSQL embarcado. **Não aplicadas remotamente.** Em etapa futura autorizada, revisar primeiro a lista inteira de migrations pendentes; `supabase db push --dry-run` permite conferir o conjunto e `supabase db push` aplicaria as pendências aprovadas. Não executar o segundo comando indiscriminadamente: há outras migrations preexistentes no diretório. Nenhum desses comandos foi executado nesta implementação.

## 10. MASSA DE TESTES

`backend/scripts/campaign-test-data-v3.js` reutilizava telefone inválido constante `119` em cenários distintos, produzindo colisões na massa. Novo `backend/scripts/campaign-test-phone.js` gera telefone válido por ordinal sem corte de dígitos e identificador inválido distinto por ordinal para fixtures deliberadamente inválidas. O seed verifica colisão no mesmo tenant antes de atualizar/criar. Nenhuma constraint global ou merge entre tenants.

Fixtures explícitas de ambiguidade, NULL, cliente/vínculo inativo e tenant/link inelegível permanecem nos testes SQL. Nenhum seed foi executado.

Para corrigir a massa remota futuramente: inventariar os registros com metadata de origem deste seed e cenários inválidos, selecionar seus IDs exatos, corrigir apenas `clientes.telefone` para valores distintos correspondentes ao ordinal e conferir colisões por tenant. Preservar `data_nascimento` NULL e fixtures excepcionais controladas; não alterar clientes reais, IDs, vínculos ou tokens e não rodar o seed completo como cleanup. A lista de IDs/valores e a autorização deverão ser preparadas antes de qualquer UPDATE. A implementação atual corrige novas gerações, não saneia dados já existentes.

## 11. TESTES

Resultado final da suíte relacionada: **152 testes, 152 aprovados, zero falhas**, seis suítes. Comando PowerShell na raiz, usando apenas credenciais fictícias locais:

```powershell
$env:SUPABASE_URL='http://127.0.0.1:1'
$env:SUPABASE_ANON_KEY='local-test-anon'
$env:SUPABASE_SERVICE_ROLE_KEY='local-test-service'
$tests = @(Get-ChildItem backend/src/modules/public-booking,backend/src/modules/clients,backend/src/modules/agenda,backend/src/modules/agenda/domain,frontend/src/components/recurring-access,frontend/src/components/pwa -Filter '*.test.js' | ForEach-Object { $_.FullName })
node --test @tests frontend/src/lib/recurring-access.storage.test.js frontend/src/lib/pwa-manifest.test.js frontend/src/lib/session-id.test.js
```

Testes criados: `identity-policy.test.js`, `identity-migration.test.js`, `access-discovery.test.js` em public-booking e `RecurringAccessPage.access.test.js` no frontend. Atualizado `client-identity.service.test.js`. Cobrem os grupos dos 36 casos pedidos: TC/tenant, recuperação/aditividade, data errada/NULL, ambiguidade, perfil sem sobrescrita, criação com nascimento, bypass em identity/appointments, upcoming exato, C0/C1/CN e escolha adulterada, elegibilidade, limites, resposta genérica, normalização e privacidade/storage.

Outras verificações executadas:

| Comando/verificação | Resultado |
| --- | --- |
| `node frontend/node_modules/typescript/bin/tsc --noEmit --incremental false -p frontend/tsconfig.json` | Aprovado. |
| `npm.cmd run build` em frontend | Aprovado, 44 páginas. |
| `node frontend/scripts/pwa-access-local-check.cjs` com PLAYWRIGHT_CORE_PATH local e Next em 127.0.0.1:3017 | 8 cenários aprovados em Chrome headless. |
| `git diff --check` | Sem erros de whitespace. |

O teste de navegador usa APIs interceptadas, bloqueia tráfego externo e Service Worker; verifica TC salvo/reload, ausência de nascimento com TC, tenant sem TC, ausência de lookup ao digitar e C0/C1/CN. Não é integração com Supabase/Railway nem instalação física. Servidor local encerrado ao final.

SQL foi executado em PGlite em memória, com schema mínimo das tabelas necessárias, funções reais das migrations e roles. Testa rollback e chamadas concorrentes enfileiradas numa conexão; não comprova disputa entre múltiplas conexões do PostgreSQL remoto nem escritores administrativos que não adotem o mesmo advisory lock.

### VALIDAÇÃO DE NÃO REGRESSÃO — ANDROID

Os arquivos compartilhados alterados estão listados nas seções 4/5. RecurringAccessPage prioriza referência local; storage mantém formato e recupera referência órfã; PublicBookingPage e serviço mantêm TC como primeira opção; backend resolve o mesmo tenant/cliente e não exige nascimento com TC válido. A alteração de upcoming restringe o resultado ao cliente autenticado.

Testes de inicialização/remontagem com localStorage, TC válido, próximos horários e ausência da tela de localização/formulário obrigatório passaram. O teste de navegador também cobre reload preservando TC. Isso representa o baseline por testes locais; não substitui validação física Android.

- Manifest alterado nesta R1.6-B: **NÃO**.
- Service Worker alterado nesta R1.6-B: **NÃO**.
- start_url alterado nesta R1.6-B: **NÃO**.
- Storage incompatível alterado: **NÃO**.
- TC válido exige reidentificação: **NÃO**.
- Instalação/ícones/branding alterados nesta R1.6-B: **NÃO**.

O git já continha alterações anteriores de manifest, SW e instalação; não foram produzidas nesta implementação.

## 12. PENDÊNCIAS E RISCOS

**Antes de staging:** revisar/aprovar aplicação das duas migrations, especialmente ACL antiga; conferir compatibilidade com schema remoto completo e disputa entre conexões; preparar correção pontual da massa; autorizar deployment em etapa separada. Código Node novo depende da nova RPC, portanto não publicar antes dela.

**Para teste físico:** após staging autorizado, repetir gates HTTPS/API/CORS/chunks/health/PWA diagnostics e validar os fluxos em dispositivos conforme autorização específica. Nenhum teste físico realizado nesta fase.

**Backlog futuro:** autenticação mais forte, coordenação de rate limit se houver múltiplas instâncias, governança de perfil compartilhado. Telefone+nascimento é o fator solicitado, não prova de posse do número. Bootstrap/pairing/OTP/conta global permanecem fora do escopo.

## 13. BANCO REMOTO

Nenhuma mutação remota executada. Nenhuma migration, INSERT, UPDATE, DELETE, seed ou cleanup remoto. Os números de massa usados como contexto pertencem à auditoria anterior; não foram reconsultados nesta implementação.

## 14. DEPLOY

Nenhum deployment executado. Nenhuma alteração de Railway, variáveis remotas, plano ou recursos. A proibição do TXT atual governa esta etapa, apesar da autorização histórica de staging.

## 15. GIT

Nenhum commit. Nenhum push. `git status --short` exibido ao encerrar. O workspace já possuía numerosas alterações de tarefas anteriores; não foram descartadas nem atribuídas a esta fase. O inventário desta fase está nas seções 4/5/9/10/11, acrescido deste relatório. Não considerar todo o diff contra HEAD como sendo R1.6-B.

## Complemento — decisão funcional aplicada em 2026-09-18

Alterações desta continuação limitadas a `client-identity.repository.js`, `client-identity.service.js`, `identity-migration.test.js`, `access-discovery.test.js`, migration local `20260917101000_public_booking_identity_birth.sql` e este relatório. A migration de ACL e o gerador permanecem preservados.

Foram adicionados cinco testes: duas fixtures SQL de telefone duplicado com nascimento diferente/NULL; descoberta contando duplicatas antes de nascimento; exclusão de nascimento diferente/NULL preservando tenant independente elegível; igualdade de erros públicos com códigos internos sanitizados. Ajustados os testes existentes para conferir os novos motivos e nascimento NULL sem atualização. Suíte completa novamente aprovada: 152/152. TypeScript e build novamente executados nesta continuação.

| Critério final | Resultado |
| --- | --- |
| Telefone inexistente → novo cliente | SIM |
| Telefone+nascimento corretos → cliente existente (telefone único elegível no tenant) | SIM |
| Telefone existente+nascimento incorreto cria cliente | NÃO |
| Telefone existente+nascimento NULL cria cliente | NÃO |
| Ambiguidade escolhe primeiro registro | NÃO |
| TC anterior é preservado | SIM |
| TC válido continua sem reidentificação | SIM |
| Manifest alterado nesta continuação | NÃO |
| Service Worker alterado nesta continuação | NÃO |
| start_url alterado | NÃO |
| Storage incompatível alterado | NÃO |
| Migration remota aplicada | NÃO |
| Deploy executado | NÃO |
| Commit/push executado | NÃO |

Nesta continuação, o build terminou com sucesso (44 páginas) e os oito cenários do script de navegador foram reexecutados: 8/8 aprovados, API simulada, rede externa bloqueada. Servidor local encerrado após a verificação. Nenhuma auditoria ampla reaberta, nenhum teste físico e nenhuma alteração remota. Limitações dos testes locais e pendências de autorização descritas acima continuam válidas.
