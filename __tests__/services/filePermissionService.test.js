import { FilePermissionService } from '../../src/services/filePermissionService';

// Mock expo-secure-store
jest.mock('expo-secure-store', () => ({
  getItemAsync: jest.fn(),
  setItemAsync: jest.fn(),
  deleteItemAsync: jest.fn(),
}));

describe('FilePermissionService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('isProtectedPath', () => {
    it('identifies protected directories correctly', () => {
      expect(FilePermissionService.isProtectedPath('src/')).toBe(true);
      expect(FilePermissionService.isProtectedPath('src/components/')).toBe(true);
      expect(FilePermissionService.isProtectedPath('node_modules/')).toBe(true);
      expect(FilePermissionService.isProtectedPath('user_projects/')).toBe(false);
      expect(FilePermissionService.isProtectedPath('my_project/')).toBe(false);
    });

    it('handles edge cases', () => {
      expect(FilePermissionService.isProtectedPath('')).toBe(false);
      expect(FilePermissionService.isProtectedPath('/')).toBe(false);
      expect(FilePermissionService.isProtectedPath('src')).toBe(true);
      expect(FilePermissionService.isProtectedPath('srcfile.js')).toBe(false);
    });
  });

  describe('isAllowedFile', () => {
    it('allows common development file types', () => {
      expect(FilePermissionService.isAllowedFile('script.js')).toBe(true);
      expect(FilePermissionService.isAllowedFile('style.css')).toBe(true);
      expect(FilePermissionService.isAllowedFile('app.py')).toBe(true);
      expect(FilePermissionService.isAllowedFile('Main.java')).toBe(true);
      expect(FilePermissionService.isAllowedFile('config.json')).toBe(true);
      expect(FilePermissionService.isAllowedFile('README.md')).toBe(true);
    });

    it('rejects disallowed file types', () => {
      expect(FilePermissionService.isAllowedFile('virus.exe')).toBe(false);
      expect(FilePermissionService.isAllowedFile('malware.bat')).toBe(false);
      expect(FilePermissionService.isAllowedFile('system.dll')).toBe(false);
      expect(FilePermissionService.isAllowedFile('hidden.sys')).toBe(false);
    });

    it('handles files without extensions', () => {
      expect(FilePermissionService.isAllowedFile('Makefile')).toBe(true);
      expect(FilePermissionService.isAllowedFile('Dockerfile')).toBe(true);
      expect(FilePermissionService.isAllowedFile('gitignore')).toBe(true);
      expect(FilePermissionService.isAllowedFile('unknown')).toBe(false);
    });
  });

  describe('canReadFile', () => {
    it('allows admin to read any file', async () => {
      // Mock admin user
      jest.spyOn(FilePermissionService, 'isAdminUser').mockResolvedValue(true);
      
      const result = await FilePermissionService.canReadFile('src/App.js', 'App.js');
      expect(result).toBe(true);
    });

    it('prevents regular users from reading protected files', async () => {
      // Mock regular user
      jest.spyOn(FilePermissionService, 'isAdminUser').mockResolvedValue(false);
      
      const result = await FilePermissionService.canReadFile('src/App.js', 'App.js');
      expect(result).toBe(false);
    });

    it('allows regular users to read allowed files', async () => {
      // Mock regular user
      jest.spyOn(FilePermissionService, 'isAdminUser').mockResolvedValue(false);
      
      const result = await FilePermissionService.canReadFile('user_projects/script.js', 'script.js');
      expect(result).toBe(true);
    });
  });

  describe('canWriteFile', () => {
    it('allows admin to write any file', async () => {
      jest.spyOn(FilePermissionService, 'isAdminUser').mockResolvedValue(true);
      
      const result = await FilePermissionService.canWriteFile('src/App.js', 'App.js');
      expect(result).toBe(true);
    });

    it('prevents regular users from writing protected files', async () => {
      jest.spyOn(FilePermissionService, 'isAdminUser').mockResolvedValue(false);
      
      const result = await FilePermissionService.canWriteFile('src/App.js', 'App.js');
      expect(result).toBe(false);
    });

    it('allows regular users to write allowed files', async () => {
      jest.spyOn(FilePermissionService, 'isAdminUser').mockResolvedValue(false);
      
      const result = await FilePermissionService.canWriteFile('user_projects/script.js', 'script.js');
      expect(result).toBe(true);
    });
  });

  describe('canDeleteFile', () => {
    it('allows admin to delete any file', async () => {
      jest.spyOn(FilePermissionService, 'isAdminUser').mockResolvedValue(true);
      
      const result = await FilePermissionService.canDeleteFile('src/App.js', 'App.js');
      expect(result).toBe(true);
    });

    it('prevents regular users from deleting protected files', async () => {
      jest.spyOn(FilePermissionService, 'isAdminUser').mockResolvedValue(false);
      
      const result = await FilePermissionService.canDeleteFile('src/App.js', 'App.js');
      expect(result).toBe(false);
    });

    it('allows regular users to delete allowed files', async () => {
      jest.spyOn(FilePermissionService, 'isAdminUser').mockResolvedValue(false);
      
      const result = await FilePermissionService.canDeleteFile('user_projects/script.js', 'script.js');
      expect(result).toBe(true);
    });
  });

  describe('filterDirectoryContents', () => {
    it('shows all files to admin', async () => {
      jest.spyOn(FilePermissionService, 'isAdminUser').mockResolvedValue(true);
      
      const files = [
        { name: 'App.js', path: 'src/App.js', isDirectory: false },
        { name: 'script.js', path: 'user_projects/script.js', isDirectory: false },
        { name: 'src', path: 'src/', isDirectory: true },
        { name: 'user_projects', path: 'user_projects/', isDirectory: true },
      ];
      
      const result = await FilePermissionService.filterDirectoryContents(files);
      expect(result).toHaveLength(4); // All files shown to admin
    });

    it('filters files for regular users', async () => {
      jest.spyOn(FilePermissionService, 'isAdminUser').mockResolvedValue(false);
      
      const files = [
        { name: 'App.js', path: 'src/App.js', isDirectory: false },
        { name: 'script.js', path: 'user_projects/script.js', isDirectory: false },
        { name: 'src', path: 'src/', isDirectory: true },
        { name: 'user_projects', path: 'user_projects/', isDirectory: true },
        { name: 'virus.exe', path: 'user_projects/virus.exe', isDirectory: false },
      ];
      
      const result = await FilePermissionService.filterDirectoryContents(files);
      expect(result).toHaveLength(1); // Only allowed files shown
      expect(result[0].name).toBe('script.js');
    });
  });
});
