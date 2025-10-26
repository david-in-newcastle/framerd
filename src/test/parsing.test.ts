import * as fs from 'fs';
import * as path from 'path';

import {
    parseCompleteIssueBlocks,
    parsePartialBuffer,
    parseIssueBlock,
    isBlockComplete,
    extractSummary,
    ParsedSuggestion
} from '../parsing';

function loadFixture(filename: string): string {
    return fs.readFileSync(
        path.join(__dirname, '../../test-fixtures', filename),
        'utf-8'
    );
}

describe('isBlockComplete', () => {
    it('returns true for complete blocks', () => {
        const block = `EXCERPT: "test"
CATEGORY: grammar
SEVERITY: high
PROBLEM: Test problem
FIX: Test fix`;
        expect(isBlockComplete(block)).toBe(true);
    });

    it('returns false when missing FIX', () => {
        const block = `EXCERPT: "test"
CATEGORY: grammar
SEVERITY: high
PROBLEM: Test problem`;
        expect(isBlockComplete(block)).toBe(false);
    });

    it('returns false when missing EXCERPT', () => {
        const block = `CATEGORY: grammar
SEVERITY: high
PROBLEM: Test problem
FIX: Test fix`;
        expect(isBlockComplete(block)).toBe(false);
    });
});

describe('parseIssueBlock', () => {
    it('parses a simple block with straight quotes', () => {
        const block = `EXCERPT: "test excerpt"
CATEGORY: grammar
SEVERITY: high
PROBLEM: Test problem
FIX: test fix`;

        const result = parseIssueBlock(block);
        expect(result).not.toBeNull();
        expect(result?.target_excerpt).toBe('test excerpt');
        expect(result?.category).toBe('grammar');
        expect(result?.severity).toBe('high');
        expect(result?.comment).toBe('Test problem');
        expect(result?.rewrite).toBe('test fix');
    });

    it('handles curly quotes in excerpt', () => {
        const block = `EXCERPT: "I didn't think"
CATEGORY: grammar
SEVERITY: high
PROBLEM: Test
FIX: It didn't think`;

        const result = parseIssueBlock(block);
        expect(result).not.toBeNull();
        expect(result?.target_excerpt).toBe("I didn't think");
        expect(result?.rewrite).toBe("It didn't think");
    });

    it('handles excerpt without quotes', () => {
        const block = `EXCERPT: test excerpt
CATEGORY: grammar
SEVERITY: high
PROBLEM: Test problem
FIX: test fix`;

        const result = parseIssueBlock(block);
        expect(result).not.toBeNull();
        expect(result?.target_excerpt).toBe('test excerpt');
    });

    it('handles multi-line excerpts and fixes', () => {
        const block = `EXCERPT: "first line
second line
third line"
CATEGORY: grammar
SEVERITY: moderate
PROBLEM: Multi-line problem
FIX: fixed first line
fixed second line`;

        const result = parseIssueBlock(block);
        expect(result).not.toBeNull();
        expect(result?.target_excerpt).toContain('first line');
        expect(result?.target_excerpt).toContain('second line');
        expect(result?.rewrite).toContain('fixed first line');
    });

    it('returns null for incomplete block', () => {
        const block = `EXCERPT: "test"
CATEGORY: grammar`;

        const result = parseIssueBlock(block);
        expect(result).toBeNull();
    });

    it('handles empty FIX field', () => {
        const block = `EXCERPT: "test excerpt"
CATEGORY: style
SEVERITY: low
PROBLEM: Just a comment
FIX: `;

        const result = parseIssueBlock(block);
        expect(result).not.toBeNull();
        expect(result?.rewrite).toBe('');
    });
});

describe('parseCompleteIssueBlocks', () => {
    it('parses basic fixture with 4 issues', () => {
        const input = loadFixture('claude-response-basic.txt');
        const results = parseCompleteIssueBlocks(input);

        expect(results).toHaveLength(4);
        
        expect(results[0].target_excerpt).toBe("I didn't think it would matter");
        expect(results[0].rewrite).toBe("It took me all my powers");
        expect(results[0].severity).toBe('high');

        expect(results[1].target_excerpt).toBe("peeling the sodden fabic away");
        expect(results[1].rewrite).toBe("peeling the sodden fabric away");

        expect(results[2].target_excerpt).toBe("call in person");
        expect(results[2].rewrite).toBe("visit in person");

        expect(results[3].target_excerpt).toBe("Georgian terraced");
        expect(results[3].rewrite).toBe("Georgian terraced houses");
    });

    it('parses fixture with curly quotes', () => {
        const input = loadFixture('claude-response-curly-quotes.txt');
        const results = parseCompleteIssueBlocks(input);

        expect(results).toHaveLength(3);
        expect(results[0].target_excerpt).toBe("I didn't think it would matter");
        expect(results[1].target_excerpt).toBe('We could be shooting dyke porn!');
        expect(results[2].target_excerpt).toBe("À la caméra");
    });

    it('skips incomplete blocks', () => {
        const input = loadFixture('claude-response-incomplete.txt');
        const results = parseCompleteIssueBlocks(input);

        expect(results).toHaveLength(1); // Only first issue is complete
        expect(results[0].target_excerpt).toBe("test excerpt");
    });

    it('handles empty input', () => {
        const results = parseCompleteIssueBlocks('');
        expect(results).toHaveLength(0);
    });

    it('handles input with no issues', () => {
        const input = '# Some header\n\nSome text without issues';
        const results = parseCompleteIssueBlocks(input);
        expect(results).toHaveLength(0);
    });
});

