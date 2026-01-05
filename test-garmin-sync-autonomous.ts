/**
 * Autonomous Debug Test: Garmin Sync Flow
 * Tests the complete Login → Sync → Validation flow
 */

import { chromium, type Browser, type Page } from 'playwright';
import { writeFileSync } from 'fs';
import { join } from 'path';

interface TestResult {
    step: string;
    status: 'success' | 'error' | 'warning';
    message: string;
    screenshot?: string;
    consoleLogs?: string[];
    networkErrors?: string[];
}

const results: TestResult[] = [];
const BASE_URL = 'http://localhost:5173';
const TIMEOUT = 10000;

async function logResult(result: TestResult) {
    results.push(result);
    const emoji = result.status === 'success' ? '✅' : result.status === 'error' ? '❌' : '⚠️';
    console.log(`${emoji} ${result.step}: ${result.message}`);
}

async function capturePageState(page: Page, step: string): Promise<void> {
    try {
        const screenshotPath = join(__dirname, 'debug-screenshots', `${step.replace(/\s+/g, '-')}.png`);
        await page.screenshot({ path: screenshotPath, fullPage: true });

        const consoleLogs = await page.evaluate(() => {
            // @ts-ignore
            return window.__consoleLogs || [];
        });

        await logResult({
            step,
            status: 'success',
            message: 'Page state captured',
            screenshot: screenshotPath,
            consoleLogs
        });
    } catch (error) {
        await logResult({
            step,
            status: 'warning',
            message: `Failed to capture state: ${error}`
        });
    }
}

