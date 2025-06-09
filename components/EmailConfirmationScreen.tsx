import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { RootState, AppDispatch } from '../store';
import { resendConfirmation, clearEmailConfirmation } from '../store/slices/authSlice';

export const EmailConfirmationScreen: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>();
  const { pendingConfirmationEmail, loading, error } = useSelector((state: RootState) => state.auth);

  const handleResendConfirmation = async () => {
    if (!pendingConfirmationEmail) return;

    try {
      await dispatch(resendConfirmation(pendingConfirmationEmail)).unwrap();
      Alert.alert(
        'Email Sent',
        'A new confirmation email has been sent to your email address.',
        [{ text: 'OK' }]
      );
    } catch (error: any) {
      Alert.alert(
        'Error',
        error.message || 'Failed to resend confirmation email.',
        [{ text: 'OK' }]
      );
    }
  };

  const handleBackToLogin = () => {
    dispatch(clearEmailConfirmation());
  };

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>Check Your Email</Text>
        
        <Text style={styles.message}>
          We've sent a confirmation link to:
        </Text>
        
        <Text style={styles.email}>{pendingConfirmationEmail}</Text>
        
        <Text style={styles.instructions}>
          Please check your email and click the confirmation link to complete your registration.
        </Text>
        
        <TouchableOpacity
          style={styles.resendButton}
          onPress={handleResendConfirmation}
          disabled={loading}
        >
          <Text style={styles.resendButtonText}>
            {loading ? 'Sending...' : 'Resend Confirmation Email'}
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={styles.backButton}
          onPress={handleBackToLogin}
        >
          <Text style={styles.backButtonText}>Back to Login</Text>
        </TouchableOpacity>
        
        {error && (
          <Text style={styles.errorText}>{error}</Text>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  content: {
    backgroundColor: 'white',
    padding: 30,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
    width: '100%',
    maxWidth: 400,
    alignItems: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 20,
    textAlign: 'center',
  },
  message: {
    fontSize: 16,
    color: '#6b7280',
    textAlign: 'center',
    marginBottom: 10,
  },
  email: {
    fontSize: 16,
    fontWeight: '600',
    color: '#3b82f6',
    textAlign: 'center',
    marginBottom: 20,
  },
  instructions: {
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 30,
  },
  resendButton: {
    backgroundColor: '#3b82f6',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    marginBottom: 15,
    width: '100%',
  },
  resendButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
  backButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#d1d5db',
    width: '100%',
  },
  backButtonText: {
    color: '#6b7280',
    fontSize: 16,
    fontWeight: '500',
    textAlign: 'center',
  },
  errorText: {
    color: '#ef4444',
    fontSize: 14,
    textAlign: 'center',
    marginTop: 15,
  },
});
