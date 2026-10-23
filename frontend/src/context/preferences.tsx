import { MotionConfig } from "framer-motion";
import {
	type ReactNode,
	createContext,
	useContext,
	useEffect,
	useState,
} from "react";
import {
	type DevelopmentProfile,
	parseDevelopmentProfile,
} from "../components/ProfessionalDevelopment/utils";
import { useMediaQuery } from "../hooks/use-media-query";

export interface Preferences {
	name: string;
	developmentProfile: DevelopmentProfile;
	textSize: "small" | "medium" | "large";
	contrast: boolean;
	reducedMotion: boolean;
	readingMode: boolean;
	shortcuts: boolean;
}
export const defaultPreferences: Preferences = {
	name: "",
	developmentProfile: parseDevelopmentProfile(null),
	textSize: "small",
	contrast: false,
	reducedMotion: false,
	readingMode: false,
	shortcuts: false,
};
export const preferencesKey = "agentic-workspace:preferences:v1";
export function parsePreferences(raw: string | null): Preferences {
	try {
		const value = JSON.parse(raw ?? "{}");
		if (!value || typeof value !== "object") return { ...defaultPreferences };
		return {
			developmentProfile: parseDevelopmentProfile(value.developmentProfile),
			name: typeof value.name === "string" ? value.name.slice(0, 80) : "",
			textSize: ["small", "medium", "large"].includes(value.textSize)
				? value.textSize
				: "small",
			contrast: value.contrast === true,
			reducedMotion: value.reducedMotion === true,
			readingMode: value.readingMode === true,
			shortcuts: value.shortcuts === true,
		};
	} catch {
		return { ...defaultPreferences };
	}
}
interface PreferenceContext {
	preferences: Preferences;
	update: (change: Partial<Preferences>) => void;
	storageAvailable: boolean;
}
const Context = createContext<PreferenceContext | null>(null);
export function PreferencesProvider({ children }: { children: ReactNode }) {
	const [preferences, setPreferences] = useState<Preferences>(() => {
		try {
			return parsePreferences(localStorage.getItem(preferencesKey));
		} catch {
			return { ...defaultPreferences };
		}
	});
	const [storageAvailable, setStorageAvailable] = useState(true);
	const systemReduce = useMediaQuery("(prefers-reduced-motion: reduce)");
	const reduced = preferences.reducedMotion || systemReduce;
	useEffect(() => {
		const root = window.document.documentElement;
		root.dataset.textSize = preferences.textSize;
		root.dataset.contrast = preferences.contrast ? "high" : "standard";
		root.dataset.motion = reduced ? "reduced" : "standard";
		try {
			localStorage.setItem(preferencesKey, JSON.stringify(preferences));
			setStorageAvailable(true);
		} catch {
			setStorageAvailable(false);
		}
	}, [preferences, reduced]);
	return (
		<Context.Provider
			value={{
				preferences,
				update: (change) =>
					setPreferences((previous) => ({ ...previous, ...change })),
				storageAvailable,
			}}
		>
			<MotionConfig reducedMotion={reduced ? "always" : "user"}>
				{children}
			</MotionConfig>
		</Context.Provider>
	);
}
export function usePreferences() {
	const value = useContext(Context);
	if (!value) throw new Error("PreferencesProvider is required");
	return value;
}
export function avatarInitials(name: string) {
	return (
		name
			.trim()
			.split(/\s+/)
			.filter(Boolean)
			.slice(0, 2)
			.map((part) => Array.from(part)[0]?.toUpperCase())
			.join("") || "Y"
	);
}
