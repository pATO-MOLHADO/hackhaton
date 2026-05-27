from pydantic import BaseModel, Field


class AnalysisRequest(BaseModel):
    nome_paciente: str = Field(min_length=1)
    idade: int | None = Field(default=None, ge=0, le=130)
    condicoes: str | None = None
    texto: str = Field(min_length=3)


class AnalysisResponse(BaseModel):
    resumo: str
    valores_alterados: list[str]
    recomendacoes: str
    nivel_atencao: str


class ChatRequest(BaseModel):
    pergunta: str = Field(min_length=2)
    contexto_exame: str = Field(min_length=2)
    historico: list[dict] = Field(default_factory=list)


class ChatResponse(BaseModel):
    resposta: str


class AuthSignupRequest(BaseModel):
    email: str = Field(min_length=5)
    senha: str = Field(min_length=6, max_length=128)
    nome: str | None = Field(default=None, max_length=120)


class AuthLoginRequest(BaseModel):
    email: str = Field(min_length=5)
    senha: str = Field(min_length=6, max_length=128)


class UserPublic(BaseModel):
    id: str
    email: str | None = None
    nome: str | None = None


class AuthSessionResponse(BaseModel):
    access_token: str | None = None
    refresh_token: str | None = None
    token_type: str = 'bearer'
    email_confirmacao_pendente: bool = False
    user: UserPublic


class ExamHistoryItem(BaseModel):
    id: str
    created_at: str
    nome_paciente: str
    idade: int | None = None
    condicoes: str | None = None
    resumo: str
    nivel_atencao: str
