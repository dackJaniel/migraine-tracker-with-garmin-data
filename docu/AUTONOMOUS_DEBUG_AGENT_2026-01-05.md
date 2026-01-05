# 🤖 Autonomous Debug Agent - VS Code Integration

**Erstellt:** 05.01.2026  
**Status:** ✅ Vollständig implementiert  
**Version:** 1.0.0

---

## 📋 Übersicht

Der **Autonomous Debug Agent** ist jetzt direkt aus VS Code nutzbar! Er integriert das vollständige Autonomous Debug System mit allen MCP Tools und ermöglicht debugging per Command Palette, Keyboard Shortcuts und Context Menu.

---

## 🚀 Installation & Aktivierung

### Schritt 1: Workspace öffnen

```bash
cd /home/daniel/Desktop/garmin
code .vscode/autonomous-debug-agent.code-workspace
```

### Schritt 2: MCP Server starten

**Option A: VS Code Task**

- `Ctrl+Shift+P` → "Tasks: Run Task"
- Wähle "🤖 Autonomous Debug: Start MCP Server"

**Option B: Terminal**

```bash
cd mcp-server
npm start
```

### Schritt 3: Agent aktivieren

Der Agent ist **automatisch aktiv** sobald der Workspace geöffnet ist!

---

## 🎯 Verwendung

### 1. Autonomous Debug starten

**Keyboard Shortcut:** `Ctrl+Shift+D` (Windows/Linux) oder `Cmd+Shift+D` (Mac)

**Command Palette:** `Ctrl+Shift+P` → "Autonomous Debug: Problem lösen"

**Context Menu:** Rechtsklick im Editor → "🤖 Autonomous Debug: Problem lösen"

**Workflow:**

1. Problem beschreiben im Input-Dialog
2. Agent analysiert automatisch:
   - Code-Analyse (TypeScript, ESLint, Imports)
   - Runtime Error Scan
   - Optional: Live Browser Debugging
3. Agent generiert Fixes
4. Agent testet Fixes
5. Agent dokumentiert Lösung
6. Ergebnis wird in Webview angezeigt
7. Dokumentation wird geöffnet

**Beispiel-Problembeschreibung:**

```
"Garmin Login funktioniert nicht - 401 Unauthorized nach MFA"
```

### 2. Code analysieren

**Command:** `Ctrl+Shift+P` → "Autonomous Debug: Code analysieren"

**Analysiert:**

- TypeScript Compiler Errors
- ESLint Rules
- Unused Imports
- Async Patterns (missing await, error handling)

**Output:** Code Analysis Output Channel mit allen Findings

### 3. Runtime Errors scannen

**Command:** `Ctrl+Shift+P` → "Autonomous Debug: Runtime Errors scannen"

**Scannt:**

- IndexedDB Logs
- Browser Console Logs
- Test Output
- Build Errors

**Filter:** Optional Regex-Filter (z.B. "garmin|oauth|401")

### 4. Live Browser Debugging

**Command:** `Ctrl+Shift+P` → "Autonomous Debug: Live Browser Debugging"

**Szenarien:**

- 🔐 Garmin Login
- 📝 Episode erstellen
- 🔄 Garmin Sync

**Öffnet:** Browser mit Playwright, captured Console + Network + Screenshots

---

## 🛠️ Chat-Integration

### @autonomous-debug Chat Participant

Im GitHub Copilot Chat kannst du den Agent direkt ansprechen:

```
@autonomous-debug Garmin Sync funktioniert nicht
```

**Verfügbare Commands:**

- `/debug-problem` - Startet autonomen Debug-Loop
- `/analyze-code` - Code-Analyse
- `/scan-errors` - Runtime Error Scan
- `/live-debug` - Browser Debugging
- `/fix-code` - Code Fix Generator

**Beispiele:**

```
@autonomous-debug /analyze-code src/lib/garmin/auth.ts
@autonomous-debug /scan-errors filter: "garmin|401"
@autonomous-debug /live-debug scenario: garmin-login
```

---

## 📝 Code Snippets

VS Code Snippets für schnelle MCP Tool-Aufrufe:

### `@debug-problem`

```typescript
const result = await debugProblem({
  problem: 'Beschreibung',
  context: {
    feature: 'garmin-auth',
    symptom: '401 Unauthorized',
    files: ['src/lib/garmin/auth.ts'],
  },
  options: {
    maxIterations: 5,
    runTests: true,
    createDocumentation: true,
  },
});
```

### `@analyze-code`

```typescript
const analysis = await analyzeCode({
  files: ['src/lib/garmin/auth.ts'],
  checks: ['all'],
});
```

### `@scan-errors`

```typescript
const errors = await scanErrors({
  sources: ['all'],
  filter: 'garmin|oauth|401',
});
```

### `@live-debug`

```typescript
const result = await liveDebug({
  scenario: 'garmin-login',
  capture: ['console', 'network', 'screenshot'],
});
```

**Nutzen:** Type `@` im Editor und wähle Snippet aus!

---

## 🎨 UI Components

### 1. Debug-Ergebnis Webview

Nach erfolgreichem Debug wird eine Webview mit folgendem Inhalt angezeigt:

- ✅/⚠️/❌ Status Badge
- Metriken: Iterationen, Fixes, Confidence, Zeilen geändert
- Liste aller angewendeten Fixes mit Code
- Test-Ergebnisse
- Link zur Dokumentation

### 2. Output Channels

- **Code Analysis:** Alle TypeScript/ESLint Findings
- **Error Scanner:** Runtime Errors aus DB/Console/Tests
- **MCP Server:** Server-Logs

