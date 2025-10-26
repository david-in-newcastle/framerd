// Pure parsing functions - no VSCode dependencies
import { logger } from './logger';

export interface ParsedSuggestion {
    comment: string;
    target_excerpt: string;
    category: string;
    severity: 'high' | 'moderate' | 'low';
    explanation: string;
    rewrite: string;
}

/**
 * Strip surrounding quotes (straight or curly) from a string
 */
function stripQuotes(text: string): string {
    text = text.trim();
    
    // Handle paired quotes explicitly - no regex tricks
    const quoteChars = ['"', '"', '"', "'", "'", "'"];
    
    for (const quote of quoteChars) {
        if (text.startsWith(quote) && text.endsWith(quote) && text.length > 1) {
            return text.slice(1, -1).trim();
        }
    }
    
    // No quotes found, return as-is
    return text;
}

/**
 * Extract a field value from a block, stopping at the next field marker
 */
function extractField(
    block: string, 
    fieldName: string, 
    stopAt?: string
): string | null {
    const stopPattern = stopAt ? `(?=${stopAt}|$)` : '$';
    const pattern = new RegExp(
        `${fieldName}:\\s*(.+?)\\s*${stopPattern}`,
        'is'
    );
    
    const match = block.match(pattern);
    if (!match) return null;
    
    return stripQuotes(match[1]);
}

/**
 * Check if an issue block has all required fields AND if quoted values are properly closed
 */
export function isBlockComplete(block: string): boolean {
    // Check if all required fields exist
    if (!/EXCERPT:/i.test(block) ||
        !/CATEGORY:/i.test(block) ||
        !/SEVERITY:/i.test(block) ||
        !/PROBLEM:/i.test(block) ||
        !/FIX:/i.test(block)) {
        return false;
    }
    
    // Extract the FIX field to check if it's complete
    const fixMatch = block.match(/FIX:\s*(.+?)$/is);
    if (!fixMatch) return false;
    
    const fixValue = fixMatch[1].trim();
    
    // If FIX starts with a quote, it must end with a matching quote
    const quoteChars = ['"', '"', '"', "'", "'", "'"];
    for (const quote of quoteChars) {
        if (fixValue.startsWith(quote)) {
            // Must end with the same type of quote
            return fixValue.endsWith(quote) && fixValue.length > 1;
        }
    }
    
    // If no quotes, consider it complete if it has some content
    return fixValue.length > 0;
}

/**
 * Parse a single complete issue block
 */
// In parsing.ts, update parseIssueBlock:

export function parseIssueBlock(block: string): ParsedSuggestion | null {
    try {
        // ADD LOGGING HERE
        logger.debug('=== PARSE ISSUE BLOCK ===');
        logger.debug('Full block text:', block);
        logger.debug('Block length:', block.length);
        
        const excerpt = extractField(block, 'EXCERPT', 'CATEGORY:');
        const category = extractField(block, 'CATEGORY', 'SEVERITY:');
        const severityStr = extractField(block, 'SEVERITY', 'PROBLEM:');
        const problem = extractField(block, 'PROBLEM', 'FIX:');
        const fix = extractField(block, 'FIX');
        
        logger.debug('Raw fix from extractField:', fix);
        logger.debug('Fix length:', fix?.length);
        
        if (!excerpt || !category || !severityStr || !problem) {
            logger.debug('Missing required fields in block');
            return null;
        }
        
        const severity = severityStr.toLowerCase();
        if (severity !== 'high' && severity !== 'moderate' && severity !== 'low') {
            logger.debug('Invalid severity:', severityStr);
            return null;
        }
        
        const cleanFix = fix ? fix.replace(/---\s*$/, '').trim() : '';
        
        const result = {
            comment: problem,
            target_excerpt: excerpt,
            category: category,
            severity: severity as 'high' | 'moderate' | 'low',
            explanation: problem,
            rewrite: cleanFix
        };
        
        logger.debug('Returning rewrite:', result.rewrite);
        logger.debug('Returning rewrite length:', result.rewrite.length);
        
        return result;
    } catch (e) {
        logger.debug('Failed to parse issue block:', e);
        return null;
    }
}

/**
 * Parse complete issue blocks from text (for non-streaming or completed streams)
 */
export function parseCompleteIssueBlocks(text: string): ParsedSuggestion[] {
    const suggestions: ParsedSuggestion[] = [];
    
    // Match all issue blocks: ---\nISSUE N\n...content...
    const issuePattern = /---\s*\nISSUE\s+(\d+)\s*\n(.*?)(?=---\s*\n|$)/gis;
    const matches = [...text.matchAll(issuePattern)];
    
    for (const match of matches) {
        const block = match[2];
        
        // Only parse if block is complete
        if (!isBlockComplete(block)) {
            continue;
        }
        
        const suggestion = parseIssueBlock(block);
        if (suggestion) {
            suggestions.push(suggestion);
        }
    }
    
    return suggestions;
}

/**
 * Parse streaming buffer, returning completed suggestions and remainder
 */
export function parsePartialBuffer(buffer: string): { 
    parsed: ParsedSuggestion[], 
    remainder: string 
} {
    const suggestions: ParsedSuggestion[] = [];
    
    // Match all issue blocks
    const issuePattern = /---\s*\nISSUE\s+(\d+)\s*\n(.*?)(?=---\s*\n|$)/gis;
    const matches = [...buffer.matchAll(issuePattern)];
    
    let lastCompleteIndex = 0;
    
    for (let i = 0; i < matches.length; i++) {
        const match = matches[i];
        const block = match[2];
        
        // If there's another --- after this one, it's definitely complete
        const isFollowedByAnother = i < matches.length - 1;
        
        if (!isFollowedByAnother) {
            // Last block - only parse if it's complete
            if (!isBlockComplete(block)) {
                break; // Don't parse incomplete last block
            }
        }
        
        const suggestion = parseIssueBlock(block);
        if (suggestion) {
            suggestions.push(suggestion);
            lastCompleteIndex = match.index + match[0].length;
        }
    }
    
    return {
        parsed: suggestions,
        remainder: buffer.slice(lastCompleteIndex)
    };
}

/**
 * Extract summary from the beginning of Claude's response (before first issue)
 */
export function extractSummary(text: string): string {
    const firstIssueMatch = text.match(/---\s*\nISSUE\s+\d+/i);
    if (!firstIssueMatch) {
        return text.trim();
    }
    
    const summary = text.slice(0, firstIssueMatch.index).trim();
    return summary || 'Review complete.';
}

/**
 * Determine if a suggestion can be safely applied as a quick fix,
 * or if it requires human judgment (Hint only)
 */
export function isQuickFixable(suggestion: ParsedSuggestion): boolean {
    // Empty or whitespace-only rewrite → Hint
    if (!suggestion.rewrite || !suggestion.rewrite.trim()) {
        return false;
    }
    
    // Has "or" → multiple options → Hint
    if (suggestion.rewrite.includes(' or ')) {
        return false;
    }
    
    // Very long rewrite → probably structural change → Hint
    if (suggestion.rewrite.length > 100) {
        return false;
    }
    
    // Certain categories always require judgment → Hint
    const hintOnlyCategories = ['consistency', 'structure', 'word_choice'];
    if (hintOnlyCategories.includes(suggestion.category.toLowerCase())) {
        return false;
    }
    
    // Otherwise it's a simple direct replacement → Quick Fix
    return true;
}