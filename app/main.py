from fastapi import Depends, FastAPI, File, Form, HTTPException, Query, UploadFile
from fastapi.middleware.cors import CORSMiddleware

from .analyzer import analyze_file_text, analyze_text, chat_about_exam
from .auth_service import guest_auth_session_response, login_user, signup_user
from .db import list_recent_analyses, save_analysis
from .deps import get_current_user
from .file_text_extractor import ExtractionError, extract_text_from_upload
from .models import (
    AnalysisRequest,
    AnalysisResponse,
    AuthLoginRequest,
    AuthSessionResponse,
    AuthSignupRequest,
    ChatRequest,
    ChatResponse,
    ExamHistoryItem,
    UserPublic,
)
from .settings import settings

app = FastAPI(title='AIDoc Backend', version='2.3.0')

app.add_middleware(
    CORSMiddleware,
    allow_origins=['*'],
    allow_credentials=True,
    allow_methods=['*'],
    allow_headers=['*'],
)


@app.get('/health')
def health() -> dict[str, str | bool]:
    return {
        'status': 'ok',
        'auth_required': settings.auth_required,
    }


@app.post('/auth/signup', response_model=AuthSessionResponse)
def auth_signup(payload: AuthSignupRequest) -> AuthSessionResponse:
    if not settings.auth_required:
        return guest_auth_session_response()

    try:
        return signup_user(payload)
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f'Erro interno: {exc}') from exc


@app.post('/auth/login', response_model=AuthSessionResponse)
def auth_login(payload: AuthLoginRequest) -> AuthSessionResponse:
    if not settings.auth_required:
        return guest_auth_session_response()

    try:
        return login_user(payload)
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f'Erro interno: {exc}') from exc


@app.get('/auth/me', response_model=UserPublic)
def auth_me(user: UserPublic = Depends(get_current_user)) -> UserPublic:
    return user


@app.post('/analisar-texto', response_model=AnalysisResponse)
def analisar_texto(
    payload: AnalysisRequest,
    user: UserPublic = Depends(get_current_user),
) -> AnalysisResponse:
    try:
        result = analyze_text(payload)

        save_analysis(
            {
                'user_id': user.id,
                'nome_paciente': payload.nome_paciente,
                'idade': payload.idade,
                'condicoes': payload.condicoes,
                'texto': payload.texto,
                'resumo': result.resumo,
                'valores_alterados': result.valores_alterados,
                'recomendacoes': result.recomendacoes,
                'nivel_atencao': result.nivel_atencao,
            }
        )

        return result
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f'Erro interno: {exc}') from exc


@app.post('/analisar', response_model=AnalysisResponse)
async def analisar_arquivo(
    arquivo: UploadFile = File(...),
    nome_paciente: str = Form('Paciente sem nome'),
    idade: int | None = Form(None),
    condicoes: str | None = Form(None),
    user: UserPublic = Depends(get_current_user),
) -> AnalysisResponse:
    try:
        content = await arquivo.read()
        text = extract_text_from_upload(
            file_bytes=content,
            filename=arquivo.filename,
            content_type=arquivo.content_type,
        )

        result = analyze_file_text(
            nome_paciente=nome_paciente,
            idade=idade,
            condicoes=condicoes,
            raw_text=text,
        )

        save_analysis(
            {
                'user_id': user.id,
                'nome_paciente': nome_paciente,
                'idade': idade,
                'condicoes': condicoes,
                'texto': text,
                'resumo': result.resumo,
                'valores_alterados': result.valores_alterados,
                'recomendacoes': result.recomendacoes,
                'nivel_atencao': result.nivel_atencao,
            }
        )

        return result
    except ExtractionError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f'Erro interno: {exc}') from exc


@app.post('/chat', response_model=ChatResponse)
def chat(
    payload: ChatRequest,
    user: UserPublic = Depends(get_current_user),
) -> ChatResponse:
    try:
        _ = user
        return chat_about_exam(payload)
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f'Erro interno: {exc}') from exc


@app.get('/exames/recentes', response_model=list[ExamHistoryItem])
def exames_recentes(
    limit: int = Query(default=10, ge=1, le=100),
    user: UserPublic = Depends(get_current_user),
) -> list[ExamHistoryItem]:
    try:
        max_limit = min(limit, settings.max_history_items)
        rows = list_recent_analyses(user_id=user.id, limit=max_limit)
        return [ExamHistoryItem(**row) for row in rows]
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f'Erro interno: {exc}') from exc
