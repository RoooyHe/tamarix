import { describe, it, expect } from 'vitest';
import { isValidUrl, sanitizeUrl } from './url';

describe('isValidUrl', () => {
	it('accepts http URLs', () => {
		expect(isValidUrl('http://example.com')).toBe(true);
	});

	it('accepts https URLs', () => {
		expect(isValidUrl('https://example.com/path?q=1')).toBe(true);
	});

	it('rejects ftp URLs', () => {
		expect(isValidUrl('ftp://example.com')).toBe(false);
	});

	it('rejects empty string', () => {
		expect(isValidUrl('')).toBe(false);
	});

	it('rejects strings without protocol', () => {
		expect(isValidUrl('example.com')).toBe(false);
	});

	it('rejects random text', () => {
		expect(isValidUrl('not a url')).toBe(false);
	});
});

describe('sanitizeUrl', () => {
	it('prepends https: to protocol-relative URLs', () => {
		expect(sanitizeUrl('//example.com')).toBe('https://example.com');
	});

	it('prepends https:// to bare domains', () => {
		expect(sanitizeUrl('example.com')).toBe('https://example.com');
	});

	it('preserves URLs with protocol', () => {
		expect(sanitizeUrl('http://example.com')).toBe('http://example.com');
		expect(sanitizeUrl('https://example.com')).toBe('https://example.com');
	});

	it('trims whitespace', () => {
		expect(sanitizeUrl('  https://example.com  ')).toBe('https://example.com');
	});

	it('does not prepend to strings with spaces', () => {
		expect(sanitizeUrl('hello world')).toBe('hello world');
	});
});
