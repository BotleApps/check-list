import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useDispatch } from 'react-redux';
import { supabase } from '../../lib/supabase';
import { setUser, clearError } from '../../store/slices/authSlice';
import { oauthService } from '../../services/oauth/OAuthService';

export default function AuthCallbackScreen() {
  const router = useRouter();
  const dispatch = useDispatch();
  const params = useLocalSearchParams();
  const [isProcessing, setIsProcessing] = useState(true);
  const [statusMessage, setStatusMessage] = useState('Processing authentication...');

  useEffect(() => {
    handleAuthCallback();
  }, []);

  const handleAuthCallback = async () => {
    try {
      console.log('🔄 Auth callback received with params:', params);
      dispatch(clearError());
      
      // Extract all parameters for processing
      const allParams: Record<string, string> = {};
      
      // Get URL parameters
      Object.entries(params).forEach(([key, value]) => {
        if (typeof value === 'string') {
          allParams[key] = value;
        }
      });

      // For web, also check hash fragments
      if (typeof window !== 'undefined' && window.location.hash) {
        console.log('🔗 Hash fragments detected:', window.location.hash);
        const hashParams = new URLSearchParams(window.location.hash.substring(1));
        hashParams.forEach((value, key) => {
          allParams[key] = value;
        });
      }

      console.log('📋 All callback parameters:', allParams);

      // Check for OAuth errors first
      if (allParams.error) {
        console.error('❌ OAuth error in callback:', allParams.error);
        setStatusMessage(`Authentication failed: ${allParams.error_description || allParams.error}`);
        setTimeout(() => router.replace('/auth/login'), 3000);
        return;
      }

      // Use the modular OAuth service to handle the callback
      setStatusMessage('Validating authentication...');
      const result = await oauthService.handleCallback(allParams);

      if (!result.success) {
        console.error('❌ OAuth callback validation failed:', result.error);
        setStatusMessage(`Authentication validation failed: ${result.error?.message}`);
        setTimeout(() => router.replace('/auth/login'), 3000);
        return;
      }

      // Get the current session
      setStatusMessage('Retrieving session...');
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();

      if (sessionError || !session) {
        console.error('❌ Failed to retrieve session:', sessionError);
        setStatusMessage('Failed to establish session');
        setTimeout(() => router.replace('/auth/login'), 3000);
        return;
      }

      console.log('✅ Session established successfully');
      setStatusMessage('Authentication successful! Redirecting...');
      
      // Update Redux store with user data
      dispatch(setUser({
        user_id: session.user.id,
        email: session.user.email!,
        name: session.user.user_metadata?.name || session.user.email!.split('@')[0],
        avatar_url: session.user.user_metadata?.avatar_url,
        created_at: new Date().toISOString(),
      }));

      // Navigate to main app
      setTimeout(() => {
        router.replace('/');
      }, 1000);

    } catch (error) {
      console.error('❌ Auth callback error:', error);
      setStatusMessage('Authentication failed due to an unexpected error');
      setTimeout(() => router.replace('/auth/login'), 3000);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" color="#007AFF" style={styles.spinner} />
      <Text style={styles.title}>Completing Sign In</Text>
      <Text style={styles.message}>{statusMessage}</Text>
      
      {!isProcessing && (
        <Text style={styles.debugInfo}>
          Platform: {oauthService.getPlatform()}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    padding: 20,
  },
  spinner: {
    marginBottom: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 10,
    textAlign: 'center',
  },
  message: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 24,
  },
  debugInfo: {
    fontSize: 12,
    color: '#999',
    textAlign: 'center',
    marginTop: 20,
  },
});
