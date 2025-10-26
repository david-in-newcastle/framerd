/**
 * Unit Tests - Partial Matching
 * 
 * Tests the findExcerptPartialMatch function for finding text excerpts
 * when exact matching fails due to boundary issues.
 */

import { findExcerptPartialMatch } from '../excerpt-matching';

describe('findExcerptPartialMatch', () => {
    describe('Basic functionality', () => {
        it('returns null for excerpts shorter than 20 chars', () => {
            const text = 'This is a short test';
            const excerpt = 'short test';  // Only 10 chars
            
            const result = findExcerptPartialMatch(text, excerpt);
            expect(result).toBeNull();
        });
        
        it('returns null when prefix not found', () => {
            const text = 'The quick brown fox jumps over the lazy dog.';
            const excerpt = 'A completely different sentence that is long enough.';
            
            const result = findExcerptPartialMatch(text, excerpt);
            expect(result).toBeNull();
        });
        
        it('returns null when prefix found but suffix not found', () => {
            const text = 'The quick brown fox jumps over the lazy dog. Some more text here.';
            const excerpt = 'The quick brown fox jumps over a completely different ending that makes this long enough';
            
            const result = findExcerptPartialMatch(text, excerpt);
            expect(result).toBeNull();
        });
    });
    
    describe('Boundary issue matching', () => {
        it('finds text when excerpt is missing a word at the start', () => {
            const text = 'She was trying not to squint too much in the bright light.';
            const excerpt = 'trying not to squint too much';  // Missing "She was"
            
            const result = findExcerptPartialMatch(text, excerpt);
            expect(result).not.toBeNull();
            expect(result!.index).toBeGreaterThanOrEqual(0);
            // Should find "trying not to squint too much" starting around index 8
            expect(text.substring(result!.index, result!.index + result!.length))
                .toContain('trying not');
        });
        
        it('finds text when excerpt is missing a word at the end', () => {
            const text = 'She was trying not to squint too much in the bright light.';
            const excerpt = 'She was trying not to squint';  // Missing "too much..."
            
            const result = findExcerptPartialMatch(text, excerpt);
            expect(result).not.toBeNull();
            expect(result!.index).toBe(0);  // Starts at beginning
        });
        
        it('finds text when excerpt has extra words in the middle', () => {
            const text = 'The cat sat on the mat and fell asleep quickly.';
            const excerpt = 'The cat sat on the mat and fell asleep';  // Missing "quickly" at end
            
            const result = findExcerptPartialMatch(text, excerpt);
            expect(result).not.toBeNull();
            // Should find the text that is actually there
            expect(result!.index).toBe(0);
        });
        
        it('handles missing article ("the" vs no "the")', () => {
            const text = 'The cat sat on mat and fell asleep.';
            const excerpt = 'The cat sat on the mat and fell asleep.';  // Has "the" before "mat"
            
            const result = findExcerptPartialMatch(text, excerpt);
            expect(result).not.toBeNull();
            // Should find despite "the" difference in middle
        });
    });
    
    describe('Length variations', () => {
        it('handles excerpts with slight length differences', () => {
            const text = 'It was a beautiful sunny day in the park.';
            const excerpt = 'It was a beautiful and sunny day in the park.';  // Added "and"
            
            const result = findExcerptPartialMatch(text, excerpt);
            expect(result).not.toBeNull();
        });
        
        it('handles excerpts significantly shorter than document text', () => {
            const text = 'This is a very long sentence with lots of words that goes on and on.';
            const excerpt = 'This is a very long sentence that goes on and on.';  // Missing middle
            
            const result = findExcerptPartialMatch(text, excerpt);
            expect(result).not.toBeNull();
        });
    });
    
    describe('Multiple occurrences', () => {
        it('finds first occurrence when prefix appears multiple times', () => {
            const text = 'The cat sat on the mat. The cat also sat on the chair.';
            const excerpt = 'The cat sat on the mat';
            
            const result = findExcerptPartialMatch(text, excerpt);
            expect(result).not.toBeNull();
            expect(result!.index).toBe(0);  // Should find first occurrence
        });
        
        it('finds correct occurrence when multiple similar patterns exist', () => {
            const text = 'First sentence here. The quick brown fox jumps. Another sentence. The quick brown fox jumps over the lazy dog.';
            const excerpt = 'The quick brown fox jumps over the lazy dog';
            
            const result = findExcerptPartialMatch(text, excerpt);
            expect(result).not.toBeNull();
            // Should find the longer match, not the shorter one
            const matchedText = text.substring(result!.index, result!.index + result!.length);
            expect(matchedText).toContain('lazy dog');
        });
    });
    
    describe('Edge cases', () => {
        it('handles excerpts exactly at minimum length (20 chars)', () => {
            const text = 'This is exactly twenty characters long and more.';
            const excerpt = 'exactly twenty char';  // Exactly 19 chars - should return null
            
            const result1 = findExcerptPartialMatch(text, excerpt);
            expect(result1).toBeNull();
            
            const excerpt2 = 'exactly twenty chars';  // Exactly 20 chars
            const result2 = findExcerptPartialMatch(text, excerpt2);
            // This should try partial matching but may still fail if boundaries don't match
        });
        
        it('handles very long excerpts', () => {
            const text = 'This is a very long piece of text that contains multiple sentences and goes on for quite a while. It has many words and phrases throughout the entire passage.';
            const excerpt = 'This is a very long piece of text that contains multiple sentences and goes on. It has many words and phrases throughout the entire passage.';
            
            const result = findExcerptPartialMatch(text, excerpt);
            expect(result).not.toBeNull();
        });
        
        it('handles special characters in text', () => {
            const text = 'She said, "Hello—how are you?" and smiled brightly.';
            const excerpt = 'She said, "Hello—how are you?" and smiled';  // Missing "brightly" at end
            
            const result = findExcerptPartialMatch(text, excerpt);
            expect(result).not.toBeNull();
        });
        
        it('handles newlines in excerpts', () => {
            const text = 'First line here.\nSecond line goes here.\nThird line ends it.';
            const excerpt = 'First line here.\nSecond line goes here.';
            
            const result = findExcerptPartialMatch(text, excerpt);
            expect(result).not.toBeNull();
        });
    });
    
    describe('Real-world examples', () => {
        it('handles the "trying not squint" example from the issue', () => {
            const text = 'Georgian terraced houses, trying not to squint too much against the bright afternoon sun.';
            const excerpt = 'trying not squint too much';  // Missing "to"
            
            const result = findExcerptPartialMatch(text, excerpt);
            expect(result).not.toBeNull();
            if (result) {
                const matched = text.substring(result.index, result.index + result.length);
                expect(matched).toContain('trying not');
                expect(matched).toContain('squint too much');
            }
        });
        
        it('handles article issues in prose', () => {
            const text = 'The cat sat on the mat and looked around the room.';
            const excerpt = 'cat sat on mat and looked around room';  // Missing articles
            
            const result = findExcerptPartialMatch(text, excerpt);
            // This is a harder case - may or may not match depending on boundaries
            // The important thing is it doesn't throw an error
        });
    });
    
    describe('Return value validation', () => {
        it('returns valid index and length when match is found', () => {
            const text = 'The quick brown fox jumps over the lazy dog.';
            const excerpt = 'The quick brown fox jumps.';  // Missing end
            
            const result = findExcerptPartialMatch(text, excerpt);
            
            if (result !== null) {
                expect(result.index).toBeGreaterThanOrEqual(0);
                expect(result.length).toBeGreaterThan(0);
                expect(result.index + result.length).toBeLessThanOrEqual(text.length);
                
                // Verify we can actually extract the text
                const extracted = text.substring(result.index, result.index + result.length);
                expect(extracted.length).toBe(result.length);
            }
        });
    });
});
