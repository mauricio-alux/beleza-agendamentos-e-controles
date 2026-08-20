# Booking Publico

## Novo MER de Servicos

A partir da Fase 5, o Booking publico usa o novo MER de Servicos como fonte de
verdade para servico, especialidade, preco, duracao e profissional compativel.

Fluxo validado:

```text
Tenant -> Servico -> Especialidade -> Profissional -> Data -> Slots
```

Regras:

- `servico_tenants` pode conter servicos apenas disponibilizados ao tenant;
  Booking Publico lista somente ofertas com `ativo = true`;
- listar somente configuracoes ativas em `servico_tenant_especialidades`;
- exigir `aceita_agendamento_online = true`;
- exigir `duracao_minutos > 0`;
- exigir preco configurado;
- listar somente profissionais online e compativeis pela especialidade;
- calcular slots com a duracao da combinacao, sem fallback para `servicos`.

## Pos-confirmacao do profissional

Depois que o profissional ou responsavel confirma um agendamento solicitado
pelo Booking Publico, o status passa para `pendente_cliente` e o evento
`appointment.confirmed` gera a comunicacao operacional ao cliente.

O template oficial `appointment_confirmed`, em `templates_mensagem`, deve
disponibilizar as acoes Bellory:

- `Reagendar` -> `/reagendar?tk={token_operacional}`;
- `Cancelar` -> `/acao_agendamento?cmd=cancelar&tk={token_operacional}`.

Essas acoes usam `agendamentos.token_confirmacao` no momento da geracao da
mensagem. O cliente nao informa `tenant_id` nem `appointment_id` arbitrario. A
area **Seus horarios** em `/agendar/{tenant_slug}` continua existindo como
mecanismo complementar para clientes reconhecidos, mas nao substitui as acoes
do `appointment_confirmed`.

No reagendamento publico por token, a disponibilidade deve considerar a
combinacao original de profissional, servico e especialidade. A tela
`/reagendar` envia `especialidade_id` na consulta de disponibilidade para
evitar apresentar slots que seriam rejeitados pela validacao final do backend.

## Validacao da Fase 5.1

Em 2026-07-29, o slug `espaco-vivian-beauty` foi validado no Supabase remoto
`djbuzarzbpcpixudpnmg`.

Resultados:

- catalogo publico retornou 3 servicos disponiveis de 7 online;
- Manicure/Fibra retornou preco 50, duracao 30 minutos e 16 slots em
  2026-08-03;
- Corte de cabelo/Corte Degrade retornou preco 80, duracao 45 minutos e 14
  slots em 2026-08-03;
- profissionais incompatíveis nao foram publicados para as combinacoes testadas;
- agendamento publico controlado gravou snapshot e historico com referencias do
  novo MER.

## Validacao da Fase 8.3

Em 2026-07-29, apos a remocao fisica de `servicos`,
`servico_especialidades` e `profissional_servicos`, o Booking publico permanece
ancorado apenas no novo MER:

- `servico_tenants`;
- `servico_tenant_especialidades`;
- `profissional_servico_especialidades`.

Nao existe fallback operacional para tabelas legadas removidas.
