import { Info } from "lucide-react";
import {
	type ReactNode,
	useCallback,
	useEffect,
	useRef,
	useState,
} from "react";
import { useLocation, useSearchParams } from "react-router-dom";
import { Streamdown } from "streamdown";
import { usePreferences } from "../context/preferences";
import { useWorkspaceShortcuts } from "../hooks/use-workspace-shortcuts";
import { citationKey, pageFromSearch } from "../lib/citations";
import {
	type Finding,
	type WorkspaceData,
	emptyWorkspace,
	workspaceRequest,
} from "../lib/workspace";
import type { Document } from "../types";
import { CopyWorkspaceLink } from "./CopyWorkspaceLink";
import { RevisionHistory } from "./RevisionHistory";
import { SourceCitation } from "./SourceCitation";
import { WorkspaceMomentum } from "./WorkspaceMomentum";
import {
	Tooltip,
	TooltipContent,
	TooltipProvider,
	TooltipTrigger,
} from "./ui/tooltip";

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
	const { preferences } = usePreferences();
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
	const [activeFinding, setActiveFinding] = useState(0);
	const findingRefs = useRef<(HTMLElement | null)[]>([]);
	const [target, setTarget] = useState(1);
	const [instruction, setInstruction] = useState(
		"Draft this section for the client using the linked evidence and my objective.",
	);
	const [proposal, setProposal] = useState<{
		index: number;
		content: string;
	} | null>(null);
	const [onboarded, setOnboarded] = useState(() => {
		try {
			return localStorage.getItem("orbital-workspace-onboarded") === "yes";
		} catch {
			return false;
		}
	});
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
	const objectiveChanged =
		data.objective.trim() !== data.review_objective.trim();
	const canReview =
		loaded && !busy && data.objective.trim().length >= 5 && objectiveChanged;
	const review = () => {
		if (!canReview) return;
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
	const restore = async (version: number) => {
		if (
			!window.confirm(
				`Restore revision ${version} as a new revision? ${dirty ? "Your unsaved edits will be replaced." : "All saved revisions will remain available."}`,
			)
		)
			return false;
		let restored = false;
		await run("restore", async (signal) => {
			const result = await workspaceRequest<WorkspaceData>(
				conversationId,
				`workspace/revisions/${version}/restore`,
				{ current_version: data.version },
				signal,
			);
			if (!signal.aborted) {
				setData(result);
				setDirty(false);
				setActiveFinding(0);
				restored = true;
			}
		});
		return restored;
	};
	const navigateFinding = (step: number) => {
		if (!data.findings.length || chat) return;
		const next = Math.max(
			0,
			Math.min(data.findings.length - 1, activeFinding + step),
		);
		setActiveFinding(next);
		findingRefs.current[next]?.focus();
	};
	useEffect(() => {
		setActiveFinding((current) =>
			Math.min(current, Math.max(0, data.findings.length - 1)),
		);
	}, [data.findings]);
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

	useWorkspaceShortcuts(
		preferences.shortcuts,
		!!busy || !loaded,
		() => {
			if (dirty) save();
		},
		chooseView,
		navigateFinding,
	);

	const button = "toolbar-button";
	if (!document) return <>{children}</>;
	return (
		<div className="review-workspace flex min-h-0 flex-1 flex-col bg-neutral-50">
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
							setOnboarded(true);
							try {
								localStorage.setItem("orbital-workspace-onboarded", "yes");
							} catch {
								return;
							}
						}}
					>
						Get started
					</button>
				</div>
			)}
			<header className="workspace-toolbar space-y-3 border-b bg-white px-5 py-5 md:px-8">
				<div>
					<p className="mb-1 text-xs font-semibold uppercase tracking-widest text-teal-800">
						Document review
					</p>
					<h2 className="break-words text-xl font-semibold tracking-tight">
						{document.filename}
					</h2>
				</div>
				<div className="flex flex-wrap items-center justify-between gap-2">
					<div
						className="flex max-w-full flex-wrap gap-1 rounded-lg bg-neutral-100 p-1"
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
								aria-keyshortcuts={
									preferences.shortcuts
										? `Alt+Shift+${intent === "risk" ? "1" : "2"}`
										: undefined
								}
								disabled={!!busy || !loaded}
								className={`min-h-10 rounded-md px-3 py-2 text-sm font-medium ${activeView === intent ? "bg-teal-900 text-white shadow-sm" : "text-neutral-700 hover:bg-white"}`}
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
					<output className="text-xs text-neutral-500">
						{!loaded
							? "Loading workspace…"
							: dirty
								? "Unsaved changes"
								: `Saved revision ${data.version}`}
					</output>
					<RevisionHistory
						conversationId={conversationId}
						version={data.version}
						disabled={!!busy || !loaded}
						onRestore={restore}
						restoreError={error}
					/>
				</div>

				<form
					onSubmit={(event) => {
						event.preventDefault();
						review();
					}}
					className="space-y-2"
				>
					<label
						className="block text-xs font-medium text-neutral-600"
						htmlFor="objective"
					>
						What are you trying to achieve?
					</label>
					<div className="flex flex-col gap-2 min-[480px]:flex-row">
						<input
							id="objective"
							aria-describedby="objective-help"
							maxLength={2000}
							disabled={!!busy || !loaded}
							value={data.objective}
							onChange={(event) =>
								change({ ...data, objective: event.target.value })
							}
							placeholder="e.g. Help my tenant client retain flexibility to exit the lease"
							className="min-w-0 flex-1 rounded-md border px-3 py-2 text-sm"
						/>
						<button
							type="submit"
							className="primary-button shrink-0"
							disabled={!canReview}
						>
							{busy === "review"
								? "Updating review…"
								: data.review_objective
									? "Update review"
									: "Review document"}
						</button>
					</div>
					<p id="objective-help" className="text-xs text-neutral-600">
						{data.review_objective && !objectiveChanged
							? "Your review reflects this objective. Edit it to update the review."
							: "Submit your objective to review the document. Editing alone does not run the agent."}
					</p>
				</form>
				<fieldset
					className="flex flex-wrap items-center gap-x-3 gap-y-2 border-t border-neutral-100 pt-2"
					aria-label="Saved workspace actions"
				>
					<button
						type="button"
						className="quiet-button"
						onClick={save}
						aria-keyshortcuts={
							preferences.shortcuts ? "Control+s Meta+s" : undefined
						}
						disabled={!!busy || !loaded || !dirty}
					>
						{busy === "save" ? "Saving…" : "Save workspace"}
					</button>
					<button
						type="button"
						className="quiet-button"
						onClick={download}
						disabled={
							!!busy ||
							!loaded ||
							dirty ||
							!data.sections.some((s) => s.content.trim())
						}
					>
						Download report
					</button>
					<TooltipProvider>
						<Tooltip>
							<TooltipTrigger asChild>
								<button
									type="button"
									className="quiet-button h-10 w-10 px-0"
									aria-label="About downloading your report"
								>
									<Info aria-hidden="true" className="h-4 w-4" />
								</button>
							</TooltipTrigger>
							<TooltipContent className="max-w-72 leading-relaxed">
								Downloads the last saved report as a Markdown (.md) text file
								with source references. Save your changes first. You can open it
								in a text editor; PDF and Word export are planned.
							</TooltipContent>
						</Tooltip>
					</TooltipProvider>
					<CopyWorkspaceLink />
				</fieldset>
				{data.review_objective && objectiveChanged && (
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
			{!chat && (
				<div className="px-5 py-3 md:px-8">
					<WorkspaceMomentum
						dirty={dirty}
						data={data}
						onReport={() => chooseView("report")}
						onSave={save}
						disabled={!!busy || !loaded}
					/>
				</div>
			)}
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
				data-view={activeView}
				className={chat ? "hidden" : "report-layout min-h-0 flex-1"}
			>
				<section
					className="finding-list min-w-0 space-y-6 overflow-y-auto p-5 md:p-8"
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
					{!!data.findings.length && (
						<nav
							aria-label="Finding navigation"
							className="flex flex-wrap items-center gap-3 rounded-lg border bg-white p-3"
						>
							<button
								type="button"
								className={button}
								disabled={!!busy || activeFinding === 0}
								onClick={() => navigateFinding(-1)}
								aria-keyshortcuts="Alt+ArrowUp"
							>
								Previous finding
							</button>
							<output className="text-sm">
								Finding {activeFinding + 1} of {data.findings.length}
							</output>
							<button
								type="button"
								className={button}
								disabled={!!busy || activeFinding >= data.findings.length - 1}
								onClick={() => navigateFinding(1)}
								aria-keyshortcuts="Alt+ArrowDown"
							>
								Next finding
							</button>
							<span className="text-xs text-neutral-600">
								Alt + ↑ / ↓ · outside editors
							</span>
						</nav>
					)}
					{data.findings.map((finding, id) => (
						<article
							key={`${finding.title}-${id}`}
							ref={(element) => {
								findingRefs.current[id] = element;
							}}
							tabIndex={-1}
							aria-label={`Finding ${id + 1}: ${finding.title}`}
							onFocus={() => setActiveFinding(id)}
							data-active={activeFinding === id}
							draggable={!busy}
							onDragStart={(e) =>
								e.dataTransfer.setData(
									"application/orbital-finding",
									String(id),
								)
							}
							className="finding-card space-y-3 rounded-xl border border-neutral-200 bg-white p-5 shadow-sm"
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
						className="report-builder min-w-0 space-y-6 overflow-y-auto p-5 md:p-8"
						aria-label="Report builder"
					>
						<h2 className="font-semibold">Working report</h2>
						<p className="text-xs text-neutral-500">
							Drag findings here, use “Add to report”, or write your own
							section. Source checks cover quotations; edited prose still needs
							your review.
						</p>
						{!preferences.readingMode && (
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
						)}
						{preferences.readingMode ? (
							<article
								aria-label="Readable report"
								className="rounded-xl border bg-white p-6 shadow-sm"
							>
								{data.sections.map((section) => (
									<section key={section.title} className="mb-8">
										<h3 className="mb-3 font-serif text-xl font-semibold">
											{section.title}
										</h3>
										<div className="prose text-base leading-loose">
											<Streamdown
												mode="static"
												controls={false}
												skipHtml
												allowedElements={[
													"p",
													"strong",
													"em",
													"ul",
													"ol",
													"li",
													"blockquote",
													"br",
													"code",
													"a",
												]}
												unwrapDisallowed
											>
												{section.content || "No text in this section yet."}
											</Streamdown>
										</div>
										<div className="mt-3 flex flex-wrap gap-3">
											{section.finding_ids.map((id) => {
												const finding = data.findings[id];
												return finding ? (
													<SourceCitation key={id} finding={finding} compact />
												) : null;
											})}
										</div>
									</section>
								))}
							</article>
						) : (
							data.sections.map((section, index) => (
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
									className="report-section space-y-3 rounded-xl border border-neutral-200 bg-white p-5 shadow-sm"
								>
									<h3 className="font-medium">{section.title}</h3>
									{!section.content.trim() && (
										<p
											id={`section-start-${index}`}
											className="text-sm leading-relaxed text-neutral-600"
										>
											Start with a finding from your review, or write this
											section yourself. To use the agent, add evidence first,
											then choose “Propose a draft”.
										</p>
									)}
									<textarea
										aria-label={section.title}
										value={section.content}
										maxLength={20000}
										rows={section.title === "Introduction" ? 4 : 8}
										disabled={!!busy}
										placeholder={`Write your ${section.title.toLowerCase()} here…`}
										aria-describedby={
											!section.content.trim()
												? `section-start-${index}`
												: undefined
										}
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
							))
						)}
					</section>
				)}
			</div>
		</div>
	);
}
