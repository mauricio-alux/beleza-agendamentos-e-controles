# Roteiro operacional: agendamento do cliente final

Este roteiro explica como o cliente final usa o link publico de agendamento de
um estabelecimento na plataforma para solicitar atendimento, acompanhar horarios
futuros, reagendar ou cancelar quando houver link operacional valido.

O documento foi escrito para o cliente de um salao, barbearia, studio, clinica
estetica ou profissional autonomo. A secao tecnica fica separada no fim.

## 1. O que e o agendamento online

O agendamento online e o link que o estabelecimento compartilha com seus
clientes para solicitar um horario sem acessar o painel administrativo.

Pelo link, o cliente pode:

1. informar ou confirmar seus dados;
2. escolher um servico;
3. escolher uma especialidade;
4. escolher um profissional;
5. escolher data e horario;
6. solicitar o agendamento;
7. consultar proximos atendimentos quando for reconhecido;
8. reagendar ou cancelar por links operacionais disponiveis.

O cliente final nao precisa ter login na plataforma para usar esse fluxo.

## 2. Como acessar

O cliente acessa pelo **link de agendamento do estabelecimento**.

Esse link pode ser enviado pelo proprio estabelecimento por WhatsApp, publicado
em redes sociais ou compartilhado diretamente. O projeto atual tambem suporta
links individuais com identificacao, usados para reconhecer clientes
recorrentes.

Nao foi identificado, no fluxo atual, um QR Code proprio implementado para esse
acesso. Se o estabelecimento criar um QR Code externo apontando para o link,
isso funciona como uma forma de compartilhar o mesmo endereco, mas nao e uma
tela especifica da plataforma.

## 3. O que aparece ao abrir o link

Ao abrir o link, o cliente ve:

- cabecalho de agendamento online com a marca configurada da plataforma;
- nome do estabelecimento;
- texto orientando a escolher servico e horario;
- aviso quando alguns servicos estao indisponiveis para agendamento online;
- formulario **Seus dados**;
- bloco **Seus horarios**, somente quando houver reconhecimento e proximos
  agendamentos futuros;
- bloco **Escolha o atendimento**;
- bloco **Escolha data e horario**;
- resumo do atendimento escolhido;
- botao **Solicitar agendamento**.

Quando o link nao esta ativo ou nao existe, a tela mostra **Link indisponivel**
ou uma mensagem equivalente.

## 4. Mapa do fluxo

Fluxo real da interface atual:

```text
Abrir link
-> Seus dados
-> Seus horarios, se houver identificacao e agendamentos futuros
-> Servico
-> Especialidade
-> Profissional
-> Data
-> Horario
-> Solicitar agendamento
-> Aguardar confirmacao do estabelecimento
-> Acompanhar, reagendar ou cancelar por link quando disponivel
```

## 5. Identificacao do cliente

O cliente nao cria uma conta e nao faz login.

Ao abrir o link, a plataforma tenta reconhecer o cliente de tres formas:

1. por um link individual recebido com identificacao;
2. por reconhecimento salvo anteriormente no mesmo dispositivo e navegador;
3. por nome e WhatsApp informados manualmente.

Quando o cliente e reconhecido, a tela pode mostrar uma mensagem como:

```text
Bem-vindo de volta, [nome]. Seus dados foram reconhecidos.
```

Se o link de identificacao nao for valido ou tiver expirado, o cliente deve
confirmar os dados manualmente para continuar.

## 6. Dados do cliente

No bloco **Seus dados**, existem os campos abaixo.

| Campo | Obrigatorio? | Como usar |
| --- | --- | --- |
| Nome | Sim | Informe como o estabelecimento pode chamar voce. |
| Email | Opcional | Use se quiser complementar seus dados. |
| Celular/WhatsApp | Sim, exceto quando voce ja foi reconhecido por um link ou identificacao valida | Informe um numero valido para identificacao e comunicacao operacional. |
| Observacoes | Opcional | Informe detalhes importantes para o atendimento. |
| Reconhecer meus dados neste dispositivo | Opcional | Quando marcado, a plataforma pode agilizar proximos agendamentos neste mesmo navegador. |

