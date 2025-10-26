/**
 * Integration Tests - Streaming with Mocked API
 * 
 * Tests the full streaming pipeline without making real API calls.
 * Uses mock Anthropic client to simulate streaming responses.
 */

import { parsePartialBuffer, ParsedSuggestion } from '../parsing';
import { createMockAnthropicClient, MockAnthropicStream } from './mocks/anthropic-stream';
import { Fixtures, loadResponse, loadDocument } from './fixtures';

describe('Integration: Streaming with Mocked API', () => {
    describe('Complete streaming response', () => {
        it('parses all issues from complete response', async () => {
            const responseText = Fixtures.responses.complete();
            const stream = new MockAnthropicStream(responseText);
            
            const suggestions: ParsedSuggestion[] = [];
            let buffer = '';
            
            for await (const event of stream) {
                if (event.type === 'content_block_delta' && event.delta?.text) {
                    buffer += event.delta.text;
                    const { parsed, remainder } = parsePartialBuffer(buffer);
                    suggestions.push(...parsed);
                    buffer = remainder;
                }
            }
            
            // Final parse for any remaining content
            if (buffer.trim()) {
                const { parsed } = parsePartialBuffer(buffer + '\n---');
                suggestions.push(...parsed);
            }
            
            expect(suggestions.length).toBe(3);
            expect(suggestions[0].target_excerpt).toBe('The cat sat on mat');
            expect(suggestions[0].rewrite).toBe('The cat sat on the mat');
            expect(suggestions[1].target_excerpt).toBe('She runned quickly');
            expect(suggestions[1].rewrite).toBe('She ran quickly');
        });
    });
    
    describe('Incomplete streaming (mid-transmission)', () => {
        it('does not parse incomplete blocks', async () => {
            const responseText = loadResponse('incomplete-streaming.txt');
            const stream = new MockAnthropicStream(responseText);
            
            const suggestions: ParsedSuggestion[] = [];
            let buffer = '';
            
            for await (const event of stream) {
                if (event.type === 'content_block_delta' && event.delta?.text) {
                    buffer += event.delta.text;
                    const { parsed, remainder } = parsePartialBuffer(buffer);
                    suggestions.push(...parsed);
                    buffer = remainder;
                }
            }
            
            // First issue should be parsed (complete)
            expect(suggestions.length).toBe(1);
            expect(suggestions[0].target_excerpt).toBe('The cat sat on mat');
            
            // Second issue should NOT be parsed (incomplete FIX field)
            expect(suggestions.find(s => s.target_excerpt.includes('runned'))).toBeUndefined();
            
            // Buffer should contain the incomplete issue
            expect(buffer).toContain('ISSUE 2');
        });
    });
    
    describe('Quoted FIX fields', () => {
        it('handles quoted FIX fields correctly during streaming', async () => {
            const responseText = loadResponse('real-session-2025-10-25.txt');
            const stream = new MockAnthropicStream(responseText);
            
            const suggestions: ParsedSuggestion[] = [];
            let buffer = '';
            
            for await (const event of stream) {
                if (event.type === 'content_block_delta' && event.delta?.text) {
                    buffer += event.delta.text;
                    const { parsed, remainder } = parsePartialBuffer(buffer);
                    suggestions.push(...parsed);
                    buffer = remainder;
                }
            }
            
            // Final parse
            if (buffer.trim()) {
                const { parsed } = parsePartialBuffer(buffer + '\n---');
                suggestions.push(...parsed);
            }
            
            // Find the "trying not squint" issue
            const squintIssue = suggestions.find(s => 
                s.target_excerpt.includes('trying not squint')
            );
            
            expect(squintIssue).toBeDefined();
            // Should have complete rewrite without quotes
            expect(squintIssue?.rewrite).toBe('I was trying not to squint');
            expect(squintIssue?.rewrite).not.toContain('"');
        });
    });
    
    describe('Chunking strategies', () => {
        it('handles single-character chunking', async () => {
            const responseText = Fixtures.responses.complete();
            const stream = new MockAnthropicStream(responseText, { charsPerChunk: 1 });
            
            const suggestions: ParsedSuggestion[] = [];
            let buffer = '';
            
            for await (const event of stream) {
                if (event.type === 'content_block_delta' && event.delta?.text) {
                    buffer += event.delta.text;
                    const { parsed, remainder } = parsePartialBuffer(buffer);
                    suggestions.push(...parsed);
                    buffer = remainder;
                }
            }
            
            // Final parse
            if (buffer.trim()) {
                const { parsed } = parsePartialBuffer(buffer + '\n---');
                suggestions.push(...parsed);
            }
            
            expect(suggestions.length).toBe(3);
        });
        
        it('handles large chunk streaming', async () => {
            const responseText = Fixtures.responses.complete();
            const stream = new MockAnthropicStream(responseText, { charsPerChunk: 50 });
            
            const suggestions: ParsedSuggestion[] = [];
            let buffer = '';
            
            for await (const event of stream) {
                if (event.type === 'content_block_delta' && event.delta?.text) {
                    buffer += event.delta.text;
                    const { parsed, remainder } = parsePartialBuffer(buffer);
                    suggestions.push(...parsed);
                    buffer = remainder;
                }
            }
            
            // Final parse
            if (buffer.trim()) {
                const { parsed } = parsePartialBuffer(buffer + '\n---');
                suggestions.push(...parsed);
            }
            
            expect(suggestions.length).toBe(3);
        });
    });
    
    describe('Error handling', () => {
        it('handles stream abort gracefully', async () => {
            const responseText = Fixtures.responses.complete();
            const stream = new MockAnthropicStream(responseText, { abortAfterChunks: 50 });
            
            const suggestions: ParsedSuggestion[] = [];
            let buffer = '';
            let aborted = false;
            
            try {
                for await (const event of stream) {
                    if (event.type === 'content_block_delta' && event.delta?.text) {
                        buffer += event.delta.text;
                        const { parsed, remainder } = parsePartialBuffer(buffer);
                        suggestions.push(...parsed);
                        buffer = remainder;
                    }
                }
            } catch (error: any) {
                if (error.message === 'Stream aborted') {
                    aborted = true;
                }
            }
            
            expect(aborted).toBe(true);
            // May have parsed some suggestions before abort
            expect(suggestions.length).toBeGreaterThanOrEqual(0);
        });
    });
    
    describe('Malformed responses', () => {
        it('skips issues with missing required fields', async () => {
            const responseText = loadResponse('missing-fields.txt');
            const stream = new MockAnthropicStream(responseText);
            
            const suggestions: ParsedSuggestion[] = [];
            let buffer = '';
            
            for await (const event of stream) {
                if (event.type === 'content_block_delta' && event.delta?.text) {
                    buffer += event.delta.text;
                    const { parsed, remainder } = parsePartialBuffer(buffer);
                    suggestions.push(...parsed);
                    buffer = remainder;
                }
            }
            
            // Final parse
            if (buffer.trim()) {
                const { parsed } = parsePartialBuffer(buffer + '\n---');
                suggestions.push(...parsed);
            }
            
            // Should only parse complete issues
            // ISSUE 1: complete (has all fields)
            // ISSUE 2: missing SEVERITY
            // ISSUE 3: missing FIX
            expect(suggestions.length).toBe(1);
            expect(suggestions[0].target_excerpt).toBe('The cat sat on mat');
        });
    });
});
