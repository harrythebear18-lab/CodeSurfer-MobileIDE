import * as FileSystem from 'expo-file-system';
import * as DocumentPicker from 'expo-document-picker';
import { Alert } from 'react-native';
import { FilePermissionService } from './filePermissionService';

export class SecureFileSystemService {
  static async getDirectoryContents(path) {
    try {
      // Get user's accessible directory based on permissions
      const isAdmin = await FilePermissionService.isAdminUser();
      const accessiblePath = isAdmin ? path : await FilePermissionService.getUserAccessibleDirectory();
      
      // Ensure user workspace exists for non-admin users
      if (!isAdmin) {
        await FilePermissionService.ensureUserWorkspace();
      }
      
      const directoryInfo = await FileSystem.getInfoAsync(accessiblePath);
      
      if (!directoryInfo.exists || !directoryInfo.isDirectory) {
        throw new Error('Directory does not exist');
      }

      const files = await FileSystem.readDirectoryAsync(accessiblePath);
      let fileDetails = await Promise.all(
        files.map(async (fileName) => {
          const filePath = `${accessiblePath}${fileName}`;
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

      // Filter contents based on user permissions
      fileDetails = await FilePermissionService.filterDirectoryContents(fileDetails);

      return {
        success: true,
        files: fileDetails,
        isAdmin: isAdmin,
        accessiblePath: accessiblePath,
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
      };
    }
  }

  static async createFile(path, content = '') {
    try {
      // Check permissions
      const fileName = path.split('/').pop();
      const canCreate = await FilePermissionService.canCreateFile(path, fileName);
      
      if (!canCreate) {
        throw new Error('Permission denied: Cannot create file in this location');
      }

      // Get appropriate directory based on user permissions
      const isAdmin = await FilePermissionService.isAdminUser();
      const targetPath = isAdmin ? path : `${await FilePermissionService.getUserAccessibleDirectory()}${fileName}`;
      
      // Ensure directory exists
      const directory = targetPath.substring(0, targetPath.lastIndexOf('/'));
      if (directory && directory !== targetPath) {
        await this.ensureDirectoryExists(directory);
      }

      await FileSystem.writeAsStringAsync(targetPath, content, {
        encoding: FileSystem.EncodingType.UTF8,
      });
      
      return {
        success: true,
        path: targetPath,
        message: 'File created successfully',
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
      };
    }
  }

  static async readFile(path) {
    try {
      // Check permissions
      const fileName = path.split('/').pop();
      const canRead = await FilePermissionService.canReadFile(path, fileName);
      
      if (!canRead) {
        throw new Error('Permission denied: Cannot read this file');
      }

      // Get appropriate path based on user permissions
      const isAdmin = await FilePermissionService.isAdminUser();
      const targetPath = isAdmin ? path : `${await FilePermissionService.getUserAccessibleDirectory()}${fileName}`;
      
      const content = await FileSystem.readAsStringAsync(targetPath, {
        encoding: FileSystem.EncodingType.UTF8,
      });
      
      return {
        success: true,
        content,
        path: targetPath,
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
      };
    }
  }

  static async writeFile(path, content) {
    try {
      // Check permissions
      const fileName = path.split('/').pop();
      const canWrite = await FilePermissionService.canWriteFile(path, fileName);
      
      if (!canWrite) {
        throw new Error('Permission denied: Cannot modify this file');
      }

      // Get appropriate path based on user permissions
      const isAdmin = await FilePermissionService.isAdminUser();
      const targetPath = isAdmin ? path : `${await FilePermissionService.getUserAccessibleDirectory()}${fileName}`;
      
      await FileSystem.writeAsStringAsync(targetPath, content, {
        encoding: FileSystem.EncodingType.UTF8,
      });
      
      return {
        success: true,
        path: targetPath,
        message: 'File saved successfully',
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
      };
    }
  }

  static async deleteFile(path) {
    try {
      // Check permissions
      const fileName = path.split('/').pop();
      const canDelete = await FilePermissionService.canDeleteFile(path, fileName);
      
      if (!canDelete) {
        throw new Error('Permission denied: Cannot delete this file');
      }

      // Get appropriate path based on user permissions
      const isAdmin = await FilePermissionService.isAdminUser();
      const targetPath = isAdmin ? path : `${await FilePermissionService.getUserAccessibleDirectory()}${fileName}`;
      
      await FileSystem.deleteAsync(targetPath);
      
      return {
        success: true,
        message: 'File deleted successfully',
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
      };
    }
  }

  static async createDirectory(path) {
    try {
      // Check if user can create directory
      const isAdmin = await FilePermissionService.isAdminUser();
      
      if (!isAdmin && FilePermissionService.isProtectedPath(path)) {
        throw new Error('Permission denied: Cannot create directory in this location');
      }

      const targetPath = isAdmin ? path : `${await FilePermissionService.getUserAccessibleDirectory()}${path.split('/').pop()}`;
      
      await FileSystem.makeDirectoryAsync(targetPath, { intermediates: true });
      
      return {
        success: true,
        path: targetPath,
        message: 'Directory created successfully',
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
      };
    }
  }

  static async deleteDirectory(path) {
    try {
      // Check permissions
      const isAdmin = await FilePermissionService.isAdminUser();
      
      if (!isAdmin && FilePermissionService.isProtectedPath(path)) {
        throw new Error('Permission denied: Cannot delete this directory');
      }

      const targetPath = isAdmin ? path : `${await FilePermissionService.getUserAccessibleDirectory()}${path.split('/').pop()}`;
      
      await FileSystem.deleteAsync(targetPath, { recursive: true });
      
      return {
        success: true,
        message: 'Directory deleted successfully',
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
      };
    }
  }

  static async pickDocument() {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['*/*'],
        copyToCacheDirectory: true,
      });

      if (result.canceled) {
        return {
          success: false,
          error: 'Document picker cancelled',
        };
      }

      // Check if user can access this file type
      const fileName = result.assets[0].name;
      const canCreate = await FilePermissionService.canCreateFile('./', fileName);
      
      if (!canCreate) {
        return {
          success: false,
          error: 'Permission denied: Cannot import this file type',
        };
      }

      return {
        success: true,
        file: result.assets[0],
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
      };
    }
  }

  static async ensureDirectoryExists(path) {
    try {
      const dirInfo = await FileSystem.getInfoAsync(path);
      if (!dirInfo.exists) {
        await FileSystem.makeDirectoryAsync(path, { intermediates: true });
      }
      return true;
    } catch (error) {
      console.error('Error ensuring directory exists:', error);
      return false;
    }
  }

  static formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  static async getFilePermissions(filePath, fileName) {
    return await FilePermissionService.getFilePermissions(filePath, fileName);
  }

  static async getAccessibleDirectory() {
    const isAdmin = await FilePermissionService.isAdminUser();
    return isAdmin ? 
      FilePermissionService.getAdminAccessibleDirectory() : 
      FilePermissionService.getUserAccessibleDirectory();
  }
}
