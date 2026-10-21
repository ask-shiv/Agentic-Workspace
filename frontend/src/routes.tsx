import { AppShell } from "./layouts/AppShell";
import { NotFoundPage } from "./pages/NotFoundPage";
import { SettingsPage } from "./pages/SettingsPage";
import { WorkspaceHome } from "./pages/WorkspaceHome";
import { WorkspacePage } from "./pages/WorkspacePage";

export const appRoutes = [
	{
		element: <AppShell />,
		children: [
			{ index: true, element: <WorkspaceHome /> },
			{ path: "workspaces/:workspaceId", element: <WorkspacePage /> },
			{ path: "settings", element: <SettingsPage /> },
			{ path: "*", element: <NotFoundPage /> },
		],
	},
];
