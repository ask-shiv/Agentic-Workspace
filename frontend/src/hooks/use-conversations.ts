import { useCallback, useEffect, useState } from "react";
import * as api from "../lib/api";
import type { Conversation } from "../types";

export function useConversations() {
	const [conversations, setConversations] = useState<Conversation[]>([]);

	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);

	const refresh = useCallback(async () => {
		try {
			setError(null);
			const data = await api.fetchConversations();
			setConversations(data);
		} catch (err) {
			setError(
				err instanceof Error ? err.message : "Failed to load conversations",
			);
		} finally {
			setLoading(false);
		}
	}, []);

	useEffect(() => {
		refresh();
	}, [refresh]);

	const remove = useCallback(async (id: string) => {
		try {
			setError(null);
			await api.deleteConversation(id);
			setConversations((prev) => prev.filter((c) => c.id !== id));
			return true;
		} catch (err) {
			setError(
				err instanceof Error ? err.message : "Failed to delete conversation",
			);
			return false;
		}
	}, []);

	return { conversations, loading, error, remove, refresh };
}
