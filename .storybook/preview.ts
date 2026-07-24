import '../src/app.css';
import type { Preview } from '@storybook/svelte';

const preview: Preview = {
	parameters: {
		backgrounds: {
			options: {
				dark: { name: 'dark', value: '#000000' },
				light: { name: 'light', value: '#ffffff' }
			}
		},
		controls: {
			matchers: {
				color: /(background|color)$/i,
				date: /Date$/i
			}
		}
	},

	initialGlobals: {
		backgrounds: {
			value: 'dark'
		}
	}
};

export default preview;
