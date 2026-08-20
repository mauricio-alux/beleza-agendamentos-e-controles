# Cliente final: confirmacao, cancelamento e reagendamento apos aceite do profissional

Este documento registra o comportamento atual da plataforma para o cliente final
depois que um agendamento solicitado pelo link publico e confirmado pelo
profissional ou responsavel operacional.

Escopo desta auditoria:

- nao altera codigo;
- nao altera banco;
- nao cria migration;
- nao corrige fluxo;
- documenta somente o que esta implementado hoje.

## Resposta direta

Hoje, depois que o profissional confirma um agendamento, o mecanismo disponivel
para o cliente cancelar ou reagendar e baseado em **token operacional do
agendamento**.

Nao existe atualmente uma pagina publica completa de acompanhamento do
agendamento.

O que existe:

- pagina de acao publica: `/acao_agendamento?cmd=confirmar&tk={token}`;
- pagina de cancelamento publica: `/acao_agendamento?cmd=cancelar&tk={token}`;
- pagina de reagendamento publica: `/reagendar?tk={token}`;
- area **Seus horarios** dentro de `/agendar/{tenant_slug}`, exibida somente
  quando o cliente e reconhecido por identidade publica, com links de
  reagendamento e cancelamento quando o agendamento possui contexto
  operacional.

As paginas `/acao_agendamento` e `/reagendar` exibem o botao **Voltar** acima
do titulo principal. O botao tenta retornar pelo historico quando a navegacao
veio de uma pagina anterior do proprio SaaS. Se o cliente abriu o link
diretamente, pelo WhatsApp, QR Code ou nova aba, a pagina usa o contexto do
token para redirecionar para `/agendar/{tenant_slug}`. Se o token nao permitir
identificar o estabelecimento, o fallback e a landing page publica (`/`).
Esse retorno nao altera regras de token, status, horario, tenant, cancelamento
ou reagendamento.

## Parte 1 - Guia do cliente final

### Como o cliente solicita o atendimento

1. O cliente abre o link publico do estabelecimento.
2. Informa ou confirma nome e WhatsApp.
3. Escolhe servico, especialidade, profissional, data e horario.
4. Clica em **Solicitar agendamento**.
5. A tela informa que a solicitacao foi enviada e que o estabelecimento fara a
   confirmacao.

Nesse momento, o atendimento ainda depende do aceite operacional do
estabelecimento.

### Como o cliente fica sabendo que foi confirmado

Quando o profissional ou responsavel confirma o atendimento no painel interno,
o sistema dispara o evento de confirmacao e prepara uma mensagem de WhatsApp
para o cliente.

Na mensagem padrao atual, o cliente ve:

```text
Seu atendimento foi confirmado com sucesso.

Data: [data]
Horario: [horario]
Servico: [servico]
Profissional: [profissional]

Estamos aguardando voce.

Caso precise alterar seu atendimento, utilize uma das opcoes abaixo:

[Reagendar]

[Cancelar]
```

Importante: o template oficial `appointment_confirmed`, armazenado em
`templates_mensagem`, deve declarar as acoes **Reagendar** e **Cancelar**. O
texto visivel nao inclui a URL com `tk`; o link e gerado no momento da
comunicacao a partir do token operacional do agendamento.

### Como reagendar

O cliente consegue reagendar quando possui um link operacional de
reagendamento.

Formato publico atual:

```text
/reagendar?tk={token_operacional_do_agendamento}
```

Na tela de reagendamento, o cliente:

1. confere o atendimento atual;
2. escolhe uma nova data;
3. seleciona um novo horario disponivel;
4. informa uma observacao, se quiser;
5. clica em **Reagendar**.

O que pode ser alterado nessa tela:

- data;
- horario;
- observacao/motivo.

O que nao pode ser alterado nessa tela:

- servico;
- especialidade;
- profissional.

Depois do reagendamento, o status volta para **Aguardando profissional**
(`pendente_atendente`). O novo horario precisa ser confirmado novamente pelo
estabelecimento.

