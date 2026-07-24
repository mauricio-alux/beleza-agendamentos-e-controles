-- Ensures appointment operational tokens can be reused safely in public
-- confirmation, cancellation and rescheduling links without exposing ids.

create unique index if not exists idx_agendamentos_token_confirmacao_unique
  on public.agendamentos (token_confirmacao)
  where token_confirmacao is not null
    and deleted_at is null;
