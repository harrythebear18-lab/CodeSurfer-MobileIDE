#!/usr/bin/env node

// Prepare user-side branch for public deployment
// This script removes admin features and locks down source code for public release

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🔒 Preparing user-side branch for public deployment...');

// Remove admin authentication service
const adminServicePath = path.join(__dirname, '../src/services/adminAuthService.js');
if (fs.existsSync(adminServicePath)) {
  const productionAdminService = `import * as SecureStore from 'expo-secure-store';

export class AdminAuthService {
  static async signIn(username, password) {
    // Admin access is disabled in public builds
    return {
      success: false,
      error: 'Admin access is not available in this version',
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
  console.log('✅ Admin service disabled for public build');
}

// Update LoginScreen to remove admin mode
const loginScreenPath = path.join(__dirname, '../src/screens/LoginScreen.js');
if (fs.existsSync(loginScreenPath)) {
  let loginContent = fs.readFileSync(loginScreenPath, 'utf8');
  
  // Remove admin mode toggle and related code
  loginContent = loginContent.replace(/const \[isAdminMode, setIsAdminMode\] = useState\(false\);/g, '');
  loginContent = loginContent.replace(/isAdminMode, /g, '');
  loginContent = loginContent.replace(/setIsAdminMode\(false\);/g, '');
  loginContent = loginContent.replace(/import { Switch } from 'react-native-paper';/g, '');
  loginContent = loginContent.replace(/import { AdminAuthService } from '..\/services\/adminAuthService';/g, '');
  
  // Remove admin mode toggle UI
  loginContent = loginContent.replace(/<View style={styles\.adminToggleContainer}>[\s\S]*?<\/View>/g, '');
  
  // Simplify login logic to remove admin check
  loginContent = loginContent.replace(/if \(isAdminMode\) {[\s\S]*?} else {[\s\S]*?}/g, `
    // Regular user login only
    const result = await thunks.signIn(email.trim(), password.trim());
    
    if (result.success) {
      Alert.alert('Success', 'Login successful');
      navigation.replace('Home');
    } else {
      Alert.alert('Error', result.error);
    }`);
  
  // Update button text
  loginContent = loginContent.replace(/{isAdminMode \? 'Admin Login' : 'Sign In'}/g, "'Sign In'");
  
  fs.writeFileSync(loginScreenPath, loginContent);
  console.log('✅ LoginScreen updated for public build');
}

// Update package.json to remove admin scripts
const packageJsonPath = path.join(__dirname, '../package.json');
if (fs.existsSync(packageJsonPath)) {
  const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
  
  // Remove admin-related scripts
  delete packageJson.scripts['start:dev'];
  delete packageJson.scripts['build:dev'];
  
  fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2));
  console.log('✅ Package.json updated for public build');
}

// Create public-only environment file
const publicEnvPath = path.join(__dirname, '../.env.public');
const publicEnvContent = `# Public Environment Configuration
# This file contains public-only settings with NO admin access

# Firebase Configuration (Public)
FIREBASE_API_KEY=your_public_firebase_api_key
FIREBASE_AUTH_DOMAIN=your-public-project.firebaseapp.com
FIREBASE_PROJECT_ID=your-public-project-id
FIREBASE_STORAGE_BUCKET=your-public-project.appspot.com
FIREBASE_MESSAGING_SENDER_ID=your_public_messaging_sender_id
FIREBASE_APP_ID=your_public_app_id

# GitHub Integration (Public)
GITHUB_TOKEN=your_public_github_token

# AI Services (Public)
OPENAI_API_KEY=your_public_openai_api_key

# Public Settings
DEV_MODE=false
LOG_LEVEL=error
ENABLE_ADMIN_ACCESS=false

# Expo Configuration (Public)
EXPO_PUBLIC_API_URL=https://api.codesurfer.dev
EXPO_PUBLIC_GITHUB_CLIENT_ID=your_public_github_client_id

# ADMIN ACCESS IS COMPLETELY DISABLED IN PUBLIC BUILDS
`;

fs.writeFileSync(publicEnvPath, publicEnvContent);
console.log('✅ Public environment file created');

// Remove development environment files
const devEnvPath = path.join(__dirname, '../.env.development');
if (fs.existsSync(devEnvPath)) {
  fs.unlinkSync(devEnvPath);
  console.log('✅ Development environment file removed');
}

console.log('🎉 User-side branch prepared for public deployment!');
console.log('🔒 Admin features disabled and source code locked down');
