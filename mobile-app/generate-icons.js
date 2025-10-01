// Icon generation script for CleanIT app
// This script converts SVG files to various PNG sizes needed for mobile apps

const fs = require('fs');
const path = require('path');

// Icon sizes for different platforms
const iconSizes = {
  // iOS App Icons
  ios: [
    { size: 1024, name: 'icon-1024.png', desc: 'App Store' },
    { size: 180, name: 'icon-180.png', desc: 'iPhone App iOS 14+' },
    { size: 167, name: 'icon-167.png', desc: 'iPad Pro' },
    { size: 152, name: 'icon-152.png', desc: 'iPad' },
    { size: 120, name: 'icon-120.png', desc: 'iPhone App iOS 7-13' },
    { size: 87, name: 'icon-87.png', desc: 'iPhone Settings' },
    { size: 80, name: 'icon-80.png', desc: 'iPad Settings' },
    { size: 76, name: 'icon-76.png', desc: 'iPad App iOS 7+' },
    { size: 58, name: 'icon-58.png', desc: 'iPhone Settings iOS 7+' },
    { size: 40, name: 'icon-40.png', desc: 'Spotlight' },
    { size: 29, name: 'icon-29.png', desc: 'Settings' },
  ],
  
  // Android Icons
  android: [
    { size: 1024, name: 'icon-android-1024.png', desc: 'Play Store' },
    { size: 432, name: 'icon-android-432.png', desc: 'xxxhdpi' },
    { size: 324, name: 'icon-android-324.png', desc: 'xxhdpi' },
    { size: 216, name: 'icon-android-216.png', desc: 'xhdpi' },
    { size: 162, name: 'icon-android-162.png', desc: 'hdpi' },
    { size: 108, name: 'icon-android-108.png', desc: 'mdpi' },
  ],
  
  // Web Favicons
  web: [
    { size: 512, name: 'favicon-512.png', desc: 'Large favicon' },
    { size: 256, name: 'favicon-256.png', desc: 'Medium favicon' },
    { size: 192, name: 'favicon-192.png', desc: 'Android Chrome' },
    { size: 128, name: 'favicon-128.png', desc: 'Small favicon' },
    { size: 96, name: 'favicon-96.png', desc: 'Android Chrome small' },
    { size: 64, name: 'favicon-64.png', desc: 'Browser tab' },
    { size: 32, name: 'favicon-32.png', desc: 'Browser tab small' },
    { size: 16, name: 'favicon-16.png', desc: 'Browser tab tiny' },
  ]
};

// Generate conversion commands
function generateConversionCommands() {
  const commands = [];
  
  // Main icon conversions
  iconSizes.ios.concat(iconSizes.android).forEach(icon => {
    commands.push(`# ${icon.desc} (${icon.size}x${icon.size})`);
    commands.push(`rsvg-convert -w ${icon.size} -h ${icon.size} assets/icon.svg > assets/${icon.name}`);
    commands.push('');
  });
  
  // Favicon conversions
  iconSizes.web.forEach(icon => {
    commands.push(`# ${icon.desc} (${icon.size}x${icon.size})`);
    commands.push(`rsvg-convert -w ${icon.size} -h ${icon.size} assets/favicon.svg > assets/${icon.name}`);
    commands.push('');
  });
  
  // Adaptive icon (Android)
  commands.push('# Android Adaptive Icon');
  commands.push('rsvg-convert -w 432 -h 432 assets/adaptive-icon.svg > assets/adaptive-icon.png');
  commands.push('');
  
  // Splash screen
  commands.push('# Splash Screen');
  commands.push('rsvg-convert -w 1242 -h 2688 assets/splash.svg > assets/splash.png');
  commands.push('rsvg-convert -w 828 -h 1792 assets/splash.svg > assets/splash-small.png');
  
  return commands;
}

// Generate npm script for icon generation
const npmScript = {
  "generate-icons": "node generate-icons.js",
  "install-deps": "npm install -g librsvg",
  "convert-icons": "bash convert-icons.sh"
};

// Create conversion script
const conversionScript = `#!/bin/bash
# CleanIT Icon Conversion Script
# Requires librsvg: npm install -g librsvg (or brew install librsvg on macOS)

echo "🎨 Converting CleanIT app icons..."
echo "📱 Generating iOS icons..."

${generateConversionCommands().join('\n')}

echo "✅ Icon conversion completed!"
echo "📁 Generated icons are in the assets/ directory"
`;

// Write conversion script
fs.writeFileSync(path.join(__dirname, 'convert-icons.sh'), conversionScript);
fs.chmodSync(path.join(__dirname, 'convert-icons.sh'), '755');

console.log('📝 Icon generation setup completed!');
console.log('');
console.log('🔧 To convert icons, you need librsvg:');
console.log('   macOS: brew install librsvg');
console.log('   Ubuntu: sudo apt-get install librsvg2-bin');
console.log('   Windows: Use WSL or online converter');
console.log('');
console.log('▶️  Run: ./convert-icons.sh');
console.log('');
console.log('📁 Generated files:');
console.log('   ├── assets/icon.svg (Main app icon)');
console.log('   ├── assets/adaptive-icon.svg (Android adaptive)');
console.log('   ├── assets/splash.svg (Splash screen)');
console.log('   ├── assets/favicon.svg (Web favicon)');
console.log('   └── convert-icons.sh (Conversion script)');

// Output some useful information
console.log('');
console.log('🎨 Design Details:');
console.log('   • Style: Modern minimalist with gradient background');
console.log('   • Colors: CleanIT brand blue (#2196F3 → #1976D2)');
console.log('   • Symbol: Professional cleaning brush with quality stars');
console.log('   • Elements: White brush, golden stars, subtle bubbles');
console.log('   • Shadow: Soft drop shadows for depth');
console.log('');
console.log('✨ Features:');
console.log('   • Scalable SVG format');
console.log('   • Platform-optimized versions');
console.log('   • High-quality gradients and effects');
console.log('   • Brand-consistent color scheme');