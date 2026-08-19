# Links de Campanha e Links Individuais

## Assinatura institucional dinamica

Mensagens destinadas ao cliente recebem automaticamente, depois da renderizacao
do conteudo funcional e antes da gravacao em `mensagens_whatsapp`, a assinatura:

`Mensagem automatica enviada pela plataforma {PLATFORM_NAME}.`

O nome vem de `PLATFORM_NAME`, com compatibilidade temporaria para `APP_NAME`.
A assinatura nao faz parte de `templates_mensagem` e o formatador impede que ela
seja adicionada mais de uma vez. Mensagens operacionais internas destinadas ao
salao nao recebem essa assinatura.

WhatsApp, SMS, push e outros canais textuais usam somente texto. E-mail, HTML,
portal, dashboard, web e PDF podem usar o formatador visual, que apresenta o
logotipo de `PLATFORM_LOGO_URL` ao lado do texto institucional. A configuracao
mantem compatibilidade com `APP_LOGO_URL`.

No frontend, as variaveis publicas equivalentes sao
`NEXT_PUBLIC_PLATFORM_NAME`, `NEXT_PUBLIC_PLATFORM_LOGO_URL` e
`NEXT_PUBLIC_PLATFORM_WEBSITE`.

Mensagens podem usar o link generico
`/agendar/:slug?campanha=:campanha` ou o link individual
`/agendar/:slug?tk=:token`.

O link individual nao contem PII. A API autenticada
`POST /clients/:id/booking-token` gera o token para integracoes de campanha e
WhatsApp. A validade e configuravel e a reemissao revoga o token anterior do
mesmo cliente e tenant.

## Modos oficiais de operacao para campanhas

O Bellory deve tratar a entrega de campanhas WhatsApp como uma capacidade do
tenant, nao como uma entidade de campanha separada.

| Capacidade do tenant | Modo Bellory | Comportamento |
| --- | --- | --- |
| WhatsApp Business API/Cloud API disponivel | Automatico | Gera mensagens individuais, registra `campanha_envios`, enfileira em `mensagens_whatsapp` e acompanha status tecnico. |
| WhatsApp Business App sem Cloud API | Assistido | Gera mensagem e link, permite copiar/compartilhar/abrir WhatsApp e orienta uso de Lista de Transmissao. |
| WhatsApp Messenger comum | Assistido | Mesmo fluxo assistido, respeitando as limitacoes do aplicativo comum. |

No modo assistido, o Bellory nao envia a mensagem pela Meta nem deve prometer
entrega, leitura, falha ou webhook. O sistema pode registrar que a campanha foi
preparada e, se houver acao explicita do usuario, que o envio manual foi
confirmado pelo usuario.

Listas de Transmissao possuem uma limitacao importante: a entrega ocorre apenas
para contatos que tenham salvo o numero do profissional ou salao na agenda do
celular. Esse modo tende a funcionar melhor para clientes recorrentes e nao
substitui WhatsApp Business API nem midia paga para prospeccao de novos
clientes.

## Primeiro convite x relacionamento continuo

O primeiro convite para agendamento e um fluxo de ativacao inicial, diferente
das campanhas recorrentes.

No primeiro convite, o destinatario pode existir apenas nos contatos ou no
WhatsApp do tenant. Ele ainda nao precisa estar cadastrado no Bellory. O fluxo
preferencial e assistido:

```text
Bellory prepara mensagem + link publico
  -> tenant copia/compartilha/abre WhatsApp
  -> tenant envia manualmente pelo WhatsApp App/Business App
  -> contato acessa /agendar/{tenant_slug}
  -> Bellory identifica ou solicita dados
  -> cliente passa a existir no tenant
```

Tenants que possuem WhatsApp Business App + Cloud API em coexistencia tambem
podem usar esse fluxo assistido para o primeiro convite. A existencia de Cloud
API nao obriga uso da API nesse momento, porque a base de contatos do aplicativo
nao fica automaticamente disponivel para o Bellory.

A Cloud API permanece indicada para relacionamento continuo, quando o Bellory
ja conhece os destinatarios e pode aplicar regras de template aprovado,
consentimento, opt-out, segmentacao, `mensagens_whatsapp` e auditoria tecnica.

## Campanhas sugeridas e modos de execucao

A ausencia de Cloud API propria do tenant nao significa que toda campanha deva
ser assistida. A preferencia do tenant deve orientar a execucao:

- envio assistido pelo WhatsApp do tenant;
- envio pela infraestrutura WhatsApp do SaaS, quando disponivel;
- decisao a cada campanha.

No envio pela infraestrutura do SaaS, a mensagem deve identificar o salao ou
profissional responsavel pela comunicacao e a plataforma configurada por
ambiente, como `{PLATFORM_NAME}`. Nao fixar "Bellory" em codigo ou template
quando o branding centralizado ja existir.

Antes de envio real, manter as validacoes: campanha aprovada, parametros
obrigatorios, destinatario elegivel, telefone valido, consentimento quando
exigido, ausencia de opt-out, template adequado e template aprovado quando
`WHATSAPP_DRY_RUN=false`.

Antes de criar `campanha_envios` ou `mensagens_whatsapp`, o destinatario deve
ter passado pela elegibilidade central de campanhas. Usuarios internos do tenant
nao devem gerar mensagens de campanha em dry-run, modo assistido ou envio real.
O motivo operacional recomendado e `usuario_interno_tenant`.

## Mensagens operacionais implementadas

O modulo de Agenda ja prepara mensagens operacionais de WhatsApp para os
principais eventos do atendimento. A partir da primeira versao do WhatsApp
Operacional, a preparacao, envio e auditoria passam pela camada centralizada
`CommunicationService`.

