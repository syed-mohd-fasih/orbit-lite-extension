const MONTHS: Record<string, string> = {
	jan: "01",
	feb: "02",
	mar: "03",
	apr: "04",
	may: "05",
	jun: "06",
	jul: "07",
	aug: "08",
	sep: "09",
	oct: "10",
	nov: "11",
	dec: "12",
};

export function parsePortalDate(raw: string): string {
	const m = raw.trim().match(/^(\d{1,2})-([A-Za-z]{3})-(\d{4})$/);
	if (!m) return raw.trim();
	const [, day, mon, year] = m;
	const month = MONTHS[mon.toLowerCase()];
	if (!month) return raw.trim();
	return `${year}-${month}-${day.padStart(2, "0")}`;
}
