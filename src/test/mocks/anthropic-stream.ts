/**
 * Mock Anthropic streaming API for testing
 * 
 * Simulates the streaming behavior without making actual API calls.
 * Useful for:
 * - Fast unit tests
 * - Testing edge cases (incomplete streams, malformed data)
 * - Reproducible test scenarios
 */

interface StreamEvent {
    type: string;
    delta?: {
        type: string;
        text?: string;
    };
}

interface StreamOptions {
    /** Delay between chunks in ms (default: 0 for tests) */
    chunkDelay?: number;
    /** Characters per chunk (default: 1) */
    charsPerChunk?: number;
    /** Simulate abort after N chunks */
    abortAfterChunks?: number;
    /** Simulate network error after N chunks */
    errorAfterChunks?: number;
}

export class MockAnthropicStream {
    private responseText: string;
    private options: StreamOptions;
    private chunkCount = 0;
    
    constructor(responseText: string, options: StreamOptions = {}) {
        this.responseText = responseText;
        this.options = {
            chunkDelay: 0,
            charsPerChunk: 1,
            ...options
        };
    }
    
    async *[Symbol.asyncIterator](): AsyncIterator<StreamEvent> {
        const charsPerChunk = this.options.charsPerChunk || 1;
        
        for (let i = 0; i < this.responseText.length; i += charsPerChunk) {
            this.chunkCount++;
            
            // Simulate abort
            if (this.options.abortAfterChunks && this.chunkCount > this.options.abortAfterChunks) {
                throw new Error('Stream aborted');
            }
            
            // Simulate network error
            if (this.options.errorAfterChunks && this.chunkCount > this.options.errorAfterChunks) {
                throw new Error('Network error');
            }
            
            const chunk = this.responseText.slice(i, i + charsPerChunk);
            
            yield {
                type: 'content_block_delta',
                delta: {
                    type: 'text_delta',
                    text: chunk
                }
            };
            
            // Optional delay between chunks
            if (this.options.chunkDelay && this.options.chunkDelay > 0) {
                await new Promise(resolve => setTimeout(resolve, this.options.chunkDelay));
            }
        }
    }
}

/**
 * Create a mock Anthropic client that returns mocked streams
 */
export function createMockAnthropicClient(responseText: string, options: StreamOptions = {}) {
    return {
        messages: {
            create: async (params: any) => {
                if (!params.stream) {
                    // Non-streaming response
                    return {
                        content: [{ type: 'text', text: responseText }]
                    };
                }
                
                // Return mock stream
                const stream = new MockAnthropicStream(responseText, options);
                return {
                    ...stream,
                    controller: {
                        abort: () => {
                            // Simulate abort
                        }
                    }
                };
            }
        }
    };
}

/**
 * Helper: Create realistic streaming chunks for testing
 * Simulates how Claude actually streams - word by word, punctuation, etc.
 */
export function createRealisticChunks(text: string): string[] {
    const chunks: string[] = [];
    let buffer = '';
    
    for (let i = 0; i < text.length; i++) {
        const char = text[i];
        buffer += char;
        
        // Chunk on spaces, newlines, and punctuation
        if (char === ' ' || char === '\n' || char === '.' || char === ',' || char === ':') {
            chunks.push(buffer);
            buffer = '';
        }
    }
    
    if (buffer) {
        chunks.push(buffer);
    }
    
    return chunks;
}
