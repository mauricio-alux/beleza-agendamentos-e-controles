-- Phase 2 of the service MER refactor.
-- Additive/idempotent only: canonical catalog seed plus controlled backfill.
-- It does not delete legacy data, change legacy FKs, or change consumers.

with canonical_services (
  codigo_canonico,
  nome,
  categoria_key,
  natureza,
  descricao,
  source_service_keys,
  legacy_names,
  metadata
) as (
  values
    ('MANICURE', 'Manicure', 'unhas', 'recorrente', 'Cuidados e embelezamento das unhas das maos.', array['manicure', 'manicure_tradicional'], array['manicure', 'manicure tradicional'], '{"seed":"mer_phase2","group":"unhas"}'::jsonb),
    ('PEDICURE', 'Pedicure', 'unhas', 'recorrente', 'Cuidados e embelezamento das unhas dos pes.', array['pedicure'], array['pedicure'], '{"seed":"mer_phase2","group":"unhas"}'::jsonb),
    ('GEL_POLISH', 'Esmaltacao em gel', 'unhas', 'recorrente', 'Esmaltacao com acabamento em gel.', array['esmaltacao_em_gel'], array['esmaltacao em gel'], '{"seed":"mer_phase2","group":"unhas"}'::jsonb),
    ('NAIL_EXTENSION', 'Alongamento de unhas', 'unhas', 'recorrente', 'Alongamento tecnico de unhas.', array['alongamento_de_unhas'], array['alongamento de unhas'], '{"seed":"mer_phase2","group":"unhas"}'::jsonb),
    ('NAIL_EXTENSION_MAINTENANCE', 'Manutencao de alongamento', 'unhas', 'recorrente', 'Manutencao periodica de alongamento de unhas.', array['manutencao_de_alongamento'], array['manutencao de alongamento'], '{"seed":"mer_phase2","group":"unhas"}'::jsonb),
    ('GEL_BATH', 'Banho de gel', 'unhas', 'recorrente', 'Reforco e acabamento em gel sobre as unhas.', array['banho_de_gel'], array['banho de gel'], '{"seed":"mer_phase2","group":"unhas"}'::jsonb),
    ('NAIL_ART', 'Nail art', 'unhas', 'ocasional', 'Decoracao artistica de unhas.', array['nail_art'], array['nail art', 'nailart'], '{"seed":"mer_phase2","group":"unhas"}'::jsonb),

    ('HAIR_CUT', 'Corte de cabelo', 'cabelo', 'recorrente', 'Corte de cabelo como servico conceitual.', array['corte_de_cabelo'], array['corte de cabelo'], '{"seed":"mer_phase2","group":"cabelo"}'::jsonb),
    ('BRUSHING', 'Escova', 'cabelo', 'recorrente', 'Escova e finalizacao de cabelo.', array['escova'], array['escova'], '{"seed":"mer_phase2","group":"cabelo"}'::jsonb),
    ('HAIR_HYDRATION', 'Hidratacao capilar', 'terapia_capilar', 'recorrente', 'Tratamento de hidratacao dos fios.', array['hidratacao'], array['hidratacao', 'hidratacao capilar'], '{"seed":"mer_phase2","group":"cabelo"}'::jsonb),
    ('HAIR_NUTRITION', 'Nutricao capilar', 'terapia_capilar', 'recorrente', 'Tratamento de nutricao dos fios.', array['nutricao_capilar'], array['nutricao capilar'], '{"seed":"mer_phase2","group":"cabelo"}'::jsonb),
    ('HAIR_RECONSTRUCTION', 'Reconstrucao capilar', 'terapia_capilar', 'recorrente', 'Tratamento de reconstrucao dos fios.', array['reconstrucao_capilar'], array['reconstrucao capilar'], '{"seed":"mer_phase2","group":"cabelo"}'::jsonb),
    ('SCALP_THERAPY', 'Terapia capilar', 'terapia_capilar', 'recorrente', 'Tratamentos para couro cabeludo e saude capilar.', array['terapia_capilar'], array['terapia capilar'], '{"seed":"mer_phase2","group":"cabelo"}'::jsonb),
    ('HAIR_COLORING', 'Coloracao', 'cabelo', 'recorrente', 'Coloracao de cabelo sem separar variacoes tecnicas como servicos.', array['coloracao', 'coloracao_de_raiz', 'coloracao_global'], array['coloracao', 'coloracao de raiz', 'coloracao global'], '{"seed":"mer_phase2","group":"cabelo"}'::jsonb),
    ('HAIR_TONING', 'Tonalizacao', 'cabelo', 'recorrente', 'Tonalizacao de cabelo.', array['tonalizacao'], array['tonalizacao'], '{"seed":"mer_phase2","group":"cabelo"}'::jsonb),
    ('HIGHLIGHTS', 'Luzes/mechas', 'cabelo', 'recorrente', 'Mechas, luzes e tecnicas similares.', array['luzes', 'mechas'], array['luzes', 'mechas'], '{"seed":"mer_phase2","group":"cabelo"}'::jsonb),
    ('BALAYAGE', 'Balayage', 'cabelo', 'recorrente', 'Tecnica de clareamento balayage.', array['balayage'], array['balayage'], '{"seed":"mer_phase2","group":"cabelo"}'::jsonb),
    ('PROGRESSIVE_BRUSH', 'Progressiva', 'cabelo', 'recorrente', 'Progressiva e reducao de volume.', array['progressiva'], array['progressiva'], '{"seed":"mer_phase2","group":"cabelo"}'::jsonb),
    ('HAIR_STRAIGHTENING', 'Alisamento', 'cabelo', 'recorrente', 'Alisamento e transformacao de fios.', array['alisamento'], array['alisamento'], '{"seed":"mer_phase2","group":"cabelo"}'::jsonb),
    ('HAIR_RELAXING', 'Relaxamento', 'cabelo', 'recorrente', 'Relaxamento capilar.', array['relaxamento'], array['relaxamento'], '{"seed":"mer_phase2","group":"cabelo"}'::jsonb),
    ('HAIR_BOTOX', 'Botox capilar', 'terapia_capilar', 'recorrente', 'Tratamento capilar com efeito de alinhamento e reducao de frizz.', array['botox_capilar'], array['botox capilar'], '{"seed":"mer_phase2","group":"cabelo"}'::jsonb),
    ('BRAIDS', 'Trancas', 'cabelo', 'recorrente', 'Trancas e estilos protetivos.', array['trancas'], array['trancas', 'tranças'], '{"seed":"mer_phase2","group":"cabelo"}'::jsonb),
    ('HAIR_EXTENSION', 'Extensao/aplique capilar', 'cabelo', 'recorrente', 'Extensao, aplique e alongamento capilar.', array['extensao_capilar'], array['extensao capilar', 'aplique capilar'], '{"seed":"mer_phase2","group":"cabelo"}'::jsonb),

    ('BROW_DESIGN', 'Design de sobrancelhas', 'sobrancelhas', 'recorrente', 'Design e modelagem de sobrancelhas.', array['design_de_sobrancelhas', 'design_com_henna'], array['design de sobrancelhas', 'design com henna'], '{"seed":"mer_phase2","group":"sobrancelhas"}'::jsonb),
    ('BROW_LAMINATION', 'Brow Lamination', 'sobrancelhas', 'recorrente', 'Laminacao e alinhamento de fios das sobrancelhas.', array['brow_lamination'], array['brow lamination'], '{"seed":"mer_phase2","group":"sobrancelhas"}'::jsonb),
    ('BROW_MICROPIGMENTATION', 'Micropigmentacao', 'sobrancelhas', 'recorrente', 'Micropigmentacao e manutencao de sobrancelhas.', array['micropigmentacao_manutencao'], array['micropigmentacao', 'micropigmentacao manutencao'], '{"seed":"mer_phase2","group":"sobrancelhas"}'::jsonb),

    ('LASH_EXTENSION', 'Extensao de cilios', 'cilios', 'recorrente', 'Extensao e manutencao de cilios.', array['extensao_de_cilios', 'manutencao_de_cilios'], array['extensao de cilios', 'manutencao de cilios'], '{"seed":"mer_phase2","group":"cilios"}'::jsonb),
    ('LASH_LIFTING', 'Lash Lifting', 'cilios', 'recorrente', 'Curvatura e lifting de cilios naturais.', array['lash_lifting'], array['lash lifting'], '{"seed":"mer_phase2","group":"cilios"}'::jsonb),

    ('MENS_HAIR_CUT', 'Corte masculino', 'barba', 'recorrente', 'Corte masculino em contexto de barbearia.', array['corte_masculino'], array['corte masculino'], '{"seed":"mer_phase2","group":"barbearia"}'::jsonb),
    ('BEARD', 'Barba', 'barba', 'recorrente', 'Barba tradicional, desenho e acabamento.', array['barba'], array['barba'], '{"seed":"mer_phase2","group":"barbearia"}'::jsonb),
    ('HAIR_AND_BEARD', 'Corte + barba', 'barba', 'recorrente', 'Combinacao de corte masculino e barba.', array['corte_e_barba'], array['corte e barba', 'corte + barba'], '{"seed":"mer_phase2","group":"barbearia"}'::jsonb),
    ('FINISHING', 'Acabamento', 'barba', 'recorrente', 'Acabamento de barba, pe e contornos.', array['acabamento'], array['acabamento'], '{"seed":"mer_phase2","group":"barbearia"}'::jsonb),
    ('BEARD_PIGMENTATION_CAMOUFLAGE', 'Pigmentacao/camuflagem de barba', 'barba', 'recorrente', 'Pigmentacao e camuflagem de fios brancos na barba.', array['pigmentacao_de_barba', 'camuflagem_de_fios_brancos'], array['pigmentacao de barba', 'camuflagem de fios brancos'], '{"seed":"mer_phase2","group":"barbearia"}'::jsonb),

    ('SKIN_CLEANSING', 'Limpeza de pele', 'estetica_facial', 'recorrente', 'Limpeza de pele facial.', array['limpeza_de_pele'], array['limpeza de pele'], '{"seed":"mer_phase2","group":"estetica_facial"}'::jsonb),
    ('FACIAL_HYDRATION', 'Hidratacao facial', 'estetica_facial', 'recorrente', 'Hidratacao facial.', array['hidratacao_facial'], array['hidratacao facial'], '{"seed":"mer_phase2","group":"estetica_facial"}'::jsonb),
    ('AESTHETIC_PEELING', 'Peeling estetico', 'estetica_facial', 'recorrente', 'Peeling estetico superficial.', array['peeling_estetico_superficial'], array['peeling estetico', 'peeling estetico superficial'], '{"seed":"mer_phase2","group":"estetica_facial"}'::jsonb),
    ('FACIAL_REVITALIZATION', 'Revitalizacao facial', 'estetica_facial', 'recorrente', 'Revitalizacao facial.', array['revitalizacao_facial'], array['revitalizacao facial'], '{"seed":"mer_phase2","group":"estetica_facial"}'::jsonb),
    ('FACIAL_DRAINAGE', 'Drenagem facial', 'estetica_facial', 'recorrente', 'Drenagem facial.', array['drenagem_facial'], array['drenagem facial'], '{"seed":"mer_phase2","group":"estetica_facial"}'::jsonb),

    ('RELAXING_MASSAGE', 'Massagem relaxante', 'massoterapia', 'recorrente', 'Massagem relaxante e bem-estar.', array['massagem_relaxante', 'massagem'], array['massagem relaxante', 'massagem'], '{"seed":"mer_phase2","group":"estetica_corporal_bem_estar"}'::jsonb),
    ('SHAPING_MASSAGE', 'Massagem modeladora', 'estetica_corporal', 'recorrente', 'Massagem modeladora corporal.', array['massagem_modeladora'], array['massagem modeladora'], '{"seed":"mer_phase2","group":"estetica_corporal_bem_estar"}'::jsonb),
    ('LYMPHATIC_DRAINAGE', 'Drenagem linfatica', 'estetica_corporal', 'recorrente', 'Drenagem linfatica corporal.', array['drenagem_linfatica'], array['drenagem linfatica'], '{"seed":"mer_phase2","group":"estetica_corporal_bem_estar"}'::jsonb),
    ('BODY_TREATMENT', 'Tratamento corporal', 'estetica_corporal', 'recorrente', 'Tratamentos corporais recorrentes.', array['tratamento_corporal_recorrente'], array['tratamento corporal', 'tratamento corporal recorrente'], '{"seed":"mer_phase2","group":"estetica_corporal_bem_estar"}'::jsonb),
    ('BODY_SPA', 'Spa corporal', 'estetica_corporal', 'ocasional', 'Ritual de spa corporal.', array['spa_corporal'], array['spa corporal'], '{"seed":"mer_phase2","group":"estetica_corporal_bem_estar"}'::jsonb),

    ('WAXING', 'Depilacao com cera', 'depilacao', 'recorrente', 'Depilacao com cera.', array['depilacao_com_cera'], array['depilacao com cera'], '{"seed":"mer_phase2","group":"depilacao"}'::jsonb),
    ('FACIAL_WAXING', 'Depilacao facial', 'depilacao', 'recorrente', 'Depilacao facial.', array['depilacao_facial'], array['depilacao facial'], '{"seed":"mer_phase2","group":"depilacao"}'::jsonb),
    ('LASER_HAIR_REMOVAL', 'Depilacao a laser', 'depilacao', 'recorrente', 'Depilacao a laser.', array['depilacao_a_laser'], array['depilacao a laser'], '{"seed":"mer_phase2","group":"depilacao"}'::jsonb),

    ('MAKEUP', 'Maquiagem', 'maquiagem', 'ocasional', 'Maquiagem sem detalhamento de evento.', array['maquiagem'], array['maquiagem'], '{"seed":"mer_phase2","group":"maquiagem_eventos"}'::jsonb),
    ('SOCIAL_MAKEUP', 'Maquiagem social', 'maquiagem', 'ocasional', 'Maquiagem social para eventos.', array['maquiagem_social'], array['maquiagem social'], '{"seed":"mer_phase2","group":"maquiagem_eventos"}'::jsonb),
    ('BRIDAL_MAKEUP', 'Maquiagem para noiva', 'maquiagem', 'ocasional', 'Maquiagem para noiva.', array['maquiagem_para_noiva'], array['maquiagem para noiva'], '{"seed":"mer_phase2","group":"maquiagem_eventos"}'::jsonb),
    ('EVENT_HAIRSTYLE', 'Penteado para eventos', 'maquiagem', 'ocasional', 'Penteado para eventos.', array['penteado_para_eventos'], array['penteado para eventos'], '{"seed":"mer_phase2","group":"maquiagem_eventos"}'::jsonb),
    ('BRIDAL_HAIRSTYLE', 'Penteado para noiva', 'maquiagem', 'ocasional', 'Penteado para noiva.', array['penteado_para_noiva'], array['penteado para noiva'], '{"seed":"mer_phase2","group":"maquiagem_eventos"}'::jsonb),
    ('PARTY_PRODUCTION', 'Producao para festas', 'maquiagem', 'ocasional', 'Producao completa para festas.', array['producao_para_festas'], array['producao para festas'], '{"seed":"mer_phase2","group":"maquiagem_eventos"}'::jsonb),
    ('BRIDAL_DAY', 'Dia da noiva', 'maquiagem', 'ocasional', 'Pacote de preparacao para noiva.', array['dia_da_noiva'], array['dia da noiva'], '{"seed":"mer_phase2","group":"maquiagem_eventos"}'::jsonb)
),
upsert_catalog as (
  insert into public.servicos_catalogo (
    codigo_canonico,
    nome,
    categoria_key,
    natureza,
    descricao,
    ativo,
    metadata
  )
  select
    codigo_canonico,
    nome,
    categoria_key,
    natureza,
    descricao,
    true,
    metadata
      || jsonb_build_object(
        'source_service_keys',
        to_jsonb(source_service_keys),
        'legacy_names',
        to_jsonb(legacy_names)
      )
  from canonical_services
  on conflict (codigo_canonico) do update
    set nome = excluded.nome,
        categoria_key = excluded.categoria_key,
        natureza = excluded.natureza,
        descricao = excluded.descricao,
        ativo = excluded.ativo,
        metadata = servicos_catalogo.metadata || excluded.metadata,
        updated_at = now()
  returning id, codigo_canonico
),
canonical_map as (
  select cs.*, sc.id as servico_catalogo_id
  from canonical_services cs
  join upsert_catalog sc on sc.codigo_canonico = cs.codigo_canonico
),
single_specialty as (
  select distinct on (taxonomy_specialty_key)
    id,
    taxonomy_specialty_key,
    nome
  from public.especialidades
  where deleted_at is null
    and taxonomy_specialty_key is not null
  order by taxonomy_specialty_key, (tenant_id is null) desc, is_official desc nulls last, created_at asc
),
compatibility_source as (
  select distinct
    cm.servico_catalogo_id,
    cm.codigo_canonico,
    ss.id as especialidade_id,
    ss.taxonomy_specialty_key,
    ss.nome as especialidade_nome
  from canonical_map cm
  cross join lateral unnest(cm.source_service_keys) source_key
  join public.taxonomia_servico_especialidades tse
    on tse.servico_key = source_key
  join single_specialty ss
    on ss.taxonomy_specialty_key = tse.especialidade_key
),
upsert_compatibility as (
  insert into public.servico_catalogo_especialidades (
    servico_catalogo_id,
    especialidade_id,
    ativo,
    metadata
  )
  select
    servico_catalogo_id,
    especialidade_id,
    true,
    jsonb_build_object(
      'seed',
      'mer_phase2',
      'source',
      'taxonomia_servico_especialidades',
      'codigo_canonico',
      codigo_canonico,
      'taxonomy_specialty_key',
      taxonomy_specialty_key
    )
  from compatibility_source
  on conflict (servico_catalogo_id, especialidade_id) do update
    set ativo = excluded.ativo,
        metadata = servico_catalogo_especialidades.metadata || excluded.metadata,
        updated_at = now()
  returning id, servico_catalogo_id, especialidade_id
),
legacy_mapped as (
  select
    s.*,
    cm.servico_catalogo_id,
    cm.codigo_canonico,
    cm.natureza,
    case
      when s.taxonomy_service_key = any(cm.source_service_keys) then 'mapeamento_exato_taxonomia'
      when lower(trim(s.nome)) = any(cm.legacy_names)
       and lower(trim(coalesce(s.taxonomy_category_key, s.categoria, ''))) = cm.categoria_key then 'mapeamento_exato_nome_categoria'
      else null
    end as mapping_status
  from public.servicos s
  join canonical_map cm
    on (
      s.taxonomy_service_key = any(cm.source_service_keys)
      or (
        lower(trim(s.nome)) = any(cm.legacy_names)
        and lower(trim(coalesce(s.taxonomy_category_key, s.categoria, ''))) = cm.categoria_key
      )
    )
  where s.deleted_at is null
),
validated_legacy as (
  select *
  from legacy_mapped
  where mapping_status in ('mapeamento_exato_taxonomia', 'mapeamento_exato_nome_categoria')
),
upsert_service_tenants as (
  insert into public.servico_tenants (
    tenant_id,
    servico_catalogo_id,
    ativo,
    metadata
  )
  select
    tenant_id,
    servico_catalogo_id,
    bool_or(coalesce(ativo, true)) as ativo,
    jsonb_build_object(
      'seed',
      'mer_phase2',
      'source',
      'servicos',
      'legacy_servico_ids',
      jsonb_agg(id order by id),
      'codigo_canonico',
      codigo_canonico,
      'mapping_status',
      min(mapping_status)
    )
  from validated_legacy
  group by tenant_id, servico_catalogo_id, codigo_canonico
  on conflict (tenant_id, servico_catalogo_id) do update
    set ativo = excluded.ativo,
        metadata = servico_tenants.metadata || excluded.metadata,
        updated_at = now()
  returning id, tenant_id, servico_catalogo_id
),
legacy_config_source as (
  select
    st.id as servico_tenant_id,
    se.especialidade_id,
    max(nullif(se.preco, 0)) as preco,
    max(case when se.duracao_minutos > 0 then se.duracao_minutos end) as duracao_minutos,
    max(
      case
        when se.dias_retorno_recomendado > 0 then se.dias_retorno_recomendado
        when vl.natureza = 'recorrente' and vl.dias_retorno_recomendado > 0 then vl.dias_retorno_recomendado
        else null
      end
    ) as dias_retorno_recomendado,
    bool_or(coalesce(se.aceita_agendamento_online, vl.permite_online, true)) as aceita_agendamento_online,
    bool_or(coalesce(se.ativo, true) and coalesce(vl.ativo, true)) as ativo,
    jsonb_agg(se.id order by se.id) as legacy_servico_especialidade_ids,
    min(vl.codigo_canonico) as codigo_canonico
  from validated_legacy vl
  join upsert_service_tenants st
    on st.tenant_id = vl.tenant_id
   and st.servico_catalogo_id = vl.servico_catalogo_id
  join public.servico_especialidades se
    on se.tenant_id = vl.tenant_id
   and se.servico_id = vl.id
   and se.deleted_at is null
  join upsert_compatibility sce
    on sce.servico_catalogo_id = vl.servico_catalogo_id
   and sce.especialidade_id = se.especialidade_id
  group by st.id, se.especialidade_id
),
upsert_tenant_specialties as (
  insert into public.servico_tenant_especialidades (
    servico_tenant_id,
    especialidade_id,
    preco,
    duracao_minutos,
    dias_retorno_recomendado,
    aceita_agendamento_online,
    ativo,
    metadata
  )
  select
    servico_tenant_id,
    especialidade_id,
    preco,
    duracao_minutos,
    dias_retorno_recomendado,
    aceita_agendamento_online,
    ativo,
    jsonb_build_object(
      'seed',
      'mer_phase2',
      'source',
      'servico_especialidades',
      'legacy_servico_especialidade_ids',
      legacy_servico_especialidade_ids,
      'codigo_canonico',
      codigo_canonico,
      'pricing_policy',
      'copy_positive_values_only'
    )
  from legacy_config_source
  on conflict (servico_tenant_id, especialidade_id) do update
    set preco = excluded.preco,
        duracao_minutos = excluded.duracao_minutos,
        dias_retorno_recomendado = excluded.dias_retorno_recomendado,
        aceita_agendamento_online = excluded.aceita_agendamento_online,
        ativo = excluded.ativo,
        metadata = servico_tenant_especialidades.metadata || excluded.metadata,
        updated_at = now()
  returning id
)
select
  (select count(*) from canonical_services) as catalogo_planejado,
  (select count(*) from upsert_catalog) as catalogo_upsert_retornado,
  (select count(*) from upsert_compatibility) as compatibilidades_upsert_retornado,
  (select count(*) from upsert_service_tenants) as ofertas_upsert_retornado,
  (select count(*) from upsert_tenant_specialties) as configuracoes_upsert_retornado;

