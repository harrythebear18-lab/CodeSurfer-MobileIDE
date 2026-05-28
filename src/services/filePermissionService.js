import * as FileSystem from 'expo-file-system';
import { AdminAuthService } from './adminAuthService';
import { RealAuthService } from './realAuthService';

export class FilePermissionService {
  // Define protected directories that users cannot access
  static PROTECTED_DIRECTORIES = [
    'src/',
    'node_modules/',
    'scripts/',
    'android/',
    'ios/',
    '.expo/',
    'dist/',
    'build/',
    '.git/',
    '__tests__/',
    'docs/',
  ];

  // Define file extensions that are allowed for user access
  static ALLOWED_EXTENSIONS = [
    '.js', '.jsx', '.ts', '.tsx', '.html', '.css', '.scss', '.sass',
    '.json', '.md', '.txt', '.xml', '.yaml', '.yml', '.env',
    '.py', '.java', '.cpp', '.c', '.h', '.go', '.rs', '.php',
    '.rb', '.swift', '.kt', '.dart', '.lua', '.r', '.sql',
    '.sh', '.bat', '.ps1', '.dockerfile', 'Dockerfile',
    '.gitignore', '.eslintrc', '.prettierrc', '.babelrc',
    'package.json', 'tsconfig.json', 'webpack.config.js'
  ];

  // Check if current user is admin
  static async isAdminUser() {
    try {
      const adminUser = await AdminAuthService.getCurrentAdmin();
      return adminUser && adminUser.isAdmin;
    } catch (error) {
      return false;
    }
  }

  // Check if path is in protected directory
  static isProtectedPath(filePath) {
    // Normalize path
    const normalizedPath = filePath.replace(/\\/g, '/');
    
    // Check if path contains any protected directories
    return this.PROTECTED_DIRECTORIES.some(dir => 
      normalizedPath.includes(dir) || normalizedPath.startsWith(dir)
    );
  }

  // Check if file has allowed extension
  static isAllowedFile(fileName) {
    const extension = fileName.toLowerCase().substring(fileName.lastIndexOf('.'));
    return this.ALLOWED_EXTENSIONS.includes(extension);
  }

  // Filter directory contents based on permissions
  static async filterDirectoryContents(contents, currentUser) {
    const isAdmin = await this.isAdminUser();
    
    if (isAdmin) {
      // Admin can see everything
      return contents;
    }

    // Regular users can only see non-protected files
    return contents.filter(item => {
      // Hide protected directories
      if (item.isDirectory && this.isProtectedPath(item.path)) {
        return false;
      }
      
      // Hide protected files
      if (!item.isDirectory && this.isProtectedPath(item.path)) {
        return false;
      }
      
      // Only show files with allowed extensions
      if (!item.isDirectory && !this.isAllowedFile(item.name)) {
        return false;
      }
      
      return true;
    });
  }

  // Check if user can read file
  static async canReadFile(filePath, fileName) {
    const isAdmin = await this.isAdminUser();
    
    if (isAdmin) {
      return true; // Admin can read everything
    }

    // Regular users cannot read protected files
    if (this.isProtectedPath(filePath)) {
      return false;
    }

    // Regular users can only read allowed file types
    if (!this.isAllowedFile(fileName)) {
      return false;
    }

    return true;
  }

  // Check if user can write file
  static async canWriteFile(filePath, fileName) {
    const isAdmin = await this.isAdminUser();
    
    if (isAdmin) {
      return true; // Admin can write everything
    }

    // Regular users cannot write to protected directories
    if (this.isProtectedPath(filePath)) {
      return false;
    }

    // Regular users can only write allowed file types
    if (!this.isAllowedFile(fileName)) {
      return false;
    }

    return true;
  }

  // Check if user can delete file
  static async canDeleteFile(filePath, fileName) {
    const isAdmin = await this.isAdminUser();
    
    if (isAdmin) {
      return true; // Admin can delete everything
    }

    // Regular users cannot delete protected files
    if (this.isProtectedPath(filePath)) {
      return false;
    }

    // Regular users can only delete allowed file types
    if (!this.isAllowedFile(fileName)) {
      return false;
    }

    return true;
  }

  // Check if user can create file
  static async canCreateFile(filePath, fileName) {
    const isAdmin = await this.isAdminUser();
    
    if (isAdmin) {
      return true; // Admin can create everything
    }

    // Regular users cannot create files in protected directories
    if (this.isProtectedPath(filePath)) {
      return false;
    }

    // Regular users can only create allowed file types
    if (!this.isAllowedFile(fileName)) {
      return false;
    }

    return true;
  }

  // Get user's accessible directory (sandboxed)
  static getUserAccessibleDirectory() {
    // Regular users get sandboxed to a specific directory
    return `${FileSystem.documentDirectory}user_projects/`;
  }

  // Get admin's accessible directory (full access)
  static getAdminAccessibleDirectory() {
    // Admin gets full access to document directory
    return FileSystem.documentDirectory;
  }

  // Create user workspace if it doesn't exist
  static async ensureUserWorkspace() {
    const userDir = this.getUserAccessibleDirectory();
    
    try {
      const dirInfo = await FileSystem.getInfoAsync(userDir);
      if (!dirInfo.exists) {
        await FileSystem.makeDirectoryAsync(userDir, { intermediates: true });
      }
      return userDir;
    } catch (error) {
      console.error('Failed to create user workspace:', error);
      return null;
    }
  }

  // Get file permissions for UI display
  static async getFilePermissions(filePath, fileName) {
    const isAdmin = await this.isAdminUser();
    
    return {
      canRead: await this.canReadFile(filePath, fileName),
      canWrite: await this.canWriteFile(filePath, fileName),
      canDelete: await this.canDeleteFile(filePath, fileName),
      isProtected: this.isProtectedPath(filePath),
      isAdmin: isAdmin,
    };
  }
}
