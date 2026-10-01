# Estado atual — RD-H10 / 30 de setembro de 2026

Último deploy RD-H9.2: `0489cdb0-d5c9-4ce0-9eb5-97746d21b0b9`, SUCCESS,
projeto `pwa-dev-staging`, serviço `pwa-staging`, ambiente interno `production`
exclusivo de DEV/STAGING. GET `/login`, `/dashboard`, `/app`: HTTP 200.
Consolidação e passes físicos: [Current State](../../docs/current-state.md).
Manifest vigente: `/manifest.webmanifest`, id `/acesso`, start_url `/app`,
scope `/`, display `standalone`; SW global `/sw.js`.
Nenhum novo deploy realizado na RD-H10. Os registros abaixo são históricos.

# Histórico — 14 de setembro de 2026

Staging publicado no Railway. Deployment SUCCESS; gate geral com bloqueio de revisão. Resultado completo, custos e limitações em [POST-DEPLOY.md](POST-DEPLOY.md).

URL: https://pwa-staging-production.up.railway.app

As seções abaixo preservam o histórico de preparação de 13/09 e não representam o estado atual de autorização/publicação. Configurar RAILWAY_DOCKERFILE_PATH=deploy/staging/Dockerfile e conferir healthcheck /_staging/health no serviço; esses parâmetros foram explicitamente aplicados ao provider.

# DEV/STAGING HTTPS real — preparação, ainda não publicado

## Decisão proposta

Railway, um serviço Docker com HTTPS do provider e hostname gerado estável enquanto serviço/domínio forem mantidos. Não é túnel. Next.js e Express continuam processos Node separados internamente (3000/3001); gateway de infraestrutura escuta PORT e encaminha /api ao Express. Supabase remoto permanece o mesmo ambiente DEV autorizado. Sem disco de banco local, sem migration, sem conversão serverless. A unidade de rollback é o contêiner inteiro; tradeoff: falha de um processo reinicia ambos. A regra de exposição pública segue o proxy já usado, incluindo slugs dinâmicos e chunks [slug], sem allowlist de tenants.

Não publicado: nenhuma conta/plano/serviço foi selecionado pelo usuário, nenhuma contratação ou autorização explícita de publicação foi recebida nesta tarefa. Sem URL frontend/backend nova. Não considerar o ambiente pronto antes dos gates externos.

## Comparação consultada em 13/09/2026

| Modelo | Frontend/backend | HTTPS e hostname | Persistência e cold start | Custo/cartão e configuração | Impacto/risco PWA |
| --- | --- | --- | --- | --- | --- |
| Railway Docker — recomendado | Next server + Express, mesma imagem/gateway | TLS gerenciado e domínio próprio do provider | Serviço/domínio persistem; disco efêmero, DB Supabase; desabilitar serverless/sleep | Hobby US$5/mês de base com US$5 de consumo incluído; excedente cobrado. Cartão/meio aceito deve ser confirmado no checkout. Trial/free limitados não garantem semanas contínuas. Env, Dockerfile, PORT e healthcheck | Sem adaptação funcional; consumo precisa limite/aprovação; gate confirma acesso anônimo real |
| Render pago | Mesmo Docker ou dois serviços Node | TLS gerenciado; hostname onrender.com | Serviço pago sem spin-down gratuito; disco efêmero e Supabase | Consultar preço da instância no checkout e autorizar antes; não confundir plano workspace com compute. Env/build/start e healthcheck | Alternativa válida; não usar Free: após 15 min idle, exibe loading page ao reiniciar |
| Fly.io Machines | Mesmo Docker | TLS e hostname fly.dev | Configurar máquinas sem auto-stop; storage efêmero, Supabase | Pago por uso após trial limitado; faturamento/cartão a confirmar antes. Exige config de machine/região/PORT | Viável, mas mais operação para este teste; não depender do trial para semanas |
| Vercel + backend externo | Next nativo, Express precisaria outro host | TLS/hostname vercel.app e hostname do backend | Next gerenciado, backend depende do segundo provider | Duas contas/configurações/limites; elegibilidade de plano gratuito comercial deve ser conferida | Mais variáveis/CORS; Express direto na Vercel vira Function, portanto não selecionado |

