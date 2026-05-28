#!/usr/bin/env node

// Development build script
// This script builds the app with development configuration including admin access

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🔧 Building CodeSurfer MobileIDE for DEVELOPMENT...');

// Copy development environment file
const devEnvPath = path.join(__dirname, '../.env.development');
const envPath = path.join(__dirname, '../.env');

if (fs.existsSync(devEnvPath)) {
  fs.copyFileSync(devEnvPath, envPath);
  console.log('✅ Development environment file loaded');
} else {
  console.log('⚠️  Development environment file not found, using defaults');
}

// Set development mode
process.env.NODE_ENV = 'development';
process.env.ENABLE_ADMIN_ACCESS = 'true';

// Build with development configuration
try {
  console.log('🚀 Starting development build...');
  execSync('npx expo build:android --release-channel development', { stdio: 'inherit' });
  console.log('✅ Development build completed successfully!');
} catch (error) {
  console.error('❌ Development build failed:', error.message);
  process.exit(1);
}
