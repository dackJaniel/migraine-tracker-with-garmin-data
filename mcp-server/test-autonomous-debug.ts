/**
 * Test Script für Autonomous Debug System
 * Testet alle Debug-Tools einzeln
 */

import { debugProblem } from './src/tools/debug-orchestrator.js';
import { analyzeCode } from './src/tools/code-analyzer.js';
import { scanErrors } from './src/tools/error-scanner.js';
import { liveDebug, DEBUG_SCENARIOS } from './src/tools/live-debugger.js';
import { fixCode } from './src/tools/code-fixer.js';

async function testCodeAnalyzer() {
    console.log('\n🧪 Testing Code Analyzer...');

    const result = await analyzeCode({
        files: ['src/lib/garmin/auth.ts'],
        checks: ['all'],
    });

    console.log(`✅ Found ${result.errors.length} errors, ${result.warnings.length} warnings`);
    console.log(`   Total issues: ${result.summary.totalIssues}`);

    return result.summary.errorCount === 0;
}

async function testErrorScanner() {
    console.log('\n🧪 Testing Error Scanner...');

    const result = await scanErrors({
        sources: ['all'],
        filter: 'garmin|oauth',
    });

    console.log(`✅ Found ${result.errors.length} runtime errors`);
    console.log(`   Patterns: ${result.patterns?.join(', ') || 'None'}`);

    return result.success;
}

async function testLiveDebugger() {
    console.log('\n🧪 Testing Live Debugger...');
    console.log('   Starting dev server at http://localhost:5173...');
    console.log('   ⚠️  Make sure dev server is running!');

    try {
        const result = await liveDebug({
            scenario: 'garmin-login',
            steps: DEBUG_SCENARIOS['garmin-login'] as any,
            capture: ['console', 'screenshot'],
            headless: true,
        });

        console.log(`✅ Scenario completed in ${result.duration}ms`);
        console.log(`   Console errors: ${result.consoleErrors.length}`);
        console.log(`   Screenshot: ${result.screenshot}`);

        return true;
    } catch (error: any) {
        console.log(`❌ Live debug failed: ${error.message}`);
        return false;
    }
}

async function testCodeFixer() {
    console.log('\n🧪 Testing Code Fixer...');

    const result = await fixCode({
        problem: 'OAuth1 signature missing body parameters',
        file: 'src/lib/garmin/auth.ts',
        context: {
            errorMessage: '401 Unauthorized',
            affectedFunction: 'getOAuth1Token',
        },
    });

    console.log(`✅ Generated ${result.fixes.length} fixes`);
    console.log(`   Total changes: ${result.totalChanges}`);

    if (result.fixes.length > 0) {
        console.log(`   Top fix confidence: ${(result.fixes[0].confidence * 100).toFixed(0)}%`);
    }

    return result.success;
}

async function testFullDebugLoop() {
    console.log('\n🧪 Testing Full Debug Loop...');
    console.log('   Problem: "Test authentication flow"');

    const result = await debugProblem({
        problem: 'Test authentication flow',
        context: {
            feature: 'garmin-auth',
            files: ['src/lib/garmin/auth.ts'],
        },
        options: {
            maxIterations: 2,
            runTests: true,
            createDocumentation: true,
            useLiveDebug: false,
        },
    });

    console.log(`✅ Debug completed in ${result.totalIterations} iterations`);
    console.log(`   Status: ${result.finalStatus}`);
    console.log(`   Total fixes: ${result.totalFixes}`);
    console.log(`   Documentation: ${result.documentation}`);

    return result.success;
}

async function runAllTests() {
    console.log('🤖 Autonomous Debug System - Test Suite\n');

    const results = {
        codeAnalyzer: false,
        errorScanner: false,
        liveDebugger: false,
        codeFixer: false,
        fullDebugLoop: false,
    };

    try {
        results.codeAnalyzer = await testCodeAnalyzer();
    } catch (error: any) {
        console.log(`❌ Code Analyzer failed: ${error.message}`);
    }

    try {
        results.errorScanner = await testErrorScanner();
    } catch (error: any) {
        console.log(`❌ Error Scanner failed: ${error.message}`);
    }

    try {
        results.codeFixer = await testCodeFixer();
    } catch (error: any) {
        console.log(`❌ Code Fixer failed: ${error.message}`);
    }

    // Skip live debugger if no dev server
    console.log('\n⏭️  Skipping Live Debugger (requires dev server)');

    try {
        results.fullDebugLoop = await testFullDebugLoop();
    } catch (error: any) {
        console.log(`❌ Full Debug Loop failed: ${error.message}`);
    }

    // Summary
    console.log('\n\n📊 Test Summary:');
    console.log('─'.repeat(40));
    Object.entries(results).forEach(([test, passed]) => {
        console.log(`${passed ? '✅' : '❌'} ${test}`);
    });
    console.log('─'.repeat(40));

    const passedCount = Object.values(results).filter(Boolean).length;
    const totalCount = Object.keys(results).length;

    console.log(`\n${passedCount}/${totalCount} tests passed\n`);

    return passedCount === totalCount;
}

// Run tests
runAllTests()
    .then(success => {
        process.exit(success ? 0 : 1);
    })
    .catch(error => {
        console.error('Fatal error:', error);
        process.exit(1);
    });
