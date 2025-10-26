# FramerD Testing Infrastructure

## Overview

FramerD uses a three-tier testing strategy:

1. **Unit Tests** (Jest) - Fast, isolated tests of parsing logic
2. **Integration Tests** (Jest + Mocks) - Test with mocked API and VSCode components
3. **E2E Tests** (VSCode Test Runner) - Full extension tests in VSCode environment

## Directory Structure

```
src/test/
├── mocks/                      # Mock implementations
│   ├── anthropic-stream.ts    # Mock Anthropic streaming API
│   └── vscode.ts              # Mock VSCode components
├── fixtures.ts                 # Test fixture manager
├── parsing.test.ts            # Unit tests for parsing
├── quote-bug.test.ts          # Regression test for quote bug
├── streaming-integration.test.ts  # Integration: Streaming
├── diagnostic-integration.test.ts # Integration: Diagnostics
└── extension.test.ts          # E2E: Full extension tests

test-fixtures/
├── responses/                 # Claude API response fixtures
│   ├── complete-valid.txt
│   ├── incomplete-streaming.txt
│   ├── malformed-quotes.txt
│   ├── overlapping-excerpts.txt
│   ├── missing-fields.txt
│   └── real-session-2025-10-25.txt
└── documents/                 # Test documents
    ├── simple-test.txt
    └── chapter-test.txt
```

## Running Tests

### All Tests
```bash
npm test
```

### Unit Tests Only (Fast!)
```bash
npm run test:unit
```

### Specific Test File
```bash
npm run test:unit -- parsing.test.ts
npm run test:unit -- streaming-integration.test.ts
```

### With Coverage
```bash
npm run test:coverage
```

### Watch Mode (for development)
```bash
npm run test:watch
```

## Test Categories

### 1. Unit Tests
**Speed**: < 1 second  
**No API calls**: ✅  
**No VSCode required**: ✅

Tests pure parsing logic:
- `parsing.test.ts` - Core parsing functions
- `quote-bug.test.ts` - Specific bug regression tests

### 2. Integration Tests  
**Speed**: < 5 seconds  
**No API calls**: ✅ (mocked)  
**No VSCode required**: ✅ (mocked)

Tests full pipelines with mocks:
- `streaming-integration.test.ts` - Streaming with mock API
- `diagnostic-integration.test.ts` - Diagnostic creation with mock VSCode

### 3. E2E Tests
**Speed**: ~10 seconds  
**No API calls**: ✅ (mocked)  
**VSCode required**: ✅ (extension host)

Full extension tests:
- `extension.test.ts` - Complete command flow

## Using Mocks

### Mock Anthropic Stream

```typescript
import { MockAnthropicStream } from './mocks/anthropic-stream';

const responseText = `---
ISSUE 1
EXCERPT: "test"
CATEGORY: grammar
SEVERITY: high
PROBLEM: Test problem
FIX: "fixed test"`;

const stream = new MockAnthropicStream(responseText, {
    charsPerChunk: 1,        // Simulate character-by-character streaming
    chunkDelay: 0,           // No delay (fast tests)
    abortAfterChunks: 100    // Simulate abort after N chunks
});

// Use like real stream
for await (const event of stream) {
    // Process chunks
}
```

### Mock VSCode Components

```typescript
import { createMockDocument, createMockEditor, createMockDiagnosticCollection } 
    from './mocks/vscode';

const document = createMockDocument('The cat sat on mat.');
const editor = createMockEditor(document);
const diagnostics = createMockDiagnosticCollection();

// Use like real VSCode components
const text = document.getText();
const position = document.positionAt(5);
```

## Using Fixtures

### Load Existing Fixtures

```typescript
import { Fixtures } from './fixtures';

// Predefined fixtures
const response = Fixtures.responses.complete();
const document = Fixtures.documents.simple();

// Or load by name
import { loadResponse, loadDocument } from './fixtures';
const response = loadResponse('real-session-2025-10-25.txt');
const document = loadDocument('chapter-test.txt');
```

### Create New Fixtures

```typescript
import { saveResponse, saveDocument } from './fixtures';

// Save a new response (useful for capturing real API output)
saveResponse('new-edge-case.txt', apiResponseText);

// Save a new test document
saveDocument('new-chapter.txt', documentText);
```

## Adding New Tests

### 1. Unit Test (Parsing Logic)

```typescript
// src/test/my-feature.test.ts
import { parseIssueBlock } from '../parsing';

describe('My Feature', () => {
    it('handles X correctly', () => {
        const block = `EXCERPT: "test"
CATEGORY: grammar
SEVERITY: high
PROBLEM: Test
FIX: "fixed"`;
        
        const result = parseIssueBlock(block);
        expect(result?.rewrite).toBe('fixed');
    });
});
```

### 2. Integration Test (With Mocks)

```typescript
// src/test/my-integration.test.ts
import { MockAnthropicStream } from './mocks/anthropic-stream';
import { loadResponse } from './fixtures';

describe('My Integration', () => {
    it('handles streaming correctly', async () => {
        const stream = new MockAnthropicStream(loadResponse('test.txt'));
        
        // Test streaming logic
        for await (const event of stream) {
            // ...
        }
    });
});
```

### 3. Add New Fixture

1. Create file in `test-fixtures/responses/` or `test-fixtures/documents/`
2. Reference it via `loadResponse('filename.txt')` or `loadDocument('filename.txt')`

## Debugging Tests

### Enable Debug Logging

```typescript
// In setup.ts
process.env.FRAMERD_LOG_LEVEL = 'DEBUG';
```

### Run Single Test

```bash
npm run test:unit -- quote-bug.test.ts -t "strips quotes"
```

### Use VSCode Debugger

1. Set breakpoint in test file
2. Run "Debug Jest Tests" from Run menu
3. Step through test execution

## Best Practices

### ✅ DO:
- Mock API calls for all automated tests
- Use fixtures for consistent test data
- Test edge cases (incomplete streams, malformed data)
- Write descriptive test names
- Keep unit tests fast (< 100ms each)

### ❌ DON'T:
- Make real API calls in automated tests
- Hardcode test data in test files
- Test multiple things in one test
- Skip error cases
- Rely on timing-dependent behavior

## Coverage Goals

- **Parsing logic**: > 95% coverage
- **Integration flows**: > 80% coverage
- **Error handling**: > 90% coverage

Check coverage:
```bash
npm run test:coverage
open coverage/lcov-report/index.html
```

## Capturing Real Responses for Testing

When you encounter a bug or edge case in production:

```typescript
// In callClaudeAPIStreaming, after stream completes
import { saveResponse } from './test/fixtures';

// Save the response for later testing
saveResponse(`bug-${Date.now()}.txt`, fullContent);
```

Then create a regression test using that fixture.

## CI/CD Integration

Tests run automatically on:
- Every commit (unit + integration tests)
- Every PR (all tests + coverage report)
- Before release (full E2E suite)

## Questions?

See the test files for examples of different testing patterns.
