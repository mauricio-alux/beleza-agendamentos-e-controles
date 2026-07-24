-- Campaign service reference used by WhatsApp campaign rules.

alter table public.campanhas
  add column if not exists servico_id uuid references public.servicos(id) on delete set null;

create index if not exists idx_campanhas_tenant_service
  on public.campanhas (tenant_id, servico_id)
  where servico_id is not null
    and deleted_at is null;
