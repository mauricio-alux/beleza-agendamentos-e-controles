# Guia de linguagem da interface

Este guia define a padronização textual da interface do Esthya e deve orientar novas telas, mensagens e ajustes de UX/UI.

## Marca do SaaS

- Nunca escrever `Bellory` fixo em textos visíveis ao usuário.
- Usar `APP_BRAND.appName` no frontend quando o texto precisar citar o nome comercial do SaaS.
- Em documentação funcional, usar "a plataforma" ou "o SaaS" quando não houver variável dinâmica disponível.

## Estabelecimento

- Nunca usar `tenant` em texto visível ao usuário.
- Quando houver nome do estabelecimento, exibir o nome dinâmico, como `session.tenant.nome_fantasia`.
- Quando o nome não estiver disponível, usar "Estabelecimento".
- Identificadores técnicos como `tenant_id`, `tenant_slug`, `TenantProfileForm` e rotas/API internas devem ser preservados.

## Terminologia oficial

- Salão
- Estabelecimento
- Profissional
- Cliente
- Serviço
- Especialidade
- Agendamento
- Atendimento
- Horários disponíveis
- Agenda do dia
- Configuração
- Comunicação
- Campanhas
- Assinaturas

## Capitalização

- Títulos de páginas e cards devem usar capitalização consistente: "Novo Agendamento", "Clientes", "Campanhas", "Configuração do Estabelecimento".
- Labels e mensagens comuns usam frase normal: "Informe seu email", "Selecione um profissional".
- Evitar caixa alta fora de pequenos identificadores visuais já previstos no design.

## Botões

Usar comandos curtos e consistentes:

- Salvar
- Cancelar
- Excluir
- Editar
- Pesquisar
- Confirmar
- Concluir
- Voltar
- Fechar

Evitar variações desnecessárias quando a ação for equivalente.

## Mensagens

- Erros devem ser compreensíveis e sem código técnico.
- Preferir:
  - "Não foi possível carregar informações."
  - "Não foi possível concluir a operação."
  - "Erro ao salvar."
  - "Nenhum registro encontrado."
- Sucesso deve confirmar a acao:
  - "Operação realizada com sucesso."
  - "Agendamento criado com sucesso."
  - "Serviço atualizado com sucesso."

## Placeholders

Padrões recomendados:

- "Informe seu email"
- "Selecione um profissional"
- "Selecione um serviço"
- "Selecione uma especialidade"
- "Escolha uma data"
- "Nome do cliente"
- "CEP opcional"

## Datas e valores

- Datas: usar formato brasileiro, como `12/08/2026`.
- Horários: usar `HH:mm`, como `14:30`.
- Moeda: usar `R$ 35,00`.
- Usar `Intl.DateTimeFormat("pt-BR")` e `Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" })` quando possível.

## Acentuação e ortografia

Todos os textos visíveis devem usar português correto:

- Salão, não Salao
- Configuração, não Configuracao
- Informações, não Informacoes
- Usuário, não Usuario
- Serviço, não Servico
- Descrição, não Descricao
- Não, não Nao
- Horário, não Horario

## Documentação funcional

- Documentação destinada ao usuário operacional deve seguir a mesma terminologia da interface.
- Documentação técnica pode manter nomes internos, tabelas, colunas, endpoints, tipos e identificadores.
