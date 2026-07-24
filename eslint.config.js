import eslintPluginSvelte from 'eslint-plugin-svelte';
import prettier from 'eslint-config-prettier';
import tseslint from 'typescript-eslint';

export default tseslint.config(
	{
		ignores: ['build', '.svelte-kit', 'dist', 'node_modules', 'as', '.agents', '.mimocode']
	},
	...tseslint.configs.recommended,
	...tseslint.configs.stylistic,
	{
		rules: {
			'no-console': 'warn',
			'@typescript-eslint/no-unused-vars': [
				'error',
				{ argsIgnorePattern: '^_', varsIgnorePattern: '^_' }
			]
		}
	},
	...eslintPluginSvelte.configs['flat/recommended'],
	{
		files: ['**/*.svelte', '**/*.svelte.ts', '**/*.svelte.js'],
		languageOptions: {
			parserOptions: {
				parser: tseslint.parser
			}
		}
	},
	...eslintPluginSvelte.configs['flat/prettier'],
	prettier
);
