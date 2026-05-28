import * as FileSystem from 'expo-file-system';
import { FileSystemService } from './fileSystemService';

export class PluginService {
  static PLUGIN_DIR = `${FileSystem.documentDirectory}plugins/`;
  static CONFIG_FILE = `${FileSystem.documentDirectory}plugins.json`;
  
  static async initializePluginSystem() {
    try {
      // Create plugins directory
      await FileSystemService.createDirectory(this.PLUGIN_DIR);
      
      // Initialize plugin registry
      const defaultConfig = {
        enabled: true,
        plugins: {},
        marketplace: {
          url: 'https://api.codesurfer.dev/plugins',
          version: '1.0.0',
        },
        security: {
          sandboxed: true,
          requirePermissions: true,
          allowedDomains: ['github.com', 'codesurfer.dev'],
        },
      };
      
      await FileSystemService.createFile(this.CONFIG_FILE, JSON.stringify(defaultConfig, null, 2));
      
      return {
        success: true,
        message: 'Plugin system initialized',
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
      };
    }
  }

  static async loadPlugin(pluginPath) {
    try {
      const pluginConfig = await this.getPluginConfig();
      
      // Read plugin manifest
      const manifestPath = `${pluginPath}plugin.json`;
      const manifestExists = await FileSystem.getInfoAsync(manifestPath);
      
      if (!manifestExists.exists) {
        throw new Error('Plugin manifest not found');
      }
      
      const manifest = JSON.parse(await FileSystem.readFileAsString(manifestPath));
      
      // Validate plugin
      const validation = await this.validatePlugin(manifest, pluginPath);
      if (!validation.valid) {
        throw new Error(`Plugin validation failed: ${validation.error}`);
      }
      
      // Check if plugin is already loaded
      if (pluginConfig.plugins[manifest.id]) {
        throw new Error('Plugin already loaded');
      }
      
      // Load plugin code
      const pluginCode = await this.loadPluginCode(pluginPath, manifest);
      
      // Create plugin instance
      const plugin = await this.createPluginInstance(manifest, pluginCode);
      
      // Initialize plugin
      await this.initializePlugin(plugin);
      
      // Register plugin
      pluginConfig.plugins[manifest.id] = {
        manifest,
        instance: plugin,
        enabled: true,
        loadedAt: new Date().toISOString(),
      };
      
      await FileSystemService.writeAsStringAsync(this.CONFIG_FILE, JSON.stringify(pluginConfig, null, 2));
      
      return {
        success: true,
        plugin: manifest,
        message: `Plugin ${manifest.name} loaded successfully`,
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
      };
    }
  }

  static async validatePlugin(manifest, pluginPath) {
    try {
      // Required fields
      const required = ['id', 'name', 'version', 'main', 'permissions'];
      for (const field of required) {
        if (!manifest[field]) {
          return {
            valid: false,
            error: `Missing required field: ${field}`,
          };
        }
      }
      
      // Check plugin ID format
      if (!/^[a-zA-Z0-9-_\.]+$/.test(manifest.id)) {
        return {
          valid: false,
          error: 'Invalid plugin ID format',
        };
      }
      
      // Check main file exists
      const mainPath = `${pluginPath}${manifest.main}`;
      const mainExists = await FileSystem.getInfoAsync(mainPath);
      
      if (!mainExists.exists) {
        return {
          valid: false,
          error: `Main file not found: ${manifest.main}`,
        };
      }
      
      // Validate permissions
      const validPermissions = [
        'file.read', 'file.write', 'file.execute',
        'network.http', 'network.websocket',
        'system.shell', 'system.process',
        'editor.read', 'editor.write',
        'terminal.execute',
      ];
      
      for (const permission of manifest.permissions) {
        if (!validPermissions.includes(permission)) {
          return {
            valid: false,
            error: `Invalid permission: ${permission}`,
          };
        }
      }
      
      // Check dependencies
      if (manifest.dependencies) {
        for (const dep of manifest.dependencies) {
          if (!await this.checkDependency(dep)) {
            return {
              valid: false,
              error: `Missing dependency: ${dep}`,
            };
          }
        }
      }
      
      return {
        valid: true,
      };
    } catch (error) {
      return {
        valid: false,
        error: error.message,
      };
    }
  }