Nesta etapa, o Bellory e o proprietario da integracao com a WhatsApp Business
Cloud API. Tenants nao precisam possuir WABA propria, Meta Business Manager,
templates proprios ou webhooks proprios. Toda comunicacao operacional usa a
infraestrutura central do Bellory.

Fluxo oficial:

```text
Modulo de negocio
  -> evento operacional
  -> CommunicationService
  -> templates_mensagem (tenant especifico ou catalogo global ativo)
  -> mensagens_whatsapp (fila/auditoria com idempotency_key)
  -> whatsapp.process / processPendingWhatsAppMessages
  -> WhatsApp MySaaS Provider
  -> Meta Cloud API
  -> webhook Meta
  -> atualizacao de status em mensagens_whatsapp
```

Nenhum modulo de negocio deve chamar a Meta diretamente. A Agenda apenas emite
eventos; o `CommunicationService` monta mensagens, escolhe destinatarios,
registra logs e enfileira o envio em `mensagens_whatsapp`. A chamada externa ao
provider acontece somente pelo processador da fila. Falhas de envio sao
auditadas e nao interrompem o fluxo operacional.

A duplicidade e bloqueada em duas camadas: consulta previa por
tenant/agendamento/evento/destinatario e indice unico parcial em
`mensagens_whatsapp.idempotency_key`. A chave usa tenant, evento, agendamento,
destinatario, tipo de lembrete/tentativa e horario agendado quando existir.

## Templates configuraveis e auditoria

O fluxo operacional de WhatsApp usa `templates_mensagem` como catalogo
configuravel de modelos por tenant e mantem `mensagens_whatsapp` como
log/fila/auditoria dos envios.

A manutencao de `templates_mensagem` e feita pelo MasterAdmin na area
`/admin/comunicacao/templates`, dentro do modulo SaaS "Comunicacao". A tela
permite criar templates globais (`tenant_id` vazio) ou especificos por tenant,
editar conteudo, variaveis, status ativo, aprovacao no provider e metadados da
Meta. Administradores de tenant nao possuem acesso a essa manutencao.

Os campos de provider e de acoes operacionais que nao existem como colunas
fisicas em `templates_mensagem` ficam em `metadata`: `provider_template_name`,
`language`, `categoria_provider`, `ultima_sincronizacao_provider`,
`observacoes`, `actions`, `required_actions` e `provider_buttons`.

## Catalogo operacional interno

A migration `20260709110000_operational_whatsapp_templates.sql` mantem o
catalogo operacional essencial de WhatsApp em `templates_mensagem`. Os
registros sao globais (`tenant_id = null`), `canal = whatsapp`,
`tipo = operacional`, `ativo = true` e `aprovado_provider = false`.
A migration `20260811100000_appointment_confirmed_actions.sql` formaliza
`appointment_confirmed` como a comunicacao operacional pos-confirmacao do
profissional e exige as acoes Bellory `reschedule` e `cancel`.

Esse catalogo existe para manutencao, visualizacao, simulacao, dry-run e
geracao interna de mensagens antes da aprovacao pela Meta. Envio real com
`WHATSAPP_DRY_RUN=false` continua bloqueado quando `aprovado_provider` nao for
`true` ou quando `provider_template_name`/`language` nao estiverem preenchidos.

Templates operacionais iniciais:

| Template | Destino |
| --- | --- |
| `appointment_created` | Cliente |
| `appointment_rescheduled` | Cliente |
| `appointment_confirmed` | Cliente |
| `appointment_cancelled` | Cliente |
| `appointment_cancelled_by_client` | Cliente |
| `appointment_cancelled_by_attendant` | Cliente |
| `appointment_reminder_24h` | Cliente |
| `appointment_reminder_2h` | Cliente |
| `appointment_completed` | Cliente |
| `appointment_no_show_client` | Cliente |
| `appointment_cancelled_salon` | Salao |
| `appointment_rescheduled_salon` | Salao |
| `appointment_pending_attendant_operational` | Salao |
| `appointment_pending_attendant_reminder_60m` | Salao |
| `appointment_pending_attendant_reminder_30m` | Salao |
| `appointment_no_show_salon` | Salao |

Ao aprovar um template na Meta, o MasterAdmin deve atualizar o registro na tela
`/admin/comunicacao/templates`, conferindo `provider_template_name`,
`language = pt_BR`, `categoria_provider = Utility` e marcando
`aprovado_provider = true`.

## Templates para uso na Meta

Todo registro de `templates_mensagem` com `canal = whatsapp` deve manter
`conteudo` no formato oficial copiavel para o WhatsApp Manager da Meta, usando
parametros posicionais: `{{1}}`, `{{2}}`, `{{3}}` e assim por diante. Os nomes
semanticos continuam em `variaveis`, como lista ordenada.

Mapeamento operacional base:

| Variavel Bellory | Parametro Meta |
| --- | --- |
| `nome_cliente` | `{{1}}` |
| `nome_salao` | `{{2}}` |
| `nome_servico` | `{{3}}` |
| `nome_profissional` | `{{4}}` |
| `data_agendamento` | `{{5}}` |
| `hora_agendamento` | `{{6}}` |
| `motivo_cancelamento` | `{{7}}` |

A correspondencia e posicional: `{{1}}` representa o primeiro item de
`variaveis`, `{{2}}` o segundo, e assim sucessivamente. Essa ordem e parte do
contrato funcional do template e deve ser conferida antes de alterar templates
aprovados na Meta.

Cada registro destinado a envio real pela Meta deve manter
`metadata.provider_template_name`, `metadata.language`,
`metadata.categoria_provider`, `metadata.provider_parameter_format =
positional` e `metadata.provider_variable_mapping`. O campo
`provider_variable_mapping` deve refletir exatamente a ordem de `variaveis`.

