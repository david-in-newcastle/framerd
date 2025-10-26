/**
 * Integration Tests - Diagnostic Creation
 * 
 * Tests the diagnostic creation pipeline with mocked VSCode components.
 * No extension host required - fast unit-style tests.
 */

import { parseCompleteIssueBlocks, ParsedSuggestion, isQuickFixable } from '../parsing';
import { createMockDocument, createMockEditor, createMockDiagnosticCollection } from './mocks/vscode';
import { Fixtures, loadDocument, loadResponse } from './fixtures';
import * as vscode from 'vscode';

// Simplified version of addSuggestionAsDiagnostic for testing
function createDiagnosticFromSuggestion(
    suggestion: ParsedSuggestion,
    document: vscode.TextDocument
): vscode.Diagnostic | null {
    if (!suggestion.target_excerpt) return null;
    
    const text = document.getText();
    const index = text.indexOf(suggestion.target_excerpt);
    
    if (index === -1) return null;
    
    const startPos = document.positionAt(index);
    const endPos = document.positionAt(index + suggestion.target_excerpt.length);
    const range = new vscode.Range(startPos, endPos);
    
    const severity = suggestion.severity === 'high' ? vscode.DiagnosticSeverity.Error :
                    suggestion.severity === 'moderate' ? vscode.DiagnosticSeverity.Warning :
                    vscode.DiagnosticSeverity.Information;
    
    const diagnostic = new vscode.Diagnostic(range, suggestion.comment, severity);
    diagnostic.source = 'FramerD';
    
    return diagnostic;
}

