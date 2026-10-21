import { useState } from "react";
import { useLocation } from "react-router-dom";

export function CopyWorkspaceLink() {
	const location = useLocation();
	const [message, setMessage] = useState("");
	const copy = async () => {
		try {
			await navigator.clipboard.writeText(
				`${window.location.origin}${location.pathname}${location.search}`,
			);
			setMessage("Local bookmark copied. This does not grant access.");
		} catch {
			setMessage(
				"Copy the address from your browser to bookmark this workspace.",
			);
		}
	};
	return (
		<div className="flex flex-wrap items-center gap-2">
			<button type="button" className="toolbar-button" onClick={copy}>
				Copy local link
			</button>
			<output className="text-xs text-neutral-600">{message}</output>
		</div>
	);
}
