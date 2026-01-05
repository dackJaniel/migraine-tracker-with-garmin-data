/**
 * Code Fixer Tool
 * Generiert Code-Fixes basierend auf Fehleranalyse und Referenz-Code
 */

import { readFile } from 'fs/promises';
import { join } from 'path';
import { z } from 'zod';

const FixCodeArgsSchema = z.object({
    problem: z.string(),
    file: z.string(),
    context: z.object({
        errorMessage: z.string().optional(),
        affectedFunction: z.string().optional(),
        line: z.number().optional(),
        referenceCode: z.string().optional(), // URL or code snippet
        relatedFiles: z.array(z.string()).optional(),
    }).optional(),
    strategy: z.enum(['conservative', 'aggressive', 'experimental']).default('conservative'),
});

export type FixCodeArgs = z.infer<typeof FixCodeArgsSchema>;

export interface CodeFix {
    file: string;
    changes: Array<{
        line: number;
        oldCode: string;
        newCode: string;
        explanation: string;
    }>;
    confidence: number; // 0-1
    reasoning: string;
    warnings?: string[];
}

export interface FixCodeResult {
    success: boolean;
    fixes: CodeFix[];
    totalChanges: number;
    error?: string;
}

/**
 * Hauptfunktion: Generiert Code-Fix
 */
export async function fixCode(args: FixCodeArgs): Promise<FixCodeResult> {
    const validated = FixCodeArgsSchema.parse(args);

    try {
        const workspaceRoot = '/home/daniel/Desktop/garmin';
        const filePath = join(workspaceRoot, validated.file);

        // Read file content
        const content = await readFile(filePath, 'utf-8');
        const lines = content.split('\n');

        // Analyze problem and generate fixes
        const fixes: CodeFix[] = [];

        // Strategy 1: Pattern matching for common issues
        const patternFixes = await analyzeCommonPatterns(
            validated.problem,
            validated.file,
            content,
            lines,
            validated.context
        );

        if (patternFixes) {
            fixes.push(patternFixes);
        }

        // Strategy 2: Reference-based fixes
        if (validated.context?.referenceCode) {
            const refFixes = await analyzeReferenceCode(
                validated.problem,
                validated.file,
                content,
                validated.context
            );

            if (refFixes) {
                fixes.push(refFixes);
            }
        }

        // Strategy 3: Context-aware fixes
        const contextFixes = await analyzeContextualFixes(
            validated.problem,
            validated.file,
            content,
            lines,
            validated.context
        );

        if (contextFixes) {
            fixes.push(...contextFixes);
        }

        const totalChanges = fixes.reduce((sum, fix) => sum + fix.changes.length, 0);

        return {
            success: fixes.length > 0,
            fixes,
            totalChanges,
        };

    } catch (error: any) {
        return {
            success: false,
            fixes: [],
            totalChanges: 0,
            error: error.message,
        };
    }
}

/**
 * Analyze Common Patterns (OAuth, Async, etc.)
 */
async function analyzeCommonPatterns(
    problem: string,
    file: string,
    content: string,
    lines: string[],
    context?: any
): Promise<CodeFix | null> {
    const changes: Array<any> = [];
    let confidence = 0;
    let reasoning = '';

    // Pattern 1: OAuth1 Signature Issues
    if (problem.toLowerCase().includes('oauth') && problem.toLowerCase().includes('signature')) {
        const signatureLineIdx = lines.findIndex(line =>
            line.includes('signature') && line.includes('URLSearchParams')
        );

        if (signatureLineIdx !== -1) {
            // Check if body params are included
            const surroundingCode = lines.slice(Math.max(0, signatureLineIdx - 5), signatureLineIdx + 5).join('\n');

            if (!surroundingCode.includes('bodyParams') && surroundingCode.includes('queryParams')) {
                changes.push({
                    line: signatureLineIdx + 1,
                    oldCode: lines[signatureLineIdx],
                    newCode: lines[signatureLineIdx].replace(
                        'queryParams',
                        'allParams = { ...queryParams, ...bodyParams }'
                    ),
                    explanation: 'OAuth1 signature must include both query and body parameters (RFC 5849)',
                });

                confidence = 0.85;
                reasoning = 'OAuth1 signatures require all parameters. Missing body params is a common cause of 401 errors.';
            }
        }
    }

    // Pattern 2: Missing await
    if (problem.toLowerCase().includes('promise') || problem.toLowerCase().includes('async')) {
        lines.forEach((line, idx) => {
            if (line.includes('= ') && !line.includes('await ') &&
                (line.includes('fetch(') || line.includes('httpRequest('))) {

                changes.push({
                    line: idx + 1,
                    oldCode: line,
                    newCode: line.replace('= ', '= await '),
                    explanation: 'Missing await for async function call',
                });
            }
        });

        if (changes.length > 0) {
            confidence = 0.75;
            reasoning = 'Detected Promise without await. This can cause race conditions.';
        }
    }

    // Pattern 3: Missing try-catch
    if (problem.toLowerCase().includes('error') && problem.toLowerCase().includes('unhandled')) {
        const asyncFuncLineIdx = lines.findIndex(line =>
            line.includes('async ') && line.includes('function')
        );

        if (asyncFuncLineIdx !== -1) {
            // Check if there's a try-catch nearby
            const nextLines = lines.slice(asyncFuncLineIdx, asyncFuncLineIdx + 10);
            const hasTryCatch = nextLines.some(line => line.includes('try {'));

            if (!hasTryCatch) {
                changes.push({
                    line: asyncFuncLineIdx + 2,
                    oldCode: lines[asyncFuncLineIdx + 1],
                    newCode: '        try {\n' + lines[asyncFuncLineIdx + 1],
                    explanation: 'Wrap async function body in try-catch for error handling',
                });

                confidence = 0.70;
                reasoning = 'Async functions should have try-catch for proper error handling.';
            }
        }
    }

    if (changes.length === 0) {
        return null;
    }

    return {
        file,
        changes,
        confidence,
        reasoning,
    };
}

