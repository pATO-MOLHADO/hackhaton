from __future__ import annotations

from io import BytesIO
from pathlib import Path

from pypdf import PdfReader

_IMAGE_EXTENSIONS = {'.png', '.jpg', '.jpeg', '.bmp', '.tif', '.tiff', '.webp'}
_PDF_EXTENSION = '.pdf'


class ExtractionError(Exception):
    pass


def _clean_text(text: str) -> str:
    lines = [line.strip() for line in text.splitlines()]
    return '\n'.join(line for line in lines if line)


def _detect_file_kind(filename: str | None, content_type: str | None) -> str:
    ext = Path(filename or '').suffix.lower()
    mime = (content_type or '').lower()

    if ext == _PDF_EXTENSION or 'pdf' in mime:
        return 'pdf'
    if ext in _IMAGE_EXTENSIONS or mime.startswith('image/'):
        return 'image'
    if ext == '.txt' or mime.startswith('text/'):
        return 'text'

    return 'unknown'


def _extract_pdf_text_native(file_bytes: bytes) -> str:
    chunks: list[str] = []

    try:
        reader = PdfReader(BytesIO(file_bytes))
        for page in reader.pages:
            chunks.append(page.extract_text() or '')
    except Exception:
        pass

    return _clean_text('\n'.join(chunks))


def _extract_image_text_ocr(file_bytes: bytes) -> str:
    _ = file_bytes
    raise ExtractionError(
        'OCR de imagem indisponivel neste deploy. Envie um PDF com texto selecionavel ou cole o texto do exame.'
    )


def _extract_pdf_text_with_ocr(file_bytes: bytes) -> str:
    _ = file_bytes
    raise ExtractionError(
        'OCR de PDF escaneado indisponivel neste deploy. Envie um PDF com texto selecionavel ou cole o texto do exame.'
    )


def extract_text_from_upload(file_bytes: bytes, filename: str | None, content_type: str | None) -> str:
    if not file_bytes:
        raise ExtractionError('Arquivo vazio.')

    kind = _detect_file_kind(filename, content_type)

    if kind == 'text':
        return _clean_text(file_bytes.decode('utf-8', errors='ignore'))

    if kind == 'pdf':
        native_text = _extract_pdf_text_native(file_bytes)
        if native_text:
            return native_text

        return _extract_pdf_text_with_ocr(file_bytes)

    if kind == 'image':
        return _extract_image_text_ocr(file_bytes)

    fallback = _clean_text(file_bytes.decode('utf-8', errors='ignore'))
    if fallback:
        return fallback

    raise ExtractionError('Formato de arquivo nao suportado. Envie PDF, imagem ou texto.')
