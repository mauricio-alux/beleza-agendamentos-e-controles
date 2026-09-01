-- Taxonomy V2 - Etapa 5C: official preconfiguration of service applicability
-- by business type.
--
-- Scope: global taxonomy matrix only. This migration inserts absent
-- tipo_negocio_servicos_catalogo rows so the MasterAdmin starts from a
-- coherent official baseline. It does not change operational profile
-- recommendations, tenants, tenant offers, booking, agenda or appointments.
--
-- Governance:
-- - tipo_negocio_servicos_catalogo = applicability.
-- - perfil_operacional_servicos.recomendado = recommendation.
-- - Existing rows are preserved with ON CONFLICT DO NOTHING, including manual
--   MasterAdmin decisions that may have set ativo = false before a re-run.
-- - The legacy recomendado column on tipo_negocio_servicos_catalogo is seeded
--   as false for new rows and is not used as a recommendation rule.

update public.taxonomy_versions
set status = 'deprecated',
    updated_at = now(),
    metadata = coalesce(metadata, '{}'::jsonb) || jsonb_build_object(
      'superseded_by', '2.3.0',
      'superseded_reason', 'taxonomy_v2_business_type_service_applicability_preconfiguration'
    )
where version = '2.2.0'
  and status = 'active';

insert into public.taxonomy_versions (version, status, descricao, origem, metadata, activated_at)
select
  '2.3.0',
  'active',
  'Taxonomia V2 - Etapa 5C: pre-configuracao oficial de aplicabilidade dos servicos por tipo de negocio.',
  'taxonomy_v2_business_type_service_applicability_preconfiguration',
  jsonb_build_object(
    'scope', 'business_type_service_applicability_preconfiguration',
    'business_type_service_matrix', 'official_initial_baseline',
    'tipo_negocio_servicos_catalogo_semantics', 'applicability',
    'perfil_operacional_servicos_semantics', 'recommendation',
    'legacy_tipo_negocio_recomendado_used_as_rule', false,
    'masteradmin_manual_governance_preserved', true,
    'automatic_resync_created', false,
    'tenant_offers_changed', 0,
    'tenant_service_specialties_changed', 0,
    'profiles_changed', 0,
    'professionals_changed', 0,
    'booking_changed', 0,
    'agenda_changed', 0,
    'appointments_changed', 0
  ),
  now()
where not exists (
  select 1 from public.taxonomy_versions where version = '2.3.0'
);

do $$
declare
  active_type_count_before integer;
  active_catalog_count_before integer;
  active_relation_count_before integer;
  official_seed_inserted_count integer;
  profile_evidence_inserted_count integer;
  active_relation_count_after integer;
  missing_profile_recommendations integer;
