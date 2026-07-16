# Modo de Testes de Clientes

## Objetivo

O painel de diagnostico permite homologar, em desenvolvimento, o fluxo real de
identificacao de clientes no agendamento publico usando um unico navegador.

Ele nao cria clientes, nao emite tokens e nao altera a identificacao automatica.

## Ativacao

No frontend:

```env
NEXT_PUBLIC_DEV_MODE=true
```

O painel exige simultaneamente:

- `NODE_ENV=development`;
- `NEXT_PUBLIC_DEV_MODE=true`;
- pagina publica `/agendar/[slug]`.

Uma sessao administrativa ativa no mesmo navegador nao interfere na exibicao.
O painel nao e renderizado em producao nem em rotas administrativas.

## Informacoes

O painel apresenta:

- cliente identificado, WhatsApp e ID;
- token local do tenant atual;
- tenant e slug;
- `device_hash` e `browser_hash`, quando existirem;
- contexto da sessao publica.

As chaves reais do agendamento sao:

- `esthya:booking-identity:<slug>` no `localStorage`;
- `esthya:booking-session:<slug>` no `sessionStorage`.

As chaves genericas previstas para evolucao (`cliente_token`, `device_hash`,
`browser_hash` e `session_context`) tambem sao reconhecidas e removidas.

## Acoes

- **Limpar token** remove a identidade local e o parametro `tk` da URL.
- **Simular novo dispositivo** remove identidades, hashes e sessoes de
  agendamento armazenados no navegador.
- **Copiar token** copia o token ativo para diagnostico.

Remover `tk` antes do reload e obrigatorio: um token presente no link
reidentificaria imediatamente o cliente.

## Reidentificacao sem token

Sem token valido, o agendamento exibe o formulario normal. No envio:

1. o telefone e normalizado;
2. o backend procura o cliente pelo par `tenant_id + telefone`;
3. se o vinculo existir, o mesmo cliente e reutilizado;
4. os dados e o ultimo acesso sao atualizados;
5. os tokens publicos anteriores sao revogados e um novo token e emitido;
6. o frontend armazena o novo token quando o cliente autoriza a lembranca.

A identificacao no banco usa uma trava transacional exclusiva para o par
`tenant_id + telefone`. Assim, requisicoes simultaneas nao criam clientes
duplicados no mesmo tenant. O mesmo telefone continua podendo existir de forma
independente em tenants diferentes.

## Cuidados

- Nunca habilitar a flag em configuracao de producao.
- Nunca registrar tokens em logs do backend.
- Preservar o isolamento por slug/tenant.
- Manter criacao de clientes exclusivamente no fluxo real de agendamento.
