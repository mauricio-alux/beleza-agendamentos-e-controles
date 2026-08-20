# Roteiro operacional: Agenda e atendimentos

Este roteiro explica como o responsável pelo estabelecimento usa a Agenda para
consultar atendimentos, iniciar novos agendamentos e acompanhar as ações
operacionais depois que um horário é criado.

O texto abaixo descreve o comportamento atualmente implementado no projeto. Ele
evita regras planejadas ou antigas que ainda não aparecem na interface atual.

## 1. Objetivo da Agenda

A Agenda é a área onde o estabelecimento acompanha a operação diária.

Na tela **Agenda**, o usuário consulta e acompanha atendimentos de uma data.
Ela serve principalmente para:

- consultar os atendimentos existentes;
- acompanhar o andamento dos atendimentos;
- aplicar filtros por profissional, serviço e especialidade;
- exibir ou ocultar atendimentos cancelados;
- consultar alertas e ocupação da data;
- abrir os detalhes de um atendimento;
- iniciar um novo agendamento.

Há dois contextos diferentes:

| Contexto | Para que serve |
| --- | --- |
| Consultar Agenda | Ver atendimentos, filtrar resultados, acompanhar status, alertas e ocupação. |
| Novo Agendamento | Criar um novo atendimento e consultar horários disponíveis para uma combinação de data, profissional, serviço e especialidade. |

## 2. Antes de comecar

Antes de criar um agendamento, confira se o estabelecimento possui:

1. profissionais ativos;
2. servicos ativos;
3. especialidades vinculadas aos servicos;
4. profissionais autorizados para a combinacao de servico e especialidade;
5. escala ou horario padrao suficiente para a data desejada.

As opcoes exibidas na Agenda dependem dessas configuracoes. Se um servico,
especialidade ou profissional nao aparece como esperado, normalmente a causa
esta em configuracoes de Servicos, Especialidades ou Equipe.

## 3. Consultando a Agenda

Para acessar a tela, use o item **Agenda** no menu lateral.

A tela representa a operação de uma data. Ao abrir, o sistema parte da data
atual do ambiente local. A data exibida no cabeçalho é a data efetivamente
consultada.

Os principais blocos da tela são:

| Área | Para que serve |
| --- | --- |
| Cabeçalho da Agenda | Identifica o estabelecimento, a data consultada, o período consultado e o botão **Novo agendamento**. |
| Agenda do dia | Permite escolher a data que será pesquisada. |
| Filtros | Refina a consulta por profissional, serviço, especialidade e cancelados. |
| Agenda do dia, card principal | Exibe os atendimentos encontrados para a data e filtros aplicados. |
| Alertas da Agenda | Mostra pendências importantes da data, quando houver. |
| Ocupação da Agenda | Mostra uso da capacidade da data consultada. |
| Sugestões para a Agenda | Mostra oportunidades práticas para organizar melhor o dia, quando existirem. |

O card **Horários disponíveis** ou **Horários sugeridos** pertence ao fluxo de
**Novo Agendamento**. Ele não faz parte da consulta simples da tela **Agenda**.

## 4. Cabeçalho da Agenda

O cabeçalho atual mostra:

| Item | Finalidade |
| --- | --- |
| Motor inteligente | Identifica a área de agenda operacional. |
| Agenda do estabelecimento | Mostra que a consulta pertence ao estabelecimento atual. |
| Texto de orientação | Indica que a tela serve para consultar atendimentos, acompanhar pendências e criar horários sem conflitos. |
| Data consultada | Mostra se a consulta é de hoje ou de outra data selecionada. |
| Período consultado | Informa o intervalo considerado para a data, no horário de São Paulo. |
| Novo agendamento | Inicia o fluxo de criação de um novo atendimento, quando o usuário tem permissão. |

## 5. Novo agendamento

O botão **Novo agendamento** inicia o fluxo de criação de um novo atendimento.

Ele leva para a tela de criação, onde o usuário escolhe data, profissional,
serviço, especialidade, horário disponível e dados do cliente.

Esse fluxo é diferente da consulta da Agenda. Na consulta, o usuário acompanha
atendimentos existentes. No novo agendamento, o usuário cria um novo horário.

Veja também a seção **Criando um novo agendamento** deste roteiro.

## 6. Navegação por data

No card **Agenda do dia**, o usuário pode:

1. usar **Dia anterior** para consultar a data anterior;
2. usar **Próximo dia** para consultar a data seguinte;
3. escolher uma data manualmente no campo de data;
4. clicar em **Hoje** para voltar ao dia atual.

Ao alterar a data, a tela mostra o período em edição. A consulta principal é
atualizada quando o usuário clica em **Pesquisar** no card **Filtros**.

A data efetivamente consultada aparece no cabeçalho, junto com o período
consultado.

## 7. Card Filtros

O card **Filtros** permite refinar a consulta da Agenda.

Controles atuais:

| Controle | Para que serve |
| --- | --- |
| Profissional | Consulta todos os profissionais ou apenas um profissional específico. Em agenda pessoal, o sistema pode manter o usuário no próprio contexto. |
| Serviço | Consulta todos os serviços ou apenas o serviço escolhido. |
| Especialidade | Consulta todas as especialidades compatíveis ou apenas a especialidade escolhida. |
| Exibir cancelados | Define se atendimentos cancelados entram no resultado. |
| Limpar filtros | Restaura os filtros para o estado inicial. |
| Pesquisar | Aplica a data e os filtros selecionados. |

Na tela de consulta, **Todos os profissionais**, **Todos os serviços** e
**Todas as especialidades** são filtros válidos. Eles ampliam a pesquisa.

## 8. Filtros dependentes

Os filtros são dependentes para evitar combinações inválidas.

Ao escolher um profissional, o sistema mostra somente os serviços que esse
profissional pode realizar.

Ao escolher um serviço, o sistema mostra somente as especialidades compatíveis
com a combinação de profissional e serviço.

Exemplo: se Vivian Martins foi selecionada, a lista de serviços passa a
considerar apenas os serviços que Vivian pode executar. Depois que o serviço é
escolhido, a lista de especialidades mostra apenas as opções compatíveis com
essa combinação.

## 9. Pesquisar e limpar filtros

Alterar data ou filtros não significa, necessariamente, que a Agenda exibida já
foi atualizada.

Quando houver alterações ainda não aplicadas, a tela pode exibir a mensagem:

```text
Existem filtros alterados ainda não aplicados.
```

Clique em **Pesquisar** para atualizar a lista de atendimentos.

Ao clicar em **Limpar filtros**, a tela restaura os filtros para o estado
inicial:

- volta para a data de hoje;
- limpa profissional, serviço e especialidade;
- desmarca **Exibir cancelados**;
- em agenda pessoal, mantém o profissional vinculado ao usuário.

## 10. Exibir cancelados

Por padrão, a consulta não mostra atendimentos cancelados.

Quando **Exibir cancelados** está desmarcado, a Agenda lista os atendimentos
ativos, concluídos, pendentes, reagendados, expirados, em revisão e os casos em
que o cliente não compareceu.

Quando **Exibir cancelados** está marcado, os atendimentos cancelados também
entram no resultado. O card cancelado aparece destacado e informa que foi
mantido apenas para consulta histórica.

## 11. Agenda do dia

O card principal **Agenda do dia** exibe os atendimentos encontrados para a data e filtros aplicados.

Cada atendimento pode mostrar:

| Informação | O que significa |
| --- | --- |
| Horário | Hora inicial do atendimento. |
| Cliente | Nome do cliente do atendimento. |
| Serviço | Serviço agendado. |
| Profissional | Profissional responsável. |
| Valor | Valor exibido para o atendimento. |
| Status | Situação atual do atendimento. |
| Ver | Abre os detalhes do atendimento. |
| Ações | Botões operacionais disponíveis conforme status e permissão. |

Os atendimentos são exibidos na ordem retornada pela consulta da Agenda, normalmente em ordem cronológica da data.

## 12. Status dos atendimentos

| Status exibido | Significado | Ação comum |
| --- | --- | --- |
| Solicitado | Atendimento recebido em estado inicial ou legado. | Acompanhar. |
| Aguardando confirmação | Atendimento pendente de confirmação. | Confirmar, quando aplicável. |
| Aguardando confirmação do estabelecimento | Atendimento aguardando aceite do estabelecimento ou profissional. | Confirmar ou cancelar. |
| Aguardando confirmação do cliente | Atendimento aceito pela operação e aguardando execução ou ciência do cliente. | Concluir, cancelar ou marcar cliente não compareceu quando chegar o horário. |
| Confirmado | Atendimento confirmado. | Concluir, cancelar ou marcar cliente não compareceu quando chegar o horário. |
| Concluído | Atendimento realizado. | Consulta histórica. |
| Cancelado | Atendimento cancelado. | Consulta histórica. |
| Cliente não compareceu | Cliente não compareceu ao atendimento. | Consulta histórica e análise operacional. |
| Reagendado | Atendimento remarcado. | Acompanhar novo horário quando aplicável. |
| Expirado pelo profissional | Atendimento expirou aguardando ação profissional. | Consulta e eventual nova solicitação. |
| Expirado pelo cliente | Atendimento expirou aguardando ação do cliente. | Consulta e eventual nova solicitação. |
| Revisão necessária | Atendimento precisa de revisão operacional. | Revisar antes de aceitar. |

