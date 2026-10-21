export function SettingsPage() {
	return (
		<section className="mx-auto w-full max-w-2xl overflow-auto p-8">
			<h1 id="page-title" tabIndex={-1} className="text-2xl font-semibold">
				Workspace settings
			</h1>
			<p className="mt-4 text-sm text-neutral-600">
				Personal display preferences are being added in the accessibility pass.
				This local workspace has no signed-in identity or organisation access
				controls.
			</p>
		</section>
	);
}
