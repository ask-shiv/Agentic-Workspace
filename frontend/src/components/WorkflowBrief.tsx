import type { MatterBrief, WorkspaceData } from "../lib/workspace";
import { briefIsCurrent, briefKey, reviewIsCurrent } from "../lib/workspace";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogTitle,
} from "./ui/dialog";

export const deliverableNames = {
	client_update: "Client update",
	negotiation_brief: "Negotiation brief",
	risk_memo: "Risk memo",
};
export function BriefReview({
	brief,
	open,
	busy,
	onChange,
	onClose,
	onConfirm,
}: {
	brief: MatterBrief | null;
	open: boolean;
	busy: boolean;
	onChange: (brief: MatterBrief) => void;
	onClose: () => void;
	onConfirm: () => void;
}) {
	if (!brief) return null;
	const valid =
		brief.outcome.trim().length >= 5 &&
		brief.outcome.length <= 1000 &&
		brief.priorities.length >= 1 &&
		brief.priorities.length <= 4 &&
		brief.open_questions.length <= 4 &&
		[...brief.priorities, ...brief.open_questions].every(
			(item) => item.trim() && item.length <= 400,
		) &&
		brief.sections.length >= 3 &&
		brief.sections.length <= 5 &&
		brief.sections.every(
			(item) =>
				item.title.trim() &&
				item.title.length <= 100 &&
				item.purpose.trim() &&
				item.purpose.length <= 400,
		) &&
		new Set(brief.sections.map((item) => item.title.trim().toLowerCase()))
			.size === brief.sections.length;
	return (
		<Dialog
			open={open}
			onOpenChange={(value) => {
				if (!value && !busy) onClose();
			}}
		>
			<DialogContent className="max-h-[90dvh] max-w-3xl overflow-y-auto">
				<DialogTitle>Agree the brief</DialogTitle>
				<DialogDescription>
					This is the agent’s proposed understanding, not a legal conclusion.
					Correct it before investigating. The same agreed brief will guide
					review, chat and drafting.
				</DialogDescription>
				<p className="rounded-lg bg-neutral-50 p-3 text-sm">
					<strong>Your objective:</strong> {brief.objective}
					{brief.workflow && (
						<span className="mt-2 block text-xs font-semibold">
							Selected workflow:{" "}
							{brief.workflow === "risk" ? "Assess risk" : "Build report"}
							{brief.time_pressure &&
								" · Time pressed: decision-critical findings first"}
						</span>
					)}
				</p>
				<div className="grid gap-4 sm:grid-cols-2">
					<label className="text-sm font-medium">
						Representing
						<select
							className="mt-1 block w-full rounded border p-2"
							value={brief.client_role}
							onChange={(event) =>
								onChange({
									...brief,
									client_role: event.target.value as MatterBrief["client_role"],
								})
							}
						>
							{["tenant", "landlord", "buyer", "seller", "unspecified"].map(
								(role) => (
									<option key={role} value={role}>
										{role}
									</option>
								),
							)}
						</select>
					</label>
					<label className="text-sm font-medium">
						Deliverable
						<select
							className="mt-1 block w-full rounded border p-2"
							value={brief.deliverable}
							onChange={(event) =>
								onChange({
									...brief,
									deliverable: event.target.value as MatterBrief["deliverable"],
								})
							}
						>
							{Object.entries(deliverableNames).map(([value, label]) => (
								<option key={value} value={value}>
									{label}
								</option>
							))}
						</select>
					</label>
				</div>
				<label className="text-sm font-medium">
					Intended outcome
					<textarea
						rows={2}
						maxLength={1000}
						className="mt-1 block w-full rounded border p-2 text-sm"
						value={brief.outcome}
						onChange={(event) =>
							onChange({ ...brief, outcome: event.target.value })
						}
					/>
				</label>
				<label className="text-sm font-medium">
					Investigation priorities (one per line, up to four)
					<textarea
						rows={4}
						className="mt-1 block w-full rounded border p-2 text-sm"
						value={brief.priorities.join("\n")}
						onChange={(event) =>
							onChange({ ...brief, priorities: event.target.value.split("\n") })
						}
					/>
				</label>
				<label className="text-sm font-medium">
					Questions still to resolve (one per line, up to four)
					<textarea
						rows={3}
						className="mt-1 block w-full rounded border p-2 text-sm"
						value={brief.open_questions.join("\n")}
						onChange={(event) =>
							onChange({
								...brief,
								open_questions: event.target.value
									? event.target.value.split("\n")
									: [],
							})
						}
					/>
				</label>
				<fieldset className="space-y-3">
					<legend className="text-sm font-semibold">
						Proposed report outline
					</legend>
					<p className="text-xs text-neutral-600">
						Review the outline if you change the represented party or
						deliverable. These sections have not been applied to your report.
					</p>
					{brief.sections.map((section, index) => (
						<div
							key={["first", "second", "third", "fourth", "fifth"][index]}
							className="grid gap-2 rounded-lg border p-3"
						>
							<label className="text-xs">
								Section {index + 1} title
								<input
									maxLength={100}
									className="mt-1 block w-full rounded border p-2 text-sm"
									value={section.title}
									onChange={(event) =>
										onChange({
											...brief,
											sections: brief.sections.map((item, i) =>
												i === index
													? { ...item, title: event.target.value }
													: item,
											),
										})
									}
								/>
							</label>
							<label className="text-xs">
								Section {index + 1} purpose
								<input
									maxLength={400}
									className="mt-1 block w-full rounded border p-2 text-sm"
									value={section.purpose}
									onChange={(event) =>
										onChange({
											...brief,
											sections: brief.sections.map((item, i) =>
												i === index
													? { ...item, purpose: event.target.value }
													: item,
											),
										})
									}
								/>
							</label>
						</div>
					))}
				</fieldset>
				{!valid && (
					<p className="text-sm text-amber-900">
						Complete the outcome, 1–4 priorities and distinct section
						titles/purposes. Keep each priority or question under 400
						characters.
					</p>
				)}
				<button
					type="button"
					className="primary-button"
					disabled={busy || !valid}
					onClick={onConfirm}
				>
					Agree brief and investigate
				</button>
			</DialogContent>
		</Dialog>
	);
}