## 13. Botão Ver

O botão **Ver** abre os detalhes do atendimento.

Nos detalhes, o usuário pode consultar status, valor, profissional, WhatsApp do cliente, motivo do cancelamento quando existir, alerta operacional quando existir e ações disponíveis para o status atual.

## 14. Ações operacionais

As ações dependem do status do atendimento e das permissões do usuário.

| Ação | Quando aparece | Resultado esperado |
| --- | --- | --- |
| Confirmar | Para atendimentos aguardando confirmação do estabelecimento ou pendentes equivalentes. | Registra a confirmação operacional. |
| Cancelar | Para atendimentos que ainda não estão em estado final. | Abre o motivo de cancelamento e muda o atendimento para cancelado. |
| Concluir ou Concluir Agora | Para atendimentos aguardando cliente ou confirmados. | Finaliza o atendimento como concluído. |
| Reagendar | Para atendimentos pendentes do estabelecimento, pendentes do cliente ou confirmados. | Abre o reagendamento operacional na própria Agenda. |
| Cliente não compareceu | Para atendimentos aguardando cliente ou confirmados, após o início do horário. | Registra que o cliente não compareceu. |
| Mais ações | Em telas pequenas, agrupa ações secundárias do card. | Exibe ações como Ver, Reagendar, Cancelar ou Cliente não compareceu. |

O botão **Reagendar** aparece ao lado do botão **Ver** quando o atendimento pode ser alterado e o usuário possui permissão operacional para reagendamento.

Não aparece para atendimentos **Concluído**, **Cancelado**, **Cliente não compareceu** ou outros status finais.

Ao clicar em **Reagendar**, a Agenda abre um componente contextual sem tirar o usuário da página. O atendimento correspondente é carregado automaticamente e o usuário segue as regras atuais para escolher nova data e horário.

## 15. Estado sem atendimentos

Quando nenhum atendimento é encontrado, a tela mostra:

```text
Nenhum atendimento encontrado em [data].
```

Se houver filtros ativos, a mensagem informa que não houve resultado para a data e os filtros selecionados.

Quando o usuário tem permissão, o estado vazio mostra o botão **Novo agendamento**, que inicia a criação de um atendimento.

## 16. Reagendamento operacional

O reagendamento operacional permite alterar a data e o horário de um atendimento sem sair da tela **Agenda**.

O botão **Reagendar** aparece nos cards da **Agenda do dia** quando:

- o atendimento está pendente do estabelecimento;
- o atendimento está pendente do cliente;
- o atendimento está confirmado;
- o usuário tem permissão para reagendar atendimentos.

O botão não aparece para atendimentos **Concluído**, **Cancelado**, **Cliente não compareceu** ou outros status finais.

Ao clicar em **Reagendar**, a tela abre um modal no desktop e um painel inferior no celular. Esse componente mostra o resumo do atendimento atual somente para consulta:

- cliente;
- serviço;
- especialidade;
- profissional;
- data atual;
- horário atual;
- duração;
- valor;
- status.

Depois disso, o usuário escolhe uma nova data. A Agenda consulta automaticamente os horários disponíveis para o mesmo profissional, serviço e especialidade do atendimento.

Para concluir, o usuário seleciona um novo horário e clica em **Confirmar reagendamento**. A mensagem **Novo horário selecionado** apenas confirma visualmente a escolha; ela não salva o reagendamento.

As ações ficam no rodapé do modal ou do painel inferior:

- **Confirmar reagendamento** é o botão principal;
- **Cancelar** é o botão secundário.

O botão **Confirmar reagendamento** começa desabilitado. Ele só fica disponível quando existe uma nova data válida, um novo horário válido, a combinação é diferente do atendimento atual, não há erro de disponibilidade e não existe processamento em andamento.

