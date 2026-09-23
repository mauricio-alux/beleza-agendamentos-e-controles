# Fase 0.6B — diagnóstico remoto após aceite

Não repetir instalação nesta etapa. Não recarregar, limpar armazenamento, remover SW, atualizar aplicativos, trocar origin ou modificar o projeto.

## Resultado disponível no notebook

Em 11/09/2026, na origin https://slurp-confess-zombie.ngrok-free.dev, GET sem cookies, autenticação ou header de bypass mostrou:

| Recurso | User-Agent Chrome Android sem cookie | curl padrão sem cookie |
| --- | --- | --- |
| manifest.webmanifest | 200 text/html (aviso ngrok confirmado) | 200 application/manifest+json |
| três ícones PNG | 200 text/html | 200 image/png |
| sw.js | 200 text/html | 200 application/javascript |
| acesso | 200 text/html | 200 text/html; charset=utf-8 |

TLS validado; nenhum redirecionamento HTTP nesses testes. User-Agent sintético não reproduz o instalador WebAPK. Logo, a interferência existe, mas sua relação com a falha pós-aceite ainda não está demonstrada.

Manifest entregue: name/short_name MyEsthya (configuração central), start_url=/acesso, scope=/, display=standalone, sem id explícito. Não há justificativa causal para adicionar id. Ícones baixados sem bypass foram comparados com os locais e decodificados para verificar dimensões e transparência.

## Preparação no mesmo Android

1. Registrar somente versão Android, versão Chrome, nome do launcher, disponibilidade/versão do Google Play Services e se a Play Store indica atualização pendente de Chrome/Play Services. Não atualizar. Modelo apenas se necessário; não registrar contas, serial, IMEI ou outras abas.
2. Se ainda não habilitado, em Configurações > Sobre o telefone > Informações de software, tocar sete vezes em Número da versão para liberar Opções do desenvolvedor (o caminho varia). Digitar eventual PIN somente no aparelho.
3. Habilitar Depuração USB nas Opções do desenvolvedor exclusivamente para conectar o diagnóstico. Não mudar outras configurações.
4. Conectar por cabo USB de dados ao notebook. Aceitar no aparelho a autorização RSA deste notebook.
5. No Chrome do notebook, abrir chrome://inspect/#devices e marcar Discover USB devices.
6. Identificar apenas a aba já aberta da origin acima e clicar Inspect. Não abrir outra aba nem recarregar a existente. Manter o screencast desligado para não capturar dados pessoais.
7. Console: habilitar Preserve log, timestamps e nível Info. Filtrar [PWA]. Copiar somente eventos estáticos; não exportar console inteiro ou HAR.

Fonte: https://developer.chrome.com/docs/devtools/remote-debugging/

## Único próximo teste: inspeção passiva da sessão existente

Objetivo: conectar DevTools e observar estado atual/logs preservados, sem executar novamente Instalar. Esta conexão não recupera eventos antigos que não foram preservados.

No Console, executar o observador abaixo. Ele não solicita instalação, não chama preventDefault, não escreve no armazenamento e não lê DOM, cookies ou identidade. Registra apenas eventos futuros; o resultado userChoice só será observável se um novo beforeinstallprompt ocorrer naturalmente. Os eventos CTA/prompt/userChoice da aplicação já usam o prefixo [PWA]. Uma instalação via menu nativo pode não passar pelo CTA ou prompt() da aplicação.

```js
(() => {
  if (window.__pwaPassiveDiagnostics) return;
  window.__pwaPassiveDiagnostics = true;
  const log = (event, data = {}) => console.info('[PWA-REMOTE]', JSON.stringify({at: new Date().toISOString(), event, ...data}));
  const media = matchMedia('(display-mode: standalone)');
  const state = () => log('state', {
    runningStandalone: media.matches,
    visibility: document.visibilityState,
    focused: document.hasFocus(),
    serviceWorkerControlled: !!navigator.serviceWorker?.controller,
    controllerState: navigator.serviceWorker?.controller?.state || 'none'
  });
  addEventListener('beforeinstallprompt', e => {
    log('beforeinstallprompt');
    e.userChoice.then(c => log('userChoice', {outcome: c.outcome, installPromptAccepted: c.outcome === 'accepted'})).catch(() => log('userChoice unavailable'));
  });
  addEventListener('appinstalled', () => { log('appinstalled', {appInstalledEventReceived: true}); state(); });
  for (const event of ['focus', 'blur', 'pagehide']) addEventListener(event, () => {log(event); state();});
  document.addEventListener('visibilitychange', () => {log('visibilitychange'); state();});
  media.addEventListener('change', state);
  navigator.serviceWorker?.addEventListener('controllerchange', state);
  navigator.serviceWorker?.getRegistrations().then(rs => log('service worker state', {
    registrations: rs.map(r => ({active: r.active?.state || 'none', waiting: r.waiting?.state || 'none', installing: r.installing?.state || 'none'}))
  })).catch(() => log('service worker state unavailable'));
  state();
})();
```

Inspecionar Application > Manifest e Service Workers, sem Update/Unregister/Clear storage. Anotar somente erros, estado e campos públicos do manifest. No Network, restringir a manifest.webmanifest, sw.js e /icons/: status, MIME e eventual aviso HTML; não copiar cookies/headers/URLs de APIs de clientes.

Se a versão disponibilizar chrome://webapks, consultar apenas a entrada desta origin, sem comandos de atualização, remoção ou nova instalação. Ausência da página não indica erro da PWA. Erros internos do instalador podem não aparecer no DevTools da aba; diagnóstico posterior do sistema deve ser filtrado para WebAPK e sanitizado, nunca um logcat integral.

Critério de saída: versões e estados do dispositivo, eventos realmente preservados, display-mode real e eventuais erros WebAPK disponíveis. Se faltarem eventos passados, registrar NÃO FOI POSSÍVEL DETERMINAR. Só então planejar eventual reprodução instrumentada, sem pedir outra instalação agora.

## Limites da interpretação

- A aba normal pode continuar display-mode=browser mesmo após uma instalação bem-sucedida. false não prova falha; appinstalled também não prova execução standalone.
- O provider atual define standalone=true ao receber appinstalled. Isso é estado de UI, não medição do modo real. Nenhuma alteração aplicada.
- No Android/WebAPK, appinstalled pode anteceder a conclusão do pacote: https://web.dev/learn/pwa/detection
- WebAPK é o mecanismo esperado em Chrome/Android compatível para sites elegíveis, mas o mecanismo efetivo deste aparelho depende de evidência: https://chromium.googlesource.com/chromium/src/+/refs/heads/main/chrome/android/webapk/README.md
- O aviso ngrok varia com User-Agent/header: https://ngrok.com/docs/errors/err_ngrok_6024
- Sem id, identidade deriva do start_url; não é por si só erro: https://developer.chrome.com/docs/capabilities/pwa-manifest-id

Classificação atual: camada AINDA NÃO DETERMINADA; causa raiz AINDA NÃO DETERMINADA. Não considerar instalada, nem manter localização do ícone como hipótese principal. Sem correção funcional, banco, commit ou push.
