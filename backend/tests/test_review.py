from takehome.services.review import Finding, check_evidence, split_pages


def finding(page=2, quote="Notice must be served in writing."):
    return Finding(title="Notice", interpretation="Review notice", relevance="Exit", next_step="Check service", page=page, quote=quote, uncertainty="Service not established", evidence_status="source_checked")


def test_evidence_requires_quote_on_correct_page():
    pages = split_pages("--- Page 1 ---\nOverview\n\n--- Page 2 ---\nNotice must be\nserved in writing.")
    assert check_evidence(finding(), pages).evidence_status == "source_checked"
    assert check_evidence(finding(page=1), pages).evidence_status == "unverified"
    assert check_evidence(finding(quote="Notice may be given verbally."), pages).evidence_status == "unverified"
    assert check_evidence(finding(page=3), pages).evidence_status == "unverified"


def test_no_readable_pages():
    assert split_pages("") == {}
