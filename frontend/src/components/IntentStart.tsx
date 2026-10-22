import {
	ArrowRight,
	FilePenLine,
	MessageSquare,
	PlusCircle,
	ShieldCheck,
} from "lucide-react";
import { type CSSProperties, type ReactNode, useRef, useState } from "react";
import { usePreferences } from "../context/preferences";
import type { Workflow } from "../lib/workspace";

export function WorkflowChoices({
	value,
	disabled = false,
	onChange,
	onChat,
	chatSelected = false,
}: {
	onChat?: () => void;
	chatSelected?: boolean;
	value: Workflow | null;
	disabled?: boolean;
	onChange: (value: Workflow) => void;
}) {
	return (
		<fieldset
			className="workflow-choices grid gap-3 sm:grid-cols-2"
			data-selected={chatSelected || value ? "true" : "false"}
			style={
				{
					"--choice-count": onChat ? 3 : 2,
					"--choice-index": chatSelected ? 2 : value === "report" ? 1 : 0,
				} as CSSProperties
			}
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
			{onChat && (
				<label
					className={`workflow-option relative cursor-pointer ${chatSelected ? "workflow-option-selected" : ""}`}
					data-disabled={disabled}
				>
					<input
						type="radio"
						name="workflow"
						checked={chatSelected}
						disabled={disabled}
						onChange={onChat}
						className="peer sr-only"
					/>
					<span className="pointer-events-none absolute inset-0 rounded-full peer-focus-visible:ring-2 peer-focus-visible:ring-blue-400" />
					<MessageSquare aria-hidden="true" className="workflow-icon h-5 w-5" />
					<span>Document chat</span>
				</label>
			)}
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
	onUploadFirst,
	onFile,
	onChat,
	chatSelected = false,
}: {
	workflow: Workflow | null;
	objective: string;
	onWorkflow: (value: Workflow) => void;
	onObjective: (value: string) => void;
	onContinue: () => void;
	disabled?: boolean;
	action?: string;
	children?: ReactNode;
	onUploadFirst?: () => void;
	onFile?: (file: File) => void;
	onChat?: () => void;
	chatSelected?: boolean;
}) {
	const fileInput = useRef<HTMLInputElement>(null);
	const [dragging, setDragging] = useState(false);
	const [dropError, setDropError] = useState<string | null>(null);
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
					if (
						!disabled &&
						(chatSelected || (workflow && objective.trim().length >= 5))
					)
						onContinue();
				}}
				className="welcome-form space-y-6"
			>
				<WorkflowChoices
					value={chatSelected ? null : workflow}
					onChat={onChat}
					chatSelected={chatSelected}
					disabled={disabled}
					onChange={onWorkflow}
				/>
				<section
					aria-label="Document dropzone"
					className={`intent-composer ${dragging ? "dropzone-active" : ""}`}
					onDragOver={(event) => {
						if (onFile && !disabled) {
							event.preventDefault();
							setDragging(true);
						}
					}}
					onDragLeave={(event) => {
						if (!event.currentTarget.contains(event.relatedTarget as Node))
							setDragging(false);
					}}
					onDrop={(event) => {
						if (!onFile) return;
						event.preventDefault();
						setDragging(false);
						if (disabled) return;
						const files = event.dataTransfer.files;
						setDropError(
							files.length !== 1 ? "Please add one PDF at a time." : null,
						);
						if (files.length === 1 && files[0]) onFile(files[0]);
					}}
				>
					{dropError && (
						<p role="alert" className="dropzone-hint">
							{dropError}
						</p>
					)}
					{onFile && (
						<input
							ref={fileInput}
							type="file"
							accept="application/pdf,.pdf"
							aria-label="Choose PDF document"
							className="sr-only"
							disabled={disabled}
							onChange={(event) => {
								const file = event.target.files?.[0];
								if (file) onFile(file);
								event.target.value = "";
							}}
						/>
					)}
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
								(chatSelected || (workflow && objective.trim().length >= 5))
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
								onClick={() =>
									onFile ? fileInput.current?.click() : onUploadFirst?.()
								}
							>
								<PlusCircle aria-hidden="true" className="h-4 w-4" />
								Add document
							</button>
						)}
						<button
							className="primary-button composer-submit"
							type="submit"
							disabled={
								disabled ||
								(!chatSelected && (!workflow || objective.trim().length < 5))
							}
						>
							{action}
							<ArrowRight aria-hidden="true" className="h-4 w-4" />
						</button>
					</div>
				</section>
				{children}
			</form>
		</div>
	);
}
