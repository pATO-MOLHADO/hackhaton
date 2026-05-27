-- Minimal seed for manual tests
-- Requires at least one user in auth.users

DO $$
DECLARE
  v_user_id uuid;
  v_patient_id uuid;
  v_exam_id uuid;
  v_result_id uuid;
  v_session_id uuid;
BEGIN
  SELECT id INTO v_user_id
  FROM auth.users
  ORDER BY created_at
  LIMIT 1;

  IF v_user_id IS NULL THEN
    RAISE NOTICE 'No users in auth.users. Create an auth user first.';
    RETURN;
  END IF;

  INSERT INTO public.medical_patients (owner_user_id, full_name, birth_date, sex, default_conditions)
  VALUES (v_user_id, 'Paciente Seed', '1988-03-10', 'nao_informado', 'hipertensao')
  ON CONFLICT (owner_user_id, full_name) DO UPDATE
  SET updated_at = now()
  RETURNING id INTO v_patient_id;

  INSERT INTO public.clinical_exams (
    owner_user_id, patient_id, source_type, raw_text, patient_age_at_exam, conditions_snapshot, exam_datetime
  )
  VALUES (
    v_user_id,
    v_patient_id,
    'texto',
    'Leucocitos: 14500; Glicemia: 126 mg/dL',
    38,
    'hipertensao',
    now()
  )
  RETURNING id INTO v_exam_id;

  INSERT INTO public.exam_analysis_results (
    owner_user_id, exam_id, analysis_provider, analysis_model, summary, recommendations, attention_level
  )
  VALUES (
    v_user_id,
    v_exam_id,
    'deepseek',
    'deepseek-chat',
    'Exame com alteracoes que requerem revisao.',
    'Repetir glicemia e avaliar contexto clinico.',
    'atencao'
  )
  RETURNING id INTO v_result_id;

  INSERT INTO public.exam_analysis_markers (owner_user_id, analysis_result_id, marker_label, marker_value, severity)
  VALUES
    (v_user_id, v_result_id, 'Leucocitos', '14500 /uL', 'alto'),
    (v_user_id, v_result_id, 'Glicemia', '126 mg/dL', 'alto');

  INSERT INTO public.exam_chat_sessions (owner_user_id, exam_id, title)
  VALUES (v_user_id, v_exam_id, 'Chat Seed')
  RETURNING id INTO v_session_id;

  INSERT INTO public.exam_chat_messages (owner_user_id, session_id, role, content)
  VALUES
    (v_user_id, v_session_id, 'doctor', 'Isso e grave?'),
    (v_user_id, v_session_id, 'ai', 'Ha sinais de atencao, recomenda-se avaliacao medica.');

  RAISE NOTICE 'Seed done for user %', v_user_id;
END
$$;
