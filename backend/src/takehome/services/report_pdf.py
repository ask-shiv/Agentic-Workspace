from __future__ import annotations

from html import escape

import pymupdf


def render_report_pdf(markdown: str) -> bytes:
    blocks = []
    for block in markdown.split("\n\n"):
        tag = "p"
        for prefix, heading in [("### ", "h3"), ("## ", "h2"), ("# ", "h1")]:
            if block.startswith(prefix):
                tag, block = heading, block[len(prefix) :]
                break
        blocks.append(f"<{tag}>{escape(block).replace(chr(10), '<br/>')}</{tag}>")
    story = pymupdf.Story(
        html="<html><body>" + "".join(blocks) + "</body></html>",
        user_css="body {font-family: sans-serif; font-size: 10pt; line-height: 1.45;} h1 {font-size: 22pt; color: #164e49;} h2 {font-size: 15pt; margin-top: 20pt;} h3 {font-size: 11pt;} p {margin-bottom: 10pt;}",
    )

    def page_rect(number, filled):
        if number >= 100:
            raise ValueError("Report exceeds the 100-page PDF export limit.")
        page = pymupdf.Rect(0, 0, 595, 842)
        return page, pymupdf.Rect(48, 48, 547, 794), None

    with story.write_with_links(page_rect) as pdf:
        for index, page in enumerate(pdf):
            page.insert_text(
                (48, 818), f"Working report | Page {index + 1} of {len(pdf)}", fontsize=8
            )
        pdf.set_metadata(
            {"title": "Document review report", "subject": "Saved working report for lawyer review"}
        )
        return pdf.tobytes(garbage=4, deflate=True)
