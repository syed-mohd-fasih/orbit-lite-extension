/**
 * Orbit Lite database schema + per-dataType writers.
 *
 * This module owns everything about HOW parsed data becomes SQL rows. host.js
 * only knows "given a dataType and payload, ask schema.js to persist it".
 *
 * Writing strategy: every sync carries the FULL dataset for a type, so each
 * writer clears that type's table(s) and re-inserts. Callers run this inside a
 * transaction (see host.js), so a failure rolls back cleanly.
 */

function createSchema(db) {
	db.pragma("journal_mode = WAL");
	db.exec(`
		-- Diff bookkeeping: one hash per (dataType, scope). "scope" is the semester
		-- for per-term data (marks/attendance), or "" for global data. This lets
		-- each semester diff independently so history accumulates.
		CREATE TABLE IF NOT EXISTS sync_meta (
			dataType  TEXT NOT NULL,
			scope     TEXT NOT NULL DEFAULT '',
			hash      TEXT NOT NULL,
			updatedAt INTEGER NOT NULL,
			PRIMARY KEY (dataType, scope)
		);

		-- Singletons (one student per DB) ---------------------------------------
		CREATE TABLE IF NOT EXISTS student (
			rollNumber TEXT, degree TEXT, batch TEXT, campus TEXT, status TEXT
		);
		CREATE TABLE IF NOT EXISTS profile (
			name TEXT, email TEXT, dob TEXT, gender TEXT, bloodGroup TEXT, nationality TEXT
		);
		CREATE TABLE IF NOT EXISTS academic_calendar (
			registration_start TEXT, registration_end TEXT,
			classes_start TEXT, classes_end TEXT,
			withdrawal_start TEXT, withdrawal_end TEXT,
			retake_start TEXT, retake_end TEXT,
			feedback1 TEXT, feedback2 TEXT
		);

		-- Lists ------------------------------------------------------------------
		CREATE TABLE IF NOT EXISTS registered_courses (
			courseCode TEXT, courseName TEXT, section TEXT,
			creditHours REAL, instructor TEXT
		);
		CREATE TABLE IF NOT EXISTS attendance (
			courseCode TEXT, courseName TEXT, section TEXT, semester TEXT,
			percentage REAL, totalClasses INTEGER,
			attended INTEGER, absences INTEGER, lates INTEGER,
			PRIMARY KEY (courseCode, semester)
		);
		CREATE TABLE IF NOT EXISTS attendance_session (
			courseCode TEXT, semester TEXT, date TEXT, status TEXT
		);
		-- Marks: nested course→assessment flattened to one row per assessment.
		CREATE TABLE IF NOT EXISTS marks (
			courseCode TEXT, courseName TEXT, section TEXT, semester TEXT,
			type TEXT, title TEXT, obtained REAL, total REAL, weightage REAL
		);

		-- Transcript: a real parent/child relationship -------------------------
		CREATE TABLE IF NOT EXISTS transcript_semester (
			semester TEXT PRIMARY KEY,
			creditsAttempted REAL, creditsEarned REAL, sgpa REAL, cgpa REAL
		);
		CREATE TABLE IF NOT EXISTS transcript_course (
			semester TEXT, code TEXT, name TEXT, section TEXT,
			creditHours REAL, grade TEXT, gradePoints REAL, type TEXT,
			FOREIGN KEY (semester) REFERENCES transcript_semester(semester)
		);
	`);

	// Clean up the old scaffold table if this DB predates the real schema.
	db.exec(`DROP TABLE IF EXISTS sync_store;`);
}

/**
 * One writer per dataType. Each receives (db, payload) and fully replaces the
 * rows it owns. `db` is already inside a transaction when these run.
 */