Antes de finalizar, o sistema valida novamente se o horário escolhido continua disponível. Se outro atendimento ocupar o horário nesse intervalo, a Agenda informa que o horário não está mais disponível e atualiza a lista de horários.

Durante a confirmação, o botão principal mostra **Reagendando...** e evita envio duplicado.

Ao confirmar com sucesso, a mensagem **Atendimento reagendado com sucesso.** é exibida, o modal é fechado, a Agenda permanece na mesma tela e os cards, alertas e ocupação da data são atualizados.

Se o usuário clicar em **Cancelar** ou no botão **X**, o modal é fechado sem alterar o atendimento e os dados temporários da tentativa de reagendamento são descartados.

Esse fluxo é diferente do reagendamento do cliente final. O cliente pode receber links públicos de reagendamento por canais operacionais, enquanto o usuário interno faz o reagendamento autenticado diretamente pela Agenda.

## 17. Alertas da Agenda

O card **Alertas da Agenda** mostra pendências importantes da data.

Quando não há pendências, aparece:

```text
Tudo em ordem. Nenhuma pendência importante para esta data.
```

Quando houver alertas, a tela pode listar até três itens de maior prioridade. O usuário deve ler o alerta e abrir a Agenda do dia ou o detalhe do atendimento quando precisar agir.

## 17. Ocupação da Agenda

O card **Ocupação da Agenda** resume a capacidade da data consultada.

| Indicador | O que significa |
| --- | --- |
| Ocupação | Percentual de uso da agenda na data. |
| Tempo livre | Tempo ainda livre dentro da capacidade considerada. |
| Tempo ocupado | Tempo ocupado por atendimentos. |
| Aproveitamento | Indicador de eficiência da ocupação da agenda. |

Esses indicadores consideram a data consultada e ajudam a entender se ainda existe espaço para novos atendimentos.

## 18. Sugestões para a Agenda

O card **Sugestões para a Agenda** aparece somente quando existem oportunidades práticas para organizar melhor o dia.

Ele pode indicar situações como baixa ocupação ou possibilidade de concentrar horários. Quando não houver sugestões, o card não aparece.

## 19. Comportamento mobile

No celular, a Agenda continua com as mesmas funções, mas os cards aparecem em sequência vertical.

Funcionalmente:

- as informações prioritárias aparecem primeiro;
- filtros podem ficar mais compactos;
- ações secundárias podem aparecer agrupadas em **Mais ações**;
- o usuário pode rolar a tela para consultar alertas, ocupação e Agenda do dia.

## 20. Como utilizar a Agenda no dia a dia

Ordem recomendada:

1. confirme a data consultada;
2. veja se há alertas da Agenda;
3. consulte a **Agenda do dia**;
4. aplique filtros quando necessário;
5. abra **Ver** para consultar detalhes;
6. use ações operacionais conforme o status;
7. crie um novo agendamento quando necessário.

## 21. Criando um novo agendamento

Na tela principal da Agenda, clique em **Novo agendamento**. A plataforma abre a
tela **Criar agendamento**.

O fluxo funcional é:

1. escolher a data;
2. escolher o profissional;
3. escolher o serviço;
4. escolher a especialidade;
5. aguardar o cálculo dos horários disponíveis;
6. escolher um horário;
7. preencher os dados obrigatorios do cliente;
8. clicar em **Criar agendamento**.

## 22. Card Agenda do dia no novo agendamento

Na tela **Criar agendamento**, o card **Agenda do dia** define a data em que o
atendimento será criado.

Se a data for hoje, o sistema calcula apenas horários que ainda respeitam as
regras atuais, como antecedência mínima, duração do serviço e fim do
expediente.

Se a data for futura, o sistema calcula a disponibilidade daquela data.

Se a data for passada, a tela volta para a Agenda na data escolhida, pois data
passada é tratada como consulta, não como criação de novo horário.

## 23. Card Configuração

No card **Configuração**, selecione:

1. **Profissional**;
2. **Serviço**;
3. **Especialidade**.

As listas dependem das configurações válidas do estabelecimento. Depois de
escolher o serviço, a plataforma mostra as especialidades compatibilizadas para
aquele serviço. Para que horários sejam calculados, o profissional também
precisa estar apto a atender a combinação escolhida.

Alguns motivos comuns para uma opção não aparecer:

- o serviço não está ativo para o estabelecimento;
- a especialidade não está ativa ou não está vinculada ao serviço;
- o profissional não possui a especialidade;
- o profissional não está vinculado à combinação serviço + especialidade.

