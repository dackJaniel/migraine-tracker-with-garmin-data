/**
 * Test Runner Tool
 * Führt Vitest und Playwright Tests aus
 */

import { spawn } from 'child_process';
import { z } from 'zod';

const RunTestsArgsSchema = z.object({
    type: z.enum(['unit', 'e2e', 'all']).default('all'),
    watch: z.boolean().default(false),
    coverage: z.boolean().default(false),
    file: z.string().optional(),
});

export type RunTestsArgs = z.infer<typeof RunTestsArgsSchema>;

export interface RunTestsResult {
    success: boolean;
    type: string;
    output: string;
    summary?: {
        passed: number;
        failed: number;
        skipped: number;
        total: number;
        duration?: string;
    };
    error?: string;
}

/**
 * Führt Tests aus
 */
export async function runTests(args: RunTestsArgs): Promise<RunTestsResult> {
    const validated = RunTestsArgsSchema.parse(args);

    try {
        if (validated.type === 'unit' || validated.type === 'all') {
            return await runVitestTests(validated);
        } else if (validated.type === 'e2e') {
            return await runPlaywrightTests(validated);
        }

        throw new Error('Invalid test type');
    } catch (error: any) {
        return {
            success: false,
            type: validated.type,
            output: '',
            error: error.message,
        };
    }
}

/**
 * Führt Vitest Tests aus
 */
async function runVitestTests(args: RunTestsArgs): Promise<RunTestsResult> {
    const vitestArgs = ['vitest'];

    if (!args.watch) {
        vitestArgs.push('run');
    }

    if (args.coverage) {
        vitestArgs.push('--coverage');
    }

    if (args.file) {
        vitestArgs.push(args.file);
    }

    const result = await executeCommand('npm', vitestArgs, '/home/daniel/Desktop/garmin');

    return {
        success: result.exitCode === 0,
        type: 'unit',
        output: result.output,
        summary: parseVitestOutput(result.output),
    };
}

/**
 * Führt Playwright Tests aus
 */
async function runPlaywrightTests(args: RunTestsArgs): Promise<RunTestsResult> {
    const playwrightArgs = ['playwright', 'test'];

    if (args.file) {
        playwrightArgs.push(args.file);
    }

    const result = await executeCommand('npx', playwrightArgs, '/home/daniel/Desktop/garmin');

    return {
        success: result.exitCode === 0,
        type: 'e2e',
        output: result.output,
        summary: parsePlaywrightOutput(result.output),
    };
}

/**
 * Führt Shell-Command aus
 */
function executeCommand(
    command: string,
    args: string[],
    cwd: string
): Promise<{ output: string; exitCode: number }> {
    return new Promise((resolve) => {
        const proc = spawn(command, args, {
            cwd,
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
                output: output + '\n\n⚠️ Test timeout after 5 minutes',
                exitCode: 1,
            });
        }, 5 * 60 * 1000);
    });
}

/**
 * Parst Vitest Output
 */
function parseVitestOutput(output: string): RunTestsResult['summary'] {
    const passedMatch = output.match(/(\d+) passed/);
    const failedMatch = output.match(/(\d+) failed/);
    const skippedMatch = output.match(/(\d+) skipped/);
    const durationMatch = output.match(/in (\d+\.?\d*[ms]+)/);

    const passed = passedMatch ? parseInt(passedMatch[1]) : 0;
    const failed = failedMatch ? parseInt(failedMatch[1]) : 0;
    const skipped = skippedMatch ? parseInt(skippedMatch[1]) : 0;

    return {
        passed,
        failed,
        skipped,
        total: passed + failed + skipped,
        duration: durationMatch ? durationMatch[1] : undefined,
    };
}

/**
 * Parst Playwright Output
 */
function parsePlaywrightOutput(output: string): RunTestsResult['summary'] {
    const passedMatch = output.match(/(\d+) passed/);
    const failedMatch = output.match(/(\d+) failed/);
    const skippedMatch = output.match(/(\d+) skipped/);

    const passed = passedMatch ? parseInt(passedMatch[1]) : 0;
    const failed = failedMatch ? parseInt(failedMatch[1]) : 0;
    const skipped = skippedMatch ? parseInt(skippedMatch[1]) : 0;

    return {
        passed,
        failed,
        skipped,
        total: passed + failed + skipped,
    };
}

/**
 * Quick Test Commands
 */
export async function quickTest(preset: 'db' | 'garmin' | 'ui' | 'all'): Promise<RunTestsResult> {
    const fileMap: Record<string, string> = {
        db: 'tests/unit/db.test.ts',
        garmin: 'tests/unit/garmin-client.test.ts',
        ui: 'tests/e2e/dashboard.e2e.test.ts',
    };

    if (preset === 'all') {
        return runTests({ type: 'all', watch: false, coverage: false });
    }

    return runTests({
        type: preset === 'ui' ? 'e2e' : 'unit',
        watch: false,
        coverage: false,
        file: fileMap[preset],
    });
}
