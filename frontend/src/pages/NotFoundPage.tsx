import { Link } from "react-router-dom";
export function NotFoundPage() {
	return (
		<section className="m-auto max-w-lg p-8">
			<h1 id="page-title" tabIndex={-1} className="text-2xl font-semibold">
				This page is not available
			</h1>
			<p className="my-4 text-neutral-600">
				Check the workspace link or choose a saved document from the sidebar.
			</p>
			<Link className="text-teal-900 underline" to="/">
				Back to workspaces
			</Link>
		</section>
	);
}
