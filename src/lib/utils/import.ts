export interface RawImportData {
	headers: string[];
	rows: Record<string, string>[];
}

export interface NormalizedImportRow {
	name: string;
	status: string;
	priority: string;
	type: string;
	assignee: string;
	tags: string;
}

/**
 * Parse a CSV file into an array of row objects.
 * First row is treated as headers.
 */
export async function parseCSV(file: File): Promise<NormalizedImportRow[]> {
	const raw = await parseCSVRaw(file);
	return raw.rows.map(normalizeImportRow);
}

export async function parseCSVRaw(file: File): Promise<RawImportData> {
	const text = await file.text();
	const lines = text.split(/\r?\n/).filter((l) => l.trim());
	if (lines.length < 2) return { headers: [], rows: [] };

	const headers = parseCSVLine(lines[0]).map((h) => h.toLowerCase().trim());
	const rows: Record<string, string>[] = [];

	for (let i = 1; i < lines.length; i++) {
		const values = parseCSVLine(lines[i]);
		const row: Record<string, string> = {};
		headers.forEach((h, idx) => {
			row[h] = values[idx]?.trim() ?? '';
		});
		rows.push(row);
	}

	return { headers, rows };
}

/**
 * Parse a JSON file into an array of row objects.
 */
export async function parseJSON(file: File): Promise<NormalizedImportRow[]> {
	const raw = await parseJSONRaw(file);
	return raw.rows.map(normalizeImportRow);
}

export async function parseJSONRaw(file: File): Promise<RawImportData> {
	const text = await file.text();
	const data = JSON.parse(text);
	const items = Array.isArray(data) ? data : [data];
	const rows = items.map((item: Record<string, unknown>) => {
		const row: Record<string, string> = {};
		for (const [key, value] of Object.entries(item)) {
			row[key.toLowerCase()] = Array.isArray(value) ? value.join(';') : String(value ?? '');
		}
		return row;
	});
	const headers = [...new Set(rows.flatMap((row) => Object.keys(row)))];
	return { headers, rows };
}

export function normalizeImportRow(row: Record<string, string>): NormalizedImportRow {
	return {
		name: row['title'] || row['name'] || row['task'] || '',
		status: row['status'] || 'todo',
		priority: row['priority'] || 'medium',
		type: row['type'] || 'task',
		assignee: row['assignee'] || '',
		tags: row['tags'] || row['tag'] || ''
	};
}

/**
 * Simple CSV line parser that handles quoted fields.
 */
function parseCSVLine(line: string): string[] {
	const result: string[] = [];
	let current = '';
	let inQuotes = false;

	for (let i = 0; i < line.length; i++) {
		const ch = line[i];
		if (inQuotes) {
			if (ch === '"') {
				if (i + 1 < line.length && line[i + 1] === '"') {
					current += '"';
					i++;
				} else {
					inQuotes = false;
				}
			} else {
				current += ch;
			}
		} else {
			if (ch === '"') {
				inQuotes = true;
			} else if (ch === ',') {
				result.push(current);
				current = '';
			} else {
				current += ch;
			}
		}
	}
	result.push(current);
	return result;
}
