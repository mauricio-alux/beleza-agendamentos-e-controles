# Auditoria antes da instrumentação

O PwaInstallProvider no layout raiz captura beforeinstallprompt, retém o evento e o consome após o CTA. InstallPwaPrompt chama prompt(), aguarda userChoice e esconde a promoção quando accepted. dismissed e Agora não gravam pwa-install-dismissed-at por 14 dias; accepted não grava esse cooldown. Não há registro persistente de instalação efetiva.

O listener appinstalled limpa o evento e define standalone=true no provider. Esse estado de UI mistura instalação e execução; o diagnóstico usará matchMedia e navigator.standalone diretamente, sem depender desse booleano e sem refatorar o fluxo nesta etapa.

PwaServiceWorker registra uma vez, imediatamente se readyState=complete ou no load. Manifest central no HEAD, route handler em /manifest.webmanifest e helper com start_url=/acesso, scope=/, display=standalone, sem id; três PNGs públicos. O SW preserva somente fallback offline e não armazena APIs. Logs atuais são strings estáticas no console, ligados por NEXT_PUBLIC_DEV_PWA_DIAGNOSTICS.

Implementação prevista: reutilizar a flag explícita (desligada por padrão), route /pwa-diagnostics com 404 sem flag, timeline limitada e temporária em namespace técnico exclusivo. Coleta global independente do painel; probes manuais somente em recursos públicos same-origin, sem query/hash, include versus omit. Não persistir corpos de resposta, cookies, dados de clientes ou URLs dinâmicas. Sem mudança de banco, booking, manifest, SW, cooldown ou tokens.

## Implementação e operação

Rota: /pwa-diagnostics. Flag explícita: NEXT_PUBLIC_DEV_PWA_DIAGNOSTICS=true, já usada no override temporário do build DEV. Sem flag, page chama notFound e coleta/checks ficam desabilitados. Não depende somente de NODE_ENV. Para produção, gerar build sem essa flag; flags NEXT_PUBLIC são incorporadas ao build. O proxy temporário também exige a flag para liberar a rota. Domínio, ngrok, backend e .env permanentes preservados.

Arquivos lidos: PwaInstallProvider.tsx, InstallPwaPrompt.tsx, PwaServiceWorker.tsx, pwa-diagnostics.ts, layout.tsx, pwa-manifest.ts, manifest.webmanifest/route.ts (arquitetura anterior), public/sw.js, testes PWA, package.json, next.config.ts, proxy.cjs e rebuild-installability.ps1.

Arquivos funcionais alterados nesta etapa: layout.tsx (observador DEV), InstallPwaPrompt.tsx (instrumentação somente), pwa-diagnostics.ts (timeline). Criados: PwaDiagnosticObserver.tsx, PwaDiagnosticsPanel.tsx, pwa-resource-checks.ts, app/pwa-diagnostics/page.tsx. Testes: pwa-panel.test.js novo; InstallPwaPrompt.test.js e manifest-link.test.js adaptados. Fora do código funcional: proxy.cjs temporário, scripts/evidências em .codex-logs/post-install e este documento.

Eventos: inicialização com contexto técnico sanitizado; logs existentes de manifest/SW; beforeinstallprompt recebido/deferred; clique com disponibilidade, cooldown, modo real e estado anterior; prompt iniciado/concluído/erro; userChoice e duração; appinstalled; display-mode, visibilidade, foco, blur, pageshow e pagehide. Erros guardam somente tipo em allowlist, nunca mensagem original. Provider/SW preservados; listener appinstalled já era global. Painel mede runningStandalone via APIs reais, não via estado conceitualmente misturado do provider.

Persistência: chave pwa:dev-diagnostics:v1, máximo 250 entradas, janela de 24 horas. Revalidação ao carregar. Fallback em memória quando armazenamento indisponível. Limpar diagnóstico remove apenas essa chave; não remove evento deferred, cooldown, caches, identidade ou dados do booking. Query/hash não coletados; slug de booking substituído por [slug], demais caminhos privados por [redacted]. O painel mostra apenas contexto técnico e campos públicos do manifest. Não exporta HTML, binários, cookies, headers, tokens ou dados de cliente. Nenhuma telemetria enviada ao backend.

Checks acionados pelo botão Verificar recursos públicos: manifest, sw.js e PNGs declarados em /icons, mesma origin, sem query/hash. Duas requisições por recurso: include e omit, no-store, timeout 12 s e limite 256 KiB. Redirecionamentos bloqueados: o painel registra isso sem seguir a URL, evitando envio de credenciais fora da allowlist. JSON parseado e campos esperados exibidos; assinatura PNG/MIME verificados; HTML e possível interstitial sinalizados sem guardar corpo. SW: getRegistrations, scope/script seguros, active/waiting/installing/updateViaCache, controller e ready. Não unregister, não limpar cache.

## Evidência e limites

O painel real no Chrome isolado reproduziu include=recursos corretos e omit=HTML nos cinco recursos (manifest, SW, três PNGs). Isso não demonstra que o WebAPK usa omit. Nenhuma instalação executada no teste automatizado. Timeline persistiu após reload; viewport 390 px sem overflow horizontal. O Chrome isolado de notebook não substitui a captura física Android.

27 testes PWA aprovados, incluindo flag/404, persistência, sanitização, limpeza isolada, beforeinstallprompt/appinstalled, modo real separado, aceite/recusa, HTML e MIME/assinatura PNG, allowlist/redirect e regressão do CTA/cooldown/manifest. TypeScript e build executados. O npm run lint preexistente pede configuração interativa; usado ESLint Next/core-web-vitals e Next/typescript com configuração temporária e dependências existentes, sem alterar configuração permanente.

## Roteiro físico — uma tentativa

1. Abrir https://slurp-confess-zombie.ngrok-free.dev/pwa-diagnostics no mesmo Chrome e mesma aba/contexto do fluxo. Se houver aviso ngrok, tocar Visit Site e aguardar carregamento.
2. Limpar diagnóstico uma vez, antes do teste. Voltar para /acesso ou booking pela navegação normal (não limpar dados do site). O evento já armazenado pode continuar disponível mesmo após limpar a timeline; ausência de um novo beforeinstallprompt não significa que a promoção falhou.
3. No CTA, executar uma única tentativa. Aguardar a mensagem do Chrome e eventual retorno à aba. Não repetir instalação.
4. Voltar ao painel na mesma aba/origin sem limpar diagnóstico. Tocar Verificar recursos públicos, aguardar conclusão e Copiar relatório técnico.
5. Enviar somente esse relatório. Não enviar HAR, cookies, telas com dados de agendamento ou console completo.

O problema de instalação não foi corrigido nesta atividade. Banco, migrations, backend, booking, tenant-first, manifest, SW, branding e cooldown não alterados. Sem commit e sem push.

Verificação final do build: Chrome sem pageerrors antes/depois do reload; largura 390 px sem overflow; timeline de 7 para 15 eventos após reload, preservando anteriores. Painel/acesso/booking/health HTTP 200; admin HTTP 404. ESLint temporário executado a partir de frontend com exit 0; build e TypeScript aprovados; diff --check aprovado. Corrigida durante a implementação uma discrepância de hidratação do próprio painel (conteúdo temporal antes da montagem), ausente na verificação final. Nenhuma regressão restante observada nos testes executados. Processos necessários mantidos ativos.