### Como cancelar

O cliente consegue cancelar quando possui um link operacional de cancelamento.

Formato publico atual:

```text
/acao_agendamento?cmd=cancelar&tk={token_operacional_do_agendamento}
```

Na tela de cancelamento, o cliente:

1. confere estabelecimento, servico, profissional, data, valor e status;
2. informa o motivo, se quiser;
3. clica em **Cancelar agendamento**.

Quando conclui, a tela exibe:

```text
Agendamento cancelado com sucesso.
```

O status passa para **Cancelado** (`cancelado`) e o horario deixa de ser
considerado ativo para conflitos futuros.

### Confirmacao pelo cliente

Existe uma pagina publica de confirmacao por token:

```text
/acao_agendamento?cmd=confirmar&tk={token_operacional_do_agendamento}
```

No comportamento atual, essa confirmacao publica so funciona quando o
agendamento esta em status confirmavel, como `pendente` ou
`pendente_atendente`.

Depois que o profissional confirma, o status passa para `pendente_cliente`.
Esse status nao e aceito pela funcao atual de confirmacao por token. Portanto,
na pratica, depois do aceite do profissional, o fluxo publico relevante para o
cliente e tomar ciencia da confirmacao, reagendar ou cancelar.

### Se o link antigo for aberto

Se o atendimento ja estiver cancelado, concluido ou marcado como no-show, o
backend bloqueia novas acoes operacionais de cancelamento e reagendamento.

Se o horario do atendimento ja passou, o backend tambem bloqueia confirmar,
cancelar ou reagendar por token operacional.

## Parte 2 - Fluxo tecnico atual

## Fontes consultadas

Documentacao consultada:

- `README.md`;
- `docs/project-context.md`;
- `docs/roadmap.md`;
- `docs/modules/agenda.md`;
- `docs/modules/booking-publico.md`;
- `docs/modules/crm.md`;
- `docs/modules/whatsapp.md`;
- `docs/flows/`;
- `docs/decisions/012-identidade-progressiva-clientes.md`;
- `docs/decisions/016-mer-servicos-transicao-pre-producao.md`;
- `docs/decisions/017-mer-servicos-plano-operacional.md`;
- `docs/user-guide/agendamento-cliente-final.md`.

Codigo consultado:

- `frontend/src/app/agendar/[slug]/page.tsx`;
- `frontend/src/app/acao_agendamento/page.tsx`;
- `frontend/src/app/reagendar/page.tsx`;
- `frontend/src/components/public-booking/PublicBookingPage.tsx`;
- `frontend/src/components/public-booking/AppointmentActionPage.tsx`;
- `frontend/src/components/public-booking/AppointmentReschedulePage.tsx`;
- `frontend/src/services/public-booking.service.ts`;
- `backend/src/routes/public.routes.js`;
- `backend/src/routes/agenda.routes.js`;
- `backend/src/modules/public-booking/public-booking.controller.js`;
- `backend/src/modules/public-booking/public-booking.service.js`;
- `backend/src/modules/public-booking/public-booking.validators.js`;
- `backend/src/modules/agenda/agenda.service.js`;
- `backend/src/modules/agenda/agenda.repository.js`;
- `backend/src/modules/agenda/domain/appointment-status.js`;
- `backend/src/modules/agenda/domain/appointment-operational-token.js`;
- `backend/src/modules/agenda/events/agenda.events.js`;
- `backend/src/modules/communication/communication.service.js`;
- `backend/src/modules/communication/whatsapp-templates.js`.

## Diagrama real do fluxo

```text
Cliente solicita pelo link publico
        |
        v
Agendamento criado como pendente_atendente
        |
        v
Profissional/responsavel visualiza no painel interno
        |
        v
Profissional confirma no endpoint interno
        |
        v
Status passa para pendente_cliente
        |
        v
Evento appointment.confirmed gera comunicacao ao cliente
        |
        v
Cliente toma ciencia por WhatsApp ou ao retornar ao link publico reconhecido
        |
        v
Cliente decide
   |                         |
   v                         v
/reagendar?tk=...     /acao_agendamento?cmd=cancelar&tk=...
   |                         |
   v                         v
pendente_atendente       cancelado
```

