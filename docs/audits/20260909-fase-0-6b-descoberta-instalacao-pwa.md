# Fase 0.6B — descoberta e instalação PWA

## Auditoria anterior à correção

1. InstallPwaPrompt estava somente em RecurringAccessPage, na rota /acesso, dentro do estado ready, depois da validação da identidade e consulta dos próximos agendamentos.
2. Não estava no Public Booking nem na tela de sucesso do agendamento.
3. Quem entrava somente por /agendar/[slug] não tinha caminho natural para descobrir a instalação na confirmação.
4. Em /acesso, o convite aparecia ao montar o componente em iOS ou quando o componente recebia beforeinstallprompt no Android. O evento podia ocorrer antes da montagem e ser perdido.
5. A exibição dependia de estado ready, plataforma/evento, ausência de standalone/fullscreen e ausência de dispensa recente.
6. A identidade legítima era exigida indiretamente pelo estado ready de /acesso. Não havia exigência de agendamento concluído nesse ponto secundário.
7. Não existia CTA antes ou depois da conclusão dentro do booking.
8. Agora não gravava pwa-install-dismissed-at no localStorage e ocultava o convite.
9. Nova oportunidade somente após 14 dias (1.209.600.000 ms), em nova montagem elegível; faltava redescoberta durante o cooldown.
10. Já havia detecção de display-mode standalone/fullscreen e navigator.standalone. O estado era consultado na montagem e atualizado por appinstalled.

## Correção limitada à descoberta

- PublicBookingPage inclui o convite somente no ramo de sucesso, com identidade reconhecida (token, ID e nome) e opção de lembrar identidade selecionada. Respeita quem não quer manter acesso no dispositivo; nenhuma alteração na emissão/persistência de identidade ou agendamento.
- Texto usa APP_BRAND.appName. CTA: Adicionar ao celular; dispensa: Agora não. Link Acessar meus horários leva naturalmente a /acesso, inclusive após dispensa.
- /acesso conserva o ponto secundário no estado ready. Durante cooldown apresenta um botão discreto Adicionar ao celular que reabre o convite por escolha do cliente.
- Cooldown de 14 dias preservado para o convite automático. Reabertura manual não apaga o timestamp. Após expiração, a próxima montagem elegível mostra o convite completo.
- PwaInstallProvider no layout retém beforeinstallprompt desde a entrada, sem iniciar instalação ou mostrar interface. O componente da confirmação reutiliza o evento. prompt() é chamado somente pelo clique e o evento é consumido após a tentativa.
- Ausência de prompt programático oferece orientação manual. iOS: Safari → Compartilhar → Adicionar à Tela de Início; navegador interno do WhatsApp orienta abrir Safari. Outros navegadores: menu de instalação/adição à tela, sujeito à disponibilidade.
- appinstalled, display-mode standalone/fullscreen e navigator.standalone ocultam o CTA. Mudança de display-mode é acompanhada; estado inicial aguarda detecção do navegador. Não há instalação silenciosa.
- Manifest/start_url=/acesso, service worker, cache, preferred-tenant, known-tenants, tokens, backend, banco e túnel permanecem sem mudanças nesta tarefa.

## Validação automatizada

24 testes frontend: 9 novos de descoberta/provider, 12 existentes de storage recurring-access e 3 existentes de manifest. Cobrem visita casual, elegibilidade, sucesso, redescoberta/cooldown, standalone, branding parametrizado, start_url, clique Android, orientação iOS, storage indisponível e captura antecipada do evento. Componentes e handlers executados com navegador/hooks determinísticos; verificações de integração conferem os pontos de montagem. Não substituem testes em navegador físico.

18 testes backend de Public Booking/identidade/catálogo passaram com repositório simulado e variáveis de ambiente fictícias, sem acesso ao banco. A primeira execução a partir da raiz encontrou ausência de variáveis; corrigida apenas a configuração do processo de testes.

TypeScript --noEmit --incremental false passou. O modo incremental inicial encontrou bloqueio de escrita no tsbuildinfo; não indicou erro de tipos. Build Next concluído com 44 páginas. Somente frontend reiniciado (PID 39476); backend, proxy e cloudflared preservados. Na mesma URL HTTPS, as 12 verificações GET finais retornaram 200, incluindo ambas as páginas de booking, /acesso, manifest, SW, APIs e ícones. Evidência: .codex-logs/https-mobile-06bh/cloudflare-pwa-ux.json. Arquivos .env mantiveram os hashes anteriores; git diff --check passou.

## Roteiro mobile

1. Abrir https://duo-thumbzilla-burner-ranked.trycloudflare.com/agendar/bellory-test-studio pelo link do WhatsApp.
2. Em uma visita sem identidade, confirmar ausência do convite de instalação dentro do booking.
3. Identificar-se legitimamente, manter a opção de lembrar acesso e concluir um agendamento de teste. Na confirmação, conferir o nome configurado e Adicionar ao celular.
4. Escolher Agora não. Usar Acessar meus horários; em /acesso, tocar Adicionar ao celular para reabrir o convite sem esperar 14 dias.
5. Android/Chrome: tocar o CTA e confirmar o fluxo nativo quando disponível. iPhone/Safari: seguir Compartilhar → Adicionar à Tela de Início. Não esperar instalação automática.
6. Abrir pelo ícone e conferir /acesso, tenant preferencial, horários e ausência do CTA em standalone.
7. Repetir o relacionamento no tenant espaco-vivian-beauty e conferir isolamento. Os tenants são casos de teste, não uma lista restritiva.
8. Se optar por não lembrar identidade, confirmar que não aparece convite de acesso recorrente no sucesso. Não esperar reutilização de identidades de origins antigas.

Instalação real, comportamento do navegador interno do WhatsApp e standalone continuam pendentes de validação física. Sem migrations, seed, reset, db push, reconcile, cleanup, commit ou push.
