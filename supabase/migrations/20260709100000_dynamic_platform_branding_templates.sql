-- Remove nomes fixos da plataforma dos templates globais ja semeados.
-- A assinatura institucional continua sendo adicionada apenas em runtime.

do $$
declare
  trecho record;
begin
  for trecho in
    select *
    from (
      values
        ('[Bellory]', ''),
        ('Seu periodo de teste no Bellory', 'Seu periodo de teste na plataforma'),
        ('Seu periodo de teste do Bellory', 'Seu periodo de teste da plataforma'),
        ('recursos do Bellory', 'recursos da plataforma'),
        ('Seu plano Bellory', 'Seu plano na plataforma'),
        ('O acesso ao Bellory', 'O acesso a plataforma'),
        ('suporte Bellory', 'suporte da plataforma'),
        ('seu plano Bellory', 'seu plano na plataforma'),
        ('com o Bellory', 'com a plataforma'),
        ('suporte no Bellory', 'suporte na plataforma'),
        ('conta Bellory', 'conta da plataforma'),
        ('pelo Bellory', 'pela plataforma'),
        ('cadastro no Bellory', 'cadastro na plataforma'),
        ('O Bellory', 'A plataforma')
    ) as substituicoes(origem, destino)
  loop
    update public.templates_mensagem
    set
      conteudo = replace(conteudo, trecho.origem, trecho.destino),
      updated_at = now()
    where tenant_id is null
      and deleted_at is null
      and conteudo like '%' || trecho.origem || '%';
  end loop;
end $$;