## Transicoes de status

| Etapa | Quem age | Status antes | Acao | Status depois |
| --- | --- | --- | --- | --- |
| Solicitacao publica | Cliente final | nenhum | Solicitar agendamento em `/agendar/{slug}` | `pendente_atendente` |
| Solicitacao suspeita | Cliente final | nenhum | Solicitar com identidade suspeita | `suspeito` |
| Confirmacao operacional | Profissional/responsavel | `pendente_atendente` ou `pendente` | Confirmar no painel interno | `pendente_cliente` |
| Confirmacao por token legado | Cliente final | `pendente_atendente` ou `pendente` | `/acao_agendamento?cmd=confirmar&tk=...` | `pendente_cliente` |
| Reagendamento por token | Cliente final | status nao terminal e horario futuro | `/reagendar?tk=...` | `pendente_atendente` |
| Cancelamento por token | Cliente final | status nao terminal e horario futuro | `/acao_agendamento?cmd=cancelar&tk=...` | `cancelado` |
| Conclusao interna | Admin/profissional | `pendente_cliente` ou `confirmado` | Concluir no painel | `concluido` |
| No-show interno | Admin/profissional | `pendente_cliente` ou `confirmado`, apos inicio | Marcar no-show | `no_show` |

## Confirmacao pelo profissional

Tela/processo atual:

- painel interno de Agenda;
- rota backend: `PATCH /agenda/:id/confirmar`;
- controller: `agenda.controller.confirm`;
- service: `agendaService.confirm`;
- permissao: `agenda.confirm`, `agenda.write` ou `agenda.manage`.

Status:

- antes: `pendente_atendente` ou `pendente`;
- depois: `pendente_cliente`.

Metadados registrados:

- `confirmado_por: "atendente"`;
- `confirmado_por_atendente_em`;
- `confirmation_policy`;
- `pending_client_expires_at`;
- `event_type_override: appointment.confirmed`.

Eventos/comunicacao:

- o `updateStatus` publica `appointment.confirmed`;
- o modulo de comunicacao resolve destinatario cliente;
- cria log em `mensagens_whatsapp`, quando ha telefone valido;
- se o ambiente estiver em envio real, o envio depende de template aprovado;
- se o ambiente estiver em dry-run, o envio e simulado/registrado.

## Como o cliente toma ciencia

Regra funcional existente:

- o evento `appointment.confirmed` gera mensagem para o cliente;
- a mensagem informa que o atendimento foi confirmado;
- a mensagem contem placeholders visuais `[Reagendar]` e `[Cancelar]`;
- o template oficial contem `metadata.actions` para `reschedule` e `cancel`;
- o payload da mensagem contem acoes `reschedule` e `cancel` com
  `appointment_token` e URLs operacionais geradas no momento do envio.

Envio real atualmente disponivel no ambiente:

- o envio real depende do provider WhatsApp, templates aprovados e
  configuracao do ambiente;
- quando `WHATSAPP_DRY_RUN=true`, o sistema nao deve ser tratado como envio
  real ao cliente: ele registra/simula a mensagem.

Outro mecanismo disponivel:

- se o cliente voltar para `/agendar/{tenant_slug}` e for reconhecido por
  token de identidade, a area **Seus horarios** pode listar agendamentos
  futuros e exibir links de **Reagendar** e **Cancelar**.

## Links e tokens enviados ao cliente

O token operacional e gerado no momento da criacao do agendamento e salvo no
campo `token_confirmacao`.

Formatos conceituais:

```text
/acao_agendamento?cmd=confirmar&tk={token_operacional}
/acao_agendamento?cmd=cancelar&tk={token_operacional}
/reagendar?tk={token_operacional}
```

O builder de links usa `PUBLIC_APP_URL`, `FRONTEND_URL`, `bookingBaseUrl` ou
`appUrl` para compor a URL absoluta.

