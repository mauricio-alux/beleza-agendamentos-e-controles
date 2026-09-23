# Resultado do staging Railway em 14 de setembro de 2026

FASE 0.6B — DEV HTTPS REAL PUBLICADO COM BLOQUEIO — prefetch de /cadastro retorna 404; identidade completa não validada por restrição de escrita no banco.

## Railway e custos

- Projeto: pwa-dev-staging (645d7750-d32a-4313-83ee-503e21082fec).
- Serviço único: pwa-staging (70734c21-172a-4612-8f25-23026fdff0de).
- Ambiente Railway: production, nome padrão criado pelo provider; finalidade exclusiva DEV/STAGING com Supabase DEV existente.
- URL: https://pwa-staging-production.up.railway.app
- Deployment aprovado pelo provider: ce59e7bb-e1b5-46f7-8b81-559783449d0b, SUCCESS.
- Uma réplica, sleepApplication=false, sem volume, banco Railway, domínio próprio ou alteração DNS.
- Trial confirmado ativo. Consulta após deploy: consumo US$ 0.000466031419691358; saldo US$ 4.999533968580309; crédito inicial US$ 5; 30 dias indicados pelo provider. Valores sujeitos a atraso de contabilização e consumo enquanto o serviço estiver ligado.
- isUsageSubscriber=false; subscriptions=[]; nenhum plano pago contratado e nenhum cartão cadastrado nesta execução.

## Arquitetura e variáveis

Gateway supervisionado em PORT=8080; Next.js em 127.0.0.1:3000; Express em 127.0.0.1:3001. /api é encaminhado preservando o prefixo. Loopback é interno ao contêiner, não uma dependência do computador do usuário.

Health /_staging/health consulta os dois processos. Falha de um filho encerra o conjunto; gateway participa da supervisão. Provider: ON_FAILURE, cinco tentativas, healthcheck timeout 300 segundos. Schedulers desligados; WhatsApp dry-run ligado e Cloud API desligada.

Públicas: NEXT_PUBLIC_APP_URL, NEXT_PUBLIC_APP_NAME, APP_URL, PORT, NEXT_PUBLIC_DEV_PWA_DIAGNOSTICS=true e RAILWAY_DOCKERFILE_PATH=deploy/staging/Dockerfile. Branding lido da configuração local e fornecido por env; sem marca hardcoded na infraestrutura.

Backend: SUPABASE_URL, SUPABASE_ANON_KEY e SUPABASE_SERVICE_ROLE_KEY configuradas via stdin no provider. Valores não incluídos neste relatório, no Git ou no snapshot. Frontend recebe somente variáveis públicas pelo launcher. Nenhum secret WhatsApp foi enviado. Variáveis secretas não são declaradas como ARG no Dockerfile.

## Recursos públicos no navegador limpo

Base de todas as URLs: https://pwa-staging-production.up.railway.app

| Caminho da URL | credentials | status | Content-Type | redirect | isHtml | ok |
|---|---|---:|---|---|---|---|
| /manifest.webmanifest | include | 200 | application/manifest+json | false | false | true |
| /manifest.webmanifest | omit | 200 | application/manifest+json | false | false | true |
| /sw.js | include | 200 | application/javascript; charset=UTF-8 | false | false | true |
| /sw.js | omit | 200 | application/javascript; charset=UTF-8 | false | false | true |
| /icons/pwa-icon-192.png | include | 200 | image/png | false | false | true |
| /icons/pwa-icon-192.png | omit | 200 | image/png | false | false | true |
| /icons/pwa-icon-512.png | include | 200 | image/png | false | false | true |
| /icons/pwa-icon-512.png | omit | 200 | image/png | false | false | true |
| /icons/maskable-icon-512.png | include | 200 | image/png | false | false | true |
| /icons/maskable-icon-512.png | omit | 200 | image/png | false | false | true |

