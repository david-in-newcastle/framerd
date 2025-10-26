import * as assert from 'assert';
import * as vscode from 'vscode';

suite('Extension Test Suite', () => {
	vscode.window.showInformationMessage('Running FramerD E2E tests...');

	test('Extension should be present', () => {
		assert.ok(vscode.extensions.getExtension('undefined_publisher.framerd'));
	});

	test('Should register review command', async () => {
		const commands = await vscode.commands.getCommands(true);
		assert.ok(commands.includes('framerd.review'));
	});
	
	test('Sample arithmetic test', () => {
		assert.strictEqual(-1, [1, 2, 3].indexOf(5));
		assert.strictEqual(-1, [1, 2, 3].indexOf(0));
	});
});
