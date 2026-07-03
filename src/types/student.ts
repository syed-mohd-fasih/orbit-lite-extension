export interface StudentInfo {
	rollNumber: string;
	degree: string;
	batch: string;
	campus: string;
	status: string;
}

export interface ProfileInfo {
	name: string;
	email: string;
	dob: string; // raw portal format, e.g. "6/16/2004"
	gender: string;
	bloodGroup: string;
	nationality: string;
	// NOTE: Mobile No and CNIC are intentionally NOT extracted (privacy).
}

export interface DateWindow {
	start: string;
	end: string;
}

export interface AcademicCalendar {
	registrationWindow: DateWindow;
	classesWindow: DateWindow;
	withdrawalWindow: DateWindow;
	feedback1Date: string;
	feedback2Date: string;
	retakeWindow: DateWindow;
}
