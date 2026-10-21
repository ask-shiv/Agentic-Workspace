import {
	type ReactNode,
	useCallback,
	useEffect,
	useRef,
	useState,
} from "react";
import { useLocation, useSearchParams } from "react-router-dom";
import { citationKey, pageFromSearch } from "../lib/citations";
import {
	type Finding,
	type WorkspaceData,
	emptyWorkspace,
	workspaceRequest,
} from "../lib/workspace";
import type { Document } from "../types";
import { CopyWorkspaceLink } from "./CopyWorkspaceLink";
import { SourceCitation } from "./SourceCitation";

interface Props {
	conversationId: string;
	document: Document | null;
	onCitation: (quote: string) => void;
	onDirty: (dirty: boolean) => void;
	children: ReactNode;
}

export function ReportWorkspace({
	conversationId,
	document,
	onCitation,
	onDirty,
	children,
}: Props) {
	const [data, setData] = useState<WorkspaceData>(emptyWorkspace);
	const [loaded, setLoaded] = useState(false);
	const [dirty, setDirty] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [busy, setBusy] = useState<string | null>(null);
	const [search, setSearch] = useSearchParams();
	const location = useLocation();
	const requestedView = search.get("view");
	const activeView =
		requestedView === "chat" ||
		requestedView === "report" ||
		requestedView === "risk"
			? requestedView
			: data.intent;
	const chat = activeView === "chat";
	const chooseView = (view: "risk" | "report" | "chat") => {
		setSearch((previous) => {
			const next = new URLSearchParams(previous);
			next.set("view", view);
			return next;
		});
		if (view !== "chat") setData((previous) => ({ ...previous, intent: view }));
	};
	const [target, setTarget] = useState(1);
	const [instruction, setInstruction] = useState(
		"Draft this section for the client using the linked evidence and my objective.",
	);
	const [proposal, setProposal] = useState<{
		index: number;
		content: string;
	} | null>(null);
	const [onboarded, setOnboarded] = useState(
		() => localStorage.getItem("orbital-workspace-onboarded") === "yes",
	);
	const controller = useRef<AbortController | null>(null);

	useEffect(() => {
		const key = new URLSearchParams(location.search).get("citation");
		const finding = data.findings.find(
			(item) =>
				citationKey(item) === key &&
				item.page === pageFromSearch(location.search),
		);
		onCitation(
			finding?.evidence_status === "source_checked" ? finding.quote : "",
		);
	}, [data.findings, location.search, onCitation]);

	const load = useCallback(
		async (signal: AbortSignal) => {
			setError(null);
			try {
				const saved = await workspaceRequest<WorkspaceData>(
					conversationId,
					"workspace",
					undefined,
					signal,
				);
				if (!signal.aborted) {
					setData(saved);
					setLoaded(true);
					setDirty(false);
				}
			} catch (err) {
				if (!signal.aborted)
					setError(
						err instanceof Error ? err.message : "Could not load report",
					);
			}
		},
		[conversationId],
	);
	useEffect(() => {
		const scope = new AbortController();
		controller.current = scope;
		load(scope.signal);
		return () => scope.abort();
	}, [load]);
	useEffect(() => {
		onDirty(dirty);
		return () => onDirty(false);
	}, [dirty, onDirty]);
	useEffect(() => {
		const warn = (event: BeforeUnloadEvent) => {
			if (dirty) event.preventDefault();
		};
		window.addEventListener("beforeunload", warn);
		return () => window.removeEventListener("beforeunload", warn);
	}, [dirty]);
	const change = (next: WorkspaceData) => {
		setData(next);
		setDirty(true);
		setProposal(null);
	};
	const run = async (
		kind: string,
		task: (signal: AbortSignal) => Promise<void>,
	) => {
		const signal = controller.current?.signal;
		if (!signal || signal.aborted || busy) return;
		setError(null);
		setProposal(null);
		setBusy(kind);
		try {
			await task(signal);
		} catch (err) {
			if (!signal.aborted)
				setError(err instanceof Error ? err.message : "Request failed");
		} finally {
			if (!signal.aborted) setBusy(null);
		}
	};
	const review = () => {
		if (
			data.findings.length &&
			!window.confirm(
				"Replace the findings? Existing report text will stay, but its evidence attachments will be cleared.",
			)
		)
			return;
		run("review", async (signal) => {
			const result = await workspaceRequest<{
				findings: Finding[];
				gaps: string[];
			}>(conversationId, "review", { objective: data.objective }, signal);
			if (!signal.aborted)
				change({
					...data,
					...result,
					review_objective: data.objective,
					reviewed_ids: [],
					sections: data.sections.map((s) => ({ ...s, finding_ids: [] })),
				});
		});
	};
	const add = (id: number, sectionIndex = target) => {
		if (!data.findings[id]) return;
		const finding = data.findings[id];
		const section = data.sections[sectionIndex];
		if (!section || section.finding_ids.includes(id)) return;
		const content = [
			section.content,
			`${finding.title}\n${finding.interpretation}\nClient relevance: ${finding.relevance}\nNext step: ${finding.next_step}\nNeeds review: ${finding.uncertainty}\n[PDF page ${finding.page}]`,
		]
			.filter(Boolean)
			.join("\n\n");
		if (content.length > 20000) {
			setError(
				"This section would exceed 20,000 characters. Shorten it or choose another section.",
			);
			return;
		}
		change({
			...data,
			sections: data.sections.map((s, index) =>
				index === sectionIndex
					? { ...s, finding_ids: [...s.finding_ids, id], content }
					: s,
			),
		});
	};
	const save = () =>
		run("save", async (signal) => {
			const result = await workspaceRequest<WorkspaceData>(
				conversationId,
				"workspace",
				data,
				signal,
				"PUT",
			);
			if (!signal.aborted) {
				setData(result);
				setDirty(false);
			}
		});
	const draft = (index: number) =>
		run("draft", async (signal) => {
			const section = data.sections[index];
			if (!section) return;
			const result = await workspaceRequest<{ content: string }>(
				conversationId,
				"draft",
				{
					title: section.title,
					objective: data.objective,
					instruction,
					current_text: section.content,
					findings: section.finding_ids.map((id) => data.findings[id]),
				},
				signal,
			);
			if (!signal.aborted) setProposal({ index, content: result.content });
		});
	const download = () => {
		const anchor = window.document.createElement("a");
		anchor.href = `/api/conversations/${conversationId}/workspace/export`;
		anchor.download = "document-review.md";
		window.document.body.appendChild(anchor);
		anchor.click();
		anchor.remove();
	};

	const button =
		"rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm hover:bg-neutral-100 disabled:cursor-not-allowed disabled:opacity-40";
	if (!document) return <>{children}</>;
	return (
		<div className="flex min-h-0 flex-1 flex-col bg-neutral-50">
			{!onboarded && (
				<div className="border-b bg-blue-50 p-4 text-sm text-blue-950">
					<strong>From document to working report.</strong> Set an objective,
					inspect the evidence, and bring findings into your report. AI
					interpretation requires your judgment. Nothing is observed in the
					background.
					<button
						type="button"
						className={`${button} ml-3`}
						onClick={() => {
							localStorage.setItem("orbital-workspace-onboarded", "yes");
							setOnboarded(true);
						}}
					>
						Get started
					</button>
				</div>
			)}
			<header className="space-y-3 border-b bg-white p-4">
				<CopyWorkspaceLink />
				<div className="flex flex-wrap items-center justify-between gap-2">
					<div
						className="flex rounded-lg bg-neutral-100 p-1"
						aria-label="Workspace intent"
					>
						{(
							[
								["risk", "Assess risk"],
								["report", "Build report"],
							] as const
						).map(([intent, label]) => (
							<button
								type="button"
								key={intent}
								aria-pressed={activeView === intent}
								disabled={!!busy || !loaded}
								className={`rounded-md px-3 py-2 text-sm ${activeView === intent ? "bg-neutral-900 text-white" : "text-neutral-600"}`}
								onClick={() => {
									chooseView(intent);
								}}
							>
								{label}
							</button>
						))}
						<button
							type="button"
							className="px-3 py-2 text-sm"
							aria-pressed={chat}
							onClick={() => chooseView(chat ? data.intent : "chat")}
						>
							Document chat
						</button>
					</div>
					<span className="text-xs text-neutral-500">
						{!loaded
							? "Loading workspace…"
							: dirty
								? "Unsaved changes"
								: `Saved revision ${data.version}`}
					</span>
				</div>
				<label
					className="block text-xs font-medium text-neutral-600"
					htmlFor="objective"
				>
					What are you trying to achieve?
				</label>
				<input
					id="objective"
					maxLength={2000}
					disabled={!!busy || !loaded}
					value={data.objective}
					onChange={(event) =>
						change({ ...data, objective: event.target.value })
					}
					placeholder="e.g. Help my tenant client retain flexibility to exit the lease"
					className="w-full rounded-md border px-3 py-2 text-sm"
				/>
				<div className="flex flex-wrap items-center gap-2">
					<button
						type="button"
						className={button}
						onClick={review}
						disabled={!!busy || !loaded || data.objective.trim().length < 5}
					>
						{busy === "review"
							? "Investigating document…"
							: data.findings.length
								? "Run a new review"
								: "Review document"}
					</button>
					<button
						type="button"
						className={button}
						onClick={save}
						disabled={!!busy || !loaded || !dirty}
					>
						{busy === "save" ? "Saving…" : "Save workspace"}
					</button>
					<button
						type="button"
						className={button}
						onClick={download}
						disabled={
							!!busy ||
							!loaded ||
							dirty ||
							!data.sections.some((s) => s.content.trim())
						}
					>
						Export Markdown
					</button>
				</div>
				{data.review_objective && data.review_objective !== data.objective && (
					<p className="text-xs text-amber-800">
						Objective changed. Existing findings reflect:{" "}
						{data.review_objective}
					</p>
				)}
				{busy && (
					<output className="block text-xs text-neutral-600">
						{busy === "review"
							? "Searching and reading relevant provisions. This can take up to 100 seconds."
							: "Working on your request. Existing text is preserved."}
					</output>
				)}
			</header>
			{error && (
				<div role="alert" className="bg-red-50 p-3 text-sm text-red-800">
					{error}{" "}
					<button
						type="button"
						className="underline"
						disabled={!!busy}
						onClick={() => {
							if (
								(!dirty ||
									window.confirm("Discard unsaved changes and reload?")) &&
								controller.current
							)
								load(controller.current.signal);
						}}
					>
						Reload saved workspace
					</button>
				</div>
			)}
			<div className={chat ? "flex min-h-0 flex-1" : "hidden"}>{children}</div>
			<div
				className={
					chat
						? "hidden"
						: `grid min-h-0 flex-1 overflow-auto ${activeView === "report" ? "xl:grid-cols-[minmax(220px,0.8fr)_minmax(300px,1.2fr)]" : "grid-cols-1"}`
				}
			>
				<section
					className="space-y-3 overflow-y-auto p-4"
					aria-label="Review findings"
				>
					<h2 className="font-semibold">Evidence and findings</h2>
					<p className="text-xs text-neutral-500">
						Source checks confirm quotations, not legal conclusions. Review
						before relying on a finding.
					</p>
					{!data.findings.length && (
						<p className="rounded-lg border border-dashed p-6 text-sm text-neutral-500">
							Set your objective and run a review. Findings will stay linked to
							the original PDF.
						</p>
					)}
					{!!data.findings.length && (
						<label className="block text-xs">
							Add findings to{" "}
							<select
								className="ml-2 rounded border p-1"
								value={target}
								onChange={(e) => setTarget(Number(e.target.value))}
							>
								{data.sections.map((s, index) => (
									<option key={s.title} value={index}>
										{s.title}
									</option>
								))}
							</select>
						</label>
					)}
					{data.findings.map((finding, id) => (
						<article
							key={`${finding.title}-${id}`}
							draggable={!busy}
							onDragStart={(e) =>
								e.dataTransfer.setData(
									"application/orbital-finding",
									String(id),
								)
							}
							className="space-y-2 rounded-lg border bg-white p-4"
						>
							<div className="flex flex-wrap gap-2 text-xs">
								<span
									className={
										finding.evidence_status === "source_checked"
											? "text-teal-800"
											: "text-amber-800"
									}
								>
									{finding.evidence_status === "source_checked"
										? "Source checked"
										: "Source unverified"}
								</span>
								<span className="text-neutral-500">
									Interpretation to review
								</span>
							</div>
							<h3 className="text-sm font-semibold">{finding.title}</h3>
							<p className="text-sm">{finding.interpretation}</p>
							<p className="text-xs text-neutral-600">
								<strong>For your objective:</strong> {finding.relevance}
							</p>
							<p className="text-xs text-neutral-600">
								<strong>Next:</strong> {finding.next_step}
							</p>
							<p className="text-xs text-amber-900">
								<strong>Needs checking:</strong>{" "}
								{finding.uncertainty || "Legal interpretation requires review."}
							</p>
							<div className="group relative inline-block">
								<SourceCitation finding={finding} />
								<div className="pointer-events-none absolute bottom-full left-0 z-20 mb-2 hidden w-72 rounded-lg border bg-white p-3 text-xs shadow-lg group-hover:block group-focus-within:block">
									{finding.quote}
								</div>
							</div>
							<details className="text-xs">
								<summary className="cursor-pointer">
									Inspect source passage
								</summary>
								<blockquote className="mt-2 whitespace-pre-wrap border-l-2 pl-3">
									{finding.quote}
								</blockquote>
							</details>
							<div className="flex flex-wrap items-center gap-2">
								<button
									type="button"
									className={button}
									disabled={
										!!busy || data.sections[target]?.finding_ids.includes(id)
									}
									onClick={() => add(id)}
								>
									Add to report
								</button>
								<label className="text-xs">
									<input
										type="checkbox"
										disabled={!!busy}
										checked={data.reviewed_ids.includes(id)}
										onChange={(e) =>
											change({
												...data,
												reviewed_ids: e.target.checked
													? [...data.reviewed_ids, id]
													: data.reviewed_ids.filter((item) => item !== id),
											})
										}
									/>{" "}
									Mark reviewed
								</label>
							</div>
						</article>
					))}
					{!!data.gaps.length && (
						<div className="rounded-lg bg-amber-50 p-4 text-sm">
							<h3 className="font-medium">Outstanding information</h3>
							<ul className="mt-2 list-disc space-y-1 pl-4">
								{data.gaps.map((gap) => (
									<li key={gap}>{gap}</li>
								))}
							</ul>
						</div>
					)}
				</section>
				{activeView === "report" && (
					<section
						className="space-y-4 overflow-y-auto border-l p-4"
						aria-label="Report builder"
					>
						<h2 className="font-semibold">Working report</h2>
						<p className="text-xs text-neutral-500">
							Drag findings here or use “Add to report”. Edited claims need
							re-checking against their attached evidence.
						</p>
						<label className="block text-xs">
							Drafting instruction
							<input
								value={instruction}
								maxLength={2000}
								disabled={!!busy}
								onChange={(e) => setInstruction(e.target.value)}
								className="mt-1 w-full rounded border p-2 text-sm"
							/>
						</label>
						{data.sections.map((section, index) => (
							<div
								key={section.title}
								onDragOver={(e) => e.preventDefault()}
								onDrop={(e) => {
									e.preventDefault();
									const value = e.dataTransfer.getData(
										"application/orbital-finding",
									);
									if (!busy && /^\d+$/.test(value)) add(Number(value), index);
								}}
								className="space-y-2 rounded-lg border bg-white p-4"
							>
								<h3 className="font-medium">{section.title}</h3>
								<textarea
									aria-label={section.title}
									value={section.content}
									maxLength={20000}
									rows={8}
									disabled={!!busy}
									placeholder="Write here or add evidence from the review."
									className="w-full resize-y rounded border p-2 text-sm leading-relaxed"
									onChange={(e) =>
										change({
											...data,
											sections: data.sections.map((s, i) =>
												i === index ? { ...s, content: e.target.value } : s,
											),
										})
									}
								/>
								<div className="flex flex-wrap gap-2">
									{section.finding_ids.map((id) => {
										const finding = data.findings[id];
										return finding ? (
											<SourceCitation key={id} finding={finding} compact />
										) : null;
									})}
								</div>
								<button
									type="button"
									className={button}
									disabled={
										!!busy ||
										!section.finding_ids.length ||
										instruction.trim().length < 3
									}
									onClick={() => draft(index)}
								>
									Propose a draft
								</button>
								{proposal?.index === index && (
									<div className="space-y-3 rounded border border-blue-200 bg-blue-50 p-3">
										<strong className="text-sm">
											Proposed amendment — not applied
										</strong>
										<p className="whitespace-pre-wrap text-sm">
											{proposal.content}
										</p>
										<button
											type="button"
											className={button}
											disabled={!!busy}
											onClick={() =>
												change({
													...data,
													sections: data.sections.map((s, i) =>
														i === index
															? { ...s, content: proposal.content }
															: s,
													),
												})
											}
										>
											Accept amendment
										</button>{" "}
										<button
											type="button"
											className={button}
											onClick={() => setProposal(null)}
										>
											Reject
										</button>
									</div>
								)}
							</div>
						))}
					</section>
				)}
			</div>
		</div>
	);
}
