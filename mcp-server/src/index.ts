#!/usr/bin/env node

/**
 * MCP Server Entry Point
 * Model Context Protocol Server für Migraine Tracker Testing Tools
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
    CallToolRequestSchema,
    ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';

import {
    inspectDatabase,
    getDbSchema,
    getDbStats,
} from './tools/db-inspector.js';
import {
    seedDatabase,
    quickSeed,
} from './tools/db-seed.js';
import {
    clearDatabase,
    resetDatabase,
    clearLogs,
    clearOldData,
} from './tools/db-clear.js';
import {
    runTests,
    quickTest,
} from './tools/test-runner.js';
import {
    checkCoverage,
    getCoverageSummary,
    checkCoverageThreshold,
    getFileCoverage,
} from './tools/coverage.js';
import {
    startMockServer,
    GarminApiMockServer,
} from './mocks/garmin-api-mock.js';
import {
    debugProblem,
} from './tools/debug-orchestrator.js';
import {
    analyzeCode,
} from './tools/code-analyzer.js';
import {
    scanErrors,
} from './tools/error-scanner.js';
import {
    liveDebug,
} from './tools/live-debugger.js';
import {
    fixCode,
} from './tools/code-fixer.js';

// Global Mock Server Instance
let mockServerInstance: GarminApiMockServer | null = null;

/**
 * Erstelle MCP Server
 */
const server = new Server(
    {
        name: 'migraine-tracker-tools',
        version: '1.0.0',
    },
    {
        capabilities: {
            tools: {},
        },
    }
);

/**
 * Tool Definitions
 */
