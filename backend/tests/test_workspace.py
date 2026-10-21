import pytest
from pydantic import ValidationError

from takehome.web.routers.workspace import WorkspaceData


def test_rejects_dangling_evidence_references():
    with pytest.raises(ValidationError, match="existing finding"):
        WorkspaceData(sections=[{"title": "Report", "content": "Advice", "finding_ids": [0]}])
    with pytest.raises(ValidationError, match="existing finding"):
        WorkspaceData(reviewed_ids=[-1])


def test_rejects_oversized_report_section():
    with pytest.raises(ValidationError):
        WorkspaceData(sections=[{"title": "Report", "content": "x" * 20001}])
