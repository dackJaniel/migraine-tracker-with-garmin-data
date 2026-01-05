#!/bin/bash
# Quick deploy script for Android

set -e

echo "🔨 Building web assets..."
npm run build

echo "📱 Syncing to Android..."
npx cap sync

echo "🏗️ Building APK..."
cd android
export JAVA_HOME=/usr/lib/jvm/java-21-openjdk-amd64
./gradlew assembleDebug

echo "📲 Installing on device..."
adb install -r app/build/outputs/apk/debug/app-debug.apk

echo "✅ Done! App installed."
