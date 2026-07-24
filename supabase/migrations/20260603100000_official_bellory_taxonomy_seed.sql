-- Official Bellory taxonomy structural seed.
-- This migration is additive: it guarantees official cargos and specialties
-- exist for onboarding and operational maintenance without deleting tenant data.

with seed_cargos(nome, descricao, categoria_profissional) as (
  values
    ('Cabeleireira', 'Profissional de cabelos, finalizacao e tratamentos capilares.', 'operacional'),
    ('Barbeiro', 'Profissional de barba, cabelo masculino e acabamento.', 'operacional'),
    ('Manicure', 'Profissional de cuidados, embelezamento e design de unhas.', 'operacional'),
    ('Esteticista', 'Profissional de estetica facial e corporal.', 'operacional'),
    ('Maquiadora', 'Profissional de maquiagem social, eventos e producoes.', 'operacional'),
    ('Podologa', 'Profissional de cuidados especializados com os pes.', 'operacional'),
    ('Massoterapeuta', 'Profissional de massagens e bem-estar.', 'operacional'),
    ('Lash Designer', 'Profissional de extensao e manutencao de cilios.', 'operacional'),
    ('Designer de Sobrancelhas', 'Profissional de design e manutencao de sobrancelhas.', 'operacional'),
    ('Terapeuta Capilar', 'Profissional de tratamentos do couro cabeludo e fios.', 'operacional'),
    ('Recepcionista', 'Profissional de recepcao e atendimento.', 'administrativo'),
    ('Secretaria', 'Profissional de suporte administrativo e agenda.', 'administrativo'),
    ('Caixa', 'Profissional de caixa e fechamento financeiro.', 'administrativo'),
    ('Auxiliar Administrativo', 'Profissional de apoio administrativo.', 'administrativo'),
    ('Assistente Operacional', 'Profissional de apoio a rotinas operacionais.', 'administrativo'),
    ('Gerente', 'Profissional de gestao da unidade.', 'administrativo'),
    ('Coordenadora', 'Profissional de coordenacao operacional.', 'administrativo'),
    ('Financeiro', 'Profissional de rotinas financeiras.', 'administrativo'),
    ('Marketing', 'Profissional de marketing e comunicacao.', 'administrativo'),
    ('Atendente', 'Profissional de atendimento ao cliente.', 'administrativo')
)
insert into public.cargos (nome, descricao, categoria_profissional)
select nome, descricao, categoria_profissional
from seed_cargos
on conflict do nothing;

with seed_cargos(nome, descricao, categoria_profissional) as (
  values
    ('Cabeleireira', 'Profissional de cabelos, finalizacao e tratamentos capilares.', 'operacional'),
    ('Barbeiro', 'Profissional de barba, cabelo masculino e acabamento.', 'operacional'),
    ('Manicure', 'Profissional de cuidados, embelezamento e design de unhas.', 'operacional'),
    ('Esteticista', 'Profissional de estetica facial e corporal.', 'operacional'),
    ('Maquiadora', 'Profissional de maquiagem social, eventos e producoes.', 'operacional'),
    ('Podologa', 'Profissional de cuidados especializados com os pes.', 'operacional'),
    ('Massoterapeuta', 'Profissional de massagens e bem-estar.', 'operacional'),
    ('Lash Designer', 'Profissional de extensao e manutencao de cilios.', 'operacional'),
    ('Designer de Sobrancelhas', 'Profissional de design e manutencao de sobrancelhas.', 'operacional'),
    ('Terapeuta Capilar', 'Profissional de tratamentos do couro cabeludo e fios.', 'operacional'),
    ('Recepcionista', 'Profissional de recepcao e atendimento.', 'administrativo'),
    ('Secretaria', 'Profissional de suporte administrativo e agenda.', 'administrativo'),
    ('Caixa', 'Profissional de caixa e fechamento financeiro.', 'administrativo'),
    ('Auxiliar Administrativo', 'Profissional de apoio administrativo.', 'administrativo'),
    ('Assistente Operacional', 'Profissional de apoio a rotinas operacionais.', 'administrativo'),
    ('Gerente', 'Profissional de gestao da unidade.', 'administrativo'),
    ('Coordenadora', 'Profissional de coordenacao operacional.', 'administrativo'),
    ('Financeiro', 'Profissional de rotinas financeiras.', 'administrativo'),
    ('Marketing', 'Profissional de marketing e comunicacao.', 'administrativo'),
    ('Atendente', 'Profissional de atendimento ao cliente.', 'administrativo')
)
update public.cargos c
set descricao = sc.descricao,
    categoria_profissional = sc.categoria_profissional,
    ativo = true,
    deleted_at = null
