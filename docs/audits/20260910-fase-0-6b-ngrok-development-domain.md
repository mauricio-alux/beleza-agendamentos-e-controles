# Fase 0.6B — ngrok Development Domain

Origin: https://slurp-confess-zombie.ngrok-free.dev

O domínio informado pelo usuário no painel foi aceito pelo ngrok 3.39.11 com a autenticação existente e URL explícita, sem exigência de plano pago ou criação de domínio adicional. Executável oficial portátil com assinatura Authenticode válida; executável anterior C:\WorkSpaces\ngrok.exe preservado por conferência SHA256. Authtoken não alterado.

Topologia: ngrok HTTPS → proxy 127.0.0.1:3080 → frontend :3000 / API :3001. Inspeção de tráfego do ngrok desativada. Proxy existente reutilizado.

Overrides de URL públicos e backend alinhados à origin; NEXT_PUBLIC_API_URL=/api; BOOKING_BASE_URL=origin/agendar. Arquivos .env preservados, hashes conferidos. TypeScript e build de 44 páginas passaram. Nenhuma referência aos hostnames anteriores encontrada no build ativo. git diff --check passou.

## Rodadas na origin definitiva

| Rodada | Conclusão UTC em 10/09/2026 | Resultado |
| --- | --- | --- |
| 1 | 15:02:14 | 7/7 HTTP 200 |
| 2, janela de aproximadamente 60 segundos | 15:03:09 | 7/7 HTTP 200 |
| 3, janela de aproximadamente 2 minutos | 15:04:08 | 7/7 HTTP 200 |

Em cada rodada: DNS resolvido por Google e Cloudflare; certificado aceito sem bypass; isSecureContext=true; nenhum pageerror, chunk com falha ou recurso HTTP no booking. Endpoints: /, /acesso, /agendar/bellory-test-studio, /agendar/espaco-vivian-beauty, /manifest.webmanifest, /sw.js e /api/public/health. Catálogo e disponibilidade chamados pelo navegador através de /api com 200. API do segundo tenant e ícones 192/512/maskable: 200. Administração, login e webhook testados: 404. Sondagens confirmadas nos logs do proxy.

Chrome isolado com viewport mobile confirmou Visit Site e permaneceu na mesma origin, carregando o booking. Testes de navegador bloquearam escritas para não criar identidades/agendamentos. Manifest com start_url=/acesso, scope=/ e display=standalone; SW acessível com MIME JavaScript. Não houve alteração em manifest, SW, cache, identidade, known-tenants, preferred-tenant ou lógica PWA.

Evidências: .codex-logs/mobile-diagnostic/ngrok-dev-domain-1.json, ngrok-dev-domain-2.json, ngrok-dev-domain-3.json. Estado dos processos e origin: .codex-logs/https-mobile-06bh/processes.json, apps.json, ngrok-url.txt.

Instalação, beforeinstallprompt, standalone, persistência entre navegador e ícone, troca de tenant e offline continuam pendentes de teste físico. A nova origin não herda storage das anteriores. Manter este hostname durante a bateria. A tela intermediária pode depender dos cookies de cada contexto de navegador. Estabilidade observada nas rodadas, sem garantia de disponibilidade futura.

Primeiro link: https://slurp-confess-zombie.ngrok-free.dev/agendar/bellory-test-studio

Sem alteração funcional, banco, migration, db push, seed, reset, reconcile, cleanup, commit ou push. Alterações preexistentes preservadas.

FASE 0.6B — ORIGIN HTTPS ESTÁVEL PREPARADA — AGUARDANDO VALIDAÇÃO MOBILE
