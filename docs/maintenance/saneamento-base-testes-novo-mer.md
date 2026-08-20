# Saneamento da Base de Testes Apos Novo MER

## Escopo

Procedimento aplicado em 2026-08-03 para sanear apenas a massa do tenant:

- `tenant_id`: `e62dacdc-08a8-431f-819e-7115d170e652`
- banco remoto Supabase do projeto
- nome encontrado no banco: `Espaco Vivian Beauty`

O DOCX de entrada citava `Espaco Viviane Beauty`. A execucao usou o UUID como
fonte autoritativa e registrou a divergencia do nome apenas como observacao.

## Regra de coerencia

Uma oferta em `servico_tenants` e compativel quando existe esta cadeia ativa:

```text
tenants
-> tenant_tipos_negocio
-> tipos_negocio
-> tipo_negocio_servicos_catalogo
-> servicos_catalogo
-> servico_tenants
```

Se o tenant nao possuir nenhum tipo ativo em `tenant_tipos_negocio`, o
saneamento deve parar sem remover dados.

## Tipos ativos do tenant auditado

- `Salao de Beleza`, principal
- `Esmalteria / Nail Studio`
- `Maquiagem e Penteados`
- `Studio de Cilios`
- `Studio de Sobrancelhas`

## Resultado da auditoria

Ofertas compativeis preservadas:

- `BROW_LAMINATION`
- `HAIR_CUT`
- `BROW_DESIGN`
- `HAIR_HYDRATION`
- `MANICURE`
- `MAKEUP`
- `BROW_MICROPIGMENTATION`
- `PEDICURE`

Oferta incompativel removida:

- `BRUSHING` / `Escova`

Dependencias encontradas para a oferta incompativel:

- `servico_tenant_especialidades`: 3
- `profissional_servico_especialidades`: 6
- `agendamento_servicos`: 0
- `cliente_historico_atendimentos`: 0
- `campanhas`: 0
- `campanha_envios`: 0
- `mensagens_whatsapp`: 0
- `cupom_servicos`: 0

## Ordem de limpeza

A limpeza foi limitada ao tenant e executada em transacao, sem `TRUNCATE` e
sem `CASCADE` indiscriminado:

1. `profissional_servico_especialidades`
2. `servico_tenant_especialidades`
3. `servico_tenants`

Registros removidos:

- `profissional_servico_especialidades`: 6
- `servico_tenant_especialidades`: 3
- `servico_tenants`: 1

Nenhum agendamento, historico, campanha, envio, mensagem de WhatsApp, cupom ou
escopo de cupom precisou ser removido.

## Tabelas preservadas

As estruturas globais foram preservadas integralmente:

- `tipos_negocio`
- `servicos_catalogo`
- `tipo_negocio_servicos_catalogo`
- `servico_catalogo_especialidades`
- `especialidades`

Nenhum outro tenant foi alvo da limpeza.

## Validacao pos-limpeza

A validacao pos-limpeza confirmou:

- 8 ofertas restantes para o tenant, todas compativeis com tipos ativos;
- 0 ofertas restantes para `BRUSHING` no tenant;
- 0 orfaos em `servico_tenant_especialidades`;
- 0 orfaos em `profissional_servico_especialidades`;
- 0 orfaos em `agendamento_servicos` por oferta ou configuracao.

Resultado: `BASE SANEADA E COERENTE COM OS TIPOS DE NEGOCIO`.

## Auditoria reutilizavel

Antes de recriar ou validar massa de testes, execute a auditoria:

```bash
cd backend
npm run audit:tenant-service-catalog -- --tenant-id=e62dacdc-08a8-431f-819e-7115d170e652 --only-invalid
```

O script apenas consulta dados. Ele classifica cada `servico_tenants` pelo
catalogo permitido nos tipos ativos do tenant e deve retornar zero
incompatibilidades para uma base saneada.

## Prevencao

As camadas atuais ja evitam a recorrencia do problema:

- backend rejeita criacao/ativacao de oferta para servico de catalogo nao
  permitido pelos tipos ativos do tenant;
- frontend de `/configuracoes/servicos` lista apenas catalogo permitido para o
  tenant;
- remocao de tipo do tenant e bloqueada quando deixaria ofertas ativas
  exclusivamente permitidas por esse tipo;
- scripts `campaign-test:*` usam apenas o novo MER e devem ser precedidos pela
  auditoria de compatibilidade acima.
