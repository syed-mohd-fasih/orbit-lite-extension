import { getPortletByTitle, extractLabelValuePairs } from "../utils/dom";
import type { AcademicCalendar, DateWindow } from "../../types/student";

function toWindow(raw: string | undefined, separator: RegExp): DateWindow {
	const [start = "", end = ""] = (raw ?? "").split(separator);
	return { start: start.trim(), end: end.trim() };
}

export function parseAcademicCalendar(): AcademicCalendar | null {
	const portlet = getPortletByTitle("Academic Calendar");
	if (!portlet) {
		console.warn("[Orbit Lite] Academic Calendar portlet not found");
		return null;
	}

	const f = extractLabelValuePairs(portlet);
	// f ≈ {
	//   "Registration": "11-Jun-2026 to 17-Jun-2026",
	//   "Classes": "15-Jun-2026 to 07-Aug-2026",
	//   "Online Withdraw request": "13-Jan-2026 to 15-May-2026",
	//   "Online Retake request": "After Mid Exam / After Final Exam",
	//   "Online Feedback #1": "Updated soon",
	//   "Online Feedback #2": "Updated soon",
	// }

	return {
		registrationWindow: toWindow(f["Registration"], / to /),
		classesWindow: toWindow(f["Classes"], / to /),
		withdrawalWindow: toWindow(f["Online Withdraw request"], / to /),
		retakeWindow: toWindow(f["Online Retake request"], /\//),
		feedback1Date: f["Online Feedback #1"] ?? "",
		feedback2Date: f["Online Feedback #2"] ?? "",
	};
}
