import type { StorybookConfig } from '@storybook/sveltekit/vite';

const config: StorybookConfig = {
	stories: ['../src/**/*.mdx', '../src/**/*.stories.@{js,ts,jsx,tsx,svelte}'],
	addons: [
		'@storybook/addon-essentials',
		'@storybook/addon-links',
		'@storybook/addon-interactions'
	],
	svelte: {
		compilerOptions: {
			runes: true
		}
	}
};

export default config;
