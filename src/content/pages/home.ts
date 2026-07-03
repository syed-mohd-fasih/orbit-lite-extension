import { parseUniversityInfo } from "../parsers/universityInfo";
import { parseProfileInfo } from "../parsers/profileInfo";
import { parseAcademicCalendar } from "../parsers/academicCalendar";
import { sendSync } from "../utils/sync";

export function runHomePageParsers(): void {
	const student = parseUniversityInfo();
	if (student) sendSync("student", student);
	else console.warn("[Orbit Lite] student info not parsed");

	const profile = parseProfileInfo();
	if (profile) sendSync("profile", profile);
	else console.warn("[Orbit Lite] profile info not parsed");

	const academicCalendar = parseAcademicCalendar();
	if (academicCalendar) sendSync("academicCalendar", academicCalendar);
	else console.warn("[Orbit Lite] academic calendar not parsed");
}
