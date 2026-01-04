# Migraine Tracker MCP Server

MCP (Model Context Protocol) Server für Testing Infrastructure und Tools.

## Features

- **DB Inspector:** IndexedDB Daten auslesen und inspizieren
- **DB Seed:** Test-Daten generieren (Episoden, Garmin Data)
- **DB Clear:** Datenbank zurücksetzen für Tests
- **Garmin Mock:** Simulierter Garmin API Server
- **Test Runner:** Vitest/Playwright Tests triggern
- **Coverage:** Test Coverage Reports

## Installation

```bash
npm install
```

## Development

```bash
npm run dev
```

## Build

```bash
npm run build
```

## Integration mit Claude Desktop

Füge folgende Config zu `~/.config/Claude/claude_desktop_config.json` hinzu:

```json
{
  "mcpServers": {
    "migraine-tracker-tools": {
      "command": "node",
      "args": ["/home/daniel/Desktop/garmin/mcp-server/dist/index.js"]
    }
  }
}
```

## Available Tools

### db-inspect
Liest IndexedDB Daten aus der Migraine Tracker DB.

### db-seed
Generiert realistische Test-Daten für Development und Testing.

### db-clear
Löscht alle Daten aus der Datenbank (für Test-Reset).

### garmin-mock
Startet Mock-Server für Garmin Connect API auf localhost:3001.

### run-tests
Führt Vitest/Playwright Tests aus.

### check-coverage
Gibt Test Coverage Report aus.

## Architecture

```
mcp-server/
├── src/
│   ├── index.ts              # MCP Server Entry Point
│   ├── tools/                # Tool Implementations
│   │   ├── db-inspector.ts
│   │   ├── db-seed.ts
│   │   ├── db-clear.ts
│   │   ├── test-runner.ts
│   │   └── coverage.ts
│   ├── generators/           # Mock Data Generators
│   │   ├── episode-generator.ts
│   │   └── garmin-generator.ts
│   └── mocks/               # API Mocks
│       └── garmin-api-mock.ts
└── package.json
```
