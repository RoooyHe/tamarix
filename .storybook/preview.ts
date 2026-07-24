import '../src/app.css';
import type { Preview } from '@storybook/svelte';

const preview: Preview = {
	parameters: {
		backgrounds: {
			default: 'dark',
			values: [
				{ name: 'dark', value: '#000000' },
				{ name: 'light', value: '#ffffff' }
			]
		},
		controls: {
			matchers: {
				color: /(background|color)$/i,
				date: /Date$/i
			}
		}
	}
};

export default preview;