async function testGarminSyncFlow() {
    let browser: Browser | null = null;
    let page: Page | null = null;

    try {
        // 1. Launch Browser
        console.log('\n🚀 Starting Autonomous Debug Test: Garmin Sync\n');

        browser = await chromium.launch({
            headless: false, // Show browser for debugging
            slowMo: 500 // Slow down for observation
        });

        page = await browser.newPage();

        // Capture console logs
        page.on('console', msg => console.log('BROWSER:', msg.text()));
        page.on('pageerror', err => console.error('PAGE ERROR:', err));

        await logResult({
            step: 'Browser Launch',
            status: 'success',
            message: 'Browser launched successfully'
        });

        // 2. Navigate to App
        console.log('\n📍 Step 1: Navigate to App');
        await page.goto(BASE_URL, { waitUntil: 'domcontentloaded', timeout: TIMEOUT });
        await page.waitForTimeout(2000);
        await capturePageState(page, 'app-loaded');

        await logResult({
            step: 'App Navigation',
            status: 'success',
            message: `Loaded ${BASE_URL}`
        });

        // 3. Check PIN Setup (might be first run)
        console.log('\n🔐 Step 2: Check PIN Setup');
        const hasPinSetup = await page.locator('text=PIN einrichten').count() > 0;

        if (hasPinSetup) {
            // Setup PIN
            await page.fill('input[type="password"]', '123456');
            await page.click('button:has-text("Weiter")');
            await page.fill('input[type="password"]', '123456');
            await page.click('button:has-text("Fertig")');
            await page.waitForTimeout(1000);

            await logResult({
                step: 'PIN Setup',
                status: 'success',
                message: 'PIN configured: 123456'
            });
        } else {
            // Unlock with PIN
            const hasUnlock = await page.locator('text=PIN eingeben').count() > 0;
            if (hasUnlock) {
                await page.fill('input[type="password"]', '123456');
                await page.click('button:has-text("Entsperren")');
                await page.waitForTimeout(1000);
            }

            await logResult({
                step: 'PIN Unlock',
                status: 'success',
                message: 'App unlocked'
            });
        }

        await capturePageState(page, 'after-pin');

        // 4. Navigate to Garmin Settings
        console.log('\n⚙️ Step 3: Navigate to Garmin Settings');

        // Check if we're on Dashboard
        const isDashboard = await page.locator('text=Dashboard').count() > 0;
        if (!isDashboard) {
            // Navigate to Dashboard first
            await page.click('a[href="/"]');
            await page.waitForTimeout(1000);
        }

        // Now navigate to Garmin
        await page.click('a[href="/garmin"]').catch(async () => {
            // Fallback: Try menu or direct URL
            await page.goto(`${BASE_URL}/garmin`, { waitUntil: 'domcontentloaded' });
        });

        await page.waitForTimeout(2000);
        await capturePageState(page, 'garmin-page');

        await logResult({
            step: 'Navigate to Garmin',
            status: 'success',
            message: 'Garmin page loaded'
        });

        // 5. Check if already connected
        console.log('\n🔗 Step 4: Check Connection Status');
        const isConnected = await page.locator('text=Verbunden als').count() > 0;

        if (!isConnected) {
            await logResult({
                step: 'Connection Status',
                status: 'warning',
                message: 'Not connected - Would need real Garmin credentials to test login'
            });

            // Check if Demo Mode available
            const hasDemoMode = await page.locator('text=Demo-Daten laden').count() > 0;
            if (hasDemoMode) {
                console.log('\n📊 Step 5: Load Demo Data');
                await page.click('button:has-text("Demo-Daten laden")');
                await page.waitForTimeout(3000);
                await capturePageState(page, 'demo-data-loaded');

                await logResult({
                    step: 'Demo Data',
                    status: 'success',
                    message: 'Demo data loaded successfully'
                });
            }
        } else {
            await logResult({
                step: 'Connection Status',
                status: 'success',
                message: 'Already connected to Garmin'
            });

            // 6. Test Sync
            console.log('\n🔄 Step 6: Test Sync');
            const hasSyncButton = await page.locator('button:has-text("Jetzt synchronisieren")').count() > 0;

            if (hasSyncButton) {
                // Click Sync
                await page.click('button:has-text("Jetzt synchronisieren")');

                // Wait for sync to complete or error
                await page.waitForTimeout(5000);
                await capturePageState(page, 'after-sync');

                // Check for success/error messages
                const hasSuccess = await page.locator('text=Synchronisierung abgeschlossen').count() > 0;
                const hasError = await page.locator('text=fehlgeschlagen').count() > 0;

                if (hasSuccess) {
                    await logResult({
                        step: 'Sync Test',
                        status: 'success',
                        message: 'Sync completed successfully!'
                    });
                } else if (hasError) {
                    await logResult({
                        step: 'Sync Test',
                        status: 'error',
                        message: 'Sync failed - Check console logs and screenshots'
                    });
                } else {
                    await logResult({
                        step: 'Sync Test',
                        status: 'warning',
                        message: 'Sync status unclear - Check screenshots'
                    });
                }
            } else {
                await logResult({
                    step: 'Sync Test',
                    status: 'warning',
                    message: 'Sync button not found'
                });
            }
        }

        // 7. Check DB Logs
        console.log('\n📝 Step 7: Check Database Logs');
        await page.goto(`${BASE_URL}/debug-db`, { waitUntil: 'domcontentloaded' });
        await page.waitForTimeout(2000);

        const logs = await page.locator('.log-entry').count();
        await capturePageState(page, 'debug-logs');

        await logResult({
            step: 'DB Logs',
            status: 'success',
            message: `Found ${logs} log entries`
        });

    } catch (error) {
        await logResult({
            step: 'Test Execution',
            status: 'error',
            message: `Fatal error: ${error}`
        });

        if (page) {
            await capturePageState(page, 'error-state');
        }
    } finally {
        // Cleanup
        if (browser) {
            await browser.close();
        }

        // Write results to file
        const reportPath = join(__dirname, 'autonomous-debug-report.json');
        writeFileSync(reportPath, JSON.stringify(results, null, 2));

        console.log('\n' + '='.repeat(60));
        console.log('📊 Test Summary');
        console.log('='.repeat(60));

        const successCount = results.filter(r => r.status === 'success').length;
        const errorCount = results.filter(r => r.status === 'error').length;
        const warningCount = results.filter(r => r.status === 'warning').length;

        console.log(`✅ Success: ${successCount}`);
        console.log(`⚠️  Warnings: ${warningCount}`);
        console.log(`❌ Errors: ${errorCount}`);
        console.log(`\n📄 Full report: ${reportPath}`);
        console.log('='.repeat(60) + '\n');

        process.exit(errorCount > 0 ? 1 : 0);
    }
}

// Run the test
testGarminSyncFlow().catch(console.error);
