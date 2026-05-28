import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Alert,
} from 'react-native';
import { Appbar, Button, Card, TextInput } from 'react-native-paper';
import { Ionicons } from '@expo/vector-icons';
import { useAppContext } from '../context/AppContext';

const LoginScreen = ({ navigation }) => {
  const { thunks, authLoading, error } = useAppContext();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const handleLogin = async () => {
    if (!email.trim() || !password.trim()) {
      Alert.alert('Error', 'Please enter both email and password');
      return;
    }

    try {
      const result = await thunks.signIn(email.trim(), password.trim());
      
      if (result.success) {
        Alert.alert('Success', 'Login successful');
        navigation.replace('Home');
      } else {
        Alert.alert('Error', result.error);
      }
    } catch (error) {
      Alert.alert('Error', 'Login failed');
    }
  };

  const handleForgotPassword = async () => {
    if (!email.trim()) {
      Alert.alert('Error', 'Please enter your email address');
      return;
    }

    Alert.alert('Info', 'Password reset functionality would be implemented here');
  };

  return (
    <View style={styles.container}>
      <Appbar.Header style={styles.header}>
        <Appbar.Content title="Login" />
      </Appbar.Header>

      <ScrollView style={styles.content}>
        <View style={styles.logoContainer}>
          <Ionicons name="code" size={80} color="#2196F3" />
          <Text style={styles.logoText}>CodeSurfer IDE</Text>
          <Text style={styles.subtitle}>Mobile Development Environment</Text>
        </View>

        <Card style={styles.card}>
          <Card.Content>
            <Text style={styles.cardTitle}>Welcome Back</Text>
            <Text style={styles.cardSubtitle}>Sign in to your account</Text>

            <TextInput
              label="Email"
              value={email}
              onChangeText={setEmail}
              style={styles.input}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              mode="outlined"
            />

            <TextInput
              label="Password"
              value={password}
              onChangeText={setPassword}
              style={styles.input}
              secureTextEntry={!showPassword}
              mode="outlined"
              right={
                <TextInput.Icon
                  icon={showPassword ? "eye-off" : "eye"}
                  onPress={() => setShowPassword(!showPassword)}
                />
              }
            />

            <Button
              mode="contained"
              onPress={handleLogin}
              loading={authLoading}
              disabled={authLoading}
              style={styles.loginButton}
            >
              Sign In
            </Button>

            <View style={styles.forgotPasswordContainer}>
              <Button
                mode="text"
                onPress={handleForgotPassword}
                disabled={authLoading}
              >
                Forgot Password?
              </Button>
            </View>
          </Card.Content>
        </Card>

        <View style={styles.signupContainer}>
          <Text style={styles.signupText}>Don't have an account?</Text>
          <Button
            mode="text"
            onPress={() => navigation.navigate('Register')}
          >
            Sign Up
          </Button>
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#121212',
  },
  header: {
    backgroundColor: '#1E1E1E',
    elevation: 0,
  },
  content: {
    flex: 1,
    padding: 20,
  },
  logoContainer: {
    alignItems: 'center',
    marginTop: 40,
    marginBottom: 40,
  },
  logoText: {
    color: '#FFFFFF',
    fontSize: 28,
    fontWeight: 'bold',
    marginTop: 16,
  },
  subtitle: {
    color: '#888888',
    fontSize: 16,
    marginTop: 8,
  },
  card: {
    backgroundColor: '#1E1E1E',
    borderWidth: 1,
    borderColor: '#333333',
  },
  cardTitle: {
    color: '#FFFFFF',
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 8,
  },
  cardSubtitle: {
    color: '#888888',
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 24,
  },
  input: {
    marginBottom: 16,
  },
  loginButton: {
    marginTop: 8,
    paddingVertical: 8,
  },
  forgotPasswordContainer: {
    alignItems: 'center',
    marginTop: 16,
  },
  signupContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 32,
  },
  signupText: {
    color: '#888888',
    fontSize: 16,
  },
});

export default LoginScreen;