Nao ha exposicao de ID de agendamento na URL publica. O token localiza o
agendamento no backend.

## Pagina publica de acompanhamento

NÃO EXISTE ATUALMENTE UMA PÁGINA PÚBLICA COMPLETA DE ACOMPANHAMENTO DO AGENDAMENTO.

O que existe e parcial:

- `/agendar/{tenant_slug}`: pagina publica principal de booking;
- bloco **Seus horarios**: aparece apenas quando o cliente e reconhecido;
- endpoint: `GET /public/booking/:slug/client/appointments/upcoming?token=...`;
- identificacao: token de identidade do cliente, nao token operacional do
  agendamento;
- dados exibidos: servico, data/hora, profissional, status bruto e links
  operacionais de reagendar/cancelar quando existirem.

Nao existe rota como `/agendamento/{id}` ou `/agendamento/{token}` para uma
visao completa e dedicada de acompanhamento.

## Cancelamento pelo cliente

Fluxo real:

```text
Cliente abre link de cancelamento
        |
        v
/acao_agendamento?cmd=cancelar&tk={token}
        |
        v
Frontend carrega contexto por GET /public/booking/appointments/action
        |
        v
Cliente confere dados e pode informar motivo
        |
        v
POST /public/booking/appointments/action
        |
        v
agendaService.cancelByOperationalToken
        |
        v
status cancelado
        |
        v
evento appointment.cancelled
```

Detalhes:

- identidade validada pelo `token_confirmacao`;
- nao exige login;
- nao recebe tenant_id nem appointment_id do cliente;
- o backend busca o agendamento pelo token;
- valida que o status nao seja terminal;
- valida que `data_inicio` ainda esteja no futuro;
- motivo e opcional para cancelamento via link operacional;
- o status produzido e `cancelado`;
- o evento `appointment.cancelled` e publicado;
- quando a origem e `link_operacional`, o modulo de comunicacao tambem inclui
  destinatario `salon`.

Impacto no horario:

- agendamentos cancelados deixam de fazer parte dos status ativos usados para
  conflito/disponibilidade.

Comportamento posterior da pagina:

- apos sucesso, a pagina mostra `Agendamento cancelado com sucesso.`;
- o botao fica desabilitado porque a mensagem de sucesso permanece;
- se o link for usado novamente, o backend tende a retornar erro de status
  invalido para nova acao.

## Reagendamento pelo cliente

Fluxo real:

```text
Cliente abre link de reagendamento
        |
        v
/reagendar?tk={token}
        |
        v
GET /public/booking/appointments/token/{token}
        |
        v
Frontend exibe atendimento atual
        |
        v
Cliente escolhe nova data e horario
        |
        v
GET /public/booking/{slug}/availability
        |
        v
POST /public/booking/appointments/reschedule
        |
        v
agendaService.rescheduleByOperationalToken
        |
        v
status pendente_atendente
        |
        v
evento appointment.rescheduled
```

Preservado do agendamento original:

- estabelecimento;
- cliente;
- servico;
- especialidade registrada no agendamento;
- profissional;
- token operacional.

Pode alterar:

- data;
- horario;
- observacao/motivo.

Nao pode alterar:

- profissional;
- servico;
- especialidade.

Obtencao de novos horarios:

- o frontend chama disponibilidade publica com `data`, `profissional_id` e
  `servico_id`;
- o backend de reagendamento valida o slot com o servico e a especialidade do
  agendamento original;
- conflitos sao checados ignorando o proprio agendamento original.

Lacuna tecnica identificada:

- a chamada frontend de disponibilidade em `/reagendar` nao envia
  `especialidade_id`;
- em servicos com multiplas especialidades compativeis, a consulta de horarios
  pode falhar ou divergir da validacao final do backend.

Status produzido:

- `pendente_atendente`.

Comunicacao:

- publica `appointment.rescheduled`;
- quando a origem e `link_operacional`, o modulo de comunicacao inclui tambem
  destinatario `salon`;