## 24. Troca de configuração

Quando o usuário altera data, profissional, serviço ou especialidade:

- os horários exibidos anteriormente deixam de valer;
- o horário selecionado é limpo;
- mensagens anteriores deixam de representar a nova configuração;
- o sistema recalcula a disponibilidade quando todos os campos necessarios
  estão preenchidos.

Esse comportamento evita criar agendamento com horário calculado para outra
combinação.

## 25. Horários disponíveis

O card **Horários disponíveis** mostra os horários que podem ser escolhidos
para a configuração atual.

O cálculo considera:

- data selecionada;
- profissional;
- serviço;
- especialidade;
- escala ou horário padrão;
- intervalo;
- duração do atendimento;
- antecedência mínima;
- agendamentos ja existentes;
- bloqueios operacionais;
- ocupação da agenda.

Os horários aparecem em ordem cronológica para facilitar a escolha do usuário.

## 26. Sugestões inteligentes

Quando existem horarios disponiveis, a plataforma pode destacar ate tres
**Sugestoes inteligentes**.

Essas sugestoes continuam sendo horarios normais. A diferenca e que o sistema
pode priorizar opcoes que ajudam a organizar melhor a agenda, como melhores
encaixes, melhor ocupacao e reducao de intervalos improdutivos.

Os selos exibidos podem indicar qualidade como:

- **Otimo encaixe**;
- **Bom**;
- **Regular**;
- **Disponivel**.

## 27. Antecedência mínima

O estabelecimento pode configurar uma antecedencia minima para novos
agendamentos. Essa regra impede criar um horario muito em cima da hora.

O valor nao e uma regra universal da plataforma: ele depende da configuracao do
estabelecimento. Em bases de teste, e comum encontrar 60 minutos.

Para agendamentos no mesmo dia, pode nao haver horario disponivel perto do fim
do expediente porque o sistema precisa somar:

```text
antecedencia minima + duracao do servico
```

Exemplo: se a antecedencia minima e de 60 minutos, o expediente termina as
18:00 e o atendimento dura 45 minutos, pode nao existir tempo suficiente para
iniciar um novo atendimento no mesmo dia.

## 28. Mensagens de indisponibilidade

Quando nao ha horarios disponiveis, a plataforma pode mostrar mensagens
especificas conforme o motivo predominante:

- **Nao ha horarios disponiveis para hoje.** Quando a antecedencia minima
  impede novos horarios para o dia atual.
- **Nao ha horarios dentro do expediente para esta data.** Quando os horarios
  calculados ficam fora da escala ou dentro do intervalo.
- **Nao ha tempo suficiente para este atendimento em esta data.** Quando a
  duracao do servico nao cabe na janela disponivel.
- **Nao ha horarios livres para esta data.** Quando todos os horarios possiveis
  conflitam com atendimentos existentes.
- **Profissional indisponivel nesta data.** Quando o profissional nao possui
  janela ativa para atendimento.
- **Os horarios de esta data estao bloqueados.** Quando bloqueios impedem os
  horarios.
- **Escala nao encontrada para esta data.** Quando nao ha escala operacional
  para calcular horarios.
- **Especialidade incompativel com o servico selecionado.** Quando a
  configuracao de servico e especialidade nao permite o calculo.
- **Profissional sem vinculo com esta combinacao.** Quando o profissional nao
  atende a combinacao escolhida.

Essas mensagens orientam a acao correta: escolher outra data, ajustar escala,
revisar vinculos do profissional ou revisar configuracoes do servico.

## 29. Escolha do horário

Para criar o agendamento, o usuario precisa selecionar um horario no card
**Horarios disponiveis**.

O botao **Criar agendamento** fica indisponivel enquanto nenhum horario estiver
selecionado. Depois da selecao, se o usuario mudar data, profissional, servico
ou especialidade, o horario escolhido e limpo e o usuario precisa escolher
outro horario.

## 30. Dados do cliente

O card **Cliente** possui os campos abaixo.

| Campo | Obrigatorio? | Finalidade |
| --- | --- | --- |
| Nome | Sim | Identificar o cliente no atendimento e na agenda. |
| WhatsApp | Sim | Identificar o cliente por telefone e permitir rotinas de comunicacao operacional. |
| Email | Opcional | Complementar o cadastro do cliente. |
| CEP | Opcional | Buscar endereco automaticamente quando informado. |
| Estado | Opcional | Complementar o endereco depois de um CEP valido ou preenchimento manual. |
| Cidade | Opcional | Complementar o endereco. |
| Logradouro | Opcional | Complementar o endereco. |
| Numero | Opcional | Complementar o endereco. |

