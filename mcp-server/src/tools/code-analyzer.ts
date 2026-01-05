/**
 * Code Analyzer Tool
 * Analysiert TypeScript/JavaScript Code auf Fehler, Warnungen und Verbesserungsmöglichkeiten
 */

import { spawn } from 'child_process';
import { readFile } from 'fs/promises';
import { z } from 'zod';
import { join } from 'path';

const AnalyzeCodeArgsSchema = z.object({
    files: z.array(z.string()).optional(),
    checks: z.array(z.enum(['typescript', 'eslint', 'imports', 'async-patterns', 'all'])).default(['all']),
    context: z.string().optional(),
    includeWarnings: z.boolean().default(true),
});

export type AnalyzeCodeArgs = z.infer<typeof AnalyzeCodeArgsSchema>;

export interface CodeIssue {
    file: string;
    line: number;
    column?: number;
    severity: 'error' | 'warning' | 'info';
    message: string;
    rule?: string;
    suggestion?: string;
}

export interface AnalyzeCodeResult {
    success: boolean;
    errors: CodeIssue[];
    warnings: CodeIssue[];
    suggestions: CodeIssue[];
    summary: {
        totalIssues: number;
        errorCount: number;
        warningCount: number;
        suggestionCount: number;
        filesAnalyzed: number;
    };
}

/**
 * Hauptfunktion: Analysiert Code
 */
export async function analyzeCode(args: AnalyzeCodeArgs): Promise<AnalyzeCodeResult> {
    const validated = AnalyzeCodeArgsSchema.parse(args);

    const errors: CodeIssue[] = [];
    const warnings: CodeIssue[] = [];
    const suggestions: CodeIssue[] = [];

    const checks = validated.checks.includes('all')
        ? ['typescript', 'eslint', 'imports', 'async-patterns']
        : validated.checks;

    // TypeScript Check
    if (checks.includes('typescript')) {
        const tsIssues = await runTypeScriptCheck(validated.files);
        categorizeIssues(tsIssues, errors, warnings, suggestions);
    }

    // ESLint Check
    if (checks.includes('eslint')) {
        const eslintIssues = await runESLintCheck(validated.files);
        categorizeIssues(eslintIssues, errors, warnings, suggestions);
    }

    // Import Analysis
    if (checks.includes('imports')) {
        const importIssues = await analyzeImports(validated.files);
        categorizeIssues(importIssues, errors, warnings, suggestions);
    }

    // Async Patterns (common async/await issues)
    if (checks.includes('async-patterns')) {
        const asyncIssues = await analyzeAsyncPatterns(validated.files);
        categorizeIssues(asyncIssues, errors, warnings, suggestions);
    }

    return {
        success: errors.length === 0,
        errors,
        warnings: validated.includeWarnings ? warnings : [],
        suggestions,
        summary: {
            totalIssues: errors.length + warnings.length + suggestions.length,
            errorCount: errors.length,
            warningCount: warnings.length,
            suggestionCount: suggestions.length,
            filesAnalyzed: validated.files?.length || 0,
        },
    };
}

/**
 * TypeScript Compiler Check
 */
async function runTypeScriptCheck(files?: string[]): Promise<CodeIssue[]> {
    const workspaceRoot = '/home/daniel/Desktop/garmin';

    return new Promise((resolve) => {
        const args = ['tsc', '--noEmit', '--pretty', 'false'];

        if (files && files.length > 0) {
            args.push(...files.map(f => join(workspaceRoot, f)));
        }

        const proc = spawn('npx', args, { cwd: workspaceRoot });

        let output = '';
        proc.stdout.on('data', (data) => { output += data.toString(); });
        proc.stderr.on('data', (data) => { output += data.toString(); });

        proc.on('close', () => {
            const issues = parseTSCOutput(output);
            resolve(issues);
        });

        proc.on('error', () => {
            resolve([]);
        });
    });
}

/**
 * ESLint Check
 */
async function runESLintCheck(files?: string[]): Promise<CodeIssue[]> {
    const workspaceRoot = '/home/daniel/Desktop/garmin';

    return new Promise((resolve) => {
        const args = ['eslint', '--format', 'json'];

        if (files && files.length > 0) {
            args.push(...files.map(f => join(workspaceRoot, f)));
        } else {
            args.push('src/**/*.{ts,tsx}');
        }

        const proc = spawn('npx', args, { cwd: workspaceRoot });

        let output = '';
        proc.stdout.on('data', (data) => { output += data.toString(); });

        proc.on('close', () => {
            const issues = parseESLintOutput(output);
            resolve(issues);
        });

        proc.on('error', () => {
            resolve([]);
        });
    });
}

/**
 * Import Analysis (unused imports, circular dependencies)
 */
