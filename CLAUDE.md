# Claude Assistant Guide - FramerD VSCode Extension

## Project Overview
FramerD is a VSCode extension that provides AI-powered prose review using Claude API. It analyzes text documents, identifies issues (grammar, style, spelling), and offers quick fixes through VSCode's diagnostic system.

**Key Features:**
- Streaming API responses for real-time feedback
- Diagnostic integration with VSCode Problems panel
- Quick fix suggestions with code actions
- Custom dictionary support
- Partial text matching for robust excerpt finding

## Project Structure

```
framerd-clean/
├── src/
│   ├── extension.ts          # Main extension entry point (VSCode-dependent)
│   ├── parsing.ts             # Response parsing logic (pure, testable)
│   ├── excerpt-matching.ts    # Text matching utilities (pure, testable)
│   ├── dictionary-utils.ts    # Dictionary/spelling utilities (pure, testable)
│   ├── logger.ts              # Logging utilities
│   ├── types.ts               # TypeScript type definitions
│   ├── prompt-one.md          # LLM prompt for review
│   └── test/
│       ├── setup.ts                      # Jest setup
│       ├── parsing.test.ts               # Parsing tests
│       ├── partial-matching.test.ts      # Excerpt matching tests
│       ├── diagnostic-integration.test.ts # Diagnostic tests
│       ├── dictionary.test.ts            # Dictionary tests
│       ├── streaming-integration.test.ts # Streaming tests
│       ├── parsing-bugs.test.ts          # Regression tests
│       ├── quote-bug.test.ts             # Quote handling tests
│       └── mocks/
│           └── vscode-module.ts          # Mock VSCode API for tests
├── test-fixtures/                         # Test data files
├── jest.config.js                         # Jest configuration
├── tsconfig.json                          # TypeScript config
└── package.json                           # Dependencies and scripts
```

## Architecture Patterns

### Separation of Concerns
**CRITICAL:** Keep VSCode-dependent code separate from testable logic.

- **Pure modules** (no VSCode imports): `parsing.ts`, `excerpt-matching.ts`, `dictionary-utils.ts`
  - Can be tested with Jest without mocking
  - Export functions that can be imported by tests
  
- **VSCode-dependent modules**: `extension.ts`
  - Contains activation logic, diagnostics, code actions
  - Imports pure modules for core logic
  - Harder to test, keep minimal

### Recent Refactoring (Oct 26, 2025)
- Moved `findExcerptPartialMatch` from `extension.ts` to `excerpt-matching.ts` for testability
- This pattern should be followed for any new utility functions

## Testing Patterns

### Test Framework
- **Jest** for unit tests (fast, no extension host)
- Tests live in `src/test/`
- Configuration: `jest.config.js`

### Running Tests
```bash
npm run test:unit  # Run all Jest tests
```

### Test Conventions
1. **Import from pure modules only**: `import { func } from '../parsing'`
2. **Mock VSCode when needed**: Use `src/test/mocks/vscode-module.ts`
3. **No logger mocking needed** for pure functions (logger removed from pure modules)
4. **Use fixtures**: Store test data in `test-fixtures/`
5. **Test file naming**: `*.test.ts` (not `*.spec.ts`)

### Example Test Structure
```typescript
import { functionToTest } from '../pure-module';

describe('Feature', () => {
    describe('Sub-feature', () => {
        it('does something specific', () => {
            // Arrange
            const input = 'test';
            
            // Act
            const result = functionToTest(input);
            
            // Assert
            expect(result).toBe('expected');
        });
    });
});
```

## Tool Usage Guidance

### File System Access
**IMPORTANT:** This project is in a mounted directory. Bash tools have limited access.

**DO:**
- Use filesystem tools: `filesystem:read_text_file`, `filesystem:write_file`, `filesystem:edit_file`
- Use filesystem:list_directory to explore structure
- Use view tool for viewing files