O WhatsApp deve ter um formato válido para telefone. O sistema prepara o
número antes de registrar o agendamento.

## 31. WhatsApp

O WhatsApp e usado como identificador operacional do cliente e pode alimentar
rotinas de confirmacao, lembretes, reagendamento, cancelamento e relacionamento.

Em ambiente de desenvolvimento ou sem credenciais de envio real, as mensagens
podem ser apenas registradas ou simuladas. Portanto, o roteiro nao deve
prometer entrega pela Meta em todos os ambientes.

## 32. Botão Criar agendamento

O botao **Criar agendamento** fica habilitado quando um horario foi selecionado.

Ao clicar, o formulario tambem exige:

- nome do cliente;
- WhatsApp do cliente;
- configuracao valida de profissional, servico e especialidade;
- horario ainda disponivel no momento da gravacao.

Se outro atendimento ocupar o mesmo horario antes da conclusao, a plataforma
bloqueia a criacao e informa que o horario esta indisponivel.

## 33. Resultado da criação

Quando o agendamento e criado com sucesso, a tela mostra:

```text
Solicitacao enviada. O horario fica reservado enquanto aguarda confirmacao.
```

O formulário limpa os dados preenchidos e atualiza a agenda. O status inicial
normal é **Aguardando confirmação do estabelecimento**. Se o sistema identificar algum sinal de
risco na identidade do cliente, o status pode aparecer como **Revisão
necessária**.

O atendimento pode ser encontrado na tela **Agenda**, na data do atendimento.

## 34. Status do agendamento no fluxo de criação

Os status relevantes para a Agenda estão descritos na seção **Status dos atendimentos**. Use a nomenclatura funcional exibida na tela, como **Aguardando confirmação do estabelecimento**, **Aguardando confirmação do cliente**, **Concluído**, **Cancelado** e **Cliente não compareceu**.

## 35. Acompanhando atendimentos

Na tela **Agenda**, acompanhe a operação pelo card **Agenda do dia**.

Cada card de atendimento mostra:

- horário inicial;
- nome do cliente;
- serviço;
- profissional;
- status;
- valor;
- alerta operacional, quando o atendimento já terminou ou está próximo de
  conclusão automática;
- ações disponíveis conforme status e permissão.

Use os filtros para consultar por profissional, serviço, especialidade e
cancelados.

## 36. Agendamentos cancelados

Por padrão, a Agenda não mostra cancelados na consulta principal.

Para consultar cancelados:

1. ative **Exibir cancelados**;
2. clique em **Pesquisar**;
3. localize o atendimento no card **Agenda do dia**.

O card cancelado aparece visualmente destacado e informa que o atendimento foi
mantido apenas para consulta histórica. No detalhe do atendimento, quando o
motivo estiver salvo, ele aparece em **Motivo do cancelamento**.

## 37. Detalhamento das ações sobre um agendamento

As ações aparecem conforme permissão do usuário e status do atendimento.

### Ver

Aparece no card **Agenda do dia**. Abre a tela de detalhe do agendamento.

### Confirmar

Aparece para atendimentos **Aguardando confirmação do estabelecimento** ou pendentes equivalentes.

Efeito: o atendimento passa para **Aguardando confirmação do cliente**. O sistema registra a
confirmação operacional e pode gerar comunicação operacional conforme a
configuração do ambiente.

### Cancelar

Aparece para atendimentos que ainda não estão em estado final.

Ao cancelar, o sistema abre um modal de motivo. O usuário deve escolher um dos
motivos:

- Profissional indisponível;
- Cliente solicitou alteração;
- Erro no agendamento;
- Serviço indisponível;
- Horário indisponível;
- Problema operacional do estabelecimento;
- Outro motivo.

Se escolher **Outro motivo**, o complemento é obrigatório. O atendimento passa
para **Cancelado**.

### Concluir Agora

Aparece para atendimentos **Aguardando confirmação do cliente** ou **Confirmado**.

Efeito: o atendimento passa para **Concluído** e alimenta o histórico
operacional do cliente.

Se o horário do atendimento ainda estiver no futuro, a plataforma mostra uma
confirmação adicional com horário agendado e horário atual. Essa proteção
reduz conclusões acidentais.

