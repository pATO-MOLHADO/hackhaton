from __future__ import annotations

import json
import re
from typing import Any
from urllib import error, request

from .settings import settings

CRITICAL_KEYWORDS = {
    'critico',
    'urgente',
    'troponina',
    'sepse',
    'hemorragia',
    'd-dimero',
}

ATTENTION_KEYWORDS = {
    'elevado',
    'alterado',
    'leucocitose',
    'glicemia',
    'colesterol',
    'acima',
}


def _extract_altered_values(texto: str) -> list[str]:
    values: list[str] = []
    lines = [line.strip() for line in texto.splitlines() if line.strip()]

    for line in lines:
        if ':' in line and re.search(r'\d', line):
            values.append(line)

    if values:
        return values[:8]

    compact = ' '.join(texto.split())
    if re.search(r'\b\d+[\.,]?\d*\b', compact):
        return [compact[:220]]

    return []


def _attention_level(texto: str) -> str:
    normalized = texto.lower()
    if any(k in normalized for k in CRITICAL_KEYWORDS):
        return 'critico'
    if any(k in normalized for k in ATTENTION_KEYWORDS):
        return 'atencao'
    return 'normal'


def _recommendation(level: str) -> str:
    if level == 'critico':
        return 'Acionar avaliacao medica imediata e priorizar contato com paciente.'
    if level == 'atencao':
        return 'Revisar exame com contexto clinico e considerar repeticao de marcadores alterados.'
    return 'Sem sinais de urgencia no texto. Manter seguimento de rotina.'


def _mock_call(task: str, payload: dict[str, Any]) -> dict[str, Any]:
    if task == 'analisar_texto':
        texto = str(payload.get('texto', ''))
        nome = str(payload.get('nome_paciente', 'Paciente'))
        idade = payload.get('idade')
        level = _attention_level(texto)
        return {
            'resumo': f'Paciente {nome}, {idade if idade is not None else "idade nao informada"} anos, classificado como {level}.',
            'valores_alterados': _extract_altered_values(texto),
            'recomendacoes': _recommendation(level),
            'nivel_atencao': level,
        }

    if task == 'chat':
        pergunta = str(payload.get('pergunta', '')).lower()
        contexto = str(payload.get('contexto_exame', ''))

        if 'grave' in pergunta or 'risco' in pergunta:
            resposta = 'Pode haver risco clinico, confirme sinais vitais e priorize avaliacao presencial hoje.'
        elif 'proximo passo' in pergunta or 'fazer' in pergunta:
            resposta = 'Correlacione sintomas, revise historico e repita marcadores alterados conforme protocolo.'
        else:
            resposta = f'Com base no exame: {contexto[:220]}'

        return {'resposta': resposta}

    raise ValueError(f'Tarefa de IA nao suportada: {task}')


def _deepseek_chat(messages: list[dict[str, str]], temperature: float = 0.2) -> str:
    if not settings.ai_api_key:
        raise RuntimeError('AI_API_KEY nao configurada para DeepSeek.')

    base_url = (settings.ai_base_url or 'https://api.deepseek.com').rstrip('/')
    model = settings.ai_model or 'deepseek-chat'
    endpoint = f'{base_url}/chat/completions'

    payload = {
        'model': model,
        'messages': messages,
        'temperature': temperature,
        'stream': False,
    }

    req = request.Request(
        endpoint,
        data=json.dumps(payload).encode('utf-8'),
        method='POST',
        headers={
            'Content-Type': 'application/json',
            'Authorization': f'Bearer {settings.ai_api_key}',
        },
    )

    try:
        with request.urlopen(req, timeout=45) as resp:
            body = resp.read().decode('utf-8')
    except error.HTTPError as exc:
        detail = exc.read().decode('utf-8', errors='ignore') if hasattr(exc, 'read') else str(exc)
        raise RuntimeError(f'DeepSeek HTTP {exc.code}: {detail}') from exc
    except Exception as exc:
        raise RuntimeError(f'Erro ao chamar DeepSeek: {exc}') from exc

    parsed = json.loads(body)
    content = (
        parsed.get('choices', [{}])[0]
        .get('message', {})
        .get('content', '')
    )

    if not content:
        raise RuntimeError('DeepSeek retornou resposta vazia.')

    return content.strip()


