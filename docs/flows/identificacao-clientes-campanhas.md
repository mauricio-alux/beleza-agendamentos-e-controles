# Identificacao de clientes em links publicos

## Link generico de campanha

Formato:

```text
/agendar/:slug?campanha=:campanha
```

1. A pagina registra tenant, link, campanha, origem e sessao.
2. O cliente informa nome e WhatsApp; email permanece opcional.
3. O backend procura o telefone somente dentro do tenant atual.
4. O vinculo existente e atualizado ou um novo cliente e vinculo sao criados.
5. Um token opaco e aleatorio e devolvido ao navegador.
6. O navegador pode guardar o token localmente mediante autorizacao.
7. O agendamento registra a atribuicao da campanha.

Quando nao existe token valido, a identificacao manual exige:

- Nome obrigatorio.
- Celular/WhatsApp obrigatorio.
- Email opcional.

O telefone e normalizado antes da consulta. A busca usa `tenant_id` +
`celular_normalizado`, nunca apenas telefone global, para preservar isolamento
multi-tenant e evitar reutilizacao indevida de cadastros entre saloes.

Se o cliente ja existir no tenant, o backend reutiliza o cadastro, gera novo
token publico e o frontend deve armazenar esse token localmente quando o
cliente autorizou. Depois da reidentificacao bem-sucedida, o comportamento deve
ser identico ao fluxo por token valido: carregar dados do cliente, buscar
agendamentos futuros em aberto e exibir acoes de reagendar/cancelar sem exigir
refresh da pagina.

## Ordem visual apos identificacao

No agendamento publico, a identificacao do cliente e parte inicial do fluxo e
deve aparecer antes da escolha de servico e horario. Apos token valido,
reconhecimento local ou identificacao manual, a pagina deve organizar o fluxo
nesta ordem:

1. `Seus dados`.
2. `Seus horarios`, apenas quando estiver carregando ou quando existirem
   agendamentos futuros ativos.
3. `Escolha o atendimento`.
4. `Escolha data e horario`.
5. Resumo e solicitacao do agendamento.

Essa ordem reduz ambiguidade para clientes recorrentes, permite reagendar ou
cancelar antes de criar nova solicitacao e mantem o comportamento identico ao
fluxo por token: a API continua responsavel por resolver identidade,
agendamentos futuros e criacao do novo atendimento.

## Link individual

Formato:

```text
/agendar/:slug?tk=:token
```

1. O token bruto existe apenas na URL e no dispositivo do cliente.
2. O banco persiste somente o hash SHA-256, tenant, cliente e expiracao.
3. O backend valida hash, expiracao, status do cliente e tenant.
4. Nome, WhatsApp e email sao pre-carregados.
5. Historico recente, servicos anteriores e profissional favorito ficam
   disponiveis no contrato.
6. Token invalido, expirado ou de outro tenant volta ao fluxo manual sem
   revelar dados.

## Regras

- WhatsApp e a chave de identificacao dentro do tenant.
- Sem token valido, WhatsApp e obrigatorio para identificar ou criar cliente.
- Um novo token revoga tokens publicos ativos do mesmo cliente e tenant.
- A validade padrao e 180 dias, configuravel por `CLIENT_TOKEN_TTL_DAYS`.
- URLs nunca carregam nome, telefone ou email.
- Atribuicao e registrada em `campanha_acessos`.
- A criacao do cliente e do token ocorre na funcao transacional
  `identify_public_booking_client`.
- Apos qualquer identificacao bem-sucedida, `GET
  /public/booking/:slug/client/appointments/upcoming` deve ser chamado com o
  token resolvido para listar atendimentos futuros ativos.

## APIs

```text
POST /public/booking/:slug/identity
POST /public/booking/:slug/appointments
POST /clients/:id/booking-token
```
