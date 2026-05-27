# Sprints - AIDoc Backend

## Sprint 1 - Login e seguranca
- Supabase Auth com endpoints:
  - POST /auth/signup
  - POST /auth/login
  - GET /auth/me
- Protecao bearer token para endpoints clinicos.
- Flag AUTH_REQUIRED para demo sem token quando necessario.

## Sprint 2 - Camada de IA desacoplada
- Interface unica `chamar_ia(task, payload)`.
- Provider `mock` pronto para demo.
- Provider `custom_http` reservado para futura API oficial sem refatorar rotas.

## Sprint 3 - Persistencia por usuario e historico
- `exam_analyses` com `user_id` ligado ao `auth.users`.
- Endpoint GET /exames/recentes.
- RLS por usuario + politica service role.
