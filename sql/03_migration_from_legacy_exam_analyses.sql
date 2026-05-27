-- AIDoc migration from legacy public.exam_analyses to V2 domain tables
-- Run after 01 and 02.
-- Safe to run even when legacy table does not exist.

begin;

DO $$
DECLARE
  has_legacy boolean;
BEGIN
  SELECT EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_name = 'exam_analyses'
  ) INTO has_legacy;

  IF NOT has_legacy THEN
    RAISE NOTICE 'Legacy table public.exam_analyses not found. Skipping backfill section.';
    RETURN;
  END IF;

  -- 1) Backfill patients (one per doctor + patient name)
  insert into public.medical_patients (
    owner_user_id,
    full_name,
    default_conditions,
    created_at,
    updated_at
  )
  select
    ea.user_id,
    trim(ea.nome_paciente) as full_name,
    nullif(trim(ea.condicoes), '') as default_conditions,
    min(ea.created_at) as created_at,
    now() as updated_at
  from public.exam_analyses ea
  where ea.user_id is not null
    and ea.nome_paciente is not null
    and trim(ea.nome_paciente) <> ''
  group by ea.user_id, trim(ea.nome_paciente), nullif(trim(ea.condicoes), '')
  on conflict (owner_user_id, full_name) do update
  set
    default_conditions = coalesce(excluded.default_conditions, public.medical_patients.default_conditions),
    updated_at = now();

  -- 2) Backfill exams
  insert into public.clinical_exams (
    owner_user_id,
    patient_id,
    source_type,
    raw_text,
    patient_age_at_exam,
    conditions_snapshot,
    exam_datetime,
    created_at,
    updated_at,
    legacy_exam_analysis_id
  )
  select
    ea.user_id as owner_user_id,
    mp.id as patient_id,
    'texto'::public.exam_source_type as source_type,
    ea.texto as raw_text,
    case
      when ea.idade::text ~ '^[0-9]+$' then ea.idade::integer
      else null
    end as patient_age_at_exam,
    ea.condicoes as conditions_snapshot,
    ea.created_at as exam_datetime,
    ea.created_at as created_at,
    now() as updated_at,
    ea.id as legacy_exam_analysis_id
  from public.exam_analyses ea
  join public.medical_patients mp
    on mp.owner_user_id = ea.user_id
   and mp.full_name = trim(ea.nome_paciente)
  where ea.user_id is not null
  on conflict (legacy_exam_analysis_id) do nothing;

  -- 3) Backfill analysis results
  insert into public.exam_analysis_results (
    owner_user_id,
    exam_id,
    analysis_provider,
    analysis_model,
    summary,
    recommendations,
    attention_level,
    created_at,
    updated_at
  )
  select
    ce.owner_user_id,
    ce.id as exam_id,
    'deepseek' as analysis_provider,
    null as analysis_model,
    ea.resumo as summary,
    ea.recomendacoes as recommendations,
    ea.nivel_atencao::public.attention_level as attention_level,
    ea.created_at,
    now()
  from public.exam_analyses ea
  join public.clinical_exams ce
    on ce.legacy_exam_analysis_id = ea.id
  on conflict (exam_id) do update
  set
    summary = excluded.summary,
    recommendations = excluded.recommendations,
    attention_level = excluded.attention_level,
    updated_at = now();

  -- 4) Backfill markers
  insert into public.exam_analysis_markers (
    owner_user_id,
    analysis_result_id,
    marker_label,
    marker_value,
    created_at,
    updated_at
  )
  select
    ear.owner_user_id,
    ear.id as analysis_result_id,
    trim(split_part(marker, ':', 1)) as marker_label,
    nullif(trim(split_part(marker, ':', 2)), '') as marker_value,
    ear.created_at,
    now()
  from public.exam_analyses ea
  join public.clinical_exams ce
    on ce.legacy_exam_analysis_id = ea.id
  join public.exam_analysis_results ear
    on ear.exam_id = ce.id
  cross join lateral unnest(coalesce(ea.valores_alterados, array[]::text[])) as marker
  on conflict do nothing;