- o cliente recebe mensagem de reagendamento conforme configuracao de
  comunicacao.

## Confirmacao do cliente

Existe implementacao publica para confirmar por token:

- rota frontend: `/acao_agendamento?cmd=confirmar&tk={token}`;
- endpoint GET de contexto: `/public/booking/appointments/action?cmd=confirmar&tk={token}`;
- endpoint POST: `/public/booking/appointments/action`;
- service: `agendaService.confirmByOperationalToken`.

Mas a confirmacao por token permite somente status confirmaveis:

- `pendente`;
- `pendente_atendente`.

Depois da confirmacao do profissional, o status passa para `pendente_cliente`.
Esse status nao e aceito por `canConfirmAppointment`. Portanto, a etapa
"cliente confirma depois que o profissional confirmou" esta inconsistente com
o nome do status e nao funciona como uma segunda confirmacao publica normal no
codigo atual.

Classificacao: **PENDÊNCIA**, porque existem rotas e template
`appointment.pending_client`, mas o fluxo principal de `appointment.confirmed`
nao envia link visivel de confirmar ao cliente e a acao de confirmar nao aceita
`pendente_cliente`.

## Token e seguranca

Token operacional:

- nome de campo: `token_confirmacao`;
- formato gerado: prefixo `apt_` + bytes aleatorios em base64url;
- gerado na criacao do agendamento;
- salvo no proprio registro de `agendamentos`;
- reutilizado para confirmar, cancelar e reagendar;
- validado no backend por busca exata;
- nao exibe ID do agendamento na URL.

Expiracao:

- nao foi encontrada expiracao propria do token operacional;
- as acoes sao bloqueadas quando o atendimento nao e futuro;
- cancelamento e reagendamento sao bloqueados para status terminais.

Risco:

- se o token operacional vazar, quem possuir o link pode executar as acoes
  permitidas enquanto o agendamento estiver em status valido e futuro.

## Isolamento por estabelecimento

O fluxo publico por token nao aceita `tenant_id` arbitrario do cliente.

Validacoes encontradas:

- `findAppointmentByOperationalToken` busca o agendamento pelo token salvo;
- as operacoes usam `appointment.tenant_id` encontrado no proprio registro;
- atualizacoes de status usam `tenant_id` e `id` do agendamento localizado;
- proximos horarios em `/agendar/{slug}` usam token de identidade resolvido
  dentro do estabelecimento do slug.

Com isso, o cliente nao manipula IDs arbitrarios para cancelar ou reagendar
outro estabelecimento. A seguranca depende da confidencialidade do token operacional.

## Acoes disponiveis por status

| Status real | Confirmar por token | Reagendar por token | Cancelar por token | Motivo |
| --- | ---: | ---: | ---: | --- |
| `pendente` | Sim | Sim, se futuro | Sim, se futuro | Status legado confirmavel e nao terminal |
| `pendente_atendente` | Sim, se futuro | Sim, se futuro | Sim, se futuro | Aguardando aceite operacional |
| `pendente_cliente` | Nao | Sim, se futuro | Sim, se futuro | Nao e confirmavel, mas nao e terminal |
| `confirmado` | Nao | Sim, se futuro | Sim, se futuro | Status de execucao, nao terminal |
| `suspeito` | Nao | Sim, se futuro | Sim, se futuro | Nao terminal, mas fluxo suspeito exige cautela operacional |
| `cancelado` | Nao | Nao | Nao | Status terminal |
| `concluido` | Nao | Nao | Nao | Status terminal |
| `no_show` | Nao | Nao | Nao | Status terminal |
| `no-show` | Nao | Nao | Nao | Alias tratado como terminal |
| `expirado_atendente` | Nao | Sim, se futuro | Sim, se futuro | Nao aparece na lista terminal atual |
| `expirado_cliente` | Nao | Sim, se futuro | Sim, se futuro | Nao aparece na lista terminal atual |

Observacao: a matriz acima reflete os guards atuais de codigo. Ela nao significa
que todos esses estados deveriam ser liberados do ponto de vista de produto.

