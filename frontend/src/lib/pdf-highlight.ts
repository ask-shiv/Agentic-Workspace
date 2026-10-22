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
		const previous = result.get(position.item);
		result.set(position.item, {
			start: previous?.start ?? position.offset,
			end: position.offset + 1,
		});
	}
	return result;
}
export interface HighlightBox {
	left: number;
	top: number;
	width: number;
	height: number;
}
export function sourceHighlightBoxes(
	root: HTMLElement,
	quote: string,
): HighlightBox[] {
	const spans = Array.from(
		root.querySelectorAll<HTMLElement>(
			'.react-pdf__Page__textContent span[role="presentation"]',
		),
	).filter(
		(span) =>
			span.childNodes.length === 1 &&
			span.firstChild?.nodeType === Node.TEXT_NODE,
	);
	const matches = matchQuote(
		spans.map((span) => span.textContent ?? ""),
		quote,
	);
	const origin = root.getBoundingClientRect();
	const boxes: HighlightBox[] = [];
	for (const [index, match] of matches) {
		const node = spans[index]?.firstChild;
		if (!node) continue;
		const range = document.createRange();
		range.setStart(node, match.start);
		range.setEnd(node, match.end);
		for (const rect of Array.from(range.getClientRects())) {
			if (rect.width > 0 && rect.height > 0)
				boxes.push({
					left: rect.left - origin.left,
					top: rect.top - origin.top,
					width: rect.width,
					height: rect.height,
				});
		}
	}
	return boxes;
}
