from datetime import datetime
from types import SimpleNamespace
from unittest.mock import AsyncMock

import pytest

from takehome.web.routers import conversations


@pytest.mark.asyncio
async def test_workspace_list_identifies_uploaded_documents(monkeypatch):
    now = datetime.now()
    items = [SimpleNamespace(id="a", title="New Conversation", created_at=now, updated_at=now, documents=[SimpleNamespace(filename="lease.pdf")]), SimpleNamespace(id="b", title="New Conversation", created_at=now, updated_at=now, documents=[])]
    monkeypatch.setattr(conversations, "list_conversations", AsyncMock(return_value=items))
    result = await conversations.list_conversations_endpoint(AsyncMock())
    assert result[0].document_filename == "lease.pdf"
    assert result[0].has_document is True
    assert result[1].document_filename is None
    assert result[1].has_document is False
