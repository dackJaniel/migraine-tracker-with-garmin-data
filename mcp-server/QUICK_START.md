# MCP Server Quick Start Guide

## 🚀 Schnellstart

### 1. MCP Server starten

**VS Code:**

```
Ctrl+Shift+P → "Run Task" → "MCP Server: Start"
```

**Terminal:**

```bash
cd mcp-server
npm start
```

Der Server läuft dann im Stdio-Modus und wartet auf Tool-Aufrufe.

### 2. Claude Desktop Integration

**Config Location:**

- Linux: `~/.config/Claude/claude_desktop_config.json`
- Mac: `~/Library/Application Support/Claude/claude_desktop_config.json`
- Windows: `%APPDATA%\Claude\claude_desktop_config.json`

**Config hinzufügen:**

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

**Wichtig:** Claude Desktop nach Config-Änderung neustarten!

### 3. Verfügbare Tools testen

Im Claude Desktop Chat:

```
Bitte nutze das Tool "db-schema" um das Datenbank-Schema anzuzeigen.
```

Claude wird den MCP Server aufrufen und das Schema zurückgeben.

## 📦 Tool Categories

### DB Inspector (3 Tools)

- `db-inspect` - Inspiziert IndexedDB Tabellen
- `db-schema` - Zeigt Schema
- `db-stats` - Statistiken

### DB Seed (2 Tools)

- `db-seed` - Generiert Test-Daten
- `db-quick-seed` - Presets: demo, test, stress-test

### DB Clear (4 Tools)

- `db-clear` - Löscht Tabellen
- `db-reset` - Reset (soft/hard)
- `db-clear-logs` - Nur Logs
- `db-clear-old` - Alte Daten

### Test Runner (2 Tools)

- `run-tests` - Vitest/Playwright
- `quick-test` - Presets: db, garmin, ui, all

### Coverage (4 Tools)

- `check-coverage` - Coverage Analyse
- `coverage-summary` - Formatted Report
- `coverage-threshold` - Threshold Check
- `file-coverage` - File-spezifisch

### Garmin Mock (2 Tools)

- `garmin-mock-start` - Startet Mock Server
- `garmin-mock-stop` - Stoppt Mock Server

## 🎯 Häufige Use Cases

### Use Case 1: Test-Daten generieren

**Im Chat:**

```
Generiere realistische Test-Daten für die letzten 30 Tage mit dem Tool db-quick-seed preset "demo".
```

**Output:**

```json
{
  "success": true,
  "generated": {
    "episodes": 15,
    "garminData": 30
  },
  "browserScript": "...",
  "instructions": "Führe das browserScript in den Browser DevTools aus..."
}
```

**Dann:**

