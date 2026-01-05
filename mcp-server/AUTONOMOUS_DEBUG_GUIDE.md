# Autonomous Debug System - Quick Start

## 🎯 Übersicht

Das Autonomous Debug System ermöglicht automatisiertes Debugging deiner Migraine Tracker App:

1. **Problem beschreiben** → System analysiert Code
2. **Fehler finden** → Scannt Logs, Console, Tests
3. **Fixes generieren** → Basierend auf Patterns & Referenz-Code
4. **Tests ausführen** → Validiert die Lösung
5. **Iterieren** → Bis Problem gelöst oder Max-Iterationen

---

## 🚀 Installation

```bash
cd mcp-server
npm install
npm run build
```

**Playwright installieren:**

```bash
npx playwright install chromium
```

---

## 🛠️ Verwendung

### 1. MCP Server starten

```bash
npm start
```

Oder für Development (mit Watch Mode):

```bash
npm run dev
```

### 2. Via MCP Tools aufrufen

#### Autonomer Debug-Loop (Haupt-Tool)

```json
{
  "tool": "debug-problem",
  "args": {
    "problem": "Garmin Login funktioniert nicht",
    "context": {
      "feature": "garmin-auth",
      "symptom": "401 Unauthorized nach MFA",
      "files": ["src/lib/garmin/auth.ts"]
    },
    "options": {
      "maxIterations": 5,
      "runTests": true,
      "createDocumentation": true,
      "useLiveDebug": false
    }
  }
}
```

**Output:**

```json
{
  "success": true,
  "problem": "Garmin Login funktioniert nicht",
  "iterations": 3,
  "totalFixes": 5,
  "totalLinesChanged": 12,
  "finalStatus": "solved",
  "documentation": "docu/AUTO_DEBUG_Garmin_Login_2026-01-05.md",
  "summary": "Problem solved in 3 iterations...",
  "recommendations": []
}
```

---

### 3. Einzelne Tools verwenden

#### Code Analyse

```json
{
  "tool": "analyze-code",
  "args": {
    "files": ["src/lib/garmin/auth.ts"],
    "checks": ["typescript", "eslint", "async-patterns"]
  }
}
```

#### Error Scanner

```json
{
  "tool": "scan-errors",
  "args": {
    "sources": ["all"],
    "filter": "garmin|oauth|401"
  }
}
```

#### Live Debugging mit Playwright

```json
{
  "tool": "live-debug",
  "args": {
    "scenario": "garmin-login",
    "steps": [
      { "action": "navigate", "url": "http://localhost:5173/garmin" },
      { "action": "click", "selector": "button:has-text('Anmelden')" },
      { "action": "fill", "selector": "#email", "value": "test@example.com" },
      { "action": "fill", "selector": "#password", "value": "password" },
      { "action": "click", "selector": "button:has-text('Login')" },
      { "action": "wait", "timeout": 2000 }
    ],
    "capture": ["console", "network", "screenshot"]
  }
}
```

#### Code Fix Generator

```json
{
  "tool": "fix-code",
  "args": {
    "problem": "OAuth1 signature missing body parameters",
    "file": "src/lib/garmin/auth.ts",
    "context": {
      "errorMessage": "401 Unauthorized",
      "affectedFunction": "getOAuth1Token"
    }
  }
}
```

---

## 🔄 Workflow-Beispiele

### Beispiel 1: Garmin Login Debug

```bash
# Problem melden
debug-problem "Garmin Login funktioniert nicht nach MFA"

# System:
# 1. Analysiert src/lib/garmin/auth.ts
# 2. Scannt Logs nach "401", "oauth", "garmin"
# 3. Findet: OAuth1 Signatur-Fehler
# 4. Generiert Fix: Body-Parameter in Signatur einbeziehen
# 5. Wendet Fix an
# 6. Führt Tests aus: garmin-client.test.ts
# 7. ✅ Problem gelöst!
```

### Beispiel 2: Episode Form Validation

```bash
# Problem melden
debug-problem "Episode Form speichert keine Trigger"

# System:
# 1. Analysiert src/features/episodes/EpisodeForm.tsx
# 2. Findet: Zod Schema validiert Trigger nicht richtig
# 3. Generiert Fix: Schema-Anpassung
# 4. Wendet Fix an
# 5. Führt Tests aus
# 6. ✅ Validierung funktioniert
```

---

## 📊 Output-Formate

### Debug-Problem Result

```typescript
{
  success: boolean;
  problem: string;
  iterations: DebugIteration[];  // Jede Iteration mit Analyse, Fixes, Tests
  totalIterations: number;
  totalFixes: number;
  totalLinesChanged: number;
  finalStatus: 'solved' | 'partial' | 'failed' | 'max-iterations';
  documentation: string;         // Path zu generierter Doku
  summary: string;
  recommendations: string[];     // Nächste Schritte
}
```