  static async loadPluginCode(pluginPath, manifest) {
    try {
      const mainPath = `${pluginPath}${manifest.main}`;
      const code = await FileSystem.readFileAsString(mainPath);
      
      // Create sandboxed environment
      const sandboxedCode = this.createSandboxedCode(code, manifest);
      
      return sandboxedCode;
    } catch (error) {
      throw new Error(`Failed to load plugin code: ${error.message}`);
    }
  }

  static createSandboxedCode(code, manifest) {
    // Create sandboxed execution environment
    const sandboxedWrapper = `
(function() {
  'use strict';
  
  // Plugin sandbox
  const sandbox = {
    console: {
      log: (...args) => {
        // Forward to main console with plugin identifier
        console.log(\`[Plugin:${manifest.id}]\`, ...args);
      },
      error: (...args) => {
        console.error(\`[Plugin:${manifest.id}]\`, ...args);
      },
      warn: (...args) => {
        console.warn(\`[Plugin:${manifest.id}]\`, ...args);
      }
    },
    
    // API surface
    api: {
      editor: {
        getCurrentFile: () => window.CodeSurferAPI?.getCurrentFile?.(),
        insertText: (text) => window.CodeSurferAPI?.insertText?.(text),
        replaceSelection: (text) => window.CodeSurferAPI?.replaceSelection?.(text),
      },
      terminal: {
        execute: (command) => window.CodeSurferAPI?.executeCommand?.(command),
        write: (text) => window.CodeSurferAPI?.writeToTerminal?.(text),
      },
      fileSystem: {
        readFile: (path) => window.CodeSurferAPI?.readFile?.(path),
        writeFile: (path, content) => window.CodeSurferAPI?.writeFile?.(path, content),
        listFiles: (path) => window.CodeSurferAPI?.listFiles?.(path),
      },
      ui: {
        showNotification: (message, type) => window.CodeSurferAPI?.showNotification?.(message, type),
        showDialog: (options) => window.CodeSurferAPI?.showDialog?.(options),
        addMenuItem: (item) => window.CodeSurferAPI?.addMenuItem?.(item),
      },
      network: {
        fetch: (url, options) => window.fetch(url, options),
      },
    },
    
    // Plugin metadata
    plugin: {
      id: '${manifest.id}',
      name: '${manifest.name}',
      version: '${manifest.version}',
      permissions: ${JSON.stringify(manifest.permissions)},
    }
  };
  
  // Execute plugin code with sandbox
  ${code}
  
  // Return plugin exports
  return typeof module !== 'undefined' ? module.exports : {};
})();
    `;
    
    return sandboxedWrapper;
  }

  static async createPluginInstance(manifest, pluginCode) {
    try {
      // Evaluate plugin code in sandbox
      const pluginFunction = new Function('sandbox', pluginCode);
      const plugin = pluginFunction({});
      
      return plugin;
    } catch (error) {
      throw new Error(`Failed to create plugin instance: ${error.message}`);
    }
  }

  static async initializePlugin(plugin) {
    try {
      // Call plugin's initialize method if it exists
      if (typeof plugin.initialize === 'function') {
        await plugin.initialize();
      }
      
      // Register plugin hooks
      if (plugin.hooks) {
        for (const [hookName, handler] of Object.entries(plugin.hooks)) {
          await this.registerHook(hookName, handler);
        }
      }
      
      // Register plugin commands
      if (plugin.commands) {
        for (const [commandName, handler] of Object.entries(plugin.commands)) {
          await this.registerCommand(commandName, handler);
        }
      }
      
      return {
        success: true,
      };
    } catch (error) {
      throw new Error(`Failed to initialize plugin: ${error.message}`);
    }
  }

  static async unloadPlugin(pluginId) {
    try {
      const pluginConfig = await this.getPluginConfig();
      const plugin = pluginConfig.plugins[pluginId];
      
      if (!plugin) {
        throw new Error('Plugin not found');
      }
      
      // Call plugin's cleanup method if it exists
      if (plugin.instance && typeof plugin.instance.cleanup === 'function') {
        await plugin.instance.cleanup();
      }
      
      // Unregister hooks and commands
      await this.unregisterPluginHooks(pluginId);
      await this.unregisterPluginCommands(pluginId);
      
      // Remove from config
      delete pluginConfig.plugins[pluginId];
      await FileSystemService.writeAsStringAsync(this.CONFIG_FILE, JSON.stringify(pluginConfig, null, 2));
      
      return {
        success: true,
        message: `Plugin ${pluginId} unloaded successfully`,
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
      };
    }
  }