from seed_cargos sc
where lower(trim(c.nome)) = lower(trim(sc.nome));

with seed_especialidades(cargo_nome, nome, descricao) as (
  values
    ('Cabeleireira', 'Corte Feminino', 'Cortes femininos e finalizacao.'),
    ('Cabeleireira', 'Corte Masculino', 'Cortes masculinos e acabamento.'),
    ('Cabeleireira', 'Corte Infantil', 'Cortes infantis.'),
    ('Cabeleireira', 'Corte Degrade', 'Corte com tecnica degrade.'),
    ('Cabeleireira', 'Escova Simples', 'Escova e finalizacao simples.'),
    ('Cabeleireira', 'Escova Modelada', 'Escova com modelagem.'),
    ('Cabeleireira', 'Escova Progressiva', 'Escova progressiva e alinhamento dos fios.'),
    ('Cabeleireira', 'Coloracao Global', 'Coloracao completa dos fios.'),
    ('Cabeleireira', 'Tonalizacao', 'Tonalizacao dos fios.'),
    ('Cabeleireira', 'Mechas', 'Mechas e iluminacao.'),
    ('Cabeleireira', 'Luzes', 'Luzes e clareamento.'),
    ('Terapeuta Capilar', 'Hidratacao Capilar', 'Hidratacao e cuidado dos fios.'),
    ('Terapeuta Capilar', 'Reconstrucao Capilar', 'Reconstrucao e recuperacao dos fios.'),
    ('Terapeuta Capilar', 'Tratamento do Couro Cabeludo', 'Tratamentos do couro cabeludo.'),
    ('Barbeiro', 'Barba Tradicional', 'Barba tradicional e acabamento.'),
    ('Barbeiro', 'Barba Desenhada', 'Barba desenhada e acabamento.'),
    ('Manicure', 'Nail Art', 'Decoracao e arte em unhas.'),
    ('Manicure', 'Blindagem', 'Blindagem e fortalecimento de unhas.'),
    ('Manicure', 'Fibra', 'Alongamento em fibra.'),
    ('Manicure', 'Banho em Gel', 'Banho em gel para unhas.'),
    ('Manicure', 'Pedicure Tradicional', 'Pedicure tradicional.'),
    ('Manicure', 'Spa dos Pes', 'Cuidado e relaxamento dos pes.'),
    ('Maquiadora', 'Maquiagem Social', 'Maquiagem para eventos sociais.'),
    ('Maquiadora', 'Maquiagem Noiva', 'Maquiagem para noivas.'),
    ('Esteticista', 'Limpeza de Pele', 'Limpeza de pele e cuidados faciais.'),
    ('Esteticista', 'Hidratacao Facial', 'Hidratacao e cuidado facial.'),
    ('Massoterapeuta', 'Massagem Relaxante', 'Massagem relaxante.'),
    ('Massoterapeuta', 'Massagem Terapeutica', 'Massagem terapeutica.'),
    ('Massoterapeuta', 'Drenagem Linfatica', 'Drenagem linfatica.'),
    ('Designer de Sobrancelhas', 'Design de Sobrancelhas', 'Design e manutencao de sobrancelhas.'),
    ('Designer de Sobrancelhas', 'Henna', 'Aplicacao de henna em sobrancelhas.'),
    ('Lash Designer', 'Extensao de Cilios', 'Extensao de cilios.'),
    ('Lash Designer', 'Manutencao de Cilios', 'Manutencao de extensao de cilios.')
)
insert into public.especialidades (cargo_id, nome, descricao)
select c.id, se.nome, se.descricao
from seed_especialidades se
join public.cargos c on lower(trim(c.nome)) = lower(trim(se.cargo_nome))
where c.deleted_at is null
on conflict do nothing;
