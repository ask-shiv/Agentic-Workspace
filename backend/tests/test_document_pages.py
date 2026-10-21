from types import SimpleNamespace
from unittest.mock import AsyncMock

import pytest
from fastapi import HTTPException

from takehome.web.routers import documents


@pytest.mark.asyncio
async def test_accessible_page_uses_original_extracted_text(monkeypatch):
    document = SimpleNamespace(page_count=2, extracted_text="--- Page 1 ---\nFirst page\n--- Page 2 ---\nNotice must be served.")
    monkeypatch.setattr(documents, "get_document", AsyncMock(return_value=document))
    result = await documents.document_page_text("doc", 2, AsyncMock())
    assert result == {"page": 2, "text": "Notice must be served."}
    with pytest.raises(HTTPException) as error:
        await documents.document_page_text("doc", 3, AsyncMock())
    assert error.value.status_code == 404


@pytest.mark.asyncio
async def test_inaccessible_or_unreadable_document_is_explicit(monkeypatch):
    monkeypatch.setattr(documents, "get_document", AsyncMock(return_value=None))
    with pytest.raises(HTTPException) as error:
        await documents.document_page_text("missing", 1, AsyncMock())
    assert error.value.status_code == 404
    monkeypatch.setattr(documents, "get_document", AsyncMock(return_value=SimpleNamespace(page_count=1, extracted_text=None)))
    with pytest.raises(HTTPException) as error:
        await documents.document_page_text("scan", 1, AsyncMock())
    assert error.value.status_code == 422
