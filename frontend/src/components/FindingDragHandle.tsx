import { GripVertical } from "lucide-react";
import { type PointerEvent, useRef, useState } from "react";
import { createPortal } from "react-dom";

export function FindingDragHandle({
	title,
	disabled,
	onTarget,
	onDrop,
}: {
	title: string;
	disabled: boolean;
	onTarget: (index: number | null) => void;
	onDrop: (index: number) => void;
}) {
	const origin = useRef<{ x: number; y: number } | null>(null);
	const [position, setPosition] = useState<{ x: number; y: number } | null>(
		null,
	);
	const targetAt = (event: PointerEvent<HTMLButtonElement>) => {
		const root = event.currentTarget.closest(".review-workspace");
		const target = event.currentTarget.ownerDocument
			.elementFromPoint(event.clientX, event.clientY)
			?.closest("[data-report-section-index]");
		if (
			!target ||
			!root?.contains(target) ||
			target.getAttribute("aria-disabled") === "true"
		)
			return null;
		const value = target.getAttribute("data-report-section-index");
		return value !== null && /^\d+$/.test(value) ? Number(value) : null;
	};
	const cancel = () => {
		origin.current = null;
		setPosition(null);
		onTarget(null);
	};
	return (
		<>
			<button
				type="button"
				className="finding-drag-handle"
				disabled={disabled}
				draggable={false}
				aria-label={`Drag ${title} to a report section`}
				title="Drag this grip into a report section. You can also use Add to report."
				onPointerDown={(event) => {
					if (disabled || event.button !== 0) return;
					event.preventDefault();
					event.currentTarget.focus();
					origin.current = { x: event.clientX, y: event.clientY };
					event.currentTarget.setPointerCapture(event.pointerId);
				}}
				onPointerMove={(event) => {
					const start = origin.current;
					if (
						!start ||
						disabled ||
						Math.hypot(event.clientX - start.x, event.clientY - start.y) < 6
					)
						return;
					setPosition({ x: event.clientX, y: event.clientY });
					onTarget(targetAt(event));
				}}
				onPointerUp={(event) => {
					const start = origin.current;
					const moved =
						start &&
						Math.hypot(event.clientX - start.x, event.clientY - start.y) >= 6;
					const target = moved && !disabled ? targetAt(event) : null;
					cancel();
					if (event.currentTarget.hasPointerCapture(event.pointerId))
						event.currentTarget.releasePointerCapture(event.pointerId);
					if (target !== null) onDrop(target);
				}}
				onPointerCancel={cancel}
				onLostPointerCapture={cancel}
				onKeyDown={(event) => {
					if (event.key === "Escape") cancel();
				}}
			>
				<GripVertical size={20} aria-hidden="true" /> Drag finding
			</button>
			{position &&
				createPortal(
					<div
						aria-hidden="true"
						className="finding-drag-preview"
						style={{ left: position.x + 12, top: position.y + 12 }}
					>
						{title}
					</div>,
					window.document.body,
				)}
		</>
	);
}
