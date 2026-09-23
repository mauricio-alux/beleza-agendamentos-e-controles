# Fase 0.6B — diagnóstico de Adicionar ao celular

Escopo: auditoria, sem correção funcional, sem rebuild/restart, mesma origin https://slurp-confess-zombie.ngrok-free.dev. Celular e seu armazenamento não foram alterados. Instrumentação somente em perfis Chrome locais isolados, em .codex-logs/mobile-diagnostic. Nenhuma coleta de PII, valores de cookies, tokens ou localStorage. Requisições de escrita bloqueadas no navegador de diagnóstico.

## Fluxo do componente

PwaInstallProvider monta no layout e registra beforeinstallprompt em useEffect, não na montagem do CTA de sucesso. capture chama preventDefault e armazena o evento em state React. O evento permanece nas mudanças de estado do booking; não é persistido entre documentos. consume o descarta no finally de cada tentativa de prompt; appinstalled também o descarta. Desmontar/recarregar o provider perde o estado.

InstallPwaPrompt usa o contexto. Renderiza se eligible, ready e não standalone. O botão completo só é desabilitado enquanto pending: não exige evento nativo disponível. Sem evento, o primeiro clique chama setInstructions(true) e retorna. Com evento, marca pending, chama prompt, aguarda userChoice. Dismissed grava dispensa; accepted recolhe o convite, mas não marca standalone. Erros de prompt/userChoice entram em catch sem mensagem de diagnóstico e mostram instruções; finally sempre consome o evento e libera pending.

O segundo clique sem evento repete setInstructions(true); não existe exigência de dois cliques. Em /acesso, o botão compacto durante cooldown apenas reabre o card no primeiro clique, mas isso não corresponde ao relato de card completo já visível no sucesso. Não há log retrospectivo que identifique exatamente qual ramo foi executado no celular. Também não há evidência de stale closure ou de evento consumido previamente no celular.

Cooldown: 14 dias (1.209.600.000 ms), chave pwa-install-dismissed-at, sem leitura de seu valor no celular. Mantém acesso manual ao convite em /acesso. Standalone: display-mode standalone/fullscreen ou navigator.standalone; appinstalled oculta CTA. Chamar prompt, mostrar fallback ou clicar não marca o app como instalado. Ausência de beforeinstallprompt não prova instalação nem incompatibilidade.

Estados atualmente colapsados em event=null: ainda não recebido, indisponível por critérios, navegador sem suporte, consumido após tentativa. Erro e falta de evento produzem as mesmas instruções. Recusa/aceite recolhem o convite, enquanto appinstalled/standalone ocultam por estado separado.

## Evidências de execução

Usado Chrome headless com perfil persistente isolado (não incógnito), viewport mobile, sem identidade/agendamento. A primeira sondagem incógnita foi descartada para conclusões de installability porque o Chrome reportou in-incognito. Ensaios seguintes eliminaram essa restrição.

### 1. Manifest fora do head no booking

Após Visit Site, a origin permaneceu correta e isSecureContext=true. Na rota /agendar/bellory-test-studio, link rel=manifest estava no BODY; document.head não continha o link. Page.getAppManifest retornou URL vazia e Page.getInstallabilityErrors reportou no-manifest. Nenhum beforeinstallprompt foi observado.

Em /acesso, o link estava no HEAD. Em experimento causal limitado ao DOM do perfil descartável, mover o link existente do booking para o head fez Chrome detectá-lo. Nenhum arquivo do SaaS foi modificado. Isso isolou a falha de descoberta do manifest. generateMetadata assíncrono na rota dinâmica é compatível com o comportamento de streaming metadata do Next, que pode colocar tags no body.

### 2. Manifest real substituído pelo aviso ngrok

Ao detectar o link (em /acesso ou no experimento acima), Chrome retornou erro crítico: Line: 1, column: 1, Syntax error. O diagnóstico de installability listou manifest-parsing-or-network-error e erros derivados de start_url, nome, display e ícone.

Observação passiva da requisição automática do navegador confirmou duas vezes: /manifest.webmanifest respondeu HTTP 200, Content-Type text/html, corpo identificado como tela You are about to visit do ngrok, sem JSON; requisição sem Cookie. Nenhum valor de cookie foi registrado. A confirmação Visit Site da navegação principal não bastou para essa requisição automática do manifest.

