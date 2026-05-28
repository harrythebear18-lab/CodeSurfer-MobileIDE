import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { Alert } from 'react-native';
import LoginScreen from '../../src/screens/LoginScreen';
import { AppProvider } from '../../src/context/AppContext';

// Mock Alert
jest.mock('react-native', () => ({
  ...jest.requireActual('react-native'),
  Alert: {
    alert: jest.fn(),
  },
}));

// Mock AdminAuthService
jest.mock('../../src/services/adminAuthService', () => ({
  AdminAuthService: {
    signIn: jest.fn(),
    getCurrentAdmin: jest.fn(),
    signOut: jest.fn(),
    isAdminSession: jest.fn(),
  },
}));

describe('LoginScreen', () => {
  const renderWithProvider = (component) => {
    return render(
      <AppProvider>
        {component}
      </AppProvider>
    );
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders login form correctly', () => {
    const { getByPlaceholderText, getByText } = renderWithProvider(<LoginScreen navigation={{}} />);
    
    expect(getByPlaceholderText('Email')).toBeTruthy();
    expect(getByPlaceholderText('Password')).toBeTruthy();
    expect(getByText('Sign In')).toBeTruthy();
  });

  it('shows validation error for empty fields', async () => {
    const { getByText } = renderWithProvider(<LoginScreen navigation={{}} />);
    
    const signInButton = getByText('Sign In');
    fireEvent.press(signInButton);

    await waitFor(() => {
      expect(Alert.alert).toHaveBeenCalledWith('Error', 'Please enter both username and password');
    });
  });

  it('toggles admin mode correctly', () => {
    const { getByText, getByRole } = renderWithProvider(<LoginScreen navigation={{}} />);
    
    // Initially should show "Email" label
    expect(getByPlaceholderText('Email')).toBeTruthy();
    
    // Toggle admin mode
    const adminToggle = getByRole('switch');
    fireEvent(adminToggle, 'valueChange', true);
    
    // Should now show "Username" label
    expect(getByPlaceholderText('Username')).toBeTruthy();
  });

  it('handles successful login', async () => {
    const mockNavigation = { replace: jest.fn() };
    const { getByPlaceholderText, getByText } = renderWithProvider(<LoginScreen navigation={mockNavigation} />);
    
    // Fill in form
    fireEvent.changeText(getByPlaceholderText('Email'), 'test@example.com');
    fireEvent.changeText(getByPlaceholderText('Password'), 'password123');
    
    // Press sign in
    const signInButton = getByText('Sign In');
    fireEvent.press(signInButton);

    // Should navigate to Home screen (mocked)
    // Note: This would need actual thunks mock implementation
  });

  it('handles admin login correctly', async () => {
    const mockNavigation = { replace: jest.fn() };
    const { getByPlaceholderText, getByText, getByRole } = renderWithProvider(<LoginScreen navigation={mockNavigation} />);
    
    // Toggle admin mode
    const adminToggle = getByRole('switch');
    fireEvent(adminToggle, 'valueChange', true);
    
    // Fill in admin credentials
    fireEvent.changeText(getByPlaceholderText('Username'), 'HarryThompson');
    fireEvent.changeText(getByPlaceholderText('Password'), 'CannaClub1997!');
    
    // Press admin login
    const adminLoginButton = getByText('Admin Login');
    fireEvent.press(adminLoginButton);

    // Should navigate to Home screen with admin access
  });
});