Navegador novo, cookiesPresent=0; nenhum interstitial, login, confirmação manual ou bypass de certificado. TLS 1.3, certificado *.up.railway.app emitido por YE1 e aceito pelo Chrome com ignoreHTTPSErrors=false.

Manifest: nome e short_name provenientes da env; start_url=/acesso; scope=/; display=standalone; sem id; os três ícones existentes preservados.

SW: registro existente, scope=https://pwa-staging-production.up.railway.app/, active=activated, controller=https://pwa-staging-production.up.railway.app/sw.js. MIME correto, HTTPS, sem redirect ou HTML. Nenhum SW, ícone ou manifest funcional foi alterado.

## Rotas e API

| Rota | Resultado |
|---|---|
| / | 200 HTML, sem redirect |
| /acesso | 200 HTML, sem redirect |
| /agendar/bellory-test-studio | 200 HTML, sem redirect |
| /pwa-diagnostics | 200 HTML, sem redirect |
| /_staging/health | 200 JSON, gateway/frontend/backend/ready=true |
| /api/public/health | 200 JSON |
| /api/public/booking/bellory-test-studio | 200 JSON, catálogo real do Supabase DEV |
| /api/public/booking/bellory-test-studio/availability | 200 JSON, combinação pública compatível, data 2026-09-15 |
| /cadastro | 404 durante prefetch da landing; bloqueado pela allowlist preparada |

API usa /api na mesma origin. Respostas de backend apresentam Access-Control-Allow-Origin: *. Não houve erro CORS independente identificado nos GETs reais. Não foram exercitados endpoints de escrita.

Smoke HTTP: PASS, 24 requisições e 16 chunks corretos. Browser: zero pageErrors, sem ChunkLoadError observado, sem mixed content ou URLs obsoletas nos recursos examinados. Gate geral FAIL: um 404 em /cadastro, dois erros de console e duas requisições falhadas (cadastro e identidade bloqueada pelo runner).

Ao abrir booking, o frontend faz POST /identity automaticamente. A implementação registra evento de acesso no banco mesmo sem cliente/token. O runner abortou essa chamada antes de enviá-la: blockedWrites=1. Seu ERR_FAILED é induzido pelo teste de somente leitura; não comprova falha de backend/CORS. Não foi usado mock para declarar integração real aprovada. Reconhecimento, gravação de identidade e criação de agendamento permanecem não validados nesta execução.

## Validação local e Git

27 testes PWA e nove testes de infraestrutura aprovados nesta retomada, antes da publicação. TypeScript --noEmit --incremental false e build Next local em cópia sem .env aprovados; build Linux Docker também aprovado no Railway, com 44 páginas estáticas. Sintaxe dos verificadores validada. git diff --check aprovado.

Arquivos ajustados nesta retomada: deploy/staging/browser-check.cjs, smoke.cjs, railway.json, Dockerfile, Dockerfile.dockerignore; relatório POST-DEPLOY.md e atualização do README.md. Nos três arquivos de empacotamento, foi removido BOM UTF-8 para compatibilidade com o provider. Nenhuma alteração no código funcional. Mudanças preexistentes de frontend/backend/documentação foram preservadas.

Histórico de deployment: primeira tentativa rejeitada por BOM em railway.json; segunda selecionou Railpack; terceira, com caminho Dockerfile explícito no provider e healthcheck configurado, SUCCESS. Não depender apenas do arquivo railway.json para reproduzir a configuração: definir RAILWAY_DOCKERFILE_PATH e conferir configurações efetivas do serviço.

Zero comandos de migration, seed, cleanup ou alteração de schema. Nenhuma escrita DB pelos testes. Sem commit e sem push Git; upload pelo Railway CLI não é push Git. Sem instalação física Android, sem atualização Chrome. Não se declara PWA corrigida nem instalação Android resolvida.

## Pendência para revisão

Decidir o tratamento da navegação/prefetch para /cadastro, fora da allowlist original, e como validar identificação respeitando a proibição de escrita no banco. O staging permanece publicado no mesmo hostname para revisão. A aprovação para teste físico Android permanece pendente.