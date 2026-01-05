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
    console.error('📦 Available tools: 21');
    console.error('🔧 DB Inspector, Seed, Clear');
    console.error('🧪 Test Runner, Coverage');
    console.error('🌐 Garmin Mock Server');
}

main().catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
});
