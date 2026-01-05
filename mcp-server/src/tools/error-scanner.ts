/**
 * Error Scanner Tool
 * Scannt verschiedene Quellen nach Fehlern: DB Logs, Console Errors, Test Failures
 */

import { z } from 'zod';
import { readFile } from 'fs/promises';
import { join } from 'path';

const ScanErrorsArgsSchema = z.object({
    sources: z.array(z.enum(['db-logs', 'console', 'test-output', 'all'])).default(['all']),
    filter: z.string().optional(),
    since: z.string().optional(), // ISO timestamp
    limit: z.number().default(50),
});

export type ScanErrorsArgs = z.infer<typeof ScanErrorsArgsSchema>;

export interface ErrorEntry {
    timestamp: string;
    source: 'db-logs' | 'console' | 'test-output';
    level: 'error' | 'warn' | 'info';
    message: string;
    context?: any;
    stackTrace?: string;
}

export interface ScanErrorsResult {
    success: boolean;
    errors: ErrorEntry[];
    summary: {
        totalErrors: number;
        bySource: Record<string, number>;
        byLevel: Record<string, number>;
    };
    patterns?: string[]; // Häufige Fehler-Patterns erkannt
}

/**
 * Hauptfunktion: Scannt Fehler aus verschiedenen Quellen
 */
export async function scanErrors(args: ScanErrorsArgs): Promise<ScanErrorsResult> {
    const validated = ScanErrorsArgsSchema.parse(args);

    const allErrors: ErrorEntry[] = [];

    const sources = validated.sources.includes('all')
        ? ['db-logs', 'console', 'test-output']
        : validated.sources;

    // Scan DB Logs
    if (sources.includes('db-logs')) {
        const dbErrors = await scanDatabaseLogs(validated.filter, validated.since, validated.limit);
        allErrors.push(...dbErrors);
    }

    // Scan Console (from browser debugging sessions)
    if (sources.includes('console')) {
        const consoleErrors = await scanConsoleErrors(validated.filter, validated.limit);
        allErrors.push(...consoleErrors);
    }

    // Scan Test Output
    if (sources.includes('test-output')) {
        const testErrors = await scanTestOutput(validated.filter, validated.limit);
        allErrors.push(...testErrors);
    }

    // Sort by timestamp (newest first)
    allErrors.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    // Limit results
    const errors = allErrors.slice(0, validated.limit);

    // Analyze patterns
    const patterns = analyzeErrorPatterns(errors);

    return {
        success: true,
        errors,
        summary: {
            totalErrors: errors.length,
            bySource: countByKey(errors, 'source'),
            byLevel: countByKey(errors, 'level'),
        },
        patterns,
    };
}

/**
 * Scan Database Logs (from IndexedDB logs table)
 */
async function scanDatabaseLogs(filter?: string, since?: string, limit = 50): Promise<ErrorEntry[]> {
    // This would normally query IndexedDB, but we'll read from a debug export or generate browser script
    const errors: ErrorEntry[] = [];

    // Generate browser script to fetch logs
    const script = `
        (async () => {
            const db = await new Promise((resolve) => {
                const req = indexedDB.open('MigraineDB');
                req.onsuccess = () => resolve(req.result);
            });
            
            const tx = db.transaction('logs', 'readonly');
            const store = tx.objectStore('logs');
            const logs = await new Promise((resolve) => {
                const req = store.getAll();
                req.onsuccess = () => resolve(req.result);
            });
            
            return logs
                .filter(log => log.level === 'error' || log.level === 'warn')
                ${filter ? `.filter(log => log.message.match(/${filter}/i))` : ''}
                ${since ? `.filter(log => new Date(log.timestamp) > new Date('${since}'))` : ''}
                .slice(0, ${limit});
        })();
    `;

    // Return script for now - in real implementation, this would execute via Playwright
    errors.push({
        timestamp: new Date().toISOString(),
        source: 'db-logs',
        level: 'info',
        message: 'DB Log scan requires browser execution. Use live-debug tool.',
        context: { script },
    });

    return errors;
}

/**
 * Scan Console Errors (from saved debug sessions)
 */
