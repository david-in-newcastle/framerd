# VSCode Extension Test Runner

## Overview

VSCode provides a specialized test runner for testing extensions in a real extension host environment. This is different from Jest unit tests.

## What is the Extension Host?

The **Extension Host** is a separate Node.js process that:
- Runs your extension code
- Provides real VSCode APIs (not mocks)
- Has access to the editor, workspace, files, etc.
- Simulates a real VSCode environment

Think of it as: **Jest = fast mocked tests**, **VSCode Test Runner = real environment integration tests**

## Test Structure

VSCode extension tests use **Mocha** (not Jest) and run in the extension host:

```typescript
// src/test/extension.test.ts
import * as assert from 'assert';
import * as vscode from 'vscode';

suite('Extension Test Suite', () => {
    vscode.window.showInformationMessage('Start all tests.');

    test('Sample test', () => {
        assert.strictEqual(-1, [1, 2, 3].indexOf(5));
    });
    
    test('Extension is activated', async () => {
        // This runs in a REAL VSCode instance
        const ext = vscode.extensions.getExtension('your.extension.id');
        assert.ok(ext);
        await ext.activate();
    });
    
    test('Command is registered', async () => {
        // Test real commands
        const commands = await vscode.commands.getCommands();
        assert.ok(commands.includes('framerd.review'));
    });
    
    test('Can create diagnostics', async () => {
        // Open a real file
        const doc = await vscode.workspace.openTextDocument({
            content: 'test content'
        });
        
        // Create real editor
        const editor = await vscode.window.showTextDocument(doc);
        
        // Run your command
        await vscode.commands.executeCommand('framerd.review');
        
        // Verify diagnostics were created
        const diagnostics = vscode.languages.getDiagnostics(doc.uri);
        assert.ok(diagnostics.length > 0);
    });
});
```

## Running Extension Tests

### From Command Line
```bash
npm run test:e2e
```

### From VSCode
1. Open Run and Debug panel (Cmd+Shift+D)
2. Select "Extension Tests" from dropdown
3. Press F5

This will:
1. Compile your extension
2. Launch a new VSCode window (Extension Host)
3. Load your extension
4. Run all tests in `src/test/**/*.test.ts`
5. Show results in Debug Console

## Configuration

Extension tests are configured in `.vscode-test.mjs`:

```javascript
import { defineConfig } from '@vscode/test-cli';

export default defineConfig({
    files: 'out/test/**/*.test.js',  // Compiled test files
    version: 'stable',                // VSCode version to use
    workspaceFolder: './test-workspace', // Test workspace
    launchArgs: [
        '--disable-extensions',       // Disable other extensions
        '--disable-gpu'               // Faster headless testing
    ],
    mocha: {
        ui: 'tdd',                    // Mocha test style
        timeout: 20000                // Test timeout
    }
});
```

## When to Use Extension Tests vs Jest

### Use Jest (Unit/Integration with Mocks)
✅ Parsing logic  
✅ Utility functions  
✅ Fast iteration during development  
✅ CI/CD (runs in seconds)  
✅ Testing with various inputs  

### Use Extension Host Tests
✅ Command registration  
✅ Configuration loading  
✅ Real editor interaction  
✅ Workspace file operations  
✅ UI components (webviews, quick picks)  
✅ Extension activation  
✅ Full end-to-end workflows  

## Example: Complete E2E Test

