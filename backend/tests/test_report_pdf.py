import unicodedata

import pymupdf

from takehome.services.report_pdf import render_report_pdf


def test_pdf_preserves_report_text_evidence_and_escaped_markup():
    pdf = render_report_pdf(
        "# Document review report\n\nSaved revision: 4\n\n## Client advice\n\n"
        'Check <script>alert("no")</script> & obtain confirmation.\n\n'
        "### Evidence: Break condition\n\nPDF page 7 · Source checked\n\n"
        "> Written notice is required.\n\n## Review gaps\n\nConfirm compliance."
    )
    assert pdf.startswith(b"%PDF")
    with pymupdf.open(stream=pdf, filetype="pdf") as document:
        text = unicodedata.normalize("NFKC", " ".join(page.get_text() for page in document))
        assert "Saved revision: 4" in text
        assert '<script>alert("no")</script>' in text
        assert "Written notice is required." in text
        assert "PDF page 7" in text
        assert "Confirm compliance." in text
        assert not any(page.get_links() for page in document)


def test_pdf_paginates_without_losing_the_end_of_a_long_report():
    pdf = render_report_pdf(
        "# Long report\n\n" + "Paragraph for review.\n\n" * 600 + "FINAL REVIEW MARKER"
    )
    with pymupdf.open(stream=pdf, filetype="pdf") as document:
        assert len(document) > 1
        assert "FINAL REVIEW MARKER" in document[-1].get_text()