`mensagens_whatsapp` deve guardar o snapshot renderizado que foi enviado e
tambem os parametros usados no envio dentro de `payload.params` ou campo
equivalente do payload. Assim, se `templates_mensagem` for alterada no futuro,
o historico permanece fiel ao que foi efetivamente enviado.

Catalogo operacional sugerido para aprovacao na Meta:

| Template Meta | Categoria | Destino | Parametros |
| --- | --- | --- | --- |
| `appointment_cancelled_salon` | Utility | Salao | cliente, salao, servico, profissional, data, horario |
| `appointment_rescheduled_salon` | Utility | Salao | cliente, salao, servico, profissional, nova data, novo horario |
| `appointment_pending_attendant_operational` | Utility | Salao | cliente, servico, data, horario |
| `appointment_pending_attendant_reminder_30m` | Utility | Salao | cliente, servico, data, horario |
| `appointment_pending_attendant_reminder_60m` | Utility | Salao | cliente, servico, data, horario |
| `appointment_no_show_salon` | Utility | Salao | cliente, servico, profissional, data, horario |
| `appointment_created` | Utility | Cliente | cliente, salao, servico, profissional, data, horario |
| `appointment_rescheduled` | Utility | Cliente | cliente, salao, servico, profissional, nova data, novo horario |
| `appointment_confirmed` | Utility | Cliente | cliente, servico, profissional, data, horario |
| `appointment_cancelled` | Utility | Cliente | cliente, salao, servico, data, horario |
| `appointment_cancelled_by_attendant` | Utility | Cliente | cliente, motivo, servico, profissional, data, horario |
| `appointment_completed` | Utility | Cliente | cliente, salao, servico, profissional, data |
| `appointment_reminder_24h` | Utility | Cliente | cliente, salao, servico, profissional, data, horario |
| `appointment_reminder_2h` | Utility | Cliente | cliente, salao, servico, profissional, horario |

Textos com acoes visiveis como `[Confirmar]` e `[Agendar Novamente]`
representam marcadores conceituais no corpo da mensagem quando o provider ainda
nao possui botoes configurados. URLs, tokens, `cmd`, `tk` e identificadores
tecnicos nao devem aparecer no corpo aprovado nem no snapshot textual. As acoes
internas devem seguir em `payload.actions`.

Para `appointment_confirmed`, o template oficial na Meta deve usar dois botoes
URL configurados no provider:

- botao 0, `Reagendar`: URL-base na Meta como `/reagendar?tk={{1}}`;
- botao 1, `Cancelar`: URL-base na Meta como
  `/acao_agendamento?cmd=cancelar&tk={{1}}`.

O backend nao envia a URL-base desses botoes como parametro do template. Ele
fornece somente o valor dinamico de `{{1}}` de cada botao, usando
`agendamentos.token_confirmacao`. O mesmo token operacional e reutilizado nos
dois botoes; a acao e determinada pela URL configurada em cada botao no
provider.

Os parametros de BODY e BUTTON sao componentes independentes. No
`appointment_confirmed`, o BODY usa os cinco parametros posicionais
`nome_cliente`, `nome_servico`, `nome_profissional`, `data_agendamento` e
`hora_agendamento`. Os botoes URL recebem seus proprios parametros:
`BUTTON 0 {{1}} = token_confirmacao` e
`BUTTON 1 {{1}} = token_confirmacao`.

No registro de `mensagens_whatsapp`, essa preparacao fica auditavel em
`payload.provider_params`, `payload.provider_buttons` e
`payload.provider_components`. Se `appointment_confirmed` nao possuir
`metadata.actions` compativeis com `reschedule` e `cancel`, ou se o agendamento
nao possuir `token_confirmacao`, a comunicacao e bloqueada com erro operacional
em vez de enviar botao sem parametro.

## Templates MasterAdmin / Plataforma

Tambem existem templates de comunicacao do nivel SaaS/Plataforma, mantidos
pelo MasterAdmin e separados dos templates operacionais dos tenants. Esses
templates devem ser globais (`tenant_id = null`) em `public.templates_mensagem`
e identificados em `metadata` com:

- `escopo = platform`;
- `owner = masteradmin`;
- `categoria = plataforma`;
- `language = pt_BR`;
- `categoria_provider = Utility`;
- `provider_template_name` igual ao nome do template aprovado/cadastrado na
  Meta;
- `aprovado_provider = false` inicialmente;
- `ativo = true`.

Usuarios de tenant nao podem manter esses templates. A manutencao deve ocorrer
somente pelo MasterAdmin no modulo SaaS de Comunicacao. A existencia desses
templates nao implica envio automatico; cada disparo depende de uma regra
operacional explicita da plataforma.

Catalogo inicial de plataforma:

| Template | Tipo | Uso |
| --- | --- | --- |
| `master_tenant_created` | administrativo | Avisar dono do salao/autonomo que a conta foi criada. |
| `master_trial_started` | administrativo | Avisar inicio do periodo de teste. |
| `master_trial_ending` | administrativo | Avisar proximidade do fim do trial. |
| `master_plan_activated` | financeiro | Confirmar ativacao do plano. |
| `master_plan_suspended` | financeiro | Avisar suspensao temporaria do plano. |
| `master_payment_pending` | financeiro | Avisar pendencia de pagamento. |
| `master_payment_confirmed` | financeiro | Confirmar pagamento recebido. |
| `master_support_opened` | suporte | Confirmar abertura de chamado. |
| `master_support_updated` | suporte | Avisar atualizacao de chamado. |
| `master_security_alert` | seguranca | Avisar evento relevante de seguranca. |
| `master_whatsapp_provider_error` | sistema | Avisar MasterAdmin sobre falha no envio WhatsApp. |
| `master_template_not_approved` | sistema | Avisar bloqueio por template nao aprovado no provider. |
| `master_tenant_onboarding_incomplete` | administrativo | Avisar onboarding incompleto. |
| `master_system_maintenance_notice` | sistema | Avisar manutencao programada. |

