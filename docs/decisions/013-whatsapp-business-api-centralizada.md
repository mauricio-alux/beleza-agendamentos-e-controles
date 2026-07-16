# ADR-013 - WhatsApp Business API Centralizada

## Status

Aceita.

## Contexto

O produto precisa iniciar o WhatsApp Operacional sem exigir que cada tenant
possua Meta Business Manager, WABA, templates ou webhooks proprios. Ao mesmo
tempo, modulos como Agenda, CRM e Campanhas nao devem conhecer detalhes da Meta
Cloud API.

## Decisao

O Bellory/Esthya sera o proprietario inicial da integracao com a WhatsApp
Business Cloud API. Toda mensagem operacional deve passar por uma camada
centralizada:

```text
Evento de negocio
  -> CommunicationService
  -> WhatsApp MySaaS Provider
  -> Meta Cloud API
```

O provider inicial se chama `whatsapp_mysaas`. Ele pode operar em `dry_run`
quando credenciais Meta nao estiverem configuradas, registrando auditoria em
`mensagens_whatsapp` sem chamar a API externa.

## Consequencias

- Tenants nao precisam configurar WABA na primeira versao.
- Modulos de negocio publicam eventos; nao enviam mensagens diretamente.
- Logs de comunicacao ficam centralizados em `mensagens_whatsapp`.
- Falhas de envio nao interrompem agenda, CRM, campanhas ou dashboards.
- A arquitetura fica preparada para multiplos providers no futuro.

## Regras

- Nao expor IDs internos em links enviados ao cliente.
- Usar token operacional do agendamento para confirmar, cancelar e reagendar.
- Respeitar sempre `tenant_id`, cliente, profissional e agendamento de origem.
- Nao enviar WhatsApp real em producao sem credenciais e templates aprovados.