Mensagens possiveis:

- **Informe seu nome para continuar.**
- **Informe seu celular/WhatsApp para continuar.**
- **Informe um celular/WhatsApp valido para continuar.**
- **O link de identificacao nao e mais valido. Confirme seus dados para continuar.**

## 7. Cliente novo

Se for o primeiro acesso, o cliente deve:

1. informar nome;
2. informar celular/WhatsApp valido;
3. informar email, se quiser;
4. escrever observacoes, se necessario;
5. manter ou desmarcar a opcao de reconhecimento no dispositivo.

Ao solicitar o agendamento, a plataforma identifica ou cria o cadastro do cliente
para aquele estabelecimento usando principalmente o WhatsApp informado.

## 8. Cliente ja identificado

Se o cliente ja usou o link antes no mesmo dispositivo, ou recebeu um link
individual valido, a plataforma pode preencher nome, email e WhatsApp.

Quando isso acontece, o cliente pode seguir direto para a escolha do
atendimento. Se alterar o telefone, a identificacao salva e limpa e o sistema
passa a validar o novo numero informado.

O reconhecimento depende do navegador/dispositivo. Se o cliente trocar de
celular, usar outro navegador ou limpar os dados do navegador, talvez precise
informar os dados novamente.

## 9. Seus horarios

Quando o cliente e reconhecido, a plataforma consulta seus proximos atendimentos
em aberto naquele estabelecimento.

Se houver agendamentos futuros, aparece o bloco **Seus horarios** com:

- nome do atendimento ou servico;
- data e horario;
- profissional;
- status atual;
- botao **Reagendar**, quando houver link operacional;
- botao **Cancelar**, quando houver link operacional.

Se nao houver agendamentos futuros, esse bloco nao aparece.

## 10. Escolhendo o servico

No bloco **Escolha o atendimento**, o cliente seleciona o servico desejado.

Somente aparecem servicos que o estabelecimento disponibilizou para agendamento
online e que possuem profissional habilitado. Se um servico nao aparece, ele
pode estar inativo, sem configuracao online ou sem profissional disponivel para
executa-lo.

## 11. Escolhendo a especialidade

Depois de selecionar o servico, a plataforma mostra as especialidades disponiveis
para aquele servico.

Exemplo ilustrativo:

- Servico: Corte de cabelo
- Especialidades possiveis: Corte Feminino, Corte Masculino ou Corte Infantil

Cada opcao pode mostrar valor e duracao. O cliente deve escolher uma das
especialidades listadas. A interface atual sempre trabalha com uma
especialidade selecionada para calcular os horarios.

## 12. Escolhendo o profissional

Depois de servico e especialidade, o cliente escolhe o profissional.

A lista mostra apenas profissionais compativeis com a combinacao escolhida. A
interface atual nao apresenta a opcao **Qualquer profissional**. Se houver mais
de um profissional compativel, o cliente escolhe um nome da lista.

## 13. Escolhendo data

No bloco **Escolha data e horario**, o cliente escolhe a data pelo campo de
calendario.

A data minima da interface e o dia atual. O cliente nao deve conseguir criar
agendamento retroativo pelo fluxo publico.

O campo inicia, por padrao, no proximo dia. O cliente pode mudar para hoje ou
para outra data futura.

## 14. Como os horarios sao calculados

Os horarios exibidos consideram:

- horario de funcionamento;
- escala do profissional;
- duracao do servico e da especialidade;
- intervalo;
- outros agendamentos;
- bloqueios operacionais;
- antecedencia minima configurada pelo estabelecimento.

O cliente nao precisa entender esses calculos. Basta escolher um dos horarios
mostrados.

## 15. Antecedencia minima

Alguns estabelecimentos exigem antecedencia minima para agendar no mesmo dia.

Isso significa que, mesmo que ainda exista expediente, o horario pode nao
aparecer se estiver muito proximo do momento atual ou se nao houver tempo
suficiente para cumprir:

