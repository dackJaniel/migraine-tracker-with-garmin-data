# Android Build & Deployment Guide

**Datum:** 2026-01-05  
**Status:** ✅ Erfolgreich getestet

---

## 📱 Übersicht

Diese Dokumentation beschreibt den Build- und Deployment-Prozess für die Migräne Tracker PWA auf Android-Geräten.

---

## 🔧 Voraussetzungen

### Software

- **Node.js:** >= 18.x
- **Android Studio:** Aktuelle Version (inkl. Android SDK)
- **ADB:** Android Debug Bridge (in Android SDK enthalten)
- **Java:** JDK 17 (für Gradle)

### Android SDK Komponenten

- Android SDK Platform (API Level 34+)
- Android SDK Build-Tools
- Android SDK Platform-Tools

### Geräte-Konfiguration

- USB-Debugging aktiviert auf Android-Gerät
- Entwickleroptionen aktiviert (7x auf Build-Nummer tippen)

---

## 🏗️ Build-Prozess

### 1. Web-Assets bauen

```bash
# Im Projektverzeichnis
cd /home/daniel/Desktop/garmin

# Production Build erstellen
npm run build
```

**Output:**

```
dist/
├── index.html
├── assets/
│   ├── index-[hash].js    (~741 kB, gzip: ~232 kB)
│   └── index-[hash].css   (~52 kB, gzip: ~9 kB)
└── ...
```

### 2. Capacitor synchronisieren

```bash
# Web-Assets und Plugins synchronisieren
npx cap sync android
```

**Was passiert:**

- Kopiert `dist/` nach `android/app/src/main/assets/public/`
- Aktualisiert native Plugins
- Generiert `capacitor.config.json` für Android

### 3. Android Studio öffnen

```bash
# Android Studio mit Projekt öffnen
npx cap open android
```

### 4. APK bauen

**Option A: Debug APK (empfohlen für Entwicklung)**

In Android Studio:

- Menü: **Build → Build Bundle(s) / APK(s) → Build APK(s)**
- APK Location: `android/app/build/outputs/apk/debug/app-debug.apk`

**Option B: Release APK (für Distribution)**

In Android Studio:

- Menü: **Build → Generate Signed Bundle / APK**
- Keystore erstellen/auswählen
- APK signieren

### 5. Direkt auf Gerät starten (Alternative)

Bei verbundenem Gerät:

- In Android Studio: **Run → Run 'app'**
- Oder: Grüner Play-Button in der Toolbar

---

## 📲 Installation via ADB

### Gerät verbinden

```bash
# Verbundene Geräte auflisten
adb devices
```

**Erwartete Ausgabe:**

```
List of devices attached
XXXXXXXXXXXXX    device
```

### APK installieren

```bash
# Neue Installation
adb install android/app/build/outputs/apk/debug/app-debug.apk

# Update (bei bereits installierter App)
adb install -r android/app/build/outputs/apk/debug/app-debug.apk
```

### App starten

```bash
# App über ADB starten
adb shell am start -n com.example.migrainetracker/.MainActivity
```

### App deinstallieren

```bash
adb uninstall com.example.migrainetracker
```

---

## 🔍 Debugging

### Chrome DevTools (Remote Debugging)

1. App auf Gerät starten
2. Chrome öffnen: `chrome://inspect`
3. Gerät und WebView auswählen
4. "Inspect" klicken

### Android Studio Logcat

1. Android Studio öffnen
2. Menü: **View → Tool Windows → Logcat**
3. Filter auf Package: `com.example.migrainetracker`

### Häufige Log-Filter

```bash
# Capacitor Logs
adb logcat -s Capacitor

# WebView Logs
adb logcat | grep -i "chromium"

# Alle App-Logs
adb logcat --pid=$(adb shell pidof com.example.migrainetracker)
```

---

## 📁 Projektstruktur (Android)

```
android/
├── app/
│   ├── build.gradle              # App-Level Build Config
│   ├── src/
│   │   └── main/
│   │       ├── AndroidManifest.xml
│   │       ├── assets/
│   │       │   └── public/       # Web-Assets (von Capacitor kopiert)
│   │       ├── java/             # Native Code
│   │       └── res/              # Android Resources
│   └── build/
│       └── outputs/
│           └── apk/
│               └── debug/
│                   └── app-debug.apk
├── build.gradle                  # Project-Level Build Config
├── capacitor.settings.gradle     # Capacitor Plugin Settings
└── variables.gradle              # Version Variables
```

---

## ⚙️ Capacitor Konfiguration

**Datei:** [capacitor.config.ts](../capacitor.config.ts)

```typescript
const config: CapacitorConfig = {
  appId: 'com.example.migrainetracker',
  appName: 'Migräne Tracker',
  webDir: 'dist',
  server: {
    androidScheme: 'https',
  },
};
```

---

## 🔄 Schneller Entwicklungs-Workflow

### One-Liner für schnelles Update

```bash
# Build + Sync + Install
npm run build && npx cap sync android && adb install -r android/app/build/outputs/apk/debug/app-debug.apk
```

### Live Reload (Entwicklung)

```bash
# 1. Dev Server starten
npm run dev

# 2. In capacitor.config.ts temporär hinzufügen:
# server: {
#   url: 'http://YOUR_LOCAL_IP:5173',
#   cleartext: true
# }

# 3. Sync und App starten
npx cap sync android
# App in Android Studio starten
```

**⚠️ Hinweis:** Live Reload deaktivieren vor Production Build!

---

## 🐛 Troubleshooting

### Problem: "INSTALL_FAILED_UPDATE_INCOMPATIBLE"

**Lösung:** App vorher deinstallieren

```bash
adb uninstall com.example.migrainetracker
adb install android/app/build/outputs/apk/debug/app-debug.apk
```

### Problem: "Device not authorized"

**Lösung:**

1. USB-Kabel neu verbinden
2. "USB-Debugging erlauben" Dialog auf Gerät bestätigen

### Problem: Gradle Build Failed

**Lösung:**

```bash
# Gradle Cache leeren
cd android
./gradlew clean
cd ..
npx cap sync android
```

### Problem: WebView zeigt leere Seite

**Prüfen:**

1. Existiert `android/app/src/main/assets/public/index.html`?
2. War `npm run build` erfolgreich?
3. War `npx cap sync android` erfolgreich?

---

## 📋 Checkliste vor Release

- [ ] `npm run build` erfolgreich (keine Warnings)
- [ ] `npm test` alle Tests bestanden
- [ ] `npx cap sync android` erfolgreich
- [ ] Live Reload URLs aus Config entfernt
- [ ] App auf physischem Gerät getestet
- [ ] PIN-Flow funktioniert
- [ ] Episode erstellen funktioniert
- [ ] Daten werden in IndexedDB gespeichert
- [ ] APK signiert (für Release)

---

## 🔗 Verwandte Dokumentation

- [PAKET_1_Setup_Infrastruktur_2026-01-05.md](PAKET_1_Setup_Infrastruktur_2026-01-05.md) - Capacitor Setup
- [PROJECT_PLAN.md](../PROJECT_PLAN.md) - Gesamtprojekt
- [README.md](README.md) - Dokumentationsübersicht

---

_Zuletzt getestet: 2026-01-05 auf Android-Gerät via ADB_
