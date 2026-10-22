import { useEffect, useRef, useState } from "react";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogTitle,
} from "./ui/dialog";

type Confirmation = { title: string; description: string; action: string };

export function useWorkflowConfirmation() {
	const [request, setRequest] = useState<Confirmation | null>(null);
	const pending = useRef<((accepted: boolean) => void) | null>(null);
	const trigger = useRef<HTMLElement | null>(null);
	const cancel = useRef<HTMLButtonElement>(null);
	useEffect(() => () => pending.current?.(false), []);
	const confirm = (value: Confirmation) => {
		if (pending.current) return Promise.resolve(false);
		trigger.current = document.activeElement as HTMLElement | null;
		setRequest(value);
		return new Promise<boolean>((resolve) => {
			pending.current = resolve;
		});
	};
	const finish = (accepted: boolean) => {
		const resolve = pending.current;
		pending.current = null;
		setRequest(null);
		resolve?.(accepted);
	};
	const dialog = (
		<Dialog
			open={!!request}
			onOpenChange={(open) => {
				if (!open) finish(false);
			}}
		>
			<DialogContent
				className="w-[calc(100%_-_2rem)] rounded-xl"
				onOpenAutoFocus={(event) => {
					event.preventDefault();
					cancel.current?.focus();
				}}
				onCloseAutoFocus={(event) => {
					event.preventDefault();
					if (trigger.current?.isConnected) trigger.current.focus();
				}}
			>
				<DialogTitle>{request?.title}</DialogTitle>
				<DialogDescription className="leading-relaxed">
					{request?.description}
				</DialogDescription>
				<div className="mt-2 flex flex-wrap justify-end gap-3">
					<button
						ref={cancel}
						type="button"
						className="toolbar-button"
						onClick={() => finish(false)}
					>
						Cancel
					</button>
					<button
						type="button"
						className="primary-button"
						onClick={() => finish(true)}
					>
						{request?.action}
					</button>
				</div>
			</DialogContent>
		</Dialog>
	);
	return { confirm, dialog };
}
