import { Loader2 } from "lucide-react";
import { useEffect, useRef } from "react";
import type { Message } from "../types";
import { ChatInput } from "./ChatInput";
import { EmptyState } from "./EmptyState";
import { MessageBubble, StreamingBubble } from "./MessageBubble";

interface ChatWindowProps {
	contextBlocked?: boolean;
	messages: Message[];
	loading: boolean;
	error: string | null;
	streaming: boolean;
	streamingContent: string;
	hasDocument: boolean;
	conversationId: string | null;
	onSend: (content: string) => void;
	onUpload: (file: File) => void;
}

export function ChatWindow({
	messages,
	loading,
	error,
	streaming,
	streamingContent,
	hasDocument,
	conversationId,
	onSend,
	onUpload,
	contextBlocked = false,
}: ChatWindowProps) {
	const scrollRef = useRef<HTMLElement>(null);

	// Auto-scroll to bottom when new messages arrive or during streaming
	const messagesLength = messages.length;
	// biome-ignore lint/correctness/useExhaustiveDependencies: messages and streamingContent are intentional triggers for auto-scroll
	useEffect(() => {
		if (scrollRef.current) {
			scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
		}
	}, [messagesLength, streamingContent]);

	// No conversation selected
	if (!conversationId) {
		return (
			<div className="flex flex-1 items-center justify-center bg-neutral-50">
				<div className="text-center">
					<p className="text-sm text-neutral-400">
						Select a conversation or create a new one
					</p>
				</div>
			</div>
		);
	}

	// Loading messages
	if (loading) {
		return (
			<div className="flex flex-1 items-center justify-center bg-white">
				<Loader2 className="h-6 w-6 animate-spin text-neutral-400" />
			</div>
		);
	}

	// Empty conversation - show upload prompt
	if (messages.length === 0 && !streaming) {
		return (
			<div className="flex min-h-0 flex-1 flex-col overflow-hidden bg-white">
				<div className="flex min-h-0 flex-1 items-center justify-center overflow-y-auto">
					{hasDocument ? (
						<div className="text-center">
							<p className="text-sm text-neutral-500">
								Document uploaded. Ask a question to get started.
							</p>
						</div>
					) : (
						<EmptyState onUpload={onUpload} />
					)}
				</div>
				{contextBlocked && (
					<p className="bg-amber-50 p-3 text-sm text-amber-900">
						Agree the new brief before continuing chat. Previous messages remain
						visible and may relate to the earlier task.
					</p>
				)}
				<ChatInput
					onSend={onSend}
					onUpload={onUpload}
					disabled={streaming || contextBlocked}
					hasDocument={hasDocument}
				/>
			</div>
		);
	}

	return (
		<div className="flex min-h-0 flex-1 flex-col overflow-hidden bg-white">
			{error && (
				<div className="mx-4 mt-2 rounded-lg bg-red-50 px-4 py-2 text-sm text-red-600">
					{error}
				</div>
			)}

			<section
				ref={scrollRef}
				aria-label="Chat messages"
				tabIndex={0}
				className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-6 py-4"
			>
				<div className="mx-auto max-w-2xl space-y-1">
					{messages.map((message) => (
						<MessageBubble key={message.id} message={message} />
					))}
					{streaming && <StreamingBubble content={streamingContent} />}
				</div>
			</section>

			{contextBlocked && (
				<p className="bg-amber-50 p-3 text-sm text-amber-900">
					Agree the new brief before continuing chat. Previous messages remain
					visible and may relate to the earlier task.
				</p>
			)}
			<ChatInput
				onSend={onSend}
				onUpload={onUpload}
				disabled={streaming || contextBlocked}
				hasDocument={hasDocument}
			/>
		</div>
	);
}
