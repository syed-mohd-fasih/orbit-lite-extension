/**
 * Background service worker — the trusted broker.
 *
 * Responsibilities:
 *   1. Receive SYNC requests from content scripts.
 *   2. Forward the payload to the native messaging host, and relay its result back.
 *   3. Remember the last sync status per data type so the popup can display it.
 */

import type {
	ExtensionMessage,
	SyncRequest,
	SyncResult,
	StatusResponse,
	HostRequest,
	HostResponse,
	DataType,
} from "../shared/messages";

// Must match the "name" in the native host manifest (com.orbitlite.host.json).
const NATIVE_HOST = "com.orbitlite.host";
const STATUS_KEY = "syncStatus";

/** Send one record to the native host and await its written/unchanged verdict. */
function sendToHost(dataType: DataType, payload: unknown): Promise<HostResponse> {
	const request: HostRequest = { dataType, payload };
	return new Promise((resolve) => {
		chrome.runtime.sendNativeMessage(NATIVE_HOST, request, (response: HostResponse) => {
			if (chrome.runtime.lastError) {
				resolve({
					dataType,
					status: "error",
					message: chrome.runtime.lastError.message,
				});
				return;
			}
			resolve(response);
		});
	});
}

/** Persist the latest per-type status so the popup survives a worker restart. */
async function recordStatus(dataType: DataType, status: SyncResult["status"], syncedAt: number) {
	const store = await chrome.storage.local.get(STATUS_KEY);
	const current = store[STATUS_KEY] ?? {};
	current[dataType] = { status, syncedAt };
	await chrome.storage.local.set({ [STATUS_KEY]: current });
}

async function handleSync(req: SyncRequest): Promise<SyncResult> {
	const hostResponse = await sendToHost(req.dataType, req.payload);
	const syncedAt = Date.now();
	await recordStatus(req.dataType, hostResponse.status, syncedAt);
	return {
		kind: "SYNC_RESULT",
		dataType: req.dataType,
		status: hostResponse.status,
		message: hostResponse.message,
		syncedAt,
	};
}

async function handleStatus(): Promise<StatusResponse> {
	const store = await chrome.storage.local.get(STATUS_KEY);
	return { kind: "STATUS", entries: store[STATUS_KEY] ?? {} };
}

// Single listener for everything coming from content scripts and the popup.
// Returning `true` keeps the sendResponse channel open for async work.
chrome.runtime.onMessage.addListener((msg: ExtensionMessage, _sender, sendResponse) => {
	switch (msg.kind) {
		case "SYNC":
			handleSync(msg).then(sendResponse);
			return true;
		case "GET_STATUS":
			handleStatus().then(sendResponse);
			return true;
		default:
			return false;
	}
});

console.log("[Orbit Lite] background worker ready");
