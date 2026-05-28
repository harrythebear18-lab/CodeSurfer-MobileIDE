import * as SecureStore from 'expo-secure-store';

export class AdminAuthService {
  static async signIn(username, password) {
    try {
      // Check if admin access is enabled (development only)
      const enableAdminAccess = process.env.ENABLE_ADMIN_ACCESS === 'true';
      
      if (!enableAdminAccess) {
        return {
          success: false,
          error: 'Admin access is not available',
        };
      }

      // Get admin credentials from environment variables
      const adminUsername = process.env.ADMIN_USERNAME;
      const adminPassword = process.env.ADMIN_PASSWORD;
      
      if (!adminUsername || !adminPassword) {
        return {
          success: false,
          error: 'Admin credentials not configured',
        };
      }

      // Check admin credentials
      if (username === adminUsername && password === adminPassword) {
        
        const adminUser = {
          uid: 'admin-001',
          email: 'admin@codesurfer.dev',
          displayName: 'Harry Thompson',
          isAdmin: true,
          role: 'administrator',
          permissions: ['read', 'write', 'delete', 'admin'],
        };
        
        // Store admin session
        await SecureStore.setItemAsync('admin_token', 'admin-token-' + Date.now());
        await SecureStore.setItemAsync('admin_user', JSON.stringify(adminUser));
        
        return {
          success: true,
          user: adminUser,
          token: 'admin-token-' + Date.now(),
        };
      }

      return {
        success: false,
        error: 'Invalid admin credentials',
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
      };
    }
  }

  static async getCurrentAdmin() {
    try {
      const adminUser = await SecureStore.getItemAsync('admin_user');
      return adminUser ? JSON.parse(adminUser) : null;
    } catch (error) {
      return null;
    }
  }

  static async signOut() {
    try {
      await SecureStore.deleteItemAsync('admin_token');
      await SecureStore.deleteItemAsync('admin_user');
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  static async isAdminSession() {
    try {
      const adminUser = await this.getCurrentAdmin();
      return adminUser && adminUser.isAdmin;
    } catch (error) {
      return false;
    }
  }
}
