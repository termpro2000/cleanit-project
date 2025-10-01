#!/bin/bash
# CleanIT Icon Conversion Script
# Requires librsvg: npm install -g librsvg (or brew install librsvg on macOS)

echo "🎨 Converting CleanIT app icons..."
echo "📱 Generating iOS icons..."

# App Store (1024x1024)
rsvg-convert -w 1024 -h 1024 assets/icon.svg > assets/icon-1024.png

# iPhone App iOS 14+ (180x180)
rsvg-convert -w 180 -h 180 assets/icon.svg > assets/icon-180.png

# iPad Pro (167x167)
rsvg-convert -w 167 -h 167 assets/icon.svg > assets/icon-167.png

# iPad (152x152)
rsvg-convert -w 152 -h 152 assets/icon.svg > assets/icon-152.png

# iPhone App iOS 7-13 (120x120)
rsvg-convert -w 120 -h 120 assets/icon.svg > assets/icon-120.png

# iPhone Settings (87x87)
rsvg-convert -w 87 -h 87 assets/icon.svg > assets/icon-87.png

# iPad Settings (80x80)
rsvg-convert -w 80 -h 80 assets/icon.svg > assets/icon-80.png

# iPad App iOS 7+ (76x76)
rsvg-convert -w 76 -h 76 assets/icon.svg > assets/icon-76.png

# iPhone Settings iOS 7+ (58x58)
rsvg-convert -w 58 -h 58 assets/icon.svg > assets/icon-58.png

# Spotlight (40x40)
rsvg-convert -w 40 -h 40 assets/icon.svg > assets/icon-40.png

# Settings (29x29)
rsvg-convert -w 29 -h 29 assets/icon.svg > assets/icon-29.png

# Play Store (1024x1024)
rsvg-convert -w 1024 -h 1024 assets/icon.svg > assets/icon-android-1024.png

# xxxhdpi (432x432)
rsvg-convert -w 432 -h 432 assets/icon.svg > assets/icon-android-432.png

# xxhdpi (324x324)
rsvg-convert -w 324 -h 324 assets/icon.svg > assets/icon-android-324.png

# xhdpi (216x216)
rsvg-convert -w 216 -h 216 assets/icon.svg > assets/icon-android-216.png

# hdpi (162x162)
rsvg-convert -w 162 -h 162 assets/icon.svg > assets/icon-android-162.png

# mdpi (108x108)
rsvg-convert -w 108 -h 108 assets/icon.svg > assets/icon-android-108.png

# Large favicon (512x512)
rsvg-convert -w 512 -h 512 assets/favicon.svg > assets/favicon-512.png

# Medium favicon (256x256)
rsvg-convert -w 256 -h 256 assets/favicon.svg > assets/favicon-256.png

# Android Chrome (192x192)
rsvg-convert -w 192 -h 192 assets/favicon.svg > assets/favicon-192.png

# Small favicon (128x128)
rsvg-convert -w 128 -h 128 assets/favicon.svg > assets/favicon-128.png

# Android Chrome small (96x96)
rsvg-convert -w 96 -h 96 assets/favicon.svg > assets/favicon-96.png

# Browser tab (64x64)
rsvg-convert -w 64 -h 64 assets/favicon.svg > assets/favicon-64.png

# Browser tab small (32x32)
rsvg-convert -w 32 -h 32 assets/favicon.svg > assets/favicon-32.png

# Browser tab tiny (16x16)
rsvg-convert -w 16 -h 16 assets/favicon.svg > assets/favicon-16.png

# Android Adaptive Icon
rsvg-convert -w 432 -h 432 assets/adaptive-icon.svg > assets/adaptive-icon.png

# Splash Screen
rsvg-convert -w 1242 -h 2688 assets/splash.svg > assets/splash.png
rsvg-convert -w 828 -h 1792 assets/splash.svg > assets/splash-small.png

echo "✅ Icon conversion completed!"
echo "📁 Generated icons are in the assets/ directory"
