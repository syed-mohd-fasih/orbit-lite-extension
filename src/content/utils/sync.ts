import type { DataType, SyncRequest, SyncResult } from "../../shared/messages";

export function sendSync<T>(dataType: DataType, payload: T): void {
	const request: SyncRequest<T> = {
		kind: "SYNC",
		dataType,
		payload,
		parsedAt: Date.now(),
	};

	chrome.runtime.sendMessage(request, (result: SyncResult | undefined) => {
		if (chrome.runtime.lastError) {
			console.warn(`[Orbit Lite] sync failed for ${dataType}:`, chrome.runtime.lastError.message);
			return;
		}
		if (result) {
			const reason = result.status === "error" && result.message ? ` — ${result.message}` : "";
			console.log(`[Orbit Lite] ${dataType}: ${result.status}${reason}`);
		}
	});
}