### Code-Analyse Result

```typescript
{
  success: boolean;
  errors: CodeIssue[];          // TypeScript/ESLint Errors
  warnings: CodeIssue[];        // Warnungen
  suggestions: CodeIssue[];     // Verbesserungsvorschläge
  summary: {
    totalIssues: number;
    errorCount: number;
    warningCount: number;
    filesAnalyzed: number;
  }
}
```

### Live-Debug Result

```typescript
{
  success: boolean;
  scenario: string;
  duration: number;             // ms
  screenshot: string;           // Path
  consoleErrors: string[];      // Browser Console Errors
  consoleWarnings: string[];
  networkRequests: Array<{      // Fehlgeschlagene Requests
    url: string;
    method: string;
    status: number;
    response: string;
  }>;
  trace: string;                // Playwright Trace Path
}
```

---

## 🧪 Testing

### Test des Autonomous Debug Systems

```bash
# Unit Tests für Tools
cd mcp-server
npm test

# Integration Test: Debug-Loop
npm run test:debug-loop
```

### Manual Test

1. **App starten:**

   ```bash
   cd /home/daniel/Desktop/garmin
   npm run dev
   ```

2. **MCP Server starten:**

   ```bash
   cd mcp-server
   npm start
   ```

3. **Debug-Problem aufrufen** (via MCP Client oder Claude)

4. **Check Output:**
   - Automatisch generierte Dokumentation in `/docu/AUTO_DEBUG_*.md`
   - Screenshots in `/debug-screenshots/`
   - Traces in `/debug-traces/`

---

## 🎛️ Konfiguration

### Debugging-Optionen

```typescript
{
  maxIterations: 5,          // Max. Anzahl Debug-Iterationen
  runTests: true,            // Tests nach jedem Fix ausführen
  createDocumentation: true, // Doku generieren
  useLiveDebug: false,       // Playwright-Debugging (nur 1. Iteration)
}
```

### Fix-Strategien

- **conservative** (default): Nur sichere Fixes anwenden
- **aggressive**: Mehr Änderungen, höheres Risiko
- **experimental**: Alle möglichen Fixes testen

---

## 📝 Predefined Scenarios

### Garmin Login

```typescript
DEBUG_SCENARIOS['garmin-login'] = [
  { action: 'navigate', url: 'http://localhost:5173/garmin' },
  { action: 'click', selector: 'button:has-text("Anmelden")' },
  { action: 'fill', selector: '#email', value: 'test@example.com' },
  { action: 'fill', selector: '#password', value: 'password123' },
  { action: 'click', selector: 'button:has-text("Anmelden")' },
  { action: 'wait', timeout: 2000 },
  { action: 'screenshot' },
];
```

### Episode Create

```typescript
DEBUG_SCENARIOS['episode-create'] = [
  { action: 'navigate', url: 'http://localhost:5173' },
  { action: 'click', selector: '[aria-label="Episode erfassen"]' },
  { action: 'wait', selector: 'form' },
  { action: 'screenshot' },
];
```

### Analytics View

```typescript
DEBUG_SCENARIOS['analytics-view'] = [
  { action: 'navigate', url: 'http://localhost:5173/analytics' },
  { action: 'wait', timeout: 1000 },
  { action: 'screenshot' },
];
```

---

## 🔧 Troubleshooting

### Playwright Errors

**Problem:** `Error: browserType.launch: Executable doesn't exist`

**Lösung:**

```bash
npx playwright install chromium
```

### TypeScript/ESLint nicht gefunden

**Problem:** `tsc: command not found`

**Lösung:**

```bash
npm install -g typescript eslint
# oder in Project:
npx tsc --version
```

### Port bereits belegt

**Problem:** `Port 5173 already in use`

**Lösung:**

```bash
# Finde Prozess
lsof -i :5173
# Beende Prozess
kill -9 <PID>
```

---

## 🚀 Next Steps

1. **Erweitere Scenarios:** Füge eigene Debug-Scenarios hinzu
2. **Custom Patterns:** Erweitere Pattern-Matching in `code-fixer.ts`
3. **Integration:** Integriere mit CI/CD Pipeline
4. **AI-Enhancement:** Nutze LLM für komplexere Fix-Generierung

---

## 📚 Weitere Ressourcen

- **PROJECT_PLAN.md:** Vollständige Projekt-Spezifikation
- **docu/PAKET\_\*.md:** Dokumentation aller Features
- **MCP SDK:** https://github.com/modelcontextprotocol/sdk
- **Playwright Docs:** https://playwright.dev/

---

**Viel Erfolg beim autonomen Debugging! 🤖**
