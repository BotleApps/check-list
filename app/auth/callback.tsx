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

    const hashParams = new URLSearchParams(window.location.hash?.replace(/^#/, '') || '');
    const queryParams = new URLSearchParams(window.location.search || '');

    const accessToken = hashParams.get('access_token') || queryParams.get('access_token') || undefined;
    const idToken = hashParams.get('id_token') || queryParams.get('id_token') || undefined;
    const error = hashParams.get('error') || queryParams.get('error') || undefined;
    const errorDescription =
      hashParams.get('error_description') || queryParams.get('error_description') || undefined;

    const payload: CallbackPayload = {
      type: 'GOOGLE_OAUTH_TOKEN',
    };

    if (accessToken) {
      payload.accessToken = accessToken;
    }

    if (idToken) {
      payload.idToken = idToken;
    }

    if (error) {
      payload.error = error;
      payload.errorDescription = errorDescription;
    }

    if (window.opener && !window.opener.closed) {
      try {
        window.opener.postMessage(payload, window.location.origin);
        setStatus(error ? 'error' : 'success');
        setMessage(error ? 'Sign-in failed. This window can be closed.' : 'Sign-in complete. Closing window...');
        setTimeout(() => {
          window.close();
        }, 750);
        return;
      } catch (postError) {
        console.error('Failed to post message to opener:', postError);
        setStatus('error');
        setMessage('Sign-in completed, but automatic window close failed. You may close this tab.');
      }
    } else {
      setStatus(error ? 'error' : 'success');
      setMessage(
        error
          ? 'Sign-in failed. Please return to the main tab and try again.'
          : 'Sign-in complete. Return to the app tab.'
      );
    }

    // As a final fallback, redirect back to login after a delay
    const timeout = window.setTimeout(() => {
      window.location.replace(`/auth/login${error ? `?error=${encodeURIComponent(error)}` : ''}`);
    }, 4000);

    return () => {
      window.clearTimeout(timeout);
    };
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
