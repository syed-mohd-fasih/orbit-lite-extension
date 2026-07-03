export interface Assessment {
	type: string;
	title: string;
	obtained: number;
	total: number;
	weightage: number;
}

export interface CourseMarks {
	courseCode: string;
	courseName: string;
	section: string;
	semester: string;
	assessments: Assessment[];
}
