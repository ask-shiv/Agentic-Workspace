export type WorkspaceStage = "loading" | "setup" | "working";
export interface WorkspaceShellContext {
	setWorkspaceStage?: (value: { id: string; stage: WorkspaceStage }) => void;
	refreshConversations: () => Promise<void>;
	createWorkspace: () => Promise<void>;
}
