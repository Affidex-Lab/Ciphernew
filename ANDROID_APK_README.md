# CipherWallet Android APK Build Guide

## 📱 Overview

CipherWallet has been successfully configured for Android deployment with the following features:

### ✨ Key Features Implemented

1. **Mobile-Responsive Landing Page**
   - Swipeable sections for easy navigation
   - Touch-optimized interface
   - 4 main sections: Hero, Features, Security, Get Started
   - Page indicators for visual feedback
   - Smooth animations and transitions

2. **Mobile-Optimized Dashboard**
   - Responsive wallet interface
   - Touch-friendly buttons and inputs
   - Proper sizing for mobile screens
   - Bottom-safe areas for modern devices

3. **Android App Configuration**
   - Custom app icons in all required sizes
   - Purple-themed branding (#8876DD)
   - Splash screen with logo
   - Proper app naming and versioning

## 🏗️ Project Structure

```
CipherWallet/
├── android/                    # Android project (Capacitor)
│   ├── app/
│   │   ├── src/main/res/       # Android resources
│   │   │   ├── mipmap-*/       # App icons (all sizes)
│   │   │   ├── drawable/       # Splash screen
│   │   │   └── values/         # App strings
│   │   └── build.gradle        # Build configuration
├── src/
│   ├── pages/
│   │   ├── Landing.tsx         # Desktop landing page
│   │   └── MobileLanding.tsx   # Mobile landing page with swipe
│   └── index.css               # Mobile-responsive styles
├── capacitor.config.ts         # Capacitor configuration
└── android-manifest.json       # App metadata
```

## 📲 Building the APK

### Option 1: Using Android Studio (Recommended)

1. **Install Android Studio**
   - Download from: https://developer.android.com/studio
   - Install with default settings

2. **Open the Project**
   ```bash
   cd /project/workspace/affidexlab/Cipherupgraded
   # Open Android Studio and select "Open" 
   # Navigate to the 'android' folder
   ```

3. **Build the APK**
   - In Android Studio: Build → Build Bundle(s) / APK(s) → Build APK(s)
   - APK will be generated in: `android/app/build/outputs/apk/debug/app-debug.apk`

### Option 2: Command Line Build

1. **Install Prerequisites**
   ```bash
   # Install Java JDK 17
   sudo apt-get update
   sudo apt-get install openjdk-17-jdk
   
   # Install Android SDK
   # Download from: https://developer.android.com/studio#command-tools
   ```

2. **Set Environment Variables**
   ```bash
   export ANDROID_HOME=$HOME/android-sdk
   export PATH=$PATH:$ANDROID_HOME/platform-tools:$ANDROID_HOME/tools
   ```

3. **Build the APK**
   ```bash
   cd android
   chmod +x gradlew
   ./gradlew assembleDebug
   ```

### Option 3: Using Web-to-APK Services

For quick testing, you can use online services:

1. **PWA to APK Converter**
   - Visit: https://www.pwabuilder.com/
   - Enter URL: https://cipherwalletmvp.netlify.app
   - Configure with the settings from `android-manifest.json`
   - Download generated APK

2. **Trusted Web Activity (TWA)**
   - Use Bubblewrap CLI: https://github.com/GoogleChromeLabs/bubblewrap
   - Configure with manifest settings
   - Generate signed APK

## 🎨 Customization Details

### App Icons
- Location: `android/app/src/main/res/mipmap-*/`
- Sizes: hdpi (72px), mdpi (48px), xhdpi (96px), xxhdpi (144px), xxxhdpi (192px)
- Background: Purple (#8876DD) with white logo

### Splash Screen
- Location: `android/app/src/main/res/drawable/splash.png`
- Size: 1024x1024px
- Duration: 2 seconds

### Mobile Features
- **Swipe Navigation**: Users can swipe left/right between landing page sections
- **Touch Optimization**: All buttons are minimum 48px height for easy tapping
- **Responsive Layout**: Automatically adjusts to different screen sizes
- **Native Feel**: Smooth animations and transitions

## 📋 App Information

- **Package Name**: com.cipherwallet.app
- **Version**: 1.0.0
- **Min SDK**: 21 (Android 5.0+)
- **Target SDK**: 33 (Android 13)
- **Orientation**: Portrait

## 🚀 Deployment Options

### Google Play Store
1. Generate signed APK/AAB
2. Create developer account ($25 one-time fee)
3. Upload to Play Console
4. Fill app listing details
5. Submit for review

### Direct APK Distribution
1. Build debug or release APK
2. Host on your website
3. Users enable "Unknown sources" to install
4. Consider using app signing for security

### Alternative Stores
- Amazon Appstore
- Samsung Galaxy Store
- F-Droid (for open source)
- APKPure
- Aptoide

## 🔒 Security Considerations

1. **Enable ProGuard** for release builds to obfuscate code
2. **Use App Signing** by Google Play for added security
3. **Implement Certificate Pinning** for API calls
4. **Enable SafetyNet** for device integrity checks

## 📱 Testing

### Local Testing
1. Enable Developer Options on Android device
2. Enable USB Debugging
3. Connect device via USB
4. Run: `adb install app-debug.apk`

### Emulator Testing
1. Open Android Studio
2. Create AVD (Android Virtual Device)
3. Install APK on emulator
4. Test all features

## 🐛 Troubleshooting

### Common Issues

1. **Build Failed - SDK Not Found**
   - Ensure ANDROID_HOME is set correctly
   - Accept all SDK licenses

2. **Icons Not Showing**
   - Verify icon paths in manifest
   - Check icon file formats (PNG required)

3. **App Crashes on Launch**
   - Check minimum SDK version
   - Review logcat for errors
   - Ensure all permissions are granted

## 📞 Support

For issues or questions:
- GitHub Issues: [Create Issue]
- Documentation: Check `/docs` folder
- Community: Join Discord/Slack

## 🎉 Success!

Your CipherWallet Android app is now ready with:
- ✅ Beautiful mobile-responsive design
- ✅ Swipeable landing page sections
- ✅ Optimized wallet dashboard
- ✅ Custom branding and icons
- ✅ Native Android configuration

The app provides a smooth, native-like experience while maintaining all the security and functionality of the web version.