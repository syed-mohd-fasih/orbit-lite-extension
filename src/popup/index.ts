import type { DataType, StatusRequest, StatusResponse } from "../shared/messages";

const PORTAL_URL = "https://flexstudent.nu.edu.pk/";
const PORTAL_HOST = new URL(PORTAL_URL).host;

const ROWS: { type: DataType; label: string }[] = [
	{ type: "student", label: "Student" },
	{ type: "profile", label: "Profile" },
	{ type: "academicCalendar", label: "Academic Calendar" },
	{ type: "registeredCourses", label: "Registered Courses" },
	{ type: "attendance", label: "Attendance" },
	{ type: "marks", label: "Marks" },
	{ type: "transcript", label: "Transcript" },
];

function timeAgo(ts: number): string {
	const secs = Math.floor((Date.now() - ts) / 1000);
	if (secs < 60) return "just now";
	const mins = Math.floor(secs / 60);
	if (mins < 60) return `${mins} min${mins === 1 ? "" : "s"} ago`;
	const hrs = Math.floor(mins / 60);
	if (hrs < 24) return `${hrs} hr${hrs === 1 ? "" : "s"} ago`;
	return `${Math.floor(hrs / 24)} d ago`;
}

async function renderStatus(): Promise<void> {
	const req: StatusRequest = { kind: "GET_STATUS" };
	const res: StatusResponse = await chrome.runtime.sendMessage(req);
	const entries = res?.entries ?? {};

	const list = document.getElementById("statusList")!;
	list.innerHTML = ROWS.map(({ type, label }) => {
		const e = entries[type];
		const meta = e
			? `<span class="dot dot--${e.status}"></span>${e.status} · ${timeAgo(e.syncedAt)}`
			: `<span class="dot"></span>never synced`;
		return `<li class="status-row">
			<span class="status-row__label">${label}</span>
			<span class="status-row__meta">${meta}</span>
		</li>`;
	}).join("");
}

async function getActiveTab(): Promise<chrome.tabs.Tab | undefined> {
	const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
	return tab;
}

async function renderConnection(): Promise<void> {
	const tab = await getActiveTab();
	const onPortal = !!tab?.url && new URL(tab.url).host === PORTAL_HOST;
	const el = document.getElementById("connection")!;
	el.textContent = onPortal ? "On portal" : "Off portal";
	el.className = `pill ${onPortal ? "pill--on" : "pill--off"}`;
}

function wireButtons(): void {
	document.getElementById("syncNow")!.addEventListener("click", async () => {
		const tab = await getActiveTab();
		if (tab?.id && tab.url && new URL(tab.url).host === PORTAL_HOST) {
			await chrome.tabs.sendMessage(tab.id, { kind: "RESYNC" });
			setTimeout(renderStatus, 600);
		} else {
			chrome.tabs.create({ url: PORTAL_URL });
		}
	});

	document.getElementById("openPortal")!.addEventListener("click", () => {
		chrome.tabs.create({ url: PORTAL_URL });
	});
}

renderStatus();
renderConnection();
wireButtons();