### 3. Notifications

- ℹ️ Info: "Problem gelöst in X Iterationen"
- ⚠️ Warning: "Problem teilweise gelöst"
- ❌ Error: "Problem konnte nicht gelöst werden"

---

## 🧪 Testing

### Test-Suite für Agent

```bash
cd mcp-server
npm run build
node dist/test-autonomous-debug.js
```

**Tests:**

- ✅ Code Analyzer
- ✅ Error Scanner
- ✅ Live Debugger
- ✅ Code Fixer
- ✅ Debug Orchestrator (Full Loop)

### VS Code Task

**Task:** "🧪 Autonomous Debug: Run Test Suite"

Läuft automatisch Build + Test-Suite.

---

## 📚 Dokumentation

Alle Debug-Sessions werden automatisch dokumentiert:

**Location:** `docu/AUTO_DEBUG_[Feature]_[Datum].md`

**Inhalt:**

- Problem-Beschreibung
- Gefundene Issues
- Angewendete Fixes mit Code
- Test-Ergebnisse
- Build-Status
- Metriken (Iterations, Confidence, Lines Changed)

**Auto-Open:** Dokumentation wird nach Debug automatisch geöffnet.

---

## ⚙️ Konfiguration

### VS Code Settings

**`.vscode/settings.json`:**

```json
{
  "copilot.enable": {
    "*": true
  },
  "github.copilot.chat.participantAdditions": {
    "autonomous-debug": {
      "name": "autonomous-debug",
      "description": "Autonomous Debug Agent",
      "isSticky": true
    }
  }
}
```

### Workspace Settings

**`.vscode/autonomous-debug-agent.code-workspace`:**

- Tasks für MCP Server Start
- Extension Recommendations
- Copilot Chat Participant Config

### Agent Instructions

**`.vscode/copilot-instructions.md`:**

- Agent-Identität
- MCP Tool Descriptions
- Workflow & Best Practices
- Beispiel-Interaktionen

---

## 🔧 Troubleshooting

### Problem: MCP Server startet nicht

**Lösung:**

```bash
cd mcp-server
npm install
npm run build
npm start
```

**Prüfen:** `pgrep -f "mcp-server"` sollte Prozess zeigen

### Problem: Keine MCP Tools verfügbar

**Lösung:** MCP Server muss laufen bevor Agent-Commands ausgeführt werden.

**Auto-Start:** Agent fragt beim ersten Command ob Server gestartet werden soll.

### Problem: Live Debug funktioniert nicht

**Voraussetzung:** Dev Server muss laufen!

```bash
npm run dev  # In Root-Directory
```

**Port:** http://localhost:5173

### Problem: TypeScript Errors im Extension Code

**Lösung:** VS Code Extension API installieren:

```bash
npm install --save-dev @types/vscode
```

---

## 📊 Metriken & Analytics

### Session Tracking

Jede Debug-Session tracked:

- Dauer (Start bis Ende)
- Anzahl Iterationen
- Anzahl Fixes
- Durchschnittliche Confidence
- Geänderte Zeilen
- Test Pass Rate
- Build Status

### Accuracy Tracking

**Feedback-Loop:**

- Agent fragt nach Debug: "Hat die Lösung funktioniert?"
- User-Feedback wird in `riskAssessments` gespeichert
- Model lernt aus Feedback (Gewichte anpassen)

---

## 🚀 Nächste Schritte

### Phase 1: ✅ Abgeschlossen

- Agent-Konfiguration
- Chat-Integration
- Code Snippets
- VS Code Commands
- Webview UI
- Dokumentation

### Phase 2: Geplant

- [ ] Extension als VSIX Package
- [ ] Marketplace Publication
- [ ] Auto-Update von MCP Tools
- [ ] Telemetry & Analytics
- [ ] Settings UI Panel
- [ ] Custom Debug Scenarios Editor

### Phase 3: Erweiterungen

- [ ] Multi-Language Support
- [ ] Cloud Sync für Debug History
- [ ] Team-Sharing von Debug-Sessions
- [ ] AI-basierte Code Review Integration

---

## 📝 Changelog

### v1.0.0 (2026-01-05)

- ✅ Initiale Implementation
- ✅ 5 VS Code Commands
- ✅ Chat Participant Integration
- ✅ Code Snippets
- ✅ Webview UI
- ✅ Automatische Dokumentation
- ✅ MCP Server Integration
- ✅ Test-Suite

---

## 🤝 Verwendung

**Für neue Features:**

1. Problem beschreiben: "Feature X funktioniert nicht"
2. `Ctrl+Shift+D` drücken
3. Warten auf Agent-Analyse
4. Ergebnis reviewen
5. Bei Bedarf: Manuell nachbessern

**Für bestehende Bugs:**

1. Fehler reproducieren
2. Agent mit `/scan-errors` starten
3. Errors analysieren lassen
4. Fixes applyen
5. Tests laufen lassen

**Für Code-Quality:**

1. Datei öffnen
2. "Code analysieren" Command
3. Issues reviewen
4. Optional: `/fix-code` für Auto-Fixes

---

## 💡 Tipps

1. **Präzise Problem-Beschreibung:** Je genauer, desto besser
2. **Relevante Dateien öffnen:** Agent nutzt aktuelle Datei als Kontext
3. **MCP Server laufen lassen:** Vermeidet Startup-Delays
4. **Dokumentation reviewen:** Learnings für zukünftige Bugs
5. **Feedback geben:** Hilft Agent zu lernen

---

**Viel Erfolg mit dem Autonomous Debug Agent! 🚀**
