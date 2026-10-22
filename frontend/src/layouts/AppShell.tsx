import { Menu, PanelRight } from "lucide-react";
import { useEffect, useState } from "react";
import {
	Link,
	Outlet,
	useLocation,
	useMatch,
	useNavigate,
	useSearchParams,
} from "react-router-dom";
import { WorkspaceNavigation } from "../components/WorkspaceNavigation";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogTitle,
} from "../components/ui/dialog";
import { avatarInitials, usePreferences } from "../context/preferences";
import type { WorkspaceStage } from "../context/workspace-shell";
import { useConversations } from "../hooks/use-conversations";
import { useMediaQuery } from "../hooks/use-media-query";

export function AppShell() {
	const { preferences } = usePreferences();
	const { conversations, loading, error, refresh, remove } = useConversations();
	const [mobileNav, setMobileNav] = useState(false);
	const [workspaceStage, setWorkspaceStage] = useState<{
		id: string;
		stage: WorkspaceStage;
		view?: "risk" | "report" | "chat";
	} | null>(null);

	const desktop = useMediaQuery("(min-width: 1024px)");
	const match = useMatch("/workspaces/:workspaceId");
	const [search, setSearch] = useSearchParams();
	const navigate = useNavigate();
	const location = useLocation();
	useEffect(() => {
		setMobileNav(false);
		window.document.title =
			location.pathname === "/settings"
				? "Settings · Agentic Workspace"
				: "Agentic Workspace";
		window.document.getElementById("page-title")?.focus();
	}, [location.pathname]);
	const createWorkspace = async () => {
		setMobileNav(false);
		navigate("/");
	};
	const navigation = (
		<WorkspaceNavigation
			conversations={conversations}
			currentView={
				workspaceStage?.id === match?.params.workspaceId
					? workspaceStage?.view
					: undefined
			}
			workspaceStage={
				workspaceStage?.id === match?.params.workspaceId
					? workspaceStage?.stage
					: "loading"
			}
			loading={loading}
			onCreate={createWorkspace}
			onDelete={async (id) => {
				if (
					!window.confirm(
						"Delete this workspace and its saved report? This cannot be undone in the app.",
					)
				)
					return;
				if (await remove(id)) {
					if (match?.params.workspaceId === id)
						navigate("/", { replace: true, state: { deletedWorkspace: id } });
				}
			}}
			onFollow={() => setMobileNav(false)}
		/>
	);
	return (
		<div
			data-workspace-shell
			className="app-shell flex h-dvh bg-[#10131a] text-neutral-900"
		>
			<a href="#main-content" className="skip-link">
				Skip to workspace content
			</a>
			{desktop && (
				<aside className="min-h-0 overflow-hidden shrink-0 border-r border-teal-950">
					{navigation}
				</aside>
			)}
			{!desktop && (
				<Dialog open={mobileNav} onOpenChange={setMobileNav}>
					<DialogContent className="flex flex-col min-h-0 left-0 top-0 h-dvh w-72 max-w-[90vw] translate-x-0 translate-y-0 gap-0 overflow-hidden rounded-none border-0 bg-[#0c1017] p-0">
						<DialogTitle className="sr-only">Workspaces</DialogTitle>
						<DialogDescription className="sr-only">
							Choose a saved workspace or create one.
						</DialogDescription>
						{navigation}
					</DialogContent>
				</Dialog>
			)}
			<div className="flex min-w-0 flex-1 flex-col">
				<header className="flex min-h-16 shrink-0 items-center justify-between gap-3 border-b border-neutral-200 bg-white px-4 md:px-6">
					<div className="flex min-w-0 items-center gap-3">
						{!desktop && (
							<button
								type="button"
								aria-label="Open workspace navigation"
								aria-expanded={mobileNav}
								className="icon-button"
								onClick={() => setMobileNav(true)}
							>
								<Menu size={20} aria-hidden="true" />
							</button>
						)}
						<Link to="/" className="text-sm font-semibold tracking-tight">
							Orbital
						</Link>
					</div>
					<div className="flex shrink-0 items-center gap-2">
						{match && (
							<button
								type="button"
								className="toolbar-button"
								aria-pressed={search.get("source") === "1"}
								aria-label="Toggle original source"
								onClick={() =>
									setSearch((previous) => {
										const next = new URLSearchParams(previous);
										if (next.get("source") === "1") next.delete("source");
										else next.set("source", "1");
										return next;
									})
								}
							>
								<PanelRight size={16} aria-hidden="true" />
								<span className="hidden sm:inline">Source</span>
							</button>
						)}
						<Link
							to="/settings"
							aria-label={`Display settings for ${preferences.name.trim() || "you"}`}
							className="flex items-center gap-2 rounded-full py-1 pl-2 pr-1 text-sm hover:bg-neutral-100"
						>
							<span className="hidden max-w-32 truncate text-neutral-600 sm:inline">
								{preferences.name.trim() || "Your workspace"}
							</span>
							<span
								aria-hidden="true"
								className="flex h-10 w-10 items-center justify-center rounded-full border border-teal-200 bg-teal-900 text-sm font-semibold text-white"
							>
								{avatarInitials(preferences.name)}
							</span>
						</Link>
					</div>
				</header>
				{error && (
					<p
						role="alert"
						className="border-b bg-red-50 p-3 text-sm text-red-800"
					>
						A workspace request could not finish. Refresh the list to check its
						current state.{" "}
						<button type="button" className="ml-2 underline" onClick={refresh}>
							Refresh workspaces
						</button>
					</p>
				)}
				<main
					id="main-content"
					className="flex min-h-0 min-w-0 flex-1 flex-col"
					tabIndex={-1}
				>
					<Outlet
						context={{
							refreshConversations: refresh,
							createWorkspace,
							setWorkspaceStage,
						}}
					/>
				</main>
			</div>
		</div>
	);
}
