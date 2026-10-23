export const developmentAreas = [
	"Identifying material risks",
	"Understanding commercial implications",
	"Prioritising findings",
	"Interpreting complex clauses",
	"Developing negotiation strategies",
	"Communicating advice clearly",
	"Spotting details I might overlook",
] as const;
export interface DevelopmentProfile {
	years: number | null;
	referenceDate: string | null;
	areas: string[];
}
export function localDate(date = new Date()): string {
	return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}
function validDate(value: unknown): value is string {
	if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value))
		return false;
	const date = new Date(`${value}T12:00:00`);
	return !Number.isNaN(date.getTime()) && localDate(date) === value;
}
export function parseDevelopmentProfile(value: unknown): DevelopmentProfile {
	const raw =
		value && typeof value === "object"
			? (value as Record<string, unknown>)
			: {};
	const valid =
		typeof raw.years === "number" &&
		Number.isInteger(raw.years) &&
		raw.years >= 0 &&
		raw.years <= 40 &&
		validDate(raw.referenceDate);
	const areas = Array.isArray(raw.areas) ? raw.areas : [];
	return {
		years: valid ? (raw.years as number) : null,
		referenceDate: valid ? (raw.referenceDate as string) : null,
		areas: developmentAreas.filter((area) => areas.includes(area)),
	};
}
export function experienceYears(
	profile: DevelopmentProfile,
	today = localDate(),
): number | null {
	if (profile.years === null || !profile.referenceDate || !validDate(today))
		return null;
	const reference = profile.referenceDate;
	const completed =
		Number(today.slice(0, 4)) -
		Number(reference.slice(0, 4)) -
		(today.slice(5) < reference.slice(5) ? 1 : 0);
	return Math.min(40, profile.years + Math.max(0, completed));
}
