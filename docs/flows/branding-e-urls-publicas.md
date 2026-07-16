# Fluxo de branding e URLs publicas

1. O ambiente fornece nome, dominio e URL publica.
2. A camada `app-brand` normaliza os valores e remove barras finais.
3. O backend usa `buildBookingUrl` ao criar links de onboarding.
4. O frontend usa `buildAppUrl` para canonical, sitemap, robots e metadata.
5. O slug do tenant e anexado somente ao final, sem depender da marca.

Exemplo:

```text
APP_URL=https://produto.exemplo
tenantSlug=marina-beauty
url=https://produto.exemplo/agendar/marina-beauty
```

Alterar a marca ou o dominio nao exige mudanca no banco nem recriacao de slug.