Todos os corpos desse catalogo, por serem WhatsApp, tambem usam placeholders
posicionais em `conteudo`. A legibilidade fica em `variaveis` e em
`metadata.provider_variable_mapping`. Por exemplo, em `master_tenant_created`,
`{{1}} = nome_responsavel` e `{{2}} = nome_empresa`.

## Templates de Campanhas do SaaS

O modulo de Campanhas usa um catalogo base de templates WhatsApp em
`public.templates_mensagem`. Esses modelos sao separados dos templates
operacionais e administrativos: eles existem para campanhas de relacionamento,
retencao e marketing dos tenants.

Classificacao padrao:

- `canal = whatsapp`;
- `tipo = marketing`;
- `metadata.categoria = campanha`;
- `metadata.escopo = tenant`;
- `metadata.owner = tenant`;
- `metadata.catalogo = campanhas_saas`;
- `metadata.is_catalog_template = true`;
- `metadata.language = pt_BR`;
- `metadata.categoria_provider = Marketing`;
- `aprovado_provider = false` inicialmente;
- `ativo = true`.

Embora o catalogo base seja mantido pelo SaaS, o uso final pertence ao tenant:
cada salao/autonomo deve poder personalizar o conteudo antes de usar em uma
campanha. A existencia desses templates nao dispara mensagens automaticamente.

Catalogo inicial de campanhas:

| Template | Uso |
| --- | --- |
| `campaign_promotion` | Promocao de servicos. |
| `campaign_birthday` | Aniversariantes do mes; beneficio comunicado ao iniciar a campanha mensal. |
| `campaign_inactive_client` | Reativacao de clientes inativos. |
| `campaign_return_reminder` | Sugestao de retorno. |
| `campaign_new_service` | Novo servico disponivel. |
| `campaign_new_professional` | Novo profissional. |
| `campaign_holiday` | Datas comemorativas. |
| `campaign_flash_sale` | Promocao relampago. |
| `campaign_loyalty` | Programa de fidelidade. |
| `campaign_package` | Pacotes promocionais. |
| `campaign_seasonal` | Campanhas sazonais. |
| `campaign_custom` | Template livre para campanhas manuais. |

Todos os templates de campanha devem usar linguagem cordial, comercial e sem
exagero promocional, para reduzir risco de rejeicao na Meta. Sempre que
possivel, devem ter uma unica acao principal, como `[Agendar Agora]`, tratada
como marcador conceitual no texto e resolvida operacionalmente em
`payload.actions`.

Para campanhas promocionais, os templates internos devem preferir blocos
condicionais em vez de linhas fixas para cada beneficio:

- `beneficios_campanha`: renderiza somente os beneficios configurados
  (`desconto`, `valor_promocional` e/ou `brinde`);
- `vigencia_campanha`: renderiza `data_inicio` e `data_fim` em formato
  brasileiro (`DD/MM/AAAA`), sem inventar data final quando ela nao existir.

O preview de campanha e o snapshot final em `mensagens_whatsapp.conteudo`
usam a mesma regra de renderizacao. Campos sem valor devem ser omitidos junto
com seus rotulos, sem expor `null`, `undefined`, placeholders ou linhas vazias
indevidas.

```text
templates_mensagem
  -> renderizacao com variaveis do atendimento
  -> mensagens_whatsapp (snapshot final do envio)
  -> provider whatsapp_mysaas
  -> Meta Cloud API ou dry-run
```

`mensagens_whatsapp` nao possui FK obrigatoria para `templates_mensagem`.
Essa decisao preserva o historico: mesmo que um template seja editado,
desativado ou removido no futuro, o envio antigo continua com
`template_nome`, `conteudo`, `tipo_evento`, `payload`, status e resposta do
provider exatamente como foram gerados.

Ao processar um evento, o `CommunicationService` procura um template ativo em
`templates_mensagem` por:

- `tenant_id` do atendimento;
- `canal = whatsapp`;
- `nome` igual ao `template_nome` esperado ou ao `tipo_evento`;
- `ativo = true`;
- `aprovado_provider = true` quando `WHATSAPP_DRY_RUN=false`.

Quando encontra template valido, o conteudo posicional e renderizado usando a
ordem de `variaveis`. Exemplo: `{{1}}` recebe o valor de `nome_cliente`,
`{{2}}` recebe `nome_salao` ou o segundo item declarado no template, e assim
por diante. O snapshot gerado em `mensagens_whatsapp` grava o texto final em
`conteudo` e preserva em `payload`:

- `params`;
- `actions`;
- `template_id`;
- `template_source`;
- `provider_template_name`;
- `language`;
- `provider`;
- contexto operacional do evento.

Em campanhas, os parametros enviados ao provider devem seguir
`metadata.provider_variable_mapping` quando esse mapeamento existir. Isso evita
alterar silenciosamente a ordem de templates ja cadastrados ou aprovados na
Meta. Se um template aprovado precisar receber novos blocos opcionais, deve ser
tratado como nova versao/submissao de template no WhatsApp Manager.

Para a tela de campanhas, a previa acompanha o template vigente de
`templates_mensagem` enquanto a campanha ainda nao iniciou processamento. A
partir da geracao de mensagens, o conteudo exibido deve vir do snapshot em
`mensagens_whatsapp.conteudo`, impedindo que uma edicao posterior do template
altere retroativamente uma campanha ja preparada ou enviada.

Em campanhas com `tipo_publico = clientes`, o destinatario de exemplo da
previa deve vir somente do motor de elegibilidade de clientes finais. O backend
deve excluir usuarios internos do tenant tambem quando essa origem aparece em
metadados de teste/importacao, como `owner_role`, `owner_user_id` ou
`responsible_profissional_id`.