async function scanConsoleErrors(filter?: string, limit = 50): Promise<ErrorEntry[]> {
    const errors: ErrorEntry[] = [];
    const workspaceRoot = '/home/daniel/Desktop/garmin';

    // Try to read from debug log file if exists
    try {
        const debugLogPath = join(workspaceRoot, 'debug-console.log');
        const content = await readFile(debugLogPath, 'utf-8');
        const lines = content.split('\n');

        lines.forEach(line => {
            if (!line.trim()) return;

            try {
                const entry = JSON.parse(line);
                if (entry.level === 'error' || entry.level === 'warn') {
                    if (!filter || entry.message.match(new RegExp(filter, 'i'))) {
                        errors.push({
                            timestamp: entry.timestamp,
                            source: 'console',
                            level: entry.level,
                            message: entry.message,
                            context: entry.context,
                            stackTrace: entry.stack,
                        });
                    }
                }
            } catch {
                // Invalid JSON, skip
            }
        });
    } catch {
        // File doesn't exist, no console logs available
    }

    return errors.slice(0, limit);
}

/**
 * Scan Test Output (from test failures)
 */
async function scanTestOutput(filter?: string, limit = 50): Promise<ErrorEntry[]> {
    const errors: ErrorEntry[] = [];
    const workspaceRoot = '/home/daniel/Desktop/garmin';

    try {
        // Try to read latest test output
        const testLogPath = join(workspaceRoot, '.vitest', 'results.json');
        const content = await readFile(testLogPath, 'utf-8');
        const results = JSON.parse(content);

        results.testResults?.forEach((testFile: any) => {
            testFile.assertionResults?.forEach((test: any) => {
                if (test.status === 'failed') {
                    const message = test.failureMessages?.[0] || 'Test failed';

                    if (!filter || message.match(new RegExp(filter, 'i'))) {
                        errors.push({
                            timestamp: new Date(results.startTime).toISOString(),
                            source: 'test-output',
                            level: 'error',
                            message: `Test failed: ${test.title}`,
                            context: {
                                file: testFile.name,
                                test: test.fullName,
                            },
                            stackTrace: test.failureMessages?.[0],
                        });
                    }
                }
            });
        });
    } catch {
        // No test results available
    }

    return errors.slice(0, limit);
}

/**
 * Analyze Error Patterns
 */
function analyzeErrorPatterns(errors: ErrorEntry[]): string[] {
    const patterns: Map<string, number> = new Map();

    errors.forEach(error => {
        // Extract key patterns from error messages
        const msg = error.message.toLowerCase();

        // Common patterns
        if (msg.includes('401') || msg.includes('unauthorized')) {
            patterns.set('Authentication failures (401)', (patterns.get('Authentication failures (401)') || 0) + 1);
        }
        if (msg.includes('oauth')) {
            patterns.set('OAuth issues', (patterns.get('OAuth issues') || 0) + 1);
        }
        if (msg.includes('garmin')) {
            patterns.set('Garmin API errors', (patterns.get('Garmin API errors') || 0) + 1);
        }
        if (msg.includes('timeout')) {
            patterns.set('Timeout errors', (patterns.get('Timeout errors') || 0) + 1);
        }
        if (msg.includes('network') || msg.includes('fetch failed')) {
            patterns.set('Network errors', (patterns.get('Network errors') || 0) + 1);
        }
        if (msg.includes('undefined') || msg.includes('null')) {
            patterns.set('Null/undefined errors', (patterns.get('Null/undefined errors') || 0) + 1);
        }
        if (msg.includes('signature')) {
            patterns.set('Signature/Crypto errors', (patterns.get('Signature/Crypto errors') || 0) + 1);
        }
    });

    // Sort by frequency
    const sortedPatterns = Array.from(patterns.entries())
        .sort((a, b) => b[1] - a[1])
        .map(([pattern, count]) => `${pattern} (${count}x)`);

    return sortedPatterns.slice(0, 5); // Top 5 patterns
}

/**
 * Helper: Count by key
 */
function countByKey<T>(items: T[], key: keyof T): Record<string, number> {
    const counts: Record<string, number> = {};

    items.forEach(item => {
        const value = String(item[key]);
        counts[value] = (counts[value] || 0) + 1;
    });

    return counts;
}
