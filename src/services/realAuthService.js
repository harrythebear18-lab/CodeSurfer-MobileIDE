import * as SecureStore from 'expo-secure-store';

export class RealAuthService {
  static TOKEN_KEY = 'codesurfer_auth_token';
  static USER_KEY = 'codesurfer_user_data';
  static USERS_DB_KEY = 'codesurfer_users_db';

  static async signUp(email, password, name) {
    try {
      const users = await this.getAllUsers();

      if (users.find(u => u.email.toLowerCase() === email.toLowerCase())) {
        return {
          success: false,
          error: 'An account with this email already exists',
        };
      }

      const userId = 'user_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
      const token = this.generateToken(userId);
      const hashedPassword = await this.hashPassword(password);

      const userData = {
        uid: userId,
        email: email.toLowerCase(),
        displayName: name || email.split('@')[0],
        photoURL: null,
        createdAt: new Date().toISOString(),
        passwordHash: hashedPassword,
      };

      users.push(userData);
      await this.saveAllUsers(users);

      const sessionUser = {
        uid: userData.uid,
        email: userData.email,
        displayName: userData.displayName,
        photoURL: userData.photoURL,
        createdAt: userData.createdAt,
      };

      await SecureStore.setItemAsync(this.TOKEN_KEY, token);
      await SecureStore.setItemAsync(this.USER_KEY, JSON.stringify(sessionUser));

      return {
        success: true,
        user: sessionUser,
        token,
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
      };
    }
  }

  static async signIn(email, password) {
    try {
      const users = await this.getAllUsers();
      const user = users.find(u => u.email.toLowerCase() === email.toLowerCase());

      if (!user) {
        return {
          success: false,
          error: 'No account found with this email',
        };
      }

      const hashedPassword = await this.hashPassword(password);
      if (user.passwordHash !== hashedPassword) {
        return {
          success: false,
          error: 'Incorrect password',
        };
      }

      const token = this.generateToken(user.uid);

      const sessionUser = {
        uid: user.uid,
        email: user.email,
        displayName: user.displayName,
        photoURL: user.photoURL,
        createdAt: user.createdAt,
      };

      await SecureStore.setItemAsync(this.TOKEN_KEY, token);
      await SecureStore.setItemAsync(this.USER_KEY, JSON.stringify(sessionUser));

      return {
        success: true,
        user: sessionUser,
        token,
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
      };
    }
  }