## Agendamento cancelado

Ao abrir novamente um link de acao de um agendamento cancelado:

- o contexto pode ser carregado pelo token;
- ao tentar cancelar, reagendar ou confirmar, o backend bloqueia a acao por
  status terminal;
- a tela mostra a mensagem de erro retornada pelo backend.

Nao ha pagina publica dedicada para explicar um agendamento cancelado com
historico completo.

## Agendamento concluido

`concluido` e status terminal.

Cancelamento e reagendamento por token sao bloqueados. Confirmacao por token
tambem nao e permitida.

## Agendamento no-show

`no_show` e `no-show` sao tratados como terminais.

Cancelamento e reagendamento por token sao bloqueados. Confirmacao por token
tambem nao e permitida.

## Expiracao e validade dos links

Protecoes encontradas:

- confirmar por token exige horario futuro;
- cancelar por token exige horario futuro;
- reagendar por token exige horario futuro;
- cancelar/reagendar bloqueiam status terminal;
- confirmar por token aceita somente `pendente` e `pendente_atendente`.

Protecoes nao encontradas:

- expiracao propria do token operacional;
- prazo minimo publico para cancelar;
- prazo minimo publico para reagendar;
- invalidacao automatica do token apos primeiro uso;
- pagina publica explicando link expirado por regra operacional.

## WhatsApp e acoes

| Evento | Destinatario | Mensagem | Possui acao/link? |
| --- | --- | --- | --- |
| `appointment.created` | Cliente | Solicitude recebida; aguarde confirmacao | Sem links visiveis |
| `appointment.pending_attendant` | Salao/profissional | Agendamento aguardando confirmacao | Acoes `confirm` e `open_agenda` no payload |
| `appointment.pending_client` | Cliente | Pede para confirmar presenca | Links `confirmar`, `cancelar`, `reagendar` quando nao sanitizado |
| `appointment.confirmed` | Cliente | Atendimento confirmado | Texto com `[Reagendar]` e `[Cancelar]`; template DB com actions `reschedule` e `cancel`; payload com URLs operacionais |
| `appointment.rescheduled` | Cliente | Atendimento reagendado | Sem link visivel no fallback |
| `appointment.rescheduled` | Salao, quando origem cliente | Cliente reagendou atendimento | Sem link visivel no fallback |
| `appointment.cancelled` | Cliente | Atendimento cancelado | Acao de agendar novamente no payload |
| `appointment.cancelled` | Salao, quando origem cliente | Cliente cancelou atendimento | Sem link visivel no fallback |
| `appointment.reminder_24h` | Cliente | Lembrete de 24h | Sem link visivel no fallback |
| `appointment.reminder_2h` | Cliente | Lembrete de 2h | Sem link visivel no fallback |
| `appointment.completed` | Cliente | Pos-atendimento | Sem link visivel no fallback |
| `appointment.no_show` | Cliente | Cliente nao compareceu | Acao de agendar novamente no payload |

## Botoes Reagendar e Cancelar

Classificacao atual: **A - ja possuem rotas funcionais e actions da plataforma
oficiais**, com uma observacao importante.

Existe rota funcional por tras:

- `/reagendar?tk={token}`;
- `/acao_agendamento?cmd=cancelar&tk={token}`.

Mas, no evento `appointment.confirmed`, o texto fallback mostra apenas:

```text
[Reagendar]
[Cancelar]
```

Os links visiveis continuam fora do corpo textual. As acoes ficam no payload da
mensagem (`actions`) com `appointment_token` e URL operacional. A conversao
disso em botao clicavel, CTA ou componente Meta depende da camada de
provider/template.

## Classificacao das funcoes