describe('Integration: Diagnostic Creation', () => {
    describe('Simple document with known issues', () => {
        it('creates diagnostics for all issues', () => {
            const docText = loadDocument('simple-test.txt');
            const responseText = loadResponse('complete-valid.txt');
            
            const document = createMockDocument(docText);
            const suggestions = parseCompleteIssueBlocks(responseText);
            const collection = createMockDiagnosticCollection();
            
            const diagnostics: vscode.Diagnostic[] = [];
            for (const suggestion of suggestions) {
                const diagnostic = createDiagnosticFromSuggestion(suggestion, document);
                if (diagnostic) {
                    diagnostics.push(diagnostic);
                }
            }
            
            collection.set(document.uri, diagnostics);
            
            expect(diagnostics.length).toBe(3);
            expect(diagnostics[0].message).toContain('Missing article');
            expect(diagnostics[1].message).toContain('Incorrect past tense');
            expect(diagnostics[2].message).toContain('Wrong contraction');
        });
        
        it('positions diagnostics correctly', () => {
            const docText = loadDocument('simple-test.txt');
            const responseText = loadResponse('complete-valid.txt');
            
            const document = createMockDocument(docText);
            const suggestions = parseCompleteIssueBlocks(responseText);
            
            const diagnostics: vscode.Diagnostic[] = [];
            for (const suggestion of suggestions) {
                const diagnostic = createDiagnosticFromSuggestion(suggestion, document);
                if (diagnostic) {
                    diagnostics.push(diagnostic);
                }
            }
            
            // Check positions
            // "on mat" should be found in first sentence
            const firstDiag = diagnostics[0];
            expect(firstDiag.range.start.line).toBe(0);
            expect(document.getText(firstDiag.range)).toBe('The cat sat on mat');
        });
    });
    
    describe('Chapter-sized document', () => {
        it('handles multiple issues across multiple lines', () => {
            const docText = loadDocument('chapter-test.txt');
            const responseText = loadResponse('real-session-2025-10-25.txt');
            
            const document = createMockDocument(docText);
            const suggestions = parseCompleteIssueBlocks(responseText);
            
            const diagnostics: vscode.Diagnostic[] = [];
            for (const suggestion of suggestions) {
                const diagnostic = createDiagnosticFromSuggestion(suggestion, document);
                if (diagnostic) {
                    diagnostics.push(diagnostic);
                }
            }
            
            expect(diagnostics.length).toBeGreaterThan(0);
            
            // Verify some specific issues are found
            const georgianIssue = diagnostics.find(d => 
                document.getText(d.range).includes('Georgian terraced')
            );
            expect(georgianIssue).toBeDefined();
            
            const squintIssue = diagnostics.find(d => 
                document.getText(d.range).includes('trying not squint')
            );
            expect(squintIssue).toBeDefined();
        });
    });
    
    describe('Quick fix determination', () => {
        it('marks simple fixes as quick-fixable', () => {
            const responseText = loadResponse('complete-valid.txt');
            const suggestions = parseCompleteIssueBlocks(responseText);
            
            for (const suggestion of suggestions) {
                expect(isQuickFixable(suggestion)).toBe(true);
            }
        });
        
        it('marks complex fixes as non-quick-fixable', () => {
            const responseText = loadResponse('overlapping-excerpts.txt');
            const suggestions = parseCompleteIssueBlocks(responseText);
            
            // Find the suggestion with " or " in FIX
            const document = loadDocument('simple-test.txt');
            
            // The overlapping-excerpts fixture doesn't have " or " but let's test manually
            const complexSuggestion: ParsedSuggestion = {
                comment: 'Test',
                target_excerpt: 'test',
                category: 'grammar',
                severity: 'high',
                explanation: 'Test',
                rewrite: 'option A or option B'
            };
            
            expect(isQuickFixable(complexSuggestion)).toBe(false);
        });
    });
    
    describe('Excerpt not found', () => {
        it('returns null when excerpt not in document', () => {
            const docText = 'This is different text.';
            const document = createMockDocument(docText);
            
            const suggestion: ParsedSuggestion = {
                comment: 'Test',
                target_excerpt: 'The cat sat on mat',
                category: 'grammar',
                severity: 'high',
                explanation: 'Test',
                rewrite: 'The cat sat on the mat'
            };
            
            const diagnostic = createDiagnosticFromSuggestion(suggestion, document);
            expect(diagnostic).toBeNull();
        });
    });
    
    describe('Severity mapping', () => {
        it('maps high severity to Error', () => {
            const docText = 'The cat sat on mat.';
            const document = createMockDocument(docText);
            
            const suggestion: ParsedSuggestion = {
                comment: 'Test',
                target_excerpt: 'The cat sat on mat',
                category: 'grammar',
                severity: 'high',
                explanation: 'Test',
                rewrite: 'The cat sat on the mat'
            };
            
            const diagnostic = createDiagnosticFromSuggestion(suggestion, document);
            expect(diagnostic?.severity).toBe(vscode.DiagnosticSeverity.Error);
        });
        
        it('maps moderate severity to Warning', () => {
            const docText = 'The cat sat on mat.';
            const document = createMockDocument(docText);
            
            const suggestion: ParsedSuggestion = {
                comment: 'Test',
                target_excerpt: 'The cat sat on mat',
                category: 'grammar',
                severity: 'moderate',
                explanation: 'Test',
                rewrite: 'The cat sat on the mat'
            };
            
            const diagnostic = createDiagnosticFromSuggestion(suggestion, document);
            expect(diagnostic?.severity).toBe(vscode.DiagnosticSeverity.Warning);
        });
        
        it('maps low severity to Information', () => {
            const docText = 'The cat sat on mat.';
            const document = createMockDocument(docText);
            
            const suggestion: ParsedSuggestion = {
                comment: 'Test',
                target_excerpt: 'The cat sat on mat',
                category: 'grammar',
                severity: 'low',
                explanation: 'Test',
                rewrite: 'The cat sat on the mat'
            };
            
            const diagnostic = createDiagnosticFromSuggestion(suggestion, document);
            expect(diagnostic?.severity).toBe(vscode.DiagnosticSeverity.Information);
        });
    });
});
