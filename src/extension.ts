// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import * as dotenv from 'dotenv';
import * as fs from 'fs';
import Anthropic from '@anthropic-ai/sdk';
import path from 'path'
import { ReviewResponse, Suggestion, PromptConfig }from './types' 

import { 
    parsePartialBuffer, 
    ParsedSuggestion,
    extractSummary,
    isQuickFixable  
} from './parsing';

import { extractMisspelledWord, isSpellingError } from './dictionary-utils';

import { logger } from './logger';

function parseNaturalLanguageResponse(response: string): ParsedSuggestion[] {
    const suggestions: ParsedSuggestion[] = [];
    
    // Split by issue markers
    const issueBlocks = response.split(/---\s*ISSUE \d+/i).slice(1);
    
    for (const block of issueBlocks) {
        try {
            // Extract fields with regex
            const excerptMatch = block.match(/EXCERPT:\s*["'](.+?)["']/s);
            const categoryMatch = block.match(/CATEGORY:\s*(\S+)/i);
            const severityMatch = block.match(/SEVERITY:\s*(high|moderate|low)/i);
            const problemMatch = block.match(/PROBLEM:\s*(.+?)(?=FIX:|$)/s);
            const fixMatch = block.match(/FIX:\s*(.+?)(?=---|$)/s);
            
            if (excerptMatch && categoryMatch && severityMatch && problemMatch) {
                suggestions.push({
                    comment: problemMatch[1].trim(),
                    target_excerpt: excerptMatch[1].trim(),
                    category: categoryMatch[1].trim(),
                    severity: severityMatch[1].toLowerCase() as 'high' | 'moderate' | 'low',
                    explanation: problemMatch[1].trim(),
                    rewrite: fixMatch ? fixMatch[1].trim() : ''
                });
            }
        } catch (e) {
            // logger.debug('Failed to parse issue block:', e);
        }
    }
    
    return suggestions;
}


// Create this once at the top level, outside the command handler
const outputChannel = vscode.window.createOutputChannel('FramerD');

function loadJsonFile(context: vscode.ExtensionContext): ReviewResponse {
  const filePath = path.join(context.extensionPath, './src/test/mock-response.json');
  const content = fs.readFileSync(filePath, 'utf-8') ;
  return JSON.parse(content) as ReviewResponse;
}

const suggestionMap = new Map<string, Suggestion>();
const diagnosticCollection = vscode.languages.createDiagnosticCollection('framerd');

// Track if copilot warning has been shown this session
let copilotWarningShown = false;

// Sequential diagnostic counter (resets each review)
let diagnosticCounter = 0;

/**
 * Check if GitHub Copilot is active and warn user about conflicts (once per session)
 */
function checkCopilotConflict(): void {
    if (copilotWarningShown) return;
    
    const copilot = vscode.extensions.getExtension('github.copilot');
    
    if (copilot?.isActive) {
        vscode.window.showInformationMessage(
            'FramerD may conflict with Copilot suggestions. Consider disabling Copilot for prose files.',
            'Got it'
        );
        copilotWarningShown = true;
    }
}

class FramerDCodeActionProvider implements vscode.CodeActionProvider {

    provideCodeActions(
        document: vscode.TextDocument,
        range: vscode.Range,
        context: vscode.CodeActionContext
    ): vscode.CodeAction[] {
        const actions: vscode.CodeAction[] = [];
        
        for (const diagnostic of context.diagnostics) {
            if (diagnostic.source !== 'FramerD') continue;
            
            const suggestion = suggestionMap.get(diagnostic.code as string);
            const rewrite = suggestion?.rewrite;

            if (!rewrite) continue;
            
            // Always add "Apply fix" action
            const applyAction = new vscode.CodeAction(
                `FramerD: Apply fix`,
                vscode.CodeActionKind.QuickFix
            );
            applyAction.edit = new vscode.WorkspaceEdit();
            applyAction.edit.replace(document.uri, diagnostic.range, rewrite);
            applyAction.diagnostics = [diagnostic];
            applyAction.isPreferred = true;
            
            // Remove diagnostic after applying fix
            applyAction.command = {
                command: 'framerd.removeDiagnostic',
                title: 'Remove diagnostic',
                arguments: [document.uri, diagnostic.code]
            };
            
            actions.push(applyAction);
            
            // Add "Add to dictionary" action for spelling errors
            if (suggestion && isSpellingError(suggestion)) {
                const word = extractMisspelledWord(suggestion.comment);
                if (word) {
                    const dictAction = new vscode.CodeAction(
                        `Add "${word}" to dictionary`,
                        vscode.CodeActionKind.QuickFix
                    );
                    dictAction.command = {
                        command: 'framerd.addToDictionary',
                        title: 'Add to dictionary',
                        arguments: [document.uri, diagnostic.code, word]
                    };
                    dictAction.diagnostics = [diagnostic];
                    
                    actions.push(dictAction);
                }
            }
        }
        
        return actions;
    }
}

// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {

	// logger.debug('Congratulations, In activate()');
    let isStreamingActive = false;
    let streamAbortRequested = false;
    
    // Load .env from workspace root
    const workspaceFolder = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
    if (workspaceFolder) {
        dotenv.config({ path: path.join(workspaceFolder, '.env') });
        logger.debug(`Loading .env from workspace: ${path.join(workspaceFolder, '.env')}`);
    } else {
        // Fallback to extension directory for development
        dotenv.config({ path: path.join(__dirname, '..', '.env') });
        logger.debug(`Loading .env from extension directory: ${path.join(__dirname, '..', '.env')}`);
    }
    
    const apiKey = process.env.ANTHROPIC_API_KEY; //OPENAI_API_KEY; // Changed from ANTHROPIC
    
    // Set up logger to use outputChannel
    logger.setOutputChannel(outputChannel);
    
    if (!apiKey) {
        vscode.window.showErrorMessage('FramerD: API_KEY not found in .env file');
        return;
    }


	let cap = vscode.languages.registerCodeActionsProvider(
			{ scheme: 'file', language: '*' },  // maybe we should be wider than file for scheme. 
			new FramerDCodeActionProvider(),
			{ providedCodeActionKinds: [vscode.CodeActionKind.QuickFix] }
	)

	context.subscriptions.push(cap);

	// logger.debug('Congratulations, your extension "FramerD" is now active!');

    context.subscriptions.push(
        vscode.workspace.onDidChangeTextDocument(e => {
            if (isStreamingActive && e.document === vscode.window.activeTextEditor?.document) {
                streamAbortRequested = true;
                diagnosticCollection.clear();
                vscode.window.showWarningMessage('FramerD: Review aborted due to document changes');
            }
        })
    );	

    context.subscriptions.push(
        vscode.commands.registerCommand('framerd.clearDiagnostics', () => {
            diagnosticCollection.clear();
            suggestionMap.clear();
            usedRanges.length = 0;
            diagnosticCounter = 0; // Reset counter
        })
    );

    context.subscriptions.push(
        vscode.commands.registerCommand('framerd.removeDiagnostic', (uri: vscode.Uri, diagnosticCode: string) => {
            // Remove from suggestionMap
            suggestionMap.delete(diagnosticCode);
            
            // Remove from diagnosticCollection
            const remaining = (diagnosticCollection.get(uri) || []).filter(
                d => d.code !== diagnosticCode
            );
            diagnosticCollection.set(uri, remaining);
        })
    );

    context.subscriptions.push(
        vscode.commands.registerCommand('framerd.addToDictionary', async (uri: vscode.Uri, diagnosticCode: string, word: string) => {
            // Add word to workspace dictionary (or global if no workspace)
            const config = vscode.workspace.getConfiguration('framerd');
            const dictionary = config.get<string[]>('dictionary', []);
            
            if (!dictionary.includes(word)) {
                dictionary.push(word);
                
                // Try workspace first, fall back to global if no workspace open
                const target = vscode.workspace.workspaceFolders 
                    ? vscode.ConfigurationTarget.Workspace 
                    : vscode.ConfigurationTarget.Global;
                
                await config.update('dictionary', dictionary, target);
                
                const scope = target === vscode.ConfigurationTarget.Workspace ? 'workspace' : 'global';
                vscode.window.showInformationMessage(`Added "${word}" to ${scope} dictionary`);
            }
            
            // Remove the diagnostic
            suggestionMap.delete(diagnosticCode);
            const remaining = (diagnosticCollection.get(uri) || []).filter(
                d => d.code !== diagnosticCode
            );
            diagnosticCollection.set(uri, remaining);
        })
    );

	// The commandId parameter must match the command field in package.json
	const disposable = vscode.commands.registerCommand('framerd.review', async () => {
        // Check for Copilot conflict (once per session)
        checkCopilotConflict();
        
        const editor = vscode.window.activeTextEditor;
        if (editor == null) {
            vscode.window.showErrorMessage(`FramerD: No active document window!`);
            return;
        }

        const text = editor.document.getText();
        const filePath = path.join(context.extensionPath, './src/prompt-one.md');
        let prompt = fs.readFileSync(filePath, 'utf-8');
        
        if (!prompt) {
            vscode.window.showErrorMessage(`FramerD: cant find prompt file: ${filePath}`);
            return;
        }
        
        // Dictionary is NOT sent to LLM - let it use context to judge.
        // Client-side filtering will suppress words user explicitly adds to dictionary.

        // Clear existing diagnostics
        diagnosticCollection.clear();
        suggestionMap.clear();
        usedRanges.length = 0;
        diagnosticCounter = 0; // Reset counter for new review
        isStreamingActive = true;
        streamAbortRequested = false;

        try {
            await vscode.window.withProgress({
                location: vscode.ProgressLocation.Notification,
                title: "FramerD reviewing...",
                cancellable: true
            }, async (progress, token) => {
                token.onCancellationRequested(() => {
                    streamAbortRequested = true;
                });

                await callClaudeAPIStreaming(
                    text,
                    apiKey,
                    prompt,
                    (suggestion) => {
                        addSuggestionAsDiagnostic(suggestion, text, editor);
                    },
                    () => streamAbortRequested || token.isCancellationRequested
                );
            });
            
            vscode.window.showInformationMessage('FramerD: Review complete');
        } catch (error) {
            if (error instanceof Error && error.message.includes('aborted')) {
                vscode.window.showWarningMessage('FramerD: Review cancelled');
            } else {
                console.error('API call failed:', error);
                vscode.window.showErrorMessage(`FramerD: API error - ${error}`);
            }
        } finally {
            isStreamingActive = false;
        }
        });

        context.subscriptions.push(disposable);
}

async function callClaudeAPIStreaming(
    text: string, 
    apiKey: string, 
    promptConfig: string,
    onSuggestion: (suggestion: ParsedSuggestion) => void,
    onAbort: () => boolean
): Promise<string> {
  const anthropic = new Anthropic({ apiKey });
    
    let buffer = '';
    let fullContent = '';
    let chunkCount = 0;
    
    const timings = {
        firstChunk: 0,
        totalParse: 0,
        totalCallback: 0,
        parseCount: 0,
        callbackCount: 0
    };
    
    const startTime = Date.now();
    // logger.debug('Starting stream...');
    
    const stream = await anthropic.messages.create({
        model: 'claude-sonnet-4-5-20250929',
        max_tokens: 16384,
        temperature: 0.25,
        stream: true,
        system: promptConfig,
        messages: [
            { role: 'user', content: `Review this text:\n\n${text}` }
        ]
    });

    for await (const event of stream) {
        if (onAbort()) {
            stream.controller.abort();
            throw new Error('Stream aborted by user');
        }

        if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
            const text = event.delta.text;
            chunkCount++;
            
            if (chunkCount === 1) {
                timings.firstChunk = Date.now() - startTime;
                // logger.debug(`First chunk received after ${timings.firstChunk}ms`);
            }
            
            buffer += text;
            fullContent += text;
            
            const parseStart = Date.now();
            const { parsed, remainder } = parsePartialBuffer(buffer);
            timings.totalParse += Date.now() - parseStart;
            timings.parseCount++;
            
            buffer = remainder;
            
            for (const suggestion of parsed) {
                const callbackStart = Date.now();
                onSuggestion(suggestion);
                timings.totalCallback += Date.now() - callbackStart;
                timings.callbackCount++;
            }
        }
    }

    const totalTime = Date.now() - startTime;
    logger.debug('\n=== PERFORMANCE SUMMARY ===');
    logger.debug(`Total time: ${totalTime}ms`);
    logger.debug(`First chunk: ${timings.firstChunk}ms`);
    logger.debug(`Total chunks: ${chunkCount}`);
    logger.debug(`Parse calls: ${timings.parseCount}, total time: ${timings.totalParse}ms (avg ${(timings.totalParse/timings.parseCount).toFixed(2)}ms)`);
    logger.debug(`Callback calls: ${timings.callbackCount}, total time: ${timings.totalCallback}ms (avg ${(timings.totalCallback/timings.callbackCount).toFixed(2)}ms)`);
    logger.debug(`Streaming overhead: ${totalTime - timings.firstChunk - timings.totalParse - timings.totalCallback}ms`);

    // Final parse...
    if (buffer.trim()) {
        const start = Date.now();

        const { parsed } = parsePartialBuffer(buffer + '\n---');

        // logger.debug(`Final parse: ${parsed.length} suggestions`);

        for (const suggestion of parsed) {
            onSuggestion(suggestion);
        }
    }
    
    outputChannel.appendLine('\n=== FULL RESPONSE FOR DEBUGGING ===');
    outputChannel.appendLine(fullContent);
    outputChannel.appendLine('=== END RESPONSE ===\n');
    return fullContent;
}