-- Audit queries for the mandatory Phase 2 report.
--
-- Catalog:
-- select categoria_key, natureza, count(*) from public.servicos_catalogo group by categoria_key, natureza order by categoria_key, natureza;
--
-- Compatibility:
-- select count(*) from public.servico_catalogo_especialidades;
-- select sc.codigo_canonico, sc.nome from public.servicos_catalogo sc where not exists (select 1 from public.servico_catalogo_especialidades sce where sce.servico_catalogo_id = sc.id and sce.ativo = true) order by sc.codigo_canonico;
-- select e.taxonomy_specialty_key, e.nome from public.especialidades e where e.deleted_at is null and e.taxonomy_specialty_key is not null and not exists (select 1 from public.servico_catalogo_especialidades sce where sce.especialidade_id = e.id and sce.ativo = true) order by e.taxonomy_specialty_key;
--
-- Legacy mapping:
-- with canonical_services (codigo_canonico, categoria_key, source_service_keys, legacy_names) as (
--   values
--     ('MANICURE','unhas',array['manicure','manicure_tradicional'],array['manicure','manicure tradicional']),
--     ('PEDICURE','unhas',array['pedicure'],array['pedicure']),
--     ('GEL_POLISH','unhas',array['esmaltacao_em_gel'],array['esmaltacao em gel']),
--     ('NAIL_EXTENSION','unhas',array['alongamento_de_unhas'],array['alongamento de unhas']),
--     ('NAIL_EXTENSION_MAINTENANCE','unhas',array['manutencao_de_alongamento'],array['manutencao de alongamento']),
--     ('GEL_BATH','unhas',array['banho_de_gel'],array['banho de gel']),
--     ('NAIL_ART','unhas',array['nail_art'],array['nail art','nailart']),
--     ('HAIR_CUT','cabelo',array['corte_de_cabelo'],array['corte de cabelo']),
--     ('BRUSHING','cabelo',array['escova'],array['escova']),
--     ('HAIR_HYDRATION','terapia_capilar',array['hidratacao'],array['hidratacao','hidratacao capilar']),
--     ('MAKEUP','maquiagem',array['maquiagem'],array['maquiagem']),
--     ('BRAIDS','cabelo',array['trancas'],array['trancas','tranças']),
--     ('BROW_DESIGN','sobrancelhas',array['design_de_sobrancelhas','design_com_henna'],array['design de sobrancelhas','design com henna'])
-- )
-- select s.id, t.nome_fantasia as tenant, s.nome, coalesce(s.taxonomy_category_key, s.categoria) as categoria,
--        coalesce(sc.codigo_canonico, cs.codigo_canonico) as codigo_canonico,
--        case
--          when s.taxonomy_service_key = any(cs.source_service_keys) then 'mapeamento_exato_taxonomia'
--          when lower(trim(s.nome)) = any(cs.legacy_names) and lower(trim(coalesce(s.taxonomy_category_key, s.categoria, ''))) = cs.categoria_key then 'mapeamento_exato_nome_categoria'
--          when sc.id is null then 'sem_correspondencia_ou_ambiguo'
--          else 'revisar'
--        end as classificacao
-- from public.servicos s
-- left join public.tenants t on t.id = s.tenant_id
-- left join canonical_services cs on s.taxonomy_service_key = any(cs.source_service_keys)
--   or (lower(trim(s.nome)) = any(cs.legacy_names) and lower(trim(coalesce(s.taxonomy_category_key, s.categoria, ''))) = cs.categoria_key)
-- left join public.servicos_catalogo sc on sc.codigo_canonico = cs.codigo_canonico
-- where s.deleted_at is null
-- order by tenant, s.nome;
--
-- Tenant/configuration:
-- select tenant_id, count(*) from public.servico_tenants group by tenant_id order by tenant_id;
-- select
--   count(*) as total,
--   count(*) filter (where preco is null) as sem_preco,
--   count(*) filter (where duracao_minutos is null) as sem_duracao,
--   count(*) filter (where dias_retorno_recomendado is null) as sem_retorno,
--   count(*) filter (where ativo = false) as inativas
-- from public.servico_tenant_especialidades;
