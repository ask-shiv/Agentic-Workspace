import { useEffect, useState } from "react";
import { usePreferences } from "../context/preferences";
import type { Document } from "../types";
import { DocumentViewer } from "./DocumentViewer";

export function SourcePanel({
	document,
	page,
	quote,
	onPage,
}: {
	document: Document;
	page: number;
	quote: string;
	onPage: (page: number) => void;
}) {
	const { preferences } = usePreferences();
	const [mode, setMode] = useState<"pdf" | "text">(
		preferences.readingMode ? "text" : "pdf",
	);
	const [text, setText] = useState("");
	const [error, setError] = useState<string | null>(null);
	useEffect(() => {
		if (mode !== "text") return;
		const controller = new AbortController();
		setText("");
		setError(null);
		fetch(`/api/documents/${document.id}/pages/${page}`, {
			signal: controller.signal,
		})
			.then(async (response) => {
				if (!response.ok) throw new Error("Could not load the extracted page.");
				const data = await response.json();
				if (!controller.signal.aborted) setText(data.text);
			})
			.catch((value) => {
				if (!controller.signal.aborted)
					setError(
						value instanceof Error ? value.message : "Could not load page",
					);
			});
		return () => controller.abort();
	}, [document.id, page, mode]);
	return (
		<div className="flex min-h-0 min-w-0 flex-1 flex-col">
			<p className="break-words px-4 pt-3 text-sm font-medium">
				{document.filename}
			</p>
			<div className="flex flex-wrap items-center justify-between gap-2 border-b p-3">
				<div className="flex gap-1" aria-label="Source format">
					{(["pdf", "text"] as const).map((value) => (
						<button
							type="button"
							className="toolbar-button"
							key={value}
							aria-pressed={mode === value}
							onClick={() => setMode(value)}
						>
							{value === "pdf" ? "PDF" : "Extracted text"}
						</button>
					))}
				</div>
				<span className="text-xs text-neutral-600">
					Page {page} of {document.page_count}
				</span>
			</div>
			{quote && (
				<details className="border-b bg-amber-50 px-4 py-3 text-sm">
					<summary className="cursor-pointer font-medium">
						Reference passage
					</summary>
					<blockquote className="mt-2 whitespace-pre-wrap border-l-2 border-amber-400 pl-3">
						{quote}
					</blockquote>
				</details>
			)}
			{mode === "pdf" ? (
				<DocumentViewer
					key={`${document.id}-${page}`}
					document={document}
					page={page}
					quote={quote}
				/>
			) : (
				<article
					aria-label={`Extracted text, PDF page ${page}`}
					className="min-h-0 flex-1 overflow-auto p-5"
				>
					<h3 className="mb-3 text-sm font-semibold">
						Extracted text · page {page}
					</h3>
					<p className="mb-4 text-xs text-neutral-600">
						Selectable text for assistive reading tools. Layout and extraction
						may differ from the original PDF.
					</p>
					{error ? (
						<p role="alert">{error}</p>
					) : (
						<p className="whitespace-pre-wrap break-words text-base leading-relaxed">
							{text || "Loading page text…"}
						</p>
					)}
				</article>
			)}
			<div className="flex items-center justify-between border-t p-3">
				<button
					type="button"
					className="toolbar-button"
					disabled={page <= 1}
					onClick={() => onPage(page - 1)}
				>
					Previous page
				</button>
				<button
					type="button"
					className="toolbar-button"
					disabled={page >= document.page_count}
					onClick={() => onPage(page + 1)}
				>
					Next page
				</button>
			</div>
		</div>
	);
}
