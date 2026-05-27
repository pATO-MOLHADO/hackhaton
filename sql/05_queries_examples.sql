-- 10 real queries aligned with current/future endpoints
-- Supabase SQL Editor compatible (no :placeholders)

-- Q1) /exames/recentes (normalized)
select
  ce.id as exam_id,
  ce.created_at,
  mp.full_name as nome_paciente,
  ear.summary as resumo,
  ear.attention_level as nivel_atencao
from public.clinical_exams ce
join public.medical_patients mp on mp.id = ce.patient_id
join public.exam_analysis_results ear on ear.exam_id = ce.id
where ce.owner_user_id = auth.uid()
  and ce.deleted_at is null
order by ce.created_at desc
limit 10;

-- Q2) /exames/recentes with attention filter
select
  ce.id,
  ce.created_at,
  mp.full_name,
  ear.attention_level
from public.clinical_exams ce
join public.medical_patients mp on mp.id = ce.patient_id
join public.exam_analysis_results ear on ear.exam_id = ce.id
where ce.owner_user_id = auth.uid()
  and ce.deleted_at is null
  and ear.attention_level = 'critico'
order by ce.created_at desc
limit 20;

-- Q3) Patient history (timeline) - latest patient from current user
with params as (
  select id as patient_id
  from public.medical_patients
  where owner_user_id = auth.uid()
  order by created_at desc
  limit 1
)
select
  ce.id as exam_id,
  ce.exam_datetime,
  ce.raw_text,
  ear.summary,
  ear.recommendations,
  ear.attention_level
from public.clinical_exams ce
join public.exam_analysis_results ear on ear.exam_id = ce.id
where ce.owner_user_id = auth.uid()
  and ce.patient_id = (select patient_id from params)
  and ce.deleted_at is null
order by ce.exam_datetime desc;

-- Q4) Marker details for a specific exam - latest exam from current user
with params as (
  select ce.id as exam_id
  from public.clinical_exams ce
  where ce.owner_user_id = auth.uid()
    and ce.deleted_at is null
  order by ce.created_at desc
  limit 1
)
select
  eam.marker_label,
  eam.marker_value,
  eam.reference_range,
  eam.severity
from public.exam_analysis_markers eam
join public.exam_analysis_results ear on ear.id = eam.analysis_result_id
join public.clinical_exams ce on ce.id = ear.exam_id
where ce.owner_user_id = auth.uid()
  and ce.id = (select exam_id from params)
order by eam.created_at asc;

-- Q5) Dashboard counters by attention level (last 30 days)
select
  ear.attention_level,
  count(*) as total
from public.exam_analysis_results ear
join public.clinical_exams ce on ce.id = ear.exam_id
where ear.owner_user_id = auth.uid()
  and ce.deleted_at is null
  and ce.created_at >= now() - interval '30 days'
group by ear.attention_level;

-- Q6) Soft delete an exam - latest exam from current user
with params as (
  select ce.id as exam_id
  from public.clinical_exams ce
  where ce.owner_user_id = auth.uid()
    and ce.deleted_at is null
  order by ce.created_at desc
  limit 1
)
update public.clinical_exams ce
set deleted_at = now(), updated_at = now()
from params
where ce.id = params.exam_id
  and ce.owner_user_id = auth.uid();

-- Q7) Create chat session for latest exam
with params as (
  select ce.id as exam_id
  from public.clinical_exams ce
  where ce.owner_user_id = auth.uid()
  order by ce.created_at desc
  limit 1
)
insert into public.exam_chat_sessions (owner_user_id, exam_id, title)
select auth.uid(), params.exam_id, 'Sessao criada via query examples'
from params
returning id;

-- Q8) Add doctor question to latest session
with params as (
  select ecs.id as session_id
  from public.exam_chat_sessions ecs
  where ecs.owner_user_id = auth.uid()
  order by ecs.created_at desc
  limit 1
)
insert into public.exam_chat_messages (owner_user_id, session_id, role, content)
select auth.uid(), params.session_id, 'doctor', 'isso e grave?'
from params
returning id, created_at;

-- Q9) Add DeepSeek response to latest session
with params as (
  select ecs.id as session_id
  from public.exam_chat_sessions ecs
  where ecs.owner_user_id = auth.uid()
  order by ecs.created_at desc
  limit 1
)
insert into public.exam_chat_messages (owner_user_id, session_id, role, content)
select auth.uid(), params.session_id, 'ai', 'Resposta simulada da DeepSeek.'
from params
returning id, created_at;

-- Q10) Get full chat context by latest exam
with params as (
  select ce.id as exam_id
  from public.clinical_exams ce
  where ce.owner_user_id = auth.uid()
  order by ce.created_at desc
  limit 1
)
select
  ecs.id as session_id,
  ecm.role,
  ecm.content,
  ecm.created_at
from public.exam_chat_sessions ecs
join public.exam_chat_messages ecm on ecm.session_id = ecs.id
join public.clinical_exams ce on ce.id = ecs.exam_id
where ecs.owner_user_id = auth.uid()
  and ce.id = (select exam_id from params)
order by ecm.created_at asc;
