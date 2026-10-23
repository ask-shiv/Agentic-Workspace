import { useLocation } from "react-router-dom";
import { citationKey } from "../lib/citations";
import { type Finding, type Section, evidenceOf } from "../lib/workspace";
import { SourceCitation } from "./SourceCitation";

export function ReportEvidence({
	section,
	findings,
}: { section: Section; findings: Finding[] }) {
	const { search } = useLocation();
	const params = new URLSearchParams(search);
	const sources = section.finding_ids
		.map((id) => findings[id])
		.filter((finding): finding is Finding => !!finding);
	const active =
		params.get("source") === "1" &&
		sources.some((finding) =>
			evidenceOf(finding).some(
				(source) =>
					citationKey(source) === params.get("citation") &&
					String(source.page) === params.get("page"),
			),
		);
	return (
		<section
			aria-label={`Source evidence for ${section.title}`}
			data-source-active={active}
			className="report-evidence space-y-2 rounded-lg border p-3"
		>
			<p className="text-xs font-semibold">Source evidence for this section</p>
			{sources.length ? (
				<>
					<p className="text-xs text-neutral-500">
						Select a page to inspect and highlight the original passage
						alongside your report.
					</p>
					<div className="flex flex-wrap gap-2">
						{sources.map((finding, index) => (
							<SourceCitation
								key={section.finding_ids[index]}
								finding={finding}
								view="report"
								compact
							/>
						))}
					</div>
					{active && (
						<p className="text-xs font-medium text-teal-900">
							Selected evidence is open in the source viewer.
						</p>
					)}
				</>
			) : (
				<p className="text-xs text-neutral-500">
					No evidence attached yet. Add a finding to link this section to the
					source document.
				</p>
			)}
		</section>
	);
}
