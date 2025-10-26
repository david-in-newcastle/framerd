/**
 * Excerpt Matching Utilities
 * 
 * Functions for finding text excerpts in documents, including fuzzy/partial matching.
 */

/**
 * Attempts to find an excerpt in text using partial matching (first N + last N chars).
 * Useful when exact match fails due to boundary issues.
 * @returns { index: number, length: number } if found, null otherwise
 */
export function findExcerptPartialMatch(text: string, excerpt: string): { index: number, length: number } | null {
    // Don't try partial matching on very short excerpts
    if (excerpt.length < 20) {
        return null;
    }
    
    // Use first/last 50 chars, or 25% of excerpt length, whichever is smaller
    const matchLength = Math.min(50, Math.floor(excerpt.length * 0.25));
    
    const prefix = excerpt.substring(0, matchLength);
    const suffix = excerpt.substring(excerpt.length - matchLength);
    
    // Search for prefix
    let searchStart = 0;
    while (true) {
        const prefixIndex = text.indexOf(prefix, searchStart);
        if (prefixIndex === -1) {
            break; // No more matches
        }
        
        // Check if suffix appears at approximately the right distance
        // Allow for some flexibility in length (excerpt might be slightly off)
        const expectedSuffixStart = prefixIndex + excerpt.length - matchLength;
        const searchWindow = 50; // Allow ±50 chars variation
        
        for (let offset = -searchWindow; offset <= searchWindow; offset++) {
            const suffixIndex = expectedSuffixStart + offset;
            if (suffixIndex >= 0 && text.substring(suffixIndex, suffixIndex + matchLength) === suffix) {
                // Found it! Calculate the actual matched length
                const actualLength = suffixIndex + matchLength - prefixIndex;
                return { index: prefixIndex, length: actualLength };
            }
        }
        
        // Try next occurrence of prefix
        searchStart = prefixIndex + 1;
    }
    
    return null;
}
