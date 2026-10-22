import { Link, useLocation } from "react-router-dom";
import { citationKey, citationSearch } from "../lib/citations";
import { type Finding, evidenceOf } from "../lib/workspace";
import {
	Tooltip,
	TooltipContent,
	TooltipProvider,
	TooltipTrigger,
} from "./ui/tooltip";

export function SourceCitation({
	finding,
	compact = false,
}: { finding: Finding; compact?: boolean }) {
	const location = useLocation();
	return (
		<TooltipProvider>
			<span className="inline-flex flex-wrap gap-2">
				{evidenceOf(finding).map((source) => (
					<Tooltip key={citationKey(source)}>
						<TooltipTrigger asChild>
							<Link
								className="text-sm font-medium text-teal-900 underline decoration-teal-300 underline-offset-4"
								to={{
									pathname: location.pathname,
									search: citationSearch(location.search, source),
								}}
								aria-label={`Inspect source on PDF page ${source.page}`}
							>
								{compact
									? `Evidence: p.${source.page}`
									: `PDF page ${source.page}`}
							</Link>
						</TooltipTrigger>
						<TooltipContent className="max-h-60 max-w-sm overflow-y-auto whitespace-pre-wrap">
							{source.quote}
						</TooltipContent>
					</Tooltip>
				))}
			</span>
		</TooltipProvider>
	);
}
