import * as FileSystem from 'expo-file-system';
import * as DocumentPicker from 'expo-document-picker';
import { Alert } from 'react-native';

export class FileSystemService {
  static async getDirectoryContents(path) {
    try {
      const directoryInfo = await FileSystem.getInfoAsync(path);
      
      if (!directoryInfo.exists || !directoryInfo.isDirectory) {
        throw new Error('Directory does not exist');
      }

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

      return fileDetails.sort((a, b) => {
        // Folders first, then files, both alphabetically
        if (a.isDirectory !== b.isDirectory) {
          return a.isDirectory ? -1 : 1;
        }
        return a.name.localeCompare(b.name);
      });
    } catch (error) {
      console.error('Error reading directory:', error);
      throw error;
    }
  }

  static async createFile(path, content = '') {
    try {
      // Ensure directory exists
      const directory = path.substring(0, path.lastIndexOf('/'));
      if (directory && directory !== path) {
        await this.ensureDirectoryExists(directory);
      }

      await FileSystem.writeAsStringAsync(path, content, {
        encoding: FileSystem.EncodingType.UTF8,
      });
      
      return {
        success: true,
        path,
        message: 'File created successfully',
      };
    } catch (error) {
      console.error('Error creating file:', error);
      throw error;
    }
  }

  static async createDirectory(path) {
    try {
      await FileSystem.makeDirectoryAsync(path, { intermediates: true });
      return {
        success: true,
        path,
        message: 'Directory created successfully',
      };
    } catch (error) {
      console.error('Error creating directory:', error);
      throw error;
    }
  }

  static async deleteFileOrDirectory(path) {
    try {
      const info = await FileSystem.getInfoAsync(path);
      if (!info.exists) {
        throw new Error('File or directory does not exist');
      }

      if (info.isDirectory) {
        await FileSystem.deleteAsync(path, { idempotent: true });
      } else {
        await FileSystem.deleteAsync(path);
      }

      return {
        success: true,
        path,
        message: info.isDirectory ? 'Directory deleted successfully' : 'File deleted successfully',
      };
    } catch (error) {
      console.error('Error deleting:', error);
      throw error;
    }
  }

  static async readFile(path) {
    try {
      const content = await FileSystem.readAsStringAsync(path, {
        encoding: FileSystem.EncodingType.UTF8,
      });
      return content;
    } catch (error) {
      console.error('Error reading file:', error);
      throw error;
    }
  }

  static async writeFile(path, content) {
    try {
      await FileSystem.writeAsStringAsync(path, content, {
        encoding: FileSystem.EncodingType.UTF8,
      });
      return {
        success: true,
        path,
        message: 'File saved successfully',
      };
    } catch (error) {
      console.error('Error writing file:', error);
      throw error;
    }
  }

  static async moveFile(oldPath, newPath) {
    try {
      await FileSystem.moveAsync({
        from: oldPath,
        to: newPath,
      });
      return {
        success: true,
        oldPath,
        newPath,
        message: 'File moved successfully',
      };
    } catch (error) {
      console.error('Error moving file:', error);
      throw error;
    }
  }

  static async copyFile(sourcePath, destinationPath) {
    try {
      await FileSystem.copyAsync({
        from: sourcePath,
        to: destinationPath,
      });
      return {
        success: true,
        sourcePath,
        destinationPath,
        message: 'File copied successfully',
      };
    } catch (error) {
      console.error('Error copying file:', error);
      throw error;
    }
  }

  static async pickFile() {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: '*/*',
        copyToCacheDirectory: true,
      });

      if (result.canceled) {
        return { canceled: true };
      }

      const file = result.assets[0];
      return {
        canceled: false,
        file: {
          name: file.name,
          uri: file.uri,
          size: file.size,
          mimeType: file.mimeType,
        },
      };
    } catch (error) {
      console.error('Error picking file:', error);
      throw error;
    }
  }

  static async ensureDirectoryExists(directoryPath) {
    try {
      const info = await FileSystem.getInfoAsync(directoryPath);
      if (!info.exists) {
        await FileSystem.makeDirectoryAsync(directoryPath, { intermediates: true });
      }
    } catch (error) {
      console.error('Error ensuring directory exists:', error);
      throw error;
    }
  }

  static async getFileInfo(path) {
    try {
      const info = await FileSystem.getInfoAsync(path);
      return {
        exists: info.exists,
        isDirectory: info.isDirectory,
        size: info.size,
        modified: new Date(info.modificationTime * 1000),
        uri: info.uri,
      };
    } catch (error) {
      console.error('Error getting file info:', error);
      throw error;
    }
  }

  static formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  }

  static getFileExtension(fileName) {
    return fileName.split('.').pop().toLowerCase();
  }

  static getLanguageFromExtension(extension) {
    const languageMap = {
      js: 'javascript',
      jsx: 'javascript',
      ts: 'typescript',
      tsx: 'typescript',
      py: 'python',
      java: 'java',
      cpp: 'cpp',
      c: 'c',
      h: 'c',
      hpp: 'cpp',
      html: 'html',
      htm: 'html',
      css: 'css',
      scss: 'scss',
      sass: 'sass',
      less: 'less',
      json: 'json',
      xml: 'xml',
      yaml: 'yaml',
      yml: 'yaml',
      md: 'markdown',
      txt: 'plaintext',
      sh: 'shell',
      bash: 'shell',
      zsh: 'shell',
      fish: 'shell',
      sql: 'sql',
      dockerfile: 'dockerfile',
      docker: 'dockerfile',
      gitignore: 'gitignore',
      eslintrc: 'json',
      prettierrc: 'json',
      tsconfig: 'json',
    };

    return languageMap[extension] || 'plaintext';
  }

  static async getProjectRoot(currentPath) {
    try {
      let path = currentPath;
      
      while (path !== FileSystem.documentDirectory) {
        const packageJsonPath = `${path}package.json`;
        const info = await FileSystem.getInfoAsync(packageJsonPath);
        
        if (info.exists) {
          return path;
        }
        
        // Move up one directory
        path = path.substring(0, path.lastIndexOf('/', path.length - 2)) + '/';
      }
      
      return FileSystem.documentDirectory;
    } catch (error) {
      console.error('Error finding project root:', error);
      return FileSystem.documentDirectory;
    }
  }

  static async getRecentProjects() {
    try {
      // Store recent projects in a JSON file
      const recentProjectsPath = `${FileSystem.documentDirectory}recent_projects.json`;
      
      try {
        const content = await this.readFile(recentProjectsPath);
        return JSON.parse(content);
      } catch (error) {
        // File doesn't exist, return empty array
        return [];
      }
    } catch (error) {
      console.error('Error getting recent projects:', error);
      return [];
    }
  }

  static async saveRecentProject(project) {
    try {
      const recentProjects = await this.getRecentProjects();
      
      // Remove if already exists
      const filteredProjects = recentProjects.filter(p => p.path !== project.path);
      
      // Add to beginning
      const updatedProjects = [project, ...filteredProjects].slice(0, 10); // Keep only 10 most recent
      
      const recentProjectsPath = `${FileSystem.documentDirectory}recent_projects.json`;
      await this.writeFile(recentProjectsPath, JSON.stringify(updatedProjects, null, 2));
      
      return updatedProjects;
    } catch (error) {
      console.error('Error saving recent project:', error);
      throw error;
    }
  }
}