| Funcao | Classificacao | Observacao |
| --- | --- | --- |
| Solicitar agendamento publico | Implementada e funcional | `/agendar/{slug}` |
| Confirmar pelo profissional | Implementada e funcional | Painel interno + `PATCH /agenda/:id/confirmar` |
| Comunicar cliente por WhatsApp | Implementada parcialmente | Gera/agenda mensagem; envio real depende do ambiente |
| Visualizar agendamento em pagina publica completa | Documentada como lacuna | Nao existe pagina dedicada completa |
| Listar proximos horarios no link publico | Implementada parcialmente | Requer identidade reconhecida |
| Confirmar por token publico | Implementada parcialmente | Existe, mas nao aceita `pendente_cliente` |
| Cancelar por token publico | Implementada e funcional | Requer token, status nao terminal e horario futuro |
| Reagendar por token publico | Implementada e funcional | Availability publica envia a especialidade original na consulta de slots |
| Botoes WhatsApp `[Reagendar]` e `[Cancelar]` | Implementados e funcionais como actions da plataforma | Link visivel ainda depende da representacao do provider |

## Pergunta principal

### A. Como o cliente toma ciencia da confirmacao?

- pagina/rota: nao ha pagina dedicada; pode retornar a `/agendar/{slug}` se
  tiver identidade reconhecida;
- mensagem: `appointment.confirmed`;
- token: `token_confirmacao` no payload de acoes;
- status: profissional muda para `pendente_cliente`;
- implementacao atual: gera comunicacao ao cliente, envio real depende do
  ambiente.

### B. Como o cliente visualiza o atendimento?

- pagina/rota: parcialmente em `/agendar/{slug}`, bloco **Seus horarios**;
- endpoint: `GET /public/booking/:slug/client/appointments/upcoming`;
- token: token de identidade do cliente, nao token operacional;
- status: mostra status bruto;
- implementacao atual: parcial, sem pagina completa de acompanhamento.

### C. Como o cliente confirma o atendimento?

- pagina/rota: `/acao_agendamento?cmd=confirmar&tk={token}`;
- endpoint: `POST /public/booking/appointments/action`;
- token: token operacional;
- status aceito: `pendente` ou `pendente_atendente`;
- implementacao atual: parcial/inconsistente para o momento posterior ao aceite
  do profissional, pois `pendente_cliente` nao e confirmavel.

### D. Como o cliente cancela?

- pagina/rota: `/acao_agendamento?cmd=cancelar&tk={token}`;
- endpoint: `POST /public/booking/appointments/action`;
- token: token operacional;
- status: qualquer status nao terminal, desde que o horario seja futuro;
- resultado: `cancelado`;
- implementacao atual: funcional.

### E. Como o cliente reagenda?

- pagina/rota: `/reagendar?tk={token}`;
- endpoint: `POST /public/booking/appointments/reschedule`;
- token: token operacional;
- status: qualquer status nao terminal, desde que o horario seja futuro;
- resultado: `pendente_atendente`;
- implementacao atual: funcional; a consulta de disponibilidade usa a
  especialidade original do agendamento.

## Lacunas

### BLOQUEADOR

- Nao existe pagina publica completa de acompanhamento do agendamento.
- A confirmacao pelo cliente apos o aceite do profissional esta inconsistente:
  o status vira `pendente_cliente`, mas a acao publica de confirmar nao aceita
  esse status.

### PENDENCIA

- Exibir status amigavel em vez de status bruto no bloco **Seus horarios**.
- Documentar ou implementar expiracao propria do token operacional.
- Definir prazo minimo para cancelamento/reagendamento pelo cliente, se essa
  for a regra de produto.
- Criar tela publica dedicada para acompanhamento completo, caso o produto
  deseje esse fluxo.

## Documentacao que precisa ser atualizada

- Documentos antigos que tratam `confirmado` como destino principal da
  confirmacao operacional devem refletir que o fluxo atual usa
  `pendente_atendente` -> `pendente_cliente`.
- Documentos que sugerirem pagina publica completa de acompanhamento devem
  indicar que hoje ela nao existe.
- Documentos que tratarem `[Reagendar]` e `[Cancelar]` como links visiveis no
  texto da mensagem devem explicar que as URLs ficam em `payload.actions` e que
  a renderizacao como botao depende do provider.
