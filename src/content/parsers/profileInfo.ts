import { getPortletByTitle, extractLabelValuePairs } from "../utils/dom";
import type { ProfileInfo } from "../../types/student";

export function parseProfileInfo(): ProfileInfo | null {
	const portlet = getPortletByTitle("Personal Information");
	if (!portlet) {
		console.warn("[Orbit Lite] Personal Information portlet not found");
		return null;
	}

	const f = extractLabelValuePairs(portlet);

	return {
		name: f["Name"] ?? "",
		email: f["Email"] ?? "",
		dob: f["DOB"] ?? "",
		gender: f["Gender"] ?? "",
		bloodGroup: f["Blood Group"] ?? "",
		nationality: f["Nationality"] ?? "",
	};
}
