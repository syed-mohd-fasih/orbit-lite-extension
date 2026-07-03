export interface TranscriptCourse {
	code: string;
	name: string;
	section: string;
	creditHours: number;
	grade: string;
	gradePoints: number;
	type: string;
}

export interface TranscriptSemester {
	semester: string;
	creditsAttempted: number;
	creditsEarned: number;
	sgpa: number;
	cgpa: number;
	courses: TranscriptCourse[];
}
