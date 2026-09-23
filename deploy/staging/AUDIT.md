# Auditoria prévia — 13/09/2026

Escopo: infraestrutura de staging; nenhum código funcional deve mudar. Next.js usa build/start nativos; Express inicia src/server.js e os schedulers no startup. Banco remoto Supabase exige SUPABASE_URL, SUPABASE_ANON_KEY e SUPABASE_SERVICE_ROLE_KEY. Backend monta rotas com e sem /api; CORS atual é cors() sem restrições. O frontend usa API_URL centralizado; staging deve manter /api na mesma origin.

Hardcodes/fallbacks encontrados: frontend/src/config/app-brand.ts e backend/src/config/app-brand.js usam http://127.0.0.1:3000 como fallback; frontend API fallback http://127.0.0.1:3001; backend PORT default 3000 apesar do uso DEV em 3001. Não substituir esses valores: definir configuração de staging. Next config não possui rewrites. O proxy existente está somente em .codex-logs e usa portas locais fixas; o novo gateway será infraestrutura empacotada, sem dependência de túnel.

Precedência frontend: NEXT_PUBLIC_PLATFORM_WEBSITE antes de NEXT_PUBLIC_APP_URL; NEXT_PUBLIC_PLATFORM_NAME antes de NEXT_PUBLIC_APP_NAME. Backend: PLATFORM_WEBSITE antes de APP_URL; PUBLIC_APP_URL antes de FRONTEND_URL/PLATFORM_WEBSITE/APP_URL. URLs absolutas de booking e redefinição de senha vêm desses helpers; BOOKING_BASE_URL possui configuração própria. Callbacks WhatsApp em /public/webhooks/whatsapp, fora do escopo e bloqueados no gateway. Reset de senha usa /redefinir-senha; nenhuma alteração nas allowlists de Auth Supabase nesta atividade, pois não há teste de login/reset. Caso esses fluxos sejam incluídos depois, auditar Redirect URLs do projeto remoto e obter autorização antes de mudar.

Manifest e SW preservados: /acesso, scope /, standalone, sem id, ícones existentes. Instrumentação exige NEXT_PUBLIC_DEV_PWA_DIAGNOSTICS. Overrides ngrok estão em scripts temporários, não devem ser transportados. DEV_PWA_MANIFEST_CREDENTIALS ficará desligado na hospedagem sem interstitial. Fonte central de branding preservada.

Acesso ao provider/publicação não autorizado nesta solicitação. Nenhuma CLI docker/railway/flyctl/render localizada no PATH nesta auditoria. Não procurar/imprimir tokens. Preparar arquivos, validar o que for possível localmente e registrar gates remotos como pendentes.

Histórico encerrado sem nova evidência: LAN HTTP, Localtunnel, Cloudflare Quick Tunnel, ngrok como referência final WebAPK. Não reabrir essas alternativas.