END
$$;

-- 5) Sync trigger for legacy insert/update (keeps current backend compatible)
create or replace function public.sync_legacy_exam_analyses_to_v2()
returns trigger
language plpgsql
as $$
declare
  v_patient_id uuid;
  v_exam_id uuid;
  v_result_id uuid;
  v_age integer;
  v_marker text;
begin
  if new.user_id is null then
    return new;
  end if;

  if new.idade is not null and new.idade::text ~ '^[0-9]+$' then
    v_age := new.idade::integer;
  else
    v_age := null;
  end if;

  insert into public.medical_patients (owner_user_id, full_name, default_conditions)
  values (new.user_id, trim(new.nome_paciente), nullif(trim(new.condicoes), ''))
  on conflict (owner_user_id, full_name) do update
  set default_conditions = coalesce(excluded.default_conditions, public.medical_patients.default_conditions),
      updated_at = now()
  returning id into v_patient_id;

  if v_patient_id is null then
    select id
      into v_patient_id
    from public.medical_patients
    where owner_user_id = new.user_id
      and full_name = trim(new.nome_paciente)
    limit 1;
  end if;

  insert into public.clinical_exams (
    owner_user_id,
    patient_id,
    source_type,
    raw_text,
    patient_age_at_exam,
    conditions_snapshot,
    exam_datetime,
    created_at,
    updated_at,
    legacy_exam_analysis_id
  )
  values (
    new.user_id,
    v_patient_id,
    'texto',
    new.texto,
    v_age,
    new.condicoes,
    new.created_at,
    new.created_at,
    now(),
    new.id
  )
  on conflict (legacy_exam_analysis_id) do update
  set raw_text = excluded.raw_text,
      patient_age_at_exam = excluded.patient_age_at_exam,
      conditions_snapshot = excluded.conditions_snapshot,
      updated_at = now()
  returning id into v_exam_id;

  if v_exam_id is null then
    select id
      into v_exam_id
    from public.clinical_exams
    where legacy_exam_analysis_id = new.id
    limit 1;
  end if;

  insert into public.exam_analysis_results (
    owner_user_id,
    exam_id,
    analysis_provider,
    analysis_model,
    summary,
    recommendations,
    attention_level,
    created_at,
    updated_at
  )
  values (
    new.user_id,
    v_exam_id,
    'deepseek',
    null,
    new.resumo,
    new.recomendacoes,
    new.nivel_atencao::public.attention_level,
    new.created_at,
    now()
  )
  on conflict (exam_id) do update
  set summary = excluded.summary,
      recommendations = excluded.recommendations,
      attention_level = excluded.attention_level,
      updated_at = now()
  returning id into v_result_id;

  if v_result_id is null then
    select id
      into v_result_id
    from public.exam_analysis_results
    where exam_id = v_exam_id
    limit 1;
  end if;

  delete from public.exam_analysis_markers
  where analysis_result_id = v_result_id;

  foreach v_marker in array coalesce(new.valores_alterados, array[]::text[])
  loop
    insert into public.exam_analysis_markers (
      owner_user_id,
      analysis_result_id,
      marker_label,
      marker_value,
      created_at,
      updated_at
    )
    values (
      new.user_id,
      v_result_id,
      trim(split_part(v_marker, ':', 1)),
      nullif(trim(split_part(v_marker, ':', 2)), ''),
      now(),
      now()
    );
  end loop;

  return new;
end;
$$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_name = 'exam_analyses'
  ) THEN
    drop trigger if exists trg_sync_legacy_exam_analyses_to_v2 on public.exam_analyses;
    create trigger trg_sync_legacy_exam_analyses_to_v2
    after insert or update on public.exam_analyses
    for each row
    execute function public.sync_legacy_exam_analyses_to_v2();
  ELSE
    RAISE NOTICE 'Legacy table public.exam_analyses not found. Trigger was not created.';
  END IF;
END
$$;

commit;
