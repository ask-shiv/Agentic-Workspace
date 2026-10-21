import { useEffect } from "react";
import { useBlocker } from "react-router-dom";

export function useUnsavedNavigation(dirty: boolean) {
	const blocker = useBlocker(
		({ currentLocation, nextLocation }) =>
			dirty &&
			nextLocation.state?.deletedWorkspace !==
				currentLocation.pathname.split("/")[2] &&
			currentLocation.pathname !== nextLocation.pathname,
	);
	useEffect(() => {
		if (blocker.state !== "blocked") return;
		if (window.confirm("Leave without saving report changes?"))
			blocker.proceed();
		else blocker.reset();
	}, [blocker]);
}
