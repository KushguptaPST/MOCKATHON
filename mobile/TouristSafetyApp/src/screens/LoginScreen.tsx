import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { authAPI, tokenManager } from '../services/api';
import { refreshAuthStatus } from '../hooks/useAuth';
import { CustomSuccessModal } from '../components/CustomSuccessModal';
import { ServerConfigModal } from '../components/ServerConfigModal';
import { LoginFormData, NavigationProps } from '../types';

const LoginScreen: React.FC<NavigationProps> = ({ navigation }) => {
  const [formData, setFormData] = useState<LoginFormData>({
    email: '',
    password: '',
  });
  const [loading, setLoading] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [showServerModal, setShowServerModal] = useState(false);

  const handleInputChange = (field: keyof LoginFormData, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value,
    }));
  };

  const validateForm = (): boolean => {
    if (!formData.email.trim()) {
      setErrorMessage('Please enter your email address');
      return false;
    }
    if (!formData.password.trim()) {
      setErrorMessage('Please enter your password');
      return false;
    }
    if (!formData.email.includes('@')) {
      setErrorMessage('Please enter a valid email address');
      return false;
    }
    return true;
  };

  const handleLogin = async () => {
    setErrorMessage('');
    if (!validateForm()) return;

    setLoading(true);
    try {
      const response = await authAPI.login({
        email: formData.email.trim(),
        password: formData.password,
      });

      // Store token and user data
      await tokenManager.setToken(response.token);
      await tokenManager.setUserData(response.user);

      // Show beautiful custom modal with green checkmark tick
      setLoading(false);
      setShowSuccessModal(true);
    } catch (error: any) {
      console.error('Login error:', error);
      let msg = 'Login failed. Please check credentials.';
      if (error.response?.data?.message) {
        msg = error.response.data.message;
      } else if (error.message && (error.message.includes('Network Error') || error.code === 'ERR_NETWORK')) {
        msg = 'Network Error: Cannot connect to server. Please check your internet connection or tap "⚙️ Backend server settings" below.';
      } else if (error.message) {
        msg = error.message;
      }
      setErrorMessage(msg);
      setLoading(false);
    }
  };

  const handleSuccessClose = () => {
    setShowSuccessModal(false);
    refreshAuthStatus();
  };

  const fillDemoAccount = (email: string, pass: string) => {
    setFormData({ email, password: pass });
    setErrorMessage('');
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        <View style={styles.content}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.title}>Tourist Safety</Text>
            <Text style={styles.subtitle}>Stay Safe, Stay Connected</Text>
          </View>

          {/* Login Form */}
          <View style={styles.form}>
            <Text style={styles.formTitle}>Welcome Back</Text>
            
            {Boolean(errorMessage) && (
              <View style={styles.errorBox}>
                <Text style={styles.errorBoxText}>⚠️ {errorMessage}</Text>
              </View>
            )}

            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>Email</Text>
              <TextInput
                style={styles.input}
                placeholder="Enter your email"
                placeholderTextColor="#7f8c8d"
                value={formData.email}
                onChangeText={(value) => handleInputChange('email', value)}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
              />
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>Password</Text>
              <TextInput
                style={styles.input}
                placeholder="Enter your password"
                placeholderTextColor="#7f8c8d"
                value={formData.password}
                onChangeText={(value) => handleInputChange('password', value)}
                secureTextEntry
                autoCapitalize="none"
              />
            </View>

            <TouchableOpacity
              style={[styles.loginButton, loading && styles.disabledButton]}
              onPress={handleLogin}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.loginButtonText}>Login</Text>
              )}
            </TouchableOpacity>

            {/* Quick Demo Credentials */}
            <View style={styles.demoSection}>
              <Text style={styles.demoSectionTitle}>⚡ Quick Fill Test Accounts:</Text>
              <View style={styles.demoButtonsRow}>
                <TouchableOpacity
                  style={styles.demoButton}
                  onPress={() => fillDemoAccount('alok1234@gmail.com', 'alok1234')}
                  disabled={loading}
                >
                  <Text style={styles.demoButtonText}>👤 Alok (Tourist)</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.demoButton}
                  onPress={() => fillDemoAccount('kushg0082@gmail.com', 'kush1234')}
                  disabled={loading}
                >
                  <Text style={styles.demoButtonText}>👮 Kush (Admin)</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Register Link */}
            <View style={styles.registerContainer}>
              <Text style={styles.registerText}>Don't have an account?</Text>
              <TouchableOpacity
                onPress={() => navigation.navigate('Register')}
                disabled={loading}
              >
                <Text style={styles.registerLink}>Sign Up</Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              onPress={() => setShowServerModal(true)}
              disabled={loading}
              style={styles.serverSettingsButton}
            >
              <Text style={styles.serverSettingsText}>⚙️ Backend server settings</Text>
            </TouchableOpacity>
          </View>

          <ServerConfigModal
            visible={showServerModal}
            onClose={() => setShowServerModal(false)}
          />

          {/* Custom Success Modal with Green Checkmark Tick */}
          <CustomSuccessModal
            visible={showSuccessModal}
            title="Login successful"
            message="Welcome back to RakshakSetu!"
            buttonText="OK"
            onClose={handleSuccessClose}
          />
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  scrollContainer: {
    flexGrow: 1,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  header: {
    alignItems: 'center',
    marginBottom: 40,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#7f8c8d',
    textAlign: 'center',
  },
  form: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  formTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2c3e50',
    textAlign: 'center',
    marginBottom: 24,
  },
  errorBox: {
    backgroundColor: '#FFF2F1',
    borderWidth: 1,
    borderColor: '#FF3B30',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
  },
  errorBoxText: {
    color: '#D0021B',
    fontSize: 14,
    textAlign: 'center',
  },
  inputContainer: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#34495e',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    backgroundColor: '#f8f9fa',
    color: '#1a1a1a',
  },
  loginButton: {
    backgroundColor: '#3498db',
    borderRadius: 8,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 8,
  },
  disabledButton: {
    backgroundColor: '#bdc3c7',
  },
  loginButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  registerContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 24,
  },
  registerText: {
    fontSize: 16,
    color: '#7f8c8d',
  },
  demoSection: {
    marginTop: 16,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  demoSectionTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: '#7f8c8d',
    marginBottom: 8,
    textAlign: 'center',
  },
  demoButtonsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
  },
  demoButton: {
    backgroundColor: '#ebf5fb',
    borderWidth: 1,
    borderColor: '#aed6f1',
    borderRadius: 6,
    paddingVertical: 6,
    paddingHorizontal: 10,
  },
  demoButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#2980b9',
  },
  serverSettingsButton: {
    alignSelf: 'center',
    marginTop: 18,
  },
  serverSettingsText: {
    color: '#7f8c8d',
    fontSize: 13,
  },
});

export default LoginScreen;
