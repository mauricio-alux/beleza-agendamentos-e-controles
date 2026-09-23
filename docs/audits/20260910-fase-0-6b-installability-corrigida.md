# Fase 0.6B — bloqueios de installability corrigidos

Origin preservada: https://slurp-confess-zombie.ngrok-free.dev. Sem novo túnel, domínio ou alteração funcional de booking/identidade. Somente frontend reiniciado para aplicar os builds; backend, proxy e ngrok preservados.

## Manifest antes/depois

Antes, a Metadata API combinada com a rota dinâmica deixava o manifest no BODY do booking, gerando no-manifest. A requisição automática sem credenciais recebia HTML do aviso ngrok em /acesso, gerando manifest-parsing-or-network-error.

O layout servidor agora declara um único link no HEAD inicial, com href relativo /manifest.webmanifest. O endpoint foi convertido de app/manifest.ts para app/manifest.webmanifest/route.ts, um Route Handler nativo do Next que reutiliza buildPwaManifest e APP_BRAND. Isso evita o segundo link automático da convenção de arquivo e permite configurar crossorigin sem manipulação client-side ou inserir links no BODY. Não foi necessário desativar streaming metadata globalmente.

crossorigin=use-credentials é opt-in por DEV_PWA_MANIFEST_CREDENTIALS=true somente nos overrides do ambiente de teste. Fora desse opt-in, o atributo fica ausente. Nenhum hostname ngrok foi inserido no código. Caminho relativo mantém o destino na mesma origin e não exige CORS cross-origin. JSON de branding, start_url=/acesso, scope=/, display=standalone e cores preservados.

Ao corrigir os primeiros bloqueios, Chrome revelou no-acceptable-icon. Foi comprovado em comparação controlada que a entrada /favicon.ico, inexistente e declarada com sizes=any, provocava o erro; removê-la fez installabilityErrors=[] e beforeinstallprompt ocorrer. Aplicada somente a remoção dessa entrada do manifest. Os PNGs 192, 512 e maskable 512 foram preservados e decodificados pelo Chrome nas dimensões corretas. Nenhum ícone foi redesenhado. A referência preexistente de favicon na metadata geral não foi alterada; não bloqueou a validação final do manifest.

## Service worker

Registro imediato quando readyState=complete; caso contrário, listener load com cleanup. Promise por documento deduplica registros inclusive em remontagem StrictMode. Registro limitado a contexto seguro com suporte a serviceWorker. Conteúdo de public/sw.js, escopo e estratégia de cache permanecem inalterados. APIs/PII/identidade/agendamentos não foram adicionados ao cache.

## CTA e logs

UX, cooldown, identidade e gatilhos funcionais preservados. Logs estáticos e sem payload pessoal habilitados somente por NEXT_PUBLIC_DEV_PWA_DIAGNOSTICS=true no build DEV temporário. Distinguem evento recebido/guardado/consumido, CTA visível/clicado, disponibilidade do evento, chamada prompt, aceite/recusa, erro, motivo do fallback, appinstalled e standalone. Nenhum valor de armazenamento, token, cliente, tenant ou agendamento é registrado.

## Evidência final real, sem alteração de respostas

Chrome headless em perfil persistente isolado, mesma origin, após Visit Site, com requisições de escrita bloqueadas para não criar dados no banco. Verificados /agendar/bellory-test-studio e /acesso:

- Exatamente um manifest, no HEAD, nenhum no BODY.
- Manifest detectado e interpretado pelo Chrome, sem erros de parsing.
- getInstallabilityErrors: lista vazia em ambas as páginas.
- no-manifest, manifest-parsing-or-network-error e no-acceptable-icon ausentes.
- SW ativo e controlando a página, script e scope na mesma origin.
- isSecureContext=true, nenhum recurso HTTP na página verificada.
- beforeinstallprompt observado em ambas as páginas; logs do provider confirmaram evento recebido e deferred prompt stored.

No booking, load ocorreu em 606 ms e efeito em 639 ms: mesmo chegando depois de load, register executou e o SW passou a controlar a página em 949 ms. Em /acesso, novo documento já ficou controlado e registrou sem depender de outro load. Evidências: .codex-logs/mobile-diagnostic/installability-final-1.json e installability-final-2.json. Ensaios anteriores/controle de ícone foram preservados separadamente e não constituem a evidência final.

## Testes e limites

54 testes aprovados ao longo da tarefa: 36 de frontend (PWA, registro SW, link inicial/opt-in, manifest/ícones, recurring-access e session-id) e 18 de Public Booking/identidade com mocks e variáveis fictícias. TypeScript sem emissão, build de 44 páginas e git diff --check aprovados. Testes de layout cobrem atributo de credenciais ausente por padrão e único link no HEAD. Testes do SW cobrem antes/depois de load, cleanup, deduplicação e contexto inseguro.

A revisão automática inicialmente bloqueou o override de credenciais. Após conferir a autorização expressa do item 2 do TXT e demonstrar href relativo, mesma origin e opt-in DEV, a aplicação foi aprovada. Nenhuma credencial foi extraída ou copiada.

Não houve instalação física, appinstalled ou userChoice real nesta validação; esses pontos permanecem para o celular. Não limpar armazenamento, remover SW, trocar origin ou desinstalar a PWA. Reabrir o link de booking na mesma origin para carregar o build novo, concluir a jornada legítima conforme o roteiro e testar Adicionar ao celular. O evento existe antes do CTA e é preservado pelo provider; o prompt continua exigindo clique/consentimento.

## Arquivos

- frontend/src/app/layout.tsx
- frontend/src/app/manifest.ts → frontend/src/app/manifest.webmanifest/route.ts
- frontend/src/components/pwa/PwaServiceWorker.tsx
- frontend/src/components/pwa/PwaInstallProvider.tsx
- frontend/src/components/pwa/InstallPwaPrompt.tsx
- frontend/src/components/pwa/pwa-diagnostics.ts
- frontend/src/lib/pwa-manifest.ts
- Testes correspondentes em components/pwa e lib/pwa-manifest.test.js.
- Launcher DEV removível: .codex-logs/https-mobile-06bh/rebuild-installability.ps1.

Arquivos .env permanentes mantiveram os hashes anteriores. Sem alterações no banco/backend funcional, migrations, db push, seed, reset, reconcile, cleanup, commit ou push. Alterações preexistentes preservadas.

FASE 0.6B — BLOQUEIOS DE INSTALLABILITY CORRIGIDOS — PRONTO PARA NOVO TESTE FÍSICO
