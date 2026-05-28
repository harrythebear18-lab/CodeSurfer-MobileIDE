#!/usr/bin/env node

// Fix Expo startup issues by creating required directories and configurations
const fs = require('fs');
const path = require('path');

console.log('🔧 Fixing Expo startup issues...');

// Create required directories
const createRequiredDirectories = () => {
  const directories = [
    '.expo',
    '.expo/metro',
    '.expo/metro/externals',
    '.expo/metro/externals/node',
    '.expo/metro/externals/node/sea',
  ];

  directories.forEach(dir => {
    const dirPath = path.join(__dirname, '..', dir);
    if (!fs.existsSync(dirPath)) {
      fs.mkdirSync(dirPath, { recursive: true });
      console.log(`✅ Created directory: ${dir}`);
    } else {
      console.log(`ℹ️  Directory already exists: ${dir}`);
    }
  });
};

// Create metro configuration
const createMetroConfig = () => {
  const metroConfig = {
    resolver: {
      alias: {
        // Add any necessary aliases here
      },
    },
    transformer: {
      getTransformOptions: async () => ({
        transform: {
          experimentalImportSupport: false,
          inlineRequires: true,
        },
      }),
    },
  };

  const configPath = path.join(__dirname, '..', 'metro.config.js');
  if (!fs.existsSync(configPath)) {
    fs.writeFileSync(configPath, `module.exports = ${JSON.stringify(metroConfig, null, 2)};`);
    console.log('✅ Created metro.config.js');
  } else {
    console.log('ℹ️  metro.config.js already exists');
  }
};

// Update babel configuration
const updateBabelConfig = () => {
  const babelConfigPath = path.join(__dirname, '..', 'babel.config.js');
  
  if (fs.existsSync(babelConfigPath)) {
    let content = fs.readFileSync(babelConfigPath, 'utf8');
    
    // Ensure we have the required plugins
    if (!content.includes('babel-preset-expo')) {
      content = `module.exports = function(api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
  };
};`;
      fs.writeFileSync(babelConfigPath, content);
      console.log('✅ Updated babel.config.js');
    } else {
      console.log('ℹ️  babel.config.js already configured');
    }
  }
};

// Create .env file if it doesn't exist
const createEnvFile = () => {
  const envPath = path.join(__dirname, '..', '.env');
  
  if (!fs.existsSync(envPath)) {
    const envContent = `# Environment variables
NODE_ENV=development
ENABLE_ADMIN_ACCESS=true
DEV_MODE=true
LOG_LEVEL=debug
`;
    fs.writeFileSync(envPath, envContent);
    console.log('✅ Created .env file');
  } else {
    console.log('ℹ️  .env file already exists');
  }
};

// Clear any problematic caches
const clearCaches = () => {
  const cacheDirs = [
    'node_modules/.cache',
    '.expo/cache',
  ];

  cacheDirs.forEach(dir => {
    const dirPath = path.join(__dirname, '..', dir);
    if (fs.existsSync(dirPath)) {
      try {
        fs.rmSync(dirPath, { recursive: true, force: true });
        console.log(`🗑️  Cleared cache: ${dir}`);
      } catch (error) {
        console.log(`⚠️  Could not clear cache ${dir}: ${error.message}`);
      }
    }
  });
};

// Main fix function
const fixExpoStartup = () => {
  console.log('🚀 Starting Expo startup fixes...');
  
  try {
    createRequiredDirectories();
    createMetroConfig();
    updateBabelConfig();
    createEnvFile();
    clearCaches();
    
    console.log('✅ Expo startup issues fixed!');
    console.log('📝 Try running: npx expo start --clear');
    
  } catch (error) {
    console.error('❌ Error fixing Expo startup:', error);
  }
};

// Run the fix
fixExpoStartup();
