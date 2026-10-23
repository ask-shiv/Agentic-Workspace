import { FileText, LoaderCircle } from "lucide-react";
import type { Section } from "../lib/workspace";
export function ReportTray({
	sections,
	notice,
	dirty,
	busy,
	canExport,
	onOpen,
	onSave,
	onExport,
}: {
	sections: Section[];
	notice: string;
	dirty: boolean;
	busy: string | null;
	canExport: boolean;
	onOpen: () => void;
	onSave: () => void;
	onExport: () => void;
}) {
	const linked = new Set(sections.flatMap((section) => section.finding_ids))
		.size;
	const started = sections.filter((section) => section.content.trim()).length;
	return (
		<aside
			aria-label="Your working report"
			className="report-tray flex flex-wrap items-center justify-between gap-3 border-t bg-white p-4 shadow-lg"
		>
			<div className="min-w-0 text-sm">
				<p className="flex items-center gap-2 font-semibold">
					<FileText size={18} aria-hidden="true" />
					Your report · {linked} linked {linked === 1 ? "finding" : "findings"}
				</p>
				<p className="mt-1 text-xs text-neutral-500">
					{started} of {sections.length} sections started ·{" "}
					{!started
						? "Add findings or write a section to begin"
						: dirty
							? "Save changes before PDF export"
							: "Saved report ready"}
				</p>
				<output
					aria-label="Report additions"
					className="mt-1 block text-xs text-teal-900"
				>
					{notice}
				</output>
			</div>
			<div className="flex flex-wrap gap-2">
				<button type="button" className="toolbar-button" onClick={onOpen}>
					Open master report
				</button>
				<button
					type="button"
					className="toolbar-button"
					disabled={!!busy || !dirty}
					onClick={onSave}
				>
					{busy === "save" ? "Saving…" : "Save report"}
				</button>
				<button
					type="button"
					className="primary-button inline-flex items-center gap-2"
					disabled={!!busy || dirty || !canExport}
					onClick={onExport}
				>
					{busy === "export" && (
						<LoaderCircle
							aria-hidden="true"
							className="planning-spinner h-4 w-4 animate-spin motion-reduce:animate-none"
						/>
					)}
					{busy === "export" ? "Exporting…" : "Export PDF"}
				</button>
			</div>
		</aside>
	);
}
