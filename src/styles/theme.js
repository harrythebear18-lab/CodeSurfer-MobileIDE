import { DefaultTheme } from 'react-native-paper';

export const theme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    primary: '#2196F3',
    accent: '#FF4081',
    background: '#121212',
    surface: '#1E1E1E',
    text: '#FFFFFF',
    onSurface: '#FFFFFF',
    disabled: '#666666',
    placeholder: '#888888',
    backdrop: 'rgba(0, 0, 0, 0.5)',
    notification: '#FF5252',
  },
  fonts: {
    ...DefaultTheme.fonts,
    regular: 'System',
    medium: 'System',
    light: 'System',
    thin: 'System',
  },
};

export const lightTheme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    primary: '#2196F3',
    accent: '#FF4081',
    background: '#FFFFFF',
    surface: '#F5F5F5',
    text: '#000000',
    onSurface: '#000000',
    disabled: '#999999',
    placeholder: '#CCCCCC',
    backdrop: 'rgba(0, 0, 0, 0.5)',
    notification: '#FF5252',
  },
};
