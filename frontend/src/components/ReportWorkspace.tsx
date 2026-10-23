import { Info, LoaderCircle, Target } from "lucide-react";
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
	type MatterBrief,
	type TaskContext,
	type Workflow,
	type WorkspaceData,
	briefIsCurrent,
	emptyWorkspace,
	evidenceOf,
	reportIsCurrent,
	reviewIsCurrent,
	workspaceRequest,
} from "../lib/workspace";
import type { Document } from "../types";
import { AttentionPanel } from "./AttentionPanel";
import { CopyWorkspaceLink } from "./CopyWorkspaceLink";
import { EmptyState } from "./EmptyState";
import { IntentStart } from "./IntentStart";
import { ReportDestination } from "./ReportDestination";
import { ReportTray } from "./ReportTray";
import { RevisionHistory } from "./RevisionHistory";
import { SidebarTools } from "./SidebarTools";
import { SourceCitation } from "./SourceCitation";
import { BriefReview, WorkflowSummary } from "./WorkflowBrief";
import { WorkflowChoices } from "./WorkflowChoices";
import { useWorkflowConfirmation } from "./WorkflowConfirmation";
import { WorkspaceMomentum } from "./WorkspaceMomentum";
import {
	Tooltip,
	TooltipContent,
	TooltipProvider,
	TooltipTrigger,
} from "./ui/tooltip";

interface Props {
	onStageChange?: (
		stage: "loading" | "setup" | "working",
		view: "risk" | "report" | "chat",
	) => void;
	onUpload?: (file: File) => void;
	uploading?: boolean;
	conversationId: string;
	document: Document | null;
	onCitation: (quote: string) => void;
	onDirty: (dirty: boolean) => void;
	children: ReactNode | ((context: TaskContext) => ReactNode);
}

