import { getPortletByTitle, parseCourseHeader, getSelectedSemester } from "../utils/dom";
import { parsePortalDate } from "../utils/date";
import type { AttendanceSummary, AttendanceSession } from "../../types/attendance";

/**
 * Attendance page. Confusingly the portlet is titled "Registered Courses", but
 * it holds one tab-pane per course, each with:
 *   - <h5>CS4039-Name (BCS-8A)</h5>           → course identity
 *   - a progress bar showing the percentage   → e.g. "81.00%"
 *   - a table of lectures (No | Date | Duration | Presence)
 *
 * Presence letters: P = present, A = absent, L = late.
 */
const PRESENCE: Record<string, AttendanceSession["status"]> = {
	P: "present",
	A: "absent",
	L: "late",
};

export function parseAttendance(): {
	summary: AttendanceSummary[];
	sessions: AttendanceSession[];
} | null {
	const portlet = getPortletByTitle("Registered Courses");
	if (!portlet) {
		console.warn("[Orbit Lite] Attendance portlet not found");
		return null;
	}

	const semester = getSelectedSemester();
	const summary: AttendanceSummary[] = [];
	const sessions: AttendanceSession[] = [];

	portlet.querySelectorAll<HTMLElement>(".tab-pane").forEach((pane) => {
		const heading = pane.querySelector("h5")?.textContent ?? "";
		const course = parseCourseHeader(heading);
		if (!course) return;

		// Percentage: prefer the precise "81.00%" text, fall back to aria-valuenow.
		const bar = pane.querySelector(".progress-bar");
		const pctText = bar?.querySelector("h5")?.textContent?.replace("%", "").trim();
		const percentage = Number(pctText ?? bar?.getAttribute("aria-valuenow") ?? 0);

		let attended = 0;
		let absences = 0;
		let lates = 0;
		let totalClasses = 0;

		pane.querySelectorAll("tbody tr").forEach((row) => {
			const cells = row.querySelectorAll("td");
			if (cells.length < 4) return;

			const dateRaw = cells[1].textContent?.trim() ?? "";
			const letter = cells[3].textContent?.trim().toUpperCase() ?? "";
			const status = PRESENCE[letter];
			if (!status) return; // skip anything that isn't P/A/L

			totalClasses++;
			if (status === "present") attended++;
			else if (status === "absent") absences++;
			else lates++;

			sessions.push({
				courseCode: course.courseCode,
				semester,
				date: parsePortalDate(dateRaw),
				status,
			});
		});

		summary.push({
			courseCode: course.courseCode,
			courseName: course.courseName,
			section: course.section,
			semester,
			percentage,
			totalClasses,
			attended,
			absences,
			lates,
		});
	});

	return { summary, sessions };
}
