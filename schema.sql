create extension if not exists pgcrypto;

create table if not exists public.exam_analyses (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  user_id uuid not null references auth.users(id) on delete cascade,
  nome_paciente text not null,
  idade integer,
  condicoes text,
  texto text not null,
  resumo text not null,
  valores_alterados text[] not null default '{}',
  recomendacoes text not null,
  nivel_atencao text not null check (nivel_atencao in ('normal','atencao','critico'))
);

create index if not exists idx_exam_analyses_user_created_at
  on public.exam_analyses (user_id, created_at desc);

alter table public.exam_analyses enable row level security;

create policy if not exists "users_select_own_analyses"
on public.exam_analyses
for select
to authenticated
using (auth.uid() = user_id);

create policy if not exists "users_insert_own_analyses"
on public.exam_analyses
for insert
to authenticated
with check (auth.uid() = user_id);

create policy if not exists "service_role_full_access_exam_analyses"
on public.exam_analyses
for all
using (auth.role() = 'service_role')
with check (auth.role() = 'service_role');