```text
antecedencia minima + duracao do atendimento
```

O valor da antecedencia depende da configuracao do estabelecimento.

## 16. Escolhendo horario

Depois de escolher data, a plataforma consulta os horarios disponiveis.

Quando existem horarios, eles aparecem como botoes com hora, por exemplo
`14:00`, `14:30` ou `15:00`. O cliente deve selecionar um horario para
habilitar a solicitacao.

O horario so e garantido depois que a solicitacao e concluida com sucesso. Se
outro agendamento ocupar aquele horario antes da finalizacao, o sistema pode
informar que nao foi possivel concluir a solicitacao.

## 17. Sem horarios disponiveis

Quando a tela mostrar:

```text
Nenhum horario disponivel nesta data.
```

O cliente pode tentar:

1. escolher outra data;
2. escolher outro profissional;
3. escolher outra especialidade;
4. escolher outro servico, se fizer sentido.

Se nenhuma alternativa funcionar, o ideal e falar diretamente com o
estabelecimento.

## 18. Enviando a solicitacao

Depois de preencher os dados e escolher servico, especialidade, profissional,
data e horario, clique em **Solicitar agendamento**.

O botao fica desabilitado enquanto faltar alguma informacao essencial, como
horario, profissional, dados de identificacao ou telefone valido quando o
cliente nao foi reconhecido.

## 19. Resultado da solicitacao

Quando a solicitacao e enviada com sucesso, a tela mostra:

```text
Solicitacao enviada
Seu horario foi reservado.
[Nome do estabelecimento] recebeu o pedido e fara a confirmacao do atendimento.
```

O status interno normal criado pelo fluxo publico e **Aguardando profissional**.
Para o cliente, isso significa que o pedido foi enviado e o estabelecimento
precisa confirmar o atendimento.

Se houver sinal de risco na identificacao do cliente, o sistema pode criar o
agendamento como **Revisao necessaria** para analise interna do estabelecimento.

## 20. Aguardando confirmacao

Depois de solicitar, o cliente deve aguardar a confirmacao do estabelecimento.

No fluxo operacional atual, quando o profissional ou responsavel confirma, o
agendamento passa para **Aguardando Cliente** no painel interno. Esse status
indica que o estabelecimento aceitou o atendimento e esta aguardando a chegada
ou execucao do cliente.

O status **Confirmado** ainda existe no sistema para compatibilidade, mas nao e
o principal resultado do aceite operacional atual.

## 21. Confirmar atendimento

Existe uma pagina publica de acao para **Confirmar agendamento** quando o
cliente abre um link operacional com essa acao.

Nessa pagina, o cliente ve:

- estabelecimento;
- servico;
- profissional;
- data e horario;
- valor;
- status;
- botao **Confirmar agendamento**.

Ao confirmar com sucesso, a pagina mostra:

```text
Agendamento confirmado com sucesso.
```

Na experiencia principal do link de agendamento, entretanto, o bloco **Seus
horarios** exibe apenas **Reagendar** e **Cancelar** quando essas acoes estao
disponiveis. Por isso, a confirmacao pelo cliente depende de receber ou abrir
um link operacional especifico.

Apos o profissional confirmar o atendimento, a comunicacao operacional
`appointment_confirmed` deve oferecer **Reagendar** e **Cancelar** como acoes do
da plataforma. Essas acoes usam o token operacional do agendamento e abrem,
respectivamente, `/reagendar?tk={token}` e
`/acao_agendamento?cmd=cancelar&tk={token}`.

## 22. Reagendamento

O cliente pode reagendar quando houver um link operacional de reagendamento,
normalmente exibido em **Seus horarios** ou recebido por comunicacao do
estabelecimento.

O fluxo atual de reagendamento permite alterar:

- data;
- horario;
- observacao opcional.

O cliente nao altera servico, especialidade ou profissional nessa tela. O
reagendamento usa o mesmo servico, profissional e contexto do atendimento
original.

Passo a passo:

