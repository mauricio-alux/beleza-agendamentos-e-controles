# 008 - Padrao Global de Mensagens

## Status

Aceita.

## Contexto

O produto possuia mensagens de erro, alerta, validacao e feedback visual
espalhadas em componentes e services. Isso aumentava o risco de mensagens
tecnicas chegarem ao usuario e criava diferencas visuais entre telas.

## Decisao

Adotar uma camada centralizada de normalizacao textual e um componente visual
reutilizavel para feedbacks.

No backend:

- erros passam pelo middleware global;
- respostas incluem `success`, `code`, `message` e `error`;
- mensagens tecnicas ficam em logs e detalhes controlados;
- mensagens ao usuario saem de um catalogo amigavel.

No frontend:

- `FeedbackMessage` e o bloco visual padrao para erro, alerta, sucesso e info;
- `lib/messages.ts` centraliza mensagens por codigo e normalizacao de textos;
- clients HTTP devem preferir `code/message` da API e bloquear mensagens
  tecnicas conhecidas.

## Regras

- Nao exibir stack trace, constraint, falha SQL ou texto tecnico cru ao usuario.
- Destaques visuais aparecem apenas quando existe mensagem ativa.
- Campos voltam ao estado visual normal quando a validacao e resolvida.
- Textos devem permanecer em portugues-BR e preparados para futura i18n.

## Placeholders E Textos De Orientacao

Placeholders de inputs e textareas devem ser visualmente mais leves que valores
preenchidos pelo usuario. O padrao global deve usar menor contraste/opacidade
para placeholder e manter o valor real no foreground normal do campo.

Esse comportamento deve ser aplicado de forma centralizada no tema/CSS global
ou em componente compartilhado de formulario, evitando correcoes locais por
tela. A regra vale para agendamento publico, dashboard, clientes, equipe,
servicos, campanhas e demais formularios operacionais.

Mesmo com menor destaque, o placeholder deve permanecer legivel e funcionar
apenas como orientacao. Dados preenchidos, valores selecionados e mensagens de
validacao continuam sendo a fonte principal de informacao para o usuario.

## Consequencias

- UX mais consistente entre login, cadastro, onboarding, servicos, equipe,
  agenda e configuracoes.
- O contrato de erro segue compativel com o envelope antigo `error`, mas ja
  oferece campos de topo para a nova camada de mensagens.
