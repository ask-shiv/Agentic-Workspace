const concepts = [
	{
		title: "Learning from professional practice",
		status: "Concept only — not active",
		description:
			"With appropriate consent and safeguards, future versions could learn from how lawyers investigate risks, prioritise findings and correct AI recommendations.",
		steps: [
			["Observe", "Understand how professionals work within the platform."],
			["Feedback", "Capture explicit corrections and reasoning."],
			[
				"Improve",
				"Use validated feedback to strengthen AI evaluations and guidance.",
			],
		],
		note: "No professional behaviour is currently monitored or collected for AI learning through this feature.",
	},
	{
		title: "Building expertise with legal professionals",
		status: "Future capability — not implemented",
		description:
			"Qualified lawyers could perform representative due diligence exercises to establish expert-validated benchmarks for AI performance.",
		steps: [
			[
				"Expert review",
				"Lawyers assess representative legal documents and risks.",
			],
			[
				"Evaluation datasets",
				"Capture expected findings, evidence, prioritisation and commercial reasoning.",
			],
			[
				"Test and improve",
				"Evaluate agent performance against expert-defined standards.",
			],
		],
		note: "No proprietary legal evaluation or training dataset is created by this feature.",
	},
];
export function LearningStrategy() {
	return (
		<section
			aria-labelledby="learning-strategy-title"
			className="mt-6 space-y-4 rounded-xl border bg-white p-6"
		>
			<h2 id="learning-strategy-title" className="text-lg font-semibold">
				How could the AI learn to support you?
			</h2>
			<p className="text-sm leading-relaxed text-neutral-600">
				Personalisation requires more than knowing a lawyer's experience. The
				platform would also need reliable ways to understand and evaluate
				professional legal judgement.
			</p>
			<div className="grid gap-4 sm:grid-cols-2">
				{concepts.map((concept) => (
					<article
						key={concept.title}
						className="space-y-3 rounded-lg border p-4"
					>
						<p className="text-xs font-semibold text-teal-800">
							{concept.status}
						</p>
						<h3 className="font-semibold">{concept.title}</h3>
						<p className="text-sm leading-relaxed">{concept.description}</p>
						<ol className="list-decimal space-y-2 pl-5 text-sm leading-relaxed">
							{concept.steps.map(([title, description]) => (
								<li key={title}>
									<strong>{title}:</strong> {description}
								</li>
							))}
						</ol>
						<p className="text-xs leading-relaxed text-neutral-600">
							{concept.note}
						</p>
					</article>
				))}
			</div>
			<p className="text-sm leading-relaxed">
				Expert-led evaluations establish what good looks like. Validated
				feedback from real workflows could reveal where the system succeeds or
				falls short. Together, they could support more useful, experience-aware
				guidance.
			</p>
			<p className="text-xs leading-relaxed text-neutral-600">
				Any future learning capability would require appropriate consent, client
				confidentiality safeguards, data ownership controls and expert
				validation. Client documents must not automatically become AI training
				or evaluation data. Evaluating outputs against benchmarks is distinct
				from training or fine-tuning a model; observing activity alone does not
				establish ground truth.
			</p>
		</section>
	);
}
