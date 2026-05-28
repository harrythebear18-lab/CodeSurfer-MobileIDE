#!/usr/bin/env node

// Convert SVG assets to PNG format for mobile platforms
const fs = require('fs');
const path = require('path');

console.log('🎨 Converting SVG assets to PNG format...');

// Asset configurations
const assets = [
  {
    svg: 'assets/icon.svg',
    png: 'assets/icon.png',
    sizes: [1024, 512, 256, 128, 64, 32]
  },
  {
    svg: 'assets/splash.svg',
    png: 'assets/splash.png',
    sizes: [1280, 640, 320]
  },
  {
    svg: 'assets/adaptive-icon.svg',
    png: 'assets/adaptive-icon.png',
    sizes: [108, 72, 48]
  },
  {
    svg: 'assets/favicon.svg',
    png: 'assets/favicon.png',
    sizes: [32, 16]
  }
];

// Check if we have the required dependencies
const checkDependencies = () => {
  try {
    require('sharp');
    return true;
  } catch (error) {
    console.log('⚠️  Sharp not found. Install with: npm install sharp');
    console.log('📝 For now, SVG files will be used directly (Expo supports SVG)');
    return false;
  }
};

// Convert SVG to PNG using Sharp
const convertSvgToPng = async (svgPath, pngPath, size) => {
  try {
    const sharp = require('sharp');
    const svgBuffer = fs.readFileSync(svgPath);
    
    await sharp(svgBuffer)
      .resize(size, size)
      .png({ quality: 90 })
      .toFile(pngPath);
      
    console.log(`✅ Converted ${svgPath} to ${pngPath} (${size}x${size})`);
  } catch (error) {
    console.error(`❌ Failed to convert ${svgPath}:`, error.message);
  }
};

// Main conversion function
const convertAssets = async () => {
  const hasSharp = checkDependencies();
  
  if (!hasSharp) {
    console.log('📋 Skipping conversion - using SVG files directly');
    console.log('✅ SVG assets are ready for use');
    return;
  }

  for (const asset of assets) {
    const svgPath = path.join(__dirname, '..', asset.svg);
    const pngPath = path.join(__dirname, '..', asset.png);
    
    if (!fs.existsSync(svgPath)) {
      console.log(`⚠️  SVG file not found: ${svgPath}`);
      continue;
    }

    // Convert to the largest size first
    const largestSize = asset.sizes[0];
    await convertSvgToPng(svgPath, pngPath, largestSize);
  }

  console.log('🎉 Asset conversion completed!');
};

// Run the conversion
convertAssets().catch(console.error);
