# ADR-014 - Campanhas WhatsApp por Modo de Entrega do Tenant

## Status

Aceita.

## Contexto

O diagnostico do fluxo da primeira mensagem de convite para agendamento mostrou
que o Bellory ja possui uma base forte para campanhas automaticas por WhatsApp
Business API: templates em `templates_mensagem`, fila/auditoria em
`mensagens_whatsapp`, registros em `campanha_envios` e links publicos de
agendamento.

Tambem ficou claro que muitos tenants pequenos usam apenas WhatsApp comum ou
WhatsApp Business App, sem Cloud API. Nesses casos, o Bellory nao pode enviar
mensagens automaticamente pela Meta, mas pode agregar valor preparando a
campanha para envio manual pelo usuario.

Em 2026-07-20, a decisao foi refinada para separar o primeiro convite de
ativacao inicial das campanhas recorrentes. O primeiro convite nao exige
importacao de contatos nem cadastro previo dos destinatarios no Bellory.

## Decisao

Campanha permanece uma entidade unica. O que muda e o modo de entrega,
determinado pela capacidade WhatsApp do tenant.

| Capacidade do tenant | Modo de entrega | Responsabilidade do Bellory |
| --- | --- | --- |
| WhatsApp Business API disponivel | Automatico | Gerar mensagens individuais, enfileirar em `mensagens_whatsapp`, enviar pelo provider e auditar status tecnico. |
| WhatsApp Business App sem Cloud API | Assistido | Gerar mensagem e link, permitir copiar/compartilhar/abrir WhatsApp e orientar uso de Lista de Transmissao. |
| WhatsApp Messenger comum | Assistido | Aplicar o mesmo fluxo assistido, respeitando as limitacoes do aplicativo. |
| WhatsApp Business App + Cloud API em coexistencia | Assistido para primeiro convite; automatico para relacionamento continuo | Usar o app para ativacao inicial manual e a Cloud API para clientes ja conhecidos quando as regras forem atendidas. |

## Regras

- O modo automatico pode registrar status tecnico de envio, entrega, leitura e
  falha quando houver provider/webhook.
- O modo assistido nao deve prometer automacao, entrega, leitura ou falha.
- O modo assistido pode registrar que a campanha foi preparada e, se houver
  confirmacao explicita, que o usuario informou ter enviado manualmente.
- O primeiro convite e um caso de ativacao inicial assistida; nao deve criar
  clientes apenas porque uma pessoa esta na agenda ou WhatsApp do tenant.
- Coexistencia App + API nao concede ao Bellory acesso automatico a contatos,
  Listas de Transmissao, conversas ou agenda do aplicativo.
- A Cloud API nao e obrigatoria para o primeiro convite, mesmo quando
  disponivel; ela permanece preferencial para relacionamento continuo com
  clientes ja conhecidos pelo Bellory.
- A mensagem assistida deve usar os mesmos principios de template, texto
  cordial, consentimento, opt-out e link publico de agendamento.
- Lista de Transmissao deve ser apresentada como recurso nativo do WhatsApp,
  nao como funcionalidade controlada pelo Bellory.
- Lista de Transmissao so entrega para contatos que salvaram o numero do
  profissional ou salao; por isso, e mais indicada para clientes recorrentes e
  nao substitui Cloud API ou midia paga para prospeccao.

## Consequencias

- O Bellory atende tenants sem exigir investimento inicial em Cloud API.
- O produto evita criar uma campanha duplicada para cada canal.
- A auditoria tecnica continua reservada ao modo automatico.
- A experiencia comercial do tenant melhora no curto prazo, enquanto a
  arquitetura permanece preparada para Business API, multiplos providers e
  canais futuros.
