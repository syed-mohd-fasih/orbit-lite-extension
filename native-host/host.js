#!/usr/bin/env node
/**
 * Orbit Lite — native messaging host.
 *
 * Chrome launches this process and talks to it over stdin/stdout using a simple
 * framed protocol:
 *   [ 4 bytes: uint32 little-endian message length ][ that many bytes of UTF-8 JSON ]
 *
 * Reads one HostRequest { dataType, payload }, decides whether it CHANGED
 * versus what's already stored (the diff), writes to SQLite only if so, and
 * reply with a HostResponse { dataType, status: "written"|"unchanged"|"error" }.
 *
 * The database is the single source of truth read by the desktop & mobile apps.
 */

const fs = require("fs");
const os = require("os");
const path = require("path");
const crypto = require("crypto");
const { createSchema, writers, scopeOf } = require("./schema");

// --- Database location ------------------------------------------------------
// One shared file the other Orbit Lite apps also open. Keep this path stable.
const DB_DIR = path.join(os.homedir(), ".orbit-lite");
const DB_PATH = path.join(DB_DIR, "orbit.sqlite");
fs.mkdirSync(DB_DIR, { recursive: true });

// better-sqlite3 is a native module — must be installed & built inside
// native-host/ (npm install here).
let db = null;
try {
	const Database = require("better-sqlite3");
	db = new Database(DB_PATH);
	createSchema(db);
} catch (err) {
	logToFile(`better-sqlite3 unavailable: ${err.message}`);
}

// --- Diff + persist ---------------------------------------------------------
function hashOf(value) {
	return crypto.createHash("sha256").update(JSON.stringify(value)).digest("hex");
}

function store(dataType, payload) {
	if (!db) {
		// No DB yet: pretend it always changed so we can see the pipeline work.
		return { dataType, status: "written", message: "db-unavailable (dry run)" };
	}

	const writer = writers[dataType];
	if (!writer) {
		return { dataType, status: "error", message: `no writer for "${dataType}"` };
	}

	// Cheap diff, per (dataType, scope). Scope is the semester for per-term data,
	// or "" for global data — so each semester's marks/attendance diff separately.
	const scope = scopeOf(dataType, payload);
	const hash = hashOf(payload);
	const existing = db.prepare("SELECT hash FROM sync_meta WHERE dataType = ? AND scope = ?").get(dataType, scope);
	if (existing && existing.hash === hash) {
		return { dataType, status: "unchanged" };
	}

	const persist = db.transaction(() => {
		writer(db, payload);
		db.prepare(
			`INSERT INTO sync_meta (dataType, scope, hash, updatedAt) VALUES (@dataType, @scope, @hash, @updatedAt)
			 ON CONFLICT(dataType, scope) DO UPDATE SET hash = @hash, updatedAt = @updatedAt`,
		).run({ dataType, scope, hash, updatedAt: Date.now() });
	});
	persist();

	return { dataType, status: "written" };
}

function handle(request) {
	try {
		if (!request || typeof request.dataType !== "string") {
			return { dataType: "unknown", status: "error", message: "malformed request" };
		}
		return store(request.dataType, request.payload);
	} catch (err) {
		logToFile(`handle error: ${err.stack || err.message}`);
		return { dataType: request?.dataType ?? "unknown", status: "error", message: err.message };
	}
}

// --- Native messaging wire protocol ----------------------------------------
function send(message) {
	const json = Buffer.from(JSON.stringify(message), "utf8");
	const header = Buffer.alloc(4);
	header.writeUInt32LE(json.length, 0);
	process.stdout.write(Buffer.concat([header, json]));
}

let buffer = Buffer.alloc(0);
process.stdin.on("data", (chunk) => {
	buffer = Buffer.concat([buffer, chunk]);
	while (buffer.length >= 4) {
		const len = buffer.readUInt32LE(0);
		if (buffer.length < 4 + len) break;
		const body = buffer.subarray(4, 4 + len);
		buffer = buffer.subarray(4 + len);
		let request;
		try {
			request = JSON.parse(body.toString("utf8"));
		} catch (err) {
			send({ dataType: "unknown", status: "error", message: "bad JSON" });
			continue;
		}
		send(handle(request));
	}
});

process.stdin.on("end", () => process.exit(0));

// --- Debug log (Chrome hides host stderr) ----------------------------------
function logToFile(line) {
	try {
		fs.appendFileSync(path.join(DB_DIR, "host.log"), `${new Date().toISOString()} ${line}\n`);
	} catch {
		/* ignore */
	}
}