**DON'T:**
- Use `cd` in bash (won't work with mounted paths)
- Rely on bash for file operations in `/Users/david/vscode-exten/first/framerd-clean/`

### Allowed Directory
All file operations must be within: `/Users/david/vscode-exten/first/framerd-clean/`

## Key Conventions

### Diagnostics and Severity
- **No Hints**: Never use `DiagnosticSeverity.Hint` (too subtle, not shown in Problems panel)
- **Severity mapping**:
  - `high` → Error (red)
  - `moderate` → Warning (yellow)
  - `low` → Information (blue)
- Show diagnostics at correct location even without quick fixes
- Only use line 1 fallback when excerpt truly not found

### Excerpt Matching Strategy
1. Try exact match first (fast path)
2. If fails and excerpt ≥20 chars, try partial match
3. If both fail, place diagnostic at line 1
4. Track statistics: `shown`, `noLocation`, `partialMatches`, `filtered`

### Code Style
- Use TypeScript
- Prefer explicit types over implicit
- Use `const` over `let` when possible
- Comment complex logic
- Log important events for debugging

## Statistics Tracking

The extension tracks diagnostic outcomes:
```typescript
suggestionStats = {
    total: 0,           // Total suggestions from LLM
    shown: 0,           // Shown at correct location
    noLocation: 0,      // Shown at line 1 (excerpt not found)
    filtered: 0,        // Filtered by dictionary
    partialMatches: 0   // Found via partial matching
}
```

## Current State (Oct 26, 2025)

### Recent Changes - Session Complete ✅
1. **Eliminated Hints** - All diagnostics use proper severity (Error/Warning/Info)
   - Before: 26 issues shown as grey hint dots (not in Problems panel)
   - After: All issues visible in Problems panel with proper colors

2. **Fixed Diagnostic Placement** - Show diagnostics at correct location even without quick fixes
   - Bug: When excerpt found but overlapping/not-fixable, diagnostic fell through to line 1
   - Fix: Now shows at correct location, just without code action

3. **Partial Matching Implemented** - First N + last N character matching for boundary issues
   - Algorithm: Uses first/last 50 chars (or 25% of excerpt) with ±50 char search window
   - Minimum excerpt length: 20 chars
   - Location: `src/excerpt-matching.ts` (pure module, testable)

4. **Comprehensive Test Suite** - Added partial matching tests
   - New file: `src/test/partial-matching.test.ts`
   - 20+ test cases covering boundary issues, length variations, edge cases
   - All tests passing ✅

### Performance Metrics
**Before optimization:**
- 34 diagnostics shown at correct location
- 26 shown as hints (grey dots, not in Problems panel)
- 2 filtered by dictionary
- **Total useful diagnostics: 34**

**After optimization:**
- 52 diagnostics shown at correct location
- 6 found via partial matching (new capability)
- 9 at line 1 (couldn't find excerpt)
- 2 filtered by dictionary
- **Total useful diagnostics: 52 (+53% improvement)**

**Success rate:** 86% of excerpts found (52/61)

### Remaining "Not Found" Cases (9 total)
Analysis of the 9 excerpts that still go to line 1:
- 2 too short (< 20 chars, below partial matching threshold)
- 3 whitespace/punctuation differences (space after comma, paragraph breaks)
- 3 LLM extracted typo instead of corrected text
- 1 complex choice requiring human judgment

**Decision:** Acceptable for MVP. Further improvement would require:
- Lower threshold (15 chars)
- Whitespace normalization
- Prompt engineering / evaluation framework
- Not worth the effort for personal tool

### Test Status
✅ **7 test suites, 97 tests passing**
- parsing.test.ts
- partial-matching.test.ts (NEW)
- diagnostic-integration.test.ts
- dictionary.test.ts
- streaming-integration.test.ts
- parsing-bugs.test.ts
- quote-bug.test.ts

### Known Issues
None. Extension ready for use.

## API Integration

### Claude API
- Model: `claude-sonnet-4-5-20250929`
- Streaming: Yes (uses `@anthropic-ai/sdk`)
- Max tokens: 16384
- Temperature: 0.25
- API key loaded from `.env` file

### Response Format
LLM returns structured text with issue blocks:
```
---
ISSUE N
EXCERPT: "text to highlight"
CATEGORY: grammar|spelling|style|etc
SEVERITY: high|moderate|low
PROBLEM: Description of issue
FIX: Suggested correction
```

Parsed by `parsing.ts` module.

## Common Tasks

### Adding a New Test
1. Create `*.test.ts` in `src/test/`
2. Import from pure modules (no VSCode deps)
3. Run `npm run test:unit` to verify

### Adding a New Utility Function
1. Determine if it needs VSCode APIs
2. If NO: Add to appropriate pure module (`parsing.ts`, `excerpt-matching.ts`, etc.)
3. If YES: Add to `extension.ts` (but consider extracting logic to pure module)
4. Export if it needs testing
5. Write tests

### Debugging
- Check FramerD output channel in VSCode
- Look for performance summary in logs
- Check suggestion stats in logs
- Review test output for failures

## User Preferences
- **Directness preferred**: User prefers straightforward communication
- **Software engineer**: Familiar with C# and many languages
- **Fiction writer**: Context for prose review features

## Tips for Future Claude Sessions
1. Start by reading this file
2. Check test status: `npm run test:unit`
3. Use filesystem tools, not bash, for file operations
4. Keep VSCode-free code in pure modules
5. Write tests for new functionality
6. Don't quote from search results (copyright)
7. Update this file if you add major features or patterns
