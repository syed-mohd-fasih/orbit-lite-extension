import { parseMarks } from "../parsers/marks";
import { sendSync } from "../utils/sync";

export function runMarksPageParsers(): void {
	const marks = parseMarks();
	if (marks) sendSync("marks", marks);
	else console.warn("[Orbit Lite] marks not parsed");
}
