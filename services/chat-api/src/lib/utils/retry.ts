/**
 * Shared exponential backoff retry utility for external API calls
 */

export interface RetryConfig {
    /** Maximum number of retry attempts (default: 3) */
    maxRetries: number;
    /** Initial delay in milliseconds before first retry (default: 1000) */
    initialDelayMs: number;
    /** Maximum delay cap in milliseconds (default: 30000) */
    maxDelayMs: number;
    /** Multiplier for exponential backoff (default: 2) */
    backoffMultiplier: number;
    /** Jitter range 0-1 for random variation (default: 0.2) */
    jitterRange: number;
    /** HTTP status codes to retry on (default: [429, 500, 502, 503, 504]) */
    retryOnStatusCodes: number[];
    /** Custom predicate to determine if error is retryable */
    isRetryable?: (error: unknown) => boolean;
}

const DEFAULT_CONFIG: RetryConfig = {
    maxRetries: 3,
    initialDelayMs: 1000,
    maxDelayMs: 30000,
    backoffMultiplier: 2,
    jitterRange: 0.2,
    retryOnStatusCodes: [429, 500, 502, 503, 504]
};

/**
 * Calculate exponential backoff delay with jitter
 */
function calculateDelay(attempt: number, config: RetryConfig): number {
    const baseDelay = config.initialDelayMs * Math.pow(config.backoffMultiplier, attempt);
    const cappedDelay = Math.min(baseDelay, config.maxDelayMs);
    
    // Apply jitter: +/- (jitterRange * 100)% of the delay
    const jitterFactor = 1 + (Math.random() * 2 - 1) * config.jitterRange;
    const jitteredDelay = Math.round(cappedDelay * jitterFactor);
    
    return Math.max(0, jitteredDelay);
}

/**
 * Sleep for specified milliseconds
 */
export function sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Fetch with exponential backoff retry
 * 
 * @param url - The URL to fetch
 * @param options - Fetch options
 * @param config - Optional retry configuration
 * @returns Promise resolving to the response data
 * @throws Last error after all retries exhausted
 */
export async function fetchWithRetry<T>(
    url: string,
    options: RequestInit = {},
    config: Partial<RetryConfig> = {}
): Promise<T> {
    const cfg: RetryConfig = { ...DEFAULT_CONFIG, ...config };
    let lastError: Error | null = null;
    
    for (let attempt = 0; attempt <= cfg.maxRetries; attempt++) {
        try {
            const controller = new AbortController();
            const timeout = setTimeout(() => controller.abort(), 60000); // 60s timeout
            
            const response = await fetch(url, {
                ...options,
                signal: controller.signal
            });
            
            clearTimeout(timeout);
            
            // Check if we should retry based on status code
            if (!response.ok) {
                const status = response.status;
                
                if (cfg.retryOnStatusCodes.includes(status)) {
                    const retryAfter = response.headers.get('retry-after');
                    let delay = calculateDelay(attempt, cfg);
                    
                    // Respect Retry-After header if present
                    if (retryAfter) {
                        const seconds = parseInt(retryAfter, 10);
                        if (!isNaN(seconds)) {
                            delay = Math.max(delay, seconds * 1000);
                        }
                    }
                    
                    if (attempt < cfg.maxRetries) {
                        console.warn(
                            `[Retry] HTTP ${status} on attempt ${attempt + 1}/${cfg.maxRetries + 1}, ` +
                            `waiting ${delay}ms...`
                        );
                        await sleep(delay);
                        continue;
                    }
                }
                
                // Not retryable or max retries exceeded
                const text = await response.text().catch(() => '');
                throw new Error(`HTTP ${status}: ${text || response.statusText}`);
            }
            
            // Success - parse and return JSON
            return await response.json();
            
        } catch (error) {
            lastError = error instanceof Error ? error : new Error(String(error));
            
            // Check custom retryable predicate
            const isCustomRetryable = cfg.isRetryable?.(error);
            
            // Check if error is retryable
            const isNetworkError = error instanceof TypeError && 
                error.message.includes('fetch') ||
                error instanceof DOMException && error.name === 'AbortError';
            
            const shouldRetry = isNetworkError || 
                isCustomRetryable ||
                attempt < cfg.maxRetries;
            
            if (!shouldRetry) {
                throw error;
            }
            
            if (attempt < cfg.maxRetries) {
                const delay = calculateDelay(attempt, cfg);
                console.warn(
                    `[Retry] Error: ${lastError.message} on attempt ${attempt + 1}/${cfg.maxRetries + 1}, ` +
                    `waiting ${delay}ms...`
                );
                await sleep(delay);
            }
        }
    }
    
    throw lastError;
}

/**
 * Generic function to execute any async operation with retry
 * 
 * @param operation - The async operation to execute
 * @param config - Optional retry configuration
 * @returns Promise resolving to the operation result
 * @throws Last error after all retries exhausted
 */
export async function retryOperation<T>(
    operation: () => Promise<T>,
    config: Partial<RetryConfig> = {}
): Promise<T> {
    const cfg: RetryConfig = { ...DEFAULT_CONFIG, ...config };
    let lastError: Error | null = null;
    
    for (let attempt = 0; attempt <= cfg.maxRetries; attempt++) {
        try {
            return await operation();
        } catch (error) {
            lastError = error instanceof Error ? error : new Error(String(error));
            
            const isCustomRetryable = cfg.isRetryable?.(error);
            const isNetworkError = error instanceof TypeError && 
                error.message.includes('network') ||
                error instanceof DOMException && error.name === 'AbortError';
            
            const shouldRetry = isNetworkError || isCustomRetryable || attempt < cfg.maxRetries;
            
            if (!shouldRetry) {
                throw error;
            }
            
            if (attempt < cfg.maxRetries) {
                const delay = calculateDelay(attempt, cfg);
                console.warn(
                    `[Retry] Operation failed: ${lastError.message} on attempt ${attempt + 1}/${cfg.maxRetries + 1}, ` +
                    `waiting ${delay}ms...`
                );
                await sleep(delay);
            }
        }
    }
    
    throw lastError;
}

/**
 * Create a pre-configured retry function for specific APIs
 */
export function createRetryClient(defaults: Partial<RetryConfig>) {
    return {
        fetch: <T>(url: string, options?: RequestInit) => 
            fetchWithRetry<T>(url, options, defaults),
        operation: <T>(op: () => Promise<T>) => 
            retryOperation<T>(op, defaults)
    };
}

/**
 * Pre-configured retry clients for common APIs
 */
export const retryClients = {
    /** Overpass API: More aggressive retry for rate limiting */
    overpass: createRetryClient({
        maxRetries: 6,
        initialDelayMs: 5000,
        maxDelayMs: 120000,
        backoffMultiplier: 2.5,
        jitterRange: 0.3
    }),
    
    /** ODPT API: Moderate retry settings */
    odpt: createRetryClient({
        maxRetries: 3,
        initialDelayMs: 2000,
        maxDelayMs: 60000,
        backoffMultiplier: 2,
        jitterRange: 0.2
    }),
    
    /** General APIs: Conservative settings */
    general: createRetryClient({
        maxRetries: 2,
        initialDelayMs: 1000,
        maxDelayMs: 10000,
        backoffMultiplier: 2,
        jitterRange: 0.1
    })
};
