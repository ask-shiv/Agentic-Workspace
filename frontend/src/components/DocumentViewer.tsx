import { useEffect, useMemo, useRef, useState } from "react";
import { Document as PDFDocument, Page, pdfjs } from "react-pdf";
import "react-pdf/dist/Page/AnnotationLayer.css";
import "react-pdf/dist/Page/TextLayer.css";
import { getDocumentUrl } from "../lib/api";
import { matchQuote, renderHighlighted } from "../lib/pdf-highlight";
import type { Document } from "../types";

pdfjs.GlobalWorkerOptions.workerSrc = new URL(
	"pdfjs-dist/build/pdf.worker.min.mjs",
	import.meta.url,
).toString();

export function DocumentViewer({
	document,
	page,
	quote,
}: { document: Document; page: number; quote: string }) {
	const container = useRef<HTMLDivElement>(null);
	const [width, setWidth] = useState(360);
	const [items, setItems] = useState<string[]>([]);
	const [error, setError] = useState<string | null>(null);
	const highlights = useMemo(() => matchQuote(items, quote), [items, quote]);
	useEffect(() => {
		const target = container.current;
		if (!target) return;
		const observer = new ResizeObserver((entries) => {
			const entry = entries[0];
			if (entry) setWidth(Math.max(100, entry.contentRect.width));
		});
		observer.observe(target);
		return () => observer.disconnect();
	}, []);
	return (
		<div ref={container} className="min-h-0 min-w-0 flex-1 overflow-auto">
			{error && (
				<p role="alert" className="p-3 text-sm text-red-800">
					{error} Use extracted text if the PDF cannot be rendered.
				</p>
			)}
			<PDFDocument
				file={getDocumentUrl(document.id)}
				loading={<p className="p-4 text-sm">Loading original PDF…</p>}
				onLoadError={(value) => setError(value.message)}
			>
				<Page
					pageNumber={page}
					width={width}
					loading={<p className="p-4 text-sm">Rendering page…</p>}
					onGetTextSuccess={(content) =>
						setItems(
							content.items.map((item) => ("str" in item ? item.str : "")),
						)
					}
					customTextRenderer={({ str, itemIndex }) =>
						renderHighlighted(str, highlights.get(itemIndex))
					}
				/>
			</PDFDocument>
			{quote && (
				<p className="border-t bg-teal-50 p-3 text-xs text-teal-950">
					{highlights.size
						? "The matching source passage is highlighted. The PDF itself is unchanged."
						: "No exact match in the rendered text layer. Compare the reference passage with the original page or extracted text."}
				</p>
			)}
		</div>
	);
}
