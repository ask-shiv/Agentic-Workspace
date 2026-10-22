export type WorkspaceStage = "loading" | "setup" | "working";
export interface WorkspaceShellContext {
	setWorkspaceStage?: (value: {
		id: string;
		stage: WorkspaceStage;
		view?: "risk" | "report" | "chat";
	}) => void;
	refreshConversations: () => Promise<void>;
	createWorkspace: () => Promise<void>;
}