Se nao existir template ativo, ou se o template configurado expuser conteudo
tecnico proibido, o sistema usa o fallback em codigo e registra aviso tecnico
nos logs. O conteudo salvo em `mensagens_whatsapp.conteudo` deve continuar
limpo e amigavel, sem `http://127.0.0.1`, `cmd=`, `tk=`, `token=`,
`link_confirmar`, `link_cancelar` ou `link_reagendar`. Links e acoes ficam em
`payload.actions`.

O sender reaproveitavel `processPendingWhatsAppMessages` processa registros em
`mensagens_whatsapp` com status `pendente`, `agendado` ou `retry`,
`direcao=saida`, `ativo=true` e `deleted_at is null`. A reserva usa a funcao
SQL `claim_pending_whatsapp_messages`, com `FOR UPDATE SKIP LOCKED`, muda o
registro para `processando`, incrementa `tentativas` e evita que dois workers
processem a mesma mensagem.

Em sucesso, atualiza `status_envio` para `enviado`, grava
`provider_message_id`, `enviado_em`, `updated_at`, `payload_provider` e a
resposta do provider. Em falha transitoria, grava `status_envio=retry` e
`proxima_tentativa_em` com backoff de 1m, 5m, 15m e 1h. Em falha definitiva ou
limite de tentativas, grava `status_envio=erro`, `erro_envio`,
`ultimo_erro_codigo`, `ultimo_erro_mensagem`, `updated_at` e detalhes tecnicos
em `payload.provider_error`.

Com `WHATSAPP_DRY_RUN=true`, o provider nao chama a Meta e retorna
`provider_message_id` com prefixo `dry_`. Dry-run valida e processa a fila, mas
nao simula `entregue` ou `lido`; esses estados dependem do webhook da Meta em
envio real. Com `WHATSAPP_DRY_RUN=false`, o envio usa
`WHATSAPP_CLOUD_PHONE_NUMBER_ID`, `WHATSAPP_CLOUD_ACCESS_TOKEN`,
`WHATSAPP_CLOUD_API_VERSION` e o nome aprovado em
`payload.provider_template_name`.

Em envio real (`WHATSAPP_DRY_RUN=false`), o sender/provider deve bloquear
qualquer mensagem cujo template nao esteja aprovado na Meta. A mensagem pode
ser criada em `mensagens_whatsapp`, mas antes da chamada externa o backend
valida se o snapshot possui:

- `payload.template_source = templates_mensagem`;
- `payload.provider_approved = true`;
- `payload.provider_template_name` preenchido;
- `payload.language` preenchido, preferencialmente `pt_BR`.

Se qualquer requisito falhar, a Cloud API nao deve ser chamada. O registro em
`mensagens_whatsapp` deve ser atualizado para `status_envio=erro`, com
`erro_envio = "Template não aprovado no provedor WhatsApp."`, preservando o
payload original e adicionando `payload.provider_error` com o motivo tecnico do
bloqueio. O fluxo operacional do agendamento nao deve ser interrompido por
esse bloqueio.

O webhook publico da Meta fica em:

- `GET /public/webhooks/whatsapp`: validacao de assinatura com
  `WHATSAPP_WEBHOOK_VERIFY_TOKEN`;
- `POST /public/webhooks/whatsapp`: atualiza status por
  `provider_message_id`, mapeando `sent`, `delivered`, `read` e `failed` para
  os status internos.

Para alertas operacionais destinados ao salao, o destinatario deve seguir a
hierarquia: profissional vinculado ao agendamento, administrador ativo do
tenant e, por fim, autonomo responsavel. Quando nenhum desses possuir telefone
valido, o telefone do tenant e usado como fallback; se ainda assim nao houver
telefone, a tentativa fica registrada com `status_envio=erro`.

Eventos com template preparado:

- `appointment.confirmed`: aceite do atendimento pelo profissional/operacao,
  enviado ao cliente como confirmacao informativa. Ao emitir este evento, o
  agendamento permanece em `pendente_cliente` (`Aguardando Cliente`) ate ser
  concluido, cancelado, reagendado ou marcado como no-show. O corpo da mensagem
  nao deve simular botoes com `[Reagendar]` e `[Cancelar]`; ele apenas orienta
  que o cliente use as opcoes abaixo. URLs tecnicas, `cmd`, `tk` e token
  operacional nao devem aparecer em `mensagens_whatsapp.conteudo`. O template
  oficial em `templates_mensagem.metadata.actions` deve declarar `reschedule` e
  `cancel`. As acoes ficam registradas internamente em `payload.actions`, e os
  botoes URL enviados ao provider ficam em `payload.provider_components`.
  O conteudo renderizado deve seguir este padrao:

```text
Olá, {{nome_cliente}}!

Seu atendimento foi confirmado com sucesso.

📅 Data: {{data_agendamento}}

🕒 Horário: {{hora_agendamento}}

✂️ Serviço: {{nome_servico}}

👩‍💼 Profissional: {{nome_profissional}}

Estamos aguardando você.

Caso precise alterar seu atendimento, utilize uma das opções abaixo:

```

- `appointment.pending_client`: solicitacao de confirmacao enviada ao cliente
  quando o profissional/atendente aprova a solicitacao, mas a politica do
  tenant ainda exige aceite final do cliente.
- `appointment.pending_attendant`: alerta operacional imediato para
  agendamento criado pelo cliente e ainda aguardando aceite do
  salao/profissional. A mensagem deve exibir as acoes conceituais
  `[Confirmar]` e `[Abrir Agenda]`, registradas internamente em
  `payload.actions` com `action_type` `appointment.confirm` e `open_agenda`,
  sempre vinculadas ao `appointment_token` e sem URL visivel no conteudo.