describe('parsePartialBuffer (streaming)', () => {
    it('parses complete blocks and returns remainder', () => {
        const buffer = `---
ISSUE 1
EXCERPT: "complete"
CATEGORY: grammar
SEVERITY: high
PROBLEM: Test
FIX: Fixed

---
ISSUE 2
EXCERPT: "incomplete"
CATEGORY: grammar`;

        const { parsed, remainder } = parsePartialBuffer(buffer);

        expect(parsed).toHaveLength(1);
        expect(parsed[0].target_excerpt).toBe('complete');
        expect(remainder).toContain('ISSUE 2');
        expect(remainder).toContain('incomplete');
    });

    it('simulates streaming chunks', () => {
        const chunks = [
            '---\nISSUE 1\nEXCERP',
            'T: "test"\nCATEGORY: grammar\n',
            'SEVERITY: high\nPROBLEM: Test\nFIX: Fixed\n',
            '---\nISSUE 2\nEXCERPT: "test2"\n',
            'CATEGORY: spelling\nSEVERITY: moderate\n',
            'PROBLEM: Test2\nFIX: Fixed2\n---'
        ];

        let buffer = '';
        const allResults: ParsedSuggestion[] = [];

        for (const chunk of chunks) {
            buffer += chunk;
            const { parsed, remainder } = parsePartialBuffer(buffer);
            allResults.push(...parsed);
            buffer = remainder;
        }

        expect(allResults).toHaveLength(2);
        expect(allResults[0].target_excerpt).toBe('test');
        expect(allResults[0].rewrite).toBe('Fixed');
        expect(allResults[1].target_excerpt).toBe('test2');
        expect(allResults[1].rewrite).toBe('Fixed2');
    });

    it('waits for FIX field before parsing last block', () => {
        const buffer = `---
ISSUE 1
EXCERPT: "test"
CATEGORY: grammar
SEVERITY: high
PROBLEM: Test problem`;

        const { parsed, remainder } = parsePartialBuffer(buffer);

        expect(parsed).toHaveLength(0);
        expect(remainder).toContain('ISSUE 1');
    });

    it('parses last block once FIX arrives', () => {
        const buffer = `---
ISSUE 1
EXCERPT: "test"
CATEGORY: grammar
SEVERITY: high
PROBLEM: Test problem
FIX: Fixed`;

        const { parsed, remainder } = parsePartialBuffer(buffer);

        expect(parsed).toHaveLength(1);
        expect(parsed[0].target_excerpt).toBe('test');
        expect(remainder).toBe('');
    });
});

describe('extractSummary', () => {
    it('extracts text before first issue', () => {
        const input = `# Comprehensive Review

This is a summary paragraph.

---
ISSUE 1
EXCERPT: "test"`;

        const summary = extractSummary(input);
        expect(summary).toContain('Comprehensive Review');
        expect(summary).toContain('summary paragraph');
        expect(summary).not.toContain('ISSUE 1');
    });

    it('returns full text if no issues found', () => {
        const input = 'Just some text without issues';
        const summary = extractSummary(input);
        expect(summary).toBe('Just some text without issues');
    });

    it('returns default when no summary present', () => {
        const input = `---
ISSUE 1
EXCERPT: "test"`;

        const summary = extractSummary(input);
        expect(summary).toBe('Review complete.');
    });
});

describe('Real-world edge cases', () => {
    it('handles excerpt with internal quotes', () => {
        const block = `EXCERPT: "She said 'hello' to me"
CATEGORY: grammar
SEVERITY: moderate
PROBLEM: Test
FIX: She said "hello" to me`;

        const result = parseIssueBlock(block);
        expect(result).not.toBeNull();
        expect(result?.target_excerpt).toBe("She said 'hello' to me");
        expect(result?.rewrite).toBe('She said "hello" to me');
    });

    it('handles FIX with quotes in the middle', () => {
        const block = `EXCERPT: "test"
CATEGORY: grammar
SEVERITY: high
PROBLEM: Test
FIX: She didn't think it would work`;

        const result = parseIssueBlock(block);
        expect(result).not.toBeNull();
        expect(result?.rewrite).toBe("She didn't think it would work");
    });

    it('handles special characters in excerpt', () => {
        const block = `EXCERPT: "À la caméra—and then"
CATEGORY: style
SEVERITY: low
PROBLEM: Test
FIX: At the camera—and then`;

        const result = parseIssueBlock(block);
        expect(result).not.toBeNull();
        expect(result?.target_excerpt).toBe("À la caméra—and then");
    });
});
