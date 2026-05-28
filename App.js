import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Provider as PaperProvider } from 'react-native-paper';
import { StatusBar } from 'expo-status-bar';

// Import screens
import LoginScreen from './src/screens/LoginScreen';
import RegisterScreen from './src/screens/RegisterScreen';
import HomeScreen from './src/screens/HomeScreen';
import EditorScreen from './src/screens/EditorScreen';
import FileManagerScreen from './src/screens/FileManagerScreen';
import SettingsScreen from './src/screens/SettingsScreen';
import CompilerScreen from './src/screens/CompilerScreen';
import GitScreen from './src/screens/GitScreen';
import TerminalScreen from './src/screens/TerminalScreen';
import SearchScreen from './src/screens/SearchScreen';
import AIDebuggerScreen from './src/screens/AIDebuggerScreen';

// Import theme and context
import { theme } from './src/styles/theme';
import { AppProvider } from './src/context/AppContext';
import ErrorBoundary from './src/components/ErrorBoundary';

const Stack = createStackNavigator();

export default function App() {
  return (
    <ErrorBoundary>
      <PaperProvider theme={theme}>
        <SafeAreaProvider>
          <AppProvider>
            <NavigationContainer>
              <StatusBar style="auto" />
              <Stack.Navigator
                initialRouteName="Login"
                screenOptions={{
                  headerStyle: {
                    backgroundColor: theme.colors.primary,
                  },
                  headerTintColor: '#fff',
                  headerTitleStyle: {
                    fontWeight: 'bold',
                  },
                }}
              >
                <Stack.Screen 
                  name="Login" 
                  component={LoginScreen} 
                  options={{ headerShown: false }}
                />
                <Stack.Screen 
                  name="Register" 
                  component={RegisterScreen} 
                  options={{ headerShown: false }}
                />
                <Stack.Screen 
                  name="Home" 
                  component={HomeScreen} 
                  options={{ title: 'CodeSurfer IDE' }}
                />
                <Stack.Screen 
                  name="Editor" 
                  component={EditorScreen} 
                  options={{ title: 'Code Editor' }}
                />
                <Stack.Screen 
                  name="FileManager" 
                  component={FileManagerScreen} 
                  options={{ title: 'File Manager' }}
                />
                <Stack.Screen 
                  name="Settings" 
                  component={SettingsScreen} 
                  options={{ title: 'Settings' }}
                />
                <Stack.Screen 
                  name="Compiler" 
                  component={CompilerScreen} 
                  options={{ title: 'Android Compiler' }}
                />
                <Stack.Screen 
                  name="Git" 
                  component={GitScreen} 
                  options={{ title: 'Git Version Control' }}
                />
                <Stack.Screen 
                  name="Terminal" 
                  component={TerminalScreen} 
                  options={{ title: 'Terminal' }}
                />
                <Stack.Screen 
                  name="Search" 
                  component={SearchScreen} 
                  options={{ title: 'Search & Replace' }}
                />
                <Stack.Screen 
                  name="AIDebugger" 
                  component={AIDebuggerScreen} 
                  options={{ title: 'AI Debugger' }}
                />
              </Stack.Navigator>
            </NavigationContainer>
          </AppProvider>
        </SafeAreaProvider>
      </PaperProvider>
    </ErrorBoundary>
  );
}