### Cliente não compareceu

Aparece para atendimentos **Aguardando confirmação do cliente** ou **Confirmado**.

A ação só fica habilitada depois do início do atendimento. Antes disso, o botão
pode aparecer desabilitado com a orientação de que a ação fica disponível após
o início do atendimento.

Efeito: o atendimento passa para **Cliente não compareceu** e o histórico do cliente registra
o não comparecimento.

### Reagendar

O botão **Reagendar** fica disponível na Agenda para atendimentos que ainda
podem ser alterados, como **Aguardando confirmação do estabelecimento**,
**Aguardando confirmação do cliente** e **Confirmado**.

A ação abre um modal ou painel inferior dentro da própria Agenda. O usuário
consulta o resumo do atendimento atual, escolhe uma nova data, seleciona um
horário disponível e confirma a alteração sem sair da página.

Não use essa ação para atendimentos **Concluído**, **Cancelado** ou **Cliente
não compareceu**, pois esses status representam situações finalizadas para a
Agenda.

O reagendamento interno é diferente do fluxo do cliente final. O cliente final
pode usar links públicos enviados por canais operacionais; a Agenda interna usa
apenas o acesso autenticado do usuário operacional.

## 38. Confirmações

O fluxo operacional atual é:

```text
Agendamento criado
-> Aguardando confirmação do estabelecimento
-> Estabelecimento ou responsável confirma
-> Aguardando confirmação do cliente
-> Atendimento é executado
-> Concluído
```

O status **Confirmado** ainda existe para compatibilidade, mas o aceite
operacional atual grava o atendimento como **Aguardando confirmação do cliente**.

## 39. Cancelamento

Para cancelar:

1. abra a Agenda;
2. localize o atendimento;
3. clique em **Cancelar**;
4. escolha o motivo;
5. informe complemento quando necessário;
6. confirme o cancelamento.

Depois do cancelamento, o atendimento deixa de aparecer na consulta padrão. Para
vê-lo novamente, ative **Exibir cancelados**.

Ao cancelar, o horário volta a ser considerado livre para novos cálculos,
desde que não exista outro impedimento operacional.

## 40. Conclusão do atendimento

Para concluir:

1. localize um atendimento aceito;
2. clique em **Concluir Agora**;
3. confirme a ação se o sistema pedir confirmação antecipada.

O atendimento passa para **Concluído** e a plataforma atualiza o histórico do
cliente. O sistema também possui rotina de conclusão automática para
atendimentos aceitos que já terminaram, respeitando a tolerância configurada no
ambiente.

## 41. Cliente não compareceu

Use **Cliente não compareceu** quando o cliente não apareceu para o atendimento.

Essa ação só pode ser feita depois do horário de início do atendimento. O
registro alimenta o histórico do cliente e pode apoiar futuras análises de
relacionamento, campanhas e risco operacional.

## 42. Histórico

Atendimentos anteriores podem ser acompanhados pela própria Agenda,
selecionando a data desejada no card **Agenda do dia** e clicando em
**Pesquisar**.

Atendimentos concluídos e registros de cliente que não compareceu também alimentam o histórico operacional do
cliente. O módulo de Clientes usa essas informações quando disponíveis.

## 43. O que fazer quando...

### Nenhum horario aparece

Confira se data, profissional, servico e especialidade foram selecionados.
Depois, leia a mensagem exibida no card **Horarios disponiveis**. Ela pode
indicar antecedencia minima, escala, fim do expediente, conflitos ou bloqueios.

### O servico nao aparece

Verifique em Configuracoes se o servico esta ativo para o salao e se possui
configuracao operacional valida.

### A especialidade nao aparece

Verifique se a especialidade esta ativa e vinculada ao servico escolhido.

### O profissional nao aparece ou nao atende a combinacao

Verifique em Equipe se o profissional esta ativo, possui a especialidade e esta
vinculado a combinacao de servico e especialidade.

### O botao Criar agendamento permanece desabilitado

Selecione um horario disponivel. O botao depende principalmente da selecao do
horario. Ao enviar, o sistema ainda valida nome, WhatsApp e disponibilidade
real.

### Uma data passada foi selecionada

Data passada e usada para consulta. Na tela de criacao, a plataforma redireciona
para a Agenda daquele dia.

### Nao encontro um agendamento cancelado

Ative **Exibir cancelados** e clique em **Pesquisar**.

