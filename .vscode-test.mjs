import { defineConfig } from '@vscode/test-cli';

export default defineConfig({
	// Only run extension.test.js (Mocha test), not Jest tests
	files: 'out/test/extension.test.js',
	workspaceFolder: './test-workspace',
	mocha: {
		ui: 'tdd',
		timeout: 20000
	}
});
