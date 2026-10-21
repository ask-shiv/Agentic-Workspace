from __future__ import annotations

import asyncio

import structlog
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy.ext.asyncio import AsyncSession

from takehome.db.session import get_session
from takehome.services.document import get_document_for_conversation
from takehome.services.review import ReviewOutput, review_document

logger = structlog.get_logger()

router = APIRouter(prefix="/api/conversations", tags=["review"])


class ReviewRequest(BaseModel):
    objective: str = Field(min_length=5, max_length=2000)


@router.post("/{conversation_id}/review", response_model=ReviewOutput)
async def run_review(
    conversation_id: str, body: ReviewRequest, session: AsyncSession = Depends(get_session)
) -> ReviewOutput:
    document = await get_document_for_conversation(session, conversation_id)
    if document is None:
        raise HTTPException(404, "Upload a document before starting a review.")
    if not document.extracted_text:
        raise HTTPException(422, "This PDF has no extracted text. Please use a text-based PDF.")
    try:
        return await review_document(document.extracted_text, body.objective)
    except ValueError as exc:
        raise HTTPException(422, str(exc)) from exc
    except (TimeoutError, asyncio.CancelledError) as exc:
        raise HTTPException(504, "The review timed out. Try a narrower objective.") from exc
    except Exception as exc:
        logger.exception("Review failed", conversation_id=conversation_id)
        raise HTTPException(502, "The review could not finish. Please try again.") from exc
