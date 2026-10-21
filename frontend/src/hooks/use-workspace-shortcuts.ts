import { useEffect } from "react";
export function useWorkspaceShortcuts(
	enabled: boolean,
	busy: boolean,
	onSave: () => void,
	onView: (view: "risk" | "report") => void,
) {
	useEffect(() => {
		if (!enabled) return;
		const handle = (event: KeyboardEvent) => {
			if (event.defaultPrevented || event.isComposing || event.repeat || busy)
				return;
			if (
				(event.ctrlKey || event.metaKey) &&
				!event.altKey &&
				event.key.toLowerCase() === "s"
			) {
				event.preventDefault();
				onSave();
				return;
			}
			const target = event.target;
			if (
				target instanceof HTMLElement &&
				(target.isContentEditable ||
					target.closest('input,textarea,select,[contenteditable="true"]'))
			)
				return;
			if (event.altKey && event.shiftKey && !event.ctrlKey && !event.metaKey) {
				if (event.code === "Digit1") {
					event.preventDefault();
					onView("risk");
				}
				if (event.code === "Digit2") {
					event.preventDefault();
					onView("report");
				}
			}
		};
		window.addEventListener("keydown", handle);
		return () => window.removeEventListener("keydown", handle);
	}, [enabled, busy, onSave, onView]);
}