  static async signOut() {
    try {
      await SecureStore.deleteItemAsync(this.TOKEN_KEY);
      await SecureStore.deleteItemAsync(this.USER_KEY);
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  static async getCurrentUser() {
    try {
      const token = await SecureStore.getItemAsync(this.TOKEN_KEY);
      if (!token) return null;

      const userJson = await SecureStore.getItemAsync(this.USER_KEY);
      if (!userJson) return null;

      return JSON.parse(userJson);
    } catch (error) {
      return null;
    }
  }

  static async verifyToken(token) {
    try {
      const storedToken = await SecureStore.getItemAsync(this.TOKEN_KEY);
      return storedToken === token;
    } catch (error) {
      return false;
    }
  }

  static async refreshToken() {
    try {
      const user = await this.getCurrentUser();
      if (!user) return null;

      const newToken = this.generateToken(user.uid);
      await SecureStore.setItemAsync(this.TOKEN_KEY, newToken);
      return newToken;
    } catch (error) {
      return null;
    }
  }

  static async resetPassword(email) {
    try {
      const users = await this.getAllUsers();
      const user = users.find(u => u.email.toLowerCase() === email.toLowerCase());

      if (!user) {
        return {
          success: false,
          error: 'No account found with this email',
        };
      }

      return {
        success: true,
        message: 'Password reset available in offline mode — use change password in settings',
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
      };
    }
  }

  static async updateProfile(updates) {
    try {
      const userJson = await SecureStore.getItemAsync(this.USER_KEY);
      if (!userJson) {
        return { success: false, error: 'Not authenticated' };
      }

      const currentUser = JSON.parse(userJson);
      const updatedUser = { ...currentUser, ...updates };

      await SecureStore.setItemAsync(this.USER_KEY, JSON.stringify(updatedUser));

      const users = await this.getAllUsers();
      const userIndex = users.findIndex(u => u.uid === currentUser.uid);
      if (userIndex >= 0) {
        users[userIndex] = { ...users[userIndex], ...updates };
        await this.saveAllUsers(users);
      }

      return { success: true, user: updatedUser };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  static async changeEmail(newEmail, password) {
    try {
      const userJson = await SecureStore.getItemAsync(this.USER_KEY);
      if (!userJson) {
        return { success: false, error: 'Not authenticated' };
      }

      const currentUser = JSON.parse(userJson);
      const users = await this.getAllUsers();
      const user = users.find(u => u.uid === currentUser.uid);

      if (!user) {
        return { success: false, error: 'User not found' };
      }

      const hashedPassword = await this.hashPassword(password);
      if (user.passwordHash !== hashedPassword) {
        return { success: false, error: 'Incorrect password' };
      }

      if (users.find(u => u.email.toLowerCase() === newEmail.toLowerCase() && u.uid !== user.uid)) {
        return { success: false, error: 'Email already in use' };
      }

      user.email = newEmail.toLowerCase();
      await this.saveAllUsers(users);

      const updatedUser = { ...currentUser, email: newEmail.toLowerCase() };
      await SecureStore.setItemAsync(this.USER_KEY, JSON.stringify(updatedUser));

      return { success: true, user: updatedUser };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  static async changePassword(currentPassword, newPassword) {
    try {
      const userJson = await SecureStore.getItemAsync(this.USER_KEY);
      if (!userJson) {
        return { success: false, error: 'Not authenticated' };
      }

      const currentUser = JSON.parse(userJson);
      const users = await this.getAllUsers();
      const user = users.find(u => u.uid === currentUser.uid);

      if (!user) {
        return { success: false, error: 'User not found' };
      }

      const hashedCurrentPassword = await this.hashPassword(currentPassword);
      if (user.passwordHash !== hashedCurrentPassword) {
        return { success: false, error: 'Current password is incorrect' };
      }

      user.passwordHash = await this.hashPassword(newPassword);
      await this.saveAllUsers(users);

      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  static async deleteAccount(password) {
    try {
      const userJson = await SecureStore.getItemAsync(this.USER_KEY);
      if (!userJson) {
        return { success: false, error: 'Not authenticated' };
      }

      const currentUser = JSON.parse(userJson);
      const users = await this.getAllUsers();
      const user = users.find(u => u.uid === currentUser.uid);

      if (!user) {
        return { success: false, error: 'User not found' };
      }

      const hashedPassword = await this.hashPassword(password);
      if (user.passwordHash !== hashedPassword) {
        return { success: false, error: 'Incorrect password' };
      }

      const filteredUsers = users.filter(u => u.uid !== currentUser.uid);
      await this.saveAllUsers(filteredUsers);

      await SecureStore.deleteItemAsync(this.TOKEN_KEY);
      await SecureStore.deleteItemAsync(this.USER_KEY);

      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  static async getAllUsers() {
    try {
      const usersJson = await SecureStore.getItemAsync(this.USERS_DB_KEY);
      if (!usersJson) return [];
      return JSON.parse(usersJson);
    } catch (error) {
      return [];
    }
  }

  static async saveAllUsers(users) {
    await SecureStore.setItemAsync(this.USERS_DB_KEY, JSON.stringify(users));
  }

  static generateToken(userId) {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substr(2, 16);
    return `${userId}_${timestamp}_${random}`;
  }

  static async hashPassword(password) {
    let hash = 0;
    const str = password + 'codesurfer_salt_2024';
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return 'h' + Math.abs(hash).toString(36);
  }
}
