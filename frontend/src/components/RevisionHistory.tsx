import { useEffect, useRef, useState } from "react";
import { type WorkspaceData, workspaceRequest } from "../lib/workspace";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogTitle,
	DialogTrigger,
} from "./ui/dialog";

interface Revision {
	version: number;
	created_at: string;
}
export function RevisionHistory({
	conversationId,
	version,
	disabled,
	onRestore,
	restoreError,
}: {
	conversationId: string;
	version: number;
	disabled: boolean;
	onRestore: (version: number) => Promise<boolean>;
	restoreError: string | null;
}) {
	const [open, setOpen] = useState(false);
	const [revisions, setRevisions] = useState<Revision[]>([]);
	const [preview, setPreview] = useState<WorkspaceData | null>(null);
	const [error, setError] = useState("");
	const [loading, setLoading] = useState(false);
	const request = useRef<AbortController | null>(null);
	useEffect(() => {
		if (!open) return;
		const scope = new AbortController();
		request.current = scope;
		setLoading(true);
		setError("");
		setPreview(null);
		workspaceRequest<Revision[]>(
			conversationId,
			"workspace/revisions",
			undefined,
			scope.signal,
		)
			.then((rows) => {
				if (!scope.signal.aborted) setRevisions(rows);
			})
			.catch((err) => {
				if (!scope.signal.aborted)
					setError(
						err instanceof Error ? err.message : "Could not load history.",
					);
			})
			.finally(() => {
				if (!scope.signal.aborted) setLoading(false);
			});
		return () => scope.abort();
	}, [open, conversationId]);
	const inspect = async (selected: number) => {
		request.current?.abort();
		const scope = new AbortController();
		request.current = scope;
		setLoading(true);
		setError("");
		setPreview(null);
		try {
			const saved = await workspaceRequest<WorkspaceData>(
				conversationId,
				`workspace/revisions/${selected}`,
				undefined,
				scope.signal,
			);
			if (!scope.signal.aborted) setPreview(saved);
		} catch (err) {
			if (!scope.signal.aborted)
				setError(
					err instanceof Error ? err.message : "Could not load revision.",
				);
		} finally {
			if (!scope.signal.aborted) setLoading(false);
		}
	};
	useEffect(() => () => request.current?.abort(), []);
	return (
		<Dialog
			open={open}
			onOpenChange={(next) => {
				if (!disabled) {
					setOpen(next);
					if (!next) request.current?.abort();
				}
			}}
		>
			<DialogTrigger asChild>
				<button
					type="button"
					className="toolbar-button"
					disabled={disabled || version === 0}
					title="View saved revisions, preview earlier work, or restore a copy"
				>
					Revision {version} · History
				</button>
			</DialogTrigger>
			<DialogContent className="max-h-[85dvh] max-w-3xl overflow-y-auto">
				<DialogTitle>Saved revision history</DialogTitle>
				<DialogDescription>
					Preview an earlier workspace. Restoring creates a new revision and
					keeps later saved versions. Unsaved edits will be replaced only after
					you confirm.
				</DialogDescription>
				{(error || restoreError) && (
					<p role="alert" className="text-sm text-red-800">
						{error || restoreError}
					</p>
				)}
				{loading && <output>Loading saved work…</output>}
				{!!revisions.length &&
					Math.min(...revisions.map((item) => item.version)) > 1 && (
						<p className="text-xs text-neutral-600">
							History starts at revision{" "}
							{Math.min(...revisions.map((item) => item.version))}. Earlier
							states were not retained before history was enabled.
						</p>
					)}
				<div className="grid gap-6 sm:grid-cols-[12rem_minmax(0,1fr)]">
					<nav aria-label="Saved revisions" className="space-y-2">
						{!loading && !revisions.length && (
							<p className="text-sm">No revisions saved yet.</p>
						)}
						{revisions.map((item) => (
							<button
								key={item.version}
								type="button"
								className="w-full rounded-lg border p-3 text-left text-sm hover:bg-teal-50"
								disabled={disabled || loading}
								aria-pressed={preview?.version === item.version}
								onClick={() => inspect(item.version)}
							>
								<strong className="block">
									Revision {item.version}
									{item.version === version ? " · Current" : ""}
								</strong>
								<span className="mt-1 block text-xs text-neutral-600">
									Captured {new Date(item.created_at).toLocaleString()}
								</span>
							</button>
						))}
					</nav>
					<section aria-label="Revision preview" className="min-w-0 space-y-4">
						{!preview && (
							<p className="text-sm text-neutral-600">
								Choose a revision to preview its objective, report and findings.
							</p>
						)}
						{preview && (
							<>
								<h3 className="font-semibold">Revision {preview.version}</h3>
								<p className="whitespace-pre-wrap break-words text-sm">
									Objective: {preview.objective || "Not set"}
								</p>
								<p className="text-xs">
									{preview.findings.length} findings ·{" "}
									{preview.reviewed_ids.length} marked reviewed
								</p>
								{preview.sections.map((section) => (
									<div key={section.title}>
										<h4 className="font-serif">{section.title}</h4>
										<p className="mt-2 whitespace-pre-wrap break-words text-sm">
											{section.content || "No text yet."}
										</p>
									</div>
								))}
								{preview.findings.map((finding, index) => (
									<details
										key={`${index}-${finding.title}`}
										className="text-sm"
									>
										<summary>
											{finding.title} · PDF page {finding.page}
										</summary>
										<p className="mt-2 whitespace-pre-wrap">
											{finding.interpretation}
										</p>
										<blockquote className="mt-2 border-l-2 pl-3">
											{finding.quote}
										</blockquote>
									</details>
								))}
								<button
									type="button"
									className="primary-button"
									disabled={disabled || preview.version === version}
									onClick={async () => {
										if (await onRestore(preview.version)) setOpen(false);
									}}
								>
									Restore as a new revision
								</button>
							</>
						)}
					</section>
				</div>
			</DialogContent>
		</Dialog>
	);
}
