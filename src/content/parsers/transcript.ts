import { getPortletByTitle } from "../utils/dom";
import type { TranscriptSemester, TranscriptCourse } from "../../types/transcript";

/**
 * Transcript page:
 *   portlet "Student Transcript"
 *     └─ .m-section__content > .row > .col-md-6 (one per semester)
 *          ├─ <h5>Fall 2022</h5>
 *          ├─ .pull-right  → spans "Cr. Att:17" "Cr. Ernd:17" "CGPA:2.82" "SGPA:2.82"
 *          └─ table rows: Code | Name | Section | CrdHrs | Grade | Points | Type | Remarks
 */

function readSummary(container: Element | null): Record<string, number> {
	const out: Record<string, number> = {};
	container?.querySelectorAll("span").forEach((span) => {
		const [label, value] = (span.textContent ?? "").split(":");
		if (label && value !== undefined) out[label.trim()] = Number(value.trim());
	});
	return out;
}

export function parseTranscript(): TranscriptSemester[] | null {
	const portlet = getPortletByTitle("Student Transcript");
	if (!portlet) {
		console.warn("[Orbit Lite] Student Transcript portlet not found");
		return null;
	}

	const semesters: TranscriptSemester[] = [];

	portlet.querySelectorAll<HTMLElement>(".m-section__content .row > .col-md-6").forEach((col) => {
		const semester = col.querySelector("h5")?.textContent?.trim() ?? "";
		if (!semester) return;

		const s = readSummary(col.querySelector(".pull-right"));

		const courses: TranscriptCourse[] = [];
		col.querySelectorAll("tbody tr").forEach((row) => {
			const c = row.querySelectorAll("td");
			if (c.length < 7) return;
			courses.push({
				code: c[0].textContent?.trim() ?? "",
				name: c[1].textContent?.trim() ?? "",
				section: c[2].textContent?.trim() ?? "",
				creditHours: Number(c[3].textContent?.trim() ?? ""),
				grade: c[4].textContent?.trim() ?? "",
				gradePoints: Number(c[5].textContent?.trim() ?? ""),
				type: c[6].textContent?.trim() ?? "",
			});
		});

		semesters.push({
			semester,
			creditsAttempted: s["Cr. Att"] ?? 0,
			creditsEarned: s["Cr. Ernd"] ?? 0,
			cgpa: s["CGPA"] ?? 0,
			sgpa: s["SGPA"] ?? 0,
			courses,
		});
	});

	return semesters;
}