- `appointment.pending_attendant_reminder_30m`: segundo alerta operacional,
  emitido se o agendamento continuar em `pendente_atendente` apos 30 minutos.
- `appointment.pending_attendant_reminder_60m`: terceiro alerta operacional,
  emitido se o agendamento continuar em `pendente_atendente` apos 60 minutos.
- `appointment.pending_attendant_reminder_2h`: ultimo alerta operacional, de
  prioridade alta, quando faltar aproximadamente 2 horas para o atendimento e
  o status ainda for `pendente_atendente`.
- `appointment.rescheduled`: reagendamento com novo horario.
- `appointment.cancelled`: cancelamento do atendimento.
- `appointment.reminder_24h`: lembrete de 24 horas.
- `appointment.reminder_2h`: lembrete de 2 horas.
- `appointment.completed`: agradecimento/pos-atendimento.
- `appointment.no_show`: registro de nao comparecimento.

Para clientes, `appointment.no_show` usa o template
`appointment_no_show_client`, com tom neutro e respeitoso, sem cobranca ou
constrangimento. O conteudo mostra cliente, servico, data e horario, e exibe
apenas o marcador `[Agendar Novamente]`; a acao real fica em
`payload.actions` com `id= schedule_again`, `action_type=schedule_again` e
`target=/agendar/{tenant_slug}`.

Cancelamentos internos usam `appointment_cancelled_by_attendant` e exigem
motivo obrigatorio antes da mudanca de status. O motivo informado deve aparecer
no `conteudo` da mensagem ao cliente e tambem seguir no payload do evento. Se o
cancelamento vier do proprio cliente via link operacional, a mensagem ao
cliente usa `appointment_cancelled_by_client`, sem texto de motivo interno.
O motivo generico `Cancelado pelo painel` nao deve ser usado como texto enviado
ao cliente; o painel deve coletar um motivo operacional especifico em lista
controlada e repassar esse valor para o evento `appointment.cancelled`.

Todos os eventos da familia `appointment.pending_attendant*` seguem o mesmo
padrao de acao operacional para o atendente: o texto salvo deve mostrar apenas
as opcoes conceituais `[Confirmar]` e `[Abrir Agenda]`, sem URL, id interno,
`cmd`, `tk` ou token visivel. Os dados acionaveis ficam em `payload.actions`,
vinculados ao `appointment_token`, com `action_type` `appointment.confirm` e
`open_agenda` para futura entrega como botoes interativos.

Os links operacionais de confirmacao, cancelamento e reagendamento devem usar
tokens de agendamento, sem expor `id` interno. Em ambiente local, os links
devem apontar para o frontend publico configurado por `PUBLIC_APP_URL` ou
`BOOKING_BASE_URL`, evitando URLs de backend em mensagens para clientes.
Excecao: em `appointment.confirmed`, cancelar e reagendar devem ser tratados
como acoes operacionais internas associadas ao token; o texto salvo em
`conteudo` nao deve exibir URLs.

Variaveis minimas dos templates:

```text
{{ nome_cliente }}
{{ nome_salao }}
{{ nome_profissional }}
{{ nome_servico }}
{{ data_agendamento }}
{{ hora_agendamento }}
{{ link_cancelar }}
{{ link_reagendar }}
{{ link_confirmar }}
```

O provider inicial e `whatsapp_mysaas`. Em ambiente sem credenciais Meta, ele
opera em `dry_run`: registra a mensagem como enviada de forma simulada, sem
chamar a Cloud API. Para envio real, configurar `WHATSAPP_CLOUD_API_ENABLED`,
`WHATSAPP_CLOUD_PHONE_NUMBER_ID`, `WHATSAPP_CLOUD_ACCESS_TOKEN` e
`WHATSAPP_DRY_RUN=false`.

## Automacao Feliz aniversario

A automacao de relacionamento `Feliz aniversario` usa o template
`birthday_greeting`, separado do template de campanha `campaign_birthday`.

Ela nao chama a Meta diretamente. O job `birthday_greetings.process` apenas
enfileira registros em `mensagens_whatsapp` com
`tipo_evento = birthday.greeting`; o envio real continua pelo worker
`whatsapp.process`.

O template deve usar placeholders posicionais e preservar no payload:

- `template_source = templates_mensagem`;
- `provider_template_name`;
- `language`;
- `provider_parameter_format = positional`;
- `provider_variable_mapping`;
- `provider_params`;
- `automation_type = birthday_greeting`.

Em dry-run, templates ainda nao aprovados podem gerar fila. Em envio real,
`WHATSAPP_DRY_RUN=false`, o enfileiramento e bloqueado se o template nao
estiver aprovado no provider ou nao possuir nome/idioma configurados.

## Auditoria e compatibilidade de migration

Todo evento operacional suportado deve gerar tentativa de auditoria em
`mensagens_whatsapp`, inclusive quando `WHATSAPP_DRY_RUN=true`. Em dry-run, o
provider retorna `provider_message_id` com prefixo `dry_` e o registro deve
terminar como `status_envio=enviado`, sem chamada externa para a Meta.

A migration `20260617100000_whatsapp_operational_communication_logs.sql`
adiciona os campos de auditoria estendida `profissional_id`, `tipo_evento` e
`provider`. Enquanto essa migration nao estiver aplicada em um ambiente, o
backend mantem fallback de compatibilidade: grava o log base de
`mensagens_whatsapp` e preserva os dados estendidos dentro de `payload`.

Durante validacoes em desenvolvimento, logs temporarios com o prefixo
`[whatsapp-operational-debug]` podem indicar confirmacao recebida pela API de
Agenda, evento operacional disparado, recipients resolvidos, tentativa de
insert/update em `mensagens_whatsapp` e resultado do provider.