Fontes oficiais: [Railway planos](https://docs.railway.com/pricing/plans), [Dockerfiles](https://docs.railway.com/builds/dockerfiles), [rede pública](https://docs.railway.com/networking/public-networking), [Render Free](https://render.com/docs/free), [Render preços](https://render.com/pricing), [Fly trial](https://fly.io/docs/about/free-trial/), [Express na Vercel](https://vercel.com/docs/frameworks/backend/express).

Nenhuma plataforma foi contratada. Custo final depende de consumo; US$5 não é teto. Hostname da plataforma dispensa comprar domínio ou mexer no DNS corporativo. Subdomínio próprio fica como opção futura separada, mediante autorização.

## Arquivos

- AUDIT.md: auditoria prévia e histórico descartado.
- Dockerfile + Dockerfile.dockerignore: build com fontes permitidas, sem .env, logs ou secrets; dependências npm ci pelos lockfiles.
- gateway.cjs: gateway público, sem login/interstitial para recursos PWA; admin/auth/webhooks bloqueados.
- start.cjs: inicia processos, falha se origin de runtime diferir do build, readiness de ambos, shutdown; backend somente loopback.
- prepare-context.ps1: snapshot novo sanitizado para upload, sem enviar nada.
- smoke.cjs: HTTPS/status/MIME/manifest/PNG/chunks/páginas e API pública, sem cookies/login.
- browser-check.cjs: gates de browser, include/omit, SW/controller e modo seguro; bloqueia escritas/instalação.
- gateway.test.cjs: testes locais contra servidores fictícios, sem DB.

## Variáveis — nomes e configuração

Não copiar .env local. Configurar no provider usando a interface segura. Nunca usar build args para secrets.

Build (públicas, ARGs explicitamente declarados no Dockerfile):

- NEXT_PUBLIC_APP_URL: origin HTTPS gerada e estável do serviço.
- NEXT_PUBLIC_APP_NAME: valor de branding configurado pelo responsável, sem hardcode de marca.
- NEXT_PUBLIC_APP_LOGO_URL: opcional, URL pública HTTPS.
- NEXT_PUBLIC_APP_SUPPORT_EMAIL: opcional, contato corporativo de configuração.

Não definir aliases NEXT_PUBLIC_PLATFORM_WEBSITE/NEXT_PUBLIC_PLATFORM_NAME com valores conflitantes: eles têm precedência na aplicação. O empacotamento usa uma fonte APP, sem duplicações. Variáveis NEXT_PUBLIC são incorporadas ao build: mudar origin/branding exige rebuild.

Runtime informado pelo responsável:

- APP_URL: exatamente a origin usada no build.
- SUPABASE_URL: <CONFIGURAR NO PROVIDER>.
- SUPABASE_ANON_KEY: <CONFIGURAR NO PROVIDER>.
- SUPABASE_SERVICE_ROLE_KEY: <CONFIGURAR NO PROVIDER>, somente runtime/backend.
- PORT: porta pública do contêiner (8080 se não fornecida pelo provider).

Valores existentes controlados pelo launcher/Docker, não requerem copiar secretos locais:

- NODE_ENV; HOST; NEXT_PUBLIC_API_URL.
- APP_NAME; PLATFORM_NAME; PLATFORM_WEBSITE; PUBLIC_APP_URL; FRONTEND_URL; BOOKING_BASE_URL (derivados da configuração revisada).
- NEXT_PUBLIC_DEV_PWA_DIAGNOSTICS habilitada exclusivamente nesta imagem DEV.
- DEV_PWA_MANIFEST_CREDENTIALS desligada: nenhum cookie deve ser necessário.
- NEXT_PUBLIC_DEV_MODE desligada.
- REMINDER_SCHEDULER_ENABLED; WHATSAPP_QUEUE_ENABLED; CAMPAIGN_SCHEDULER_ENABLED; BIRTHDAY_GREETING_SCHEDULER_ENABLED desligados.
- WHATSAPP_DRY_RUN ligado; WHATSAPP_CLOUD_API_ENABLED desligada.

Preservar CLIENT_TOKEN_TTL_DAYS se o ambiente DEV usar valor explícito diferente do default auditado. Não mudar essa política para o teste. Não fornecer credenciais WhatsApp/produção. Frontend não recebe as variáveis secretas do backend.

LOCAL DEV: nenhum .env alterado, portas e comandos locais mantidos. HOSTED DEV: uma origin HTTPS, API_URL=/api, backend interno 3001; a URL backend pública seria a mesma origin com /api. CORS existente não é alterado; o browser chama mesma origin. Não expor 3000/3001 externamente.

## Passos humanos e implantação após aprovação

1. Revisar Railway versus Render pago; aprovar provider, orçamento e publicação. Não criar serviço pago antes. Não realizar alteração DNS.
2. Disponibilizar conta/workspace e um serviço DEV autorizado. No Railway, configurar serviço Docker com contexto raiz e caminho deploy/staging/Dockerfile, PORT alvo 8080, healthcheck /_staging/health, uma réplica, sleep/serverless desligado, logs disponíveis. Não usar template com banco.
3. Gerar/reservar o hostname do serviço antes do build final. Caso o painel exija primeiro deploy para gerar domínio, fazer bootstrap sem aplicação/secrets e somente após aprovação; depois definir origin e gerar o build final. Não publicar build com origin fictícia nem iniciar teste nessa etapa provisória.
4. Executar prepare-context.ps1 e usar somente um snapshot NOVO produzido por ele para upload. Não usar a pasta de validação local, que recebeu node_modules por junction e .next. Não enviar o repositório inteiro/.codex-logs/.git/.env. CLI/login/upload dependem de acesso humano; não executados nesta tarefa. Após aprovação, `railway up` deve partir da raiz desse snapshot e o Dockerfile path deve estar configurado no serviço. Não exige commit/push Git.
5. Configurar os nomes de variáveis acima. Conferir Supabase DEV autorizado e TTL de tokens, sem copiar banco ou rodar scripts de manutenção. Desabilitar autodeploy de branch de produção e proteção com login/interstitial nesse host DEV público.
6. Fazer build/deploy e aguardar healthcheck; manter domínio fixo. Validar consumo e logs sem exportar payloads de clientes.
7. Rodar `node deploy/staging/smoke.cjs https://<HOST-DEV> bellory-test-studio`.
8. Rodar `node deploy/staging/browser-check.cjs https://<HOST-DEV> bellory-test-studio` com Playwright instalado na máquina de QA. Neste notebook é possível apontar PWA_PLAYWRIGHT_MODULE para .codex-logs/mobile-diagnostic/node_modules/playwright-core e PWA_CHROME_PATH para o Chrome instalado. Esses dois nomes são configuração do runner, não secrets ou env da aplicação.
9. Confirmar manualmente /pwa-diagnostics e include/omit ambos corretos. Repetir smoke após período ocioso e no dia seguinte, mantendo hostname. Nenhuma instalação física ainda.
10. Apresentar resultados antes de pedir autorização para uma única tentativa Android no mesmo aparelho/Chrome. Não atualizar navegador nesta atividade.

Rollback: restaurar deployment/imagem anterior mantendo hostname e configuração correspondente, ou parar exclusivamente o serviço staging. Sem rollback de banco porque nenhuma mudança DB faz parte deste pacote. A imagem é DEV e não deve ser promovida à produção com diagnostics habilitado.

## Gates e limitações atuais

Docker/CLI de provider não disponíveis no PATH: imagem Docker não construída/executada neste notebook. Build Next foi exercitado separadamente em cópia sem .env, com origin fictícia exclusiva de compilação; isso não valida TLS, recursos ou runtime Linux da imagem. Instalação de Docker/CLI não realizada.

Nenhuma URL real nova foi publicada. Manifest/SW/ícones sem cookie, páginas /acesso/agendar/pwa-diagnostics, API, CORS/CSP, mixed content, chunks e SW registrado na NOVA hospedagem: TODOS PENDENTES. Não reutilizar resultados ngrok como aprovação desses gates. O smoke HTTP include/omit em Node não tem cookie jar; o script browser é obrigatório para o gate real.

O layout referencia /favicon.ico, que não faz parte dos três ícones PWA validados; conferir eventual 404 no gate de assets. Não alterar ícones/manifest por hipótese nesta tarefa.

Sem alteração funcional, banco, migrations, commit ou push. LAN HTTP, Localtunnel, Cloudflare Quick Tunnel e ngrok para validação final WebAPK permanecem descartados sem nova evidência.

## Verificação final local

- 3 testes do gateway aprovados, com upstreams fictícios: prefixo /api preservado, slugs dinâmicos, chunks codificados, bloqueios privados e readiness 503.
- 27 testes PWA existentes/relevantes aprovados.
- TypeScript --noEmit --incremental false aprovado.
- Build Next em snapshot isolado SEM .env: aprovado, 44 páginas estáticas; origin fictícia usada somente para compilação, nunca publicada.
- Sintaxe dos scripts Node aprovada; git diff --check aprovado. Novos arquivos sem whitespace de final de linha.
- Docker não disponível: não afirmar que imagem Linux ou supervisor completo foram executados. Gates HTTPS/browser remotos pendentes até publicação autorizada.
- .env frontend/backend mantêm os hashes anteriores. Nenhum código funcional alterado nesta tarefa; somente 10 arquivos novos em deploy/staging. Alterações anteriores do usuário mantidas.
- Confirmado favicon.ico ausente apesar da referência preexistente no layout. Gate browser registra erros HTTP/console; se esse 404 aparecer após deploy, reportá-lo para decisão pontual antes de aprovar o gate. Não foi corrigido por hipótese.

Estado: arquivos preparados para revisão, ambiente real ainda bloqueado por ausência de provider/conta e autorização de publicação. Nenhum serviço pago, DNS, banco, migration, commit, push ou teste físico executado.

## Atualização — continuação Railway em 13/09/2026

O usuário autorizou prosseguir com Railway/publicação, condicionada à checagem da conta/plano e sem contratação paga automática. A CLI oficial 5.54.1 foi disponibilizada em cache temporário (.codex-logs), sem alterar dependências da aplicação. Não havia sessão CLI autenticada; iniciado login oficial browserless, aguardando ação do titular. Não copiar URL/código temporário de ativação para documentação permanente. Nenhum serviço/plano/banco criado e nenhum secret configurado no provider nesta etapa até autenticação e inspeção.

### Lifecycle revisado

A porta pública PORT (default 8080) pertence ao gateway HTTP dentro do processo pai start.cjs. Esse mesmo pai supervisiona Next e Express; não há terceiro daemon sem controle. Next é iniciado por node node_modules/next/dist/bin/next start -H 127.0.0.1 -p 3000. Express é iniciado por node src/server.js com HOST=127.0.0.1 e PORT=3001.

supervise.cjs acompanha error/close de cada filho. Morte de Next ou Express derruba o irmão e encerra o pai com código 1. Erro/fechamento inesperado do gateway também encerra o conjunto com código 1. SIGTERM/SIGINT normais param ambos, aguardam os eventos close e só então saem com 0; se ultrapassar quatro segundos, SIGKILL e saída 1. Uma morte abrupta do PID principal encerra o contêiner e deve acionar a política do provider.

O healthcheck é /_staging/health, sem autenticação, com consultas frescas paralelas a /acesso no frontend e /api/public/health no backend, timeout de dois segundos e retorno 503 se qualquer um falhar ou startup não concluir. Resposta contém somente booleans técnicos e Cache-Control:no-store. O launcher também monitora continuamente: após readiness, três falhas consecutivas derrubam o conjunto com saída 1. Não confiar apenas no healthcheck de deploy do provider.

railway.json configura Dockerfile, healthcheck, timeout 300 s e ON_FAILURE com cinco tentativas. prepare-context.ps1 copia esse JSON para a raiz do snapshot de upload. Em recorrência de falhas após limite, serviço fica com falha até intervenção; não existe retry infinito silencioso.

Validação local: nove testes de infraestrutura aprovados (HTTP real com upstreams fictícios e supervisão com processos simulados), incluindo indisponibilidade após readiness e prazo de shutdown. start.cjs passou node --check; diff --check aprovado. A execução Linux da imagem e os gates Railway reais seguem pendentes, não equivalem a esses testes locais.

Favicon: referência convencional em frontend/src/app/layout.tsx, arquivo /favicon.ico ausente. Não está no manifest atual; os três ícones PWA são PNGs separados. Os testes anteriores já obtiveram installabilityErrors vazio sem essa entrada no manifest, portanto não há evidência causal para instalação. Mantido sem alteração.

Arquivos desta continuação: start.cjs, gateway.cjs, gateway.test.cjs, prepare-context.ps1 e README.md atualizados; supervise.cjs, supervise.test.cjs e railway.json criados. Sem mudança no código funcional, banco, migrations, DNS, commit, push ou instalação física.


## RD-H2 — disponibilidade dos contextos (implementação local)

Disponibilidade é evidência para UX/navegação, nunca autorização. Cliente exige TC validado no backend; profissional exige sessão revalidada e contexto interno. last-context permanece preferência somente entre contextos disponíveis. Query context pode iniciar um fluxo sem conferir identidade. Falha transitória mantém estado indeterminado.

Política RD-H5: contexto ausente não gera convite permanente para adicioná-lo. Switches operacionais aparecem somente quando ambos os contextos estão disponíveis; no login, é permitido retornar a um cliente já validado. A aquisição do segundo contexto ocorre pelo fluxo normal correspondente (link/WhatsApp/agendamento para cliente; landing/login/cadastro para profissional), sem correlação entre identidades e sem remover o primeiro contexto. /app mantém escolha neutra quando nenhum está disponível e query context continua permitindo entrada explícita. A sondagem POST /api/public/booking/:slug/client/context recebe token no corpo e responde somente {available}; compartilha validação com o acesso recorrente, sem touch, histórico ou emissão de TC.

Gate histórico da RD-H2: liberar estritamente esse método/path no gateway e validar em staging. Gateway, build e deploy não foram executados naquela etapa. Esse gate foi atendido posteriormente na RD-H3; não é pendência atual. RD-H5 e correção RD-H9.1 integram o staging publicado; estado consolidado na referência acima.
