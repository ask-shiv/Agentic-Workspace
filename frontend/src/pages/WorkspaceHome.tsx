import { ArrowRight, FileSearch, Layers } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import {
	useNavigate,
	useOutletContext,
	useSearchParams,
} from "react-router-dom";
import type { WorkspaceShellContext } from "../context/workspace-shell";
import { createConversation } from "../lib/api";

export function WorkspaceHome() {
	const { createWorkspace, refreshConversations } =
		useOutletContext<WorkspaceShellContext>();
	const [search] = useSearchParams();
	const navigate = useNavigate();
	const pending = useRef<ReturnType<typeof createConversation> | null>(null);
	const [error, setError] = useState<string | null>(null);
	const wantsNew = search.get("new") === "1";
	useEffect(() => {
		if (!wantsNew) {
			pending.current = null;
			return;
		}
		let active = true;
		pending.current ??= createConversation();
		pending.current
			.then(async (workspace) => {
				if (!active) return;
				await refreshConversations();
				if (active) navigate(`/workspaces/${workspace.id}`, { replace: true });
			})
			.catch((err) => {
				if (active)
					setError(
						err instanceof Error ? err.message : "Could not create workspace",
					);
			});
		return () => {
			active = false;
		};
	}, [wantsNew, navigate, refreshConversations]);
	return (
		<div className="mx-auto flex w-full max-w-4xl flex-1 flex-col justify-center px-6 py-12 md:px-12">
			<div className="mb-6 flex h-14 w-14 items-center justify-center rounded-2xl border border-teal-200 bg-teal-50 text-teal-900">
				<Layers size={28} aria-hidden="true" />
			</div>
			<p className="mb-3 text-xs font-semibold uppercase tracking-[0.18em] text-teal-800">
				Your review, your judgment
			</p>
			<h1
				id="page-title"
				tabIndex={-1}
				className="max-w-2xl text-3xl font-semibold leading-tight tracking-tight md:text-4xl"
			>
				Move from a document
				<br className="hidden sm:block" /> to a considered report.
			</h1>
			<p className="mt-5 max-w-xl text-base leading-relaxed text-neutral-600">
				Set the objective. Investigate the evidence. Build a report alongside an
				agent that proposes, while you decide.
			</p>
			{error && (
				<p role="alert" className="mt-4 text-red-800">
					{error}
				</p>
			)}
			<button
				disabled={wantsNew && !error}
				type="button"
				className="primary-button mt-8 self-start"
				onClick={createWorkspace}
			>
				Start a document review <ArrowRight size={17} aria-hidden="true" />
			</button>
			<div className="mt-12 grid gap-4 border-t pt-6 sm:grid-cols-3">
				{[
					["01", "Upload a lease", "One text-based PDF per workspace."],
					[
						"02",
						"Inspect the evidence",
						"Source passages stay connected to findings.",
					],
					[
						"03",
						"Make it your advice",
						"Edit, save and export a working report.",
					],
				].map(([number, title, body]) => (
					<div key={number}>
						<p className="mb-2 text-xs font-medium text-teal-800">{number}</p>
						<h2 className="text-sm font-semibold">{title}</h2>
						<p className="mt-1 text-sm text-neutral-600">{body}</p>
					</div>
				))}
			</div>
			<p className="mt-8 flex items-center gap-2 text-xs text-neutral-600">
				<FileSearch size={15} aria-hidden="true" />
				Local demo. Evidence checks are not legal verification.
			</p>
		</div>
	);
}
