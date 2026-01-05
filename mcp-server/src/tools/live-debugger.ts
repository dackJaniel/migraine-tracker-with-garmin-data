/**
 * Live Debugger Tool
 * Verwendet Playwright für Live-Debugging: App öffnen, Aktionen ausführen, Errors tracken
 */

import { chromium, Browser, Page } from 'playwright';
import { z } from 'zod';
import { writeFile } from 'fs/promises';
import { join } from 'path';

const LiveDebugArgsSchema = z.object({
    scenario: z.string(),
    steps: z.array(z.object({
        action: z.enum(['navigate', 'click', 'fill', 'wait', 'screenshot', 'evaluate']),
        selector: z.string().optional(),
        url: z.string().optional(),
        value: z.string().optional(),
        timeout: z.number().optional(),
        script: z.string().optional(),
    })),
    capture: z.array(z.enum(['console', 'network', 'screenshot', 'trace'])).default(['console', 'network']),
    headless: z.boolean().default(true),
});

export type LiveDebugArgs = z.infer<typeof LiveDebugArgsSchema>;

export interface LiveDebugResult {
    success: boolean;
    scenario: string;
    duration: number; // ms
    screenshot?: string; // path
    consoleErrors: string[];
    consoleWarnings: string[];
    networkRequests: Array<{
        url: string;
        method: string;
        status: number;
        statusText: string;
        response?: string;
    }>;
    trace?: string; // path
    error?: string;
}

/**
 * Hauptfunktion: Live Debugging
 */
export async function liveDebug(args: LiveDebugArgs): Promise<LiveDebugResult> {
    const validated = LiveDebugArgsSchema.parse(args);

    const startTime = Date.now();
    let browser: Browser | null = null;
    let page: Page | null = null;

    const consoleErrors: string[] = [];
    const consoleWarnings: string[] = [];
    const networkRequests: Array<any> = [];

    let screenshotPath: string | undefined;
    let tracePath: string | undefined;

    try {
        // Launch browser
        browser = await chromium.launch({
            headless: validated.headless,
            args: ['--no-sandbox', '--disable-setuid-sandbox'],
        });

        const context = await browser.newContext({
            viewport: { width: 1280, height: 720 },
            recordVideo: validated.capture.includes('trace') ? {
                dir: join('/home/daniel/Desktop/garmin', 'debug-videos'),
                size: { width: 1280, height: 720 },
            } : undefined,
        });

        // Start tracing if requested
        if (validated.capture.includes('trace')) {
            await context.tracing.start({ screenshots: true, snapshots: true });
        }

        page = await context.newPage();

        // Setup console listener
        if (validated.capture.includes('console')) {
            page.on('console', msg => {
                const type = msg.type();
                const text = msg.text();

                if (type === 'error') {
                    consoleErrors.push(text);
                } else if (type === 'warning') {
                    consoleWarnings.push(text);
                }
            });

            page.on('pageerror', error => {
                consoleErrors.push(`PageError: ${error.message}\n${error.stack}`);
            });
        }

        // Setup network listener
        if (validated.capture.includes('network')) {
            page.on('response', async response => {
                const request = response.request();

                try {
                    let responseBody: string | undefined;

                    // Capture response for failed requests
                    if (response.status() >= 400) {
                        try {
                            responseBody = await response.text();
                        } catch {
                            responseBody = '[Binary or too large]';
                        }
                    }

                    networkRequests.push({
                        url: request.url(),
                        method: request.method(),
                        status: response.status(),
                        statusText: response.statusText(),
                        response: responseBody,
                    });
                } catch {
                    // Ignore response handling errors
                }
            });
        }

        // Execute steps
        for (const step of validated.steps) {
            try {
                await executeStep(page, step);
            } catch (error: any) {
                // Continue even if step fails (for debugging purposes)
                consoleErrors.push(`Step failed (${step.action}): ${error.message}`);
            }
        }

        // Take final screenshot if requested
        if (validated.capture.includes('screenshot')) {
            screenshotPath = join('/home/daniel/Desktop/garmin', 'debug-screenshots', `${validated.scenario}-${Date.now()}.png`);
            await page.screenshot({ path: screenshotPath, fullPage: true });
        }

        // Stop tracing if started
        if (validated.capture.includes('trace')) {
            tracePath = join('/home/daniel/Desktop/garmin', 'debug-traces', `${validated.scenario}-${Date.now()}.zip`);
            await context.tracing.stop({ path: tracePath });
        }

        await context.close();

        return {
            success: consoleErrors.length === 0,
            scenario: validated.scenario,
            duration: Date.now() - startTime,
            screenshot: screenshotPath,
            consoleErrors,
            consoleWarnings,
            networkRequests: networkRequests.filter(req => req.status >= 400), // Only failed requests
            trace: tracePath,
        };

    } catch (error: any) {
        return {
            success: false,
            scenario: validated.scenario,
            duration: Date.now() - startTime,
            consoleErrors,
            consoleWarnings,
            networkRequests,
            error: error.message,
        };
    } finally {
        if (browser) {
            await browser.close();
        }
    }
}

/**
 * Execute single step
 */
async function executeStep(page: Page, step: any): Promise<void> {
    switch (step.action) {
        case 'navigate':
            if (!step.url) throw new Error('URL required for navigate action');
            await page.goto(step.url, { waitUntil: 'networkidle' });
            break;

        case 'click':
            if (!step.selector) throw new Error('Selector required for click action');
            await page.click(step.selector, { timeout: step.timeout || 5000 });
            break;

        case 'fill':
            if (!step.selector || !step.value) throw new Error('Selector and value required for fill action');
            await page.fill(step.selector, step.value);
            break;

        case 'wait':
            if (step.selector) {
                await page.waitForSelector(step.selector, { timeout: step.timeout || 5000 });
            } else if (step.timeout) {
                await page.waitForTimeout(step.timeout);
            }
            break;

        case 'screenshot':
            // Screenshot handled separately
            break;

        case 'evaluate':
            if (!step.script) throw new Error('Script required for evaluate action');
            await page.evaluate(step.script);
            break;

        default:
            throw new Error(`Unknown action: ${step.action}`);
    }
}

/**
 * Predefined Scenarios
 */
export const DEBUG_SCENARIOS = {
    'garmin-login': [
        { action: 'navigate', url: 'http://localhost:5173/garmin' },
        { action: 'click', selector: 'button:has-text("Mit Garmin Connect anmelden")' },
        { action: 'wait', timeout: 500 },
        { action: 'fill', selector: '#email', value: 'test@example.com' },
        { action: 'fill', selector: '#password', value: 'password123' },
        { action: 'click', selector: 'button:has-text("Anmelden")' },
        { action: 'wait', timeout: 2000 },
        { action: 'screenshot' },
    ],
    'episode-create': [
        { action: 'navigate', url: 'http://localhost:5173' },
        { action: 'click', selector: '[aria-label="Episode erfassen"]' },
        { action: 'wait', selector: 'form' },
        { action: 'screenshot' },
    ],
    'analytics-view': [
        { action: 'navigate', url: 'http://localhost:5173/analytics' },
        { action: 'wait', timeout: 1000 },
        { action: 'screenshot' },
    ],
} as const;
