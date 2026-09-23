create or replace function public.set_atualizado_em()
returns trigger
language plpgsql
as $$
begin
  new.atualizado_em = now();
  return new;
end;
$$;

drop trigger if exists set_updated_at on public.tipo_negocio_perfis_operacionais;
drop trigger if exists set_atualizado_em on public.tipo_negocio_perfis_operacionais;
create trigger set_atualizado_em
before update on public.tipo_negocio_perfis_operacionais
for each row
execute function public.set_atualizado_em();

drop trigger if exists set_updated_at on public.perfil_operacional_servicos;
drop trigger if exists set_atualizado_em on public.perfil_operacional_servicos;
create trigger set_atualizado_em
before update on public.perfil_operacional_servicos
for each row
execute function public.set_atualizado_em();

drop trigger if exists set_updated_at on public.perfil_operacional_cargos;
drop trigger if exists set_atualizado_em on public.perfil_operacional_cargos;
create trigger set_atualizado_em
before update on public.perfil_operacional_cargos
for each row
execute function public.set_atualizado_em();

drop trigger if exists set_updated_at on public.perfil_operacional_defaults;
drop trigger if exists set_atualizado_em on public.perfil_operacional_defaults;
create trigger set_atualizado_em
before update on public.perfil_operacional_defaults
for each row
execute function public.set_atualizado_em();
