# Fase 0.6B-H — Cloudflare Quick Tunnel

Aplicadas somente as demandas de infraestrutura do TXT Aplicar via CODEX. Ambiente DEV, sem mudanças funcionais no SaaS, manifest, service worker ou banco; sem commit/push. Alterações preexistentes no checkout foram preservadas.

## Infraestrutura ativa

- URL: https://duo-thumbzilla-burner-ranked.trycloudflare.com
- Primeiro teste mobile: https://duo-thumbzilla-burner-ranked.trycloudflare.com/agendar/bellory-test-studio
- cloudflared portátil 2026.8.3, obtido do repositório oficial e conferido pelo SHA256 do release. Sem serviço, conta ou DNS permanente.
- HTTPS → Quick Tunnel HTTP/2 (PID 39472) → proxy 127.0.0.1:3080 (PID 27856) → frontend :3000 (PID 332) / backend :3001 (PID 15212).
- O primeiro túnel Cloudflare perdeu conexão durante a interrupção noturna, com erros DNS/QUIC. Foi substituído pelo túnel HTTP/2 acima; os resultados abaixo pertencem exclusivamente à nova URL.
- Localtunnel encerrado, logs históricos preservados. Ambiente deixado ativo, sem reversão para LAN.

## Overrides temporários

NEXT_PUBLIC_APP_URL, NEXT_PUBLIC_PLATFORM_WEBSITE, APP_URL, PLATFORM_WEBSITE e PUBLIC_APP_URL apontam para a nova origin. BOOKING_BASE_URL aponta para origin/agendar; NEXT_PUBLIC_API_URL=/api. NEXT_PUBLIC_DEV_MODE=false; NODE_ENV=production apenas para build/start local. HOST=127.0.0.1, portas 3000/3001. Schedulers de lembretes, campanhas, aniversário e fila WhatsApp desativados; WHATSAPP_DRY_RUN=true. Arquivos .env preservados, hashes conferidos. TypeScript e build frontend concluídos.

Varredura do build ativo (.next/static e .next/server) e arquivos ativos de URL/processos não encontrou calm-worlds-travel.loca.lt, yummy-queens-sneeze.loca.lt nem a URL Cloudflare anterior. Referências históricas em logs/documentação foram mantidas.

## Validação pelo notebook

Horários abaixo em UTC, registrados ao concluir cada rodada:

| Rodada | Horário 09/09/2026 | Resultado |
| --- | --- | --- |
| A, após preparar build/start | 13:15:03 | 12/12 HTTP 200 |
| B, após mais de 2 minutos sem sondagens | 13:17:44 | 12/12 HTTP 200 |
| C, após mais de 90 segundos sem sondagens | 13:19:39 | 12/12 HTTP 200 |

Cada rodada incluiu /, /acesso, /agendar/bellory-test-studio, /agendar/espaco-vivian-beauty, /manifest.webmanifest, /sw.js, /api/public/health, catálogo público dos dois tenants e três ícones PNG (192, 512 e maskable 512). Sem 408 ou tela intermediária nas rodadas. Estabilidade observada nesse intervalo, sem garantia de disponibilidade futura.

Após C, /admin, /api/admin/summary, /login, /api/auth/login e /api/public/webhooks/whatsapp retornaram 404 pelo túnel. Proxy mantém regras por formato de rota e método, sem lista de tenants; resolução de slug permanece no SaaS. APIs públicas de identidade/agendamento continuam nas regras existentes; não foram feitas operações de criação ou alteração para validar o túnel.

Manifest HTTP 200 com MIME application/manifest+json, start_url=/acesso, scope=/ e display=standalone. Nome corresponde à configuração existente. SW HTTP 200 com MIME JavaScript. Ícones HTTP 200. TLS aceito sem desativar validação de certificado; origin HTTPS elegível a secure context. Sem recursos src/href HTTP no HTML testado, API relativa /api. Verificação de mixed content em execução, registro/controle do SW, instalação e standalone dependem do navegador físico; não declarados aprovados.

## Evidências e limites

Evidências locais preservadas em .codex-logs/https-mobile-06bh/: cloudflare-A.json, cloudflare-B.json, cloudflare-C.json, cloudflared-http2.err.log, proxy-restart.out.log, apps.json e processes.json. O proxy registra chegada e status das sondagens sem persistir conteúdo de requisições. Nenhuma migration, db push, seed, reset, reconcile ou cleanup executada. Sem alterações no banco nesta tarefa; testes apenas GET. git diff --check aprovado.

## Teste mobile pendente

Abrir primeiro o booking indicado, testar ambos os tenants, /acesso e instalação/standalone. A nova origin possui armazenamento local próprio: identidade por slug, known-tenants e preferred-tenant precisam ser criados nela; não herdam dados da LAN ou do Localtunnel. A Fase 0.6B não está validada integralmente.

FASE 0.6B — CLOUDFLARE QUICK TUNNEL ATIVO E ESTÁVEL — AGUARDANDO VALIDAÇÃO MANUAL MOBILE