  static async getInstalledPlugins() {
    try {
      const pluginConfig = await this.getPluginConfig();
      
      const plugins = Object.entries(pluginConfig.plugins).map(([id, data]) => ({
        id,
        name: data.manifest.name,
        version: data.manifest.version,
        description: data.manifest.description,
        author: data.manifest.author,
        enabled: data.enabled,
        loadedAt: data.loadedAt,
        permissions: data.manifest.permissions,
      }));
      
      return {
        success: true,
        plugins,
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        plugins: [],
      };
    }
  }

  static async searchMarketplace(query, category = null) {
    try {
      const pluginConfig = await this.getPluginConfig();
      const marketplaceUrl = `${pluginConfig.marketplace.url}/search`;
      
      const searchParams = new URLSearchParams({
        q: query,
        category: category || '',
        version: pluginConfig.marketplace.version,
      });
      
      // In a real implementation, this would make an actual API call
      // For now, we'll simulate marketplace search
      const mockResults = [
        {
          id: 'codesurfer.theme.dark-plus',
          name: 'Dark Plus Theme',
          description: 'A dark theme inspired by VS Code',
          version: '1.2.0',
          author: 'CodeSurfer Team',
          category: 'theme',
          downloads: 1234,
          rating: 4.8,
        },
        {
          id: 'codesurfer.lint.eslint',
          name: 'ESLint Integration',
          description: 'Real-time ESLint integration',
          version: '2.1.0',
          author: 'CodeSurfer Community',
          category: 'linting',
          downloads: 892,
          rating: 4.6,
        },
        {
          id: 'codesurfer.snippets.react',
          name: 'React Snippets',
          description: 'React component snippets',
          version: '1.5.0',
          author: 'React Community',
          category: 'snippets',
          downloads: 2341,
          rating: 4.9,
        },
      ];
      
      // Filter results based on query
      const filtered = mockResults.filter(plugin => 
        plugin.name.toLowerCase().includes(query.toLowerCase()) ||
        plugin.description.toLowerCase().includes(query.toLowerCase())
      );
      
      return {
        success: true,
        results: filtered,
        total: filtered.length,
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        results: [],
      };
    }
  }

  static async installPlugin(pluginId) {
    try {
      // Get plugin info from marketplace
      const pluginInfo = await this.getPluginInfo(pluginId);
      
      if (!pluginInfo.success) {
        throw new Error('Plugin not found in marketplace');
      }
      
      // Download plugin
      const downloadResult = await this.downloadPlugin(pluginInfo.data);
      
      if (!downloadResult.success) {
        throw new Error(downloadResult.error);
      }
      
      // Install plugin
      const installResult = await this.loadPlugin(downloadResult.pluginPath);
      
      return installResult;
    } catch (error) {
      return {
        success: false,
        error: error.message,
      };
    }
  }

  static async getPluginInfo(pluginId) {
    try {
      const pluginConfig = await this.getPluginConfig();
      const marketplaceUrl = `${pluginConfig.marketplace.url}/plugins/${pluginId}`;
      
      // Simulate API call
      const mockPluginInfo = {
        'codesurfer.theme.dark-plus': {
          id: 'codesurfer.theme.dark-plus',
          name: 'Dark Plus Theme',
          description: 'A dark theme inspired by VS Code',
          version: '1.2.0',
          author: 'CodeSurfer Team',
          downloadUrl: 'https://github.com/codesurfer/themes/dark-plus',
          permissions: ['editor.read', 'editor.write'],
          dependencies: [],
        },
        'codesurfer.lint.eslint': {
          id: 'codesurfer.lint.eslint',
          name: 'ESLint Integration',
          description: 'Real-time ESLint integration',
          version: '2.1.0',
          author: 'CodeSurfer Community',
          downloadUrl: 'https://github.com/codesurfer/linters/eslint',
          permissions: ['editor.read', 'file.read', 'file.write'],
          dependencies: ['eslint'],
        },
      };
      
      const pluginData = mockPluginInfo[pluginId];
      
      if (!pluginData) {
        throw new Error('Plugin not found');
      }
      
      return {
        success: true,
        data: pluginData,
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
      };
    }
  }

