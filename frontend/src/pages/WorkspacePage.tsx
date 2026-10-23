import { useCallback, useState } from "react";
import {
	Link,
	useLocation,
	useOutletContext,
	useParams,
	useSearchParams,
} from "react-router-dom";
import { ChatWindow } from "../components/ChatWindow";
import { ReportWorkspace } from "../components/ReportWorkspace";
import { SourcePanel } from "../components/SourcePanel";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogTitle,
} from "../components/ui/dialog";
import type { WorkspaceShellContext } from "../context/workspace-shell";
import { useDocument } from "../hooks/use-document";
import { useMediaQuery } from "../hooks/use-media-query";
import { useMessages } from "../hooks/use-messages";
import { useUnsavedNavigation } from "../hooks/use-unsaved-navigation";
import { pageFromSearch } from "../lib/citations";
import type { MatterBrief } from "../lib/workspace";
import { NotFoundPage } from "./NotFoundPage";

export function WorkspacePage() {
	const { workspaceId = "" } = useParams();
	return /^[A-Za-z0-9_-]{1,64}$/.test(workspaceId) ? (
		<WorkspaceSession key={workspaceId} id={workspaceId} />
	) : (
		<NotFoundPage />
	);
}

function WorkspaceSession({ id }: { id: string }) {
	const { refreshConversations, setWorkspaceStage } =
		useOutletContext<WorkspaceShellContext>();
	const publishStage = useCallback(
		(
			stage: "loading" | "setup" | "working",
			view?: "risk" | "report" | "chat",
		) => setWorkspaceStage?.({ id, stage, view }),
		[id, setWorkspaceStage],
	);
	const [dirty, setDirty] = useState(false);
	const [quote, setQuote] = useState("");
	const [search, setSearch] = useSearchParams();
	const location = useLocation();
	const desktopSource = useMediaQuery("(min-width: 1200px)");
	const {
		document,
		error,
		uploading,
		upload,
		refresh: refreshDocument,
	} = useDocument(id);
	const {
		messages,
		loading,
		error: messageError,
		streaming,
		streamingContent,
		send,
	} = useMessages(id);
	useUnsavedNavigation(dirty);

	const handleSend = useCallback(
		async (text: string, brief: MatterBrief | null, objective: string) => {
			await send(text, { brief, objective });
			await refreshConversations();
		},
		[send, refreshConversations],
	);
	const handleUpload = useCallback(
		async (file: File) => {
			if (await upload(file)) {
				await refreshDocument();
				await refreshConversations();
			}
		},
		[upload, refreshDocument, refreshConversations],
	);
	const closeSource = () =>
		setSearch((previous) => {
			const next = new URLSearchParams(previous);
			next.delete("source");
			return next;
		});
	const page = pageFromSearch(location.search, document?.page_count);
	const source = document ? (
		<SourcePanel
			document={document}
			contextLabel={
				search.get("view") === "report"
					? "Evidence for your working report"
					: "Evidence for your document review"
			}
			page={page}
			quote={quote}
			onPage={(value) =>
				setSearch((previous) => {
					const next = new URLSearchParams(previous);
					next.set("page", String(value));
					next.delete("citation");
					return next;
				})
			}
		/>
	) : null;
	return (
		<div className="flex min-h-0 min-w-0 flex-1">
			<section
				className="flex min-h-0 min-w-0 flex-1 flex-col"
				aria-label="Document review workspace"
			>
				<h1 id="page-title" tabIndex={-1} className="sr-only">
					Document review workspace
				</h1>
				{error && (
					<div
						role="alert"
						className="m-4 rounded-lg bg-red-50 p-4 text-sm text-red-800"
					>
						{error}
						<p className="mt-2">
							<Link to="/" className="underline">
								Return to workspaces
							</Link>
						</p>
					</div>
				)}
				{uploading && (
					<output className="bg-teal-50 p-3 text-sm">
						Uploading and extracting document…
					</output>
				)}
				{(!error || document) && (
					<ReportWorkspace
						onUpload={handleUpload}
						uploading={uploading}
						conversationId={id}
						onStageChange={publishStage}
						document={document}
						onDirty={setDirty}
						onCitation={setQuote}
					>
						{({ brief, objective, blocked }) => (
							<ChatWindow
								messages={messages}
								loading={loading}
								error={messageError}
								streaming={streaming}
								streamingContent={streamingContent}
								hasDocument={!!document}
								conversationId={id}
								onSend={(text) => handleSend(text, brief, objective)}
								contextBlocked={blocked}
								onUpload={handleUpload}
							/>
						)}
					</ReportWorkspace>
				)}
			</section>
			{document &&
				search.get("source") === "1" &&
				(desktopSource ? (
					<aside
						className="flex w-[clamp(22rem,36vw,28rem)] shrink-0 flex-col border-l bg-white"
						aria-label="Original source document"
					>
						<div className="flex items-center justify-between border-b px-4 py-3">
							<h2 className="text-sm font-semibold">Original source</h2>
							<button
								type="button"
								className="toolbar-button"
								onClick={closeSource}
							>
								Close source
							</button>
						</div>
						{source}
					</aside>
				) : (
					<Dialog
						open
						onOpenChange={(open) => {
							if (!open) closeSource();
						}}
					>
						<DialogContent className="flex h-[94dvh] max-w-2xl flex-col gap-2 overflow-hidden p-4">
							<DialogTitle>Original source</DialogTitle>
							<DialogDescription>
								Inspect the cited passage in the original PDF or accessible
								extracted text.
							</DialogDescription>
							{source}
						</DialogContent>
					</Dialog>
				))}
		</div>
	);
}
