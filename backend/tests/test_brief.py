import json
from contextlib import asynccontextmanager
from types import SimpleNamespace
from unittest.mock import AsyncMock, MagicMock

import pytest
from fastapi import HTTPException
from pydantic import ValidationError

from takehome.services import llm, review
from takehome.services.brief import require_current_briefs, task_context
from takehome.web.routers import messages, workspace

from .brief_fixture import tenant_brief


def test_brief_rejects_duplicate_outline_and_stale_context():
    brief = tenant_brief()
    with pytest.raises(ValidationError, match="distinct"):
        tenant_brief(sections=[brief.sections[0].model_dump()] * 3)
    with pytest.raises(ValueError, match="different objective"):
        task_context("Negotiate for the landlord", brief)
    for reviewed, report, unlocked in [
        (None, brief, False),
        (brief, None, False),
        (tenant_brief(client_role="landlord"), brief, False),
        (brief, brief, True),
    ]:
        with pytest.raises(ValueError):
            require_current_briefs(brief.objective, brief, reviewed, report, unlocked)
    require_current_briefs(brief.objective, brief, brief, brief)
    require_current_briefs("Legacy objective", None, None, None)
    assert workspace.WorkspaceData.model_validate({"objective": "Legacy objective"}).brief is None


@pytest.mark.asyncio
async def test_plan_is_a_proposal_and_does_not_save_the_workspace(monkeypatch):
    brief = tenant_brief()
    session = AsyncMock()
    session.get.return_value = object()
    proposal = AsyncMock(return_value=brief)
    monkeypatch.setattr(
        workspace,
        "get_document_for_conversation",
        AsyncMock(return_value=SimpleNamespace(extracted_text="Synthetic document overview")),
    )
    monkeypatch.setattr(workspace, "propose_brief", proposal)
    result = await workspace.plan_workflow(
        "a", workspace.PlanRequest(objective=brief.objective), session
    )
    assert result == brief
    proposal.assert_awaited_once_with(brief.objective, "Synthetic document overview", None, False)
    session.commit.assert_not_awaited()


@pytest.mark.asyncio
async def test_drafting_rejects_drift_before_calling_model_and_passes_agreed_context(monkeypatch):
    brief = tenant_brief(workflow="report")
    session = AsyncMock()
    run = AsyncMock(
        return_value=SimpleNamespace(output=workspace.DraftOutput(content="Proposed text"))
    )
    monkeypatch.setattr(workspace.draft_agent, "run", run)
    body = workspace.DraftRequest(
        title="Exit feasibility",
        objective=brief.objective,
        instruction="Use the evidence",
        current_text="Lawyer text",
        findings=[],
        brief=brief,
    )
    with pytest.raises(HTTPException) as error:
        await workspace.draft_section("a", body, session)
    assert error.value.status_code == 409
    run.assert_not_awaited()
    finding = review.Finding(
        title="Notice",
        interpretation="Check conditions",
        relevance="Exit",
        next_step="Get records",
        page=1,
        quote="Written notice is required.",
        uncertainty="Compliance unknown",
    )
    body = body.model_copy(
        update={"review_brief": brief, "report_brief": brief, "findings": [finding]}
    )
    assert (await workspace.draft_section("a", body, session)).content == "Proposed text"
    prompt = json.loads(run.await_args.args[0])
    assert prompt["brief"] == brief.model_dump()
    assert prompt["current_text"] == "Lawyer text"
    assert "audience-specific" in prompt["workflow_guidance"]
    assert "review_brief" not in prompt
    run.reset_mock()
    with pytest.raises(HTTPException):
        await workspace.draft_section(
            "a", body.model_copy(update={"purpose_unlocked": True}), session
        )
    run.assert_not_awaited()


