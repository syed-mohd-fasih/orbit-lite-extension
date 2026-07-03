import { getPortletByTitle, extractLabelValuePairs } from "../utils/dom";
import type { StudentInfo } from "../../types/student";

export function parseUniversityInfo(): StudentInfo | null {
	const portlet = getPortletByTitle("University Information");
	if (!portlet) {
		console.warn("[Orbit Lite] University Information portlet not found on this page");
		return null;
	}

	const fields = extractLabelValuePairs(portlet);
	// fields ≈ { "Roll No": "22K-4494", "Section": "BCS-223C",
	//            "Degree": "BS(CS)", "Campus": "Karachi",
	//            "Batch": "Fall 2022", "Status": "Current" }

	if (!fields["Roll No"] || !fields["Degree"]) {
		console.warn("[Orbit Lite] University Information fields incomplete:", fields);
		return null;
	}

	return {
		rollNumber: fields["Roll No"],
		degree: fields["Degree"],
		batch: fields["Batch"],
		campus: fields["Campus"],
		status: fields["Status"],
	};
}
