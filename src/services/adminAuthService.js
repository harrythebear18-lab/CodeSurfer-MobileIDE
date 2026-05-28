import * as SecureStore from 'expo-secure-store';

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
}