import pytest
from pydantic import ValidationError

from takehome.services.review import Finding, ReviewOutput

from .agent_eval import assess, draft_checks


def example(**changes):
    return Finding.model_validate(
        {
            "title": "Break",
            "interpretation": "Break dates are 1 January 2029 and 1 January 2034. Notice is twelve months. The break premium is six months rent. Stated expiry is 31 December 2038.",
            "relevance": "Tenant exit",
            "next_step": "Check service and payment records.",
            "page": 1,
            "quote": "Notice in writing.",
            "uncertainty": "Actual compliance is unknown.",
            **changes,
        }
    )


def test_structured_review_rejects_malformed_outputs():
    for body in [
        {"findings": [{"title": "No source"}], "gaps": []},
        {"findings": [example().model_dump()] * 9, "gaps": []},
        {"findings": [{**example().model_dump(), "page": 0}], "gaps": []},
        {
            "findings": [{**example().model_dump(), "evidence_status": "legally_correct"}],
            "gaps": [],
        },
    ]:
        with pytest.raises(ValidationError):
            ReviewOutput.model_validate(body)


def test_eval_does_not_trust_the_models_own_evidence_status():
    output = ReviewOutput(findings=[example(evidence_status="source_checked")], gaps=[])
    checks = assess("lease_basics_1", output, {1: "Unrelated source"})
    assert not checks["quotations_match_stated_pages"]
    assert checks["break_dates"]
    assert checks["stated_expiry"]
    assert not all(assess("lease_basics_1", ReviewOutput(findings=[], gaps=[]), {}).values())


def test_missing_facts_and_wrong_document_need_explicit_gaps():
    assert not assess("missing_arrears", ReviewOutput(findings=[], gaps=[]), {})[
        "missing_payment_facts_flagged"
    ]
    assert assess(
        "missing_arrears",
        ReviewOutput(
            findings=[], gaps=["Actual rent arrears are unknown without payment records."]
        ),
        {},
    )["missing_payment_facts_flagged"]
    assert not assess(
        "non_lease",
        ReviewOutput(findings=[example()], gaps=["This is not a lease."]),
        {1: "Notice in writing."},
    )["no_invented_lease_findings"]
    assert all(
        assess(
            "non_lease", ReviewOutput(findings=[], gaps=["This is a cafe menu, not a lease."]), {}
        ).values()
    )


def test_draft_checks_accept_short_citations_but_reject_unknown_pages_and_unverified_dates():
    assert all(
        draft_checks("Contractual term expiry 31 December 2038. [p.4, p.7]", {4, 7}).values()
    )
    assert not draft_checks("A claim [PDF page 99]", {4, 7})["draft_has_valid_page_references"]
    assert not draft_checks("Serve by 31 December 2027. [p.7]", {7})[
        "draft_avoids_unverified_service_dates"
    ]


def test_core_coverage_cannot_be_satisfied_by_mentioning_omitted_conditions_only_in_gaps():
    output = ReviewOutput(
        findings=[example()], gaps=["Vacant possession and material breach conditions need review."]
    )
    checks = assess("lease_basics_1", output, {1: "Notice in writing."})
    assert not checks["vacant_possession_covered"]
    assert not checks["material_breach_condition_covered"]
