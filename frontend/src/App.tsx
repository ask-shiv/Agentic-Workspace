import { useCallback } from "react";
import { ChatSidebar } from "./components/ChatSidebar";
import { ChatWindow } from "./components/ChatWindow";
import { DocumentViewer } from "./components/DocumentViewer";
import { TooltipProvider } from "./components/ui/tooltip";
import { useConversations } from "./hooks/use-conversations";
import { useDocument } from "./hooks/use-document";
import { useMessages } from "./hooks/use-messages";

export default function App() {
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
		await create();
	}, [create]);

	return (
		<TooltipProvider delayDuration={200}>
			<div className="flex h-screen bg-neutral-50">
				<ChatSidebar
					conversations={conversations}
					selectedId={selectedId}
					loading={conversationsLoading}
					onSelect={select}
					onCreate={handleCreate}
					onDelete={remove}
				/>

				<div className="flex min-w-0 flex-1 flex-col">
					{(conversationsError || documentError) && (
						<div role="alert" className="bg-red-50 p-3 text-sm text-red-700">
							{conversationsError || documentError}
						</div>
					)}
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
				</div>
				<DocumentViewer key={document?.id} document={document} />
			</div>
		</TooltipProvider>
	);
}