/**
 * Analyze Reference Code (from python-garminconnect, garth, etc.)
 */
async function analyzeReferenceCode(
    problem: string,
    file: string,
    content: string,
    context: any
): Promise<CodeFix | null> {
    const changes: Array<any> = [];

    // If reference is a URL (e.g., GitHub link), extract key patterns
    if (context.referenceCode?.startsWith('http')) {
        // For now, return guidance
        return {
            file,
            changes: [],
            confidence: 0.5,
            reasoning: `Check reference implementation at: ${context.referenceCode}`,
            warnings: ['Manual review of reference code recommended'],
        };
    }

    // If reference is code snippet, try to match patterns
    if (context.referenceCode) {
        // Extract key differences
        const refLines = context.referenceCode.split('\n');

        // Compare with current implementation
        // (simplified - in real implementation, use AST comparison)

        return {
            file,
            changes,
            confidence: 0.6,
            reasoning: 'Compared with reference implementation',
        };
    }

    return null;
}

/**
 * Analyze Contextual Fixes (based on surrounding code and project patterns)
 */
async function analyzeContextualFixes(
    problem: string,
    file: string,
    content: string,
    lines: string[],
    context?: any
): Promise<CodeFix[]> {
    const fixes: CodeFix[] = [];

    // If specific function is mentioned, focus on that
    if (context?.affectedFunction) {
        const funcStartIdx = lines.findIndex(line =>
            line.includes(`function ${context.affectedFunction}`) ||
            line.includes(`${context.affectedFunction}(`) ||
            line.includes(`${context.affectedFunction} =`)
        );

        if (funcStartIdx !== -1) {
            // Analyze function body
            const funcLines = extractFunctionBody(lines, funcStartIdx);

            // Check for common issues in this function
            const issues = detectFunctionIssues(funcLines, funcStartIdx);

            if (issues.length > 0) {
                fixes.push({
                    file,
                    changes: issues,
                    confidence: 0.65,
                    reasoning: `Detected issues in function ${context.affectedFunction}`,
                });
            }
        }
    }

    // Check imports
    if (problem.toLowerCase().includes('import') || problem.toLowerCase().includes('module')) {
        const importIssues = detectImportIssues(lines);

        if (importIssues.length > 0) {
            fixes.push({
                file,
                changes: importIssues,
                confidence: 0.80,
                reasoning: 'Detected import issues',
            });
        }
    }

    return fixes;
}

/**
 * Extract Function Body
 */
function extractFunctionBody(lines: string[], startIdx: number): string[] {
    const funcLines: string[] = [];
    let braceCount = 0;
    let started = false;

    for (let i = startIdx; i < lines.length; i++) {
        const line = lines[i];

        if (line.includes('{')) {
            braceCount += (line.match(/{/g) || []).length;
            started = true;
        }

        if (started) {
            funcLines.push(line);
        }

        if (line.includes('}')) {
            braceCount -= (line.match(/}/g) || []).length;
        }

        if (started && braceCount === 0) {
            break;
        }
    }

    return funcLines;
}

/**
 * Detect Function Issues
 */
function detectFunctionIssues(funcLines: string[], startLineIdx: number): Array<any> {
    const issues: Array<any> = [];

    funcLines.forEach((line, relIdx) => {
        const lineNumber = startLineIdx + relIdx + 1;

        // Check for console.log (should use logger)
        if (line.includes('console.log') || line.includes('console.error')) {
            issues.push({
                line: lineNumber,
                oldCode: line,
                newCode: line.replace('console.', 'await logAuth('),
                explanation: 'Replace console with proper logging',
            });
        }

        // Check for TODO/FIXME comments
        if (line.includes('// TODO') || line.includes('// FIXME')) {
            issues.push({
                line: lineNumber,
                oldCode: line,
                newCode: line, // Keep as is, but flag it
                explanation: 'TODO/FIXME comment found - needs attention',
            });
        }
    });

    return issues;
}

/**
 * Detect Import Issues
 */
function detectImportIssues(lines: string[]): Array<any> {
    const issues: Array<any> = [];

    lines.forEach((line, idx) => {
        if (line.includes('import ') && line.includes(' from ')) {
            // Check for common import issues

            // Missing file extension (.js) for local imports in ESM
            if (line.includes('./') && !line.includes('.js') && !line.includes('.ts')) {
                const match = line.match(/from ['"](.+)['"]/);
                if (match) {
                    issues.push({
                        line: idx + 1,
                        oldCode: line,
                        newCode: line.replace(match[1], match[1] + '.js'),
                        explanation: 'Add .js extension for ESM imports',
                    });
                }
            }
        }
    });

    return issues;
}
