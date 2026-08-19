-- Bellory - Fase 6: Campanhas/Cupons no novo MER de Servicos.
-- Migration aditiva: preserva referencias legadas e adiciona escopos tenant-aware.

alter table public.campanhas
  add column if not exists servico_catalogo_id uuid references public.servicos_catalogo(id) on delete set null,
  add column if not exists servico_tenant_id uuid references public.servico_tenants(id) on delete set null,
  add column if not exists servico_tenant_especialidade_id uuid references public.servico_tenant_especialidades(id) on delete set null,
  add column if not exists especialidade_id uuid references public.especialidades(id) on delete set null;

alter table public.cupom_servicos
  alter column servico_id drop not null,
  add column if not exists escopo varchar(30) not null default 'servico_legado',
  add column if not exists servico_catalogo_id uuid references public.servicos_catalogo(id) on delete set null,
  add column if not exists servico_tenant_id uuid references public.servico_tenants(id) on delete cascade,
  add column if not exists especialidade_id uuid references public.especialidades(id) on delete cascade,
  add column if not exists servico_tenant_especialidade_id uuid references public.servico_tenant_especialidades(id) on delete cascade,
  add column if not exists metadata jsonb not null default '{}'::jsonb;

alter table public.cupom_servicos
  drop constraint if exists cupom_servicos_scope_check;

alter table public.cupom_servicos
  add constraint cupom_servicos_scope_check check (
    escopo in ('geral', 'servico', 'especialidade', 'combinacao', 'servico_legado')
  );

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'cupom_servicos_scope_reference_check'
      and conrelid = 'public.cupom_servicos'::regclass
  ) then
    alter table public.cupom_servicos
      add constraint cupom_servicos_scope_reference_check check (
        (escopo = 'geral')
        or (escopo = 'servico' and servico_tenant_id is not null)
        or (escopo = 'especialidade' and especialidade_id is not null)
        or (escopo = 'combinacao' and servico_tenant_especialidade_id is not null)
        or (escopo = 'servico_legado' and servico_id is not null)
      );
  end if;
end $$;

create index if not exists idx_campanhas_servico_tenant
  on public.campanhas (tenant_id, servico_tenant_id)
  where deleted_at is null;

create index if not exists idx_campanhas_servico_tenant_especialidade
  on public.campanhas (tenant_id, servico_tenant_especialidade_id)
  where deleted_at is null;

create index if not exists idx_cupom_servicos_servico_tenant
  on public.cupom_servicos (tenant_id, servico_tenant_id)
  where deleted_at is null;

create index if not exists idx_cupom_servicos_especialidade
  on public.cupom_servicos (tenant_id, especialidade_id)
  where deleted_at is null;

create index if not exists idx_cupom_servicos_combinacao
  on public.cupom_servicos (tenant_id, servico_tenant_especialidade_id)
  where deleted_at is null;

create unique index if not exists uq_cupom_servicos_geral
  on public.cupom_servicos (tenant_id, cupom_id, escopo)
  where deleted_at is null
    and escopo = 'geral';

create unique index if not exists uq_cupom_servicos_servico_tenant
  on public.cupom_servicos (tenant_id, cupom_id, servico_tenant_id)
  where deleted_at is null
    and escopo = 'servico';

create unique index if not exists uq_cupom_servicos_especialidade
  on public.cupom_servicos (tenant_id, cupom_id, especialidade_id)
  where deleted_at is null
    and escopo = 'especialidade';

create unique index if not exists uq_cupom_servicos_combinacao
  on public.cupom_servicos (tenant_id, cupom_id, servico_tenant_especialidade_id)
  where deleted_at is null
    and escopo = 'combinacao';