export function ReportWorkspace({
	onStageChange,
	onUpload,
	uploading = false,
	conversationId,
	document,
	onCitation,
	onDirty,
	children,
}: Props) {
	const { preferences } = usePreferences();
	const { confirm, dialog: confirmationDialog } = useWorkflowConfirmation();
	const [data, setData] = useState<WorkspaceData>(emptyWorkspace);
	const [briefProposal, setBriefProposal] = useState<MatterBrief | null>(null);
	const [briefOpen, setBriefOpen] = useState(false);
	const [loaded, setLoaded] = useState(false);
	const [dirty, setDirty] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [busy, setBusy] = useState<string | null>(null);
	useEffect(() => {
		if (busy === "review")
			window.document
				.getElementById("review-progress")
				?.scrollIntoView?.({ block: "nearest" });
	}, [busy]);
	const [search, setSearch] = useSearchParams();
	const location = useLocation();
	const initialIntent = useRef(location.state?.initialIntent);
	const uploadFirst = useRef(location.state?.startWithUpload === true);
	const [setupReady, setSetupReady] = useState(false);
	const [editingIntent, setEditingIntent] = useState(false);
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
	const workReady =
		!!document &&
		!!(data.brief || data.review_objective || data.findings.length);
	useEffect(
		() =>
			onStageChange?.(
				!loaded ? "loading" : workReady ? "working" : "setup",
				activeView,
			),
		[loaded, workReady, onStageChange, activeView],
	);
	const previousView = useRef(activeView);
	useEffect(() => {
		const changed = previousView.current !== activeView;
		previousView.current = activeView;
		if (!changed || !loaded || !workReady || search.get("source") === "1")
			return;
		const heading = window.document.getElementById(`view-${activeView}`);
		heading?.focus({ preventScroll: true });
		heading?.scrollIntoView?.({ block: "start" });
	}, [activeView, loaded, workReady, search]);
	const [objectiveHelpOpen, setObjectiveHelpOpen] = useState(false);
	const [activeFinding, setActiveFinding] = useState(0);
	const findingRefs = useRef<(HTMLElement | null)[]>([]);
	const [target, setTarget] = useState(1);
	const [reportNotice, setReportNotice] = useState("");
	useEffect(() => {
		setTarget((current) =>
			Math.min(current, Math.max(0, data.sections.length - 1)),
		);
	}, [data.sections.length]);
	const [instruction, setInstruction] = useState(
		"Draft this section for the client using the linked evidence and my objective.",
	);
	const [proposal, setProposal] = useState<{
		index: number;
		content: string;
	} | null>(null);

	const controller = useRef<AbortController | null>(null);

	useEffect(() => {
		const key = new URLSearchParams(location.search).get("citation");
		const finding = data.findings
			.flatMap(evidenceOf)
			.find(
				(item) =>
					citationKey(item) === key &&
					item.page === pageFromSearch(location.search),
			);
		onCitation(finding?.quote ?? "");
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
					const seed = initialIntent.current;
					const seeded =
						!saved.version &&
						!saved.objective &&
						seed &&
						(seed.workflow === null ||
							["risk", "report"].includes(seed.workflow)) &&
						typeof seed.objective === "string" &&
						(uploadFirst.current || seed.objective.trim().length >= 5) &&
						seed.objective.length <= 2000;
					setData(
						seeded
							? {
									...saved,
									objective: seed.objective.trim(),
									workflow: seed.workflow,
									time_pressure: seed.time_pressure === true,
								}
							: saved,
					);
					setSetupReady(
						!!(
							uploadFirst.current ||
							seeded ||
							saved.objective.trim().length >= 5
						),
					);
					setLoaded(true);
					setDirty(
						!!(
							seeded &&
							(seed.objective.trim() || seed.workflow || seed.time_pressure)
						),
					);
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
	const briefCurrent = briefIsCurrent(data);
	const reviewCurrent = reviewIsCurrent(data);
	const reportCurrent = reportIsCurrent(data);
	const objectiveHelp = !briefCurrent
		? "The agent will propose a brief and outline for you to check. Planning does not replace your work."
		: reviewCurrent
			? "The investigation reflects your agreed brief. Edit the brief to change direction."
			: "Investigate the agreed brief to refresh the evidence. Your report text will be preserved.";
	const planNeeded = !briefCurrent;
	const purposeLocked =
		!!(data.brief || data.review_objective) && !data.purpose_unlocked;
	const unlockPurpose = async () => {
		if (busy || !loaded) return false;
		if (
			!(await confirm({
				title: "Change workspace purpose?",
				description:
					"Existing findings and report text will be preserved. Drafting, contextual chat and download will pause until you agree the brief and re-run the investigation.",
				action: "Unlock purpose",
			}))
		)
			return false;
		change({
			...data,
			purpose_unlocked: true,
			workflow: data.workflow ?? data.brief?.workflow ?? "risk",
		});
		return true;
	};
	useEffect(() => {
		if (data.purpose_unlocked && !briefOpen)
			window.document.getElementById("objective")?.focus();
	}, [data.purpose_unlocked, briefOpen]);
	const selectedWorkflow = data.workflow ?? data.brief?.workflow;
	const workflow = selectedWorkflow ?? "risk";
	const selectWorkflow = async (nextWorkflow: Workflow) => {
		if (
			busy ||
			!loaded ||
			(data.workflow === nextWorkflow && !data.purpose_unlocked)
		)
			return;
		if (purposeLocked && !(await unlockPurpose())) return;
		change({
			...data,
			workflow: nextWorkflow,
			purpose_unlocked: purposeLocked || !!data.purpose_unlocked,
		});
	};
	const plan = () => {
		if (
			!loaded ||
			busy ||
			(data.objective.trim() && data.objective.trim().length < 5)
		)
			return;
		return run("plan", async (signal) => {
			const result = await workspaceRequest<MatterBrief>(
				conversationId,
				"plan",
				{
					objective: data.objective,
					workflow: data.workflow ?? data.brief?.workflow ?? "risk",
					...(data.time_pressure ? { time_pressure: true } : {}),
				},
				signal,
			);
			if (!signal.aborted) {
				if (!data.objective.trim())
					change({ ...data, objective: result.objective });
				setBriefProposal(result);
				setBriefOpen(true);
			}
		});
	};
	const reviewFor = async (
		current: WorkspaceData,
		replacementConfirmed = false,
	) => {
		if (
			!loaded ||
			busy ||
			current.objective.trim().length < 5 ||
			(current.brief && !briefIsCurrent(current))
		)
			return;
		if (
			current.findings.length &&
			!replacementConfirmed &&
			!(await confirm({
				title: "Replace existing findings?",
				description:
					"Your report text will stay. Its evidence attachments will be cleared so you can link findings from the new investigation.",
				action: "Replace and investigate",
			}))
		)
			return;
		setReportNotice("");
		run("review", async (signal) => {
			const result = await workspaceRequest<{
				findings: Finding[];
				gaps: string[];
			}>(
				conversationId,
				"review",
				{ objective: current.objective, brief: current.brief ?? null },
				signal,
			);
			if (!signal.aborted)
				change({
					...current,
					...result,
					review_objective: current.objective,
					purpose_unlocked: false,
					review_brief: current.brief ?? null,
					reviewed_ids: [],
					sections: current.sections.map((section) => ({
						...section,
						finding_ids: [],
					})),
				});
		});
	};
	const acceptBrief = async () => {
		if (
			!briefProposal ||
			briefProposal.objective.trim() !== data.objective.trim()
		)
			return;
		if (
			data.findings.length &&
			!(await confirm({
				title: "Investigate this brief?",
				description:
					"This will replace existing findings. Your report text will stay, but its evidence attachments will be cleared. You can cancel and keep your current work.",
				action: "Replace and investigate",
			}))
		)
			return;
		const next = {
			...data,
			workflow: briefProposal.workflow ?? data.workflow,
			brief: briefProposal,
		};
		change(next);
		setBriefOpen(false);
		reviewFor(next, true);
	};
	const applyOutline = async () => {
		const brief = data.brief;
		if (!brief || !briefCurrent || !reviewCurrent) return;
		const hasWork = data.sections.some(
			(section) => section.content.trim() || section.finding_ids.length,
		);
		if (
			hasWork &&
			!(await confirm({
				title: "Apply the new report outline?",
				description:
					"Your current report will be saved as a recoverable revision before its sections are replaced with this outline.",
				action: "Save and apply outline",
			}))
		)
			return;
		run("outline", async (signal) => {
			const base = hasWork
				? await workspaceRequest<WorkspaceData>(
						conversationId,
						"workspace",
						data,
						signal,
						"PUT",
					)
				: data;
			if (!signal.aborted) {
				change({
					...base,
					report_brief: brief,
					sections: brief.sections.map((section) => ({
						...section,
						content: "",
						finding_ids: [],
					})),
					intent: "report",
				});
				setTarget(1);
				chooseView("report");
			}
		});
	};

	const add = (id: number, sectionIndex = target) => {
		if (!data.findings[id] || !reviewCurrent) return;
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
		setReportNotice(`Added “${finding.title}” to ${section.title}.`);
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
			if (!section || !reportCurrent) return;
			const result = await workspaceRequest<{ content: string }>(
				conversationId,
				"draft",
				{
					title: section.title,
					purpose: section.purpose ?? "",
					purpose_unlocked: !!data.purpose_unlocked,
					brief: data.brief ?? null,
					review_brief: data.review_brief ?? null,
					report_brief: data.report_brief ?? null,
					objective: data.objective,
					instruction,
					current_text: section.content,
					findings: section.finding_ids.map((id) => data.findings[id]),
				},
				signal,
			);
			if (!signal.aborted) setProposal({ index, content: result.content });
		});
	const exportPdf = () =>
		run("export", async (signal) => {
			if (dirty || !reportCurrent) return;
			const response = await fetch(
				`/api/conversations/${conversationId}/workspace/export?format=pdf`,
				{ signal },
			);
			if (!response.ok)
				throw new Error(
					"Could not export PDF. Save the report and check its agreed brief before retrying.",
				);
			const blob = await response.blob();
			if (signal.aborted) return;
			const url = URL.createObjectURL(blob);
			const anchor = window.document.createElement("a");
			anchor.href = url;
			anchor.download = "document-review.pdf";
			window.document.body.appendChild(anchor);
			anchor.click();
			anchor.remove();
			setTimeout(() => URL.revokeObjectURL(url), 1000);
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
	const chatContent =
		typeof children === "function"
			? children({
					objective: data.objective,
					brief: briefCurrent ? (data.brief ?? null) : null,
					blocked: !!data.purpose_unlocked || (!!data.brief && !briefCurrent),
				})
			: children;
	const tools = (
		<SidebarTools>
			<output className="block text-xs text-neutral-400">
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
						!reportCurrent ||
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
							Downloads the last saved report as a Markdown (.md) text file with
							source references. Save your changes first. You can open it in a
							text editor; Use Export PDF in the report tray for a PDF copy.
							Word export remains planned.
						</TooltipContent>
					</Tooltip>
				</TooltipProvider>
				<CopyWorkspaceLink />
			</fieldset>
			<WorkspaceMomentum
				dirty={dirty}
				data={data}
				onReport={() => chooseView("report")}
				onSave={save}
				disabled={!!busy || !loaded}
			/>
		</SidebarTools>
	);
	if (requestedView === "chat" && !workReady)
		return (
			<div className="flex min-h-0 flex-1 flex-col">
				{tools}
				<div className="flex shrink-0 items-center justify-between border-b p-4">
					<h2>Document chat</h2>
					<button
						type="button"
						className="quiet-button"
						onClick={() => chooseView("risk")}
					>
						Set an objective instead
					</button>
				</div>
				{chatContent}
			</div>
		);
	if (!document)
		return (
			<div className="review-workspace flex min-h-0 flex-1 flex-col overflow-y-auto">
				{tools}
				{!setupReady || editingIntent ? (
					<IntentStart
						onChat={() => chooseView("chat")}
						workflow={selectedWorkflow ?? null}
						objective={data.objective}
						disabled={!loaded}
						onWorkflow={(value) => change({ ...data, workflow: value })}
						onObjective={(value) => change({ ...data, objective: value })}
						onContinue={() => {
							change({ ...data, workflow });
							setSetupReady(true);
							setEditingIntent(false);
						}}
						action="Add document context"
					/>
				) : (
					<div className="mx-auto flex w-full max-w-2xl flex-1 flex-col justify-center gap-6 px-5 py-10">
						{data.objective && (
							<div>
								<p className="text-xs font-semibold uppercase tracking-widest text-blue-300">
									{data.objective
										? "Your objective"
										: "Start with your documents"}
								</p>
								<h2 className="mt-3 text-xl font-medium leading-relaxed">
									{data.objective || "Add a document for context"}
								</h2>
								<button
									type="button"
									className="quiet-button mt-3"
									onClick={() => setEditingIntent(true)}
								>
									Edit objective
								</button>
							</div>
						)}
						{onUpload ? (
							<EmptyState onUpload={onUpload} uploading={uploading} />
						) : (
							chatContent
						)}
					</div>
				)}
			</div>
		);
	const starting =
		!data.brief && !data.review_objective && !data.findings.length;
	if (starting)
		return (
			<div className="review-workspace flex min-h-0 flex-1 flex-col overflow-y-auto">
				{tools}
				<BriefReview
					brief={briefProposal}
					open={briefOpen}
					busy={!!busy}
					onChange={setBriefProposal}
					onClose={() => setBriefOpen(false)}
					onConfirm={acceptBrief}
				/>
				{confirmationDialog}
				<IntentStart
					onChat={() => chooseView("chat")}
					workflow={selectedWorkflow ?? null}
					objective={data.objective}
					disabled={!!busy || !loaded}
					onWorkflow={selectWorkflow}
					onObjective={(value) => change({ ...data, objective: value })}
					onContinue={plan}
					preparing={busy === "plan"}
					action={
						busy
							? "Planning your work…"
							: data.objective.trim()
								? "Plan my work"
								: "Suggest a brief"
					}
				>
					<section
						aria-label="Uploaded document context"
						className="rounded-lg border p-4 text-sm"
					>
						<h3 className="font-medium">Your document context</h3>
						<ul className="mt-2">
							<li>
								{document.filename} · {document.page_count} pages
							</li>
						</ul>
						<p className="mt-2 text-xs text-neutral-400">
							I’ll propose a brief for you to check before investigating. This
							workspace currently supports one document.
						</p>
					</section>
					{error && (
						<p role="alert" className="text-sm text-red-300">
							{error}
						</p>
					)}
				</IntentStart>
			</div>
		);

	return (
		<div className="review-workspace flex min-h-0 flex-1 flex-col bg-neutral-50">
			{tools}
			<BriefReview
				brief={briefProposal}
				open={briefOpen}
				busy={!!busy}
				onChange={setBriefProposal}
				onClose={() => setBriefOpen(false)}
				onConfirm={acceptBrief}
			/>
			{confirmationDialog}

			<header className="workspace-toolbar mx-auto w-full max-w-3xl space-y-4 px-5 py-8 md:px-8">
				<p className="text-xs font-medium uppercase tracking-widest text-blue-300">
					{selectedWorkflow
						? workflow === "report"
							? "Build report"
							: "Assess risk"
						: "Existing brief"}
				</p>
				<h2 className="break-words text-xl font-semibold tracking-tight">
					{document.filename}
				</h2>
				{dirty && (
					<p className="text-xs text-neutral-400">
						Unsaved draft · save in Workspace tools
					</p>
				)}

				{data.purpose_unlocked && (
					<WorkflowChoices
						value={workflow}
						disabled={!!busy || !loaded}
						onChange={selectWorkflow}
					/>
				)}

				<form
					onSubmit={(event) => {
						event.preventDefault();
						if (planNeeded) plan();
						else if (!reviewCurrent) reviewFor(data);
					}}
					className="space-y-2"
				>
					{purposeLocked && (
						<div className="flex flex-wrap items-center justify-between gap-2 text-xs text-teal-950">
							<span>
								Purpose locked · keeps the brief, findings and report aligned
							</span>
							<button
								type="button"
								className="quiet-button"
								disabled={!!busy || !loaded}
								onClick={unlockPurpose}
							>
								Change purpose
							</button>
						</div>
					)}
					<div className="flex items-center gap-2">
						<Target size={15} aria-hidden="true" className="text-neutral-400" />
						<label
							className="text-xs font-medium text-neutral-600"
							htmlFor="objective"
						>
							What are you trying to achieve?
						</label>
						<TooltipProvider>
							<Tooltip
								open={objectiveHelpOpen}
								onOpenChange={setObjectiveHelpOpen}
							>
								<TooltipTrigger asChild>
									<button
										type="button"
										className="inline-flex h-10 w-10 items-center justify-center rounded-md text-neutral-400 hover:bg-neutral-100"
										aria-label="About this brief"
										aria-describedby="objective-help"
										onClick={(event) => {
											event.preventDefault();
											setObjectiveHelpOpen(true);
										}}
									>
										<Info size={15} aria-hidden="true" />
									</button>
								</TooltipTrigger>
								<TooltipContent className="max-w-xs">
									{objectiveHelp}
								</TooltipContent>
							</Tooltip>
						</TooltipProvider>
					</div>

					<div className="flex flex-col gap-2 min-[480px]:flex-row">
						<input
							id="objective"
							aria-describedby="objective-help"
							maxLength={2000}
							disabled={!!busy || !loaded || purposeLocked}
							value={data.objective}
							onChange={(event) =>
								change({ ...data, objective: event.target.value })
							}
							placeholder="e.g. Help my tenant client retain flexibility to exit the lease"
							className="min-w-0 flex-1 rounded-md border px-3 py-2 text-sm"
						/>
						<button
							type="submit"
							className="primary-button inline-flex items-center justify-center gap-2 shrink-0"
							aria-busy={busy === "plan" || busy === "review"}
							disabled={
								!!busy ||
								!loaded ||
								data.objective.trim().length < 5 ||
								(!planNeeded && reviewCurrent)
							}
						>
							{(busy === "plan" || busy === "review") && (
								<LoaderCircle
									aria-hidden="true"
									className="planning-spinner h-4 w-4 animate-spin motion-reduce:animate-none"
								/>
							)}
							{busy === "plan"
								? "Planning your work…"
								: busy === "review"
									? "Investigating…"
									: planNeeded
										? "Plan my work"
										: reviewCurrent
											? "Review up to date"
											: "Investigate brief"}
						</button>
					</div>
					<p id="objective-help" className="sr-only">
						{objectiveHelp}
					</p>
				</form>
				<AttentionPanel items={data.gaps} current={reviewCurrent} />
				<WorkflowSummary
					reportOpen={activeView === "report"}
					data={data}
					busy={!!busy || !loaded}
					onEdit={async () => {
						if (!data.purpose_unlocked && !(await unlockPurpose())) return;
						setBriefProposal(
							data.brief
								? {
										...data.brief,
										workflow: data.workflow ?? data.brief.workflow ?? "risk",
									}
								: null,
						);
						setBriefOpen(true);
					}}
					onOutline={applyOutline}
					onReport={() => chooseView("report")}
				/>

				{data.review_objective && objectiveChanged && (
					<p className="text-xs text-amber-800">
						Objective changed. Existing findings reflect:{" "}
						{data.review_objective}
					</p>
				)}
				{busy === "review" ? (
					<output
						id="review-progress"
						aria-label="Investigation progress"
						className="flex items-start gap-3 rounded-lg border border-blue-200 bg-blue-50 p-4 text-sm"
					>
						<LoaderCircle
							aria-hidden="true"
							className="planning-spinner mt-0.5 h-5 w-5 shrink-0 animate-spin motion-reduce:animate-none"
						/>
						<span>
							<span className="block font-semibold">
								Investigating your agreed brief…
							</span>
							<span className="mt-1 block leading-relaxed">
								I’m preparing your findings and next steps. Searching and
								reading relevant provisions can take up to 100 seconds. Check
								back here shortly, and keep this workspace open while I work.
							</span>
						</span>
					</output>
				) : busy ? (
					<output className="block text-xs text-neutral-600">
						Working on your request. Existing text is preserved.
					</output>
				) : null}
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
			<div
				className={
					chat ? "workspace-question-view flex min-h-0 flex-col" : "hidden"
				}
			>
				<h2 id="view-chat" tabIndex={-1} className="px-5 pt-5 font-semibold">
					Document questions
				</h2>
				{chatContent}
			</div>
			<div
				data-view={activeView}
				className={chat ? "hidden" : "report-layout min-h-0 flex-1"}
			>
				<section
					className="finding-list min-w-0 space-y-6 overflow-y-auto p-5 md:p-8"
					aria-label="Review findings"
				>
					<h2 id="view-risk" tabIndex={-1} className="font-semibold">
						Review findings
					</h2>
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
					{data.brief && !reportCurrent && briefCurrent && reviewCurrent && (
						<div className="rounded-lg border border-blue-200 bg-blue-50 p-4 text-sm">
							<p>
								Your agreed brief has its own report outline. Set up those
								sections before assembling the report.
							</p>
							<button
								type="button"
								className="toolbar-button mt-2"
								disabled={!!busy}
								onClick={applyOutline}
							>
								Set up report sections
							</button>
						</div>
					)}
					{!!data.findings.length && (
						<ReportDestination
							sections={data.sections}
							target={target}
							disabled={!!busy || !reviewCurrent}
							onChange={setTarget}
						/>
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
							draggable={!busy && reviewCurrent}
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
							<SourceCitation finding={finding} />
							<details className="text-xs">
								<summary className="cursor-pointer">
									Inspect source passage
								</summary>
								{evidenceOf(finding).map((source) => (
									<blockquote
										key={citationKey(source)}
										className="mt-2 whitespace-pre-wrap border-l-2 pl-3"
									>
										PDF page {source.page}: {source.quote}
									</blockquote>
								))}
							</details>
							<div className="flex flex-wrap items-center gap-2">
								<button
									type="button"
									className={button}
									disabled={
										!!busy ||
										!reviewCurrent ||
										data.sections[target]?.finding_ids.includes(id)
									}
									onClick={() => add(id)}
								>
									Add to report
								</button>
								<label className="text-xs">
									<input
										type="checkbox"
										disabled={!!busy || !reviewCurrent}
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
				</section>
				{activeView === "report" && (
					<section
						className="report-builder min-w-0 space-y-6 overflow-y-auto p-5 md:p-8"
						aria-label="Report builder"
					>
						<h2 id="view-report" tabIndex={-1} className="font-semibold">
							Write report
						</h2>
						{!reportCurrent && (
							<p className="rounded-lg bg-amber-50 p-3 text-sm text-amber-900">
								This report is preserved from an earlier brief or investigation.
								Agree and investigate the current brief, then apply its outline
								before AI drafting or exporting. Your text remains editable.
							</p>
						)}
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
										if (!busy && reviewCurrent && /^\d+$/.test(value))
											add(Number(value), index);
									}}
									className="report-section space-y-3 rounded-xl border border-neutral-200 bg-white p-5 shadow-sm"
								>
									<h3 className="font-medium">{section.title}</h3>
									{section.purpose && (
										<p className="text-sm text-teal-900">{section.purpose}</p>
									)}
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
											!reportCurrent ||
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
												AI draft — requires lawyer review; not applied
											</strong>
											<p className="text-xs text-neutral-600">
												Check dates, clause references, conditions and
												unsupported claims against the source before accepting.
											</p>
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
			{!chat &&
				(data.findings.length > 0 ||
					data.sections.some((section) => section.content.trim())) && (
					<ReportTray
						sections={data.sections}
						notice={reportNotice}
						dirty={dirty}
						busy={busy}
						canExport={
							reportCurrent &&
							data.sections.some((section) => !!section.content.trim())
						}
						onOpen={() => {
							chooseView("report");
							requestAnimationFrame(() => {
								const heading = window.document.getElementById("view-report");
								heading?.focus({ preventScroll: true });
								heading?.scrollIntoView?.({ block: "start" });
							});
						}}
						onSave={save}
						onExport={exportPdf}
					/>
				)}
		</div>
	);
}
