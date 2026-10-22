import uuid

import pytest
from fastapi import HTTPException
from sqlalchemy import delete, update
from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine

from takehome.config import settings
from takehome.db.models import Conversation, Document
from takehome.services.review import Finding
from takehome.web.routers.workspace import (
    RestoreRequest,
    Section,
    WorkspaceData,
    get_revision,
    get_workspace,
    list_revisions,
    restore_revision,
    save_workspace,
)


@pytest.fixture
async def workspace_db():
    engine = create_async_engine(settings.database_url)
    sessions = async_sessionmaker(engine, expire_on_commit=False)
    identity = f"revision-test-{uuid.uuid4().hex}"
    async with sessions() as session:
        session.add(Conversation(id=identity))
        session.add(
            Document(
                conversation_id=identity,
                filename="test.pdf",
                file_path="not-a-file",
                extracted_text="--- Page 1 ---\nNotice in writing.",
                page_count=1,
            )
        )
        await session.commit()
    try:
        yield identity, sessions
    finally:
        async with sessions() as session:
            await session.execute(delete(Conversation).where(Conversation.id == identity))
            await session.commit()
        await engine.dispose()


@pytest.mark.asyncio
async def test_restore_is_append_only_rechecks_evidence_and_rejects_stale_writes(workspace_db):
    identity, sessions = workspace_db
    finding = Finding(
        title="Notice",
        interpretation="Check notice",
        relevance="Exit",
        next_step="Confirm",
        page=1,
        quote="Notice in writing.",
        uncertainty="Review",
        evidence_status="source_checked",
    )
    async with sessions() as session:
        first = await save_workspace(
            identity,
            WorkspaceData(
                findings=[finding],
                sections=[Section(title="Report", content="Original advice", finding_ids=[0])],
            ),
            session,
        )
    async with sessions() as session:
        second = await save_workspace(
            identity,
            first.model_copy(
                update={
                    "sections": [Section(title="Report", content="Later advice", finding_ids=[0])]
                }
            ),
            session,
        )
    async with sessions() as session:
        revisions = await list_revisions(identity, session)
        assert [row.version for row in revisions] == [2, 1]
        assert (await get_revision(identity, 1, session)).sections[0].content == "Original advice"
    async with sessions() as session:
        await session.execute(
            update(Document)
            .where(Document.conversation_id == identity)
            .values(extracted_text="--- Page 1 ---\nChanged source.")
        )
        await session.commit()
    async with sessions() as session:
        restored = await restore_revision(
            identity, 1, RestoreRequest(current_version=second.version), session
        )
        assert restored.version == 3
        assert restored.sections[0].content == "Original advice"
        assert restored.findings[0].evidence_status == "unverified"
    async with sessions() as session:
        with pytest.raises(HTTPException) as error:
            await restore_revision(identity, 1, RestoreRequest(current_version=2), session)
        assert error.value.status_code == 409
    async with sessions() as session:
        assert (await get_workspace(identity, session)).version == 3
        assert (await get_revision(identity, 2, session)).sections[0].content == "Later advice"
        assert (await get_revision(identity, 1, session)).findings[
            0
        ].evidence_status == "source_checked"
        assert len(await list_revisions(identity, session)) == 3
        with pytest.raises(HTTPException) as error:
            await get_revision(identity, 999, session)
        assert error.value.status_code == 404


@pytest.mark.asyncio
async def test_history_is_scoped_to_requested_workspace_and_initial_conflict_is_atomic(
    workspace_db,
):
    identity, sessions = workspace_db
    async with sessions() as session:
        await save_workspace(identity, WorkspaceData(), session)
    async with sessions() as session:
        with pytest.raises(HTTPException) as error:
            await save_workspace(identity, WorkspaceData(objective="Stale initial save"), session)
        assert error.value.status_code == 409
    async with sessions() as session:
        assert len(await list_revisions(identity, session)) == 1
        with pytest.raises(HTTPException) as error:
            await get_revision("missing-workspace", 1, session)
        assert error.value.status_code == 404


@pytest.mark.asyncio
async def test_brief_snapshots_and_unlocked_state_round_trip_without_overwriting_history(
    workspace_db,
):
    from .brief_fixture import tenant_brief

    identity, sessions = workspace_db
    brief = tenant_brief()
    async with sessions() as session:
        first = await save_workspace(
            identity,
            WorkspaceData(
                objective=brief.objective,
                brief=brief,
                review_brief=brief,
                report_brief=brief,
                review_objective=brief.objective,
            ),
            session,
        )
    async with sessions() as session:
        second = await save_workspace(
            identity, first.model_copy(update={"purpose_unlocked": True}), session
        )
        assert second.purpose_unlocked
    async with sessions() as session:
        loaded = await get_workspace(identity, session)
        assert loaded.brief == brief
        assert loaded.purpose_unlocked
        assert not (await get_revision(identity, 1, session)).purpose_unlocked
