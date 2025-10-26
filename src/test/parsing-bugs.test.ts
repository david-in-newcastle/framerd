import { 
    parsePartialBuffer, 
    ParsedSuggestion,
    extractSummary,
    isQuickFixable,
    parseIssueBlock,
    parseCompleteIssueBlocks  
} from '../parsing'

import * as fs from 'fs';
import * as path from 'path';
import { logger } from '../logger';

/**
 * This test reproduces the bug David found on Oct 24, 2025
 * 
 * Issue: When applying a fix, the replacement was truncated
 * Expected: "I took me all my powers" → "It took me all my powers"  
 * Actual: "I took me all my powers" → "I didn"
 * 
 * Root cause: Regex was stopping at apostrophe in "didn't"
 */
describe('Bug: Truncated fix with apostrophes', () => {
    it('handles apostrophes in FIX field correctly', () => {
        const block = `EXCERPT: "I took me all my powers"
CATEGORY: grammar
SEVERITY: high
PROBLEM: Wrong pronoun—should be "It took"
FIX: It took me all my powers`;

        const result = parseIssueBlock(block);
        
        expect(result).not.toBeNull();
        expect(result?.target_excerpt).toBe('I took me all my powers');
        expect(result?.rewrite).toBe('It took me all my powers');
        expect(result?.rewrite).not.toBe('I didn'); // The bug we're fixing
    });

    it('handles curly apostrophes in FIX field', () => {
        const block = `EXCERPT: "test"
CATEGORY: grammar
SEVERITY: high
PROBLEM: Test
FIX: I didn't think it would work`;

        const result = parseIssueBlock(block);
        
        expect(result).not.toBeNull();
        expect(result?.rewrite).toBe("I didn't think it would work");
    });

    it('handles multiple apostrophes in FIX field', () => {
        const block = `EXCERPT: "test"
CATEGORY: grammar
SEVERITY: high
PROBLEM: Test
FIX: She'd've thought it'd work`;

        const result = parseIssueBlock(block);
        
        expect(result).not.toBeNull();
        expect(result?.rewrite).toBe("She'd've thought it'd work");
    });
});

/**
 * This test reproduces the fabric/fabic truncation issue
 */
describe('Bug: Excerpt truncation with quotes', () => {
    it('parses full excerpt without truncation', () => {
        const block = `EXCERPT: "peeling the sodden fabic away"
CATEGORY: spelling
SEVERITY: high
PROBLEM: Spelling error - should be "fabric"
FIX: peeling the sodden fabric away`;

        const result = parseIssueBlock(block);
        
        expect(result).not.toBeNull();
        expect(result?.target_excerpt).toBe('peeling the sodden fabic away');
        expect(result?.rewrite).toBe('peeling the sodden fabric away');
    });
});
// In src/test/parsing-bugs.test.ts
describe('Bug: Line 15 text replacement', () => {
    it('correctly parses the Georgian terraced suggestion', () => {
        const input = fs.readFileSync(
            path.join(__dirname, '../../test-fixtures/responses/real-session-2025-10-25.txt'),
            'utf-8'
        );
        
        const results = parseCompleteIssueBlocks(input);
        
        const georgianSuggestion = results.find(s => 
            s.target_excerpt.includes('Georgian terraced')
        );
        
        expect(georgianSuggestion).toBeDefined();
        // Fix: Match what Claude actually sends
        expect(georgianSuggestion?.target_excerpt).toBe('the sweeping tree-lined curve of Georgian terraced that lies');
        
        // The key question: is the rewrite complete or truncated?
        logger.info('Georgian rewrite:', georgianSuggestion?.rewrite);
        expect(georgianSuggestion?.rewrite.length).toBeGreaterThan(20); // Should be full phrase
    });
    
    it('correctly parses the trying not squint suggestion', () => {
        const input = fs.readFileSync(
            path.join(__dirname, '../../test-fixtures/responses/real-session-2025-10-25.txt'),
            'utf-8'
        );
        
        const results = parseCompleteIssueBlocks(input);
        
        const squintSuggestion = results.find(s => 
            s.target_excerpt.includes('trying not squint')
        );
        
        expect(squintSuggestion).toBeDefined();
        // Fix: Match what Claude actually sends
        expect(squintSuggestion?.target_excerpt).toBe('I was trying not squint');
        
        // The key question: is the rewrite complete?
        logger.info('Squint rewrite:', squintSuggestion?.rewrite);
        expect(squintSuggestion?.rewrite).toContain('to squint');
        expect(squintSuggestion?.rewrite.length).toBeGreaterThan(10);
    });
});

// Add to src/test/parsing-bugs.test.ts

describe('isQuickFixable', () => {
    it('returns true for simple replacements', () => {
        const suggestion: ParsedSuggestion = {
            comment: 'Test',
            target_excerpt: 'test',
            category: 'grammar',
            severity: 'high',
            explanation: 'Test',
            rewrite: 'fixed test'
        };
        
        expect(isQuickFixable(suggestion)).toBe(true);
    });
    
    it('returns false for empty rewrites', () => {
        const suggestion: ParsedSuggestion = {
            comment: 'Test',
            target_excerpt: 'test',
            category: 'grammar',
            severity: 'high',
            explanation: 'Test',
            rewrite: ''
        };
        
        expect(isQuickFixable(suggestion)).toBe(false);
    });
    
    it('returns false for rewrites with "or"', () => {
        const suggestion: ParsedSuggestion = {
            comment: 'Test',
            target_excerpt: 'Georgian terraced',
            category: 'grammar',
            severity: 'high',
            explanation: 'Test',
            rewrite: 'Georgian terraced houses or Georgian terrace'
        };
        
        expect(isQuickFixable(suggestion)).toBe(false);
    });
    
    it('returns false for very long rewrites', () => {
        const suggestion: ParsedSuggestion = {
            comment: 'Test',
            target_excerpt: 'test',
            category: 'grammar',
            severity: 'high',
            explanation: 'Test',
            rewrite: 'a'.repeat(150) // 150 character rewrite
        };
        
        expect(isQuickFixable(suggestion)).toBe(false);
    });
    
    it('returns false for consistency category', () => {
        const suggestion: ParsedSuggestion = {
            comment: 'Test',
            target_excerpt: 'test',
            category: 'consistency',
            severity: 'moderate',
            explanation: 'Test',
            rewrite: 'fixed test'
        };
        
        expect(isQuickFixable(suggestion)).toBe(false);
    });
    
    it('returns false for structure category', () => {
        const suggestion: ParsedSuggestion = {
            comment: 'Test',
            target_excerpt: 'test',
            category: 'structure',
            severity: 'moderate',
            explanation: 'Test',
            rewrite: 'fixed test'
        };
        
        expect(isQuickFixable(suggestion)).toBe(false);
    });
});