begin
  select count(*) into active_type_count_before
  from public.tipos_negocio
  where ativo = true;

  select count(*) into active_catalog_count_before
  from public.servicos_catalogo
  where ativo = true;

  select count(*) into active_relation_count_before
  from public.tipo_negocio_servicos_catalogo
  where ativo = true;

  with official_applicability_seed(tipo_slug, service_code, ordem_exibicao, justification) as (
    values
      ('salao-de-beleza', 'HAIR_CUT', 10, 'Servico central de cabelo em salao de beleza.'),
      ('salao-de-beleza', 'BRUSHING', 20, 'Finalizacao capilar comum em salao de beleza.'),
      ('salao-de-beleza', 'HAIR_COLORING', 30, 'Coloracao capilar coerente com salao de beleza.'),
      ('salao-de-beleza', 'HAIR_TONING', 40, 'Tonalizacao capilar coerente com salao de beleza.'),
      ('salao-de-beleza', 'HIGHLIGHTS', 50, 'Tecnica de iluminacao capilar coerente com salao de beleza.'),
      ('salao-de-beleza', 'BALAYAGE', 60, 'Tecnica de clareamento coerente com salao de beleza.'),
      ('salao-de-beleza', 'PROGRESSIVE_BRUSH', 70, 'Transformacao capilar coerente com salao de beleza.'),
      ('salao-de-beleza', 'HAIR_STRAIGHTENING', 80, 'Transformacao capilar coerente com salao de beleza.'),
      ('salao-de-beleza', 'HAIR_RELAXING', 90, 'Relaxamento capilar coerente com salao de beleza.'),
      ('salao-de-beleza', 'HAIR_HYDRATION', 100, 'Tratamento capilar comum em salao de beleza.'),
      ('salao-de-beleza', 'HAIR_NUTRITION', 110, 'Tratamento capilar comum em salao de beleza.'),
      ('salao-de-beleza', 'HAIR_RECONSTRUCTION', 120, 'Tratamento capilar comum em salao de beleza.'),
      ('salao-de-beleza', 'SCALP_THERAPY', 130, 'Tratamento capilar compatível com salao de beleza.'),
      ('salao-de-beleza', 'HAIR_BOTOX', 140, 'Tratamento de alinhamento capilar coerente com salao de beleza.'),
      ('salao-de-beleza', 'HAIR_CAUTERIZATION', 150, 'Reconstrucao capilar coerente com salao de beleza.'),
      ('salao-de-beleza', 'BRAIDS', 160, 'Servico capilar aplicavel a saloes com trancas.'),
      ('salao-de-beleza', 'BRAID_MAINTENANCE', 170, 'Manutencao capilar aplicavel a saloes com trancas.'),
      ('salao-de-beleza', 'HAIR_EXTENSION', 180, 'Extensao capilar coerente com salao de beleza.'),
      ('salao-de-beleza', 'MANICURE', 190, 'Servico de unhas comum em salao completo.'),
      ('salao-de-beleza', 'PEDICURE', 200, 'Servico de unhas comum em salao completo.'),
      ('salao-de-beleza', 'GEL_POLISH', 210, 'Esmaltacao aplicavel a salao completo.'),
      ('salao-de-beleza', 'NAIL_EXTENSION', 220, 'Alongamento de unhas aplicavel a salao completo.'),
      ('salao-de-beleza', 'NAIL_EXTENSION_MAINTENANCE', 230, 'Manutencao de alongamento aplicavel a salao completo.'),
      ('salao-de-beleza', 'NAIL_EXTENSION_REMOVAL', 240, 'Remocao de alongamento aplicavel a salao completo.'),
      ('salao-de-beleza', 'GEL_BATH', 250, 'Banho de gel aplicavel a salao completo.'),
      ('salao-de-beleza', 'NAIL_ART', 260, 'Decoracao de unhas aplicavel a salao completo.'),
      ('salao-de-beleza', 'BROW_DESIGN', 270, 'Sobrancelhas sao estetica leve comum em salao.'),
      ('salao-de-beleza', 'BROW_LAMINATION', 280, 'Servico de sobrancelhas aplicavel a salao completo.'),
      ('salao-de-beleza', 'BROW_MICROPIGMENTATION', 290, 'Micropigmentacao pode compor salao completo quando habilitada.'),
      ('salao-de-beleza', 'LASH_EXTENSION', 300, 'Cilios aplicavel a salao completo quando habilitado.'),
      ('salao-de-beleza', 'LASH_LIFTING', 310, 'Cilios aplicavel a salao completo quando habilitado.'),
      ('salao-de-beleza', 'LASH_MAINTENANCE', 320, 'Manutencao de cilios aplicavel a salao completo quando habilitado.'),
      ('salao-de-beleza', 'LASH_REMOVAL', 330, 'Remocao de cilios aplicavel a salao completo quando habilitado.'),
      ('salao-de-beleza', 'MAKEUP', 340, 'Maquiagem e comum em salao completo.'),
      ('salao-de-beleza', 'SOCIAL_MAKEUP', 350, 'Maquiagem social e coerente com salao completo.'),
      ('salao-de-beleza', 'BRIDAL_MAKEUP', 360, 'Maquiagem de noiva e coerente com salao completo.'),
      ('salao-de-beleza', 'EVENT_HAIRSTYLE', 370, 'Penteado para eventos e coerente com salao completo.'),
      ('salao-de-beleza', 'BRIDAL_HAIRSTYLE', 380, 'Penteado de noiva e coerente com salao completo.'),
      ('salao-de-beleza', 'PARTY_PRODUCTION', 390, 'Producao para festas e coerente com salao completo.'),
      ('salao-de-beleza', 'BRIDAL_DAY', 400, 'Dia da noiva e coerente com salao completo.'),
      ('salao-de-beleza', 'WAXING', 410, 'Depilacao com cera pode compor salao completo.'),
      ('salao-de-beleza', 'FACIAL_WAXING', 420, 'Depilacao facial pode compor salao completo.'),
      ('salao-de-beleza', 'SKIN_CLEANSING', 430, 'Estetica facial leve pode compor salao completo.'),
      ('salao-de-beleza', 'FACIAL_HYDRATION', 440, 'Estetica facial leve pode compor salao completo.'),

      ('barbearia', 'MENS_HAIR_CUT', 10, 'Servico central de barbearia.'),
      ('barbearia', 'BEARD', 20, 'Servico central de barbearia.'),
      ('barbearia', 'HAIR_AND_BEARD', 30, 'Pacote central de barbearia.'),
      ('barbearia', 'FINISHING', 40, 'Acabamento e servico coerente com barbearia.'),
      ('barbearia', 'BEARD_PIGMENTATION_CAMOUFLAGE', 50, 'Pigmentacao de barba e coerente com barbearia.'),
      ('barbearia', 'BROW_DESIGN', 60, 'Design de sobrancelhas pode compor barbearias.'),
      ('barbearia', 'WAXING', 70, 'Depilacao com cera pode compor barbearias.'),
      ('barbearia', 'FACIAL_WAXING', 80, 'Depilacao facial pode compor barbearias.'),

      ('nail-studio', 'MANICURE', 10, 'Servico central de esmalteria.'),
      ('nail-studio', 'PEDICURE', 20, 'Servico central de esmalteria.'),
      ('nail-studio', 'GEL_POLISH', 30, 'Esmaltacao em gel e coerente com esmalteria.'),
      ('nail-studio', 'NAIL_EXTENSION', 40, 'Alongamento de unhas e coerente com nail studio.'),
      ('nail-studio', 'NAIL_EXTENSION_MAINTENANCE', 50, 'Manutencao de alongamento e coerente com nail studio.'),
      ('nail-studio', 'NAIL_EXTENSION_REMOVAL', 60, 'Remocao de alongamento e coerente com nail studio.'),
      ('nail-studio', 'GEL_BATH', 70, 'Banho de gel e coerente com nail studio.'),
      ('nail-studio', 'NAIL_ART', 80, 'Nail art e coerente com nail studio.'),

      ('studio-de-sobrancelhas', 'BROW_DESIGN', 10, 'Servico central de studio de sobrancelhas.'),
      ('studio-de-sobrancelhas', 'BROW_LAMINATION', 20, 'Servico central de studio de sobrancelhas.'),
      ('studio-de-sobrancelhas', 'BROW_MICROPIGMENTATION', 30, 'Micropigmentacao e coerente com studio de sobrancelhas.'),
      ('studio-de-sobrancelhas', 'FACIAL_WAXING', 40, 'Depilacao facial e coerente com sobrancelhas.'),

      ('studio-de-cilios', 'LASH_EXTENSION', 10, 'Servico central de studio de cilios.'),
      ('studio-de-cilios', 'LASH_LIFTING', 20, 'Servico central de studio de cilios.'),
      ('studio-de-cilios', 'LASH_MAINTENANCE', 30, 'Manutencao de cilios e coerente com studio de cilios.'),
      ('studio-de-cilios', 'LASH_REMOVAL', 40, 'Remocao de cilios e coerente com studio de cilios.'),

      ('maquiagem-e-penteados', 'MAKEUP', 10, 'Servico central de maquiagem e penteados.'),
      ('maquiagem-e-penteados', 'SOCIAL_MAKEUP', 20, 'Servico central de maquiagem e eventos.'),
      ('maquiagem-e-penteados', 'BRIDAL_MAKEUP', 30, 'Servico central de noivas.'),
      ('maquiagem-e-penteados', 'EVENT_HAIRSTYLE', 40, 'Servico central de penteados.'),
      ('maquiagem-e-penteados', 'BRIDAL_HAIRSTYLE', 50, 'Servico central de noivas.'),
      ('maquiagem-e-penteados', 'PARTY_PRODUCTION', 60, 'Producao completa e coerente com eventos.'),
      ('maquiagem-e-penteados', 'BRIDAL_DAY', 70, 'Dia da noiva e coerente com eventos.'),
      ('maquiagem-e-penteados', 'BRUSHING', 80, 'Finalizacao capilar pode apoiar penteados.'),
      ('maquiagem-e-penteados', 'HAIR_CUT', 90, 'Corte pode compor carteira de producao de beleza.'),

      ('clinica-de-estetica', 'SKIN_CLEANSING', 10, 'Estetica facial central em clinica de estetica.'),
      ('clinica-de-estetica', 'FACIAL_HYDRATION', 20, 'Estetica facial central em clinica de estetica.'),
      ('clinica-de-estetica', 'AESTHETIC_PEELING', 30, 'Procedimento estetico facial coerente com clinica.'),
      ('clinica-de-estetica', 'FACIAL_REVITALIZATION', 40, 'Procedimento estetico facial coerente com clinica.'),
      ('clinica-de-estetica', 'FACIAL_DRAINAGE', 50, 'Drenagem facial coerente com clinica.'),
      ('clinica-de-estetica', 'SHAPING_MASSAGE', 60, 'Estetica corporal coerente com clinica.'),
      ('clinica-de-estetica', 'LYMPHATIC_DRAINAGE', 70, 'Drenagem corporal coerente com clinica.'),
      ('clinica-de-estetica', 'BODY_TREATMENT', 80, 'Tratamento corporal coerente com clinica.'),
      ('clinica-de-estetica', 'BODY_SPA', 90, 'Spa corporal pode compor clinica.'),
      ('clinica-de-estetica', 'LASER_HAIR_REMOVAL', 100, 'Depilacao a laser e coerente com clinica.'),
      ('clinica-de-estetica', 'WAXING', 110, 'Depilacao com cera pode compor clinica.'),
      ('clinica-de-estetica', 'FACIAL_WAXING', 120, 'Depilacao facial pode compor clinica.'),
      ('clinica-de-estetica', 'BROW_MICROPIGMENTATION', 130, 'Micropigmentacao estetica pode compor clinica.'),

      ('estetica-facial', 'SKIN_CLEANSING', 10, 'Servico central de estetica facial.'),
      ('estetica-facial', 'FACIAL_HYDRATION', 20, 'Servico central de estetica facial.'),
      ('estetica-facial', 'FACIAL_DRAINAGE', 30, 'Drenagem facial e coerente com estetica facial.'),
      ('estetica-facial', 'AESTHETIC_PEELING', 40, 'Peeling estetico e coerente com estetica facial.'),
      ('estetica-facial', 'FACIAL_REVITALIZATION', 50, 'Revitalizacao facial e coerente com estetica facial.'),
      ('estetica-facial', 'FACIAL_WAXING', 60, 'Depilacao facial e coerente com estetica facial.'),

      ('estetica-corporal', 'SHAPING_MASSAGE', 10, 'Servico central de estetica corporal.'),
      ('estetica-corporal', 'LYMPHATIC_DRAINAGE', 20, 'Servico central de estetica corporal.'),
      ('estetica-corporal', 'BODY_TREATMENT', 30, 'Tratamento corporal e coerente com estetica corporal.'),
      ('estetica-corporal', 'BODY_SPA', 40, 'Spa corporal e coerente com estetica corporal.'),
      ('estetica-corporal', 'WAXING', 50, 'Depilacao corporal pode compor estetica corporal.'),

      ('massoterapia', 'RELAXING_MASSAGE', 10, 'Servico central de massoterapia.'),
      ('massoterapia', 'THERAPEUTIC_MASSAGE_NON_CLINICAL', 20, 'Massagem terapeutica nao clinica e coerente com massoterapia.'),
      ('massoterapia', 'SHAPING_MASSAGE', 30, 'Massagem modeladora pode compor massoterapia estetica.'),
      ('massoterapia', 'LYMPHATIC_DRAINAGE', 40, 'Drenagem linfatica pode compor massoterapia.'),
      ('massoterapia', 'BODY_SPA', 50, 'Spa corporal pode compor massoterapia.'),
      ('massoterapia', 'REFLEXOLOGY', 60, 'Reflexologia e compativel com terapias manuais.'),

      ('spa-day-spa', 'SPA_RITUAL', 10, 'Servico central de spa.'),
      ('spa-day-spa', 'RELAXING_MASSAGE', 20, 'Massagem relaxante e central em spa.'),
      ('spa-day-spa', 'THERAPEUTIC_MASSAGE_NON_CLINICAL', 30, 'Massagem de bem-estar pode compor spa.'),
      ('spa-day-spa', 'SHAPING_MASSAGE', 40, 'Massagem modeladora pode compor spa.'),
      ('spa-day-spa', 'LYMPHATIC_DRAINAGE', 50, 'Drenagem linfatica pode compor spa.'),
      ('spa-day-spa', 'BODY_TREATMENT', 60, 'Tratamento corporal pode compor spa.'),
      ('spa-day-spa', 'BODY_SPA', 70, 'Spa corporal e coerente com spa.'),
      ('spa-day-spa', 'SKIN_CLEANSING', 80, 'Estetica facial pode compor spa.'),
      ('spa-day-spa', 'FACIAL_HYDRATION', 90, 'Estetica facial pode compor spa.'),
      ('spa-day-spa', 'MANICURE', 100, 'Manicure pode compor experiencia de spa.'),
      ('spa-day-spa', 'PEDICURE', 110, 'Pedicure pode compor experiencia de spa.'),
      ('spa-day-spa', 'AROMATHERAPY', 120, 'Aromaterapia e coerente com spa.'),
      ('spa-day-spa', 'REFLEXOLOGY', 130, 'Reflexologia e coerente com spa.'),

      ('podologia', 'PEDICURE', 10, 'Pedicure e correlato estetico aos cuidados dos pes.'),
      ('podologia', 'PODOLOGY_AESTHETIC_PREVENTIVE', 20, 'Servico central de podologia estetica/preventiva.'),

      ('depilacao', 'WAXING', 10, 'Servico central de depilacao.'),
      ('depilacao', 'FACIAL_WAXING', 20, 'Servico central de depilacao facial.'),
      ('depilacao', 'LASER_HAIR_REMOVAL', 30, 'Depilacao a laser e coerente com depilacao.'),

      ('bronzeamento', 'ARTIFICIAL_TANNING', 10, 'Servico central de bronzeamento.'),
      ('bronzeamento', 'SPRAY_TANNING', 20, 'Servico central de bronzeamento.'),

      ('micropigmentacao', 'BROW_MICROPIGMENTATION', 10, 'Servico central de micropigmentacao estetica.'),
      ('micropigmentacao', 'BROW_DESIGN', 20, 'Design de sobrancelhas e preparatorio/coerente com micropigmentacao.'),

      ('tatuagem', 'TATTOO', 10, 'Servico central de studio de tatuagem.'),
      ('tatuagem', 'TATTOO_RETOUCH', 20, 'Retoque e coerente com studio de tatuagem.'),

      ('body-piercing', 'BODY_PIERCING', 10, 'Servico central de body piercing.'),
      ('body-piercing', 'PIERCING_JEWELRY_CHANGE', 20, 'Troca de joia e coerente com body piercing.'),

      ('clinica-capilar-tricologia', 'HAIR_HYDRATION', 10, 'Tratamento capilar aplicavel a clinica capilar.'),
      ('clinica-capilar-tricologia', 'HAIR_NUTRITION', 20, 'Tratamento capilar aplicavel a clinica capilar.'),
      ('clinica-capilar-tricologia', 'HAIR_RECONSTRUCTION', 30, 'Tratamento capilar aplicavel a clinica capilar.'),
      ('clinica-capilar-tricologia', 'SCALP_THERAPY', 40, 'Terapia capilar central em tricologia.'),
      ('clinica-capilar-tricologia', 'HAIR_BOTOX', 50, 'Tratamento capilar aplicavel a clinica capilar.'),
      ('clinica-capilar-tricologia', 'HAIR_CAUTERIZATION', 60, 'Cauterizacao capilar aplicavel a clinica capilar.'),
      ('clinica-capilar-tricologia', 'HAIR_CUT', 70, 'Corte pode compor clinica capilar.'),
      ('clinica-capilar-tricologia', 'BRUSHING', 80, 'Finalizacao pode compor clinica capilar.'),
      ('clinica-capilar-tricologia', 'HAIR_COLORING', 90, 'Coloracao pode compor clinica capilar quando habilitada.'),
      ('clinica-capilar-tricologia', 'HAIR_TONING', 100, 'Tonalizacao pode compor clinica capilar quando habilitada.'),
      ('clinica-capilar-tricologia', 'HAIR_RELAXING', 110, 'Relaxamento pode compor clinica capilar quando habilitada.'),
      ('clinica-capilar-tricologia', 'PROGRESSIVE_BRUSH', 120, 'Progressiva pode compor clinica capilar quando habilitada.'),

      ('fisioterapia', 'PHYSIOTHERAPY_ASSESSMENT', 10, 'Avaliacao e central em fisioterapia.'),
      ('fisioterapia', 'PHYSIOTHERAPY_SESSION', 20, 'Sessao e central em fisioterapia.'),

      ('pilates', 'PILATES_CLASS', 10, 'Aula de Pilates e central para esse tipo.'),

      ('terapias-integrativas', 'REIKI', 10, 'Reiki e central em terapias integrativas.'),
      ('terapias-integrativas', 'REFLEXOLOGY', 20, 'Reflexologia e coerente com terapias integrativas.'),
      ('terapias-integrativas', 'AROMATHERAPY', 30, 'Aromaterapia e coerente com terapias integrativas.'),

      ('centro-de-bem-estar', 'RELAXING_MASSAGE', 10, 'Massagem de bem-estar e coerente com centro de bem-estar.'),
      ('centro-de-bem-estar', 'THERAPEUTIC_MASSAGE_NON_CLINICAL', 20, 'Massagem terapeutica nao clinica e coerente com centro de bem-estar.'),
      ('centro-de-bem-estar', 'SPA_RITUAL', 30, 'Ritual de spa e coerente com centro de bem-estar.'),
      ('centro-de-bem-estar', 'SHAPING_MASSAGE', 40, 'Estetica corporal pode compor centro de bem-estar.'),
      ('centro-de-bem-estar', 'LYMPHATIC_DRAINAGE', 50, 'Drenagem linfatica pode compor centro de bem-estar.'),
      ('centro-de-bem-estar', 'BODY_TREATMENT', 60, 'Tratamento corporal pode compor centro de bem-estar.'),
      ('centro-de-bem-estar', 'BODY_SPA', 70, 'Spa corporal pode compor centro de bem-estar.'),
      ('centro-de-bem-estar', 'SKIN_CLEANSING', 80, 'Estetica facial pode compor centro de bem-estar.'),
      ('centro-de-bem-estar', 'FACIAL_HYDRATION', 90, 'Estetica facial pode compor centro de bem-estar.'),
      ('centro-de-bem-estar', 'AROMATHERAPY', 100, 'Aromaterapia e coerente com centro de bem-estar.'),
      ('centro-de-bem-estar', 'REFLEXOLOGY', 110, 'Reflexologia e coerente com centro de bem-estar.'),
      ('centro-de-bem-estar', 'REIKI', 120, 'Reiki pode compor centro de bem-estar.'),
      ('centro-de-bem-estar', 'PILATES_CLASS', 130, 'Pilates pode compor centro de bem-estar hibrido.'),
      ('centro-de-bem-estar', 'PHYSIOTHERAPY_ASSESSMENT', 140, 'Fisioterapia pode compor centro de bem-estar hibrido.'),
      ('centro-de-bem-estar', 'PHYSIOTHERAPY_SESSION', 150, 'Fisioterapia pode compor centro de bem-estar hibrido.'),
      ('centro-de-bem-estar', 'WAXING', 160, 'Depilacao pode compor centro de bem-estar.'),

      ('profissional-autonomo-multisservicos', 'HAIR_CUT', 10, 'Autonomo multisservicos pode oferecer carteira ampla.'),
      ('profissional-autonomo-multisservicos', 'BRUSHING', 20, 'Autonomo multisservicos pode oferecer carteira ampla.'),
      ('profissional-autonomo-multisservicos', 'HAIR_COLORING', 30, 'Autonomo multisservicos pode oferecer carteira ampla.'),
      ('profissional-autonomo-multisservicos', 'HAIR_HYDRATION', 40, 'Autonomo multisservicos pode oferecer carteira ampla.'),
      ('profissional-autonomo-multisservicos', 'MANICURE', 50, 'Autonomo multisservicos pode oferecer carteira ampla.'),
      ('profissional-autonomo-multisservicos', 'PEDICURE', 60, 'Autonomo multisservicos pode oferecer carteira ampla.'),
      ('profissional-autonomo-multisservicos', 'GEL_POLISH', 70, 'Autonomo multisservicos pode oferecer carteira ampla.'),
      ('profissional-autonomo-multisservicos', 'NAIL_EXTENSION', 80, 'Autonomo multisservicos pode oferecer carteira ampla.'),
      ('profissional-autonomo-multisservicos', 'NAIL_EXTENSION_MAINTENANCE', 90, 'Autonomo multisservicos pode oferecer carteira ampla.'),
      ('profissional-autonomo-multisservicos', 'NAIL_EXTENSION_REMOVAL', 100, 'Autonomo multisservicos pode oferecer carteira ampla.'),
      ('profissional-autonomo-multisservicos', 'BROW_DESIGN', 110, 'Autonomo multisservicos pode oferecer carteira ampla.'),
      ('profissional-autonomo-multisservicos', 'BROW_LAMINATION', 120, 'Autonomo multisservicos pode oferecer carteira ampla.'),
      ('profissional-autonomo-multisservicos', 'BROW_MICROPIGMENTATION', 130, 'Autonomo multisservicos pode oferecer carteira ampla.'),
      ('profissional-autonomo-multisservicos', 'LASH_EXTENSION', 140, 'Autonomo multisservicos pode oferecer carteira ampla.'),
      ('profissional-autonomo-multisservicos', 'LASH_LIFTING', 150, 'Autonomo multisservicos pode oferecer carteira ampla.'),
      ('profissional-autonomo-multisservicos', 'LASH_MAINTENANCE', 160, 'Autonomo multisservicos pode oferecer carteira ampla.'),
      ('profissional-autonomo-multisservicos', 'MAKEUP', 170, 'Autonomo multisservicos pode oferecer carteira ampla.'),
      ('profissional-autonomo-multisservicos', 'SOCIAL_MAKEUP', 180, 'Autonomo multisservicos pode oferecer carteira ampla.'),
      ('profissional-autonomo-multisservicos', 'EVENT_HAIRSTYLE', 190, 'Autonomo multisservicos pode oferecer carteira ampla.'),
      ('profissional-autonomo-multisservicos', 'WAXING', 200, 'Autonomo multisservicos pode oferecer carteira ampla.'),
      ('profissional-autonomo-multisservicos', 'FACIAL_WAXING', 210, 'Autonomo multisservicos pode oferecer carteira ampla.'),
      ('profissional-autonomo-multisservicos', 'SKIN_CLEANSING', 220, 'Autonomo multisservicos pode oferecer carteira ampla.'),
      ('profissional-autonomo-multisservicos', 'FACIAL_HYDRATION', 230, 'Autonomo multisservicos pode oferecer carteira ampla.'),
      ('profissional-autonomo-multisservicos', 'RELAXING_MASSAGE', 240, 'Autonomo multisservicos pode oferecer carteira ampla.'),
      ('profissional-autonomo-multisservicos', 'THERAPEUTIC_MASSAGE_NON_CLINICAL', 250, 'Autonomo multisservicos pode oferecer carteira ampla.'),
      ('profissional-autonomo-multisservicos', 'BODY_TREATMENT', 260, 'Autonomo multisservicos pode oferecer carteira ampla.')
  ),
  resolved_official_seed as (
    select tn.id as tipo_negocio_id,
           sc.id as servico_catalogo_id,
           seed.tipo_slug,
           seed.service_code,
           seed.ordem_exibicao,
           seed.justification
    from official_applicability_seed seed
    join public.tipos_negocio tn
      on tn.slug = seed.tipo_slug
     and tn.ativo = true
    join public.servicos_catalogo sc
      on sc.codigo_canonico = seed.service_code
     and sc.ativo = true
  ),
  inserted_official_seed as (
    insert into public.tipo_negocio_servicos_catalogo (
      tipo_negocio_id,
      servico_catalogo_id,
      recomendado,
      ativo,
      ordem_exibicao
    )
    select
      r.tipo_negocio_id,
      r.servico_catalogo_id,
      false,
      true,
      r.ordem_exibicao
    from resolved_official_seed r
    on conflict (tipo_negocio_id, servico_catalogo_id) do nothing
    returning id, tipo_negocio_id, servico_catalogo_id
  )
  select count(*) into official_seed_inserted_count
  from inserted_official_seed;

  with recommended_profile_services as (
    select distinct
      p.tipo_negocio_id,
      pos.servico_catalogo_id
    from public.tipo_negocio_perfis_operacionais p
    join public.perfil_operacional_servicos pos
      on pos.perfil_operacional_id = p.id
     and pos.recomendado = true
     and pos.ativo = true
     and pos.deleted_at is null
    join public.tipos_negocio tn
      on tn.id = p.tipo_negocio_id
     and tn.ativo = true
    join public.servicos_catalogo sc
      on sc.id = pos.servico_catalogo_id
     and sc.ativo = true
    where p.ativo = true
      and p.deleted_at is null
      and tn.slug <> 'outro'
  ),
  inserted_profile_evidence as (
    insert into public.tipo_negocio_servicos_catalogo (
      tipo_negocio_id,
      servico_catalogo_id,
      recomendado,
      ativo,
      ordem_exibicao
    )
    select
      rps.tipo_negocio_id,
      rps.servico_catalogo_id,
      false,
      true,
      900
    from recommended_profile_services rps
    on conflict (tipo_negocio_id, servico_catalogo_id) do nothing
    returning id, tipo_negocio_id, servico_catalogo_id
  )
  select count(*) into profile_evidence_inserted_count
  from inserted_profile_evidence;

  select count(*) into missing_profile_recommendations
  from public.tipo_negocio_perfis_operacionais p
  join public.perfil_operacional_servicos pos
    on pos.perfil_operacional_id = p.id
   and pos.recomendado = true
   and pos.ativo = true
   and pos.deleted_at is null
  join public.tipos_negocio tn
    on tn.id = p.tipo_negocio_id
   and tn.ativo = true
  where p.ativo = true
    and p.deleted_at is null
    and not exists (
      select 1
      from public.tipo_negocio_servicos_catalogo tns
      where tns.tipo_negocio_id = p.tipo_negocio_id
        and tns.servico_catalogo_id = pos.servico_catalogo_id
        and tns.ativo = true
    );

  if missing_profile_recommendations > 0 then
    raise exception 'Taxonomy V2 applicability inconsistency: % recommended profile service(s) are outside active business type applicability matrix',
      missing_profile_recommendations;
  end if;

  select count(*) into active_relation_count_after
  from public.tipo_negocio_servicos_catalogo
  where ativo = true;

  insert into public.taxonomy_audit_log (
    taxonomy_version_id,
    entidade_tipo,
    acao,
    valor_posterior,
    origem,
    metadata
  )
  select
    tv.id,
    'tipo_negocio_servicos_catalogo',
    'preconfigure_business_type_service_applicability',
    jsonb_build_object(
      'active_type_count_before', active_type_count_before,
      'active_catalog_count_before', active_catalog_count_before,
      'active_relation_count_before', active_relation_count_before,
      'official_seed_inserted_count', official_seed_inserted_count,
      'profile_evidence_inserted_count', profile_evidence_inserted_count,
      'active_relation_count_after', active_relation_count_after
    ),
    'taxonomy_v2_business_type_service_applicability_preconfiguration',
    jsonb_build_object(
      'taxonomy_version', '2.3.0',
      'scope', 'global_applicability_matrix',
      'masteradmin_manual_governance_preserved', true,
      'automatic_resync_created', false,
      'tenant_tables_changed', 0,
      'profiles_changed', 0,
      'booking_changed', 0,
      'agenda_changed', 0,
      'appointments_changed', 0
    )
  from public.taxonomy_versions tv
  where tv.version = '2.3.0';
