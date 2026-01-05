#!/bin/bash

# OAuth1-Update Build & Deploy Script
# Nach OAuth1-Implementierung neu bauen und synchronisieren

echo "🔨 Building React App..."
npm run build

if [ $? -ne 0 ]; then
    echo "❌ Build failed!"
    exit 1
fi

echo "✅ Build successful!"
echo ""
echo "📱 Syncing to Android..."
npx cap sync

if [ $? -ne 0 ]; then
    echo "❌ Capacitor sync failed!"
    exit 1
fi

echo "✅ Capacitor sync complete!"
echo ""
echo "🚀 Opening Android Studio..."
npx cap open android

echo ""
echo "======================================"
echo "OAuth1-Update erfolgreich!"
echo "======================================"
echo ""
echo "Nächste Schritte:"
echo "1. In Android Studio: App auf Gerät installieren"
echo "2. In der App: Neu einloggen (für OAuth1 Token Secret)"
echo "3. 'Test-Sync Heute' Button klicken"
echo "4. Debug-Log prüfen: Sollte JSON statt HTML zeigen"
echo ""
echo "Erwartete Änderungen:"
echo "✅ JSON-Responses statt HTML-Login-Seiten"
echo "✅ Garmin-Daten in UI sichtbar"
echo "✅ Dashboard Stats Cards mit echten Werten"
echo ""
