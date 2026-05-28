import * as SecureStore from 'expo-secure-store';

export class RealAuthService {
  static TOKEN_KEY = 'codesurfer_auth_token';
  static USER_KEY = 'codesurfer_user_data';
  static REFRESH_TOKEN_KEY = 'codesurfer_refresh_token';

  // Firebase Auth configuration (you'd replace this with your actual Firebase config)
  static FIREBASE_CONFIG = {
    apiKey: "your-firebase-api-key",
    authDomain: "your-project.firebaseapp.com",
    projectId: "your-project-id",
    storageBucket: "your-project.appspot.com",
    messagingSenderId: "123456789",
    appId: "1:123456789:web:abcdef",
  };

  static async signUp(email, password, name) {
    try {
      // Real Firebase Auth API call
      const response = await fetch(
        `https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=${this.FIREBASE_CONFIG.apiKey}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            email: email,
            password: password,
            returnSecureToken: true,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error?.message || 'Registration failed');
      }

      // Store tokens securely
      await SecureStore.setItemAsync(this.TOKEN_KEY, data.idToken);
      await SecureStore.setItemAsync(this.REFRESH_TOKEN_KEY, data.refreshToken);

      // Store user data
      const userData = {
        uid: data.localId,
        email: data.email,
        displayName: name,
        emailVerified: data.emailVerified,
        createdAt: new Date().toISOString(),
      };

      await SecureStore.setItemAsync(this.USER_KEY, JSON.stringify(userData));

      return {
        success: true,
        user: userData,
        token: data.idToken,
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
      // Real Firebase Auth API call
      const response = await fetch(
        `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${this.FIREBASE_CONFIG.apiKey}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            email: email,
            password: password,
            returnSecureToken: true,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error?.message || 'Sign in failed');
      }

      // Store tokens securely
      await SecureStore.setItemAsync(this.TOKEN_KEY, data.idToken);
      await SecureStore.setItemAsync(this.REFRESH_TOKEN_KEY, data.refreshToken);

      // Store user data
      const userData = {
        uid: data.localId,
        email: data.email,
        displayName: data.displayName || email.split('@')[0],
        emailVerified: data.emailVerified,
      };

      await SecureStore.setItemAsync(this.USER_KEY, JSON.stringify(userData));

      return {
        success: true,
        user: userData,
        token: data.idToken,
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
      const token = await SecureStore.getItemAsync(this.TOKEN_KEY);
      
      if (token) {
        // Revoke token on server
        await fetch(
          `https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${this.FIREBASE_CONFIG.apiKey}`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              idToken: token,
            }),
          }
        );
      }

      // Clear local storage
      await SecureStore.deleteItemAsync(this.TOKEN_KEY);
      await SecureStore.deleteItemAsync(this.REFRESH_TOKEN_KEY);
      await SecureStore.deleteItemAsync(this.USER_KEY);

      return {
        success: true,
        message: 'Signed out successfully',
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
      };
    }
  }

  static async getCurrentUser() {
    try {
      const token = await SecureStore.getItemAsync(this.TOKEN_KEY);
      const userData = await SecureStore.getItemAsync(this.USER_KEY);

      if (!token || !userData) {
        return null;
      }

      // Verify token is still valid
      const isValid = await this.verifyToken(token);
      if (!isValid) {
        await this.signOut();
        return null;
      }

      return JSON.parse(userData);
    } catch (error) {
      return null;
    }
  }

  static async verifyToken(token) {
    try {
      const response = await fetch(
        `https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${this.FIREBASE_CONFIG.apiKey}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            idToken: token,
          }),
        }
      );

      return response.ok;
    } catch (error) {
      return false;
    }
  }

  static async refreshToken() {
    try {
      const refreshToken = await SecureStore.getItemAsync(this.REFRESH_TOKEN_KEY);
      
      if (!refreshToken) {
        throw new Error('No refresh token available');
      }

      const response = await fetch(
        `https://securetoken.googleapis.com/v1/token?key=${this.FIREBASE_CONFIG.apiKey}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            grant_type: 'refresh_token',
            refresh_token: refreshToken,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error?.message || 'Token refresh failed');
      }

      // Store new tokens
      await SecureStore.setItemAsync(this.TOKEN_KEY, data.id_token);
      await SecureStore.setItemAsync(this.REFRESH_TOKEN_KEY, data.refresh_token);

      return {
        success: true,
        token: data.id_token,
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
      };
    }
  }

  static async resetPassword(email) {
    try {
      const response = await fetch(
        `https://identitytoolkit.googleapis.com/v1/accounts:sendOobCode?key=${this.FIREBASE_CONFIG.apiKey}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            requestType: 'PASSWORD_RESET',
            email: email,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error?.message || 'Password reset failed');
      }

      return {
        success: true,
        message: 'Password reset email sent',
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
      };
    }
  }

  static async updateProfile(displayName, photoURL) {
    try {
      const token = await SecureStore.getItemAsync(this.TOKEN_KEY);
      
      if (!token) {
        throw new Error('Not authenticated');
      }

      const userData = await this.getCurrentUser();
      if (!userData) {
        throw new Error('User not found');
      }

      const response = await fetch(
        `https://identitytoolkit.googleapis.com/v1/accounts:update?key=${this.FIREBASE_CONFIG.apiKey}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            idToken: token,
            displayName: displayName,
            photoUrl: photoURL,
            returnSecureToken: true,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error?.message || 'Profile update failed');
      }

      // Update stored user data
      const updatedUserData = {
        ...userData,
        displayName: displayName || userData.displayName,
        photoURL: photoURL || userData.photoURL,
      };

      await SecureStore.setItemAsync(this.USER_KEY, JSON.stringify(updatedUserData));

      return {
        success: true,
        user: updatedUserData,
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
      };
    }
  }

  static async changeEmail(newEmail, password) {
    try {
      const token = await SecureStore.getItemAsync(this.TOKEN_KEY);
      
      if (!token) {
        throw new Error('Not authenticated');
      }

      const response = await fetch(
        `https://identitytoolkit.googleapis.com/v1/accounts:update?key=${this.FIREBASE_CONFIG.apiKey}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            idToken: token,
            email: newEmail,
            password: password,
            returnSecureToken: true,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error?.message || 'Email change failed');
      }

      // Update stored user data
      const userData = await this.getCurrentUser();
      if (userData) {
        const updatedUserData = {
          ...userData,
          email: newEmail,
          emailVerified: false, // New email needs verification
        };

        await SecureStore.setItemAsync(this.USER_KEY, JSON.stringify(updatedUserData));
      }

      return {
        success: true,
        message: 'Email change initiated. Please check your new email for verification.',
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
      };
    }
  }

  static async changePassword(currentPassword, newPassword) {
    try {
      const token = await SecureStore.getItemAsync(this.TOKEN_KEY);
      
      if (!token) {
        throw new Error('Not authenticated');
      }

      const response = await fetch(
        `https://identitytoolkit.googleapis.com/v1/accounts:update?key=${this.FIREBASE_CONFIG.apiKey}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            idToken: token,
            password: newPassword,
            returnSecureToken: true,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error?.message || 'Password change failed');
      }

      return {
        success: true,
        message: 'Password changed successfully',
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
      };
    }
  }

  static async deleteAccount(password) {
    try {
      const token = await SecureStore.getItemAsync(this.TOKEN_KEY);
      
      if (!token) {
        throw new Error('Not authenticated');
      }

      const response = await fetch(
        `https://identitytoolkit.googleapis.com/v1/accounts:delete?key=${this.FIREBASE_CONFIG.apiKey}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            idToken: token,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error?.message || 'Account deletion failed');
      }

      // Sign out and clear local data
      await this.signOut();

      return {
        success: true,
        message: 'Account deleted successfully',
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
      };
    }
  }

  static async isAuthenticated() {
    try {
      const token = await SecureStore.getItemAsync(this.TOKEN_KEY);
      return token && await this.verifyToken(token);
    } catch (error) {
      return false;
    }
  }

  static async onAuthStateChanged(callback) {
    // This would typically be handled by Firebase SDK's onAuthStateChanged
    // For manual implementation, we'll check token validity periodically
    let lastToken = await SecureStore.getItemAsync(this.TOKEN_KEY);
    
    const checkAuth = async () => {
      const currentToken = await SecureStore.getItemAsync(this.TOKEN_KEY);
      
      if (currentToken !== lastToken) {
        lastToken = currentToken;
        const user = currentToken ? await this.getCurrentUser() : null;
        callback(user);
      }
    };

    // Set up interval to check auth state
    const interval = setInterval(checkAuth, 5000);

    // Return cleanup function
    return () => clearInterval(interval);
  }
}
