import { ArrowRight, FilePenLine, PlusCircle, ShieldCheck } from "lucide-react";
import type { ReactNode } from "react";
import { usePreferences } from "../context/preferences";
import type { Workflow } from "../lib/workspace";

export function WorkflowChoices({
	value,
	disabled = false,
	onChange,
}: {
	value: Workflow | null;
	disabled?: boolean;
	onChange: (value: Workflow) => void;
}) {
	return (
		<fieldset
			className="workflow-choices grid gap-3 sm:grid-cols-2"
			disabled={disabled}
		>
			<legend className="sr-only">Choose how we work together</legend>
			{(
				[
					{
						value: "risk",
						title: "Assess risk",
						description:
							"Understand your client’s exposure and prepare for decisions.",
						icon: ShieldCheck,
					},
					{
						value: "report",
						title: "Build report",
						description:
							"Shape evidence into a useful client update or negotiation brief.",
						icon: FilePenLine,
					},
				] as const
			).map((option) => (
				<label
					key={option.value}
					className={`workflow-option relative cursor-pointer rounded-xl border p-5 ${value === option.value ? "workflow-option-selected" : ""}`}
					data-disabled={disabled}
				>
					<input
						type="radio"
						name="workflow"
						value={option.value}
						checked={value === option.value}
						disabled={disabled}
						onChange={() => onChange(option.value)}
						className="peer sr-only"
					/>
					<span className="pointer-events-none absolute inset-0 rounded-xl peer-focus-visible:ring-2 peer-focus-visible:ring-blue-400" />
					<option.icon
						aria-hidden="true"
						className="workflow-icon h-5 w-5 text-blue-300"
					/>
					<span className="block font-semibold">{option.title}</span>
					<span className="workflow-description mt-2 block text-sm leading-relaxed text-neutral-400">
						{option.description}
					</span>
				</label>
			))}
		</fieldset>
	);
}

export function IntentStart({
	workflow,
	objective,
	onWorkflow,
	onObjective,
	onContinue,
	disabled = false,
	action = "Continue",
	children,
	timePressure = false,
	onTimePressure,
	onUploadFirst,
}: {
	workflow: Workflow | null;
	objective: string;
	onWorkflow: (value: Workflow) => void;
	onObjective: (value: string) => void;
	onContinue: () => void;
	disabled?: boolean;
	action?: string;
	children?: ReactNode;
	timePressure?: boolean;
	onTimePressure?: (value: boolean) => void;
	onUploadFirst?: () => void;
}) {
	const { preferences } = usePreferences();
	const name = preferences.name.trim().split(/\s+/)[0];
	return (
		<div className="intent-start mx-auto flex w-full flex-col justify-center px-5 py-12 md:px-8">
			<div className="welcome-atmosphere" aria-hidden="true">
				{[8, 37, 66, 95, 28, 57, 86, 19, 48, 77, 10, 39].map((position) => (
					<span
						key={position}
						style={{
							left: `${position}%`,
							top: `${12 + ((position * 17) % 76)}%`,
							animationDelay: `${-(position % 4)}s`,
						}}
					/>
				))}
			</div>
			<p className="welcome-greeting mb-3 text-blue-300">
				{name ? `Welcome back, ${name}.` : "Welcome. Let’s work together."}
			</p>
			<h2 className="welcome-heading mb-4 font-semibold leading-tight tracking-tight">
				What are you trying to achieve?
			</h2>
			<p className="welcome-description mb-8 text-sm leading-relaxed text-neutral-400">
				You set the direction. I’ll help investigate the evidence and shape the
				work. You make the decisions.
			</p>
			<form
				onSubmit={(event) => {
					event.preventDefault();
					if (!disabled && workflow && objective.trim().length >= 5)
						onContinue();
				}}
				className="welcome-form space-y-6"
			>
				<WorkflowChoices
					value={workflow}
					disabled={disabled}
					onChange={onWorkflow}
				/>
				<div className="intent-composer">
					<label htmlFor="objective" className="sr-only">
						What are you trying to achieve?
					</label>
					<textarea
						id="objective"
						maxLength={2000}
						onKeyDown={(event) => {
							if (
								event.key === "Enter" &&
								(event.ctrlKey || event.metaKey) &&
								!disabled &&
								workflow &&
								objective.trim().length >= 5
							) {
								event.preventDefault();
								onContinue();
							}
						}}
						rows={3}
						value={objective}
						disabled={disabled}
						onChange={(event) => onObjective(event.target.value)}
						placeholder="Tell me what you’re working towards…"
						className="w-full resize-y rounded-xl border p-4 text-sm leading-relaxed"
					/>
					<div className="composer-actions">
						{onUploadFirst && (
							<button
								type="button"
								className="quiet-button"
								disabled={disabled}
								onClick={onUploadFirst}
							>
								<PlusCircle aria-hidden="true" className="h-4 w-4" />
								Add a document first
							</button>
						)}
						<button
							className="primary-button composer-submit"
							type="submit"
							disabled={disabled || !workflow || objective.trim().length < 5}
						>
							{action}
							<ArrowRight aria-hidden="true" className="h-4 w-4" />
						</button>
					</div>
				</div>
				{onTimePressure && (
					<label className="flex items-center gap-3 text-sm text-neutral-300">
						<input
							type="checkbox"
							checked={timePressure}
							disabled={disabled}
							onChange={(event) => onTimePressure(event.target.checked)}
						/>
						I’m pressed for time — focus on the decisions that matter most.
					</label>
				)}
				{children}
			</form>
		</div>
	);
}