1. clique em **Reagendar**;
2. confira o atendimento atual;
3. escolha uma nova data;
4. selecione um novo horario;
5. escreva observacao, se necessario;
6. clique em **Reagendar**.

Quando conclui, a tela mostra:

```text
Agendamento reagendado com sucesso. O novo horario aguardara confirmacao.
```

O status resultante volta para **Aguardando profissional**.

## 23. Cancelamento

O cliente pode cancelar quando houver link operacional de cancelamento.

Passo a passo:

1. clique em **Cancelar**;
2. confira os dados do atendimento;
3. informe o motivo, se quiser;
4. clique em **Cancelar agendamento**.

Quando o cancelamento e concluido, a tela mostra:

```text
Agendamento cancelado com sucesso.
```

O status resultante e **Cancelado**.

Nao foi identificada, no codigo atual, uma regra publica que bloqueie
cancelamento por estar muito perto do horario do atendimento. O backend valida
que o atendimento ainda nao esteja em status final e que o horario seja futuro
quando a acao ocorre por token operacional.

## 24. Mensagens e lembretes

O produto possui eventos e templates para comunicacoes operacionais, como:

- solicitacao criada;
- alerta para o estabelecimento confirmar;
- confirmacao;
- reagendamento;
- cancelamento;
- lembrete de 24 horas;
- lembrete de 2 horas;
- atendimento concluido;
- no-show.

Para o cliente, isso significa que ele pode receber mensagens do
estabelecimento conforme a configuracao do ambiente.

O envio real depende da infraestrutura de comunicacao configurada. Em ambiente
de desenvolvimento, as mensagens podem ser apenas simuladas ou registradas.

## 25. Atendimento concluido

Quando o estabelecimento conclui o atendimento, o registro passa para
**Concluido** no sistema interno.

O projeto possui templates de pos-atendimento, mas a tela publica principal nao
mostra uma pagina propria de "atendimento concluido" para o cliente.

## 26. No-show

Se o estabelecimento marcar que o cliente nao compareceu, o atendimento passa
para **No-show** internamente.

O projeto possui comunicacao operacional para esse evento, mas o roteiro do
cliente nao deve prometer uma tela especifica de no-show, pois ela nao foi
identificada no fluxo publico principal.

## 27. Privacidade e reconhecimento no dispositivo

A tela possui a opcao:

```text
Reconhecer meus dados neste dispositivo para facilitar os proximos agendamentos.
```

Quando marcada, o navegador guarda uma identificacao para aquele link de
agendamento. Isso ajuda a plataforma a preencher dados e mostrar proximos
agendamentos quando o cliente voltar pelo mesmo dispositivo.

Se o cliente desmarcar a opcao, limpar o navegador ou usar outro dispositivo,
pode precisar informar os dados novamente.

## 28. Diferença entre cliente final e usuario do salao

### Cliente final

- usa o link publico;
- nao acessa o painel administrativo;
- nao configura servicos;
- nao ve a agenda completa do estabelecimento;
- acompanha apenas os proprios atendimentos quando reconhecido.

### Administrador ou profissional

- usa o painel interno;
- configura servicos, especialidades, profissionais e horarios;
- consulta a Agenda completa conforme permissao;
- confirma, cancela, conclui e registra no-show;
- acompanha a operacao do estabelecimento.

## 29. O que fazer quando...

### O servico nao aparece

Escolha outro servico disponivel ou fale com o estabelecimento. O servico pode
nao estar habilitado para agendamento online.

### A especialidade nao aparece

Verifique se o servico escolhido possui outras especialidades. Se a opcao
desejada nao estiver na lista, fale com o estabelecimento.

### O profissional nao aparece

A lista mostra apenas profissionais habilitados para o servico e a
especialidade. Escolha outro profissional disponivel ou fale com o
estabelecimento.

### Nenhum horario aparece

Tente outra data, profissional, especialidade ou servico. Pode nao haver escala,
tempo suficiente, horario livre ou disponibilidade para a combinacao escolhida.

### O horario ficou indisponivel

