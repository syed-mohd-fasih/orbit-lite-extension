/**
 * Content-script entry point.
 */

import { runHomePageParsers } from "./pages/home";
import { runAttendancePageParsers } from "./pages/attendance";
import { runMarksPageParsers } from "./pages/marks";
import { runTranscriptPageParsers } from "./pages/transcript";

type PageId = "home" | "registration" | "attendance" | "marks" | "transcript" | "unknown";

function detectPage(): PageId {
	const path = location.pathname.toLowerCase();
	if (path.includes("/studentattendance")) return "attendance";
	if (path.includes("/studentmarks")) return "marks";
	if (path.includes("/transcript")) return "transcript";
	if (path.includes("/studentcourseregistration")) return "registration";
	if (path === "/" || path === "") return "home";
	return "unknown";
}

function main(): void {
	const page = detectPage();
	console.log(`[Orbit Lite] content script active — detected page: ${page}`);

	// Diagnostic: list every portlet title on the page, so any "not found"
	// warning can be matched against the exact strings the portal is using.
	const titles = Array.from(document.querySelectorAll(".m-portlet__head-text")).map((el) =>
		JSON.stringify(el.textContent?.trim()),
	);
	console.log(`[Orbit Lite] portlets present: ${titles.join(", ") || "(none)"}`);

	switch (page) {
		case "home":
			runHomePageParsers();
			break;
		case "attendance":
			runAttendancePageParsers();
			break;
		case "marks":
			runMarksPageParsers();
			break;
		case "transcript":
			runTranscriptPageParsers();
			break;
		default:
			// Registration is out of season (blank page); unknown pages are ignored.
			break;
	}
}

// Allow the popup's "Sync Now" button to force a re-parse of the live page.
chrome.runtime.onMessage.addListener((msg) => {
	if (msg?.kind === "RESYNC") {
		console.log("[Orbit Lite] manual re-sync requested");
		main();
	}
});

if (document.readyState === "loading") {
	document.addEventListener("DOMContentLoaded", main);
} else {
	main();
}
