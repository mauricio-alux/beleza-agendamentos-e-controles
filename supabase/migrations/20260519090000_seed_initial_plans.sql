-- Seed inicial de planos comerciais do Bellory.
-- Idempotente: pode ser executado novamente sem duplicar registros.

insert into public.planos (
  id,
  nome,
  descricao,
  preco_mensal,
  limite_profissionais,
  limite_clientes,
  limite_agendamentos_mes,
  limite_whatsapp,
  permite_whatsapp_cloud,
  permite_ia,
  fl_ia,
  fl_crm,
  fl_whatsapp,
  metadata,
  ativo
)
values
  (
    '00000000-0000-4000-8000-000000000001',
    'Trial gratis',
    'Plano inicial para teste gratuito do Bellory.',
    0,
    2,
    200,
    300,
    100,
    false,
    false,
    false,
    true,
    true,
    '{"tipo":"trial","dias_trial":14}'::jsonb,
    true
  ),
  (
    '00000000-0000-4000-8000-000000000002',
    'Profissional',
    'Plano para saloes e profissionais em crescimento.',
    79,
    5,
    1000,
    1500,
    500,
    true,
    false,
    false,
    true,
    true,
    '{"tipo":"profissional"}'::jsonb,
    true
  ),
  (
    '00000000-0000-4000-8000-000000000003',
    'Premium',
    'Plano avancado com recursos premium e IA futura.',
    149,
    15,
    5000,
    6000,
    2000,
    true,
    true,
    true,
    true,
    true,
    '{"tipo":"premium"}'::jsonb,
    true
  )
on conflict (id) do update
set
  nome = excluded.nome,
  descricao = excluded.descricao,
  preco_mensal = excluded.preco_mensal,
  limite_profissionais = excluded.limite_profissionais,
  limite_clientes = excluded.limite_clientes,
  limite_agendamentos_mes = excluded.limite_agendamentos_mes,
  limite_whatsapp = excluded.limite_whatsapp,
  permite_whatsapp_cloud = excluded.permite_whatsapp_cloud,
  permite_ia = excluded.permite_ia,
  fl_ia = excluded.fl_ia,
  fl_crm = excluded.fl_crm,
  fl_whatsapp = excluded.fl_whatsapp,
  metadata = excluded.metadata,
  ativo = excluded.ativo,
  updated_at = now();
