import { useRef, useState } from "react";
import { usePreferences } from "../../context/preferences";
import { LearningStrategy } from "./LearningStrategy";
import { developmentAreas, experienceYears, localDate } from "./utils";

export function ProfessionalDevelopment() {
	const { preferences, update } = usePreferences();
	const profile = preferences.developmentProfile;
	const years = experienceYears(profile);
	const [cv, setCv] = useState<File | null>(null);
	const [error, setError] = useState<string | null>(null);
	const input = useRef<HTMLInputElement>(null);
	const updateProfile = (change: Partial<typeof profile>) =>
		update({ developmentProfile: { ...profile, ...change } });
	return (
		<>
			<section
				aria-labelledby="development-title"
				className="mt-8 space-y-5 rounded-xl border bg-white p-6"
			>
				<div>
					<h2 id="development-title" className="text-lg font-semibold">
						Professional development profile
					</h2>
					<p className="mt-2 text-sm leading-relaxed text-neutral-600">
						Help us understand your experience and the areas where you'd like to
						develop your professional judgement.
					</p>
				</div>
				<div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm leading-relaxed">
					<strong>Experimental concept — demo only</strong>
					<p className="mt-1">
						This profile illustrates a possible future direction. Your CV,
						experience and development preferences are not currently shared with
						the AI agent and do not influence investigations, findings or
						reports.
					</p>
				</div>
				<div>
					<label
						htmlFor="development-cv"
						className="block text-sm font-semibold"
					>
						Upload CV <span className="font-normal">(optional)</span>
					</label>
					<p
						id="cv-disclosure"
						className="my-2 text-xs leading-relaxed text-neutral-600"
					>
						Demo only — your CV is not analysed or uploaded. The selected file
						is not saved. It clears when you leave Settings or reload.
					</p>
					<input
						ref={input}
						id="development-cv"
						type="file"
						accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
						aria-describedby="cv-disclosure"
						className="w-full min-w-0 text-sm"
						onChange={(event) => {
							const selected = event.target.files?.[0];
							if (!selected) return;
							if (!/\.(pdf|docx)$/i.test(selected.name)) {
								setError("Choose a PDF or DOCX file.");
								event.target.value = "";
								return;
							}
							setError(null);
							setCv(selected);
						}}
					/>
					{error && (
						<p role="alert" className="mt-2 text-sm text-red-800">
							{error}
						</p>
					)}
					{cv && (
						<div className="mt-3 flex flex-wrap items-center gap-3 text-sm">
							<span className="break-all">{cv.name}</span>
							<button
								type="button"
								className="quiet-button"
								onClick={() => {
									setCv(null);
									setError(null);
									if (input.current) input.current.value = "";
								}}
							>
								Remove CV
							</button>
						</div>
					)}
				</div>
				<div>
					<label
						htmlFor="development-years"
						className="block text-sm font-semibold"
					>
						Years of professional experience
					</label>
					<p id="experience-value" className="my-2 text-sm">
						{years === null
							? "Not set — optional"
							: `${years} ${years === 1 ? "year" : "years"}`}
					</p>
					<input
						id="development-years"
						type="range"
						min={0}
						max={40}
						step={1}
						value={years ?? 0}
						aria-describedby="experience-value"
						aria-valuetext={
							years === null
								? "Not set; adjust to choose years"
								: `${years} years`
						}
						className="w-full accent-blue-600"
						onChange={(event) =>
							updateProfile({
								years: Number(event.target.value),
								referenceDate: localDate(),
							})
						}
					/>
					{years === null ? (
						<button
							type="button"
							className="quiet-button mt-2"
							onClick={() =>
								updateProfile({ years: 0, referenceDate: localDate() })
							}
						>
							Set to 0 years
						</button>
					) : (
						<button
							type="button"
							className="quiet-button mt-2"
							onClick={() =>
								updateProfile({ years: null, referenceDate: null })
							}
						>
							Clear experience
						</button>
					)}
					<p className="mt-2 text-xs text-neutral-600">
						Saved experience advances on completed annual anniversaries, up to
						40 years. Adjusting it resets the reference date.
					</p>
				</div>
				<fieldset className="space-y-3">
					<legend className="mb-3 text-sm font-semibold">
						Areas where I'd like support
					</legend>
					{developmentAreas.map((area) => (
						<label key={area} className="flex items-start gap-3 text-sm">
							<input
								type="checkbox"
								className="mt-0.5 h-4 w-4 shrink-0 accent-blue-600"
								checked={profile.areas.includes(area)}
								onChange={(event) =>
									updateProfile({
										areas: event.target.checked
											? [...profile.areas, area]
											: profile.areas.filter((item) => item !== area),
									})
								}
							/>
							<span>{area}</span>
						</label>
					))}
					<button
						type="button"
						className="quiet-button"
						disabled={!profile.areas.length}
						onClick={() => updateProfile({ areas: [] })}
					>
						Clear focus areas
					</button>
				</fieldset>
				<section
					aria-label="Your development profile"
					className="rounded-lg border p-4 text-sm leading-relaxed"
				>
					<h3 className="mb-2 font-semibold">Your development profile</h3>
					{years === null && !profile.areas.length && !cv ? (
						<p>
							No development preferences selected. Everything here is optional.
						</p>
					) : (
						<dl className="space-y-2">
							<div>
								<dt className="font-medium">Experience</dt>
								<dd>
									{years === null
										? "Not set"
										: `${years} ${years === 1 ? "year" : "years"}`}
								</dd>
							</div>
							<div>
								<dt className="font-medium">Focus areas</dt>
								<dd>{profile.areas.join(", ") || "None selected"}</dd>
							</div>
							<div>
								<dt className="font-medium">CV</dt>
								<dd className="break-all">
									{cv ? `${cv.name} (session only)` : "None selected"}
								</dd>
							</div>
						</dl>
					)}
				</section>
			</section>
			<LearningStrategy />
		</>
	);
}
