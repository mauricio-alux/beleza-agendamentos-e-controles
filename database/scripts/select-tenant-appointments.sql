-- Lista agendamentos de um tenant com nomes de cliente e profissional.
-- Ordenacao: data de criacao do agendamento, do mais antigo para o mais novo.

select
  a.*,
  coalesce(ct.nome_no_tenant, c.nome) as nome_cliente,
  p.nome_publico as nome_profissional
from public.agendamentos a
join public.clientes c
  on c.id = a.cliente_id
left join public.cliente_tenants ct
  on ct.tenant_id = a.tenant_id
 and ct.cliente_id = a.cliente_id
join public.profissionais p
  on p.id = a.profissional_id
where a.tenant_id = 'e62dacdc-08a8-431f-819e-7115d170e652'::uuid
order by a.created_at asc;
