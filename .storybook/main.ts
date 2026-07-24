import type { StorybookConfig } from '@storybook/sveltekit/vite';

const config: StorybookConfig = {
	framework: '@storybook/sveltekit',
	stories: ['../src/**/*.mdx', '../src/**/*.stories.@{js,ts,jsx,tsx,svelte}'],
	addons: ['@storybook/addon-docs'],
	svelte: {
		compilerOptions: {
			runes: true
		}
	}
};

export default config;