  static async downloadPlugin(pluginInfo) {
    try {
      const pluginDir = `${this.PLUGIN_DIR}${pluginInfo.id}/`;
      await FileSystemService.createDirectory(pluginDir);
      
      // In a real implementation, this would download from the actual URL
      // For now, we'll create a mock plugin structure
      const mockPlugin = {
        'plugin.json': JSON.stringify({
          id: pluginInfo.id,
          name: pluginInfo.name,
          version: pluginInfo.version,
          description: pluginInfo.description,
          author: pluginInfo.author,
          main: 'index.js',
          permissions: pluginInfo.permissions,
          dependencies: pluginInfo.dependencies,
        }, null, 2),
        'index.js': `
// ${pluginInfo.name} plugin
module.exports = {
  initialize: function() {
    console.log('${pluginInfo.name} initialized');
  },
  
  cleanup: function() {
    console.log('${pluginInfo.name} cleaned up');
  },
  
  hooks: {
    onFileOpen: function(file) {
      console.log('File opened:', file);
    },
    onFileSave: function(file) {
      console.log('File saved:', file);
    }
  },
  
  commands: {
    '${pluginInfo.id}.activate': function() {
      console.log('${pluginInfo.name} activated');
    }
  }
};
        `,
      };
      
      // Create plugin files
      for (const [filename, content] of Object.entries(mockPlugin)) {
        const filePath = `${pluginDir}${filename}`;
        await FileSystemService.createFile(filePath, content);
      }
      
      return {
        success: true,
        pluginPath: pluginDir,
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
      };
    }
  }

  static async getPluginConfig() {
    try {
      const configExists = await FileSystem.getInfoAsync(this.CONFIG_FILE);
      
      if (!configExists.exists) {
        await this.initializePluginSystem();
      }
      
      const configContent = await FileSystem.readFileAsString(this.CONFIG_FILE);
      return JSON.parse(configContent);
    } catch (error) {
      return {
        enabled: false,
        plugins: {},
        marketplace: {
          url: 'https://api.codesurfer.dev/plugins',
          version: '1.0.0',
        },
      };
    }
  }

  static async registerHook(hookName, handler) {
    try {
      // Register hook with the main application
      if (window.CodeSurferAPI && window.CodeSurferAPI.registerHook) {
        await window.CodeSurferAPI.registerHook(hookName, handler);
      }
      
      return {
        success: true,
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
      };
    }
  }

  static async registerCommand(commandName, handler) {
    try {
      // Register command with the main application
      if (window.CodeSurferAPI && window.CodeSurferAPI.registerCommand) {
        await window.CodeSurferAPI.registerCommand(commandName, handler);
      }
      
      return {
        success: true,
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
      };
    }
  }

  static async unregisterPluginHooks(pluginId) {
    try {
      // Unregister all hooks for this plugin
      if (window.CodeSurferAPI && window.CodeSurferAPI.unregisterPluginHooks) {
        await window.CodeSurferAPI.unregisterPluginHooks(pluginId);
      }
      
      return {
        success: true,
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
      };
    }
  }

  static async unregisterPluginCommands(pluginId) {
    try {
      // Unregister all commands for this plugin
      if (window.CodeSurferAPI && window.CodeSurferAPI.unregisterPluginCommands) {
        await window.CodeSurferAPI.unregisterPluginCommands(pluginId);
      }
      
      return {
        success: true,
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
      };
    }
  }

  static async checkDependency(dependency) {
    try {
      // Check if dependency is available
      // In a real implementation, this would check installed packages
      return true;
    } catch (error) {
      return false;
    }
  }

  static async enablePlugin(pluginId) {
    try {
      const pluginConfig = await this.getPluginConfig();
      
      if (!pluginConfig.plugins[pluginId]) {
        throw new Error('Plugin not found');
      }
      
      pluginConfig.plugins[pluginId].enabled = true;
      await FileSystemService.writeAsStringAsync(this.CONFIG_FILE, JSON.stringify(pluginConfig, null, 2));
      
      return {
        success: true,
        message: `Plugin ${pluginId} enabled`,
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
      };
    }
  }

  static async disablePlugin(pluginId) {
    try {
      const pluginConfig = await this.getPluginConfig();
      
      if (!pluginConfig.plugins[pluginId]) {
        throw new Error('Plugin not found');
      }
      
      pluginConfig.plugins[pluginId].enabled = false;
      await FileSystemService.writeAsStringAsync(this.CONFIG_FILE, JSON.stringify(pluginConfig, null, 2));
      
      return {
        success: true,
        message: `Plugin ${pluginId} disabled`,
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
      };
    }
  }
}
