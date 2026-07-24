import { describe, it, expect } from 'vitest';
import {
	getMatrixErrorCode,
	getMatrixErrorMessage,
	getMatrixErrorData,
	formatMatrixError
} from './errors';

describe('getMatrixErrorCode', () => {
	it('extracts errcode from top-level', () => {
		expect(getMatrixErrorCode({ errcode: 'M_FORBIDDEN' })).toBe('M_FORBIDDEN');
	});

	it('extracts errcode from nested data', () => {
		expect(getMatrixErrorCode({ data: { errcode: 'M_NOT_FOUND' } })).toBe('M_NOT_FOUND');
	});

	it('returns undefined when no errcode', () => {
		expect(getMatrixErrorCode({ error: 'oops' })).toBeUndefined();
	});

	it('returns undefined for null/undefined input', () => {
		expect(getMatrixErrorCode(null)).toBeUndefined();
		expect(getMatrixErrorCode(undefined)).toBeUndefined();
	});
});

describe('getMatrixErrorMessage', () => {
	it('extracts error from top-level', () => {
		expect(getMatrixErrorMessage({ error: 'Forbidden' })).toBe('Forbidden');
	});

	it('extracts error from nested data', () => {
		expect(getMatrixErrorMessage({ data: { error: 'Not found' } })).toBe('Not found');
	});

	it('falls back to message', () => {
		expect(getMatrixErrorMessage({ message: 'Network error' })).toBe('Network error');
	});

	it('uses custom fallback', () => {
		expect(getMatrixErrorCode({})).toBeUndefined();
		expect(getMatrixErrorMessage({}, 'custom')).toBe('custom');
	});

	it('uses default fallback', () => {
		expect(getMatrixErrorMessage({})).toBe('Matrix request failed');
	});
});

describe('getMatrixErrorData', () => {
	it('extracts data object', () => {
		const data = { retry_after_ms: 5000 };
		expect(getMatrixErrorData({ data })).toEqual(data);
	});

	it('returns the error itself if it looks like data', () => {
		const error = { errcode: 'M_LIMIT_EXCEEDED', retry_after_ms: 3000 };
		expect(getMatrixErrorData(error)).toEqual(error);
	});

	it('returns null for non-object', () => {
		expect(getMatrixErrorData('string')).toBeNull();
		expect(getMatrixErrorData(null)).toBeNull();
	});
});

describe('formatMatrixError', () => {
	it('formats with code and message', () => {
		expect(formatMatrixError({ errcode: 'M_FORBIDDEN', error: 'Forbidden' })).toBe(
			'Forbidden (M_FORBIDDEN)'
		);
	});

	it('formats with message only', () => {
		expect(formatMatrixError({ error: 'Something broke' })).toBe('Something broke');
	});

	it('uses fallback when no info', () => {
		expect(formatMatrixError({})).toBe('Matrix request failed');
	});
});
