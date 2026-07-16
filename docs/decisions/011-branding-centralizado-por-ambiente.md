# 011 - Branding centralizado por ambiente

## Decisao

Nome, dominio e URLs publicas devem ser consumidos por modulos centrais de
branding, alimentados por variaveis de ambiente.

## Motivos

- permitir troca futura de marca;
- suportar ambientes locais, homologacao e producao;
- impedir URLs absolutas espalhadas;
- manter a arquitetura multi-tenant independente do produto SaaS.

## Consequencias

- textos publicos usam `APP_BRAND.appName`;
- URLs usam `buildAppUrl` ou `buildBookingUrl`;
- metadata, canonical, manifest, robots e sitemap compartilham a mesma origem;
- nomes internos historicos podem permanecer quando nao aparecem como branding.

## Regra

Novos componentes e templates nao devem declarar diretamente o nome ou dominio
do produto. Defaults existem somente nos arquivos centrais de configuracao.
