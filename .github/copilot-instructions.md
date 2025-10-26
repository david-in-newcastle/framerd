# FramerD VS Code Extension - AI Coding Guide

## Project Overview
FramerD is a VS Code extension that provides AI-powered prose review using Claude's API. It analyzes text documents and provides structured feedback through VS Code's diagnostic system with quick-fix code actions.

## Architecture & Key Components

### Core Flow
1. **Command Registration**: `helloworld.davidsCmd` triggers prose analysis with default prompt, `helloworld.selectPromptAndReview` allows prompt selection
2. **Configuration System**: Prompts defined in VS Code settings with temperature, context, and behavior parameters
3. **API Integration**: Calls Claude API with dynamically constructed system prompts based on selected configuration
4. **Diagnostics Pipeline**: Converts AI suggestions to VS Code diagnostics with severity mapping
5. **Code Actions**: Provides quick-fix suggestions through `FramerDCodeActionProvider`

### Critical Files
- `src/extension.ts`: Main extension logic, API integration, diagnostics handling, and configuration management
- `src/types.ts`: TypeScript interfaces for `ReviewResponse`, `Suggestion`, and `PromptConfig` structures
- `src/test/mock-response.json`: Example API response structure for testing
- `.env`: Contains `ANTHROPIC_API_KEY` (create locally, not committed)
- VS Code settings: `framerd.prompts` object with named prompt configurations

## Development Patterns

### Environment Configuration
```typescript
// Always check for API key at activation
const apiKey = process.env.ANTHROPIC_API_KEY;
if (!apiKey) {
    vscode.window.showErrorMessage('FramerD: ANTHROPIC_API_KEY not found in .env file');
    return;
}
```

### Prompt Configuration System
Prompts are defined in VS Code settings under `framerd.prompts` with structure:
```typescript
interface PromptConfig {
    temperature: number;     // 0.0-1.0 for API temperature
    context: string;        // Description of text type/domain
    behaviour: string;      // Instructions for review approach
}
```

Access configuration: `vscode.workspace.getConfiguration('framerd').get<Record<string, PromptConfig>>('prompts')`

Default prompt selection: `framerd.defaultPrompt` setting specifies which prompt to use with basic command

### Diagnostic ID Management
Uses `crypto.randomUUID()` for diagnostic codes and maintains a `Map<string, Suggestion>` to link diagnostics to their rewrites. This pattern enables the code action provider to retrieve specific suggestions.

### API Response Handling
Claude API responses use tool calling with specific schema:
- Tool name: `provide_review`
- Response extraction: `data.content.find(block => block.type === 'tool_use').input`
- Always validate tool_use presence before accessing input
- Uses `tool_choice: { type: 'tool', name: 'provide_review' }` to enforce structured responses

### Text Matching Strategy
Uses `text.indexOf(s.target_excerpt)` to locate suggestion targets in documents. Convert string indices to VS Code positions with `document.positionAt()`.

## Build & Development Workflow

### Essential Commands
- `npm run watch`: TypeScript compilation in watch mode (use the VS Code task)
- `npm run compile`: One-time compilation
- `npm run lint`: ESLint validation
- **F5 in VS Code**: Launch Extension Development Host for manual testing

### Testing Approach
- Currently manual: Launch extension under debugger (F5) and trigger `helloworld.davidsCmd`
- Mock API responses available in `src/test/mock-response.json` for development reference
- Formal test suite in `src/test/extension.test.ts` is minimal placeholder

## VS Code Integration Specifics

### Extension Activation
- Activates on `onLanguage` (any language file opened)
- Registers both command and code action provider during activation
- Uses `context.subscriptions.push()` for proper cleanup

### Diagnostics Collection
```typescript
const diagnosticCollection = vscode.languages.createDiagnosticCollection('framerd');
// Clear previous diagnostics by setting empty array before adding new ones
diagnosticCollection.set(editor.document.uri, diagnostics);
```

### Code Action Provider Pattern
- Filters diagnostics by `source: 'FramerD'`
- Uses diagnostic `code` property to retrieve suggestions from global Map
- Sets `isPreferred: true` for primary quick-fix prominence

## Dependencies & External Integration

### Required Dependencies
- `dotenv`: Environment variable loading from `.env`
- `@types/vscode`: VS Code API type definitions
- Claude API: Anthropic's messages endpoint with tool calling

### Development Dependencies
Standard VS Code extension stack: TypeScript, ESLint with TypeScript rules, Mocha for testing.

## Project-Specific Conventions

- Diagnostic source always set to `'FramerD'` for filtering
- Severity mapping: `high` → Error, `moderate` → Warning, `low` → Information
- Output channel named `'FramerD'` for consistent logging
- Command namespace: `helloworld.*` (legacy from template, consider renaming)
- File organization: Types in separate file, tests include mock data