def _json_from_text(text: str) -> dict[str, Any]:
    text = text.strip()

    if text.startswith('```'):
        text = re.sub(r'^```[a-zA-Z]*\n?', '', text)
        text = re.sub(r'\n?```$', '', text)

    try:
        return json.loads(text)
    except Exception:
        start = text.find('{')
        end = text.rfind('}')
        if start >= 0 and end > start:
            return json.loads(text[start:end + 1])
        raise


def _normalize_analysis(raw: dict[str, Any], texto_fallback: str) -> dict[str, Any]:
    resumo = str(raw.get('resumo', '')).strip()
    recomendacoes = str(raw.get('recomendacoes', '')).strip()
    nivel = str(raw.get('nivel_atencao', 'normal')).strip().lower()
    valores = raw.get('valores_alterados', [])

    if nivel not in {'normal', 'atencao', 'critico'}:
        nivel = _attention_level(texto_fallback)

    if not isinstance(valores, list):
        valores = _extract_altered_values(texto_fallback)
    else:
        valores = [str(v) for v in valores if str(v).strip()]

    if not resumo:
        resumo = 'Resumo gerado automaticamente devido a retorno incompleto da IA.'
    if not recomendacoes:
        recomendacoes = _recommendation(nivel)

    return {
        'resumo': resumo,
        'valores_alterados': valores,
        'recomendacoes': recomendacoes,
        'nivel_atencao': nivel,
    }


def _deepseek_call(task: str, payload: dict[str, Any]) -> dict[str, Any]:
    if task == 'analisar_texto':
        texto = str(payload.get('texto', ''))
        nome = str(payload.get('nome_paciente', 'Paciente'))
        idade = payload.get('idade')
        condicoes = str(payload.get('condicoes', '') or '')

        system_prompt = (
            'Voce e um assistente clinico para triagem de exames laboratoriais. '
            'Responda SOMENTE em JSON valido e sem markdown. '
            'Formato: {"resumo":"...","valores_alterados":["..."],'
            '"recomendacoes":"...","nivel_atencao":"normal|atencao|critico"}.'
        )
        user_prompt = (
            f'Paciente: {nome}\n'
            f'Idade: {idade}\n'
            f'Condicoes: {condicoes}\n'
            f'Texto do exame:\n{texto}\n\n'
            'Classifique urgencia e retorne no formato solicitado.'
        )

        raw_text = _deepseek_chat(
            [
                {'role': 'system', 'content': system_prompt},
                {'role': 'user', 'content': user_prompt},
            ],
            temperature=0.1,
        )

        parsed = _json_from_text(raw_text)
        return _normalize_analysis(parsed, texto)

    if task == 'chat':
        pergunta = str(payload.get('pergunta', ''))
        contexto = str(payload.get('contexto_exame', ''))
        historico = payload.get('historico', [])

        messages: list[dict[str, str]] = [
            {
                'role': 'system',
                'content': (
                    'Voce e um assistente medico para apoio em exame laboratorial. '
                    'Nao substitui avaliacao presencial. Seja objetivo e seguro.'
                ),
            },
            {'role': 'user', 'content': f'Contexto do exame: {contexto}'},
        ]

        if isinstance(historico, list):
            for item in historico[-8:]:
                role = str(item.get('role', '')).lower()
                content = str(item.get('content', '')).strip()
                if role in {'user', 'assistant'} and content:
                    messages.append({'role': role, 'content': content})

        messages.append({'role': 'user', 'content': pergunta})
        resposta = _deepseek_chat(messages, temperature=0.2)
        return {'resposta': resposta}

    raise ValueError(f'Tarefa de IA nao suportada: {task}')


def chamar_ia(task: str, payload: dict[str, Any]) -> dict[str, Any]:
    provider = settings.ai_provider.lower().strip()

    if provider == 'mock':
        return _mock_call(task, payload)

    if provider == 'deepseek':
        if not settings.ai_api_key:
            return _mock_call(task, payload)
        return _deepseek_call(task, payload)

    if provider == 'custom_http':
        raise RuntimeError(
            'AI_PROVIDER=custom_http ainda nao implementado. '
            'Use este ponto para integrar outro provedor de IA depois.'
        )

    raise RuntimeError(f'AI_PROVIDER invalido: {settings.ai_provider}')
