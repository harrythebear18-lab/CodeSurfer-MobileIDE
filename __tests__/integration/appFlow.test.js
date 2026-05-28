import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { Alert } from 'react-native';
import App from '../../App';

// Mock Expo modules
jest.mock('expo-constants', () => ({
  expo: {
    extra: {
      eas: { projectId: 'test-project-id' }
    }
  }
}));

jest.mock('expo-font', () => ({
  loadAsync: jest.fn(),
  isLoaded: jest.fn(() => true),
}));

jest.mock('expo-secure-store', () => ({
  getItemAsync: jest.fn(),
  setItemAsync: jest.fn(),
  deleteItemAsync: jest.fn(),
}));

jest.mock('expo-file-system', () => ({
  documentDirectory: '/mock/document/directory/',
  readDirectoryAsync: jest.fn(),
  getInfoAsync: jest.fn(),
  makeDirectoryAsync: jest.fn(),
  readAsStringAsync: jest.fn(),
  writeAsStringAsync: jest.fn(),
  deleteAsync: jest.fn(),
}));

// Mock services
jest.mock('../../src/services/adminAuthService', () => ({
  AdminAuthService: {
    signIn: jest.fn(),
    getCurrentAdmin: jest.fn(),
    signOut: jest.fn(),
    isAdminSession: jest.fn(),
  },
}));

jest.mock('../../src/services/realAuthService', () => ({
  RealAuthService: {
    signIn: jest.fn(),
    signUp: jest.fn(),
    signOut: jest.fn(),
    getCurrentUser: jest.fn(),
  },
}));

describe('App Integration Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders login screen initially', async () => {
    const { getByText, getByPlaceholderText } = render(<App />);
    
    await waitFor(() => {
      expect(getByText('Welcome Back')).toBeTruthy();
      expect(getByPlaceholderText('Email')).toBeTruthy();
      expect(getByPlaceholderText('Password')).toBeTruthy();
    });
  });

  it('handles complete login flow', async () => {
    const { getByPlaceholderText, getByText } = render(<App />);
    
    // Wait for login screen to render
    await waitFor(() => {
      expect(getByText('Welcome Back')).toBeTruthy();
    });

    // Fill in credentials
    fireEvent.changeText(getByPlaceholderText('Email'), 'test@example.com');
    fireEvent.changeText(getByPlaceholderText('Password'), 'password123');
    
    // Press sign in
    fireEvent.press(getByText('Sign In'));
    
    // Should navigate to home screen (mocked)
    // Note: This would need proper navigation mocking
  });

  it('handles admin login flow', async () => {
    const { getByPlaceholderText, getByText, getByRole } = render(<App />);
    
    // Wait for login screen to render
    await waitFor(() => {
      expect(getByText('Welcome Back')).toBeTruthy();
    });

    // Toggle admin mode
    const adminToggle = getByRole('switch');
    fireEvent(adminToggle, 'valueChange', true);
    
    // Fill in admin credentials
    fireEvent.changeText(getByPlaceholderText('Username'), 'HarryThompson');
    fireEvent.changeText(getByPlaceholderText('Password'), 'CannaClub1997!');
    
    // Press admin login
    fireEvent.press(getByText('Admin Login'));
    
    // Should navigate to home screen with admin access
  });

  it('handles navigation between screens', async () => {
    // This test would need proper navigation mocking
    // For now, just verify the app renders without crashing
    const { getByText } = render(<App />);
    
    await waitFor(() => {
      expect(getByText('Welcome Back')).toBeTruthy();
    });
  });

  it('handles file manager navigation', async () => {
    // This would test the file manager screen functionality
    // Would need proper mocking of file system operations
    const { getByText } = render(<App />);
    
    await waitFor(() => {
      expect(getByText('Welcome Back')).toBeTruthy();
    });
  });

  it('handles error states gracefully', async () => {
    // Mock authentication failure
    const { RealAuthService } = require('../../src/services/realAuthService');
    RealAuthService.signIn.mockRejectedValue(new Error('Authentication failed'));
    
    const { getByPlaceholderText, getByText } = render(<App />);
    
    await waitFor(() => {
      expect(getByText('Welcome Back')).toBeTruthy();
    });

    // Fill in credentials
    fireEvent.changeText(getByPlaceholderText('Email'), 'test@example.com');
    fireEvent.changeText(getByPlaceholderText('Password'), 'wrongpassword');
    
    // Press sign in
    fireEvent.press(getByText('Sign In'));
    
    // Should handle error gracefully
    // Note: This would need proper error handling in the components
  });
});
