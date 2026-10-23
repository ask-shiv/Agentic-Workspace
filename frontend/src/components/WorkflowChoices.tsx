import { FilePenLine, MessageSquare, ShieldCheck } from "lucide-react";
import type { CSSProperties } from "react";
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
