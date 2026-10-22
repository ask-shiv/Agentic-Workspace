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
    assert check_evidence(finding(quote=" " * 10), pages).evidence_status == "unverified"


def test_no_readable_pages():
    assert split_pages("") == {}


def test_evidence_pack_bounds_context_and_reports_partial_scope_without_mutating_source():
    from takehome.services.review import evidence_pack

    pages = {page: (f"Page {page} rent evidence. " * 300) for page in range(1, 30)}
    original = dict(pages)
    pack, scope = evidence_pack(pages, "rent review")
    assert len(pack) <= 40
    assert sum(len(p.text) for p in pack) <= 36000
    assert "Partial source review" in scope
    assert pages == original
    assert all(p.text in pages[p.page] and 10 <= len(p.text) <= 1400 for p in pack)
    assert len({p.id for p in pack}) == len(pack)


def test_reference_resolution_cannot_reconstruct_merge_or_fabricate_source_quotes():
    from takehome.services.review import (
        SelectedFinding,
        SelectedReview,
        evidence_pack,
        resolve_findings,
    )

    pages = {
        1: "Written notice is required. Payment compliance is unknown.",
        2: "Another source page.",
    }
    pack, scope = evidence_pack(pages, "notice")
    selected = SelectedFinding(
        evidence_ids=[pack[0].id, pack[1].id],
        title="Notice",
        interpretation="Written notice is required.",
        relevance="Exit",
        next_step="Check service",
        uncertainty="Compliance unknown",
    )
    output = SelectedReview(
        findings=[selected, selected.model_copy(update={"evidence_ids": [pack[0].id, "invented"]})],
        gaps=[],
    )
    result = resolve_findings(output, pack, scope)
    assert len(result.findings) == 1
    assert result.findings[0].quote == pages[1]
    assert result.findings[0].page == 1
    assert result.findings[0].supporting_evidence[0].quote == pages[2]
    assert check_evidence(result.findings[0], {1: pages[1]}).evidence_status == "unverified"
    assert check_evidence(result.findings[0], pages).evidence_status == "source_checked"
    assert "withheld" in result.gaps[0]
    assert resolve_findings(
        SelectedReview(findings=[], gaps=[]), pack, "Partial source review"
    ).gaps == ["Partial source review"]


@pytest.mark.asyncio
async def test_review_uses_bounded_analysis_and_resolves_only_supplied_passages(monkeypatch):
    from types import SimpleNamespace
    from unittest.mock import AsyncMock

    from takehome.services import review

    pack, _ = review.evidence_pack({1: "Written notice is required."}, "notice")
    output = review.SelectedReview(
        findings=[
            review.SelectedFinding(
                evidence_ids=[pack[0].id],
                title="Notice",
                interpretation="Written notice is required.",
                relevance="Exit",
                next_step="Check service",
                uncertainty="Compliance unknown",
            )
        ],
        gaps=[],
    )
    run = AsyncMock(return_value=SimpleNamespace(output=output))
    monkeypatch.setattr(review.review_agent, "run", run)
    result = await review.review_document(
        "--- Page 1 ---\nWritten notice is required.", "Review notice"
    )
    assert result.findings[0].quote == "Written notice is required."
    assert run.await_count == 1
    assert pack[0].id in run.await_args.args[0]
    assert run.await_args.kwargs["usage_limits"].request_limit == 2


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


def test_model_contract_rejects_model_written_quotes_and_keeps_existing_public_limits():
    from pydantic import ValidationError

    from takehome.services.review import SelectedFinding

    data = {
        "evidence_ids": ["p1-s1"],
        "title": "Notice",
        "interpretation": "Evidence interpretation",
        "relevance": "A" * 400,
        "next_step": "Check records",
        "uncertainty": "Not established",
    }
    assert len(SelectedFinding(**data).relevance) == 400
    for extra in [
        {"quote": "Invented quotation"},
        {"page": 99},
        {"evidence_status": "source_checked"},
    ]:
        with pytest.raises(ValidationError):
            SelectedFinding(**data, **extra)
    with pytest.raises(ValidationError):
        SelectedFinding(**{**data, "next_step": "A" * 1001})


def test_large_source_retrieval_uses_intent_instead_of_only_the_first_pages():
    from takehome.services.review import evidence_pack

    pages = dict.fromkeys(range(1, 30), "Unrelated administrative background. " * 180)
    pages[30] = "The tenant break right requires vacant possession and a payment premium. " * 30
    pack, scope = evidence_pack(pages, "tenant break vacant possession premium")
    assert any(p.page == 30 for p in pack)
    assert "Partial source review" in scope


@pytest.mark.asyncio
async def test_stalled_provider_is_cancelled_at_existing_deadline(monkeypatch):
    import asyncio

    from takehome.services import review

    cancelled = []
    original_wait = asyncio.wait_for

    async def stalled(*args, **kwargs):
        try:
            await asyncio.Event().wait()
        finally:
            cancelled.append(True)

    async def short_deadline(awaitable, *, timeout):
        assert timeout == 100
        return await original_wait(awaitable, timeout=0.001)

    monkeypatch.setattr(review.review_agent, "run", stalled)
    monkeypatch.setattr(review.asyncio, "wait_for", short_deadline)
    with pytest.raises(TimeoutError):
        await review.review_document("--- Page 1 ---\nWritten notice is required.", "Review notice")
    assert cancelled == [True]