```typescript
// src/test/framerd-e2e.test.ts
import * as assert from 'assert';
import * as vscode from 'vscode';
import * as path from 'path';
import { createMockAnthropicClient } from './mocks/anthropic-stream';
import { Fixtures } from './fixtures';

suite('FramerD E2E Tests', () => {
    let mockApiClient: any;
    
    setup(() => {
        // Mock the API for E2E tests (no real API calls)
        mockApiClient = createMockAnthropicClient(
            Fixtures.responses.complete()
        );
        
        // Inject mock (you'll need to modify extension.ts to support this)
        // or use environment variables to enable test mode
    });
    
    test('Review command creates diagnostics', async () => {
        // Open test document
        const testFile = path.join(__dirname, '../../test-fixtures/documents/simple-test.txt');
        const doc = await vscode.workspace.openTextDocument(testFile);
        const editor = await vscode.window.showTextDocument(doc);
        
        // Run FramerD review command
        await vscode.commands.executeCommand('helloworld.davidsCmd');
        
        // Wait for async processing
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // Verify diagnostics were created
        const diagnostics = vscode.languages.getDiagnostics(doc.uri);
        assert.ok(diagnostics.length > 0, 'Should create diagnostics');
        
        // Verify diagnostic content
        const firstDiag = diagnostics[0];
        assert.strictEqual(firstDiag.source, 'FramerD');
        assert.ok(firstDiag.message.length > 0);
    });
    
    test('Quick fix applies correctly', async () => {
        const doc = await vscode.workspace.openTextDocument({
            content: 'The cat sat on mat.'
        });
        const editor = await vscode.window.showTextDocument(doc);
        
        // Run review
        await vscode.commands.executeCommand('helloworld.davidsCmd');
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // Get diagnostics
        const diagnostics = vscode.languages.getDiagnostics(doc.uri);
        assert.ok(diagnostics.length > 0);
        
        // Get code actions (quick fixes)
        const codeActions = await vscode.commands.executeCommand<vscode.CodeAction[]>(
            'vscode.executeCodeActionProvider',
            doc.uri,
            diagnostics[0].range
        );
        
        assert.ok(codeActions && codeActions.length > 0, 'Should have code actions');
        
        // Apply first fix
        const fix = codeActions[0];
        if (fix.edit) {
            await vscode.workspace.applyEdit(fix.edit);
        }
        
        // Verify text changed
        const newText = doc.getText();
        assert.strictEqual(newText, 'The cat sat on the mat.');
    });
});
```

## Debugging Extension Tests

### Set Breakpoints
1. Set breakpoint in test file or extension code
2. Run "Extension Tests" debug configuration
3. Execution will pause at breakpoints
4. Inspect variables, step through code

### Console Output
```typescript
test('Debug output', () => {
    console.log('This appears in Debug Console');
    assert.ok(true);
});
```

### Test Workspace
Extension tests can use a test workspace:
```
test-workspace/
├── .vscode/
│   └── settings.json
├── test-file.txt
└── another-file.md
```

Configure in `.vscode-test.mjs`:
```javascript
workspaceFolder: './test-workspace'
```

## Headless vs Headed

### Headed (Default)
- Opens visible VSCode window
- Slower but easier to debug
- See what's happening

### Headless (CI)
```javascript
// .vscode-test.mjs
export default defineConfig({
    launchArgs: [
        '--disable-extensions',
        '--disable-gpu',
        '--headless'  // ← No GUI
    ]
});
```

## CI/CD Integration

```yaml
# .github/workflows/test.yml
name: Test
on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
      - run: npm install
      - run: npm run test:unit        # Fast Jest tests
      - run: xvfb-run npm run test:e2e  # Extension tests with virtual display
```

## Best Practices

### ✅ DO:
- Use Jest for most tests (faster)
- Use Extension Host for integration verification
- Mock API calls even in E2E tests
- Clean up test workspace between tests
- Use `setup()` and `teardown()` hooks

### ❌ DON'T:
- Make real API calls in E2E tests
- Rely on timing (use proper async/await)
- Leave files/diagnostics lingering
- Test parsing logic in Extension Host (use Jest)
- Forget to compile before running tests

## Summary

| Feature | Jest (Unit) | Extension Host (E2E) |
|---------|-------------|---------------------|
| Speed | Very fast | Slower |
| Environment | Node.js | Real VSCode |
| APIs | Mocked | Real |
| Use for | Logic, parsing | Commands, UI |
| CI/CD | Easy | Requires X11 |
| Debugging | Standard | VSCode debugger |

**Strategy**: Write most tests in Jest, use Extension Host only for features that truly need the VSCode environment.
