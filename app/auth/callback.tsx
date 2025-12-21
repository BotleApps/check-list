import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';

interface CallbackPayload {
  type: 'GOOGLE_OAUTH_TOKEN';
  accessToken?: string;
  idToken?: string;
  error?: string;
  errorDescription?: string;
}

export default function AuthCallbackScreen() {
  const [status, setStatus] = useState<'processing' | 'success' | 'error'>('processing');
  const [message, setMessage] = useState<string>('Completing sign-in...');

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    const processCallback = async () => {
      const hashParams = new URLSearchParams(window.location.hash?.replace(/^#/, '') || '');
      const queryParams = new URLSearchParams(window.location.search || '');

      const accessToken = hashParams.get('access_token') || queryParams.get('access_token') || undefined;
      const state = hashParams.get('state') || queryParams.get('state') || undefined;
      const error = hashParams.get('error') || queryParams.get('error') || undefined;
      const errorDescription =
        hashParams.get('error_description') || queryParams.get('error_description') || undefined;

      // Validate state to prevent CSRF
      const storedState = sessionStorage.getItem('oauth_state');
      if (state && storedState && state !== storedState) {
        setStatus('error');
        setMessage('Invalid state parameter. Please try again.');
        return;
      }

      if (error) {
        setStatus('error');
        setMessage(errorDescription || error);
        // Redirect back to login with error
        setTimeout(() => {
          window.location.replace(`/auth/login?error=${encodeURIComponent(errorDescription || error)}`);
        }, 2000);
        return;
      }

      if (!accessToken) {
        setStatus('error');
        setMessage('No access token received');
        setTimeout(() => {
          window.location.replace('/auth/login?error=no_token');
        }, 2000);
        return;
      }

      // Store the token and redirect to home
      try {
        // Import and use the auth service
        const { oauthService } = await import('../../services/oauth');
        
        const result = await oauthService.handleCallback(accessToken);

        if (!result.success) {
          throw new Error(typeof result.error === 'string' ? result.error : result.error?.message || 'Authentication failed');
        }

        setStatus('success');
        setMessage('Sign-in successful! Redirecting...');
        setTimeout(() => {
          window.location.replace('/');
        }, 500);
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
