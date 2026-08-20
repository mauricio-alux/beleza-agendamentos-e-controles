# Dashboard operacional

O dashboard operacional é a primeira tela de acompanhamento da rotina do salão. Ele deve priorizar decisões do dia, pendências que exigem ação e indicadores que já tenham origem confiável no backend.

## Público

- Administradores e gerentes acompanham a operação do estabelecimento.
- Profissionais com visão restrita acompanham apenas a própria agenda, quando o perfil estiver limitado.

## Ordem de prioridade

Desktop:

1. Cabeçalho resumido do salão.
2. Pendências importantes.
3. Ações rápidas.
4. Próximos atendimentos e agenda do dia.
5. Indicadores essenciais.
6. Visão operacional.
7. Clientes e agenda.
8. WhatsApp operacional.
9. Serviços e profissionais.
10. Atividades recentes.

Mobile:

1. Cabeçalho resumido.
2. Pendências importantes.
3. Ações rápidas, com Novo agendamento e Novo cliente em destaque.
4. Próximos atendimentos.
5. Agenda do dia.
6. Indicadores essenciais.
7. Visão operacional.
8. Clientes e agenda.
9. WhatsApp operacional.
10. Serviços e profissionais.
11. Atividades recentes.

## Pendências importantes

Pendências são itens que exigem atenção ou decisão. Elas não substituem o histórico de atividades.

Categorias permitidas:

- Agenda.
- Clientes.
- WhatsApp.
- Serviços.
- Profissionais.
- Assinatura.
- Campanhas.

Prioridades:

- Crítica.
- Atenção.
- Informação.

As pendências são derivadas somente de dados existentes no snapshot do dashboard. Quando não houver pendências, a tela exibe: "Tudo em ordem. Nenhuma pendência importante no momento."

Campanhas não aparecem como cartão permanente no dashboard. Elas só aparecem em pendências quando houver falha, revisão, aprovação ou outra ação necessária.

## Atividades recentes

Atividades recentes representam eventos já ocorridos, como mudanças de status, comunicações registradas e eventos da conta. Elas ficam em baixa prioridade para evitar duplicidade com pendências.

## Indicadores

Todos os indicadores exibidos devem informar período ou origem. Métricas futuras, técnicas ou de automação não devem aparecer no dashboard operacional até virarem relatórios próprios.

Indicadores removidos do dashboard operacional:

- Arquitetura realtime-ready.
- Campanhas futuras.
- Criação até confirmação.
- Confirmação até conclusão.
- Lembretes operacionais enviados.
- Conclusões automáticas.

## Agenda do dia

A agenda do dia prioriza horários mais próximos do momento atual. Atendimentos já passados continuam acessíveis, mas não ficam antes dos próximos compromissos.

## Origem dos dados

O dashboard consome o snapshot `/dashboard/summary`. A tela não deve disparar consultas extras para blocos removidos. Endpoints e cálculos compartilhados podem permanecer no backend para relatórios ou outras telas.
