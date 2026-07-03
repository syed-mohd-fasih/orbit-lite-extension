import { parseTranscript } from "../parsers/transcript";
import { sendSync } from "../utils/sync";

export function runTranscriptPageParsers(): void {
	const transcript = parseTranscript();
	if (transcript) sendSync("transcript", transcript);
	else console.warn("[Orbit Lite] transcript not parsed");
}
