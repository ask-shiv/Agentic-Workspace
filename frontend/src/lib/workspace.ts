export interface MatterBrief {
	objective: string;
	client_role: "tenant" | "landlord" | "buyer" | "seller" | "unspecified";
	outcome: string;
	deliverable: "client_update" | "negotiation_brief" | "risk_memo";
	priorities: string[];
	open_questions: string[];
	sections: { title: string; purpose: string }[];
}
export interface TaskContext {
	objective: string;
	brief: MatterBrief | null;
	blocked: boolean;
}
export function briefKey(brief?: MatterBrief | null): string {
	return brief
		? JSON.stringify([
				brief.objective.trim(),
				brief.client_role,
				brief.outcome.trim(),
				brief.deliverable,
				brief.priorities.map((item) => item.trim()),
				brief.open_questions.map((item) => item.trim()),
				brief.sections.map((item) => [item.title.trim(), item.purpose.trim()]),
			])
		: "";
}
export function briefIsCurrent(data: WorkspaceData): boolean {
	return !!data.brief && data.brief.objective.trim() === data.objective.trim();
}
export function reviewIsCurrent(data: WorkspaceData): boolean {
	return (
		!data.purpose_unlocked &&
		((!data.review_objective && !data.brief) ||
			data.review_objective.trim() === data.objective.trim()) &&
		(!data.brief ||
			(briefIsCurrent(data) &&
				briefKey(data.brief) === briefKey(data.review_brief)))
	);
}
export function reportIsCurrent(data: WorkspaceData): boolean {
	return (
		reviewIsCurrent(data) &&
		(!data.brief || briefKey(data.brief) === briefKey(data.report_brief))
	);
}
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
	purpose?: string;
	title: string;
	content: string;
	finding_ids: number[];
}
export interface WorkspaceData {
	purpose_unlocked?: boolean;
	brief?: MatterBrief | null;
	review_brief?: MatterBrief | null;
	report_brief?: MatterBrief | null;
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
	brief: null,
	review_brief: null,
	report_brief: null,
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
