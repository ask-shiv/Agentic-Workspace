import { ArrowRight, LoaderCircle, PlusCircle } from "lucide-react";
import { type ReactNode, useRef, useState } from "react";
import { usePreferences } from "../context/preferences";
import type { Workflow } from "../lib/workspace";
import { WorkflowChoices } from "./WorkflowChoices";

export function IntentStart({
	workflow,
	objective,
	onWorkflow,
	onObjective,
	onContinue,
	disabled = false,
	preparing = false,
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
	preparing?: boolean;
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
				work.
			</p>
			<form
				onSubmit={(event) => {
					event.preventDefault();
					if (
						!disabled &&
						(chatSelected ||
							(workflow && (!objective.trim() || objective.trim().length >= 5)))
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
								(chatSelected ||
									(workflow &&
										(!objective.trim() || objective.trim().length >= 5)))
							) {
								event.preventDefault();
								onContinue();
							}
						}}
						rows={3}
						value={objective}
						disabled={disabled}
						onChange={(event) => onObjective(event.target.value)}
						placeholder="(Optional) Tell me what you’re working towards…"
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
							aria-busy={preparing}
							disabled={
								disabled ||
								(!chatSelected &&
									(!workflow ||
										(!!objective.trim() && objective.trim().length < 5)))
							}
						>
							{action}
							{preparing ? (
								<LoaderCircle
									aria-hidden="true"
									className="planning-spinner h-4 w-4 animate-spin motion-reduce:animate-none"
								/>
							) : (
								<ArrowRight aria-hidden="true" className="h-4 w-4" />
							)}
						</button>
					</div>
				</section>
				{preparing && (
					<output
						aria-label="Brief preparation"
						className="block text-center text-sm text-neutral-400"
					>
						Preparing a brief for you to review…
					</output>
				)}
				{children}
			</form>
		</div>
	);
}
