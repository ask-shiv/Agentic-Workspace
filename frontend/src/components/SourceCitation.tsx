import { Link, useLocation } from "react-router-dom";
import { citationSearch } from "../lib/citations";
import type { Finding } from "../lib/workspace";

export function SourceCitation({
	finding,
	compact = false,
}: { finding: Finding; compact?: boolean }) {
	const location = useLocation();
	return (
		<Link
			className="text-sm font-medium text-teal-900 underline decoration-teal-300 underline-offset-4"
			to={{
				pathname: location.pathname,
				search: citationSearch(location.search, finding),
			}}
			aria-label={`Inspect source on PDF page ${finding.page}`}
		>
			{compact ? `Evidence: p.${finding.page}` : `PDF page ${finding.page}`}
		</Link>
	);
}
