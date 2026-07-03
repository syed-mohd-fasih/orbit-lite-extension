import { getPortletByTitle, parseCourseHeader, getSelectedSemester } from "../utils/dom";
import type { CourseMarks, Assessment } from "../../types/marks";

/**
 * Marks page — the deepest nesting in the portal:
 *   portlet "Student Marks"
 *     └─ .tab-pane (one per course)
 *          ├─ <h5>CS4039-Name (BCS-8A)</h5>
 *          └─ .card (one per assessment TYPE: Assignment, Quiz, Sessional-I…)
 *               └─ table > tr.calculationrow (one per attempt)
 *                    cols: # | Weightage | Obtained | Total | Avg | Std | Min | Max
 */
function num(el: Element | undefined): number {
	return Number(el?.textContent?.trim() ?? "");
}

export function parseMarks(): CourseMarks[] | null {
	const portlet = getPortletByTitle("Student Marks");
	if (!portlet) {
		console.warn("[Orbit Lite] Student Marks portlet not found");
		return null;
	}

	const semester = getSelectedSemester();
	const courses: CourseMarks[] = [];

	portlet.querySelectorAll<HTMLElement>(".tab-pane").forEach((pane) => {
		const heading = pane.querySelector("h5")?.textContent ?? "";
		const course = parseCourseHeader(heading);
		if (!course) return;

		const assessments: Assessment[] = [];

		pane.querySelectorAll<HTMLElement>(".card").forEach((card) => {
			const type = card.querySelector(".card-header button")?.textContent?.trim() ?? "";
			if (!type || type === "Grand Total Marks") return;

			card.querySelectorAll("tr.calculationrow").forEach((row) => {
				const cells = row.querySelectorAll("td");
				if (cells.length < 4) return;
				const number = cells[0].textContent?.trim() ?? "";
				assessments.push({
					type,
					title: `${type} ${number}`,
					weightage: num(cells[1]),
					obtained: num(cells[2]),
					total: num(cells[3]),
				});
			});
		});

		courses.push({
			courseCode: course.courseCode,
			courseName: course.courseName,
			section: course.section,
			semester,
			assessments,
		});
	});

	return courses;
}
