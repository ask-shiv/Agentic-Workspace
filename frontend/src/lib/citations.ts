import type { Finding } from "./workspace";

export function citationKey(finding: Pick<Finding, "page" | "quote">): string {
	let hash = 2166136261;
	for (const character of `${finding.page}:${finding.quote.replace(/\s+/g, " ").trim()}`) {
		hash = Math.imul(hash ^ character.charCodeAt(0), 16777619);
	}
	return (hash >>> 0).toString(36);
}

export function citationSearch(search: string, finding: Finding): string {
	const params = new URLSearchParams(search);
	params.set("source", "1");
	params.set("page", String(finding.page));
	params.set("citation", citationKey(finding));
	return `?${params}`;
}

export function pageFromSearch(search: string, maximum?: number): number {
	const value = Number(new URLSearchParams(search).get("page") || 1);
	const page = Number.isSafeInteger(value) && value > 0 ? value : 1;
	return maximum ? Math.min(page, maximum) : page;
}
