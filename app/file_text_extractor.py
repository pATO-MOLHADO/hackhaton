from __future__ import annotations

from io import BytesIO
from pathlib import Path

import numpy as np
import pymupdf
from pypdf import PdfReader

_IMAGE_EXTENSIONS = {'.png', '.jpg', '.jpeg', '.bmp', '.tif', '.tiff', '.webp'}
_PDF_EXTENSION = '.pdf'
_MIN_TEXT_CHARS = 40
_MAX_PDF_OCR_PAGES = 4


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

    try:
        doc = pymupdf.open(stream=file_bytes, filetype='pdf')
        for page in doc:
            chunks.append(page.get_text('text') or '')
        doc.close()
    except Exception:
        pass

    return _clean_text('\n'.join(chunks))


def _load_ocr_engine():
    try:
        from rapidocr_onnxruntime import RapidOCR
    except Exception as exc:
        raise ExtractionError(
            'OCR indisponivel. Instale rapidocr-onnxruntime para extrair texto de imagens/PDF escaneado.'
        ) from exc

    return RapidOCR()


def _ocr_image_array(ocr_engine, image_array: np.ndarray) -> str:
    result, _ = ocr_engine(image_array)
    if not result:
        return ''

    texts = [item[1] for item in result if len(item) >= 2 and item[1]]
    return _clean_text('\n'.join(texts))


def _extract_image_text_ocr(file_bytes: bytes) -> str:
    try:
        import cv2
    except Exception as exc:
        raise ExtractionError('OpenCV indisponivel para processar imagem de OCR.') from exc

    image_buffer = np.frombuffer(file_bytes, dtype=np.uint8)
    image = cv2.imdecode(image_buffer, cv2.IMREAD_COLOR)
    if image is None:
        raise ExtractionError('Nao foi possivel decodificar a imagem enviada.')

    ocr_engine = _load_ocr_engine()
    text = _ocr_image_array(ocr_engine, image)
    return _clean_text(text)


def _extract_pdf_text_with_ocr(file_bytes: bytes) -> str:
    ocr_engine = _load_ocr_engine()

    doc = pymupdf.open(stream=file_bytes, filetype='pdf')
    try:
        page_count = min(len(doc), _MAX_PDF_OCR_PAGES)
        chunks: list[str] = []

        for i in range(page_count):
            page = doc[i]
            pix = page.get_pixmap(matrix=pymupdf.Matrix(2, 2), alpha=False)
            samples = np.frombuffer(pix.samples, dtype=np.uint8)

            if pix.n == 1:
                image = samples.reshape((pix.height, pix.width))
            else:
                image = samples.reshape((pix.height, pix.width, pix.n))

            chunks.append(_ocr_image_array(ocr_engine, image))

        return _clean_text('\n'.join(chunks))
    finally:
        doc.close()


def extract_text_from_upload(file_bytes: bytes, filename: str | None, content_type: str | None) -> str:
    if not file_bytes:
        raise ExtractionError('Arquivo vazio.')

    kind = _detect_file_kind(filename, content_type)

    if kind == 'text':
        return _clean_text(file_bytes.decode('utf-8', errors='ignore'))

    if kind == 'pdf':
        native_text = _extract_pdf_text_native(file_bytes)
        if len(native_text) >= _MIN_TEXT_CHARS:
            return native_text

        ocr_text = _extract_pdf_text_with_ocr(file_bytes)
        final_text = _clean_text('\n'.join([native_text, ocr_text]))
        if final_text:
            return final_text

        raise ExtractionError('Nao foi possivel extrair texto do PDF.')

    if kind == 'image':
        image_text = _extract_image_text_ocr(file_bytes)
        if image_text:
            return image_text
        raise ExtractionError('Nao foi possivel extrair texto da imagem.')

    fallback = _clean_text(file_bytes.decode('utf-8', errors='ignore'))
    if fallback:
        return fallback

    raise ExtractionError('Formato de arquivo nao suportado. Envie PDF, imagem ou texto.')