const usedRanges: vscode.Range[] = [];

function addSuggestionAsDiagnostic(suggestion: ParsedSuggestion, text: string, editor: vscode.TextEditor) {
    logger.debug('=== ADD SUGGESTION DEBUG ===');
    logger.debug('Received suggestion:', suggestion.target_excerpt);
    logger.debug('Rewrite:', suggestion.rewrite);
    
    // Filter out dictionary words from spelling errors
    const config = vscode.workspace.getConfiguration('framerd');
    const dictionary = config.get<string[]>('dictionary', []);
    logger.debug(`Dictionary check: ${dictionary.length} words in dictionary`);
    logger.debug(`Suggestion category: ${suggestion.category}`);
    
    if (dictionary.length > 0 && suggestion.category === 'spelling') {
        const word = extractMisspelledWord(suggestion.comment);
        logger.debug(`Extracted word from "${suggestion.comment}": ${word}`);
        
        if (word && dictionary.includes(word)) {
            logger.debug(`✓ Skipping spelling error for dictionary word: ${word}`);
            return;
        } else if (word) {
            logger.debug(`✗ Word "${word}" not in dictionary: [${dictionary.join(', ')}]`);
        }
    }
    
    const diagnostics = [...(diagnosticCollection.get(editor.document.uri) || [])];
    
    let range: vscode.Range;
    let severity: vscode.DiagnosticSeverity;
    
    // Try to find excerpt
    if (suggestion.target_excerpt) {
        const index = text.indexOf(suggestion.target_excerpt);
        
        if (index !== -1) {
            const startPos = editor.document.positionAt(index);
            const endPos = editor.document.positionAt(index + suggestion.target_excerpt.length);
            range = new vscode.Range(startPos, endPos);
            
            logger.debug(`Found at index ${index}, range: line ${startPos.line}, col ${startPos.character}-${endPos.character}`);
            
            // Check for overlaps
            const overlaps = usedRanges.some(usedRange => 
                usedRange.intersection(range) !== undefined
            );
            
            // Determine if this can be a quick fix
            const canQuickFix = isQuickFixable(suggestion) && !overlaps;
            
            if (!canQuickFix) {
                // Overlap or not quick-fixable → Hint only
                severity = vscode.DiagnosticSeverity.Hint;
                logger.debug('Marked as Hint (overlap or not quick-fixable)');
            } else {
                // Normal suggestion with fix
                severity = suggestion.severity === 'high' ? vscode.DiagnosticSeverity.Error :
                          suggestion.severity === 'moderate' ? vscode.DiagnosticSeverity.Warning :
                          vscode.DiagnosticSeverity.Information;
                usedRanges.push(range);
                
                // Add to quick fix map with sequential ID
                const id = String(++diagnosticCounter);
                suggestionMap.set(id, {
                    comment: suggestion.comment,
                    target_excerpt: suggestion.target_excerpt,
                    category: suggestion.category,
                    severity: suggestion.severity,
                    explanation: suggestion.explanation,
                    rewrite: suggestion.rewrite
                });
                
                const diagnostic = new vscode.Diagnostic(range, suggestion.comment, severity);
                diagnostic.source = 'FramerD';
                diagnostic.code = id;
                diagnostics.push(diagnostic);
                diagnosticCollection.set(editor.document.uri, diagnostics);
                return;
            }
        } else {
            // Excerpt not found → place at top as Hint
            range = new vscode.Range(0, 0, 0, 0);
            severity = vscode.DiagnosticSeverity.Hint;
            logger.debug('Excerpt not found, placing at top as Hint');
        }
    } else {
        // No excerpt → place at top as Hint
        range = new vscode.Range(0, 0, 0, 0);
        severity = vscode.DiagnosticSeverity.Hint;
        logger.debug('No excerpt, placing at top as Hint');
    }
    
    // Create diagnostic without quick fix
    const diagnostic = new vscode.Diagnostic(range, suggestion.comment, severity);
    diagnostic.source = 'FramerD';
    diagnostics.push(diagnostic);
    diagnosticCollection.set(editor.document.uri, diagnostics);
}

// This method is called when your extension is deactivated
export function deactivate() {}
