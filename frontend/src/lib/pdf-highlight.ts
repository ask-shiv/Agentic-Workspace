export interface HighlightRange {
	start: number;
	end: number;
}
export function matchQuote(
	items: string[],
	quote: string,
): Map<number, HighlightRange> {
	const positions: Array<{ item: number; offset: number }> = [];
	let text = "";
	items.forEach((item, index) => {
		for (let offset = 0; offset < item.length; offset++) {
			const character = item[offset] ?? "";
			if (/\s/.test(character)) continue;
			text += character;
			positions.push({ item: index, offset });
		}
	});
	const normalised = quote.replace(/\s/g, "");
	const start = normalised ? text.indexOf(normalised) : -1;
	const result = new Map<number, HighlightRange>();
	if (start < 0) return result;
	for (const position of positions.slice(start, start + normalised.length)) {
		if (position.offset >= (items[position.item]?.length ?? 0)) continue;
		const previous = result.get(position.item);
		result.set(position.item, {
			start: previous?.start ?? position.offset,
			end: position.offset + 1,
		});
	}
	return result;
}
export function renderHighlighted(
	text: string,
	range?: HighlightRange,
): string {
	const escapeHtml = (value: string) =>
		value
			.replace(/&/g, "&amp;")
			.replace(/</g, "&lt;")
			.replace(/>/g, "&gt;")
			.replace(/"/g, "&quot;")
			.replace(/'/g, "&#39;");
	if (!range) return escapeHtml(text);
	return `${escapeHtml(text.slice(0, range.start))}<mark>${escapeHtml(text.slice(range.start, range.end))}</mark>${escapeHtml(text.slice(range.end))}`;
}
