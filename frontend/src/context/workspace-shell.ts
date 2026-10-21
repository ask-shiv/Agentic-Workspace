export interface WorkspaceShellContext {
	refreshConversations: () => Promise<void>;
	createWorkspace: () => Promise<void>;
}
