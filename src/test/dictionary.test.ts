import { Suggestion } from '../types';
import { extractMisspelledWord, isSpellingError } from '../dictionary-utils';

describe('Dictionary functionality', () => {
    describe('extractMisspelledWord', () => {
        it('extracts word from standard spelling error', () => {
            const comment = 'Spelling error - "fabic" should be "fabric"';
            expect(extractMisspelledWord(comment)).toBe('fabic');
        });

        it('extracts word from spelling error without dash', () => {
            const comment = 'Spelling error "moost" should be "most"';
            expect(extractMisspelledWord(comment)).toBe('moost');
        });

        it('handles curly quotes', () => {
            const comment = 'Spelling error - "fabic" should be "fabric"';
            expect(extractMisspelledWord(comment)).toBe('fabic');
        });

        it('extracts from "Misspelling of" format', () => {
            const comment = 'Misspelling of "fabric"';
            expect(extractMisspelledWord(comment)).toBe('fabric');
        });

        it('extracts from "Misspelling of" format without quotes', () => {
            const comment = 'Misspelling of fabric';
            expect(extractMisspelledWord(comment)).toBe('fabric');
        });

        it('extracts from quoted word at start format', () => {
            const comment = '"fabic" should be "fabric"';
            expect(extractMisspelledWord(comment)).toBe('fabic');
        });

        it('returns null for non-spelling errors', () => {
            const comment = 'Wrong word - should be "knew" (past tense of know)';
            expect(extractMisspelledWord(comment)).toBeNull();
        });

        it('returns null for wrong spelling errors', () => {
            const comment = 'Wrong spelling - should be "losing" (one \'o\')';
            expect(extractMisspelledWord(comment)).toBeNull();
        });

        it('returns null when no quotes present', () => {
            const comment = 'Spelling error in the text';
            expect(extractMisspelledWord(comment)).toBeNull();
        });

        it('handles multiple quotes by taking first', () => {
            const comment = 'Spelling error - "Clairty" should be "Clarity"';
            expect(extractMisspelledWord(comment)).toBe('Clairty');
        });

        it('handles words with special characters', () => {
            const comment = 'Spelling error - "naïve" should be "naive"';
            expect(extractMisspelledWord(comment)).toBe('naïve');
        });
    });

    describe('isSpellingError', () => {
        it('returns true for spelling errors', () => {
            const suggestion: Suggestion = {
                comment: 'Spelling error - "fabic" should be "fabric"',
                target_excerpt: 'peeling the sodden fabic away',
                category: 'grammar',
                severity: 'high',
                explanation: 'Spelling error - "fabic" should be "fabric"',
                rewrite: 'peeling the sodden fabric away'
            };
            expect(isSpellingError(suggestion)).toBe(true);
        });

        it('returns true for "Misspelling of" format', () => {
            const suggestion: Suggestion = {
                comment: 'Misspelling of "fabric"',
                target_excerpt: 'peeling the sodden fabic away',
                category: 'spelling',
                severity: 'high',
                explanation: 'Misspelling of "fabric"',
                rewrite: 'peeling the sodden fabric away'
            };
            expect(isSpellingError(suggestion)).toBe(true);
        });

        it('returns true for spelling category even without specific language', () => {
            const suggestion: Suggestion = {
                comment: 'Should be "fabric"',
                target_excerpt: 'peeling the sodden fabic away',
                category: 'spelling',
                severity: 'high',
                explanation: 'Should be "fabric"',
                rewrite: 'peeling the sodden fabric away'
            };
            expect(isSpellingError(suggestion)).toBe(true);
        });

        it('returns false for wrong word errors', () => {
            const suggestion: Suggestion = {
                comment: 'Wrong word - should be "knew" (past tense of know)',
                target_excerpt: 'They all new my name',
                category: 'grammar',
                severity: 'high',
                explanation: 'Wrong word - should be "knew" (past tense of know)',
                rewrite: 'They all knew my name'
            };
            expect(isSpellingError(suggestion)).toBe(false);
        });

        it('returns false for wrong spelling errors', () => {
            const suggestion: Suggestion = {
                comment: 'Wrong spelling - should be "losing" (one \'o\')',
                target_excerpt: 'I was loosing it',
                category: 'grammar',
                severity: 'high',
                explanation: 'Wrong spelling - should be "losing" (one \'o\')',
                rewrite: 'I was losing it'
            };
            expect(isSpellingError(suggestion)).toBe(false);
        });

        it('returns false for grammar errors', () => {
            const suggestion: Suggestion = {
                comment: 'Missing "to" before infinitive verb',
                target_excerpt: 'I was trying not squint',
                category: 'grammar',
                severity: 'high',
                explanation: 'Missing "to" before infinitive verb',
                rewrite: 'I was trying not to squint'
            };
            expect(isSpellingError(suggestion)).toBe(false);
        });

        it('returns false for homophone errors', () => {
            const suggestion: Suggestion = {
                comment: 'Wrong homophone - should be "You\'re" (You are)',
                target_excerpt: 'Your not the usual kind',
                category: 'grammar',
                severity: 'high',
                explanation: 'Wrong homophone - should be "You\'re" (You are)',
                rewrite: 'You\'re not the usual kind'
            };
            expect(isSpellingError(suggestion)).toBe(false);
        });

        it('returns false for wrong words even with spelling category', () => {
            const suggestion: Suggestion = {
                comment: 'Wrong word - should be "losing" not "loosing"',
                target_excerpt: 'I was loosing it',
                category: 'spelling',
                severity: 'high',
                explanation: 'Wrong word - should be "losing" not "loosing"',
                rewrite: 'I was losing it'
            };
            expect(isSpellingError(suggestion)).toBe(false);
        });
    });

    describe('Dictionary integration', () => {
        // These would be more complex integration tests that interact with VSCode APIs
        // Skipping for now, but structure would look like:
        
        it.todo('adds word to workspace configuration when command is invoked');
        it.todo('removes diagnostic after adding word to dictionary');
        it.todo('client-side filtering suppresses dictionary words (not sent to LLM)');
        it.todo('prevents duplicate words in dictionary');
        it.todo('shows "Add to dictionary" action only for spelling errors');
    });
});

describe('Suggestion statistics tracking', () => {
    // These are more integration-level tests that would need mocking
    // Documenting expected behavior:
    
    it.todo('tracks total suggestions received');
    it.todo('tracks suggestions shown at correct location');
    it.todo('tracks suggestions shown at line 1 (no location found)');
    it.todo('tracks suggestions filtered by dictionary');
    it.todo('logs summary at end of review');
    it.todo('shows summary in notification message');
});

describe('Diagnostic placement', () => {
    // Integration tests for diagnostic behavior
    
    it.todo('places diagnostics at correct location when excerpt found');
    it.todo('places diagnostics on line 1 when excerpt not found');
    it.todo('diagnostics at line 1 span entire first line');
    it.todo('diagnostics at line 1 use proper severity (not Hint)');
    it.todo('overlapping suggestions shown without quick fix');
    it.todo('non-quick-fixable suggestions shown without quick fix');
});
