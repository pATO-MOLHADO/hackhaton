-- AIDoc V2 Schema (MVP-friendly, scalable)
-- Run this first.

begin;

create extension if not exists pgcrypto;

-- Enums
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'attention_level') THEN
    CREATE TYPE public.attention_level AS ENUM ('normal', 'atencao', 'critico');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'exam_source_type') THEN
    CREATE TYPE public.exam_source_type AS ENUM ('texto', 'arquivo');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'chat_message_role') THEN
    CREATE TYPE public.chat_message_role AS ENUM ('doctor', 'ai', 'system');
  END IF;
END
$$;

-- Generic updated_at trigger
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- Patients (owned by doctor/auth user)
create table if not exists public.medical_patients (
  id uuid primary key default gen_random_uuid(),
  owner_user_id uuid not null references auth.users(id) on delete cascade,
  full_name text not null check (length(trim(full_name)) >= 2),
  birth_date date,
  sex text check (sex in ('masculino', 'feminino', 'outro', 'nao_informado')),
  default_conditions text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (owner_user_id, full_name)
);

create index if not exists idx_medical_patients_owner on public.medical_patients(owner_user_id);
create index if not exists idx_medical_patients_owner_name on public.medical_patients(owner_user_id, full_name);

-- Exams (soft delete only here)
create table if not exists public.clinical_exams (
  id uuid primary key default gen_random_uuid(),
  owner_user_id uuid not null references auth.users(id) on delete cascade,
  patient_id uuid not null references public.medical_patients(id) on delete restrict,
  source_type public.exam_source_type not null default 'texto',
  source_filename text,
  source_mime_type text,
  source_storage_path text,
  raw_text text not null,
  patient_age_at_exam integer check (patient_age_at_exam between 0 and 130),
  conditions_snapshot text,
  exam_datetime timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  legacy_exam_analysis_id uuid unique
);

create index if not exists idx_clinical_exams_owner_recent
  on public.clinical_exams(owner_user_id, created_at desc)
  where deleted_at is null;

create index if not exists idx_clinical_exams_patient_recent
  on public.clinical_exams(patient_id, exam_datetime desc)
  where deleted_at is null;

create index if not exists idx_clinical_exams_legacy
  on public.clinical_exams(legacy_exam_analysis_id)
  where legacy_exam_analysis_id is not null;

-- Analysis result per exam
create table if not exists public.exam_analysis_results (
  id uuid primary key default gen_random_uuid(),
  owner_user_id uuid not null references auth.users(id) on delete cascade,
  exam_id uuid not null unique references public.clinical_exams(id) on delete cascade,
  analysis_provider text not null default 'deepseek',
  analysis_model text,
  summary text not null,
  recommendations text not null,
  attention_level public.attention_level not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_exam_analysis_results_owner_recent
  on public.exam_analysis_results(owner_user_id, created_at desc);

create index if not exists idx_exam_analysis_results_owner_attention
  on public.exam_analysis_results(owner_user_id, attention_level, created_at desc);

-- Altered markers (1:N)
create table if not exists public.exam_analysis_markers (
  id uuid primary key default gen_random_uuid(),
  owner_user_id uuid not null references auth.users(id) on delete cascade,
  analysis_result_id uuid not null references public.exam_analysis_results(id) on delete cascade,
  marker_label text not null,
  marker_value text,
  reference_range text,
  severity text check (severity in ('baixo', 'alto', 'critico', 'indefinido')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_exam_analysis_markers_result
  on public.exam_analysis_markers(analysis_result_id);

create index if not exists idx_exam_analysis_markers_owner
  on public.exam_analysis_markers(owner_user_id, created_at desc);

-- Chat session per exam (contextual chat)
create table if not exists public.exam_chat_sessions (
  id uuid primary key default gen_random_uuid(),
  owner_user_id uuid not null references auth.users(id) on delete cascade,
  exam_id uuid not null references public.clinical_exams(id) on delete cascade,
  title text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_exam_chat_sessions_owner_recent
  on public.exam_chat_sessions(owner_user_id, created_at desc);

create index if not exists idx_exam_chat_sessions_exam
  on public.exam_chat_sessions(exam_id, created_at desc);

-- Chat messages
create table if not exists public.exam_chat_messages (
  id uuid primary key default gen_random_uuid(),
  owner_user_id uuid not null references auth.users(id) on delete cascade,
  session_id uuid not null references public.exam_chat_sessions(id) on delete cascade,
  role public.chat_message_role not null,
  content text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_exam_chat_messages_session_time
  on public.exam_chat_messages(session_id, created_at asc);

create index if not exists idx_exam_chat_messages_owner_recent
  on public.exam_chat_messages(owner_user_id, created_at desc);

-- Ensure legacy FK only if legacy table exists
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_name = 'exam_analyses'
  ) THEN
    IF NOT EXISTS (
      SELECT 1
      FROM pg_constraint
      WHERE conname = 'fk_clinical_exams_legacy_exam_analyses'
    ) THEN
      ALTER TABLE public.clinical_exams
        ADD CONSTRAINT fk_clinical_exams_legacy_exam_analyses
        FOREIGN KEY (legacy_exam_analysis_id)
        REFERENCES public.exam_analyses(id)
        ON DELETE SET NULL;
    END IF;
  END IF;
END
$$;

-- updated_at triggers
DROP TRIGGER IF EXISTS trg_medical_patients_updated_at ON public.medical_patients;
CREATE TRIGGER trg_medical_patients_updated_at
BEFORE UPDATE ON public.medical_patients
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS trg_clinical_exams_updated_at ON public.clinical_exams;
CREATE TRIGGER trg_clinical_exams_updated_at
BEFORE UPDATE ON public.clinical_exams
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS trg_exam_analysis_results_updated_at ON public.exam_analysis_results;
CREATE TRIGGER trg_exam_analysis_results_updated_at
BEFORE UPDATE ON public.exam_analysis_results
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS trg_exam_analysis_markers_updated_at ON public.exam_analysis_markers;
CREATE TRIGGER trg_exam_analysis_markers_updated_at
BEFORE UPDATE ON public.exam_analysis_markers
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS trg_exam_chat_sessions_updated_at ON public.exam_chat_sessions;
CREATE TRIGGER trg_exam_chat_sessions_updated_at
BEFORE UPDATE ON public.exam_chat_sessions
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS trg_exam_chat_messages_updated_at ON public.exam_chat_messages;
CREATE TRIGGER trg_exam_chat_messages_updated_at
BEFORE UPDATE ON public.exam_chat_messages
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

commit;
