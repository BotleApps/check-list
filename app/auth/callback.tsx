import React, { useEffect } from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useDispatch } from 'react-redux';
import { supabase } from '../../lib/supabase';
import { setUser, clearError } from '../../store/slices/authSlice';
import { authService } from '../../services/authService';

export default function AuthCallbackScreen() {
  const router = useRouter();
  const dispatch = useDispatch();
  const params = useLocalSearchParams();

  useEffect(() => {
    handleAuthCallback();
  }, []);

  const handleAuthCallback = async () => {
    try {
      console.log('Auth callback received with params:', params);

      // Wait a moment for Supabase to process the OAuth response
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Check for OAuth errors first
      const error = params.error || params.error_description;
      if (error) {
        console.log('OAuth error:', error);
        router.replace(`/auth/login?error=${encodeURIComponent(error as string)}`);
        return;
      }

      // For web OAuth, Supabase automatically handles the session
      // The auth state listener will detect the session and handle navigation
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      console.log('Current session after OAuth:', session ? 'exists' : 'none', sessionError);

      if (session?.user) {
        console.log('Session found - auth state listener will handle user profile and navigation');
        // Let the auth state listener handle everything
        // Just clear any previous errors
        dispatch(clearError());
      } else {
        console.log('No session found after OAuth');
        // Sometimes the session takes a moment to be available, try once more
        setTimeout(async () => {
          const { data: { session: retrySession } } = await supabase.auth.getSession();
          if (retrySession?.user) {
            console.log('Session found on retry - auth state listener will handle it');
            dispatch(clearError());
          } else {
            console.log('Still no session after retry, redirecting to login');
            router.replace('/auth/login?error=auth_failed');
          }
        }, 2000);
      }
    } catch (error) {
      console.error('Error in auth callback:', error);
      router.replace('/auth/login?error=callback_error');
    }
  };

  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" color="#3B82F6" />
      <Text style={styles.text}>Completing sign in...</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
  },
  text: {
    marginTop: 16,
    fontSize: 16,
    color: '#6B7280',
  },
});
