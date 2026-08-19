create or replace function public.set_atualizado_em()
returns trigger
language plpgsql
as $$
begin
  new.atualizado_em = now();
  return new;
end;
$$;

drop trigger if exists set_updated_at on public.tipo_negocio_servicos_catalogo;

create trigger set_atualizado_em
before update on public.tipo_negocio_servicos_catalogo
for each row
execute function public.set_atualizado_em();
