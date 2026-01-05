#!/usr/bin/env node

/**
 * CLI für Autonomous Debug System
 * Direkt nutzbar ohne VS Code Extension
 */

import { debugProblem } from './src/tools/debug-orchestrator.js';
import { analyzeCode } from './src/tools/code-analyzer.js';
import { scanErrors } from './src/tools/error-scanner.js';
import { liveDebug } from './src/tools/live-debugger.js';
import * as readline from 'readline';

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

function question(prompt: string): Promise<string> {
    return new Promise((resolve) => {
        rl.question(prompt, resolve);
    });
}

async function main() {
    console.log('🤖 Autonomous Debug CLI\n');
    console.log('Wähle ein Tool:\n');
    console.log('1. 🤖 Debug Problem (Vollautomatisch)');
    console.log('2. 🔍 Code analysieren');
    console.log('3. 📊 Runtime Errors scannen');
    console.log('4. 🎭 Live Browser Debugging');
    console.log('5. ❌ Beenden\n');

    const choice = await question('Wahl (1-5): ');

    switch (choice.trim()) {
        case '1':
            await runDebugProblem();
            break;
        case '2':
            await runAnalyzeCode();
            break;
        case '3':
            await runScanErrors();
            break;
        case '4':
            await runLiveDebug();
            break;
        case '5':
            console.log('Auf Wiedersehen! 👋');
            rl.close();
            process.exit(0);
            break;
        default:
            console.log('❌ Ungültige Wahl');
            rl.close();
            process.exit(1);
    }

    rl.close();
}

async function runDebugProblem() {
    console.log('\n🤖 Autonomous Debug\n');
    
    const problem = await question('Problem beschreiben: ');
    const feature = await question('Feature (z.B. garmin-auth): ');
    const files = await question('Relevante Dateien (kommagetrennt): ');
    
    console.log('\n⏳ Starte Debug-Loop...\n');

    try {
        const result = await debugProblem({
            problem,
            context: {
                feature: feature || 'unknown',
                symptom: problem,
                files: files ? files.split(',').map(f => f.trim()) : []
            },
            options: {
                maxIterations: 5,
                runTests: true,
                createDocumentation: true,
                useLiveDebug: false
            }
        });

        console.log('\n✅ Debug abgeschlossen!\n');
        console.log(`Status: ${result.finalStatus}`);
        console.log(`Iterationen: ${result.iterations}`);
        console.log(`Fixes: ${result.totalFixes}`);
        console.log(`Confidence: ${result.averageConfidence || 0}%`);
        console.log(`Dokumentation: ${result.documentation}`);
        console.log('\n' + result.summary);

        if (result.allFixes && result.allFixes.length > 0) {
            console.log('\n📝 Angewendete Fixes:');
            result.allFixes.forEach((fix, idx) => {
                console.log(`\n${idx + 1}. ${fix.description}`);
                console.log(`   Datei: ${fix.file}`);
                console.log(`   Confidence: ${fix.confidence}%`);
            });
        }

    } catch (error: any) {
        console.error('\n❌ Fehler:', error.message);
        process.exit(1);
    }
}

async function runAnalyzeCode() {
    console.log('\n🔍 Code-Analyse\n');
    
    const files = await question('Dateien (kommagetrennt): ');
    
    if (!files.trim()) {
        console.log('❌ Keine Dateien angegeben');
        return;
    }

    console.log('\n⏳ Analysiere...\n');

    try {
        const result = await analyzeCode({
            files: files.split(',').map(f => f.trim()),
            checks: ['all']
        });

        console.log(`\n✅ Analyse abgeschlossen!\n`);
        console.log(`Errors: ${result.summary.errorCount}`);
        console.log(`Warnings: ${result.summary.warningCount}`);
        console.log(`Gesamt: ${result.summary.totalIssues} Issues`);

        if (result.errors.length > 0) {
            console.log('\n❌ ERRORS:');
            result.errors.forEach(err => {
                console.log(`  [${err.line}:${err.column}] ${err.message}`);
            });
        }

        if (result.warnings.length > 0) {
            console.log('\n⚠️  WARNINGS:');
            result.warnings.forEach(warn => {
                console.log(`  [${warn.line}:${warn.column}] ${warn.message}`);
            });
        }

    } catch (error: any) {
        console.error('\n❌ Fehler:', error.message);
    }
}

async function runScanErrors() {
    console.log('\n📊 Runtime Error Scanner\n');
    
    const filter = await question('Filter (optional, z.B. "garmin|oauth"): ');
    
    console.log('\n⏳ Scanne Errors...\n');

    try {
        const result = await scanErrors({
            sources: ['all'],
            filter: filter || undefined
        });

        console.log(`\n✅ Scan abgeschlossen!\n`);
        console.log(`Errors gefunden: ${result.errors.length}`);
        console.log(`Patterns: ${result.patterns?.join(', ') || 'Keine'}`);

        if (result.errors.length > 0) {
            console.log('\n📋 Errors:');
            result.errors.slice(0, 10).forEach((err, idx) => {
                console.log(`\n${idx + 1}. ${err.timestamp}`);
                console.log(`   ${err.message}`);
                console.log(`   Source: ${err.source}`);
            });

            if (result.errors.length > 10) {
                console.log(`\n... und ${result.errors.length - 10} weitere`);
            }
        }

    } catch (error: any) {
        console.error('\n❌ Fehler:', error.message);
    }
}

async function runLiveDebug() {
    console.log('\n🎭 Live Browser Debugging\n');
    console.log('⚠️  Dev Server muss auf localhost:5173 laufen!\n');
    
    console.log('Szenarien:');
    console.log('1. garmin-login');
    console.log('2. episode-create');
    console.log('3. sync-test\n');
    
    const scenario = await question('Szenario (1-3): ');
    
    const scenarioMap: Record<string, string> = {
        '1': 'garmin-login',
        '2': 'episode-create',
        '3': 'sync-test'
    };
    
    const selectedScenario = scenarioMap[scenario.trim()];
    
    if (!selectedScenario) {
        console.log('❌ Ungültiges Szenario');
        return;
    }

    console.log('\n⏳ Starte Browser...\n');

    try {
        const result = await liveDebug({
            scenario: selectedScenario as any,
            steps: [],
            capture: ['console', 'network', 'screenshot'],
            headless: false
        });

        console.log(`\n✅ Live Debug abgeschlossen!\n`);
        console.log(`Console Errors: ${result.consoleErrors.length}`);
        console.log(`Network Errors: ${result.networkErrors.length}`);
        
        if (result.screenshots && result.screenshots.length > 0) {
            console.log(`Screenshots: ${result.screenshots.length}`);
            console.log(`Location: ${result.screenshots[0]}`);
        }

    } catch (error: any) {
        console.error('\n❌ Fehler:', error.message);
    }
}

main().catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
});
