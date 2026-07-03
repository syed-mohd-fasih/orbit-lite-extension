export interface AttendanceSummary {
	courseCode: string;
	courseName: string;
	section: string;
	semester: string;
	percentage: number;
	totalClasses: number;
	attended: number;
	absences: number;
	lates: number;
}

export interface AttendanceSession {
	courseCode: string;
	semester: string;
	date: string;
	status: "present" | "absent" | "late";
}
