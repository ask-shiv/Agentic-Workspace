import assert from "node:assert/strict";
import { test } from "node:test";
import { experienceYears, parseDevelopmentProfile } from "../index";
test("experience advances only on completed anniversaries and remains capped", () => {
	const profile = { years: 5, referenceDate: "2026-10-23", areas: [] };
	assert.equal(experienceYears(profile, "2027-10-22"), 5);
	assert.equal(experienceYears(profile, "2027-10-23"), 6);
	assert.equal(experienceYears(profile, "2028-10-23"), 7);
	assert.equal(experienceYears(profile, "2025-10-23"), 5);
	assert.equal(experienceYears({ ...profile, years: 39 }, "2029-10-23"), 40);
	assert.equal(
		experienceYears(
			{ years: 5, referenceDate: "2024-02-29", areas: [] },
			"2025-02-28",
		),
		5,
	);
	assert.equal(
		experienceYears(
			{ years: 5, referenceDate: "2024-02-29", areas: [] },
			"2025-03-01",
		),
		6,
	);
});
test("stored profile discards corrupt dates, invalid years and unknown focus areas", () => {
	assert.deepEqual(
		parseDevelopmentProfile({
			years: 6,
			referenceDate: "2026-02-30",
			areas: ["bogus"],
		}),
		{ years: null, referenceDate: null, areas: [] },
	);
	assert.equal(
		parseDevelopmentProfile({ years: 41, referenceDate: "2026-10-23" }).years,
		null,
	);
	assert.equal(parseDevelopmentProfile(null).years, null);
	assert.deepEqual(
		parseDevelopmentProfile({
			years: 0,
			referenceDate: "2026-10-23",
			areas: ["Prioritising findings", "Prioritising findings", "bogus"],
		}),
		{ years: 0, referenceDate: "2026-10-23", areas: ["Prioritising findings"] },
	);
});
