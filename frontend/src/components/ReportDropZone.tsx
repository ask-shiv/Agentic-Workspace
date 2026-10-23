import type { ReactNode } from "react";

export function ReportDropZone({
	title,
	index,
	disabled,
	highlighted,
	children,
}: {
	title: string;
	index: number;
	disabled: boolean;
	highlighted: boolean;
	children: ReactNode;
}) {
	return (
		<section
			aria-label={`Report section: ${title}`}
			aria-disabled={disabled}
			data-report-section-index={index}
			data-drag-over={highlighted && !disabled}
			className="report-section space-y-3 rounded-xl border border-neutral-200 bg-white p-5 shadow-sm"
		>
			{!disabled && (
				<p className="report-drop-hint">Drop a finding into {title}</p>
			)}
			{children}
		</section>
	);
}
