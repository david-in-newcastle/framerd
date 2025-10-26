/**
 * Bug report: Oct 25, 2025
 * 
 * Original text:
 * "I strode straight down the sweeping tree-lined curve of Georgian terraced 
 * that lies to one side of the little city park. The sun was intense and 
 * I was trying not squint, just walk tall and straight into it."
 * 
 * When the quick fix for "trying not squint" is applied, it resulted in:
 * "trying not to squint" (with quotes) or truncated as "I was
 * 
 * Root cause: During streaming, incomplete blocks with partial quoted FIX fields
 * were being parsed before the complete text arrived. The FIX field would be
 * truncated to just "I was instead of the full "trying not to squint"
 * 
 * Expected: trying not to squint (no quotes, complete)
 * Actual (before fix): "I was (truncated with opening quote)
 */

import { parseIssueBlock, ParsedSuggestion, isBlockComplete, parsePartialBuffer } from '../parsing';
import * as fs from 'fs';
import * as path from 'path';

describe('Bug: Quotes in rewrite text (streaming incomplete blocks)', () => {
    it('rejects incomplete blocks with partial quoted FIX fields', () => {
        // This is what arrives during streaming - incomplete FIX field
        const incompleteBlock = `EXCERPT: "I was trying not squint"
CATEGORY: grammar
SEVERITY: high
PROBLEM: Missing "to" before infinitive verb
FIX: "I was`;

        // Should NOT be considered complete
        expect(isBlockComplete(incompleteBlock)).toBe(false);
    });

    it('accepts complete blocks with properly closed quoted FIX fields', () => {
        const completeBlock = `EXCERPT: "I was trying not squint"
CATEGORY: grammar
SEVERITY: high
PROBLEM: Missing "to" before infinitive verb
FIX: "trying not to squint"`;

        // Should be considered complete
        expect(isBlockComplete(completeBlock)).toBe(true);
    });

    it('parses complete block and strips quotes correctly', () => {
        const block = `EXCERPT: "I was trying not squint"
CATEGORY: grammar
SEVERITY: high
PROBLEM: Missing "to" before infinitive verb
FIX: "trying not to squint"`;

        const result = parseIssueBlock(block);
        
        expect(result).not.toBeNull();
        expect(result?.target_excerpt).toBe('I was trying not squint');
        
        // This is the key assertion - the rewrite should NOT have quotes
        expect(result?.rewrite).toBe('trying not to squint');
        expect(result?.rewrite).not.toBe('"trying not to squint"');
        
        // Additional check - ensure no quotes at start or end
        expect(result?.rewrite.startsWith('"')).toBe(false);
        expect(result?.rewrite.endsWith('"')).toBe(false);
    });

    it('handles curly quotes in FIX field', () => {
        const block = `EXCERPT: "I was trying not squint"
CATEGORY: grammar
SEVERITY: high
PROBLEM: Missing "to" before infinitive verb
FIX: "trying not to squint"`;

        const result = parseIssueBlock(block);
        
        expect(result).not.toBeNull();
        expect(result?.rewrite).toBe('trying not to squint');
        expect(result?.rewrite).not.toContain('"');
        expect(result?.rewrite).not.toContain('"');
    });

    it('preserves intentional internal quotes in FIX', () => {
        const block = `EXCERPT: "she said hello"
CATEGORY: grammar
SEVERITY: high
PROBLEM: Missing quotation marks
FIX: "she said "hello""`;

        const result = parseIssueBlock(block);
        
        expect(result).not.toBeNull();
        // Should strip outer quotes but keep inner ones
        expect(result?.rewrite).toBe('she said "hello"');
    });

    it('simulates streaming: does not parse incomplete buffer', () => {
        // Simulating what arrives during streaming
        const incompleteBuffer = `---
ISSUE 3
EXCERPT: "I was trying not squint"
CATEGORY: grammar
SEVERITY: high
PROBLEM: Missing "to" before infinitive verb
FIX: "I was`;

        const { parsed, remainder } = parsePartialBuffer(incompleteBuffer);
        
        // Should NOT parse the incomplete block
        expect(parsed.length).toBe(0);
        // Should keep the incomplete block in remainder
        expect(remainder).toContain('ISSUE 3');
    });

    it('simulates streaming: parses when complete block arrives', () => {
        // Complete block arrives
        const completeBuffer = `---
ISSUE 3
EXCERPT: "I was trying not squint"
CATEGORY: grammar
SEVERITY: high
PROBLEM: Missing "to" before infinitive verb
FIX: "trying not to squint"

---
ISSUE 4`;

        const { parsed, remainder } = parsePartialBuffer(completeBuffer);
        
        // Should parse the complete block
        expect(parsed.length).toBeGreaterThan(0);
        const issue3 = parsed.find(s => s.target_excerpt.includes('trying not squint'));
        
        expect(issue3).toBeDefined();
        expect(issue3?.rewrite).toBe('trying not to squint');
        expect(issue3?.rewrite).not.toBe('"I was');
    });

    it('reproduces the actual bug from line15-bug.txt fixture', () => {
        const fullResponse = fs.readFileSync(
            path.join(__dirname, '../../test-fixtures/responses/real-session-2025-10-25.txt'),
            'utf-8'
        );

        // Extract ISSUE 3 block manually
        const issue3Match = fullResponse.match(/---\s*ISSUE 3(.*?)---\s*ISSUE 4/s);
        expect(issue3Match).not.toBeNull();
        
        const block = issue3Match![1].trim();
        
        // Should be complete
        expect(isBlockComplete(block)).toBe(true);
        
        const result = parseIssueBlock(block);
        
        expect(result).not.toBeNull();
        expect(result?.target_excerpt).toBe('I was trying not squint');
        
        // The critical assertion - should be complete without quotes
        // The fixture has the full replacement text
        expect(result?.rewrite).toBe('I was trying not to squint');
        expect(result?.rewrite).not.toMatch(/^"/); // Should not start with quote
        expect(result?.rewrite).not.toMatch(/"$/); // Should not end with quote
        expect(result?.rewrite).not.toBe('"I was'); // Should not be truncated
    });
});
