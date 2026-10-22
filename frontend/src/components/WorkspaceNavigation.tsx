import {
	FilePenLine,
	FileText,
	Home,
	ListChecks,
	MessageSquare,
	Plus,
	Settings,
	Trash2,
} from "lucide-react";
import { Link, NavLink, useLocation, useMatch } from "react-router-dom";
import type { Conversation } from "../types";

interface Props {
	conversations: Conversation[];
	loading: boolean;
	onCreate: () => void;
	onFollow?: () => void;
	onDelete?: (id: string) => void;
}

function navigationTitle(item: Conversation) {
	return item.title === "New Conversation"
		? item.document_filename?.replace(/\.pdf$/i, "") || "Untitled review"
		: item.title;
}

export function WorkspaceNavigation({
	conversations,
	loading,
	onCreate,
	onFollow,
	onDelete,
}: Props) {
	const match = useMatch("/workspaces/:workspaceId");
	const location = useLocation();
	const view = new URLSearchParams(location.search).get("view") ?? "risk";
	return (
		<nav
			aria-label="Workspace navigation"
			className="workspace-navigation flex h-full w-full lg:w-64 flex-col bg-[#0c1017] text-white"
		>
			<Link
				to="/"
				onClick={onFollow}
				className="flex items-center gap-3 border-b border-white/15 px-5 py-6 text-lg font-semibold tracking-tight"
			>
				<img
					src={new URL("../assets/orbital-logo.svg", import.meta.url).href}
					alt="Orbital"
					width={108}
					height={32}
				/>
				<span className="sr-only">Workspace home</span>
			</Link>
			<div className="p-4">
				<button
					type="button"
					className="flex w-full items-center justify-center gap-2 rounded-lg bg-blue-600 px-3 py-3 text-sm font-semibold text-white hover:bg-blue-500"
					onClick={onCreate}
				>
					<Plus size={17} aria-hidden="true" />
					New workspace
				</button>
			</div>
			<div className="space-y-1 px-3 pb-5">
				<Link to="/" onClick={onFollow} className="sidebar-link">
					<Home aria-hidden="true" size={17} /> Home
				</Link>
				{match &&
					(
						[
							{ view: "risk", label: "Evidence & findings", icon: ListChecks },
							{ view: "report", label: "Working report", icon: FilePenLine },
							{ view: "chat", label: "Ask a follow-up", icon: MessageSquare },
						] as const
					).map((item) => {
						const query = new URLSearchParams(location.search);
						query.set("view", item.view);
						return (
							<Link
								key={item.view}
								to={{ pathname: location.pathname, search: query.toString() }}
								onClick={onFollow}
								aria-current={view === item.view ? "page" : undefined}
								className={`sidebar-link ${view === item.view ? "sidebar-link-active" : ""}`}
							>
								<item.icon aria-hidden="true" size={17} />
								{item.label}
							</Link>
						);
					})}
			</div>
			<p className="px-5 pb-2 text-xs font-medium uppercase tracking-widest text-teal-100">
				Your work
			</p>
			<div className="min-h-0 flex-1 space-y-1 overflow-y-auto px-3 pb-4">
				{loading && (
					<output className="px-2 py-3 text-sm">Loading workspaces…</output>
				)}
				{!loading && !conversations.length && (
					<p className="px-2 py-3 text-sm text-teal-100">
						Uploaded documents and saved reports will appear here.
					</p>
				)}
				{conversations.map((item) => (
					<div key={item.id} className="group relative">
						<NavLink
							key={item.id}
							to={`/workspaces/${item.id}`}
							onClick={onFollow}
							className={({ isActive }) =>
								`flex items-start gap-3 rounded-lg py-3 pl-3 pr-10 text-sm ${isActive ? "bg-white/15 text-white ring-1 ring-inset ring-white/20" : "text-teal-50 hover:bg-white/10"}`
							}
						>
							<FileText
								size={18}
								className="mt-0.5 shrink-0"
								aria-hidden="true"
							/>
							<span className="min-w-0">
								<span className="block break-words font-medium">
									{navigationTitle(item)}
								</span>
								<span className="mt-1 block text-xs text-teal-100">
									{item.has_document ? "Document & report" : "Awaiting upload"}
								</span>
							</span>
						</NavLink>
						{onDelete && (
							<button
								type="button"
								aria-label={`Delete workspace ${navigationTitle(item)}`}
								onClick={() => onDelete(item.id)}
								className="absolute right-1 top-3 flex h-8 w-8 items-center justify-center rounded text-teal-100 hover:bg-white/15"
							>
								<Trash2 size={15} aria-hidden="true" />
							</button>
						)}
					</div>
				))}
			</div>
			{match && (
				<details className="sidebar-tools border-t border-white/10 p-4">
					<summary className="cursor-pointer py-2 text-sm font-medium">
						Workspace tools
					</summary>
					<div id="workspace-actions" className="mt-3 space-y-4" />
				</details>
			)}
			<Link
				to="/settings"
				className="sidebar-link mx-3 mb-3"
				onClick={onFollow}
			>
				<Settings size={17} aria-hidden="true" /> Settings & accessibility
			</Link>
			<div className="border-t border-white/15 px-5 py-4 text-xs leading-relaxed text-teal-100">
				Local workspace
				<br />
				Links are bookmarks, not secure sharing.
			</div>
		</nav>
	);
}
