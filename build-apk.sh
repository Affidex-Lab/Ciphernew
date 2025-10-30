#!/bin/bash

echo "Building CipherWallet APK..."

# Navigate to Android directory
cd android

# Create local.properties if it doesn't exist
if [ ! -f "local.properties" ]; then
    echo "sdk.dir=/usr/lib/android-sdk" > local.properties
fi

# Make gradlew executable
chmod +x gradlew

# Clean build
./gradlew clean

# Build debug APK
./gradlew assembleDebug

# Check if build was successful
if [ -f "app/build/outputs/apk/debug/app-debug.apk" ]; then
    echo "✅ APK built successfully!"
    echo "📁 APK location: android/app/build/outputs/apk/debug/app-debug.apk"
    
    # Copy to project root for easy access
    cp app/build/outputs/apk/debug/app-debug.apk ../CipherWallet-v1.0.0.apk
    echo "📱 APK copied to: CipherWallet-v1.0.0.apk"
else
    echo "❌ Build failed. Please check the error messages above."
    exit 1
fi