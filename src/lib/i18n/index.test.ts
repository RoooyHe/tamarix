import { describe, it, expect, beforeEach } from 'vitest';
import { t, setLocale, getCurrentLocale, registerLocale, type Locale } from './index';

describe('t', () => {
	beforeEach(() => {
		setLocale('zh');
	});

	it('returns Chinese translation for known key', () => {
		const result = t('status.todo');
		expect(result).toBe('待办');
	});

	it('returns key itself for unknown key', () => {
		expect(t('nonexistent.key')).toBe('nonexistent.key');
	});

	it('handles parameter interpolation', () => {
		const result = t('pagination.total', { n: 42 });
		expect(result).toContain('42');
	});

	it('switches to English', () => {
		setLocale('en');
		const result = t('status.todo');
		expect(result).toBe('To Do');
	});
});

describe('setLocale / getCurrentLocale', () => {
	beforeEach(() => {
		setLocale('zh');
	});

	it('returns current locale', () => {
		expect(getCurrentLocale()).toBe('zh');
	});

	it('updates locale', () => {
		setLocale('en');
		expect(getCurrentLocale()).toBe('en');
	});
});

describe('registerLocale', () => {
	it('adds custom translations', () => {
		registerLocale('en' as Locale, { 'custom.test': 'Custom Value' });
		setLocale('en');
		expect(t('custom.test')).toBe('Custom Value');
	});
});
