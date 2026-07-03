export function getPortletByTitle(title: string): HTMLElement | null {
	const portlets = document.querySelectorAll<HTMLElement>(".m-portlet");

	for (const portlet of portlets) {
		const heading = portlet.querySelector(".m-portlet__head-text");
		if (heading?.textContent?.trim() === title) {
			return portlet;
		}
	}

	return null;
}

export function parseCourseHeader(text: string): { courseCode: string; courseName: string; section: string } | null {
	const m = text.trim().match(/^([A-Za-z]{2,}\d{3,})\s*-\s*(.+?)\s*\(([^)]+)\)\s*$/);
	if (!m) return null;
	return { courseCode: m[1], courseName: m[2].trim(), section: m[3].trim() };
}

export function getSelectedSemester(): string {
	const select = document.querySelector<HTMLSelectElement>("#SemId");
	const opt = select?.selectedOptions?.[0];
	return opt?.textContent?.trim() ?? "";
}

export function extractLabelValuePairs(container: HTMLElement): Record<string, string> {
	const result: Record<string, string> = {};
	const paragraphs = container.querySelectorAll("p");

	paragraphs.forEach((p) => {
		const labelEl = p.querySelector(".m--font-boldest");
		if (!labelEl) return;

		const label = labelEl.textContent?.trim().replace(/:$/, "") ?? "";

		const clone = p.cloneNode(true) as HTMLElement;
		clone.querySelector(".m--font-boldest")?.remove();
		const value = clone.textContent?.trim() ?? "";

		if (label) {
			result[label] = value;
		}
	});

	return result;
}
