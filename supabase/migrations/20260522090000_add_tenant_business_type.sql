alter table public.tenants
  add column if not exists business_type varchar(50);

alter table public.tenants
  drop constraint if exists tenants_business_type_check;

alter table public.tenants
  add constraint tenants_business_type_check check (
    business_type is null or business_type in (
      'salao_beleza',
      'barbearia',
      'manicure_pedicure',
      'estetica',
      'sobrancelhas_cilios',
      'maquiagem',
      'massoterapia',
      'clinica_estetica',
      'autonomo',
      'outro'
    )
  );

create index if not exists idx_tenants_business_type
  on public.tenants (business_type)
  where deleted_at is null;
