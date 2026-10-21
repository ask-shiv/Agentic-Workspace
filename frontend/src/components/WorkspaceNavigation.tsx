import { FileText, Plus, Trash2 } from "lucide-react";
import { Link, NavLink } from "react-router-dom";
import type { Conversation } from "../types";

interface Props {
	conversations: Conversation[];
	loading: boolean;
	onCreate: () => void;
	onFollow?: () => void;
	onDelete?: (id: string) => void;
}

export function WorkspaceNavigation({
	conversations,
	loading,
	onCreate,
	onFollow,
	onDelete,
}: Props) {
	return (
		<nav
			aria-label="Workspace navigation"
			className="workspace-navigation flex h-full w-full lg:w-64 flex-col bg-[#102a2a] text-white"
		>
			<Link
				to="/"
				onClick={onFollow}
				className="flex items-center gap-3 border-b border-white/15 px-5 py-6 text-lg font-semibold tracking-tight"
			>
				<span
					aria-hidden="true"
					className="flex h-9 w-9 items-center justify-center rounded-full border border-teal-300 text-teal-200"
				>
					O
				</span>
				Workspace
			</Link>
			<div className="p-4">
				<button
					type="button"
					className="flex w-full items-center justify-center gap-2 rounded-lg bg-teal-100 px-3 py-3 text-sm font-semibold text-teal-950 hover:bg-white"
					onClick={onCreate}
				>
					<Plus size={17} aria-hidden="true" />
					New workspace
				</button>
			</div>
			<p className="px-5 pb-2 text-xs font-medium uppercase tracking-widest text-teal-100">
				Your documents
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
									{item.title === "New Conversation"
										? "Untitled review"
										: item.title}
								</span>
								<span className="mt-1 block text-xs text-teal-100">
									{item.has_document ? "Document & report" : "Awaiting upload"}
								</span>
							</span>
						</NavLink>
						{onDelete && (
							<button
								type="button"
								aria-label={`Delete workspace ${item.title}`}
								onClick={() => onDelete(item.id)}
								className="absolute right-1 top-3 flex h-8 w-8 items-center justify-center rounded text-teal-100 hover:bg-white/15"
							>
								<Trash2 size={15} aria-hidden="true" />
							</button>
						)}
					</div>
				))}
			</div>
			<div className="border-t border-white/15 px-5 py-4 text-xs leading-relaxed text-teal-100">
				Local workspace
				<br />
				Links are bookmarks, not secure sharing.
			</div>
		</nav>
	);
}
