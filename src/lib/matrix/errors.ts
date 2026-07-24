export interface MatrixErrorLike {
	errcode?: string;
	error?: string;
	data?: {
		errcode?: string;
		error?: string;
		[key: string]: unknown;
	};
	httpStatus?: number;
	message?: string;
}

export function getMatrixErrorCode(error: unknown): string | undefined {
	const value = error as MatrixErrorLike;
	return value?.errcode ?? value?.data?.errcode;
}

export function getMatrixErrorMessage(error: unknown, fallback = 'Matrix request failed'): string {
	const value = error as MatrixErrorLike;
	return value?.error ?? value?.data?.error ?? value?.message ?? fallback;
}

export function getMatrixErrorData<T extends Record<string, unknown>>(error: unknown): T | null {
	const value = error as MatrixErrorLike;
	if (value?.data && typeof value.data === 'object') {
		return value.data as T;
	}
	if (value && typeof value === 'object') {
		return value as T;
	}
	return null;
}

export function formatMatrixError(error: unknown, fallback = 'Matrix request failed'): string {
	const code = getMatrixErrorCode(error);
	const message = getMatrixErrorMessage(error, fallback);
	return code ? `${message} (${code})` : message;
}
