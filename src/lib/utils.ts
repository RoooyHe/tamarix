import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import type { Snippet } from 'svelte';

export function cn(...inputs: ClassValue[]) {
	return twMerge(clsx(inputs));
}

// --- Type utilities used by shadcn-svelte components ---

export type WithoutChildren<T> = T extends { children?: Snippet } ? Omit<T, 'children'> : T;

export type WithoutChild<T> = T extends { child?: Snippet } ? Omit<T, 'child'> : T;

export type WithoutChildrenOrChild<T> = T extends { children?: Snippet } | { child?: Snippet }
	? Omit<T, 'children' | 'child'>
	: T;

export type WithElementRef<T, U extends HTMLElement = HTMLElement> = T & {
	ref?: U | null;
};
