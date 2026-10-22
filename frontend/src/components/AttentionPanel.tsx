import { ChevronDown, CircleHelp } from "lucide-react";

export function AttentionPanel({
	items,
	current,
}: { items: string[]; current: boolean }) {
	if (!items.length) return null;
	return (
		<details className="group overflow-hidden rounded-xl border border-amber-300 bg-amber-50 text-amber-950">
			<summary className="flex min-h-14 cursor-pointer list-none items-center gap-3 p-4 [&::-webkit-details-marker]:hidden">
				<CircleHelp aria-hidden="true" className="h-5 w-5 shrink-0" />
				<span className="min-w-0 flex-1">
					<span className="flex flex-wrap items-center gap-2">
						<span className="font-semibold">Needs your attention</span>
						<span className="rounded-full bg-amber-200 px-2 py-0.5 text-xs font-semibold">
							{items.length} {items.length === 1 ? "item" : "items"}
						</span>
					</span>
					<span className="mt-1 block text-xs leading-relaxed">
						{current
							? "Missing context and open questions to check before relying on this review."
							: "From an earlier investigation. Re-run the review for your current brief."}
					</span>
				</span>
				<ChevronDown
					aria-hidden="true"
					className="h-4 w-4 shrink-0 transition-transform group-open:rotate-180 motion-reduce:transition-none"
				/>
			</summary>
			<section
				className="border-t border-amber-200 p-4"
				aria-label="Items requiring attention"
			>
				<ol className="list-decimal space-y-3 pl-5 text-sm leading-relaxed">
					{items.map((item, index) => (
						<li key={`${index}-${item}`} className="break-words pl-1">
							{item}
						</li>
					))}
				</ol>
			</section>
		</details>
	);
}
