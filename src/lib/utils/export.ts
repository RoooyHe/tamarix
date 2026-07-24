import type { Task } from '$lib/matrix/types';
import type {
	BurndownDataPoint,
	StatusDistributionItem,
	TrendDataPoint,
	AssigneeWorkloadItem,
	VersionProgressItem
} from '$lib/reports';

/**
 * Export tasks to CSV format.
 * Columns: Title, Status, Priority, Type, Assignee, Due Date, Tags
 */
export function exportTasksToCSV(tasks: Task[]): string {
	const headers = ['Title', 'Status', 'Priority', 'Type', 'Assignee', 'Due Date', 'Tags'];
	const rows = tasks.map((task) => [
		csvEscape(task.title),
		csvEscape(task.status),
		csvEscape(task.priority ?? ''),
		csvEscape(task.type ?? ''),
		csvEscape(task.assignee ?? ''),
		csvEscape(task.dueDate ?? ''),
		csvEscape(task.tags.join('; '))
	]);
	return [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
}

/**
 * Export tasks to JSON format.
 */
export function exportTasksToJSON(tasks: Task[]): string {
	const simplified = tasks.map((task) => ({
		title: task.title,
		status: task.status,
		priority: task.priority ?? '',
		type: task.type ?? '',
		assignee: task.assignee ?? '',
		dueDate: task.dueDate ?? '',
		tags: task.tags,
		description: task.description ?? ''
	}));
	return JSON.stringify(simplified, null, 2);
}

/**
 * Trigger a file download in the browser.
 */
export function downloadFile(content: string, filename: string, mimeType: string): void {
	const blob = new Blob([content], { type: mimeType });
	const url = URL.createObjectURL(blob);
	const a = document.createElement('a');
	a.href = url;
	a.download = filename;
	document.body.appendChild(a);
	a.click();
	document.body.removeChild(a);
	URL.revokeObjectURL(url);
}

function csvEscape(value: string): string {
	if (value.includes(',') || value.includes('"') || value.includes('\n')) {
		return `"${value.replace(/"/g, '""')}"`;
	}
	return value;
}

/**
 * Export chart area as PNG by rendering the DOM element to canvas.
 * Uses SVG foreignObject approach: clones the SVG, inlines styles, converts to data URL, draws on canvas.
 */
export function exportChartToPNG(element: HTMLElement, filename: string): void {
	const svgEl = element.querySelector('svg');
	if (!svgEl) return;

	const svgClone = svgEl.cloneNode(true) as SVGElement;
	const { width, height } = svgEl.getBoundingClientRect();

	// Inline computed styles for text and shape elements
	const originalElements = svgEl.querySelectorAll('*');
	const clonedElements = svgClone.querySelectorAll('*');
	originalElements.forEach((orig, i) => {
		const clone = clonedElements[i] as Element;
		if (!clone) return;
		const computed = window.getComputedStyle(orig);
		// Copy key style properties that affect rendering
		const props = [
			'fill',
			'stroke',
			'stroke-width',
			'stroke-dasharray',
			'font-size',
			'font-family',
			'font-weight',
			'color',
			'opacity'
		];
		for (const prop of props) {
			const val = computed.getPropertyValue(prop);
			if (val) {
				clone.setAttribute(prop, val);
			}
		}
	});

	// Set explicit dimensions
	svgClone.setAttribute('width', String(width));
	svgClone.setAttribute('height', String(height));

	const serializer = new XMLSerializer();
	const svgString = serializer.serializeToString(svgClone);
	const svgBlob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
	const url = URL.createObjectURL(svgBlob);

	const img = new Image();
	img.onload = () => {
		const scale = 2; // 2x for retina quality
		const canvas = document.createElement('canvas');
		canvas.width = width * scale;
		canvas.height = height * scale;
		const ctx = canvas.getContext('2d');
		if (!ctx) {
			URL.revokeObjectURL(url);
			return;
		}
		// White background
		ctx.fillStyle = '#ffffff';
		ctx.fillRect(0, 0, canvas.width, canvas.height);
		ctx.scale(scale, scale);
		ctx.drawImage(img, 0, 0, width, height);

		canvas.toBlob((blob) => {
			if (!blob) return;
			const pngUrl = URL.createObjectURL(blob);
			const a = document.createElement('a');
			a.href = pngUrl;
			a.download = filename;
			document.body.appendChild(a);
			a.click();
			document.body.removeChild(a);
			URL.revokeObjectURL(pngUrl);
			URL.revokeObjectURL(url);
		}, 'image/png');
	};
	img.src = url;
}

/**
 * Export burndown data to CSV.
 */
export function exportBurndownToCSV(data: BurndownDataPoint[]): string {
	const headers = ['Date', 'Remaining', 'Completed', 'Ideal Remaining'];
	const rows = data.map((d) => [
		csvEscape(d.date),
		String(d.remaining),
		String(d.completed),
		d.idealRemaining !== undefined ? String(d.idealRemaining) : ''
	]);
	return [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
}

/**
 * Export status distribution data to CSV.
 */
export function exportStatusDistributionToCSV(data: StatusDistributionItem[]): string {
	const headers = ['Status', 'Count'];
	const rows = data.map((d) => [csvEscape(d.status), String(d.count)]);
	return [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
}

/**
 * Export trend data to CSV.
 */
export function exportTrendToCSV(data: TrendDataPoint[]): string {
	const headers = ['Date', 'Created', 'Completed'];
	const rows = data.map((d) => [csvEscape(d.date), String(d.created), String(d.completed)]);
	return [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
}

/**
 * Export assignee workload data to CSV.
 */
export function exportAssigneeWorkloadToCSV(data: AssigneeWorkloadItem[]): string {
	const headers = ['Assignee', 'Task Count'];
	const rows = data.map((d) => [csvEscape(d.assignee), String(d.count)]);
	return [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
}

/**
 * Export version progress data to CSV.
 */
export function exportVersionProgressToCSV(data: VersionProgressItem[]): string {
	const headers = ['Version', 'Todo', 'In Progress', 'Review', 'Done', 'Closed'];
	const rows = data.map((d) => [
		csvEscape(d.version),
		String(d.todo),
		String(d.in_progress),
		String(d.review),
		String(d.done),
		String(d.closed)
	]);
	return [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
}
