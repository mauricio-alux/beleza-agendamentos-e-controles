-- Adds missing specialties for the expanded operational cargo catalog.
-- The contextual role filter uses these specialties together with active tenant
-- services, so this seed must be additive and preserve existing tenants.

with seed_especialidades(cargo_nome, nome, descricao) as (
  values
    ('Cabeleireiro', 'Corte Feminino', 'Cortes femininos e finalizacao.'),
    ('Cabeleireiro', 'Escova', 'Escova, modelagem e finalizacao.'),
    ('Cabeleireiro', 'Hidratacao', 'Hidratacao e cuidados dos fios.'),
    ('Cabeleireiro', 'Progressiva', 'Alisamentos e tratamentos progressivos.'),
    ('Cabeleireiro', 'Luzes', 'Mechas, luzes e clareamento.'),
    ('Colorista', 'Colorimetria', 'Coloracao, tonalizacao e correcao de cor.'),
    ('Colorista', 'Tintura/Coloracao', 'Tintura, tonalizacao e coloracao dos fios.'),
    ('Colorista', 'Luzes', 'Mechas, luzes e clareamento.'),
    ('Manicure/Pedicure', 'Manicure', 'Cuidados e embelezamento das maos.'),
    ('Manicure/Pedicure', 'Pedicure', 'Cuidados e embelezamento dos pes.'),
    ('Manicure/Pedicure', 'Fibra', 'Alongamento em fibra.'),
    ('Manicure/Pedicure', 'Gel', 'Alongamento ou banho em gel.'),
    ('Manicure/Pedicure', 'Blindagem', 'Blindagem e fortalecimento de unhas.'),
    ('Manicure/Pedicure', 'Nail Art', 'Decoracao e arte em unhas.'),
    ('Maquiador', 'Maquiagem Social', 'Maquiagem para eventos sociais.'),
    ('Maquiador', 'Maquiagem Noiva', 'Maquiagem para noivas.'),
    ('Barbeiro', 'Corte Masculino', 'Corte masculino e acabamento.'),
    ('Barbeiro', 'Barba', 'Barba, desenho e acabamento.'),
    ('Esteticista', 'Limpeza de Pele', 'Limpeza de pele e cuidados faciais.'),
    ('Esteticista', 'Drenagem', 'Drenagem linfatica e cuidados corporais.'),
    ('Massagista', 'Relaxante', 'Massagem relaxante.'),
    ('Massagista', 'Terapeutica', 'Massagem terapeutica.'),
    ('Designer de sobrancelhas', 'Design de Sobrancelhas', 'Design e manutencao de sobrancelhas.'),
    ('Lash designer', 'Extensao de Cilios', 'Extensao e manutencao de cilios.'),
    ('Depilador(a)', 'Depilacao', 'Depilacao e cuidados corporais.')
)
insert into public.especialidades (cargo_id, nome, descricao)
select c.id, se.nome, se.descricao
from seed_especialidades se
join public.cargos c on lower(c.nome) = lower(se.cargo_nome)
where c.deleted_at is null
on conflict do nothing;
