/**
 * Coverage Tool
 * Gibt Test Coverage Reports aus
 */

import { spawn } from 'child_process';
import { z } from 'zod';

const CoverageArgsSchema = z.object({
    format: z.enum(['summary', 'detailed', 'html', 'json']).default('summary'),
    threshold: z.number().min(0).max(100).optional(),
});

export type CoverageArgs = z.infer<typeof CoverageArgsSchema>;

export interface CoverageResult {
    success: boolean;
    coverage: {
        lines: number;
        statements: number;
        functions: number;
        branches: number;
    };
    output: string;
    meetsThreshold?: boolean;
    htmlPath?: string;
}

/**
 * Führt Coverage-Analyse aus
 */
export async function checkCoverage(args: CoverageArgs): Promise<CoverageResult> {
    const validated = CoverageArgsSchema.parse(args);

    try {
        // Führe Vitest mit Coverage aus
        const result = await executeCoverage(validated.format);

        // Parse Coverage Output
        const coverage = parseCoverageOutput(result.output);

        // Check Threshold
        let meetsThreshold = undefined;
        if (validated.threshold !== undefined) {
            const avgCoverage = (
                coverage.lines +
                coverage.statements +
                coverage.functions +
                coverage.branches
            ) / 4;

            meetsThreshold = avgCoverage >= validated.threshold;
        }

        return {
            success: result.exitCode === 0,
            coverage,
            output: result.output,
            meetsThreshold,
            htmlPath: validated.format === 'html' ? '/home/daniel/Desktop/garmin/coverage/index.html' : undefined,
        };
    } catch (error: any) {
        return {
            success: false,
            coverage: {
                lines: 0,
                statements: 0,
                functions: 0,
                branches: 0,
            },
            output: error.message,
        };
    }
}

/**
 * Führt Coverage Command aus
 */
function executeCoverage(format: string): Promise<{ output: string; exitCode: number }> {
    return new Promise((resolve) => {
        const args = ['vitest', 'run', '--coverage'];

        if (format === 'json') {
            args.push('--coverage.reporter=json');
        } else if (format === 'html') {
            args.push('--coverage.reporter=html');
        }

        const proc = spawn('npm', args, {
            cwd: '/home/daniel/Desktop/garmin',
            shell: true,
        });

        let output = '';

        proc.stdout?.on('data', (data) => {
            output += data.toString();
        });

        proc.stderr?.on('data', (data) => {
            output += data.toString();
        });

        proc.on('close', (code) => {
            resolve({
                output,
                exitCode: code || 0,
            });
        });

        // Timeout nach 5 Minuten
        setTimeout(() => {
            proc.kill();
            resolve({
                output: output + '\n\n⚠️ Coverage timeout after 5 minutes',
                exitCode: 1,
            });
        }, 5 * 60 * 1000);
    });
}

/**
 * Parst Coverage Output
 */
function parseCoverageOutput(output: string): CoverageResult['coverage'] {
    // Regex für Vitest Coverage Output
    const linesMatch = output.match(/Lines\s+:\s+(\d+\.?\d*)%/i);
    const statementsMatch = output.match(/Statements\s+:\s+(\d+\.?\d*)%/i);
    const functionsMatch = output.match(/Functions\s+:\s+(\d+\.?\d*)%/i);
    const branchesMatch = output.match(/Branches\s+:\s+(\d+\.?\d*)%/i);

    return {
        lines: linesMatch ? parseFloat(linesMatch[1]) : 0,
        statements: statementsMatch ? parseFloat(statementsMatch[1]) : 0,
        functions: functionsMatch ? parseFloat(functionsMatch[1]) : 0,
        branches: branchesMatch ? parseFloat(branchesMatch[1]) : 0,
    };
}

/**
 * Gibt Coverage Summary aus
 */
export async function getCoverageSummary(): Promise<string> {
    const result = await checkCoverage({ format: 'summary' });

    if (!result.success) {
        return '❌ Coverage check failed:\n' + result.output;
    }

    const { coverage } = result;
    const avg = (coverage.lines + coverage.statements + coverage.functions + coverage.branches) / 4;

    return `
📊 Test Coverage Summary

Lines:      ${coverage.lines.toFixed(2)}% ${getEmoji(coverage.lines)}
Statements: ${coverage.statements.toFixed(2)}% ${getEmoji(coverage.statements)}
Functions:  ${coverage.functions.toFixed(2)}% ${getEmoji(coverage.functions)}
Branches:   ${coverage.branches.toFixed(2)}% ${getEmoji(coverage.branches)}

Average:    ${avg.toFixed(2)}% ${getEmoji(avg)}

Target: 80%+ for Services/Utils
  `.trim();
}

/**
 * Gibt Emoji basierend auf Coverage zurück
 */
function getEmoji(percentage: number): string {
    if (percentage >= 80) return '✅';
    if (percentage >= 60) return '⚠️';
    return '❌';
}

/**
 * Checkt ob Coverage Threshold erreicht ist
 */
export async function checkCoverageThreshold(threshold: number = 80): Promise<boolean> {
    const result = await checkCoverage({ format: 'summary', threshold });
    return result.meetsThreshold || false;
}

/**
 * Gibt File-spezifische Coverage aus
 */
export async function getFileCoverage(pattern?: string): Promise<string> {
    const result = await checkCoverage({ format: 'detailed' });

    if (!result.success) {
        return '❌ Coverage check failed';
    }

    // Filter Output für spezifisches Pattern
    if (pattern) {
        const lines = result.output.split('\n');
        const filtered = lines.filter(line => line.includes(pattern));
        return filtered.join('\n');
    }

    return result.output;
}
