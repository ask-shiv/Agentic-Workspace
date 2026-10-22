import { useCallback, useEffect, useRef, useState } from "react";
import { Document as PDFDocument, Page, pdfjs } from "react-pdf";
import "react-pdf/dist/Page/AnnotationLayer.css";
import "react-pdf/dist/Page/TextLayer.css";
import { getDocumentUrl } from "../lib/api";
import { type HighlightBox, sourceHighlightBoxes } from "../lib/pdf-highlight";
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
	const pageRoot = useRef<HTMLDivElement>(null);
	const [width, setWidth] = useState(360);
	const [error, setError] = useState<string | null>(null);
	const [overlay, setOverlay] = useState<{
		key: string;
		boxes: HighlightBox[];
	} | null>(null);
	const key = JSON.stringify([document.id, page, quote, width]);
	const boxes = overlay?.key === key ? overlay.boxes : [];
	const locate = useCallback(() => {
		if (pageRoot.current)
			setOverlay({ key, boxes: sourceHighlightBoxes(pageRoot.current, quote) });
	}, [key, quote]);
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
			{quote && (
				<output className="border-b bg-amber-50 p-3 text-xs text-amber-950">
					{overlay?.key !== key
						? "Locating the reference in the original page…"
						: boxes.length
							? "Exact passage highlighted with a visual overlay. Original PDF text and bytes are unchanged."
							: "No exact passage found. This reference may combine or alter source text. No highlight has been drawn; compare the reference passage with the original."}
				</output>
			)}
			<div ref={pageRoot} className="relative w-fit">
				<PDFDocument
					file={getDocumentUrl(document.id)}
					loading={<p className="p-4 text-sm">Loading original PDF…</p>}
					onLoadError={(value) => setError(value.message)}
				>
					<Page
						pageNumber={page}
						width={width}
						loading={<p className="p-4 text-sm">Rendering page…</p>}
						onRenderTextLayerSuccess={locate}
					/>
				</PDFDocument>
				<div
					aria-hidden="true"
					className="pointer-events-none absolute inset-0 z-10"
					data-testid="source-highlight-overlay"
				>
					{boxes.map((box) => (
						<div
							key={`${box.left}-${box.top}-${box.width}-${box.height}`}
							className="absolute border-b-2 border-amber-700 bg-yellow-300/30"
							style={box}
						/>
					))}
				</div>
			</div>
		</div>
	);
}
