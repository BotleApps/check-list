import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { oauthService } from '../../services/oauth';

export default function AuthCallbackScreen() {
  const [status, setStatus] = useState<'processing' | 'success' | 'error'>('processing');
  const [message, setMessage] = useState<string>('Completing sign-in...');

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    const processCallback = async () => {
      const queryParams = new URLSearchParams(window.location.search || '');
      const error = queryParams.get('error');

      if (error) {
        setStatus('error');
        setMessage(error);
        setTimeout(() => {
          window.location.replace(`/auth/login?error=${encodeURIComponent(error)}`);
        }, 2000);
        return;
      }

      // Check auth status via backend (reads HTTP-only cookie)
      try {
        console.log('🔄 Checking auth status via backend...');
        const result = await oauthService.checkAuthStatus();

        if (result.success && result.user) {
          console.log('✅ Authentication verified:', result.user.email);
          setStatus('success');
          setMessage('Sign-in successful! Redirecting...');
          setTimeout(() => {
            window.location.replace('/');
          }, 500);
        } else {
          throw new Error('Authentication verification failed. Please try signing in again.');
        }
      } catch (err) {
        console.error('Auth error:', err);
        setStatus('error');
        setMessage('Failed to complete sign-in. Please try again.');
        setTimeout(() => {
          window.location.replace('/auth/login?error=auth_failed');
        }, 2000);
      }
    };

    processCallback();
  }, []);

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        {status === 'processing' && (
          <ActivityIndicator style={styles.spinner} size="small" color="#4285F4" />
        )}
        <Text style={styles.title}>Google Sign-In</Text>
        <Text style={styles.message}>{message}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    padding: 24,
  },
  content: {
    alignItems: 'center',
    maxWidth: 320,
  },
  spinner: {
    marginBottom: 12,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: '#202124',
  },
  message: {
    textAlign: 'center',
    color: '#3C4043',
    lineHeight: 20,
    marginTop: 8,
  },
});
