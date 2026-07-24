-- Align subscription statuses with tenant lifecycle and subscription service.

alter table public.assinaturas
  drop constraint if exists assinaturas_status_check;

alter table public.assinaturas
  add constraint assinaturas_status_check check (
    status in (
      'trial',
      'ativo',
      'ativa',
      'vencida',
      'cancelada',
      'suspensa',
      'inadimplente'
    )
  );
