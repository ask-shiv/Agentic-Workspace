import { useRef, useState } from "react";
import { useLocation, useNavigate, useOutletContext } from "react-router-dom";
import { IntentStart } from "../components/IntentStart";
import type { WorkspaceShellContext } from "../context/workspace-shell";
import { createConversation, uploadDocument } from "../lib/api";
import type { Workflow } from "../lib/workspace";

export function WorkspaceHome() {
	const location = useLocation();
	return <WorkspaceWelcome key={location.key} />;
}

function WorkspaceWelcome() {
	const { refreshConversations } = useOutletContext<WorkspaceShellContext>();
	const navigate = useNavigate();
	const [workflow, setWorkflow] = useState<Workflow | null>("report");
	const [chatSelected, setChatSelected] = useState(false);
	const [timePressure, setTimePressure] = useState(false);
	const [objective, setObjective] = useState("");
	const [busy, setBusy] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const createdId = useRef<string | null>(null);
	const start = async (uploadFirst = false, file?: File) => {
		if (
			busy ||
			(!uploadFirst &&
				!chatSelected &&
				(!workflow || objective.trim().length < 5))
		)
			return;
		if (file && !file.name.toLowerCase().endsWith(".pdf")) {
			setError("Please add a PDF document.");
			return;
		}
		setBusy(true);
		setError(null);
		try {
			const workspace = createdId.current
				? { id: createdId.current }
				: await createConversation();
			createdId.current = workspace.id;
			if (file) await uploadDocument(workspace.id, file);
			await refreshConversations();
			navigate(
				`/workspaces/${workspace.id}${chatSelected ? "?view=chat" : ""}`,
				{
					state: {
						startWithUpload: uploadFirst,
						initialIntent: {
							workflow,
							objective: objective.trim(),
							time_pressure: timePressure,
						},
					},
				},
			);
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
				onWorkflow={(value) => {
					setChatSelected(false);
					setWorkflow(value);
				}}
				onChat={() => setChatSelected(true)}
				chatSelected={chatSelected}
				onObjective={setObjective}
				onContinue={() => start()}
				onUploadFirst={() => start(true)}
				onFile={(file) => start(true, file)}
				timePressure={timePressure}
				onTimePressure={setTimePressure}
				disabled={busy}
				action={
					busy
						? "Preparing your workspace…"
						: chatSelected
							? "Continue to document chat"
							: "Continue with this objective"
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
