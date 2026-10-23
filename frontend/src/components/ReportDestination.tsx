import type { Section } from "../lib/workspace";
export function ReportDestination({
	sections,
	target,
	disabled,
	onChange,
}: {
	sections: Section[];
	target: number;
	disabled: boolean;
	onChange: (index: number) => void;
}) {
	return (
		<fieldset disabled={disabled} className="space-y-3">
			<legend className="text-sm font-semibold">
				Choose a section in your report
			</legend>
			<div className="grid gap-2 sm:grid-cols-2">
				{sections.map((section, index) => (
					<label
						key={section.title}
						className={`flex cursor-pointer items-start gap-2 rounded-lg border p-3 text-sm ${target === index ? "border-blue-400 bg-blue-50" : "bg-white"}`}
					>
						<input
							type="radio"
							name="report-destination"
							checked={target === index}
							onChange={() => onChange(index)}
							className="mt-1 shrink-0"
						/>
						<span className="min-w-0">
							<span className="block font-medium">{section.title}</span>
							<span className="mt-1 block text-xs text-neutral-500">
								{section.finding_ids.length} linked{" "}
								{section.finding_ids.length === 1 ? "finding" : "findings"} ·{" "}
								{section.content.trim() ? "Draft started" : "Empty section"}
							</span>
						</span>
					</label>
				))}
			</div>
			<p className="text-xs text-neutral-500">
				Next addition goes into <strong>{sections[target]?.title}</strong>.
				Other sections stay unchanged.
			</p>
		</fieldset>
	);
}
