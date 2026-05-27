-- AIDoc V2 RLS policies
-- Run after 01_v2_schema.sql

begin;

alter table public.medical_patients enable row level security;
alter table public.clinical_exams enable row level security;
alter table public.exam_analysis_results enable row level security;
alter table public.exam_analysis_markers enable row level security;
alter table public.exam_chat_sessions enable row level security;
alter table public.exam_chat_messages enable row level security;

-- medical_patients
DROP POLICY IF EXISTS p_medical_patients_select_own ON public.medical_patients;
CREATE POLICY p_medical_patients_select_own
ON public.medical_patients
FOR SELECT
TO authenticated
USING (owner_user_id = auth.uid());

DROP POLICY IF EXISTS p_medical_patients_insert_own ON public.medical_patients;
CREATE POLICY p_medical_patients_insert_own
ON public.medical_patients
FOR INSERT
TO authenticated
WITH CHECK (owner_user_id = auth.uid());

DROP POLICY IF EXISTS p_medical_patients_update_own ON public.medical_patients;
CREATE POLICY p_medical_patients_update_own
ON public.medical_patients
FOR UPDATE
TO authenticated
USING (owner_user_id = auth.uid())
WITH CHECK (owner_user_id = auth.uid());

DROP POLICY IF EXISTS p_medical_patients_delete_own ON public.medical_patients;
CREATE POLICY p_medical_patients_delete_own
ON public.medical_patients
FOR DELETE
TO authenticated
USING (owner_user_id = auth.uid());

-- clinical_exams
DROP POLICY IF EXISTS p_clinical_exams_select_own ON public.clinical_exams;
CREATE POLICY p_clinical_exams_select_own
ON public.clinical_exams
FOR SELECT
TO authenticated
USING (owner_user_id = auth.uid() AND deleted_at IS NULL);

DROP POLICY IF EXISTS p_clinical_exams_insert_own ON public.clinical_exams;
CREATE POLICY p_clinical_exams_insert_own
ON public.clinical_exams
FOR INSERT
TO authenticated
WITH CHECK (owner_user_id = auth.uid());

DROP POLICY IF EXISTS p_clinical_exams_update_own ON public.clinical_exams;
CREATE POLICY p_clinical_exams_update_own
ON public.clinical_exams
FOR UPDATE
TO authenticated
USING (owner_user_id = auth.uid())
WITH CHECK (owner_user_id = auth.uid());

-- no DELETE policy for authenticated: soft delete by setting deleted_at

-- exam_analysis_results
DROP POLICY IF EXISTS p_exam_analysis_results_select_own ON public.exam_analysis_results;
CREATE POLICY p_exam_analysis_results_select_own
ON public.exam_analysis_results
FOR SELECT
TO authenticated
USING (owner_user_id = auth.uid());

DROP POLICY IF EXISTS p_exam_analysis_results_insert_own ON public.exam_analysis_results;
CREATE POLICY p_exam_analysis_results_insert_own
ON public.exam_analysis_results
FOR INSERT
TO authenticated
WITH CHECK (owner_user_id = auth.uid());

DROP POLICY IF EXISTS p_exam_analysis_results_update_own ON public.exam_analysis_results;
CREATE POLICY p_exam_analysis_results_update_own
ON public.exam_analysis_results
FOR UPDATE
TO authenticated
USING (owner_user_id = auth.uid())
WITH CHECK (owner_user_id = auth.uid());

DROP POLICY IF EXISTS p_exam_analysis_results_delete_own ON public.exam_analysis_results;
CREATE POLICY p_exam_analysis_results_delete_own
ON public.exam_analysis_results
FOR DELETE
TO authenticated
USING (owner_user_id = auth.uid());

-- exam_analysis_markers
DROP POLICY IF EXISTS p_exam_analysis_markers_select_own ON public.exam_analysis_markers;
CREATE POLICY p_exam_analysis_markers_select_own
ON public.exam_analysis_markers
FOR SELECT
TO authenticated
USING (owner_user_id = auth.uid());

