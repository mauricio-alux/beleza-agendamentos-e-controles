# ADR-015 - Campanhas Sugeridas, Aprovadas e Executadas

## Status

Aceita.

## Contexto

O modulo de Campanhas deixa de depender exclusivamente da criacao manual pelo
tenant. O Bellory deve atuar como consultor de marketing: identifica
oportunidades por IA/regras de negocio, sugere campanhas, recebe aprovacao e
parametros do tenant, executa conforme a capacidade de comunicacao disponivel e
monitora resultados para novas sugestoes.

## Decisao

Campanha e separada de canal.

Campanha contem estrategia, publico, oferta, mensagem, aprovacao e resultado.
Canal contem a forma de entrega: WhatsApp Business Platform/Cloud API propria,
WhatsApp Business App, WhatsApp Messenger, infraestrutura WhatsApp do SaaS ou
canais futuros.

O ciclo oficial passa a ser:

```text
IA identifica oportunidade
  -> campanha sugerida
  -> tenant aprova ou rejeita
  -> tenant parametriza
  -> Bellory prepara ou executa
  -> Bellory monitora resultados
  -> IA analisa desempenho
  -> nova sugestao
```

## Estados funcionais

Sem migration obrigatoria, os estados funcionais podem ser representados por
`campanhas.status` existente e `campanhas.metadata.lifecycle_stage`.

- `rascunho` + `lifecycle_stage=suggestion`: campanha sugerida aguardando
  aprovacao.
- `pronta` ou `agendada` + `lifecycle_stage=approved`: campanha aprovada e
  parametrizada.
- `pronta` + `lifecycle_stage=prepared_for_manual_delivery`: campanha
  preparada para envio assistido/manual.
- `em_processamento`/`concluida`/`falhou`: execucao automatica pelo provider.
- `cancelada` + `lifecycle_stage=rejected`: campanha rejeitada pelo tenant.

## Regras

- Campanhas sugeridas nao executam sem aprovacao do tenant.
- O tenant informa ou confirma oferta, desconto, valor promocional, brinde,
  periodo, publico e modo de execucao quando aplicavel.
- Parametros aprovados podem ser salvos como padrao para campanhas futuras do
  mesmo tipo.
- Modo assistido prepara conteudo e link, mas nao registra entrega/leitura sem
  evidencia tecnica.
- Envio pela infraestrutura do SaaS exige aprovacao do tenant, destinatario
  elegivel, consentimento/opt-in quando exigido, ausencia de opt-out, template
  adequado e template aprovado quando `WHATSAPP_DRY_RUN=false`.
- Mensagens enviadas pela infraestrutura do SaaS devem identificar o salao ou
  profissional de origem e a plataforma configurada por ambiente, sem fixar
  nome comercial no codigo.

## Consequencias

- O tenant passa de criador principal para aprovador e parametrizador.
- A IA ganha papel explicito de consultora de marketing.
- A criacao manual permanece compativel para casos pontuais.
- O modulo fica preparado para multiplos canais sem acoplar regra de campanha
  ao WhatsApp.
