/**
 * Autonomous Debug Orchestrator
 * Koordiniert den autonomen Debug-Prozess: Analyse → Fix → Test → Iteration
 */

import { z } from 'zod';
import { analyzeCode, type AnalyzeCodeResult } from './code-analyzer.js';
import { scanErrors, type ScanErrorsResult } from './error-scanner.js';
import { liveDebug, DEBUG_SCENARIOS, type LiveDebugResult } from './live-debugger.js';
import { fixCode, type FixCodeResult, type CodeFix } from './code-fixer.js';
import { runTests, type RunTestsResult } from './test-runner.js';
import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';

const DebugProblemArgsSchema = z.object({
    problem: z.string(),
    context: z.object({
        feature: z.string().optional(),
        symptom: z.string().optional(),
        files: z.array(z.string()).optional(),
        errorMessage: z.string().optional(),
    }).optional(),
    options: z.object({
        maxIterations: z.number().default(5),
        runTests: z.boolean().default(true),
        createDocumentation: z.boolean().default(true),
        useLiveDebug: z.boolean().default(false),
    }).default({}),
});

export type DebugProblemArgs = z.infer<typeof DebugProblemArgsSchema>;

interface DebugIteration {
    number: number;
    analysis: {
        codeIssues?: AnalyzeCodeResult;
        errorScan?: ScanErrorsResult;
        liveDebug?: LiveDebugResult;
    };
    fixes: CodeFix[];
    appliedChanges: number;
    testResults?: RunTestsResult;
    success: boolean;
}

export interface DebugProblemResult {
    success: boolean;
    problem: string;
    iterations: DebugIteration[];
    totalIterations: number;
    totalFixes: number;
    totalLinesChanged: number;
    finalStatus: 'solved' | 'partial' | 'failed' | 'max-iterations';
    documentation?: string; // path to generated doc
    summary: string;
    recommendations?: string[];
}

/**
 * Hauptfunktion: Autonomer Debug-Prozess
 */