DROP POLICY IF EXISTS p_exam_analysis_markers_insert_own ON public.exam_analysis_markers;
CREATE POLICY p_exam_analysis_markers_insert_own
ON public.exam_analysis_markers
FOR INSERT
TO authenticated
WITH CHECK (owner_user_id = auth.uid());

DROP POLICY IF EXISTS p_exam_analysis_markers_update_own ON public.exam_analysis_markers;
CREATE POLICY p_exam_analysis_markers_update_own
ON public.exam_analysis_markers
FOR UPDATE
TO authenticated
USING (owner_user_id = auth.uid())
WITH CHECK (owner_user_id = auth.uid());

DROP POLICY IF EXISTS p_exam_analysis_markers_delete_own ON public.exam_analysis_markers;
CREATE POLICY p_exam_analysis_markers_delete_own
ON public.exam_analysis_markers
FOR DELETE
TO authenticated
USING (owner_user_id = auth.uid());

-- exam_chat_sessions
DROP POLICY IF EXISTS p_exam_chat_sessions_select_own ON public.exam_chat_sessions;
CREATE POLICY p_exam_chat_sessions_select_own
ON public.exam_chat_sessions
FOR SELECT
TO authenticated
USING (owner_user_id = auth.uid());

DROP POLICY IF EXISTS p_exam_chat_sessions_insert_own ON public.exam_chat_sessions;
CREATE POLICY p_exam_chat_sessions_insert_own
ON public.exam_chat_sessions
FOR INSERT
TO authenticated
WITH CHECK (owner_user_id = auth.uid());

DROP POLICY IF EXISTS p_exam_chat_sessions_update_own ON public.exam_chat_sessions;
CREATE POLICY p_exam_chat_sessions_update_own
ON public.exam_chat_sessions
FOR UPDATE
TO authenticated
USING (owner_user_id = auth.uid())
WITH CHECK (owner_user_id = auth.uid());

DROP POLICY IF EXISTS p_exam_chat_sessions_delete_own ON public.exam_chat_sessions;
CREATE POLICY p_exam_chat_sessions_delete_own
ON public.exam_chat_sessions
FOR DELETE
TO authenticated
USING (owner_user_id = auth.uid());

-- exam_chat_messages
DROP POLICY IF EXISTS p_exam_chat_messages_select_own ON public.exam_chat_messages;
CREATE POLICY p_exam_chat_messages_select_own
ON public.exam_chat_messages
FOR SELECT
TO authenticated
USING (owner_user_id = auth.uid());

DROP POLICY IF EXISTS p_exam_chat_messages_insert_own ON public.exam_chat_messages;
CREATE POLICY p_exam_chat_messages_insert_own
ON public.exam_chat_messages
FOR INSERT
TO authenticated
WITH CHECK (owner_user_id = auth.uid());

DROP POLICY IF EXISTS p_exam_chat_messages_update_own ON public.exam_chat_messages;
CREATE POLICY p_exam_chat_messages_update_own
ON public.exam_chat_messages
FOR UPDATE
TO authenticated
USING (owner_user_id = auth.uid())
WITH CHECK (owner_user_id = auth.uid());

DROP POLICY IF EXISTS p_exam_chat_messages_delete_own ON public.exam_chat_messages;
CREATE POLICY p_exam_chat_messages_delete_own
ON public.exam_chat_messages
FOR DELETE
TO authenticated
USING (owner_user_id = auth.uid());

-- Keep legacy table secure for current backend compatibility
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_name = 'exam_analyses'
  ) THEN
    ALTER TABLE public.exam_analyses ENABLE ROW LEVEL SECURITY;

    DROP POLICY IF EXISTS users_select_own_analyses ON public.exam_analyses;
    CREATE POLICY users_select_own_analyses
    ON public.exam_analyses
    FOR SELECT
    TO authenticated
    USING (user_id = auth.uid());

    DROP POLICY IF EXISTS users_insert_own_analyses ON public.exam_analyses;
    CREATE POLICY users_insert_own_analyses
    ON public.exam_analyses
    FOR INSERT
    TO authenticated
    WITH CHECK (user_id = auth.uid());
  END IF;
END
$$;

commit;
