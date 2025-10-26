import { Suggestion } from './types';

/**
 * Extract the misspelled word from a spelling error comment
 * Handles multiple formats:
 * - 'Spelling error - "fabic" should be "fabric"'
 * - 'Misspelling of "fabric"'
 * - 'Wrong word - should be "losing" not "loosing"'
 */
export function extractMisspelledWord(comment: string): string | null {
    // Try original format: Spelling error - "word" should be
    let match = comment.match(/Spelling error[^"]*"([^"]+)"/);
    if (match) return match[1];
    
    // Try new format: Misspelling of "word"
    match = comment.match(/Misspelling of ["']?([^"']+)["']?/);
    if (match) return match[1].replace(/["']$/, '').trim();
    
    // Try format: "word" should be (at start of comment)
    match = comment.match(/^["']([^"']+)["'] should be/);
    if (match) return match[1];
    
    // Try wrong word format: should be "word" not "word" (for exclusion)
    // This pattern has "not" after to distinguish from above
    match = comment.match(/should be ["']([^"']+)["'] not/);
    if (match) return null; // This is wrong-word format, skip
    
    return null;
}

/**
 * Check if a suggestion is a spelling error (eligible for dictionary)
 * Now accepts both 'Spelling error' and 'Misspelling' language
 */
export function isSpellingError(suggestion: Suggestion): boolean {
    const comment = suggestion.comment;
    const category = suggestion.category;
    
    // Check for spelling error language in comment
    const hasSpellingLanguage = 
        comment.includes('Spelling error') || 
        comment.includes('Misspelling of') ||
        comment.includes('Misspelling');
    
    // Also check category
    const isSpellingCategory = category === 'spelling';
    
    // Exclude wrong word/homophone cases
    const isWrongWord = 
        comment.includes('Wrong word') ||
        comment.includes('Wrong homophone') ||
        comment.includes('homophone');
    
    return (hasSpellingLanguage || isSpellingCategory) && !isWrongWord;
}
