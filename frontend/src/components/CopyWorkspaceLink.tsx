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
			setMessage(
				"Workspace address copied. Open it on this computer while the local app is running.",
			);
		} catch {
			setMessage(
				"Copy the address from your browser to bookmark this workspace.",
			);
		}
	};
	return (
		<div className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1">
			<button
				type="button"
				className="quiet-button"
				aria-describedby="workspace-address-help"
				onClick={copy}
			>
				Copy workspace address
			</button>
			<p id="workspace-address-help" className="text-xs text-neutral-600">
				Local bookmark · does not invite collaborators
			</p>
			<output className="w-full text-xs text-neutral-600">{message}</output>
		</div>
	);
}