const writers = {
	student(db, p) {
		db.prepare("DELETE FROM student").run();
		db.prepare(
			"INSERT INTO student (rollNumber, degree, batch, campus, status) VALUES (@rollNumber, @degree, @batch, @campus, @status)"
		).run(pick(p, ["rollNumber", "degree", "batch", "campus", "status"]));
	},

	profile(db, p) {
		db.prepare("DELETE FROM profile").run();
		db.prepare(
			"INSERT INTO profile (name, email, dob, gender, bloodGroup, nationality) VALUES (@name, @email, @dob, @gender, @bloodGroup, @nationality)"
		).run(pick(p, ["name", "email", "dob", "gender", "bloodGroup", "nationality"]));
	},

	academicCalendar(db, p) {
		db.prepare("DELETE FROM academic_calendar").run();
		db.prepare(
			`INSERT INTO academic_calendar
			 (registration_start, registration_end, classes_start, classes_end,
			  withdrawal_start, withdrawal_end, retake_start, retake_end, feedback1, feedback2)
			 VALUES (@rs, @re, @cs, @ce, @ws, @we, @rts, @rte, @f1, @f2)`
		).run({
			rs: p.registrationWindow?.start ?? "", re: p.registrationWindow?.end ?? "",
			cs: p.classesWindow?.start ?? "", ce: p.classesWindow?.end ?? "",
			ws: p.withdrawalWindow?.start ?? "", we: p.withdrawalWindow?.end ?? "",
			rts: p.retakeWindow?.start ?? "", rte: p.retakeWindow?.end ?? "",
			f1: p.feedback1Date ?? "", f2: p.feedback2Date ?? "",
		});
	},

	registeredCourses(db, rows) {
		db.prepare("DELETE FROM registered_courses").run();
		const ins = db.prepare(
			"INSERT INTO registered_courses (courseCode, courseName, section, creditHours, instructor) VALUES (@courseCode, @courseName, @section, @creditHours, @instructor)"
		);
		for (const r of rows) ins.run(pick(r, ["courseCode", "courseName", "section", "creditHours", "instructor"]));
	},

	// Semester-scoped: replace only the rows for THIS semester, so other terms
	// stay intact and history accumulates.
	attendance(db, rows) {
		const semester = rows[0]?.semester ?? "";
		db.prepare("DELETE FROM attendance WHERE semester = ?").run(semester);
		const ins = db.prepare(
			"INSERT INTO attendance (courseCode, courseName, section, semester, percentage, totalClasses, attended, absences, lates) VALUES (@courseCode, @courseName, @section, @semester, @percentage, @totalClasses, @attended, @absences, @lates)"
		);
		for (const r of rows) ins.run(pick(r, ["courseCode", "courseName", "section", "semester", "percentage", "totalClasses", "attended", "absences", "lates"]));
	},

	attendanceSessions(db, rows) {
		const semester = rows[0]?.semester ?? "";
		db.prepare("DELETE FROM attendance_session WHERE semester = ?").run(semester);
		const ins = db.prepare("INSERT INTO attendance_session (courseCode, semester, date, status) VALUES (@courseCode, @semester, @date, @status)");
		for (const r of rows) ins.run(pick(r, ["courseCode", "semester", "date", "status"]));
	},

	marks(db, courses) {
		const semester = courses[0]?.semester ?? "";
		db.prepare("DELETE FROM marks WHERE semester = ?").run(semester);
		const ins = db.prepare(
			"INSERT INTO marks (courseCode, courseName, section, semester, type, title, obtained, total, weightage) VALUES (@courseCode, @courseName, @section, @semester, @type, @title, @obtained, @total, @weightage)"
		);
		for (const c of courses) {
			for (const a of c.assessments ?? []) {
				ins.run({
					courseCode: c.courseCode, courseName: c.courseName, section: c.section, semester: c.semester,
					type: a.type, title: a.title, obtained: a.obtained, total: a.total, weightage: a.weightage,
				});
			}
		}
	},

	transcript(db, semesters) {
		db.prepare("DELETE FROM transcript_course").run();
		db.prepare("DELETE FROM transcript_semester").run();
		const insSem = db.prepare(
			"INSERT INTO transcript_semester (semester, creditsAttempted, creditsEarned, sgpa, cgpa) VALUES (@semester, @creditsAttempted, @creditsEarned, @sgpa, @cgpa)"
		);
		const insCourse = db.prepare(
			"INSERT INTO transcript_course (semester, code, name, section, creditHours, grade, gradePoints, type) VALUES (@semester, @code, @name, @section, @creditHours, @grade, @gradePoints, @type)"
		);
		for (const s of semesters) {
			insSem.run(pick(s, ["semester", "creditsAttempted", "creditsEarned", "sgpa", "cgpa"]));
			for (const c of s.courses ?? []) {
				insCourse.run({ semester: s.semester, ...pick(c, ["code", "name", "section", "creditHours", "grade", "gradePoints", "type"]) });
			}
		}
	},
};

/** Copy only the named keys, defaulting missing ones so INSERT never sees undefined. */
function pick(obj, keys) {
	const out = {};
	for (const k of keys) out[k] = obj?.[k] ?? null;
	return out;
}

// Types whose data is per-semester. Their diff/replace happens per term, keyed
// by the "scope" (semester) pulled from the first row of the payload array.
const SEMESTER_SCOPED = new Set(["marks", "attendance", "attendanceSessions"]);

function scopeOf(dataType, payload) {
	if (!SEMESTER_SCOPED.has(dataType)) return "";
	return (Array.isArray(payload) && payload[0]?.semester) || "";
}

module.exports = { createSchema, writers, scopeOf };
