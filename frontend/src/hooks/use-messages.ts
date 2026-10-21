import { useCallback, useEffect, useRef, useState } from "react";
import * as api from "../lib/api";
import type { Message } from "../types";

export function useMessages(conversationId: string | null) {
	const [messages, setMessages] = useState<Message[]>([]);
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [streaming, setStreaming] = useState(false);
	const [streamingContent, setStreamingContent] = useState("");
	const abortRef = useRef<AbortController | null>(null);
	const sending = useRef(false);

	const refresh = useCallback(async () => {
		if (!conversationId) {
			setMessages([]);
			return;
		}
		try {
			setLoading(true);
			setError(null);
			const controller = abortRef.current;
			const data = await api.fetchMessages(conversationId, controller?.signal);
			if (!controller?.signal.aborted) setMessages(data);
		} catch (err) {
			if (
				!abortRef.current?.signal.aborted &&
				!(err instanceof DOMException && err.name === "AbortError")
			)
				setError(
					err instanceof Error ? err.message : "Failed to load messages",
				);
		} finally {
			if (!abortRef.current?.signal.aborted) setLoading(false);
		}
	}, [conversationId]);

	useEffect(() => {
		const controller = new AbortController();
		abortRef.current = controller;
		sending.current = false;
		setMessages([]);
		setStreaming(false);
		setStreamingContent("");
		setError(null);
		if (!conversationId) {
			setLoading(false);
			return () => controller.abort();
		}
		setLoading(true);
		api
			.fetchMessages(conversationId, controller.signal)
			.then((data) => {
				if (!controller.signal.aborted) setMessages(data);
			})
			.catch((err) => {
				if (!controller.signal.aborted)
					setError(
						err instanceof Error ? err.message : "Failed to load messages",
					);
			})
			.finally(() => {
				if (!controller.signal.aborted) setLoading(false);
			});
		return () => controller.abort();
	}, [conversationId]);

	const send = useCallback(
		async (content: string) => {
			const controller = abortRef.current;
			if (
				!conversationId ||
				!controller ||
				controller.signal.aborted ||
				sending.current
			)
				return;
			sending.current = true;

			const userMessage: Message = {
				id: `temp-${Date.now()}`,
				conversation_id: conversationId,
				role: "user",
				content,
				sources_cited: 0,
				created_at: new Date().toISOString(),
			};

			setMessages((prev) => [...prev, userMessage]);
			setStreaming(true);
			setStreamingContent("");
			setError(null);

			try {
				const response = await api.sendMessage(
					conversationId,
					content,
					controller.signal,
				);

				if (!response.body) {
					throw new Error("No response body");
				}

				const reader = response.body.getReader();
				const decoder = new TextDecoder();
				let accumulated = "";
				let buffer = "";
				let completed = false;

				while (true) {
					const { done, value } = await reader.read();
					if (done) break;
					if (controller.signal.aborted) return;

					buffer += decoder.decode(value, { stream: true });
					const lines = buffer.split("\n");
					// Keep the last potentially incomplete line in the buffer
					buffer = lines.pop() ?? "";

					for (const line of lines) {
						const trimmed = line.trim();
						if (!trimmed || !trimmed.startsWith("data: ")) continue;

						const data = trimmed.slice(6);
						if (data === "[DONE]") continue;

						try {
							const parsed = JSON.parse(data) as {
								type?: string;
								content?: string;
								delta?: string;
								error?: string;
								message?: Message;
							};

							if (parsed.type === "error") {
								setError("Could not generate an answer. Please try again.");
								return;
							}
							if (parsed.type === "done") completed = true;
							if (parsed.type === "delta" && parsed.delta) {
								accumulated += parsed.delta;
								setStreamingContent(accumulated);
							} else if (parsed.type === "content" && parsed.content) {
								accumulated += parsed.content;
								setStreamingContent(accumulated);
							} else if (parsed.type === "message" && parsed.message) {
								// Final message from server
								setMessages((prev) => [...prev, parsed.message as Message]);
								accumulated = "";
							} else if (parsed.content && !parsed.type) {
								// Fallback: plain content field
								accumulated += parsed.content;
								setStreamingContent(accumulated);
							}
						} catch {
							// Skip invalid JSON lines
						}
					}
				}

				if (!completed)
					throw new Error("The response was interrupted. Please try again.");

				// If we accumulated content but never got a final message,
				// create a synthetic assistant message
				if (accumulated) {
					const assistantMessage: Message = {
						id: `stream-${Date.now()}`,
						conversation_id: conversationId,
						role: "assistant",
						content: accumulated,
						sources_cited: 0,
						created_at: new Date().toISOString(),
					};
					setMessages((prev) => [...prev, assistantMessage]);
				}

				// Refresh to get server-canonical messages
				const freshMessages = await api.fetchMessages(
					conversationId,
					controller.signal,
				);
				if (!controller.signal.aborted) setMessages(freshMessages);
			} catch (err) {
				if (
					controller.signal.aborted ||
					(err instanceof DOMException && err.name === "AbortError")
				)
					return;
				setError(err instanceof Error ? err.message : "Failed to send message");
			} finally {
				if (!controller.signal.aborted) {
					sending.current = false;
					setStreaming(false);
					setStreamingContent("");
				}
			}
		},
		[conversationId],
	);

	return {
		messages,
		loading,
		error,
		streaming,
		streamingContent,
		send,
		refresh,
	};
}
