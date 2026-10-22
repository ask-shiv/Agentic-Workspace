import hashlib
from pathlib import Path

from fastapi import HTTPException

from takehome.db.models import Document


def read_source(document: Document) -> tuple[bytes, dict[str, str]]:
    try:
        content = Path(document.file_path).read_bytes()
        digest = hashlib.sha256(content).hexdigest()
    except OSError as exc:
        raise HTTPException(404, "Original PDF is unavailable.") from exc
    if document.source_sha256 and digest != document.source_sha256:
        raise HTTPException(
            409,
            "Original PDF failed its integrity check. Re-upload the trusted original; this copy will not be displayed.",
        )
    return content, {
        "status": "verified" if document.source_sha256 else "legacy_unverified",
        "sha256": digest,
    }


def verify_source(document: Document) -> dict[str, str]:
    return read_source(document)[1]
