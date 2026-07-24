interface LongPressOptions {
	delay?: number;
}

/**
 * Creates long-press event handlers for touch/pointer interaction.
 * Returns an object that can be spread onto an element: {...longPressHandlers}
 */
export function useLongPress(
	callback: () => void,
	options: LongPressOptions = {}
): {
	onpointerdown: (e: PointerEvent) => void;
	onpointerup: () => void;
	onpointerleave: () => void;
	onpointercancel: () => void;
} {
	const delay = options.delay ?? 500;
	let timer: ReturnType<typeof setTimeout> | null = null;

	function clear() {
		if (timer !== null) {
			clearTimeout(timer);
			timer = null;
		}
	}

	function onpointerdown(e: PointerEvent) {
		// Only handle primary button / touch
		if (e.button !== 0) return;
		clear();
		timer = setTimeout(() => {
			timer = null;
			callback();
		}, delay);
	}

	function onpointerup() {
		clear();
	}

	function onpointerleave() {
		clear();
	}

	function onpointercancel() {
		clear();
	}

	return { onpointerdown, onpointerup, onpointerleave, onpointercancel };
}
