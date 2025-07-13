import React, { useEffect } from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useDispatch } from 'react-redux';
import { supabase } from '../../lib/supabase';
import { clearError } from '../../store/slices/authSlice';
import { isWeb } from '../../services/oauth/types';

export default function AuthCallbackScreen() {
  const router = useRouter();
  const dispatch = useDispatch();
  const params = useLocalSearchParams();

  useEffect(() => {
    handleAuthCallback();
  }, []);

  const handleAuthCallback = async () => {
    try {
      console.log('🔄 Auth callback initiated');
      console.log('📱 Platform:', isWeb() ? 'Web' : 'Mobile');

      // Check for OAuth errors first
      const error = params.error || params.error_description;
      if (error) {
        console.log('❌ OAuth error detected:', error);
        router.replace(`/auth/login?error=${encodeURIComponent(error as string)}`);
        return;
      }

      // For web, handle hash fragments
      if (isWeb() && typeof window !== 'undefined' && window.location.hash) {
        console.log('🌐 Processing web OAuth hash fragments');
        await handleWebOAuthCallback();
        return;
      }

      // For mobile or fallback, check session
      await handleSessionCallback();
    } catch (error) {
      console.error('❌ Error in auth callback:', error);
      router.replace('/auth/login?error=callback_error');
    }
  };

  const handleWebOAuthCallback = async (): Promise<void> => {
    if (typeof window === 'undefined') return;

    const hashParams = new URLSearchParams(window.location.hash.substring(1));
    const accessToken = hashParams.get('access_token');
    const refreshToken = hashParams.get('refresh_token');
    
    console.log('🔍 Hash tokens found:', { 
      hasAccessToken: !!accessToken, 
      hasRefreshToken: !!refreshToken 
    });

    if (accessToken) {
      try {
        const { data, error } = await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken || '',
        });

        if (error) {
          console.error('❌ Error setting session from hash:', error);
          router.replace('/auth/login?error=session_error');
          return;
        }

        console.log('✅ Session set successfully from hash tokens');
        dispatch(clearError());
        
        // Let auth state listener handle navigation
        // Small delay to ensure session is processed
        setTimeout(() => {
          router.replace('/(tabs)');
        }, 100);
      } catch (error) {
        console.error('❌ Error processing hash tokens:', error);
        router.replace('/auth/login?error=token_error');
      }
    } else {
      console.log('❌ No access token found in hash');
      router.replace('/auth/login?error=no_token');
    }
  };

  const handleSessionCallback = async (): Promise<void> => {
    // Small delay to allow session to be established
    await new Promise(resolve => setTimeout(resolve, 1000));

    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    
    console.log('📋 Session check:', session ? 'Session found' : 'No session', sessionError);

    if (session?.user) {
      console.log('✅ Session found - letting auth state listener handle navigation');
      dispatch(clearError());
      router.replace('/(tabs)');
    } else {
      console.log('❌ No session found after OAuth');
      router.replace('/auth/login?error=auth_failed');
    }
  };

  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" color="#2563EB" />
      <Text style={styles.text}>Completing sign in...</Text>
      <Text style={styles.subtext}>Please wait a moment</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    padding: 24,
  },
  text: {
    marginTop: 16,
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    textAlign: 'center',
  },
  subtext: {
    marginTop: 8,
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
  },
});
