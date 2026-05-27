from .ai_provider import chamar_ia
from .models import AnalysisRequest, AnalysisResponse, ChatRequest, ChatResponse


def analyze_text(payload: AnalysisRequest) -> AnalysisResponse:
    raw = chamar_ia('analisar_texto', payload.model_dump())
    return AnalysisResponse(**raw)


def analyze_file_text(nome_paciente: str, idade: int | None, condicoes: str | None, raw_text: str) -> AnalysisResponse:
    payload = AnalysisRequest(
        nome_paciente=nome_paciente,
        idade=idade,
        condicoes=condicoes,
        texto=raw_text if raw_text.strip() else 'Exame sem texto legivel extraido.',
    )
    return analyze_text(payload)


def chat_about_exam(payload: ChatRequest) -> ChatResponse:
    raw = chamar_ia('chat', payload.model_dump())
    return ChatResponse(**raw)
