#!/usr/bin/env node

// Production build script
// This script builds the app for production with NO admin access

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🔒 Building CodeSurfer MobileIDE for PRODUCTION...');

// Copy production environment file
const prodEnvPath = path.join(__dirname, '../.env.production');
const envPath = path.join(__dirname, '../.env');

if (fs.existsSync(prodEnvPath)) {
  fs.copyFileSync(prodEnvPath, envPath);
  console.log('✅ Production environment file loaded');
} else {
  console.log('⚠️  Production environment file not found, using defaults');
}

// Set production mode
process.env.NODE_ENV = 'production';
process.env.ENABLE_ADMIN_ACCESS = 'false';

// Remove any admin-related files from production build
const adminServicePath = path.join(__dirname, '../src/services/adminAuthService.js');
if (fs.existsSync(adminServicePath)) {
  // Create a production-safe version of admin service
  const productionAdminService = `import * as SecureStore from 'expo-secure-store';

export class AdminAuthService {
  static async signIn(username, password) {
    // Admin access is disabled in production
    return {
      success: false,
      error: 'Admin access is not available in production',
    };
  }

  static async getCurrentAdmin() {
    return null;
  }

  static async signOut() {
    return { success: true };
  }

  static async isAdminSession() {
    return false;
  }
}`;
  
  fs.writeFileSync(adminServicePath, productionAdminService);
  console.log('✅ Admin service secured for production');
}

// Build with production configuration
try {
  console.log('🚀 Starting production build...');
  execSync('npx expo build:android --release-channel production', { stdio: 'inherit' });
  console.log('✅ Production build completed successfully!');
  console.log('🔒 Admin access is completely disabled in this build');
} catch (error) {
  console.error('❌ Production build failed:', error.message);
  process.exit(1);
}
