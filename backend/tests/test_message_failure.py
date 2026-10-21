from unittest.mock import AsyncMock, MagicMock

import pytest

from takehome.web.routers import messages


@pytest.mark.asyncio
async def test_failed_generation_emits_error_without_saving_answer(monkeypatch):
    session = AsyncMock()
    session.add = lambda message: None
    session.execute.return_value = MagicMock()
    session.execute.return_value.scalars.return_value.all.return_value = []
    monkeypatch.setattr(messages, "get_conversation", AsyncMock(return_value=object()))
    monkeypatch.setattr(messages, "get_document_for_conversation", AsyncMock(return_value=None))

    async def fail(**kwargs):
        raise RuntimeError("provider unavailable")
        yield ""

    monkeypatch.setattr(messages, "chat_with_document", fail)
    response = await messages.send_message("test", messages.MessageCreate(content="Review"), session)
    events = [event async for event in response.body_iterator]
    assert len(events) == 1
    assert '"type": "error"' in events[0]
    assert '"type": "done"' not in events[0]
    assert session.commit.await_count == 1
