export interface Finding {
	title: string;
	interpretation: string;
	relevance: string;
	next_step: string;
	page: number;
	quote: string;
	uncertainty: string;
	evidence_status: "source_checked" | "unverified";
}
export interface Section {
	title: string;
	content: string;
	finding_ids: number[];
}
export interface WorkspaceData {
	version: number;
	objective: string;
	intent: "risk" | "report";
	findings: Finding[];
	gaps: string[];
	sections: Section[];
	reviewed_ids: number[];
	review_objective: string;
}
export const emptyWorkspace = (): WorkspaceData => ({
	version: 0,
	objective: "",
	intent: "risk",
	findings: [],
	gaps: [],
	reviewed_ids: [],
	review_objective: "",
	sections: ["Introduction", "Key findings", "Outstanding enquiries"].map(
		(title) => ({ title, content: "", finding_ids: [] }),
	),
});
export async function workspaceRequest<T>(
	id: string,
	action: string,
	body?: unknown,
	signal?: AbortSignal,
	method?: string,
): Promise<T> {
	const response = await fetch(`/api/conversations/${id}/${action}`, {
		method: method ?? (body ? "POST" : "GET"),
		headers: { "Content-Type": "application/json" },
		body: body ? JSON.stringify(body) : undefined,
		signal,
	});
	if (!response.ok) {
		const error = await response.json().catch(() => ({}));
		throw new Error(error.detail ?? `Request failed (${response.status})`);
	}
	return response.json();
}
