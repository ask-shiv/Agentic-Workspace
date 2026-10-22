import pytest

from takehome.services.review import Finding, check_evidence, split_pages


def finding(page=2, quote="Notice must be served in writing."):
    return Finding(
        title="Notice",
        interpretation="Review notice",
        relevance="Exit",
        next_step="Check service",
        page=page,
        quote=quote,
        uncertainty="Service not established",
        evidence_status="source_checked",
    )


def test_evidence_requires_quote_on_correct_page():
    pages = split_pages(
        "--- Page 1 ---\nOverview\n\n--- Page 2 ---\nNotice must be\nserved in writing."
    )
    assert check_evidence(finding(), pages).evidence_status == "source_checked"
    assert check_evidence(finding(page=1), pages).evidence_status == "unverified"
    assert (
        check_evidence(finding(quote="Notice may be given verbally."), pages).evidence_status
        == "unverified"
    )
    assert check_evidence(finding(page=3), pages).evidence_status == "unverified"


def test_no_readable_pages():
    assert split_pages("") == {}


@pytest.mark.asyncio
async def test_retrieval_limits_are_enforced_by_tools_without_mutating_source():
    from types import SimpleNamespace

    from takehome.services.review import DocumentContext, read_page, search_document

    pages = {page: f"Rent evidence on page {page}" for page in range(1, 7)}
    original = dict(pages)
    context = SimpleNamespace(deps=DocumentContext(pages))
    assert "PDF page" in await search_document(context, "rent")
    assert "PDF page" in await search_document(context, "evidence")
    assert "budget reached" in await search_document(context, "rent")
    for page in range(1, 5):
        assert await read_page(context, page) == pages[page]
    assert "already supplied" in await read_page(context, 1)
    assert "budget reached" in await read_page(context, 5)
    assert pages == original
    assert context.deps.pages_read == {1, 2, 3, 4}


@pytest.mark.asyncio
async def test_usage_limit_response_explains_recovery_without_exposing_counters(monkeypatch):
    from types import SimpleNamespace
    from unittest.mock import AsyncMock

    from fastapi import HTTPException
    from pydantic_ai.exceptions import UsageLimitExceeded

    from takehome.web.routers import review as route

    monkeypatch.setattr(
        route,
        "get_document_for_conversation",
        AsyncMock(return_value=SimpleNamespace(extracted_text="Source text")),
    )
    monkeypatch.setattr(
        route, "review_document", AsyncMock(side_effect=UsageLimitExceeded("internal counters"))
    )
    with pytest.raises(HTTPException) as error:
        await route.run_review(
            "a", route.ReviewRequest(objective="Review commercial risks"), AsyncMock()
        )
    assert error.value.status_code == 503
    assert "narrower objective" in error.value.detail
    assert "internal counters" not in error.value.detail