end $$;

insert into public.taxonomy_audit_log (
  taxonomy_version_id,
  entidade_tipo,
  acao,
  valor_posterior,
  origem,
  metadata
)
select
  tv.id,
  'taxonomy_versions',
  'activate_version',
  jsonb_build_object('version', tv.version, 'status', tv.status),
  'taxonomy_v2_business_type_service_applicability_preconfiguration',
  jsonb_build_object(
    'scope', 'business_type_service_applicability_preconfiguration',
    'tipo_negocio_servicos_catalogo_semantics', 'applicability',
    'perfil_operacional_servicos_semantics', 'recommendation',
    'legacy_tipo_negocio_recomendado_used_as_rule', false,
    'tenants_changed', 0,
    'booking_changed', 0,
    'agenda_changed', 0,
    'appointments_changed', 0
  )
from public.taxonomy_versions tv
where tv.version = '2.3.0'
  and not exists (
    select 1
    from public.taxonomy_audit_log log
    where log.taxonomy_version_id = tv.id
      and log.entidade_tipo = 'taxonomy_versions'
      and log.acao = 'activate_version'
      and log.origem = 'taxonomy_v2_business_type_service_applicability_preconfiguration'
  );

-- Optional baseline/audit query for remote review before/after applying:
--
-- select
--   tn.nome as tipo,
--   count(tns.id) filter (where tns.ativo = true) as aplicaveis,
--   count(sc.id) filter (where tns.id is null or tns.ativo = false) as nao_aplicaveis
-- from public.tipos_negocio tn
-- cross join public.servicos_catalogo sc
-- left join public.tipo_negocio_servicos_catalogo tns
--   on tns.tipo_negocio_id = tn.id
--  and tns.servico_catalogo_id = sc.id
-- where tn.ativo = true
--   and sc.ativo = true
-- group by tn.nome
-- order by tn.nome;
