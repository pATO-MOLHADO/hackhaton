from __future__ import annotations

from typing import Any

from supabase import Client, create_client

from .settings import settings


def _create_client(api_key: str | None) -> Client | None:
    if not settings.supabase_url or not api_key:
        return None
    return create_client(settings.supabase_url, api_key)


def get_supabase_admin_client() -> Client | None:
    return _create_client(settings.supabase_service_role_key)


def get_supabase_auth_client() -> Client | None:
    if settings.supabase_anon_key:
        return _create_client(settings.supabase_anon_key)
    return _create_client(settings.supabase_service_role_key)


def _ensure_patient(client: Client, user_id: str, nome_paciente: str, condicoes: str | None) -> str:
    clean_name = (nome_paciente or 'Paciente sem nome').strip()

    client.table('medical_patients').upsert(
        {
            'owner_user_id': user_id,
            'full_name': clean_name,
            'default_conditions': condicoes,
        },
        on_conflict='owner_user_id,full_name',
    ).execute()

    lookup = (
        client.table('medical_patients')
        .select('id')
        .eq('owner_user_id', user_id)
        .eq('full_name', clean_name)
        .limit(1)
        .execute()
    )
    rows = getattr(lookup, 'data', None) or []
    if not rows:
        raise RuntimeError('Nao foi possivel localizar paciente apos upsert.')
    return str(rows[0]['id'])


def _save_analysis_v2(client: Client, row: dict[str, Any]) -> None:
    user_id = str(row.get('user_id') or '').strip()
    if not user_id:
        raise RuntimeError('user_id obrigatorio para salvar analise.')

    patient_id = _ensure_patient(
        client=client,
        user_id=user_id,
        nome_paciente=str(row.get('nome_paciente') or 'Paciente sem nome'),
        condicoes=row.get('condicoes'),
    )

    exam_insert = (
        client.table('clinical_exams')
        .insert(
            {
                'owner_user_id': user_id,
                'patient_id': patient_id,
                'source_type': 'texto',
                'raw_text': row.get('texto') or '',
                'patient_age_at_exam': row.get('idade'),
                'conditions_snapshot': row.get('condicoes'),
            }
        )
        .execute()
    )
    exam_rows = getattr(exam_insert, 'data', None) or []
    if not exam_rows:
        raise RuntimeError('Falha ao inserir clinical_exams.')
    exam_id = str(exam_rows[0]['id'])

    result_insert = (
        client.table('exam_analysis_results')
        .insert(
            {
                'owner_user_id': user_id,
                'exam_id': exam_id,
                'analysis_provider': 'deepseek',
                'analysis_model': settings.ai_model,
                'summary': row.get('resumo') or '',
                'recommendations': row.get('recomendacoes') or '',
                'attention_level': row.get('nivel_atencao') or 'normal',
            }
        )
        .execute()
    )
    result_rows = getattr(result_insert, 'data', None) or []
    if not result_rows:
        raise RuntimeError('Falha ao inserir exam_analysis_results.')
    analysis_result_id = str(result_rows[0]['id'])

    markers = row.get('valores_alterados') or []
    marker_payload: list[dict[str, Any]] = []
    for item in markers:
        item_text = str(item or '').strip()
        if not item_text:
            continue
        parts = item_text.split(':', 1)
        marker_payload.append(
            {
                'owner_user_id': user_id,
                'analysis_result_id': analysis_result_id,
                'marker_label': parts[0].strip() if parts else 'Marcador',
                'marker_value': parts[1].strip() if len(parts) > 1 else None,
            }
        )

    if marker_payload:
        client.table('exam_analysis_markers').insert(marker_payload).execute()


def save_analysis(row: dict[str, Any]) -> None:
    client = get_supabase_admin_client()
    if client is None:
        return

    # Legacy compatibility path
    legacy_table = (settings.supabase_table or '').strip()
    if legacy_table:
        try:
            client.table(legacy_table).insert(row).execute()
            return
        except Exception:
            pass

    _save_analysis_v2(client, row)


def list_recent_analyses(user_id: str, limit: int = 20) -> list[dict[str, Any]]:
    client = get_supabase_admin_client()
    if client is None:
        return []

    # Legacy path
    legacy_table = (settings.supabase_table or '').strip()
    if legacy_table:
        try:
            response = (
                client.table(legacy_table)
                .select('id,created_at,nome_paciente,idade,condicoes,resumo,nivel_atencao')
                .eq('user_id', user_id)
                .order('created_at', desc=True)
                .limit(limit)
                .execute()
            )
            data = getattr(response, 'data', None)
            if isinstance(data, list):
                return data
        except Exception:
            pass

    # V2 path
    result_resp = (
        client.table('exam_analysis_results')
        .select('id,exam_id,summary,attention_level,created_at')
        .eq('owner_user_id', user_id)
        .order('created_at', desc=True)
        .limit(limit)
        .execute()
    )
    result_rows = getattr(result_resp, 'data', None) or []
    if not result_rows:
        return []

    exam_ids = [row['exam_id'] for row in result_rows]
    exams_resp = (
        client.table('clinical_exams')
        .select('id,patient_id,patient_age_at_exam,conditions_snapshot,deleted_at')
        .in_('id', exam_ids)
        .execute()
    )
    exam_rows = [e for e in (getattr(exams_resp, 'data', None) or []) if e.get('deleted_at') is None]
    if not exam_rows:
        return []

    exam_by_id = {e['id']: e for e in exam_rows}
    patient_ids = list({e['patient_id'] for e in exam_rows})

    patients_resp = (
        client.table('medical_patients')
        .select('id,full_name')
        .in_('id', patient_ids)
        .execute()
    )
    patient_rows = getattr(patients_resp, 'data', None) or []
    patient_name_by_id = {p['id']: p.get('full_name') or 'Paciente' for p in patient_rows}

    output: list[dict[str, Any]] = []
    for r in result_rows:
        exam = exam_by_id.get(r['exam_id'])
        if not exam:
            continue

        output.append(
            {
                'id': r['id'],
                'created_at': r['created_at'],
                'nome_paciente': patient_name_by_id.get(exam['patient_id'], 'Paciente'),
                'idade': exam.get('patient_age_at_exam'),
                'condicoes': exam.get('conditions_snapshot'),
                'resumo': r.get('summary') or '',
                'nivel_atencao': r.get('attention_level') or 'normal',
            }
        )

    return output