O arquivo servido diretamente pelo frontend é JSON válido: start_url=/acesso, scope=/, display=standalone, nome presente. PNGs 192x192, 512x512 e maskable 512x512 válidos. A entrada adicional favicon.ico continua 404 (preexistente); isso não explica HTML do ngrok no manifest. HTTP 200 programático anterior não validava a requisição automática de instalação, lacuna desta auditoria anterior.

### 3. Corrida no registro de SW

PwaServiceWorker adiciona um listener de load dentro de useEffect sem verificar document.readyState. Em um ensaio: load ocorreu em 649 ms e listener foi registrado em 705 ms, com readyState=complete. Nenhuma chamada a register ocorreu; registrations=[] e controller ausente. Em outro ensaio, listener entrou em 445 ms e load em 509 ms; register executou, SW ativou e controlou a página em 674 ms. Logo o registro depende da ordem entre load e hidratação. Catch de registro/update silencia erros. O conteúdo do SW não foi alterado.

O manifest continuou inválido no Chrome mesmo no ensaio com SW ativo/controlando. A corrida do SW é falha adicional confirmada, não deve ser tratada como explicação única do prompt.

## Classificação

CONFIRMADOS na origin: impedimentos concretos de installability (manifest não descoberto no booking; HTML ngrok recebido quando descoberto), ausência de beforeinstallprompt nos ensaios e corrida no registro de SW. Não se conclui que o Android seja incompatível ou que a PWA já esteja instalada.

A sequência exata dos dois cliques físicos permanece não reconstruível retrospectivamente. Caminho compatível com o relato: evento ausente → instruções; ou erro silencioso de prompt → instruções e consumo → segundo clique sem evento. O provider já protege o longo intervalo antes da montagem do CTA, mas seu useEffect não garante captura de evento emitido antes da hidratação. Não foi observado evento perdido; foram observados critérios de instalação falhando.

## Correções propostas, NÃO aplicadas

1. Garantir um único link do manifest no head inicial também na rota dinâmica, sem alterar seu JSON, branding ou start_url. Preferir vínculo estável no layout; avaliar streaming metadata de forma pontual.
2. Para esta origin ngrok protegida pela confirmação, avaliar crossorigin=use-credentials no link do manifest, restrito à mesma origin, e validar se a requisição automática passa a receber JSON após Visit Site. Trata-se de proposta ainda não ensaiada: a ferramenta rejeitou a sondagem explícita de credenciais. Não adicionar tokens ou bypass genérico ao SaaS.
3. Registrar SW imediatamente se document.readyState já for complete; caso contrário, escutar load. Preservar conteúdo, escopo e cache conservador.
4. Registrar estados/erros de instalação sem PII e distinguir motivo do fallback. Preservar consentimento e clique nativo; nunca marcar instalada por ausência de evento.

## Próximo ensaio físico

Não limpar dados, remover SW, desinstalar PWA ou trocar hostname. Se a confirmação da sequência física for necessária antes da correção, conectar o mesmo Chrome Android ao DevTools remoto, preservar Console/Network e observar apenas eventos PWA/manifest/SW (sem exportar HAR ou dados de cliente). Anotar presença do evento, disponibilidade no clique e resultado de prompt/userChoice, com dados mínimos. Na tela de sucesso existente, clicar uma vez, aguardar e observar antes de repetir. Evitar novo agendamento apenas para diagnosticar o botão. Depois das correções propostas, repetir na mesma origin e conferir manifest detectado, SW controlando, evento preservado e prompt por clique antes de prosseguir ao roteiro de instalação.

Não foi instrumentado o código entregue ao celular nesta etapa; as evidências já confirmaram os bloqueios técnicos. Evidências locais: installability-compare-1.json, installability-compare-2.json, installability-head-control.json, manifest-transport.json e demais arquivos de installability em .codex-logs/mobile-diagnostic.

## Fontes

- Next streaming metadata: https://nextjs.org/docs/app/api-reference/functions/generate-metadata
- Manifest com credenciais: https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Attributes/crossorigin
- beforeinstallprompt: https://developer.mozilla.org/en-US/docs/Web/API/Window/beforeinstallprompt_event
- prompt por interação e uma vez por evento: https://developer.mozilla.org/en-US/docs/Web/API/BeforeInstallPromptEvent/prompt

Sem alterações em banco, backend, identidade, tokens, preferred-tenant, known-tenants, agenda, taxonomia, .env ou funcionalidade. Sem migration, db push, seed, reset, reconcile, cleanup, commit ou push. git diff --check passou.

FASE 0.6B — CAUSA RAIZ CONFIRMADA — CORREÇÃO PROPOSTA
