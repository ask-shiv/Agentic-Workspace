import { useCallback, useState } from "react";
import { ChatSidebar } from "./components/ChatSidebar";
import { ChatWindow } from "./components/ChatWindow";
import { DocumentViewer } from "./components/DocumentViewer";
import { ReportWorkspace } from "./components/ReportWorkspace";
import { TooltipProvider } from "./components/ui/tooltip";
import { useConversations } from "./hooks/use-conversations";
import { useDocument } from "./hooks/use-document";
import { useMessages } from "./hooks/use-messages";

export default function App() {
	const [showSidebar, setShowSidebar] = useState(
		() => window.innerWidth >= 1100,
	);
	const [showSource, setShowSource] = useState(() => window.innerWidth >= 1400);
	const [dirty, setDirty] = useState(false);
	const [pageRequest, setPageRequest] = useState<{
		page: number;
		nonce: number;
	} | null>(null);
	const navigate = useCallback((page: number) => {
		setPageRequest({ page, nonce: Date.now() });
		setShowSource(true);
	}, []);
	const canLeave = useCallback(
		() => !dirty || window.confirm("Leave without saving report changes?"),
		[dirty],
	);
	const {
		conversations,
		selectedId,
		loading: conversationsLoading,
		error: conversationsError,
		create,
		select,
		remove,
		refresh: refreshConversations,
	} = useConversations();

	const {
		messages,
		loading: messagesLoading,
		error: messagesError,
		streaming,
		streamingContent,
		send,
	} = useMessages(selectedId);

	const {
		document,
		error: documentError,
		upload,
		refresh: refreshDocument,
	} = useDocument(selectedId);

	const handleSend = useCallback(
		async (content: string) => {
			await send(content);
			refreshConversations();
		},
		[send, refreshConversations],
	);

	const handleUpload = useCallback(
		async (file: File) => {
			const doc = await upload(file);
			if (doc) {
				refreshDocument();
				refreshConversations();
			}
		},
		[upload, refreshDocument, refreshConversations],
	);

	const handleCreate = useCallback(async () => {
		if (canLeave()) await create();
		if (window.innerWidth < 1280) setShowSidebar(false);
	}, [create, canLeave]);

	return (
		<TooltipProvider delayDuration={200}>
			<div className="flex h-screen flex-col bg-neutral-50">
				<header className="flex items-center justify-between border-b bg-white px-4 py-2 text-sm">
					<button
						type="button"
						className="rounded border px-3 py-1"
						aria-expanded={showSidebar}
						onClick={() => setShowSidebar(!showSidebar)}
					>
						Conversations
					</button>
					<span className="font-medium">Document workspace</span>
					<button
						type="button"
						className="rounded border px-3 py-1"
						aria-expanded={showSource}
						onClick={() => setShowSource(!showSource)}
					>
						Source PDF
					</button>
				</header>
				<div className="relative flex min-h-0 flex-1">
					{showSidebar && (
						<aside className="absolute inset-y-0 left-0 z-30 flex border-r bg-white xl:static">
							<ChatSidebar
								conversations={conversations}
								selectedId={selectedId}
								loading={conversationsLoading}
								onSelect={(id) => {
									if (id === selectedId || canLeave()) {
										setPageRequest(null);
										if (window.innerWidth < 1280) setShowSidebar(false);
										select(id);
									}
								}}
								onCreate={handleCreate}
								onDelete={(id) => {
									if (id !== selectedId || canLeave()) remove(id);
								}}
							/>
						</aside>
					)}
					<div className="flex min-h-0 min-w-0 flex-1 flex-col">
						{(conversationsError || documentError) && (
							<div role="alert" className="bg-red-50 p-3 text-sm text-red-700">
								{conversationsError || documentError}
							</div>
						)}
						{selectedId ? (
							<ReportWorkspace
								key={selectedId}
								conversationId={selectedId}
								document={document}
								onNavigate={navigate}
								onDirty={setDirty}
							>
								<ChatWindow
									messages={messages}
									loading={messagesLoading}
									error={messagesError}
									streaming={streaming}
									streamingContent={streamingContent}
									hasDocument={!!document}
									conversationId={selectedId}
									onSend={handleSend}
									onUpload={handleUpload}
								/>
							</ReportWorkspace>
						) : (
							<div className="flex flex-1 items-center justify-center text-sm text-neutral-500">
								Create a conversation to start a document review.
							</div>
						)}
					</div>
					{showSource && (
						<aside className="absolute inset-y-0 right-0 z-20 flex max-w-full border-l bg-white 2xl:static">
							<button
								type="button"
								aria-label="Close source PDF"
								onClick={() => setShowSource(false)}
								className="absolute right-2 top-12 z-30 rounded border bg-white px-2 py-1 text-xs"
							>
								Close
							</button>
							<DocumentViewer
								key={document?.id}
								document={document}
								pageRequest={pageRequest}
							/>
						</aside>
					)}
				</div>
			</div>
		</TooltipProvider>
	);
}
