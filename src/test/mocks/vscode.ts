/**
 * Mock VSCode components for testing
 * 
 * Provides minimal mocks of vscode types needed for testing
 * without running the full extension host.
 */

import * as vscode from 'vscode';

/**
 * Create a mock TextDocument
 */
export function createMockDocument(text: string, uri?: vscode.Uri): vscode.TextDocument {
    const lines = text.split('\n');
    
    // Define offsetAt function first so getText can use it
    const offsetAt = (position: vscode.Position) => {
        let offset = 0;
        for (let i = 0; i < position.line && i < lines.length; i++) {
            offset += lines[i].length + 1; // +1 for newline
        }
        offset += position.character;
        return offset;
    };
    
    return {
        uri: uri || vscode.Uri.file('/test/document.txt'),
        fileName: '/test/document.txt',
        isUntitled: false,
        languageId: 'plaintext',
        version: 1,
        isDirty: false,
        isClosed: false,
        eol: vscode.EndOfLine.LF,
        lineCount: lines.length,
        
        save: async () => true,
        
        lineAt: (line: number | vscode.Position) => {
            const lineNum = typeof line === 'number' ? line : line.line;
            return {
                lineNumber: lineNum,
                text: lines[lineNum] || '',
                range: new vscode.Range(lineNum, 0, lineNum, lines[lineNum]?.length || 0),
                rangeIncludingLineBreak: new vscode.Range(lineNum, 0, lineNum, lines[lineNum]?.length || 0),
                firstNonWhitespaceCharacterIndex: 0,
                isEmptyOrWhitespace: !lines[lineNum]?.trim()
            };
        },
        
        offsetAt,
        
        positionAt: (offset: number) => {
            let currentOffset = 0;
            for (let line = 0; line < lines.length; line++) {
                const lineLength = lines[line].length + 1; // +1 for newline
                if (currentOffset + lineLength > offset) {
                    return new vscode.Position(line, offset - currentOffset);
                }
                currentOffset += lineLength;
            }
            return new vscode.Position(lines.length - 1, lines[lines.length - 1]?.length || 0);
        },
        
        getText: (range?: vscode.Range) => {
            if (!range) return text;
            
            // Use offsetAt to convert positions to offsets
            const startOffset = offsetAt(range.start);
            const endOffset = offsetAt(range.end);
            
            return text.slice(startOffset, endOffset);
        },
        
        getWordRangeAtPosition: () => undefined,
        validateRange: (range: vscode.Range) => range,
        validatePosition: (position: vscode.Position) => position
    } as any as vscode.TextDocument;
}

/**
 * Create a mock TextEditor
 */
export function createMockEditor(document: vscode.TextDocument): vscode.TextEditor {
    return {
        document,
        selection: new vscode.Selection(0, 0, 0, 0),
        selections: [new vscode.Selection(0, 0, 0, 0)],
        visibleRanges: [new vscode.Range(0, 0, document.lineCount, 0)],
        options: {
            tabSize: 4,
            insertSpaces: true,
            cursorStyle: vscode.TextEditorCursorStyle.Line,
            lineNumbers: vscode.TextEditorLineNumbersStyle.On
        },
        viewColumn: vscode.ViewColumn.One,
        
        edit: async (callback: (editBuilder: any) => void) => {
            // Mock edit builder - doesn't actually modify document
            const editBuilder = {
                replace: (range: vscode.Range, text: string) => {},
                insert: (position: vscode.Position, text: string) => {},
                delete: (range: vscode.Range) => {}
            };
            callback(editBuilder);
            return true;
        },
        
        insertSnippet: async () => true,
        setDecorations: () => {},
        revealRange: () => {},
        show: () => {},
        hide: () => {}
    } as any as vscode.TextEditor;
}

/**
 * Create a mock DiagnosticCollection
 */
export function createMockDiagnosticCollection(): vscode.DiagnosticCollection {
    const diagnostics = new Map<string, vscode.Diagnostic[]>();
    
    return {
        name: 'test',
        
        set(uriOrEntries: vscode.Uri | [vscode.Uri, vscode.Diagnostic[] | undefined][], diagnostics_?: vscode.Diagnostic[]): void {
            if (Array.isArray(uriOrEntries)) {
                // Array of entries
                for (const [uri, diags] of uriOrEntries) {
                    diagnostics.set(uri.toString(), diags || []);
                }
            } else {
                // Single entry
                diagnostics.set(uriOrEntries.toString(), diagnostics_ || []);
            }
        },
        
        delete(uri: vscode.Uri) {
            diagnostics.delete(uri.toString());
        },
        
        clear() {
            diagnostics.clear();
        },
        
        forEach(callback: (uri: vscode.Uri, diagnostics: vscode.Diagnostic[], collection: vscode.DiagnosticCollection) => any) {
            for (const [uriStr, diags] of diagnostics.entries()) {
                callback(vscode.Uri.parse(uriStr), diags, this);
            }
        },
        
        get(uri: vscode.Uri) {
            return diagnostics.get(uri.toString());
        },
        
        has(uri: vscode.Uri) {
            return diagnostics.has(uri.toString());
        },
        
        dispose() {
            diagnostics.clear();
        },
        
        // For testing: get all diagnostics
        _getAllDiagnostics() {
            return diagnostics;
        }
    } as any as vscode.DiagnosticCollection;
}

/**
 * Create a mock OutputChannel
 */
export function createMockOutputChannel(): vscode.OutputChannel {
    const lines: string[] = [];
    
    return {
        name: 'test',
        
        append(value: string) {
            lines.push(value);
        },
        
        appendLine(value: string) {
            lines.push(value + '\n');
        },
        
        replace(value: string) {
            lines.length = 0;
            lines.push(value);
        },
        
        clear() {
            lines.length = 0;
        },
        
        show() {},
        hide() {},
        dispose() {},
        
        // For testing: get output
        _getOutput() {
            return lines.join('');
        }
    } as any as vscode.OutputChannel;
}