server.setRequestHandler(ListToolsRequestSchema, async () => {
    return {
        tools: [
            // DB Inspector Tools
            {
                name: 'db-inspect',
                description: 'Inspiziert IndexedDB Daten der Migraine Tracker App. Gibt ein Browser-Script zurück, das im DevTools ausgeführt werden muss.',
                inputSchema: {
                    type: 'object',
                    properties: {
                        database: {
                            type: 'string',
                            description: 'Database name (default: MigraineDB)',
                            default: 'MigraineDB',
                        },
                        table: {
                            type: 'string',
                            enum: ['episodes', 'garminData', 'logs', 'settings', 'archivedEpisodes', 'all'],
                            description: 'Tabelle zum Inspizieren (optional, default: all)',
                        },
                        limit: {
                            type: 'number',
                            description: 'Anzahl der Einträge (optional)',
                        },
                    },
                },
            },
            {
                name: 'db-schema',
                description: 'Gibt das Datenbank-Schema zurück',
                inputSchema: {
                    type: 'object',
                    properties: {},
                },
            },
            {
                name: 'db-stats',
                description: 'Gibt Statistiken über die Datenbank zurück',
                inputSchema: {
                    type: 'object',
                    properties: {},
                },
            },

            // DB Seed Tools
            {
                name: 'db-seed',
                description: 'Generiert Test-Daten für die Migraine Tracker DB. Gibt ein Browser-Script zurück zum Einfügen der Daten.',
                inputSchema: {
                    type: 'object',
                    properties: {
                        type: {
                            type: 'string',
                            enum: ['episodes', 'garmin', 'both', 'full'],
                            description: 'Datentyp zum Generieren',
                            default: 'both',
                        },
                        count: {
                            type: 'number',
                            description: 'Anzahl der zu generierenden Einträge',
                        },
                        preset: {
                            type: 'string',
                            enum: ['minimal', 'realistic', 'extensive'],
                            description: 'Preset-Konfiguration',
                        },
                    },
                },
            },
            {
                name: 'db-quick-seed',
                description: 'Quick Seed mit Presets: demo, test, stress-test',
                inputSchema: {
                    type: 'object',
                    properties: {
                        preset: {
                            type: 'string',
                            enum: ['demo', 'test', 'stress-test'],
                            description: 'Preset',
                        },
                    },
                    required: ['preset'],
                },
            },

            // DB Clear Tools
            {
                name: 'db-clear',
                description: 'Löscht Daten aus der Datenbank. VORSICHT: Unwiderruflich!',
                inputSchema: {
                    type: 'object',
                    properties: {
                        tables: {
                            type: 'array',
                            items: {
                                type: 'string',
                                enum: ['episodes', 'garminData', 'logs', 'settings', 'archivedEpisodes', 'all'],
                            },
                            description: 'Tabellen zum Löschen',
                        },
                        confirm: {
                            type: 'boolean',
                            description: 'Bestätigung erforderlich (muss true sein)',
                            default: false,
                        },
                    },
                    required: ['confirm'],
                },
            },
            {
                name: 'db-reset',
                description: 'Reset der Datenbank (soft: nur User-Daten, hard: alles)',
                inputSchema: {
                    type: 'object',
                    properties: {
                        type: {
                            type: 'string',
                            enum: ['soft', 'hard'],
                            description: 'Reset-Typ',
                        },
                    },
                    required: ['type'],
                },
            },
            {
                name: 'db-clear-logs',
                description: 'Löscht nur die Log-Einträge',
                inputSchema: {
                    type: 'object',
                    properties: {},
                },
            },
            {
                name: 'db-clear-old',
                description: 'Löscht alte Daten (älter als X Tage)',
                inputSchema: {
                    type: 'object',
                    properties: {
                        daysOld: {
                            type: 'number',
                            description: 'Tage alt (default: 30)',
                            default: 30,
                        },
                    },
                },
            },

            // Test Runner Tools
            {
                name: 'run-tests',
                description: 'Führt Tests aus (Vitest/Playwright)',
                inputSchema: {
                    type: 'object',
                    properties: {
                        type: {
                            type: 'string',
                            enum: ['unit', 'e2e', 'all'],
                            description: 'Test-Typ',
                            default: 'all',
                        },
                        watch: {
                            type: 'boolean',
                            description: 'Watch Mode',
                            default: false,
                        },
                        coverage: {
                            type: 'boolean',
                            description: 'Mit Coverage',
                            default: false,
                        },
                        file: {
                            type: 'string',
                            description: 'Spezifische Test-Datei',
                        },
                    },
                },
            },
            {
                name: 'quick-test',
                description: 'Quick Test mit Presets: db, garmin, ui, all',
                inputSchema: {
                    type: 'object',
                    properties: {
                        preset: {
                            type: 'string',
                            enum: ['db', 'garmin', 'ui', 'all'],
                            description: 'Test-Preset',
                        },
                    },
                    required: ['preset'],
                },
            },

            // Coverage Tools
            {
                name: 'check-coverage',
                description: 'Prüft Test Coverage',
                inputSchema: {
                    type: 'object',
                    properties: {
                        format: {
                            type: 'string',
                            enum: ['summary', 'detailed', 'html', 'json'],
                            description: 'Output-Format',
                            default: 'summary',
                        },
                        threshold: {
                            type: 'number',
                            description: 'Mindest-Coverage in % (optional)',
                            minimum: 0,
                            maximum: 100,
                        },
                    },
                },
            },
            {
                name: 'coverage-summary',
                description: 'Gibt Coverage Summary aus',
                inputSchema: {
                    type: 'object',
                    properties: {},
                },
            },
            {
                name: 'coverage-threshold',
                description: 'Prüft ob Coverage Threshold erreicht ist',
                inputSchema: {
                    type: 'object',
                    properties: {
                        threshold: {
                            type: 'number',
                            description: 'Threshold in % (default: 80)',
                            default: 80,
                        },
                    },
                },
            },
            {
                name: 'file-coverage',
                description: 'Gibt File-spezifische Coverage aus',
                inputSchema: {
                    type: 'object',
                    properties: {
                        pattern: {
                            type: 'string',
                            description: 'Datei-Pattern zum Filtern',
                        },
                    },
                },
            },

            // Garmin Mock Server Tools
            {
                name: 'garmin-mock-start',
                description: 'Startet Garmin API Mock Server',
                inputSchema: {
                    type: 'object',
                    properties: {
                        port: {
                            type: 'number',
                            description: 'Port (default: 3001)',
                            default: 3001,
                        },
                        latency: {
                            type: 'number',
                            description: 'Simulierte Latenz in ms (default: 100)',
                            default: 100,
                        },
                        errorRate: {
                            type: 'number',
                            description: 'Fehlerrate 0-1 (default: 0)',
                            default: 0,
                        },
                    },
                },
            },
            {
                name: 'garmin-mock-stop',
                description: 'Stoppt Garmin API Mock Server',
                inputSchema: {
                    type: 'object',
                    properties: {},
                },
            },

            // Autonomous Debug Tools
            {
                name: 'debug-problem',
                description: 'Startet autonomen Debug-Prozess für ein spezifisches Problem. Analysiert Code, findet Fehler, generiert Fixes, testet und iteriert bis zur Lösung.',
                inputSchema: {
                    type: 'object',
                    properties: {
                        problem: {
                            type: 'string',
                            description: 'Beschreibung des Problems (z.B. "Garmin Login funktioniert nicht")',
                        },
                        context: {
                            type: 'object',
                            description: 'Zusätzlicher Kontext zum Problem',
                            properties: {
                                feature: {
                                    type: 'string',
                                    description: 'Betroffenes Feature (z.B. "garmin-auth")',
                                },
                                symptom: {
                                    type: 'string',
                                    description: 'Symptom (z.B. "401 Unauthorized nach MFA")',
                                },
                                files: {
                                    type: 'array',
                                    items: { type: 'string' },
                                    description: 'Relevante Files (z.B. ["src/lib/garmin/auth.ts"])',
                                },
                                errorMessage: {
                                    type: 'string',
                                    description: 'Spezifische Fehlermeldung',
                                },
                            },
                        },
                        options: {
                            type: 'object',
                            description: 'Debug-Optionen',
                            properties: {
                                maxIterations: {
                                    type: 'number',
                                    description: 'Max. Iterations (default: 5)',
                                    default: 5,
                                },
                                runTests: {
                                    type: 'boolean',
                                    description: 'Tests ausführen (default: true)',
                                    default: true,
                                },
                                createDocumentation: {
                                    type: 'boolean',
                                    description: 'Dokumentation erstellen (default: true)',
                                    default: true,
                                },
                                useLiveDebug: {
                                    type: 'boolean',
                                    description: 'Live-Debugging mit Playwright (default: false)',
                                    default: false,
                                },
                            },
                        },
                    },
                    required: ['problem'],
                },
            },
            {
                name: 'analyze-code',
                description: 'Analysiert Code auf Fehler und Warnungen (TypeScript, ESLint, Imports, Async Patterns)',
                inputSchema: {
                    type: 'object',
                    properties: {
                        files: {
                            type: 'array',
                            items: { type: 'string' },
                            description: 'Files zum Analysieren (optional, default: alle)',
                        },
                        checks: {
                            type: 'array',
                            items: {
                                type: 'string',
                                enum: ['typescript', 'eslint', 'imports', 'async-patterns', 'all'],
                            },
                            description: 'Checks to run (default: all)',
                            default: ['all'],
                        },
                        context: {
                            type: 'string',
                            description: 'Kontext für Analyse',
                        },
                        includeWarnings: {
                            type: 'boolean',
                            description: 'Warnings inkludieren (default: true)',
                            default: true,
                        },
                    },
                },
            },
            {
                name: 'scan-errors',
                description: 'Scannt verschiedene Quellen nach Runtime-Fehlern: DB Logs, Console Errors, Test Failures',
                inputSchema: {
                    type: 'object',
                    properties: {
                        sources: {
                            type: 'array',
                            items: {
                                type: 'string',
                                enum: ['db-logs', 'console', 'test-output', 'all'],
                            },
                            description: 'Fehlerquellen (default: all)',
                            default: ['all'],
                        },
                        filter: {
                            type: 'string',
                            description: 'Filter-Regex (z.B. "garmin|oauth|401")',
                        },
                        since: {
                            type: 'string',
                            description: 'Ab Timestamp (ISO)',
                        },
                        limit: {
                            type: 'number',
                            description: 'Max. Anzahl (default: 50)',
                            default: 50,
                        },
                    },
                },
            },
            {
                name: 'live-debug',
                description: 'Live-Debugging mit Playwright: App öffnen, Aktionen ausführen, Errors tracken',
                inputSchema: {
                    type: 'object',
                    properties: {
                        scenario: {
                            type: 'string',
                            description: 'Debug-Szenario (z.B. "garmin-login")',
                        },
                        steps: {
                            type: 'array',
                            items: {
                                type: 'object',
                                properties: {
                                    action: {
                                        type: 'string',
                                        enum: ['navigate', 'click', 'fill', 'wait', 'screenshot', 'evaluate'],
                                    },
                                    selector: { type: 'string' },
                                    url: { type: 'string' },
                                    value: { type: 'string' },
                                    timeout: { type: 'number' },
                                    script: { type: 'string' },
                                },
                            },
                            description: 'Debug-Schritte',
                        },
                        capture: {
                            type: 'array',
                            items: {
                                type: 'string',
                                enum: ['console', 'network', 'screenshot', 'trace'],
                            },
                            description: 'Was capturen (default: console, network)',
                            default: ['console', 'network'],
                        },
                        headless: {
                            type: 'boolean',
                            description: 'Headless Mode (default: true)',
                            default: true,
                        },
                    },
                    required: ['scenario', 'steps'],
                },
            },
            {
                name: 'fix-code',
                description: 'Generiert Code-Fixes basierend auf Fehleranalyse',
                inputSchema: {
                    type: 'object',
                    properties: {
                        problem: {
                            type: 'string',
                            description: 'Problem-Beschreibung',
                        },
                        file: {
                            type: 'string',
                            description: 'Betroffenes File',
                        },
                        context: {
                            type: 'object',
                            description: 'Kontext',
                            properties: {
                                errorMessage: { type: 'string' },
                                affectedFunction: { type: 'string' },
                                line: { type: 'number' },
                                referenceCode: { type: 'string' },
                                relatedFiles: {
                                    type: 'array',
                                    items: { type: 'string' },
                                },
                            },
                        },
                        strategy: {
                            type: 'string',
                            enum: ['conservative', 'aggressive', 'experimental'],
                            description: 'Fix-Strategie (default: conservative)',
                            default: 'conservative',
                        },
                    },
                    required: ['problem', 'file'],
                },
            },
        ],
    };
});

