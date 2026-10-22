import type { WorkspaceData } from "../lib/workspace";

export function WorkspaceMomentum({
	data,
	onReport,
	onSave,
	disabled,
	dirty,
}: {
	data: WorkspaceData;
	onReport: () => void;
	onSave: () => void;
	disabled: boolean;
	dirty: boolean;
}) {
	const reviewed = new Set(data.reviewed_ids).size;
	const attached = new Set(
		data.sections.flatMap((section) => section.finding_ids),
	).size;
	const drafted = data.sections.filter((section) =>
		section.content.trim(),
	).length;
	const total = data.findings.length;
	return (
		<details className="momentum-bar rounded-xl border border-teal-200 bg-teal-50 px-4 py-3 text-teal-950">
			<summary className="flex cursor-pointer flex-wrap items-center justify-between gap-2 text-sm">
				<span>
					<strong>Your momentum</strong> · {reviewed}/{total} findings reviewed
					· {drafted} report sections started
				</span>
				<span className="flex items-center gap-2 text-xs">
					<span
						aria-hidden="true"
						className="h-2 w-2 rounded-full bg-teal-600"
					/>
					Ideas to save another step
				</span>
			</summary>
			<div className="mt-3 space-y-3 border-t border-teal-200 pt-3 text-sm">
				<progress
					className="h-2 w-full accent-teal-800"
					aria-label="Findings marked reviewed"
					value={reviewed}
					max={Math.max(1, total)}
				/>
				<p>
					{attached} findings linked to your report. This reflects this
					workspace, not measured hours saved.
				</p>
				{!total ? (
					<p>
						Set an objective and review your document to find evidence relevant
						to your client.
					</p>
				) : attached < total ? (
					<>
						<p>
							Bring a useful finding into your report, then use “Propose a
							draft” to turn its evidence into a starting point.
						</p>
						<button
							type="button"
							disabled={disabled}
							className="toolbar-button"
							onClick={onReport}
						>
							Continue building your report
						</button>
					</>
				) : (
					<>
						<p>
							Your evidence is connected. Save your work to keep a recoverable
							revision before sharing a draft.
						</p>
						<button
							type="button"
							disabled={disabled || !dirty}
							className="toolbar-button"
							onClick={onSave}
						>
							Save a revision
						</button>
					</>
				)}
			</div>
		</details>
	);
}
