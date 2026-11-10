const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Fix: alias node:sea to empty module (Windows Node.js compatibility)
config.resolver.alias = {
  ...config.resolver.alias,
  'node:sea': './empty-module.js',
  'node:sea/': './empty-module.js',
  'node:sea/index': './empty-module.js',
  'sea': './empty-module.js',
};

// Preserve default platforms
config.resolver.platforms = [...(config.resolver.platforms || []), 'ios', 'android', 'web'];

// Add asset extensions (fonts, images for native UI)
config.resolver.assetExts = [
  ...config.resolver.assetExts,
  'ttf', 'woff', 'woff2', 'eot',
];

// Add source extensions
config.resolver.sourceExts = [
  ...config.resolver.sourceExts,
  'jsx', 'js', 'ts', 'tsx', 'json',
];

// Preserve default transformer and add transform options
config.transformer = {
  ...config.transformer,
  getTransformOptions: async () => ({
    transform: {
      experimentalImportSupport: false,
      inlineRequires: true,
    },
  }),
  minifierConfig: {
    keep_fnames: true,
    mangle: {
      keep_fnames: true,
    },
  },
};

// Server middleware to block node:sea requests at HTTP level
config.server = {
  ...config.server,
  enhanceMiddleware: (middleware) => {
    return (req, res, next) => {
      if (req.url && req.url.includes('node:sea')) {
        res.writeHead(404);
        res.end();
        return;
      }
      return middleware(req, res, next);
    };
  },
};

module.exports = config;