/**
 * Tool Execution Handler
 */
server.setRequestHandler(CallToolRequestSchema, async (request) => {
    try {
        const { name, arguments: args } = request.params;

        switch (name) {
            // DB Inspector
            case 'db-inspect':
                return { content: [{ type: 'text', text: JSON.stringify(await inspectDatabase(args as any || {}), null, 2) }] };

            case 'db-schema':
                return { content: [{ type: 'text', text: JSON.stringify(await getDbSchema(), null, 2) }] };

            case 'db-stats':
                return { content: [{ type: 'text', text: JSON.stringify(await getDbStats(), null, 2) }] };

            // DB Seed
            case 'db-seed':
                return { content: [{ type: 'text', text: JSON.stringify(await seedDatabase(args as any || {}), null, 2) }] };

            case 'db-quick-seed': {
                const preset = (args as any)?.preset || 'demo';
                return { content: [{ type: 'text', text: JSON.stringify(await quickSeed(preset), null, 2) }] };
            }

            // DB Clear
            case 'db-clear':
                return { content: [{ type: 'text', text: JSON.stringify(await clearDatabase(args as any || {}), null, 2) }] };

            case 'db-reset': {
                const type = (args as any)?.type || 'soft';
                return { content: [{ type: 'text', text: JSON.stringify(await resetDatabase(type), null, 2) }] };
            }

            case 'db-clear-logs':
                return { content: [{ type: 'text', text: JSON.stringify(await clearLogs(), null, 2) }] };

            case 'db-clear-old': {
                const daysOld = (args as any)?.daysOld || 30;
                return { content: [{ type: 'text', text: JSON.stringify(await clearOldData(daysOld), null, 2) }] };
            }

            // Tests
            case 'run-tests':
                return { content: [{ type: 'text', text: JSON.stringify(await runTests(args as any || {}), null, 2) }] };

            case 'quick-test': {
                const preset = (args as any)?.preset || 'all';
                return { content: [{ type: 'text', text: JSON.stringify(await quickTest(preset), null, 2) }] };
            }

            // Coverage
            case 'check-coverage':
                return { content: [{ type: 'text', text: JSON.stringify(await checkCoverage(args as any || {}), null, 2) }] };

            case 'coverage-summary':
                return { content: [{ type: 'text', text: await getCoverageSummary() }] };

            case 'coverage-threshold': {
                const threshold = (args as any)?.threshold || 80;
                const result = await checkCoverageThreshold(threshold);
                return { content: [{ type: 'text', text: result ? '✅ Coverage threshold met' : '❌ Coverage below threshold' }] };
            }

            case 'file-coverage': {
                const pattern = (args as any)?.pattern;
                return { content: [{ type: 'text', text: await getFileCoverage(pattern) }] };
            }

            // Garmin Mock Server
            case 'garmin-mock-start': {
                if (mockServerInstance) {
                    return { content: [{ type: 'text', text: '⚠️ Server already running' }] };
                }
                mockServerInstance = await startMockServer(args || {});
                return { content: [{ type: 'text', text: `✅ Garmin Mock Server started on port ${(args as any)?.port || 3001}` }] };
            }

            case 'garmin-mock-stop': {
                if (!mockServerInstance) {
                    return { content: [{ type: 'text', text: '⚠️ No server running' }] };
                }
                await mockServerInstance.stop();
                mockServerInstance = null;
                return { content: [{ type: 'text', text: '✅ Garmin Mock Server stopped' }] };
            }

            // Autonomous Debug Tools
            case 'debug-problem':
                return { content: [{ type: 'text', text: JSON.stringify(await debugProblem(args as any || {}), null, 2) }] };

            case 'analyze-code':
                return { content: [{ type: 'text', text: JSON.stringify(await analyzeCode(args as any || {}), null, 2) }] };

            case 'scan-errors':
                return { content: [{ type: 'text', text: JSON.stringify(await scanErrors(args as any || {}), null, 2) }] };

            case 'live-debug':
                return { content: [{ type: 'text', text: JSON.stringify(await liveDebug(args as any || {}), null, 2) }] };

            case 'fix-code':
                return { content: [{ type: 'text', text: JSON.stringify(await fixCode(args as any || {}), null, 2) }] };

            default:
                throw new Error(`Unknown tool: ${name}`);
        }
    } catch (error: any) {
        return {
            content: [{ type: 'text', text: `Error: ${error.message}` }],
            isError: true,
        };
    }
});

/**
 * Start Server
 */
async function main() {
    const transport = new StdioServerTransport();
    await server.connect(transport);

    console.error('🚀 Migraine Tracker MCP Server started');
    console.error('📦 Available tools: 26 (21 base + 5 autonomous debug)');
    console.error('🔧 DB Inspector, Seed, Clear');
    console.error('🧪 Test Runner, Coverage');
    console.error('🌐 Garmin Mock Server');
    console.error('🤖 Autonomous Debug: debug-problem, analyze-code, scan-errors, live-debug, fix-code');
}

main().catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
});