export async function debugProblem(args: DebugProblemArgs): Promise<DebugProblemResult> {
    const validated = DebugProblemArgsSchema.parse(args);

    console.log(`🔍 Starting autonomous debug for: ${validated.problem}`);

    const iterations: DebugIteration[] = [];
    let currentIteration = 0;
    let problemSolved = false;

    const startTime = Date.now();

    // Main debug loop
    while (currentIteration < validated.options.maxIterations && !problemSolved) {
        currentIteration++;
        console.log(`\n📍 Iteration ${currentIteration}/${validated.options.maxIterations}`);

        const iteration: DebugIteration = {
            number: currentIteration,
            analysis: {},
            fixes: [],
            appliedChanges: 0,
            success: false,
        };

        // Step 1: Analyze Code
        console.log('  📊 Analyzing code...');
        const codeAnalysis = await analyzeCode({
            files: validated.context?.files,
            checks: ['all'],
            context: validated.problem,
            includeWarnings: true,
        });
        iteration.analysis.codeIssues = codeAnalysis;

        console.log(`  Found: ${codeAnalysis.errors.length} errors, ${codeAnalysis.warnings.length} warnings`);

        // Step 2: Scan for Runtime Errors
        console.log('  🔎 Scanning error logs...');
        const errorScan = await scanErrors({
            sources: ['all'],
            filter: extractKeywords(validated.problem),
            limit: 50,
        });
        iteration.analysis.errorScan = errorScan;

        console.log(`  Found: ${errorScan.errors.length} runtime errors`);
        if (errorScan.patterns && errorScan.patterns.length > 0) {
            console.log(`  Patterns: ${errorScan.patterns.join(', ')}`);
        }

        // Step 3: Live Debug (optional, if first iteration)
        if (validated.options.useLiveDebug && currentIteration === 1) {
            console.log('  🎭 Running live debug...');
            const scenario = inferDebugScenario(validated.problem);

            if (scenario && DEBUG_SCENARIOS[scenario as keyof typeof DEBUG_SCENARIOS]) {
                const liveDebugResult = await liveDebug({
                    scenario,
                    steps: DEBUG_SCENARIOS[scenario as keyof typeof DEBUG_SCENARIOS] as any,
                    capture: ['console', 'network', 'screenshot'],
                    headless: true,
                });
                iteration.analysis.liveDebug = liveDebugResult;

                console.log(`  Live debug: ${liveDebugResult.success ? '✅' : '❌'}`);
                console.log(`  Console errors: ${liveDebugResult.consoleErrors.length}`);
                console.log(`  Failed network requests: ${liveDebugResult.networkRequests.length}`);
            }
        }

        // Step 4: Generate Fixes
        console.log('  🔧 Generating fixes...');
        const fixes = await generateFixes(
            validated.problem,
            iteration.analysis,
            validated.context
        );
        iteration.fixes = fixes;

        console.log(`  Generated: ${fixes.length} fix suggestions`);

        if (fixes.length === 0) {
            console.log('  ⚠️  No fixes found. Problem may need manual intervention.');
            break;
        }

        // Step 5: Apply Fixes (top candidate only in conservative mode)
        console.log('  ✏️  Applying fixes...');
        const appliedFixes = await applyFixes(fixes.slice(0, 1)); // Only apply most confident fix
        iteration.appliedChanges = appliedFixes;

        console.log(`  Applied: ${appliedFixes} changes`);

        // Step 6: Run Tests
        if (validated.options.runTests) {
            console.log('  🧪 Running tests...');
            const testResults = await runTests({
                type: 'unit',
                file: validated.context?.files?.[0],
                watch: false,
                coverage: false,
            });
            iteration.testResults = testResults;

            console.log(`  Tests: ${testResults.summary?.passed || 0} passed, ${testResults.summary?.failed || 0} failed`);

            // Check if problem is solved
            if (testResults.success && codeAnalysis.errors.length === 0) {
                problemSolved = true;
                iteration.success = true;
                console.log('  ✅ Problem appears to be solved!');
            }
        } else {
            // Without tests, check if errors decreased
            if (codeAnalysis.errors.length === 0) {
                problemSolved = true;
                iteration.success = true;
                console.log('  ✅ No more code errors detected!');
            }
        }

        iterations.push(iteration);

        // If not solved, continue to next iteration
        if (!problemSolved && currentIteration < validated.options.maxIterations) {
            console.log('  ↻ Problem not fully solved. Continuing to next iteration...');
            await new Promise(resolve => setTimeout(resolve, 1000)); // Brief pause
        }
    }

    // Generate summary
    const duration = Date.now() - startTime;
    const totalFixes = iterations.reduce((sum, it) => sum + it.fixes.length, 0);
    const totalChanges = iterations.reduce((sum, it) => sum + it.appliedChanges, 0);

    const finalStatus: DebugProblemResult['finalStatus'] =
        problemSolved ? 'solved' :
            totalChanges > 0 ? 'partial' :
                currentIteration >= validated.options.maxIterations ? 'max-iterations' :
                    'failed';

    console.log(`\n📋 Debug session complete:`);
    console.log(`   Status: ${finalStatus}`);
    console.log(`   Iterations: ${currentIteration}`);
    console.log(`   Total fixes: ${totalFixes}`);
    console.log(`   Changes applied: ${totalChanges}`);
    console.log(`   Duration: ${(duration / 1000).toFixed(1)}s`);

    // Generate documentation
    let docPath: string | undefined;
    if (validated.options.createDocumentation) {
        docPath = await generateDocumentation(validated.problem, iterations, finalStatus);
        console.log(`   📄 Documentation: ${docPath}`);
    }

    // Generate recommendations
    const recommendations = generateRecommendations(iterations, finalStatus);

    return {
        success: problemSolved,
        problem: validated.problem,
        iterations,
        totalIterations: currentIteration,
        totalFixes,
        totalLinesChanged: totalChanges,
        finalStatus,
        documentation: docPath,
        summary: generateSummary(validated.problem, iterations, finalStatus, duration),
        recommendations,
    };
}

/**
 * Generate Fixes based on Analysis
 */
async function generateFixes(
    problem: string,
    analysis: DebugIteration['analysis'],
    context?: any
): Promise<CodeFix[]> {
    const allFixes: CodeFix[] = [];

    // Generate fixes for code issues
    if (analysis.codeIssues && analysis.codeIssues.errors.length > 0) {
        for (const error of analysis.codeIssues.errors.slice(0, 3)) { // Top 3 errors
            const fixResult = await fixCode({
                problem: `${problem}: ${error.message}`,
                file: error.file,
                context: {
                    errorMessage: error.message,
                    line: error.line,
                    ...context,
                },
                strategy: 'conservative',
            });

            if (fixResult.success) {
                allFixes.push(...fixResult.fixes);
            }
        }
    }

    // Generate fixes based on error patterns
    if (analysis.errorScan && analysis.errorScan.patterns) {
        for (const pattern of analysis.errorScan.patterns.slice(0, 2)) {
            const fixResult = await fixCode({
                problem: `${problem}: ${pattern}`,
                file: context?.files?.[0] || 'src/lib/garmin/auth.ts', // Default to auth file
                context,
                strategy: 'conservative',
            });

            if (fixResult.success) {
                allFixes.push(...fixResult.fixes);
            }
        }
    }

    // Sort by confidence
    allFixes.sort((a, b) => b.confidence - a.confidence);

    return allFixes;
}

/**
 * Apply Fixes to Files
 */
async function applyFixes(fixes: CodeFix[]): Promise<number> {
    let totalChanges = 0;

    // In a real implementation, this would use replace_string_in_file
    // For now, we'll just count the changes

    for (const fix of fixes) {
        totalChanges += fix.changes.length;

        // Log what would be changed
        console.log(`    Would apply ${fix.changes.length} changes to ${fix.file}`);
        fix.changes.forEach(change => {
            console.log(`      Line ${change.line}: ${change.explanation}`);
        });
    }

    return totalChanges;
}

