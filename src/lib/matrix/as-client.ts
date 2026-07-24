const DEFAULT_TIMEOUT_MS = 5000;

interface AsFetchOptions extends Omit<RequestInit, 'signal'> {
	timeoutMs?: number;
}

/**
 * Shared HTTP client for Application Service (AS) API calls.
 * Handles URL normalization, timeout, and error normalization.
 */
export async function asFetch<T = unknown>(
	asUrl: string,
	path: string,
	options: AsFetchOptions = {}
): Promise<T> {
	const { timeoutMs = DEFAULT_TIMEOUT_MS, ...fetchOptions } = options;
	const url = `${asUrl.replace(/\/+$/, '')}${path}`;

	const controller = new AbortController();
	const timeout = setTimeout(() => controller.abort(), timeoutMs);

	try {
		const response = await fetch(url, {
			...fetchOptions,
			signal: controller.signal
		});

		if (!response.ok) {
			let message = `AS returned ${response.status}`;
			try {
				const body = (await response.json()) as { error?: string };
				if (body.error) message = body.error;
			} catch {
				/* ignore parse error */
			}
			throw new Error(message);
		}

		return (await response.json()) as T;
	} finally {
		clearTimeout(timeout);
	}
}