@pytest.mark.asyncio
async def test_review_and_chat_models_receive_the_same_agreed_brief(monkeypatch):
    brief = tenant_brief(workflow="report")
    review_run = AsyncMock(
        return_value=SimpleNamespace(
            output=review.SelectedReview(findings=[], gaps=["Need payment records"])
        )
    )
    monkeypatch.setattr(review.review_agent, "run", review_run)
    await review.review_document("--- Page 1 ---\nSynthetic lease text", brief.objective, brief)
    assert task_context(brief.objective, brief) in review_run.await_args.args[0]
    captured = []

    @asynccontextmanager
    async def stream(prompt):
        captured.append(prompt)

        async def chunks(delta):
            yield "Contextual answer"

        yield SimpleNamespace(stream_text=chunks)

    monkeypatch.setattr(llm.agent, "run_stream", stream)
    result = [
        chunk
        async for chunk in llm.chat_with_document(
            "What next?", "Document", [], brief.objective, brief
        )
    ]
    assert result == ["Contextual answer"]
    assert task_context(brief.objective, brief) in captured[0]


@pytest.mark.asyncio
async def test_chat_endpoint_forwards_live_unsaved_brief_without_changing_user_message(monkeypatch):
    brief = tenant_brief()
    session = AsyncMock()
    session.add = lambda message: None
    session.execute.return_value = MagicMock()
    session.execute.return_value.scalars.return_value.all.return_value = []
    monkeypatch.setattr(messages, "get_conversation", AsyncMock(return_value=object()))
    monkeypatch.setattr(messages, "get_document_for_conversation", AsyncMock(return_value=None))
    received = []

    async def fail(**kwargs):
        received.append(kwargs)
        raise RuntimeError("Stop before persistence")
        yield ""

    monkeypatch.setattr(messages, "chat_with_document", fail)
    response = await messages.send_message(
        "a",
        messages.MessageCreate(content="What next?", objective=brief.objective, brief=brief),
        session,
    )
    events = [event async for event in response.body_iterator]
    assert received[0]["brief"] == brief
    assert received[0]["objective"] == brief.objective
    assert received[0]["user_message"] == "What next?"
    assert '"type": "error"' in events[0]


@pytest.mark.asyncio
async def test_export_rejects_saved_unlocked_purpose_and_workflow_drift():
    session = AsyncMock()
    brief = tenant_brief(workflow="risk")
    for data in [
        workspace.WorkspaceData(objective="Changed purpose", purpose_unlocked=True),
        workspace.WorkspaceData(
            objective=brief.objective,
            workflow="risk",
            brief=brief.model_copy(update={"time_pressure": True}),
            review_brief=brief.model_copy(update={"time_pressure": True}),
            report_brief=brief.model_copy(update={"time_pressure": True}),
        ),
        workspace.WorkspaceData(
            objective=brief.objective,
            workflow="report",
            brief=brief,
            review_brief=brief,
            report_brief=brief,
        ),
    ]:
        session.get.return_value = SimpleNamespace(
            payload=data.model_dump_json(exclude={"version"}), version=2
        )
        with pytest.raises(HTTPException) as error:
            await workspace.export_workspace("a", session)
        assert error.value.status_code == 409


@pytest.mark.asyncio
async def test_workflow_presets_change_planning_and_shared_agent_context(monkeypatch):
    from takehome.services import brief as service

    base = tenant_brief()
    run = AsyncMock(
        return_value=SimpleNamespace(output=service.BriefProposal.model_validate(base.model_dump()))
    )
    monkeypatch.setattr(service.brief_agent, "run", run)
    risk = await service.propose_brief(base.objective, "Document overview", "risk")
    risk_prompt = json.loads(run.await_args.args[0])
    report = await service.propose_brief(base.objective, "Document overview", "report")
    report_prompt = json.loads(run.await_args.args[0])
    assert risk.objective == report.objective
    assert risk.workflow == "risk" and risk.deliverable == base.deliverable
    assert report.workflow == "report" and report.deliverable == base.deliverable
    assert report.sections[0].title == "Client position"
    assert report.sections[-1].title == "Decisions and next steps"
    assert [section.title for section in risk.sections] != [
        section.title for section in report.sections
    ]
    assert risk_prompt["workflow_guidance"] != report_prompt["workflow_guidance"]
    assert "commercial exposure" in task_context(base.objective, risk)
    assert "audience-specific" in task_context(base.objective, report)
    with pytest.raises(ValueError):
        require_current_briefs(base.objective, report, risk, risk)


