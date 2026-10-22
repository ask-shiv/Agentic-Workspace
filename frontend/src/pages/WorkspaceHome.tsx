import { useState } from "react";
import { useNavigate, useOutletContext } from "react-router-dom";
import { IntentStart } from "../components/IntentStart";
import type { WorkspaceShellContext } from "../context/workspace-shell";
import { createConversation } from "../lib/api";
import type { Workflow } from "../lib/workspace";

export function WorkspaceHome() {
	const { refreshConversations } = useOutletContext<WorkspaceShellContext>();
	const navigate = useNavigate();
	const [workflow, setWorkflow] = useState<Workflow>("risk");
	const [objective, setObjective] = useState("");
	const [busy, setBusy] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const start = async () => {
		if (busy || objective.trim().length < 5) return;
		setBusy(true);
		setError(null);
		try {
			const workspace = await createConversation();
			await refreshConversations();
			navigate(`/workspaces/${workspace.id}`, {
				state: { initialIntent: { workflow, objective: objective.trim() } },
			});
		} catch (error) {
			setError(
				error instanceof Error
					? error.message
					: "Could not start your workspace.",
			);
			setBusy(false);
		}
	};
	return (
		<section
			className="flex min-h-0 flex-1 overflow-y-auto"
			aria-label="Start your work"
		>
			<h1 id="page-title" tabIndex={-1} className="sr-only">
				Start your work
			</h1>
			<IntentStart
				workflow={workflow}
				objective={objective}
				onWorkflow={setWorkflow}
				onObjective={setObjective}
				onContinue={start}
				disabled={busy}
				action={
					busy ? "Preparing your workspace…" : "Continue with this objective"
				}
			>
				{error && (
					<p role="alert" className="text-sm text-red-300">
						{error}
					</p>
				)}
				<p className="text-xs text-neutral-400">
					Next: add a document for context. Nothing is sent to the agent until
					you ask it to plan.
				</p>
			</IntentStart>
		</section>
	);
}