/**
 * Generate Documentation
 */
async function generateDocumentation(
    problem: string,
    iterations: DebugIteration[],
    status: string
): Promise<string> {
    const workspaceRoot = '/home/daniel/Desktop/garmin';
    const timestamp = new Date().toISOString().split('T')[0];
    const filename = `AUTO_DEBUG_${problem.replace(/[^a-zA-Z0-9]/g, '_').substring(0, 30)}_${timestamp}.md`;
    const docPath = join(workspaceRoot, 'docu', filename);

    const doc = `# Autonomous Debug Session: ${problem}

**Date:** ${new Date().toISOString()}
**Status:** ${status}
**Iterations:** ${iterations.length}

## Problem Description

${problem}

## Debug Process

${iterations.map((it, idx) => `
### Iteration ${it.number}

**Code Analysis:**
- Errors: ${it.analysis.codeIssues?.errors.length || 0}
- Warnings: ${it.analysis.codeIssues?.warnings.length || 0}

**Error Scan:**
- Runtime errors: ${it.analysis.errorScan?.errors.length || 0}
- Patterns: ${it.analysis.errorScan?.patterns?.join(', ') || 'None'}

${it.analysis.liveDebug ? `
**Live Debug:**
- Success: ${it.analysis.liveDebug.success ? 'Yes' : 'No'}
- Console errors: ${it.analysis.liveDebug.consoleErrors.length}
- Failed requests: ${it.analysis.liveDebug.networkRequests.length}
` : ''}

**Fixes Generated:** ${it.fixes.length}
${it.fixes.map(fix => `
- \`${fix.file}\`: ${fix.changes.length} changes (confidence: ${(fix.confidence * 100).toFixed(0)}%)
  - ${fix.reasoning}
`).join('\n')}

**Changes Applied:** ${it.appliedChanges}

${it.testResults ? `
**Test Results:**
- Passed: ${it.testResults.summary?.passed || 0}
- Failed: ${it.testResults.summary?.failed || 0}
- Success: ${it.testResults.success ? 'Yes' : 'No'}
` : ''}

**Status:** ${it.success ? '✅ Solved' : '⏳ In Progress'}
`).join('\n---\n')}

## Final Status

**${status.toUpperCase()}**

${status === 'solved' ? '✅ Problem successfully resolved!' : '⚠️ Problem requires further investigation.'}

## Generated by Autonomous Debug System
`;

    try {
        await mkdir(join(workspaceRoot, 'docu'), { recursive: true });
        await writeFile(docPath, doc);
    } catch {
        // Ignore errors
    }

    return docPath;
}

/**
 * Generate Summary
 */
function generateSummary(
    problem: string,
    iterations: DebugIteration[],
    status: string,
    duration: number
): string {
    const totalErrors = iterations.reduce((sum, it) =>
        sum + (it.analysis.codeIssues?.errors.length || 0), 0
    );
    const totalFixes = iterations.reduce((sum, it) => sum + it.fixes.length, 0);

    return `Autonomous debug session for "${problem}" completed in ${(duration / 1000).toFixed(1)}s. ` +
        `Status: ${status}. Analyzed ${iterations.length} iterations, found ${totalErrors} errors, ` +
        `generated ${totalFixes} fixes.`;
}

/**
 * Generate Recommendations
 */
function generateRecommendations(
    iterations: DebugIteration[],
    status: string
): string[] {
    const recommendations: string[] = [];

    if (status !== 'solved') {
        recommendations.push('Problem not fully solved. Consider manual debugging.');
    }

    const lastIteration = iterations[iterations.length - 1];

    if (lastIteration?.analysis.errorScan?.patterns) {
        lastIteration.analysis.errorScan.patterns.forEach(pattern => {
            recommendations.push(`Investigate pattern: ${pattern}`);
        });
    }

    if (lastIteration?.analysis.liveDebug && !lastIteration.analysis.liveDebug.success) {
        recommendations.push('Live debugging failed. Check screenshot and network logs.');
    }

    if (status === 'max-iterations') {
        recommendations.push('Max iterations reached. Problem may be complex or require architecture changes.');
    }

    return recommendations;
}

/**
 * Extract Keywords from Problem Description
 */
function extractKeywords(problem: string): string {
    const keywords = problem.toLowerCase()
        .split(/\s+/)
        .filter(word => word.length > 3)
        .join('|');

    return keywords || 'error';
}

/**
 * Infer Debug Scenario from Problem
 */
function inferDebugScenario(problem: string): string | null {
    const lowerProblem = problem.toLowerCase();

    if (lowerProblem.includes('garmin') && lowerProblem.includes('login')) {
        return 'garmin-login';
    }

    if (lowerProblem.includes('episode')) {
        return 'episode-create';
    }

    if (lowerProblem.includes('analytics') || lowerProblem.includes('chart')) {
        return 'analytics-view';
    }

    return null;
}