@pytest.mark.asyncio
async def test_time_pressure_is_proposed_persisted_and_guides_shared_agent_context(monkeypatch):
    from takehome.services import brief as service

    base = tenant_brief()
    run = AsyncMock(
        return_value=SimpleNamespace(output=service.BriefProposal.model_validate(base.model_dump()))
    )
    monkeypatch.setattr(service.brief_agent, "run", run)
    proposed = await service.propose_brief(base.objective, "Synthetic lease", "risk", True)
    assert proposed.time_pressure is True
    prompt = json.loads(run.await_args.args[0])
    assert prompt["time_pressure"] is True
    assert "three decision-critical" in prompt["pace_guidance"]
    context = json.loads(task_context(proposed.objective, proposed))
    assert context["agreed_brief"]["time_pressure"] is True
    assert "preserving all conditions" in context["pace_guidance"]
    with pytest.raises(ValueError):
        require_current_briefs(proposed.objective, proposed, base, proposed)


@pytest.mark.asyncio
async def test_blank_objective_proposes_an_outcome_without_overwriting_explicit_goal(monkeypatch):
    from takehome.services import brief as service

    proposal = service.BriefProposal.model_validate(tenant_brief().model_dump())
    run = AsyncMock(return_value=SimpleNamespace(output=proposal))
    monkeypatch.setattr(service.brief_agent, "run", run)
    inferred = await service.propose_brief("", "Synthetic lease overview", "report")
    payload = json.loads(run.call_args.args[0])
    assert payload["document_overview"] == "Synthetic lease overview"
    assert "Do not assume a represented party" in payload["objective"]
    assert inferred.objective == proposal.outcome
    assert inferred.client_role == "unspecified"
    explicit = "Advise the landlord about rental income."
    supplied = await service.propose_brief(explicit, "Same lease", "risk")
    assert supplied.objective == explicit
    assert json.loads(run.call_args.args[0])["objective"] == explicit
    assert workspace.PlanRequest().objective == ""


@pytest.mark.parametrize("date", ["5 January 2029", "January 5, 2029", "2029-01-05", "05/01/2029"])
def test_planning_rejects_calendar_dates_not_supplied_by_lawyer(date):
    from pydantic_ai import ModelRetry

    from takehome.services.brief import BriefProposal, validate_planning_dates

    proposed = BriefProposal.model_validate(
        tenant_brief(priorities=[f"Check review on {date}"]).model_dump()
    )
    with pytest.raises(ModelRetry, match="calendar date"):
        validate_planning_dates("Help the tenant exit in 2029", proposed)
    assert validate_planning_dates(f"Investigate the date {date}", proposed) == proposed


@pytest.mark.asyncio
async def test_planner_retries_unsupported_date_before_returning_proposal():
    from pydantic_ai.messages import ModelResponse, ToolCallPart
    from pydantic_ai.models.function import FunctionModel

    from takehome.services.brief import BriefProposal, brief_agent, propose_brief

    calls = []
    clean = BriefProposal.model_validate(tenant_brief().model_dump())
    bad = clean.model_copy(update={"priorities": ["Rent review on 5 January 2029"]})

    def respond(messages, info):
        calls.append(messages)
        value = bad if len(calls) == 1 else clean
        return ModelResponse([ToolCallPart(info.output_tools[0].name, value.model_dump())])

    with brief_agent.override(model=FunctionModel(respond)):
        result = await propose_brief("Help my tenant exit in 2029", "Partial synthetic overview")
    assert len(calls) == 2
    assert result.priorities == clean.priorities
    assert "5 January 2029" not in result.model_dump_json()


@pytest.mark.asyncio
async def test_planner_does_not_return_persistent_unsupported_dates():
    from pydantic_ai.exceptions import UnexpectedModelBehavior
    from pydantic_ai.messages import ModelResponse, ToolCallPart
    from pydantic_ai.models.function import FunctionModel

    from takehome.services.brief import BriefProposal, brief_agent, propose_brief

    bad = BriefProposal.model_validate(
        tenant_brief(priorities=["Rent review on 5 January 2029"]).model_dump()
    )

    def respond(messages, info):
        return ModelResponse([ToolCallPart(info.output_tools[0].name, bad.model_dump())])

    with brief_agent.override(model=FunctionModel(respond)):
        with pytest.raises(UnexpectedModelBehavior):
            await propose_brief("Help my tenant exit in 2029", "Partial synthetic overview")
