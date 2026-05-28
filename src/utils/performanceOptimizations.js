import { Platform } from 'react-native';
import * as FileSystem from 'expo-file-system';

export class PerformanceOptimizations {
  // Memoization cache
  static cache = new Map();
  
  // Debounce function
  static debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
      const later = () => {
        clearTimeout(timeout);
        func(...args);
      };
      clearTimeout(timeout);
      timeout = setTimeout(later, wait);
    };
  }

  // Throttle function
  static throttle(func, limit) {
    let inThrottle;
    return function() {
      const args = arguments;
      const context = this;
      if (!inThrottle) {
        func.apply(context, args);
        inThrottle = true;
        setTimeout(() => inThrottle = false, limit);
      }
    };
  }

  // Memoization helper
  static memoize(fn) {
    return function(...args) {
      const key = JSON.stringify(args);
      if (this.cache.has(key)) {
        return this.cache.get(key);
      }
      const result = fn.apply(this, args);
      this.cache.set(key, result);
      return result;
    };
  }

  // Clear cache
  static clearCache() {
    this.cache.clear();
  }

  // Optimize file reading with caching
  static async readFileWithCache(filePath) {
    const cacheKey = `file_${filePath}`;
    const fileInfo = await FileSystem.getInfoAsync(filePath);
    
    // Use file modification time as cache validation
    const cacheKeyWithTime = `${cacheKey}_${fileInfo.modificationTime}`;
    
    if (this.cache.has(cacheKeyWithTime)) {
      return this.cache.get(cacheKeyWithTime);
    }

    try {
      const content = await FileSystem.readAsStringAsync(filePath);
      this.cache.set(cacheKeyWithTime, content);
      return content;
    } catch (error) {
      console.error('Error reading file:', error);
      return '';
    }
  }

  // Batch file operations
  static async batchFileOperations(operations) {
    const results = [];
    
    // Process operations in batches to avoid overwhelming the system
    const batchSize = Platform.OS === 'ios' ? 10 : 5;
    
    for (let i = 0; i < operations.length; i += batchSize) {
      const batch = operations.slice(i, i + batchSize);
      const batchResults = await Promise.allSettled(
        batch.map(async (operation) => {
          try {
            const result = await operation();
            return { status: 'fulfilled', value: result };
          } catch (error) {
            return { status: 'rejected', reason: error };
          }
        })
      );
      results.push(...batchResults);
      
      // Small delay between batches to prevent blocking
      if (i + batchSize < operations.length) {
        await new Promise(resolve => setTimeout(resolve, 50));
      }
    }
    
    return results;
  }

  // Optimize directory listing
  static async optimizeDirectoryListing(path) {
    const cacheKey = `dir_${path}`;
    
    if (this.cache.has(cacheKey)) {
      const cached = this.cache.get(cacheKey);
      const fileInfo = await FileSystem.getInfoAsync(path);
      
      // Return cached data if directory hasn't changed
      if (fileInfo.modificationTime === cached.modificationTime) {
        return cached.files;
      }
    }

    try {
      const files = await FileSystem.readDirectoryAsync(path);
      const fileDetails = await Promise.all(
        files.map(async (fileName) => {
          const filePath = `${path}${fileName}`;
          const info = await FileSystem.getInfoAsync(filePath);
          
          return {
            id: filePath,
            name: fileName,
            type: info.isDirectory ? 'folder' : 'file',
            size: info.isDirectory ? '-' : this.formatFileSize(info.size),
            modified: new Date(info.modificationTime * 1000).toISOString().split('T')[0],
            path: filePath,
            isDirectory: info.isDirectory,
          };
        })
      );

      // Sort files for consistent display
      const sortedFiles = fileDetails.sort((a, b) => {
        if (a.isDirectory !== b.isDirectory) {
          return a.isDirectory ? -1 : 1;
        }
        return a.name.localeCompare(b.name);
      });

      // Cache the results
      const fileInfo = await FileSystem.getInfoAsync(path);
      this.cache.set(cacheKey, {
        files: sortedFiles,
        modificationTime: fileInfo.modificationTime,
      });

      return sortedFiles;
    } catch (error) {
      console.error('Error listing directory:', error);
      return [];
    }
  }

  // Format file size efficiently
  static formatFileSize = (() => {
    const units = ['B', 'KB', 'MB', 'GB'];
    return (bytes) => {
      if (bytes === 0) return '0 B';
      const k = 1024;
      const i = Math.floor(Math.log(bytes) / Math.log(k));
      return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + units[i];
    };
  })();

  // Lazy loading helper
  static createLazyLoader(loadFn) {
    let loaded = false;
    let data = null;
    let promise = null;

    return async () => {
      if (loaded) return data;
      
      if (!promise) {
        promise = loadFn().then(result => {
          loaded = true;
          data = result;
          return result;
        });
      }
      
      return promise;
    };
  }

  // Image optimization helper
  static optimizeImageSettings = {
    // Default settings for optimal performance
    default: {
      quality: 0.8,
      format: 'webp', // Use WebP for better compression
      cache: true,
      progressive: true,
    },
    
    // Settings for slow connections
    lowBandwidth: {
      quality: 0.6,
      format: 'webp',
      cache: true,
      progressive: true,
    },
    
    // Settings for high-quality needs
    highQuality: {
      quality: 0.9,
      format: 'png',
      cache: true,
      progressive: false,
    },
  };

  // Memory management
  static performMemoryCleanup() {
    // Clear caches
    this.clearCache();
    
    // Force garbage collection if available
    if (global.gc) {
      global.gc();
    }
    
    // Clear any other caches
    if (typeof window !== 'undefined' && window.caches) {
      window.caches.keys().then(names => {
        return Promise.all(names.map(name => window.caches.delete(name)));
      });
    }
  }

  // Performance monitoring
  static measurePerformance(name, fn) {
    return async (...args) => {
      const start = performance.now();
      const result = await fn(...args);
      const end = performance.now();
      
      if (__DEV__) {
        console.log(`${name} took ${end - start} milliseconds`);
      }
      
      return result;
    };
  }

  // Optimize re-renders
  static shouldComponentUpdate(prevProps, nextProps) {
    // Shallow comparison for performance
    const keys = Object.keys(nextProps);
    
    for (let key of keys) {
      if (prevProps[key] !== nextProps[key]) {
        return true;
      }
    }
    
    return false;
  }
}
