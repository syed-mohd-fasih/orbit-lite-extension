import { parseAttendance } from "../parsers/attendance";
import { sendSync } from "../utils/sync";

export function runAttendancePageParsers(): void {
	const result = parseAttendance();
	if (!result) {
		console.warn("[Orbit Lite] attendance not parsed");
		return;
	}
	sendSync("attendance", result.summary);
	sendSync("attendanceSessions", result.sessions);
}