Para registros legados de `appointment.confirmed` ja gravados com URLs no
campo `conteudo`, a rotina de manutencao
`backend/scripts/sanitize-confirmed-whatsapp-content.js` recompõe o texto
amigavel, remove links visiveis de `payload.params`/`payload.links` e preserva
o token operacional apenas em `payload.actions` e `payload.operational_context`.

---

## Historico legado

O bloco abaixo foi preservado apenas como historico de especificacao antiga.
A regra vigente do modulo esta nas secoes anteriores deste arquivo, nos docs
mestres e nas ADRs 014-018. Em caso de divergencia, prevalecem as secoes
recentes: provider `whatsapp_mysaas`, dry-run em desenvolvimento,
`templates_mensagem`, fila `mensagens_whatsapp` e `appointment_confirmed` com
botoes Reagendar/Cancelar parametrizados por `token_confirmacao`.

O whatsapp.md é um dos módulos mais críticos e diferenciadores do Bellory, porque o WhatsApp NÃO é apenas um canal de comunicação no projeto.
Ele é:
•	canal operacional
•	canal de relacionamento
•	motor de retenção
•	canal de automação
•	ponte entre o salão e o cliente
Esse é um ponto estratégico extremamente forte do Bellory.
A maioria dos concorrentes:
•	usa WhatsApp apenas como envio manual
•	ou depende totalmente da plataforma própria
O Bellory faz diferente:
ele transforma o WhatsApp em:
•	extensão operacional do salão
•	motor de relacionamento inteligente
•	canal invisível de automação
O módulo WhatsApp NÃO deve parecer:
•	central complexa de atendimento
•	plataforma corporativa omnichannel
•	sistema técnico pesado
Ele deve parecer:
•	comunicação automática simples
•	assistente operacional
•	relacionamento inteligente invisível
O usuário deve sentir:
“O Bellory conversa com minhas clientes por mim.”
Abaixo está a especificação consolidada profissional do módulo.
________________________________________
docs/modules/whatsapp.md
# WhatsApp Module — Bellory

# 1. Objetivo do Módulo

O módulo WhatsApp é responsável por:

- comunicação operacional
- relacionamento automático
- confirmações
- lembretes
- campanhas
- notificações
- recuperação clientes

O objetivo principal é:
transformar o WhatsApp em canal inteligente de operação e relacionamento.

# 2. Papel Estratégico

O módulo WhatsApp representa:
- principal canal operacional externo
- principal canal relacionamento
- motor retenção operacional
- camada comunicação automática

O WhatsApp NÃO é:
- plataforma principal Bellory
- CRM principal
- dashboard principal

O WhatsApp É:
- canal execução
- canal comunicação
- canal relacionamento
- extensão operacional do sistema

# 3. Objetivo UX

O usuário deve sentir:

"O Bellory conversa com minhas clientes automaticamente."

A experiência deve transmitir:
- simplicidade
- automação
- proximidade
- rapidez
- inteligência operacional

# 4. Público-Alvo

O módulo foi projetado para:
- profissionais autônomos
- pequenos salões
- usuários mobile-first
- baixa maturidade tecnológica

# 5. Conceito Arquitetural

O módulo WhatsApp deve funcionar como:

- camada comunicação operacional
- motor notificações
- gateway relacionamento
- estrutura desacoplada

O módulo deve integrar:
- Agenda
- CRM
- Campanhas
- AI Engine

# 6. Estratégia Operacional

O Bellory deve utilizar:

- WhatsApp Business/ WhatsApp Cloud API  - Aplicado a: “dono do App”,  e opcionalmente aos “donos de salão/administradores”, haja vista, que nem todos os “donos de salão/administradores” o possuem.
- WhatsApp comum - Aplicado a: “donos de salão/administradores”, “funcionários”, ”terceiros”
- WhatsApp links
- templates 
- automações
- webhooks
- mensagens bidirecionais
- fila mensagens
- IA conversacional

# 7. Estrutura Backend

