import { avatarInitials, usePreferences } from "../context/preferences";

export function SettingsPage() {
	const { preferences, update, storageAvailable } = usePreferences();
	const options = [
		[
			"contrast",
			"Higher contrast",
			"Strengthen text, boundaries and focus indicators.",
		],
		[
			"reducedMotion",
			"Reduce motion",
			"Minimise transitions. Your system preference is also respected.",
		],
		[
			"readingMode",
			"Reading view",
			"Show report sections as selectable text instead of editing fields; open sources as extracted text.",
		],
		[
			"shortcuts",
			"Enable keyboard shortcuts",
			"Optional shortcuts are off by default to avoid conflicts with assistive tools.",
		],
	] as const;
	return (
		<section className="mx-auto w-full max-w-3xl overflow-auto px-6 py-8 md:p-10">
			<p className="mb-2 text-xs font-semibold uppercase tracking-widest text-teal-800">
				Make room for your way of working
			</p>
			<h1
				id="page-title"
				tabIndex={-1}
				className="text-3xl font-semibold tracking-tight"
			>
				Your workspace settings
			</h1>
			<p className="mt-3 text-sm leading-relaxed text-neutral-600">
				Preferences stay in this browser. This is a local profile, not a
				signed-in account or access control.
			</p>
			{!storageAvailable && (
				<p
					role="alert"
					className="mt-4 rounded bg-amber-50 p-3 text-sm text-amber-900"
				>
					Browser storage is unavailable. Preferences work for this session but
					may not survive reload.
				</p>
			)}
			<div className="mt-8 rounded-xl border bg-white p-6">
				<div className="flex items-center gap-4">
					<span
						aria-hidden="true"
						className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-teal-900 font-semibold text-white"
					>
						{avatarInitials(preferences.name)}
					</span>
					<label className="flex-1 text-sm font-medium" htmlFor="profile-name">
						Your name
						<input
							id="profile-name"
							maxLength={80}
							autoComplete="off"
							value={preferences.name}
							onChange={(event) => update({ name: event.target.value })}
							placeholder="Add your name"
							className="mt-2 w-full rounded-lg border border-neutral-300 p-3 text-base"
						/>
					</label>
				</div>
			</div>
			<fieldset className="mt-6 rounded-xl border bg-white p-6">
				<legend className="px-2 text-base font-semibold">Text size</legend>
				<p className="mb-4 text-sm text-neutral-600">
					Scales the interface and report text. Browser zoom remains available.
				</p>
				<div className="grid gap-3 sm:grid-cols-3">
					{(["small", "medium", "large"] as const).map((size, index) => (
						<label
							key={size}
							className={`flex cursor-pointer items-center gap-3 rounded-lg border p-4 ${preferences.textSize === size ? "border-teal-800 bg-teal-50" : "border-neutral-300"}`}
						>
							<input
								type="radio"
								name="text-size"
								value={size}
								checked={preferences.textSize === size}
								onChange={() => update({ textSize: size })}
							/>
							<span>
								<span
									aria-hidden="true"
									style={{ fontSize: `${1 + index * 0.25}rem` }}
									className="block font-serif leading-none"
								>
									Aa
								</span>
								<span className="mt-2 block text-sm capitalize">{size}</span>
							</span>
						</label>
					))}
				</div>
			</fieldset>
			<fieldset className="mt-6 space-y-5 rounded-xl border bg-white p-6">
				<legend className="px-2 text-base font-semibold">
					Reading and interaction
				</legend>
				{options.map(([key, title, description]) => (
					<label key={key} className="flex cursor-pointer items-start gap-3">
						<input
							type="checkbox"
							className="mt-1 h-5 w-5 shrink-0 accent-teal-900"
							checked={preferences[key]}
							onChange={(event) => update({ [key]: event.target.checked })}
						/>
						<span>
							<span className="block text-sm font-semibold">{title}</span>
							<span className="mt-1 block text-sm leading-relaxed text-neutral-600">
								{description}
							</span>
						</span>
					</label>
				))}
			</fieldset>
			<section
				className="mt-6 rounded-xl border bg-white p-6"
				aria-label="Keyboard shortcuts"
			>
				<h2 className="text-base font-semibold">Keyboard shortcuts</h2>
				<p className="my-3 text-sm text-neutral-600">
					Finding navigation is always available. Enable extra shortcuts above.
					Navigation shortcuts open views after investigation; they do not
					change the agreed task or run while typing in an input, editor or
					select.
				</p>
				<dl className="space-y-3 text-sm">
					<div className="flex justify-between gap-4">
						<dt>Previous / next finding</dt>
						<dd>
							<kbd>Alt + ↑ / ↓</kbd>
						</dd>
					</div>
					<div className="flex justify-between gap-4">
						<dt>Review findings</dt>
						<dd>
							<kbd>Alt + Shift + 1</kbd>
						</dd>
					</div>
					<div className="flex justify-between gap-4">
						<dt>Write report</dt>
						<dd>
							<kbd>Alt + Shift + 2</kbd>
						</dd>
					</div>
					<div className="flex justify-between gap-4">
						<dt>Save workspace</dt>
						<dd>
							<kbd>Ctrl / ⌘ + S</kbd>
						</dd>
					</div>
				</dl>
			</section>
			<section
				className="mt-6 rounded-xl border border-teal-200 bg-teal-50 p-6"
				aria-label="Assistive reading"
			>
				<h2 className="text-base font-semibold">
					Use your preferred reading tools
				</h2>
				<p className="mt-2 text-sm leading-relaxed">
					Reading view and extracted source text provide selectable content for
					screen readers and reading extensions. Speechify is not connected or
					verified. No text is automatically sent to a speech service; an
					integration would need explicit permission and privacy review.
				</p>
			</section>
			<p className="mt-6 text-xs leading-relaxed text-neutral-600">
				Accessibility foundations target WCAG 2.2 AA. Independent
				assistive-technology and UK/US rollout audits remain open; these
				controls are not a compliance certification.
			</p>
		</section>
	);
}