### Recebi mensagem de indisponibilidade

Siga a orientacao da mensagem. Em geral, a solucao e escolher outra data,
ajustar escala, liberar bloqueios, revisar agendamentos existentes ou corrigir
os vinculos de servico, especialidade e profissional.

## 44. Exemplo prático de consulta da Agenda

Exemplo fictício: o usuário deseja consultar os atendimentos de 13/08/2026 realizados por Vivian Martins.

1. Acesse **Agenda** pelo menu lateral.
2. No card **Agenda do dia**, escolha `13/08/2026`.
3. No card **Filtros**, selecione **Vivian Martins**.
4. Se necessário, selecione um serviço.
5. Se necessário, selecione uma especialidade.
6. Clique em **Pesquisar**.
7. Analise os atendimentos no card **Agenda do dia**.
8. Clique em **Ver** para abrir os detalhes de um atendimento.

## 45. Exemplo de consulta de cancelados

1. Acesse **Agenda**.
2. Selecione a data desejada.
3. Marque **Exibir cancelados**.
4. Clique em **Pesquisar**.
5. Consulte os atendimentos cancelados junto aos demais resultados.

## 46. Exemplo completo de novo agendamento

Exemplo fictício:

- Cliente: Maria Silva
- Profissional: Ana Souza
- Serviço: Corte de cabelo
- Especialidade: Corte Feminino
- Data: 15/08/2026
- Horário: 14:00

Passo a passo:

1. Acesse **Agenda** pelo menu lateral.
2. Clique em **Novo agendamento**.
3. No card **Agenda do dia**, escolha `15/08/2026`.
4. No card **Configuração**, selecione **Ana Souza**.
5. Selecione **Corte de cabelo**.
6. Selecione **Corte Feminino**.
7. Aguarde o card **Horários disponíveis** carregar.
8. Clique no horário **14:00**.
9. No card **Cliente**, informe **Maria Silva** e o WhatsApp.
10. Preencha email e endereço somente se necessário.
11. Clique em **Criar agendamento**.
12. Após o sucesso, volte para **Agenda** e consulte o dia `15/08/2026`.
13. Localize o card de Maria Silva no card **Agenda do dia**.
14. Quando o estabelecimento aceitar o atendimento, clique em **Confirmar**.
15. Depois do atendimento, clique em **Concluir Agora**. Se Maria não
    comparecer, use **Cliente não compareceu** após o horário de início.

## 47. Mapa funcional da tela

| Área | Para que serve |
| --- | --- |
| Cabeçalho | Identifica estabelecimento, data consultada, período e acesso ao novo agendamento. |
| Agenda do dia, seletor | Permite mudar a data de consulta. |
| Filtros | Refina a consulta por profissional, serviço, especialidade e cancelados. |
| Agenda do dia, lista | Exibe os atendimentos encontrados. |
| Alertas da Agenda | Mostra situações que exigem atenção. |
| Ocupação da Agenda | Mostra utilização da capacidade da data. |
| Sugestões para a Agenda | Mostra oportunidades de organização do dia, quando existirem. |
| Detalhe do atendimento | Mostra resumo e ações do atendimento selecionado. |

## 48. Divergências encontradas e ajustadas na documentação

Esta seção registra ajustes feitos para alinhar a documentação à tela atual.

- A documentação anterior tratava **Horários sugeridos** como parte permanente da tela de consulta da Agenda. Isso foi removido da consulta simples e mantido apenas no contexto de **Novo Agendamento**.
- A documentação anterior citava **Timeline diária**. A tela atual usa o card **Agenda do dia** para listar os atendimentos.
- A documentação anterior usava status como **Aguardando profissional**, **Aguardando Cliente** e **No-show**. A documentação foi atualizada para a nomenclatura funcional atual.
- A documentação anterior não detalhava a regra atual de filtros dependentes entre profissional, serviço e especialidade.
- A documentação anterior não explicava que **Pesquisar** aplica as mudanças de data e filtros.
- A documentação anterior não detalhava o estado vazio atual nem o botão funcional **Novo agendamento**.
- A documentação anterior não separava claramente a consulta da Agenda do fluxo de Novo Agendamento.

## 49. Fontes auditadas

Foram auditados a página de Agenda, os componentes de calendário, filtros, lista de atendimentos, cards de atendimento, detalhe do atendimento, alertas, ocupação, sugestões, fluxo de novo agendamento e serviços de consulta usados pela tela.
