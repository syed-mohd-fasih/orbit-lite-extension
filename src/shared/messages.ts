/**
 * The message contract shared across all three layers of the extension:
 *   content script  →  background worker  →  native host
 */

// One value per SQLite table
export type DataType =
	| "student"
	| "profile"
	| "academicCalendar"
	| "registeredCourses"
	| "attendance"
	| "attendanceSessions"
	| "marks"
	| "transcript";

/**
 * content script  →  background worker
 * "Here is freshly parsed data of a given type; please sync it."
 */
export interface SyncRequest<T = unknown> {
	kind: "SYNC";
	dataType: DataType;
	payload: T;
	/** When the parse happened, so the popup can show "synced 10 mins ago". */
	parsedAt: number;
}

/**
 * background worker  →  content script (and popup)
 * The result of a sync round-trip after the native host answers.
 */
export interface SyncResult {
	kind: "SYNC_RESULT";
	dataType: DataType;
	/** "written" = data changed and was saved; "unchanged" = diff found nothing new. */
	status: "written" | "unchanged" | "error";
	message?: string;
	syncedAt: number;
}

/** popup  →  content script: "re-run the parsers on this page right now." */
export interface ResyncRequest {
	kind: "RESYNC";
}

/** popup  →  background worker: "give me the current sync status of every type." */
export interface StatusRequest {
	kind: "GET_STATUS";
}

/** background worker  →  popup: last-known sync info per data type. */
export interface StatusResponse {
	kind: "STATUS";
	entries: Partial<Record<DataType, { status: SyncResult["status"]; syncedAt: number }>>;
}

export type ExtensionMessage = SyncRequest | SyncResult | ResyncRequest | StatusRequest | StatusResponse;

/**
 * What the background worker sends DOWN to the native host over stdio
 */
export interface HostRequest<T = unknown> {
	dataType: DataType;
	payload: T;
}

export interface HostResponse {
	dataType: DataType;
	status: "written" | "unchanged" | "error";
	message?: string;
}
