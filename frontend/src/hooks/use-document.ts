import { useCallback, useEffect, useRef, useState } from "react";
import * as api from "../lib/api";
import type { Document } from "../types";

export function useDocument(conversationId: string | null) {
	const [document, setDocument] = useState<Document | null>(null);
	const [uploading, setUploading] = useState(false);
	const [error, setError] = useState<string | null>(null);

	const scope = useRef<AbortController | null>(null);

	const refresh = useCallback(async () => {
		const controller = scope.current;
		if (!conversationId || !controller || controller.signal.aborted) {
			setDocument(null);
			return;
		}
		try {
			setError(null);
			const detail = await api.fetchConversation(
				conversationId,
				controller.signal,
			);
			if (!controller.signal.aborted) setDocument(detail.document ?? null);
		} catch (err) {
			if (!controller.signal.aborted)
				setError(
					err instanceof Error ? err.message : "Failed to load document",
				);
		}
	}, [conversationId]);

	useEffect(() => {
		const controller = new AbortController();
		scope.current = controller;
		setDocument(null);
		setError(null);
		setUploading(false);
		refresh();
		return () => controller.abort();
	}, [refresh]);

	const upload = useCallback(
		async (file: File) => {
			const controller = scope.current;
			if (!conversationId || !controller || controller.signal.aborted)
				return null;
			try {
				setUploading(true);
				setError(null);
				const doc = await api.uploadDocument(conversationId, file);
				if (controller.signal.aborted) return null;
				setDocument(doc);
				return doc;
			} catch (err) {
				if (!controller.signal.aborted)
					setError(
						err instanceof Error ? err.message : "Failed to upload document",
					);
				return null;
			} finally {
				if (!controller.signal.aborted) setUploading(false);
			}
		},
		[conversationId],
	);

	return {
		document,
		uploading,
		error,
		upload,
		refresh,
	};
}
