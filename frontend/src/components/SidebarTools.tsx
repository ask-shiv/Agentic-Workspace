import { type ReactNode, useEffect, useState } from "react";
import { createPortal } from "react-dom";

export function SidebarTools({ children }: { children: ReactNode }) {
	const [target, setTarget] = useState<HTMLElement | null>(null);
	useEffect(() => {
		const locate = () =>
			setTarget(document.getElementById("workspace-actions"));
		locate();
		const observer = new MutationObserver(locate);
		observer.observe(document.body, { childList: true, subtree: true });
		return () => observer.disconnect();
	}, []);
	if (target) return createPortal(children, target);
	if (document.querySelector("[data-workspace-shell]")) return null;
	return <aside aria-label="Workspace tools">{children}</aside>;
}