```text
backend/src/modules/whatsapp/
  controllers/
  services/
  providers/
  queues/
  webhooks/
  validators/
  routes/
  dto/
________________________________________
8. Estrutura Frontend
frontend/src/
  app/
    whatsapp/
  components/
    whatsapp/
  hooks/
  services/
________________________________________
9. Objetivos Operacionais
O módulo deve permitir:
•	enviar confirmações
•	enviar lembretes
•	enviar campanhas
•	enviar notificações
•	recuperar clientes
•	automatizar relacionamento
________________________________________
10. Tipos de Mensagens
Confirmação Agendamento
Exemplo:
•	confirmação horário
•	confirmação profissional
•	confirmação serviço
________________________________________
Lembretes
Exemplo:
•	lembrete atendimento
•	lembrete retorno
•	lembrete campanha
________________________________________
Campanhas
Exemplo:
•	promoções
•	descontos
•	datas comemorativas
________________________________________
Recuperação Clientes
Exemplo:
•	clientes inativos
•	retorno sugerido
•	campanhas recorrência
________________________________________
Relacionamento
Exemplo:
•	aniversário
•	agradecimento
•	pós-atendimento
________________________________________
11. Integração Agenda
O módulo deve consumir:
•	novos agendamentos
•	cancelamentos
•	reagendamentos
•	confirmações
•	horários
________________________________________
12. Integração CRM
Consumir:
•	segmentações
•	frequência clientes
•	retenção
•	comportamento operacional
________________________________________
13. Integração Campaigns
Consumir:
•	campanhas ativas
•	promoções
•	públicos segmentados
•	cupons
________________________________________
14. Integração AI Engine
Futuro suporte para:
•	mensagens inteligentes
•	respostas IA
•	automações contextuais
•	sugestões automáticas
•	comunicação personalizada
________________________________________
15. Fluxo Operacional Inicial
Fluxo principal
1.	evento operacional ocorre
2.	sistema gera payload
3.	módulo WhatsApp processa
4.	mensagem é enviada
5.	status é registrado
________________________________________
16. Fluxos Principais
Agendamento
Enviar:
•	confirmação
•	lembrete
•	reagendamento
•	cancelamento
________________________________________
Campanhas
Enviar:
•	promoções
•	cupons
•	chamadas retorno
________________________________________
CRM
Enviar:
•	recuperação clientes
•	relacionamento
•	fidelização
________________________________________
17. Templates Mensagens
O sistema deve possuir:
•	templates prontos
•	templates operacionais
•	templates campanhas
•	templates relacionamento
________________________________________
18. Estrutura Mensagem
Cada mensagem deve possuir:
•	título
•	conteúdo
•	CTA
•	link operacional
•	identificação tenant
________________________________________
19. Links Operacionais
Permitir:
•	confirmação agendamento
•	cancelamento
•	reagendamento
•	abertura dashboard cliente
________________________________________
20. Tokens Operacionais
Links devem utilizar:
•	tokens seguros
•	expiração futura
•	validação ownership
•	proteção operacional
________________________________________
21. APIs Backend
Enviar mensagem
POST /whatsapp/send
________________________________________
Status mensagens
GET /whatsapp/status
________________________________________
Webhook futuro
POST /whatsapp/webhook
________________________________________
Templates
GET /whatsapp/templates
________________________________________
22. Hook Frontend
useWhatsApp()
Responsável por:
•	status mensagens
•	templates
•	integrações operacionais
•	métricas futuras
________________________________________
23. Service Frontend
whatsapp.service.ts
Responsável por:
•	APIs
•	payloads
•	status mensagens
•	tratamento erros
________________________________________
24. Componentes Frontend
Estruturais
•	WhatsAppLayout
•	WhatsAppStatus
Operacionais
•	MessagePreview
•	TemplateSelector
•	CampaignSender
•	MessageTimeline
Estados
•	EmptyWhatsAppState
________________________________________
25. Funcionalidades Frontend
Permitir:
•	visualizar status
•	visualizar templates
•	acompanhar envios
•	acompanhar campanhas
•	configurar mensagens
________________________________________
26. UX/UI
A experiência deve ser:
•	extremamente simples
•	intuitiva
•	visual
•	operacional
•	amigável
Inspirado em:
•	WhatsApp Business
•	Fresha
•	Calendly
•	Notion
________________________________________
27. Mobile-First
Priorizar:
•	visual vertical
•	ações rápidas
•	poucos cliques
•	experiência touch
•	baixa fricção
________________________________________
28. Desktop
Desktop deve:
•	utilizar visual clean
•	timeline organizada
•	métricas simples
•	gestão confortável
________________________________________
29. Estilo Visual
Utilizar:
•	cards modernos
•	glow discreto
•	gradientes suaves
•	micro animações
•	glassmorphism leve
Evitar:
•	aparência call center
•	excesso corporativo
•	excesso técnico
________________________________________
30. Paleta Visual
Primária
#E26D7C
Hover
#D85C6C
Secundária
#FFE8E2
Destaque
#7B4BFF
Accent
#FFB3C1
Fundo
#FFFDFC
Texto
#2B2B2B
________________________________________
31. Status de Mensagens
Status possíveis
pendente
enviada
entregue
lida
falhou
cancelada
________________________________________
32. Filas de Mensagens
Futuro suporte:
•	queue system
•	retry automático
•	envio assíncrono
•	throttling
•	controle limites API
________________________________________
33. Webhooks
Preparar:
•	recebimento mensagens
•	confirmação entrega
•	leitura mensagens
•	eventos WhatsApp API
________________________________________
34. Métricas Operacionais
Exibir:
•	mensagens enviadas
•	entregas
•	leituras
•	falhas
•	campanhas enviadas
•	confirmações realizadas
________________________________________
35. Segurança
Garantir:
•	autenticação JWT
•	validação tenant
•	ownership validation
•	proteção tokens
Nunca permitir:
•	envio cross-tenant
•	vazamento contatos
•	acesso indevido
________________________________________
36. Multi-Tenant
Toda operação deve respeitar:
•	tenant_id
•	permissões
•	ownership
________________________________________
37. Privacidade
Preparar:
•	LGPD
•	consentimento mensagens
•	opt-out
•	anonimização futura
________________________________________
38. Tratamento de Erros
Nunca exibir:
•	stack traces
•	SQL errors
•	erros internos
Exibir:
•	"Não foi possível enviar mensagem"
•	"Tente novamente"
________________________________________
39. Estados Operacionais
Loading
Exibir:
•	skeletons
•	shimmer
•	loading elegante
________________________________________
Empty State
Exibir:
•	incentivo operacional
•	onboarding comunicação
Exemplo:
"Automatize a comunicação com suas clientes."
________________________________________
Error State
Exibir:
•	retry simples
•	mensagens amigáveis
________________________________________
40. Polling e Realtime
MVP Inicial
Atualização:
•	polling leve
________________________________________
Futuro
Preparar:
•	websocket
•	realtime
•	status live
•	sincronização instantânea
________________________________________
41. Performance
Priorizar:
•	filas futuras
•	envio assíncrono
•	paginação
•	lazy loading
•	cache futuro
________________________________________
42. Escalabilidade Futura
Arquitetura preparada para:
•	WhatsApp Cloud API
•	chatbot IA
•	atendimento automático
•	voice AI
•	omnichannel
•	múltiplos números
•	central atendimento
________________________________________
43. Objetivo Final
O módulo WhatsApp deve representar:
•	comunicação inteligente
•	relacionamento automático
•	retenção operacional
•	automação invisível
O usuário deve sentir:
"O Bellory conversa automaticamente com minhas clientes."
