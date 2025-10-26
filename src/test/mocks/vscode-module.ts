/**
 * Mock vscode module for Jest tests
 * 
 * Provides minimal vscode types without requiring the real VSCode extension host.
 * This allows unit tests to run in plain Node.js/Jest environment.
 */

// Export basic types and enums that tests need
export class Uri {
    static file(path: string): Uri {
        return new Uri(path);
    }
    
    static parse(value: string): Uri {
        return new Uri(value);
    }
    
    constructor(public readonly path: string) {}
    
    toString() {
        return this.path;
    }
}

export class Position {
    constructor(public line: number, public character: number) {}
}

export class Range {
    constructor(
        public start: Position,
        public end: Position
    ) {}
    
    intersection(other: Range): Range | undefined {
        // Simplified intersection check
        if (this.end.line < other.start.line || this.start.line > other.end.line) {
            return undefined;
        }
        return this; // Simplified
    }
}

export class Selection extends Range {
    constructor(
        anchor: Position,
        active: Position
    ) {
        super(anchor, active);
    }
}

export class Diagnostic {
    constructor(
        public range: Range,
        public message: string,
        public severity?: DiagnosticSeverity
    ) {}
    
    source?: string;
    code?: string | number;
}

export enum DiagnosticSeverity {
    Error = 0,
    Warning = 1,
    Information = 2,
    Hint = 3
}

export enum EndOfLine {
    LF = 1,
    CRLF = 2
}

export enum TextEditorLineNumbersStyle {
    Off = 0,
    On = 1,
    Relative = 2
}

export enum TextEditorCursorStyle {
    Line = 1,
    Block = 2,
    Underline = 3,
    LineThin = 4,
    BlockOutline = 5,
    UnderlineThin = 6
}

export enum ViewColumn {
    Active = -1,
    Beside = -2,
    One = 1,
    Two = 2,
    Three = 3
}

export enum CodeActionKind {
    QuickFix = 'quickfix',
    Refactor = 'refactor',
    RefactorExtract = 'refactor.extract',
    RefactorInline = 'refactor.inline',
    RefactorRewrite = 'refactor.rewrite',
    Source = 'source',
    SourceOrganizeImports = 'source.organizeImports',
    SourceFixAll = 'source.fixAll'
}

export class CodeAction {
    title: string;
    edit?: any;
    diagnostics?: Diagnostic[];
    command?: any;
    kind?: CodeActionKind;
    isPreferred?: boolean;
    
    constructor(title: string, kind?: CodeActionKind) {
        this.title = title;
        this.kind = kind;
    }
}

export class WorkspaceEdit {
    replace(uri: Uri, range: Range, newText: string): void {}
    insert(uri: Uri, position: Position, newText: string): void {}
    delete(uri: Uri, range: Range): void {}
}

// Export interfaces that tests might use
export interface TextDocument {
    uri: Uri;
    fileName: string;
    isUntitled: boolean;
    languageId: string;
    version: number;
    isDirty: boolean;
    isClosed: boolean;
    eol: EndOfLine;
    lineCount: number;
    
    save(): Thenable<boolean>;
    lineAt(line: number | Position): any;
    offsetAt(position: Position): number;
    positionAt(offset: number): Position;
    getText(range?: Range): string;
    getWordRangeAtPosition(position: Position): Range | undefined;
    validateRange(range: Range): Range;
    validatePosition(position: Position): Position;
}

export interface TextEditor {
    document: TextDocument;
    selection: Selection;
    selections: Selection[];
    visibleRanges: Range[];
    options: any;
    viewColumn?: ViewColumn;
    
    edit(callback: (editBuilder: any) => void): Thenable<boolean>;
    insertSnippet(snippet: any, location?: Position | Range | Position[] | Range[]): Thenable<boolean>;
    setDecorations(decorationType: any, rangesOrOptions: Range[]): void;
    revealRange(range: Range): void;
    show(column?: ViewColumn): void;
    hide(): void;
}

export interface DiagnosticCollection {
    readonly name: string;
    set(uri: Uri, diagnostics: Diagnostic[] | undefined): void;
    delete(uri: Uri): void;
    clear(): void;
    forEach(callback: (uri: Uri, diagnostics: Diagnostic[], collection: DiagnosticCollection) => any): void;
    get(uri: Uri): Diagnostic[] | undefined;
    has(uri: Uri): boolean;
    dispose(): void;
}

export interface OutputChannel {
    readonly name: string;
    append(value: string): void;
    appendLine(value: string): void;
    replace(value: string): void;
    clear(): void;
    show(preserveFocus?: boolean): void;
    hide(): void;
    dispose(): void;
}

// Stub namespaces
export namespace languages {
    export function createDiagnosticCollection(name?: string): DiagnosticCollection {
        throw new Error('Use mock from src/test/mocks/vscode.ts instead');
    }
    
    export function getDiagnostics(uri?: Uri): Diagnostic[] {
        return [];
    }
}

export namespace window {
    export function createOutputChannel(name: string): OutputChannel {
        throw new Error('Use mock from src/test/mocks/vscode.ts instead');
    }
    
    export function showInformationMessage(message: string): void {}
    export function showErrorMessage(message: string): void {}
    export function showWarningMessage(message: string): void {}
}

export namespace workspace {
    export function openTextDocument(options: any): Thenable<TextDocument> {
        throw new Error('Use mock from src/test/mocks/vscode.ts instead');
    }
}

export namespace commands {
    export function executeCommand(command: string, ...args: any[]): Thenable<any> {
        return Promise.resolve();
    }
}

export type Thenable<T> = Promise<T>;
