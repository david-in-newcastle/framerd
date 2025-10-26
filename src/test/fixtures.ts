/**
 * Test Fixture Manager
 * 
 * Centralized access to test fixtures for consistent testing.
 * Makes it easy to:
 * - Load response fixtures
 * - Load document fixtures
 * - Add new fixtures without modifying tests
 */

import * as fs from 'fs';
import * as path from 'path';

const FIXTURES_DIR = path.join(__dirname, '../../test-fixtures');
const RESPONSES_DIR = path.join(FIXTURES_DIR, 'responses');
const DOCUMENTS_DIR = path.join(FIXTURES_DIR, 'documents');

/**
 * Load a Claude response fixture
 */
export function loadResponse(name: string): string {
    const filePath = path.join(RESPONSES_DIR, name);
    if (!fs.existsSync(filePath)) {
        throw new Error(`Response fixture not found: ${name}`);
    }
    return fs.readFileSync(filePath, 'utf-8');
}

/**
 * Load a document fixture
 */
export function loadDocument(name: string): string {
    const filePath = path.join(DOCUMENTS_DIR, name);
    if (!fs.existsSync(filePath)) {
        throw new Error(`Document fixture not found: ${name}`);
    }
    return fs.readFileSync(filePath, 'utf-8');
}

/**
 * List all response fixtures
 */
export function listResponses(): string[] {
    if (!fs.existsSync(RESPONSES_DIR)) {
        return [];
    }
    return fs.readdirSync(RESPONSES_DIR).filter(f => f.endsWith('.txt'));
}

/**
 * List all document fixtures
 */
export function listDocuments(): string[] {
    if (!fs.existsSync(DOCUMENTS_DIR)) {
        return [];
    }
    return fs.readdirSync(DOCUMENTS_DIR).filter(f => f.endsWith('.txt'));
}

/**
 * Save a new response fixture (useful for capturing real API responses)
 */
export function saveResponse(name: string, content: string): void {
    if (!fs.existsSync(RESPONSES_DIR)) {
        fs.mkdirSync(RESPONSES_DIR, { recursive: true });
    }
    const filePath = path.join(RESPONSES_DIR, name);
    fs.writeFileSync(filePath, content, 'utf-8');
}

/**
 * Save a new document fixture
 */
export function saveDocument(name: string, content: string): void {
    if (!fs.existsSync(DOCUMENTS_DIR)) {
        fs.mkdirSync(DOCUMENTS_DIR, { recursive: true });
    }
    const filePath = path.join(DOCUMENTS_DIR, name);
    fs.writeFileSync(filePath, content, 'utf-8');
}

/**
 * Predefined fixtures for common test scenarios
 */
export const Fixtures = {
    // Responses
    responses: {
        /** Complete, well-formed response with multiple issues */
        complete: () => loadResponse('complete-valid.txt'),
        
        /** Response with incomplete streaming (partial FIX field) */
        incompleteStreaming: () => loadResponse('incomplete-streaming.txt'),
        
        /** Response with malformed quotes */
        malformedQuotes: () => loadResponse('malformed-quotes.txt'),
        
        /** Response with overlapping excerpts */
        overlappingExcerpts: () => loadResponse('overlapping-excerpts.txt'),
        
        /** Response with missing required fields */
        missingFields: () => loadResponse('missing-fields.txt'),
        
        /** Real response from Oct 25, 2025 session (the line15 bug) */
        realSession20251025: () => loadResponse('real-session-2025-10-25.txt')
    },
    
    // Documents
    documents: {
        /** Simple test prose with known issues */
        simple: () => loadDocument('simple-test.txt'),
        
        /** Chapter with complex issues */
        chapter: () => loadDocument('chapter-test.txt')
    }
};

/**
 * Helper: Get fixture path (for direct fs operations in tests)
 */
export function getFixturePath(type: 'responses' | 'documents', name: string): string {
    return path.join(type === 'responses' ? RESPONSES_DIR : DOCUMENTS_DIR, name);
}
