import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  SafeAreaView,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Image,
} from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { RootState, AppDispatch } from '../../store';
import { loginUser, clearError, forgotPassword } from '../../store/slices/authSlice';
import { LoadingSpinner } from '../../components/LoadingSpinner';
import { GoogleSignInButton } from '../../components/GoogleSignInButton';
import { Toast } from '../../components/Toast';

export default function LoginScreen() {
  const dispatch = useDispatch<AppDispatch>();
  const router = useRouter();
  const params = useLocalSearchParams();
  const { loading, error, isAuthenticated, requiresEmailConfirmation } = useSelector((state: RootState) => state.auth);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showEmailLogin, setShowEmailLogin] = useState(false);
  
  // Toast state
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [toastType, setToastType] = useState<'success' | 'error'>('error');

  const showErrorToast = (message: string) => {
    setToastMessage(message);
    setToastType('error');
    setShowToast(true);
  };

  const showSuccessToast = (message: string) => {
    setToastMessage(message);
    setToastType('success');
    setShowToast(true);
  };

  // Handle OAuth errors from callback
  useEffect(() => {
    if (params.error) {
      const errorMessage = typeof params.error === 'string' ? params.error : 'Authentication failed';
      const friendlyMessage = getFriendlyErrorMessage(errorMessage);
      showErrorToast(friendlyMessage);
    }
  }, [params.error]);

  const getFriendlyErrorMessage = (error: string): string => {
    switch (error) {
      case 'profile_failed':
        return 'Failed to retrieve user profile. Please try again.';
      case 'auth_failed':
        return 'Authentication was not completed. Please try again.';
      case 'callback_error':
        return 'An error occurred during authentication. Please try again.';
      case 'session_error':
        return 'Failed to establish session. Please try again.';
      case 'no_tokens':
        return 'Authentication failed - no tokens received. Please try again.';
      case 'redirect_error':
        return 'Authentication redirect failed. Please try again.';
      default:
        return decodeURIComponent(error);
    }
  };

  useEffect(() => {
    if (isAuthenticated) {
      router.replace('/(tabs)');
    }
  }, [isAuthenticated, router]);

  useEffect(() => {
    if (requiresEmailConfirmation) {
      router.push('/auth/email-confirmation');
    }
  }, [requiresEmailConfirmation, router]);

  useEffect(() => {
    if (error && !requiresEmailConfirmation) {
      showErrorToast(error);
      dispatch(clearError());
    }
  }, [error, requiresEmailConfirmation, dispatch]);

  const handleLogin = async () => {
    if (!email.trim() || !password.trim()) {
      showErrorToast('Please fill in all fields');
      return;
    }

    try {
      await dispatch(loginUser({ email: email.trim(), password })).unwrap();
    } catch (error) {
      // Error is handled by useEffect above
    }
  };

  const handleForgotPassword = async () => {
    if (!email.trim()) {
      showErrorToast('Please enter your email address to reset your password');
      return;
    }

    try {
      await dispatch(forgotPassword(email.trim())).unwrap();
      showSuccessToast('Password reset email sent! Check your inbox.');
    } catch (error) {
      showErrorToast('Failed to send password reset email. Please try again.');
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardAvoid}
      >
        <ScrollView contentContainerStyle={styles.scrollContent}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.logoContainer}>
                <Image
                source={require('../../assets/images/icon.png')}
                style={{ width: 56, height: 56, resizeMode: 'contain' }}
                accessibilityLabel="Checklists Logo"
                />
            </View>
            <Text style={styles.title}>Checklists</Text>
            <Text style={styles.subtitle}>Sign in to continue to Checklists</Text>
          </View>

          {/* Form */}
          <View style={styles.form}>
            {!showEmailLogin ? (
              // Default view with Google login as primary
              <>
                {/* Google Sign-In Button */}
                <GoogleSignInButton
                  onSuccess={() => {
                    // Navigation will be handled by the auth state change
                  }}
                  onError={(error) => {
                    showErrorToast(error);
                  }}
                  style={styles.primaryGoogleButton}
                />

                {/* Divider */}
                <View style={styles.divider}>
                  <View style={styles.dividerLine} />
                  <Text style={styles.dividerText}>or</Text>
                  <View style={styles.dividerLine} />
                </View>

                {/* Email Login Button */}
                <TouchableOpacity
                  style={styles.emailLoginButton}
                  onPress={() => setShowEmailLogin(true)}
                >
                  <Text style={styles.icon}>📧</Text>
                  <Text style={styles.emailLoginButtonText}>Sign in with Email</Text>
                </TouchableOpacity>
              </>
            ) : (
              // Email login form
              <>
                <View style={styles.inputContainer}>
                  <Text style={styles.icon}>📧</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="Email address"
                    value={email}
                    onChangeText={setEmail}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    autoCorrect={false}
                  />
                </View>

                <View style={styles.inputContainer}>
                  <Text style={styles.icon}>🔒</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="Password"
                    value={password}
                    onChangeText={setPassword}
                    secureTextEntry={!showPassword}
                    autoCapitalize="none"
                  />
                  <TouchableOpacity
                    onPress={() => setShowPassword(!showPassword)}
                    style={styles.eyeButton}
                  >
                    <Text style={styles.icon}>
                      {showPassword ? '🙈' : '👁️'}
                    </Text>
                  </TouchableOpacity>
                </View>

                <TouchableOpacity
                  style={styles.forgotPasswordButton}
                  onPress={handleForgotPassword}
                >
                  <Text style={styles.forgotPasswordText}>Forgot Password?</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.loginButton, loading && styles.loginButtonDisabled]}
                  onPress={handleLogin}
                  disabled={loading}
                >
                  {loading ? (
                    <LoadingSpinner size="small" color="#FFFFFF" />
                  ) : (
                    <Text style={styles.loginButtonText}>Sign In</Text>
                  )}
                </TouchableOpacity>

                {/* Back to options */}
                <TouchableOpacity
                  style={styles.backButton}
                  onPress={() => setShowEmailLogin(false)}
                >
                  <Text style={styles.backButtonText}>← Other sign in options</Text>
                </TouchableOpacity>
              </>
            )}
          </View>

          {/* Sign Up Link */}
          <View style={styles.footer}>
            <Text style={styles.footerText}>Don't have an account? </Text>
            <TouchableOpacity onPress={() => router.push('/auth/register')}>
              <Text style={styles.signUpText}>Sign Up</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
      
      {/* Toast */}
      <Toast
        visible={showToast}
        message={toastMessage}
        type={toastType}
        onHide={() => setShowToast(false)}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  keyboardAvoid: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 24,
  },
  header: {
    alignItems: 'center',
    marginBottom: 32,
  },
  logoContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#EFF6FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  logo: {
    fontSize: 48,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
  },
  form: {
    marginBottom: 32,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 12,
    paddingHorizontal: 16,
    marginBottom: 16,
    backgroundColor: '#F9FAFB',
  },
  icon: {
    fontSize: 20,
    marginRight: 8,
  },
  input: {
    flex: 1,
    paddingVertical: 16,
    paddingLeft: 12,
    fontSize: 16,
    color: '#111827',
  },
  eyeButton: {
    padding: 4,
  },
  forgotPasswordButton: {
    alignSelf: 'flex-end',
    marginBottom: 24,
  },
  forgotPasswordText: {
    fontSize: 14,
    color: '#2563EB',
    fontWeight: '600',
  },
  loginButton: {
    backgroundColor: '#2563EB',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loginButtonDisabled: {
    backgroundColor: '#9CA3AF',
  },
  loginButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  footerText: {
    fontSize: 14,
    color: '#6B7280',
  },
  signUpText: {
    fontSize: 14,
    color: '#2563EB',
    fontWeight: '600',
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 24,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#E5E7EB',
  },
  dividerText: {
    marginHorizontal: 16,
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '500',
  },
  googleButton: {
    marginTop: 8,
  },
  primaryGoogleButton: {
    marginBottom: 8,
  },
  emailLoginButton: {
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
  },
  emailLoginButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
    marginLeft: 8,
  },
  backButton: {
    alignItems: 'center',
    marginTop: 24,
    paddingVertical: 12,
  },
  backButtonText: {
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '500',
  },
});