Escolha outro horario e tente novamente. Isso pode acontecer quando outro
agendamento ocupa o mesmo periodo antes da finalizacao.

### O telefone e considerado invalido

Confira o DDD e o numero de celular/WhatsApp. O sistema precisa de um telefone
valido para identificar o cliente.

### Nao consigo confirmar

Confira se o link de confirmacao esta completo e dentro da validade. Se a tela
informar erro ou token ausente, solicite novo contato ao estabelecimento.

### Nao consigo reagendar

Confira se voce abriu o link correto de reagendamento. Escolha uma data com
horarios disponiveis e selecione um novo horario antes de concluir.

### Nao consigo cancelar

Confira se o link de cancelamento esta correto. Atendimentos ja encerrados ou
em status final podem nao aceitar cancelamento.

### Meus dados nao foram reconhecidos

Informe nome e WhatsApp novamente. Isso pode acontecer ao trocar de
dispositivo, limpar o navegador ou usar um link de identificacao expirado.

## 30. Exemplo completo

Exemplo ficticio:

- Estabelecimento: Studio Bella
- Cliente: Maria
- Servico: Corte de cabelo
- Especialidade: Corte Feminino
- Profissional: Ana
- Data: 15/08/2026
- Horario: 14:00

Passo a passo:

1. Maria recebe o link de agendamento do Studio Bella.
2. Maria abre o link no celular.
3. A tela mostra o nome do Studio Bella e o formulario **Seus dados**.
4. Maria informa nome e WhatsApp.
5. Maria escolhe **Corte de cabelo**.
6. Maria escolhe **Corte Feminino**.
7. Maria escolhe a profissional **Ana**.
8. Maria seleciona a data **15/08/2026**.
9. Maria escolhe o horario **14:00**.
10. Maria confere o resumo e clica em **Solicitar agendamento**.
11. A tela informa que a solicitacao foi enviada e que o estabelecimento fara
    a confirmacao.
12. Se Maria voltar pelo mesmo dispositivo e estiver reconhecida, podera ver
    seus proximos horarios.
13. Se houver link operacional, Maria podera reagendar ou cancelar.
14. No dia do atendimento, Maria comparece ao Studio Bella no horario marcado.

## 31. Mapa de telas e acoes

| Objetivo do cliente | Tela ou etapa | Acao |
| --- | --- | --- |
| Iniciar agendamento | Link publico do estabelecimento | Abrir link |
| Informar dados | Seus dados | Preencher nome e WhatsApp |
| Reconhecer dados futuros | Seus dados | Manter marcada a opcao de reconhecimento |
| Ver proximos horarios | Seus horarios | Consultar agendamentos futuros reconhecidos |
| Escolher servico | Escolha o atendimento | Selecionar servico |
| Escolher especialidade | Escolha o atendimento | Selecionar especialidade |
| Escolher profissional | Escolha o atendimento | Selecionar profissional |
| Escolher data | Escolha data e horario | Selecionar data |
| Escolher horario | Escolha data e horario | Clicar no horario |
| Enviar pedido | Resumo | Solicitar agendamento |
| Confirmar por link | Link operacional | Confirmar agendamento |
| Reagendar | Reagendamento | Escolher nova data e horario |
| Cancelar | Link operacional | Cancelar agendamento |

## 32. Secao tecnica do projeto

Esta secao e destinada ao projeto e nao faz parte do manual do cliente final.

- Rota principal frontend: `/agendar/{slug}`.
- Query params suportados na rota principal: `campanha` e `tk`.
- Rotas auxiliares frontend: `/acao_agendamento?cmd=confirmar&tk=...` e
  `/reagendar?tk=...`.
- Endpoints publicos principais:
  - `GET /public/booking/:slug`;
  - `GET /public/booking/:slug/availability`;
  - `POST /public/booking/:slug/identity`;
  - `GET /public/booking/:slug/client/appointments/upcoming`;
  - `POST /public/booking/:slug/appointments`;
  - `GET /public/booking/appointments/action`;
  - `POST /public/booking/appointments/action`;
  - `GET /public/booking/appointments/token/:token`;
  - `POST /public/booking/appointments/reschedule`.
