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

const RegisterScreen = ({ navigation }) => {
  const { thunks, authLoading } = useAppContext();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const handleRegister = async () => {
    if (!name.trim() || !email.trim() || !password.trim() || !confirmPassword.trim()) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }

    if (password !== confirmPassword) {
      Alert.alert('Error', 'Passwords do not match');
      return;
    }

    if (password.length < 6) {
      Alert.alert('Error', 'Password must be at least 6 characters');
      return;
    }

    try {
      const result = await thunks.signUp(email.trim(), password.trim(), name.trim());
      
      if (result.success) {
        Alert.alert('Success', 'Registration successful');
        navigation.replace('Home');
      } else {
        Alert.alert('Error', result.error);
      }
    } catch (error) {
      Alert.alert('Error', 'Registration failed');
    }
  };

  return (
    <View style={styles.container}>
      <Appbar.Header style={styles.header}>
        <Appbar.BackAction onPress={() => navigation.goBack()} />
        <Appbar.Content title="Register" />
      </Appbar.Header>

      <ScrollView style={styles.content}>
        <View style={styles.logoContainer}>
          <Ionicons name="code" size={80} color="#2196F3" />
          <Text style={styles.logoText}>CodeSurfer IDE</Text>
          <Text style={styles.subtitle}>Create Your Account</Text>
        </View>

        <Card style={styles.card}>
          <Card.Content>
            <Text style={styles.cardTitle}>Sign Up</Text>
            <Text style={styles.cardSubtitle}>Join the mobile development community</Text>

            <TextInput
              label="Full Name"
              value={name}
              onChangeText={setName}
              style={styles.input}
              mode="outlined"
            />

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

            <TextInput
              label="Confirm Password"
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              style={styles.input}
              secureTextEntry={!showConfirmPassword}
              mode="outlined"
              right={
                <TextInput.Icon
                  icon={showConfirmPassword ? "eye-off" : "eye"}
                  onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                />
              }
            />

            <Button
              mode="contained"
              onPress={handleRegister}
              loading={authLoading}
              disabled={authLoading}
              style={styles.registerButton}
            >
              Create Account
            </Button>
          </Card.Content>
        </Card>

        <View style={styles.signinContainer}>
          <Text style={styles.signinText}>Already have an account?</Text>
          <Button
            mode="text"
            onPress={() => navigation.navigate('Login')}
          >
            Sign In
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
    marginTop: 20,
    marginBottom: 30,
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
  registerButton: {
    marginTop: 8,
    paddingVertical: 8,
  },
  signinContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 32,
  },
  signinText: {
    color: '#888888',
    fontSize: 16,
  },
});

export default RegisterScreen;
