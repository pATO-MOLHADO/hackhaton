# 🏥 AIDoc — Backend

> API de análise clínica com IA para triagem de exames laboratoriais.  
> Construída com **FastAPI + Supabase + DeepSeek** (ou mock local).

---

## 📋 Sumário

- [Visão Geral](#visão-geral)
- [Arquitetura](#arquitetura)
- [Endpoints](#endpoints)
- [Configuração](#configuração)
- [Banco de Dados](#banco-de-dados)
- [Provedores de IA](#provedores-de-ia)
- [Rodando Localmente](#rodando-localmente)
- [Estrutura do Projeto](#estrutura-do-projeto)

---

## Visão Geral

O AIDoc Backend é o núcleo de inteligência do sistema. Ele recebe exames laboratoriais (texto ou arquivo), processa via IA e retorna:

- **Resumo clínico** gerado automaticamente
- **Valores alterados** detectados no exame
- **Nível de atenção**: `normal` · `atencao` · `critico`
- **Recomendações** médicas contextualizadas
- **Chat contextual** sobre o exame analisado

---

## Arquitetura

```
Frontend (HTML/JS)
       │
       ▼
  FastAPI (Python)
       │
       ├── Auth ──────────► Supabase Auth
       ├── Análise ────────► AI Provider (DeepSeek / Mock)
       └── Histórico ──────► Supabase Database (PostgreSQL)
```

**Stack:**
| Camada | Tecnologia |
|---|---|
| API | FastAPI 0.115 |
| Validação | Pydantic v2 |
| Servidor | Uvicorn |
| Banco | Supabase (PostgreSQL) |
| Auth | Supabase Auth (JWT) |
| IA | DeepSeek API / Mock embutido |

---

## Endpoints

### 🔐 Autenticação

| Método | Rota | Descrição |
|---|---|---|
| `POST` | `/auth/signup` | Cadastro de novo médico |
| `POST` | `/auth/login` | Login e geração de token JWT |
| `GET` | `/auth/me` | Dados do usuário autenticado |

**Signup / Login — Request:**
```json
{
  "email": "medico@hospital.com",
  "senha": "senha123",
  "nome": "Dr. Silva"
}
```

**Response:**
```json
{
  "access_token": "eyJ...",
  "refresh_token": "eyJ...",
  "token_type": "bearer",
  "email_confirmacao_pendente": false,
  "user": { "id": "uuid", "email": "...", "nome": "..." }
}
```

---

### 🧪 Análise de Exames

#### `POST /analisar-texto`
Analisa exame enviado como texto livre.

**Request:**
```json
{
  "texto": "Leucócitos: 12000 /mm³\nGlicemia: 180 mg/dL\nHemoglobina: 9.5 g/dL",
  "nome_paciente": "João Silva",
  "idade": 58,
  "condicoes": "diabetes, hipertensão"
}
```

**Response:**
```json
{
  "resumo": "Paciente com leucocitose moderada e anemia leve...",
  "valores_alterados": ["Leucócitos: 12000 /mm³", "Glicemia: 180 mg/dL"],
  "recomendacoes": "Revisar exame com contexto clínico e considerar repetição dos marcadores alterados.",
  "nivel_atencao": "atencao"
}
```

---

#### `POST /analisar`
Analisa exame via upload de arquivo (PDF ou imagem).

**Form-data:**
| Campo | Tipo | Descrição |
|---|---|---|
| `arquivo` | `file` | PDF ou imagem do exame |
| `nome_paciente` | `string` | Nome do paciente |
| `idade` | `integer` | Idade (opcional) |
| `condicoes` | `string` | Condições pré-existentes (opcional) |

---

#### `POST /chat`
Chat contextual sobre um exame já analisado.

**Request:**
```json
{
  "pergunta": "Isso é grave? O paciente precisa de internação?",
  "contexto_exame": "Paciente com leucocitose e anemia leve...",
  "historico": [
    { "role": "user", "content": "pergunta anterior" },
    { "role": "assistant", "content": "resposta anterior" }
  ]
}
```

**Response:**
```json
{
  "resposta": "Com base nos valores apresentados, há sinais de atenção que requerem avaliação presencial..."
}
```

---

#### `GET /exames/recentes`
Lista os últimos exames analisados pelo médico autenticado.

**Query params:** `?limit=10` (máx: 100)

**Response:**
```json
[
  {
    "id": "uuid",
    "created_at": "2025-01-01T10:00:00Z",
    "nome_paciente": "João Silva",
    "idade": 58,
    "condicoes": "diabetes",
    "resumo": "Paciente com...",
    "nivel_atencao": "atencao"
  }
]
```

---

#### `GET /health`
Verifica se a API está no ar.

```json
{ "status": "ok", "auth_required": true }
```

---

## Configuração

Copie o arquivo de exemplo e preencha as variáveis:

```bash
cp .env.example .env
```

**.env:**
```env
# Supabase (Settings → API no painel)
SUPABASE_URL=https://SEU_PROJECT_REF.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJ...sua_service_role_key
SUPABASE_ANON_KEY=eyJ...sua_anon_key
SUPABASE_TABLE=exam_analyses

# Autenticação (false = sem auth, útil para testes)
AUTH_REQUIRED=true

# Provedor de IA: mock | deepseek
AI_PROVIDER=mock
AI_MODEL=aidoc-mock-v1
AI_API_KEY=
AI_BASE_URL=

# Servidor
APP_HOST=0.0.0.0
APP_PORT=8000
MAX_HISTORY_ITEMS=20
```

> ⚠️ **Nunca commite o `.env`** — ele já está no `.gitignore`.

---

## Banco de Dados

Execute os scripts SQL no **Supabase SQL Editor** na ordem:

```
sql/
├── 01_v2_schema.sql          ← Cria todas as tabelas e índices
├── 02_rls_policies.sql       ← Row Level Security (isolamento por usuário)
├── 03_migration_from_legacy  ← Migração de dados legados (se aplicável)
├── 04_seed_minimal.sql       ← Dados de exemplo para testes
└── 05_queries_examples.sql   ← Consultas úteis de referência
```

**Tabelas principais:**

| Tabela | Descrição |
|---|---|
| `medical_patients` | Pacientes cadastrados |
| `clinical_exams` | Exames enviados |
| `exam_analysis_results` | Resultados da IA |
| `exam_analysis_markers` | Valores alterados detalhados |
| `exam_chat_sessions` | Sessões de chat por exame |
| `exam_chat_messages` | Mensagens do chat |

---

## Provedores de IA

### `mock` (padrão)
Sem necessidade de chave. Usa heurísticas locais para simular análise.  
Ideal para desenvolvimento e demos offline.

### `deepseek`
Integração com a [DeepSeek API](https://platform.deepseek.com).

```env
AI_PROVIDER=deepseek
AI_MODEL=deepseek-chat
AI_API_KEY=sk-...sua_chave_deepseek
AI_BASE_URL=https://api.deepseek.com
```

### `custom_http` *(extensível)*
Ponto de extensão para integrar qualquer outro provedor de IA.  
Implemente em `app/ai_provider.py` na função `_custom_http_call`.

---

## Rodando Localmente

### Pré-requisitos
- Python 3.11+
- pip

### Instalação

```bash
# 1. Clone o repositório
git clone https://github.com/pATO-MOLHADO/hackhaton.git
cd hackhaton/backend

# 2. Crie e ative o ambiente virtual
python -m venv .venv

# Windows
.venv\Scripts\activate

# Linux/macOS
source .venv/bin/activate

# 3. Instale as dependências
pip install -r requirements.txt

# 4. Configure o ambiente
cp .env.example .env
# edite o .env com suas chaves

# 5. Suba a API
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

A API estará disponível em: **http://localhost:8000**  
Documentação interativa: **http://localhost:8000/docs**

---

## Estrutura do Projeto

```
backend/
├── app/
│   ├── main.py          # Rotas FastAPI
│   ├── models.py        # Schemas Pydantic (request/response)
│   ├── analyzer.py      # Orquestração da análise
│   ├── ai_provider.py   # Provedores de IA (mock, deepseek)
│   ├── auth_service.py  # Autenticação via Supabase Auth
│   ├── db.py            # Acesso ao banco Supabase
│   ├── deps.py          # Dependências FastAPI (auth guard)
│   └── settings.py      # Configurações via .env
├── sql/                 # Scripts de banco de dados
├── .env.example         # Template de variáveis de ambiente
├── requirements.txt     # Dependências Python
└── README.md
```

---

## Autenticação nas Requisições

Após o login, inclua o token JWT no header de todas as requisições protegidas:

```http
Authorization: Bearer eyJ...seu_access_token
```

Para desabilitar auth em desenvolvimento:
```env
AUTH_REQUIRED=false
```

---

<div align="center">
  <sub>Feito com ☕ para o Hackathon IA · AIDoc v2.0</sub>
</div>