export function WorkflowSummary({
	data,
	busy,
	onEdit,
	onOutline,
	onReport,
	reportOpen = false,
}: {
	data: WorkspaceData;
	busy: boolean;
	onEdit: () => void;
	onOutline: () => void;
	onReport: () => void;
	reportOpen?: boolean;
}) {
	const brief = data.brief;
	if (!brief)
		return (
			<p className="text-xs text-neutral-600">
				Plan your work to agree who you represent, what matters and the document
				you want to produce. Existing saved work remains available.
			</p>
		);
	const current = briefIsCurrent(data);
	const reviewed = reviewIsCurrent(data);
	const outlined = briefKey(brief) === briefKey(data.report_brief);
	return (
		<div className="space-y-3">
			<details className="rounded-xl border border-teal-200 bg-teal-50 p-4">
				<summary className="cursor-pointer text-sm font-semibold">
					{deliverableNames[brief.deliverable]} · {brief.client_role} ·{" "}
					{current
						? reviewed
							? outlined
								? "Ready to build"
								: "Investigation ready"
							: "Investigation needed"
						: "Goal changed"}
				</summary>
				<div className="mt-3 space-y-3 text-sm">
					<p>{brief.outcome}</p>
					<ol
						className="flex flex-wrap gap-x-5 gap-y-1 text-xs text-teal-950"
						aria-label="Workflow progress"
					>
						<li>1. {current ? "Brief agreed" : "Agree new brief"}</li>
						<li>2. {reviewed ? "Investigated" : "Investigate evidence"}</li>
						<li>3. {outlined ? "Outline applied" : "Apply outline"}</li>
						<li>4. Draft and review</li>
					</ol>
					{!current && (
						<p className="text-amber-900">
							The objective has changed. Plan and agree the new brief before
							drafting or continuing contextual chat.
						</p>
					)}
					{current && !reviewed && (
						<p className="text-amber-900">
							Findings reflect an earlier brief. Investigate this brief before
							adding evidence or drafting.
						</p>
					)}
					<div className="grid gap-4 md:grid-cols-2">
						<div>
							<h3 className="font-medium">Investigation priorities</h3>
							<ul className="mt-1 list-disc space-y-1 pl-5">
								{brief.priorities.map((item) => (
									<li key={item}>{item}</li>
								))}
							</ul>
							{!!brief.open_questions.length && (
								<>
									<h3 className="mt-3 font-medium">Context still needed</h3>
									<ul className="mt-1 list-disc space-y-1 pl-5">
										{brief.open_questions.map((item) => (
											<li key={item}>{item}</li>
										))}
									</ul>
								</>
							)}
						</div>
						<div>
							<h3 className="font-medium">Your proposed outline</h3>
							<ol className="mt-1 list-decimal space-y-1 pl-5">
								{brief.sections.map((item) => (
									<li key={item.title}>{item.title}</li>
								))}
							</ol>
						</div>
					</div>
					<div className="flex flex-wrap gap-2">
						<button
							type="button"
							className="toolbar-button"
							disabled={busy || !current}
							onClick={onEdit}
						>
							Edit agreed brief
						</button>
					</div>
					<p className="text-xs text-neutral-600">
						Applying an outline is explicit. Existing report text is saved as a
						revision before replacement. Save the workspace to retain the latest
						brief and work.
					</p>
				</div>
			</details>
			<div className="flex flex-wrap gap-2">
				{" "}
				{!outlined ? (
					<button
						type="button"
						className="primary-button"
						disabled={busy || !current || !reviewed}
						onClick={onOutline}
					>
						Use this report outline
					</button>
				) : !reportOpen ? (
					<button
						type="button"
						className="toolbar-button"
						disabled={busy}
						onClick={onReport}
					>
						Continue to report
					</button>
				) : null}
			</div>
		</div>
	);
}
