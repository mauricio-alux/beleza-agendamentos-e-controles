# Fase 0.6B — exceção client-side no HTTPS

## Exceção reproduzida antes de corrigir

Na mesma origin https://protest-feet-pest-soma.trycloudflare.com, Chrome headless com viewport mobile 390x844, contexto novo sem cache anterior, o booking retornou a tela genérica após aguardar o timeout de carregamento.

- Tipo: ChunkLoadError.
- Mensagem: Loading chunk 5933 failed.
- Detalhe: timeout: https://protest-feet-pest-soma.trycloudflare.com/_next/static/chunks/app/agendar/%5Bslug%5D/page-0e91386ea91a02cd.js
- Stack: r.f.j em /_next/static/chunks/webpack-6df9060132ac7421.js:1:2899; r.e no mesmo arquivo:1:1190.
- Causa: allowed(req) no proxy temporário .codex-logs/https-mobile-06bh/proxy.cjs rejeitava colchetes e sua codificação %5B/%5D nos caminhos estáticos. Esses caracteres são necessários aos chunks Next de rotas dinâmicas.

O mesmo chunk retornava 200 application/javascript diretamente em :3000 e 404 sem MIME em :3080 e HTTPS. Portanto o arquivo existia e correspondia ao HTML servido; o proxy bloqueava seu acesso. Após o timeout, o runtime do Next lançava a exceção capturada. HTTP 200 da página isoladamente não comprova hidratação: a verificação anterior não inspecionava esse chunk, lacuna agora coberta.

## Correção mínima

Alterada apenas a regra de assets do proxy temporário: permite colchetes literais ou %5B/%5D exclusivamente sob /_next/static. Mantém bloqueio de codificações arbitrárias, traversal, métodos de escrita em assets, administração, login e webhooks. Slugs continuam dinâmicos. Reiniciado somente o proxy para aplicar a regra; frontend reconstruído/reiniciado para atender à validação solicitada. Cloudflare e backend preservados.

Nenhuma alteração funcional no Public Booking, identidade, recurring-access, session-id, PWA, manifest, SW ou cache. Sem mudança nos .env permanentes, banco, migrations, seed, cleanup, commit ou push.

## Logs e tentativa física

Usuário informou Chrome, aproximadamente 15h50 BRT (18h50 UTC), em 09/09/2026. Logs de frontend, backend e proxy não continham exceção nesse intervalo. O proxy anterior só registrava sondagens marcadas, não cada requisição mobile, portanto não permite correlação individual retrospectiva. Cloudflare tinha um context canceled às 18h26 UTC, anterior à tentativa, sem evidência que o associe à falha das 18h50. A reprodução no navegador e a comparação 3000/3080/HTTPS demonstraram a causa sem inferi-la desse cancelamento.

## SW, cache, APIs e Web APIs

Reproduzido também em contexto novo: não depende de SW ou cache antigo. SW atual armazena somente /offline e usa rede nas navegações, não cacheia chunks nem APIs. Não foi necessário limpar/ampliar cache, instrumentar celulares ou recriar túnel.

Após liberar o chunk, navegador requisitou /api/public/booking/bellory-test-studio e /availability pela mesma origin, ambos HTTP 200. Não houve dependência ativa de localhost/LAN para essas chamadas. Literais de fallback locais existem no código de configuração, mas o override ativo é /api. A falha acontecia antes de executar o módulo de booking; nenhuma Web API mobile foi identificada como causa dessa exceção.

O diagnóstico bloqueou requisições de escrita do navegador isolado para não criar identidade, acesso ou agendamento no banco. Assim não valida a jornada completa de identificação/agendamento; essa etapa permanece para reteste físico. Não houve registro de PII, tokens ou armazenamento local. Ferramenta e scripts de diagnóstico estão apenas em .codex-logs/mobile-diagnostic, removíveis, fora das dependências do projeto.

## Testes

48 testes existentes aprovados: Public Booking/client identity, recurring-access, PWA/manifest e session-id. Mais 3 testes de regressão do proxy: reprodução do bloqueio antes da correção, sucesso após correção, preservação dos bloqueios e slugs dinâmicos. TypeScript --noEmit e build (44 páginas) aprovados; git diff --check passou. Após build, booking ficou aberto por 130 segundos no Chrome com viewport mobile: nenhum pageerror ou tela genérica, todos os chunks/CSS/fontes e catálogo/disponibilidade com HTTP 200. Evidência: .codex-logs/mobile-diagnostic/final-browser.jsonl. Verificação adicional dos 12 endpoints HTTPS aprovada, manifest start_url=/acesso e SW acessíveis. Admin/login/webhook testados continuam 404. Nenhuma origin anterior encontrada no build ativo. Processos mantidos ativos: cloudflared 10288, proxy 36748, backend 40048 e frontend 27708.

## Reteste mobile

Reabrir a mesma URL em uma nova aba do Chrome: https://protest-feet-pest-soma.trycloudflare.com/agendar/bellory-test-studio. Conferir carregamento completo, identificação, agendamento e convite. Não é necessário trocar origin nem apagar identidades. A instalação/standalone continua pendente; Fase 0.6B não declarada validada.
