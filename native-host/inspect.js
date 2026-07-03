#!/usr/bin/env node
/**
 * Inspect the Orbit Lite SQLite database.
 *
 *   node inspect.js            → row counts per table + sync_meta (what synced when)
 *   node inspect.js marks      → dump the rows of one table
 *   node inspect.js "SELECT ..."→ run an arbitrary read-only query
 */
const os = require("os");
const path = require("path");
const Database = require("better-sqlite3");

const dbPath = path.join(os.homedir(), ".orbit-lite", "orbit.sqlite");
const db = new Database(dbPath, { readonly: true });

const TABLES = [
	"student", "profile", "academic_calendar", "registered_courses",
	"attendance", "attendance_session", "marks",
	"transcript_semester", "transcript_course",
];

const arg = process.argv[2];

if (!arg) {
	console.log("Row counts:");
	console.table(TABLES.map((t) => ({ table: t, rows: db.prepare(`SELECT COUNT(*) c FROM ${t}`).get().c })));
	console.log("\nsync_meta (last write per type/semester):");
	console.table(
		db.prepare("SELECT dataType, scope, updatedAt FROM sync_meta ORDER BY dataType, scope").all()
			.map((r) => ({ ...r, updatedAt: new Date(r.updatedAt).toLocaleString() }))
	);
	console.log(`\n(db: ${dbPath})`);
	console.log('Tips: node inspect.js <table>   |   node inspect.js "SELECT ..."');
} else if (/^\s*select/i.test(arg)) {
	console.table(db.prepare(arg).all());
} else if (TABLES.includes(arg)) {
	console.table(db.prepare(`SELECT * FROM ${arg}`).all());
} else {
	console.error(`Unknown table "${arg}". Known: ${TABLES.join(", ")}`);
	process.exit(1);
}