async function analyzeImports(files?: string[]): Promise<CodeIssue[]> {
    const workspaceRoot = '/home/daniel/Desktop/garmin';
    const issues: CodeIssue[] = [];

    if (!files || files.length === 0) {
        return issues;
    }

    for (const file of files) {
        try {
            const content = await readFile(join(workspaceRoot, file), 'utf-8');
            const lines = content.split('\n');

            // Check for unused imports (simple heuristic)
            lines.forEach((line, idx) => {
                const importMatch = line.match(/import\s+(?:{([^}]+)}|\*\s+as\s+(\w+)|(\w+))\s+from/);
                if (importMatch) {
                    const imported = importMatch[1] || importMatch[2] || importMatch[3];
                    if (imported) {
                        const imports = imported.split(',').map(i => i.trim().split(' as ')[0]);
                        imports.forEach(imp => {
                            // Simple check: is import used in file?
                            const usageRegex = new RegExp(`\\b${imp}\\b`, 'g');
                            const matches = content.match(usageRegex);
                            if (!matches || matches.length <= 1) { // Only import statement itself
                                issues.push({
                                    file,
                                    line: idx + 1,
                                    severity: 'warning',
                                    message: `Import '${imp}' appears to be unused`,
                                    rule: 'unused-import',
                                    suggestion: `Remove unused import '${imp}'`,
                                });
                            }
                        });
                    }
                }
            });
        } catch (error) {
            // Ignore file read errors
        }
    }

    return issues;
}

/**
 * Async Pattern Analysis (missing await, unhandled promises)
 */
async function analyzeAsyncPatterns(files?: string[]): Promise<CodeIssue[]> {
    const workspaceRoot = '/home/daniel/Desktop/garmin';
    const issues: CodeIssue[] = [];

    if (!files || files.length === 0) {
        return issues;
    }

    for (const file of files) {
        try {
            const content = await readFile(join(workspaceRoot, file), 'utf-8');
            const lines = content.split('\n');

            lines.forEach((line, idx) => {
                // Check for async functions without try-catch
                if (line.includes('async ') && line.includes('{')) {
                    const funcStart = idx;
                    let hasTryCatch = false;

                    // Look ahead for try-catch (simple check)
                    for (let i = funcStart; i < Math.min(funcStart + 20, lines.length); i++) {
                        if (lines[i].includes('try {') || lines[i].includes('try{')) {
                            hasTryCatch = true;
                            break;
                        }
                    }

                    if (!hasTryCatch && !line.includes('test(') && !line.includes('it(')) {
                        issues.push({
                            file,
                            line: idx + 1,
                            severity: 'info',
                            message: 'Async function without try-catch block',
                            rule: 'missing-error-handler',
                            suggestion: 'Consider adding try-catch for error handling',
                        });
                    }
                }

                // Check for Promise without await
                if (line.match(/=\s*\w+\([^)]*\)/) &&
                    !line.includes('await ') &&
                    !line.includes('return ') &&
                    !line.includes('.then(') &&
                    !line.includes('.catch(')) {

                    // Heuristic: might be a promise
                    const varName = line.match(/(\w+)\s*=/)?.[1];
                    if (varName && (
                        line.includes('fetch(') ||
                        line.includes('axios.') ||
                        line.includes('http.') ||
                        line.includes('Promise.')
                    )) {
                        issues.push({
                            file,
                            line: idx + 1,
                            severity: 'warning',
                            message: 'Possible unhandled Promise',
                            rule: 'floating-promise',
                            suggestion: 'Add await or .then()/.catch() handler',
                        });
                    }
                }
            });
        } catch (error) {
            // Ignore file read errors
        }
    }

    return issues;
}

/**
 * Parse TypeScript Compiler Output
 */
function parseTSCOutput(output: string): CodeIssue[] {
    const issues: CodeIssue[] = [];
    const lines = output.split('\n');

    lines.forEach(line => {
        // Format: "src/file.ts(123,45): error TS1234: Message"
        const match = line.match(/^(.+?)\((\d+),(\d+)\):\s*(error|warning)\s+TS\d+:\s*(.+)$/);
        if (match) {
            issues.push({
                file: match[1],
                line: parseInt(match[2]),
                column: parseInt(match[3]),
                severity: match[4] as 'error' | 'warning',
                message: match[5],
                rule: 'typescript',
            });
        }
    });

    return issues;
}

/**
 * Parse ESLint JSON Output
 */
function parseESLintOutput(output: string): CodeIssue[] {
    const issues: CodeIssue[] = [];

    try {
        const results = JSON.parse(output);

        results.forEach((result: any) => {
            result.messages?.forEach((msg: any) => {
                issues.push({
                    file: result.filePath,
                    line: msg.line,
                    column: msg.column,
                    severity: msg.severity === 2 ? 'error' : 'warning',
                    message: msg.message,
                    rule: msg.ruleId,
                    suggestion: msg.fix ? 'Auto-fixable' : undefined,
                });
            });
        });
    } catch (error) {
        // Invalid JSON, return empty
    }

    return issues;
}

/**
 * Categorize Issues by Severity
 */
function categorizeIssues(
    issues: CodeIssue[],
    errors: CodeIssue[],
    warnings: CodeIssue[],
    suggestions: CodeIssue[]
) {
    issues.forEach(issue => {
        if (issue.severity === 'error') {
            errors.push(issue);
        } else if (issue.severity === 'warning') {
            warnings.push(issue);
        } else {
            suggestions.push(issue);
        }
    });
}
