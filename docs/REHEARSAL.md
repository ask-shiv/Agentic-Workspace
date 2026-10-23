# Submission rehearsal — 22 October 2026

This is an engineering rehearsal using the supplied synthetic commercial lease, not a lawyer acceptance test or validation of legal advice.

| Step | Result |
| --- | --- |
| Fresh Home and PDF upload through the file picker | Passed; real filename and nine-page count shown |
| Explicit tenant-exit objective and proposed brief | Proposal displayed for agreement; unsupported date/details were corrected before agreement |
| Agree brief and investigate | Completed with six findings and seven outstanding questions |
| Open citation | Correct original PDF page opened; upload fingerprint verified and exact source overlay shown |
| Apply outline and add evidence | Finding attached to the selected report section with both source links |
| Request and review AI draft | Proposal remained unapplied; rejected because it repeated a calculated deadline despite instructions |
| Human editing | Three sections edited; contractual conditions retained and unsupported calendar deadline removed |
| Save and reload | Revision 1 saved; edited text, agreed context and evidence links restored |
| Download | Markdown file downloaded; edited working note and page references present; rejected calendar deadline absent |
| Revisit current report link | Same-view focus/scroll issue found and fixed with regression coverage |

One early attempt was interrupted by a development hot reload before saving; the recorded successful path was restarted and then saved/reloaded explicitly. Existing personal workspaces were not changed or deleted. The synthetic rehearsal workspace is retained locally for demonstration; it is not seeded into a fresh installation.

The rehearsal confirms the interaction and persistence path. It also reconfirms the open claim-reliability limitation (#28): planning and investigation can introduce unsupported factual framing, and drafting can repeat an instruction-prohibited deadline. The UI now explicitly labels generated proposals as requiring lawyer review, with reminders to check dates, clauses, conditions and unsupported claims. This is a review safeguard, not automatic verification or a claim that those generation errors have been fixed.

Validation after follow-up fixes: 48 backend tests and 33 frontend tests, frontend lint/type checks and production build. No fresh-database destructive reset or independent screen-reader audit was performed. Credentials were not displayed in the rehearsal or committed.

The Part 1 achievement PDF is submitted separately through the assignment form. The Loom script is prepared, but a real recording and README link must still be supplied by the candidate.


## Follow-up checks — 23 October 2026

The exact unsupported planning-date case now has a deterministic output validator. A calendar date in a planning proposal must already appear in the lawyer's objective; the partial overview is deliberately not treated as verified authority for new date assertions. PydanticAI can retry within the existing three-request/12,000-token/45-second limits, and persistent violations fail instead of displaying the proposal. Six regression cases cover named, ISO and slash-separated dates, successful retry and persistent failure. A fresh live plan against the same synthetic lease completed in 13.68 seconds with no calendar dates, retaining tenant/client-update context. Recognition is limited to the supported explicit date formats; this does not validate every date expression, amount or interpretation. Blank-objective proposals keep the represented-party field unspecified for confirmation.

Long document chat was checked in the browser: content height 1,121 px within a 504 px scroll region, with scroll position moving from 0 to 617 and back. At 600×420 the region remained constrained (204 px high) with overflow available; temporary viewport settings were reset. Chat messages have a keyboard-focusable scroll region and the input does not shrink away. The SVG favicon reuses the supplied orange logo mark and its served bytes match the source asset.