1. PWA im Browser öffnen (http://localhost:5173)
2. DevTools öffnen (F12)
3. Console Tab
4. Browser-Script aus Output kopieren und ausführen
5. Refresh der App → Daten sind vorhanden

### Use Case 2: Datenbank inspizieren

**Im Chat:**

```
Zeige mir die letzten 10 Episoden mit db-inspect table "episodes" limit 10.
```

**Output:** Browser-Script zum Ausführen in DevTools

### Use Case 3: Tests mit Coverage

**Im Chat:**

```
Führe alle Unit-Tests mit Coverage aus mit dem Tool run-tests.
```

**Output:** Test-Ergebnisse und Coverage-Report

### Use Case 4: Garmin Mock Server

**Scenario:** Garmin API Client testen ohne echte API

**Im Chat:**

```
Starte den Garmin Mock Server auf Port 3001 mit garmin-mock-start.
```

**Dann im Garmin Client:**

```typescript
// In src/lib/garmin/client.ts
const BASE_URL = 'http://localhost:3001'; // Statt Garmin URL
```

**Features:**

- Realistische Daten (generiert via Generators)
- Konfigurierbare Latenz (100ms default)
- Error Rate Injection (Testing)
- OAuth Token Management

## 🛠️ Development Workflow

### 1. MCP Server Development

**Watch Mode:**

```bash
cd mcp-server
npm run dev
```

**Build:**

```bash
npm run build
```

**Test einzelnes Tool:**

```bash
node dist/index.js
# Dann Tool-Name eingeben via stdin (für manuelle Tests)
```

### 2. Neues Tool hinzufügen

**Schritt 1:** Tool implementieren

```typescript
// src/tools/my-new-tool.ts
export async function myNewTool(args: any) {
  // Implementation
  return { success: true, data: ... };
}
```

**Schritt 2:** Tool registrieren in `src/index.ts`

```typescript
// In ListToolsRequestSchema Handler:
{
  name: 'my-new-tool',
  description: '...',
  inputSchema: { ... }
}

// In CallToolRequestSchema Handler:
case 'my-new-tool':
  return { content: [{ type: 'text', text: JSON.stringify(await myNewTool(args), null, 2) }] };
```

**Schritt 3:** Build & Test

```bash
npm run build
# Test via Claude Desktop
```

### 3. Mock Server erweitern

**Neue Endpoint hinzufügen:**

```typescript
// In src/mocks/garmin-api-mock.ts
router.get('/new-endpoint/:param', (req, res) => {
  const param = req.params.param;
  // Generate response
  res.json({ data: ... });
});
```

**Standalone testen:**

```bash
cd mcp-server
node dist/mocks/garmin-api-mock.js
# Server läuft auf http://localhost:3001

# In anderem Terminal:
curl http://localhost:3001/new-endpoint/test
```

## 🧪 Testing Strategies

### Strategy 1: Isolated Unit Tests

Teste einzelne Funktionen direkt:

```typescript
// tests/mcp-tools.test.ts
import { generateEpisodes } from '../mcp-server/src/generators/episode-generator';

test('generateEpisodes creates valid data', () => {
  const episodes = generateEpisodes(10, {
    start: new Date('2025-01-01'),
    end: new Date('2025-01-31'),
  });

  expect(episodes).toHaveLength(10);
  expect(episodes[0].intensity).toBeGreaterThanOrEqual(1);
  expect(episodes[0].intensity).toBeLessThanOrEqual(10);
});
```

### Strategy 2: Integration via Claude Desktop

Teste Tool-Workflow End-to-End:

1. Claude Desktop öffnen
2. Tool aufrufen
3. Browser-Script ausführen
4. App validieren

### Strategy 3: Mock Server Integration

Teste Garmin Client gegen Mock Server:

```typescript
// tests/garmin-client.integration.test.ts
import { GarminClient } from '../src/lib/garmin/client';
import { startMockServer } from '../mcp-server/src/mocks/garmin-api-mock';

let mockServer;

beforeAll(async () => {
  mockServer = await startMockServer({ port: 3002 });
});

afterAll(async () => {
  await mockServer.stop();
});

test('login works with mock server', async () => {
  const client = new GarminClient('http://localhost:3002');
  const result = await client.login('test@example.com', 'password');

  expect(result.success).toBe(true);
  expect(result.oauth1_token).toBeDefined();
});
```

## 📊 Performance Tips

### Generator Performance

**Batch Generation:**

```typescript
// Langsam (einzeln):
for (let i = 0; i < 100; i++) {
  const episode = generateSingleEpisode();
  // Process...
}

// Schnell (batch):
const episodes = generateEpisodes(100, dateRange);
```

### Mock Server Optimization

**Latenz reduzieren für Tests:**

```typescript
const mockServer = new GarminApiMockServer({
  port: 3001,
  latency: 0, // Keine simulierte Latenz
  errorRate: 0,
});
```

**Caching für wiederholte Requests:**

```typescript
// In garmin-api-mock.ts
const cache = new Map();

router.get('/data/:date', (req, res) => {
  const date = req.params.date;

  if (cache.has(date)) {
    return res.json(cache.get(date));
  }

  const data = generateGarminDataForDate(new Date(date));
  cache.set(date, data);
  res.json(data);
});
```

## 🔧 Troubleshooting

### Problem: MCP Server startet nicht

**Check 1:** Dependencies installiert?

```bash
cd mcp-server
npm install
```

**Check 2:** TypeScript kompiliert?

```bash
npm run build
# Sollte ohne Fehler durchlaufen
```

**Check 3:** Node Version?

```bash
node --version
# Min. v18 erforderlich
```

### Problem: Tools werden in Claude nicht gefunden

**Check 1:** Config Pfad korrekt?

```bash
cat ~/.config/Claude/claude_desktop_config.json
# Sollte migraine-tracker-tools enthalten
```

**Check 2:** Claude Desktop neugestartet?

- Komplett beenden
- Neu öffnen
- Warten bis Initialisierung fertig

**Check 3:** MCP Server Log?

```bash
# Server manuell starten für Debug Output
cd mcp-server
node dist/index.js
# Sollte "MCP Server started" ausgeben
```

### Problem: Browser-Scripts funktionieren nicht

**Check 1:** DevTools geöffnet?

- F12 drücken
- Console Tab wählen

**Check 2:** Import Pfad korrekt?

```javascript
// In Browser Console:
const { db } = await import('/src/lib/db.ts');
// Sollte DB-Instanz zurückgeben
```

**Check 3:** DB entsperrt?

- Erst PIN eingeben
- Dann Script ausführen

### Problem: Mock Server Connection Failed

**Check 1:** Server läuft?

```bash
curl http://localhost:3001/
# Sollte {"status":"ok"} zurückgeben
```

**Check 2:** Port belegt?

```bash
lsof -i :3001
# Sollte node process zeigen
```

**Check 3:** CORS Headers?

```bash
curl -H "Origin: http://localhost:5173" \
     -H "Access-Control-Request-Method: GET" \
     -X OPTIONS http://localhost:3001/auth/login
# Sollte CORS Headers zurückgeben
```

## 🎓 Best Practices

### 1. Seed-Daten Lifecycle

**Entwicklung:**

```
1. db-quick-seed preset "demo"
2. Entwickeln & Testen
3. db-clear-old daysOld 7 (alte Daten aufräumen)
4. Bei Bedarf neu seeden
```

**Testing:**

```
1. db-quick-seed preset "test" (minimal)
2. Tests ausführen
3. db-reset type "soft" (cleanup)
```

### 2. Mock Server Usage

**Development:**

```typescript
const MOCK_MODE = import.meta.env.DEV;
const BASE_URL = MOCK_MODE
  ? 'http://localhost:3001'
  : 'https://connect.garmin.com';
```

**Testing:**

```typescript
beforeEach(async () => {
  mockServer = await startMockServer({
    port: 3001 + testId, // Unique port per test
  });
});
```

### 3. Coverage Thresholds

**Empfehlung:**

- Utils: 90%+
- Services: 80%+
- Components: 60%+
- E2E: Critical Paths only

**Check:**

```bash
# Via MCP Tool:
coverage-threshold threshold 80

# Oder direkt:
cd /home/daniel/Desktop/garmin
npm test -- --coverage
```

## 📚 Weitere Ressourcen

- [MCP SDK Documentation](https://github.com/modelcontextprotocol/sdk)
- [PROJECT_PLAN.md](../PROJECT_PLAN.md) - Vollständige Spezifikation
- [PAKET_6_MCP_Server_Testing_2026-01-05.md](./PAKET_6_MCP_Server_Testing_2026-01-05.md) - Implementierungs-Details

---

**Happy Testing! 🎉**