- Mecanismo de identidade: token individual em `tk`, token salvo em
  `localStorage` por slug, ou lookup por nome + telefone. O token persistido no
  backend e armazenado como hash e possui expiracao configuravel.
- Chaves de armazenamento frontend:
  - `esthya:booking-identity:{slug}`;
  - `esthya:booking-session:{slug}`.
- Status internos observados no fluxo: `pendente_atendente`,
  `pendente_cliente`, `confirmado`, `cancelado`, `concluido`, `no_show`,
  `suspeito` e status legados reconhecidos pelo modulo de Agenda.
- Status inicial do agendamento publico: `pendente_atendente`, exceto quando a
  avaliacao de identidade marca `suspeito`.
- Ordem real da UI publica: Dados -> Servico -> Especialidade -> Profissional
  -> Data -> Horario.
- A disponibilidade publica reutiliza a Agenda interna e aplica as mesmas
  regras de escala, duracao, conflitos, bloqueios e antecedencia minima.
- Eventos WhatsApp relacionados incluem `appointment.created`,
  `appointment.pending_attendant`, `appointment.confirmed`,
  `appointment.rescheduled`, `appointment.cancelled`,
  `appointment.reminder_24h`, `appointment.reminder_2h`,
  `appointment.completed` e `appointment.no_show`.
- Envio real de WhatsApp depende de provider, templates aprovados e ambiente.
  Com `WHATSAPP_DRY_RUN=true`, o sistema registra/simula sem chamar a Meta.

## 33. Auditoria de divergencias

### Funcionalidade documentada e implementada

- Link publico por slug para agendamento.
- Identificacao progressiva por token, navegador ou nome + WhatsApp.
- Lista publica de servicos online com profissional compativel.
- Selecao de servico, especialidade, profissional, data e horario.
- Criacao de solicitacao publica com status inicial de aguardando profissional.
- Consulta de proximos atendimentos quando o cliente e reconhecido.
- Links operacionais de reagendamento e cancelamento.
- Pagina publica de acao para confirmar ou cancelar por token.
- Reagendamento por token mantendo servico/profissional do atendimento
  original.
- Template `appointment_confirmed` com acoes operacionais **Reagendar** e
  **Cancelar**.

### Funcionalidade implementada e pouco documentada para usuario final

- Bloco **Seus horarios** com proximos agendamentos futuros.
- Opcao de reconhecimento local no dispositivo.
- Uso de `campanha` para atribuicao de origem do link.
- Mensagem de servicos temporariamente indisponiveis quando nao ha profissional
  habilitado.

### Documentacao antiga ou inconsistente

- Trechos antigos de Agenda ainda descrevem fluxo generico de confirmacao com
  `confirmado` como destino principal. O codigo atual usa
  `pendente_atendente` na criacao e `pendente_cliente` no aceite operacional.
- Parte antiga da documentacao de Agenda usa nomenclaturas do MER legado, mas
  Booking publico e Agenda atuais usam o novo MER de Servicos.
- A documentacao tecnica da Fase 5 afirma que o frontend de Booking publico
  passou a selecionar na ordem Servico -> Especialidade -> Profissional. A tela
  atual realmente faz essa ordem dentro do bloco de atendimento, mas coloca
  **Seus dados** antes da escolha do atendimento.

### Funcionalidade planejada ainda nao confirmada na UI do cliente

- QR Code proprio da plataforma para acesso ao agendamento.
- Tela publica dedicada para atendimento concluido.
- Tela publica dedicada para no-show.
- Opcao **Qualquer profissional** no Booking publico.
- Alteracao de servico, especialidade ou profissional durante o reagendamento
  publico.

### Inconsistencias de nomenclatura

- A interface publica de proximos horarios mostra o status bruto recebido da
  API, sem traducao amigavel no componente atual.
- O fluxo de "confirmar" por link operacional existe, mas a area **Seus
  horarios** exposta ao cliente mostra somente reagendar/cancelar quando esses
  links existem.
