import React, { useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useDispatch } from 'react-redux';
import { supabase } from '../../lib/supabase';
import { setUser, clearError } from '../../store/slices/authSlice';

export default function AuthCallbackMobileScreen() {
  const router = useRouter();
  const dispatch = useDispatch();
  const params = useLocalSearchParams();

  useEffect(() => {
    handleMobileAuthCallback();
  }, []);

  const handleMobileAuthCallback = async () => {
    try {
      console.log('📱 Mobile OAuth callback received with params:', params);
      dispatch(clearError());

      // Handle OAuth errors
      if (params.error) {
        console.error('❌ OAuth error received:', params.error, params.error_description);
        router.replace(`/auth/login?error=${encodeURIComponent(params.error as string)}`);
        return;
      }

      // Extract URL parameters that should contain the OAuth tokens
      const access_token = params.access_token as string;
      const refresh_token = params.refresh_token as string;
      const token_type = params.token_type as string;
      const expires_in = params.expires_in as string;

      console.log('🔑 OAuth tokens received:', {
        hasAccessToken: !!access_token,
        hasRefreshToken: !!refresh_token,
        tokenType: token_type,
        expiresIn: expires_in
      });

      if (access_token) {
        // Set the session using the tokens from the OAuth callback
        const { data, error } = await supabase.auth.setSession({
          access_token,
          refresh_token: refresh_token || '',
        });

        if (error) {
          console.error('❌ Failed to set session:', error);
          router.replace('/auth/login?error=session_error');
          return;
        }

        if (data.session && data.user) {
          console.log('✅ Session set successfully, user authenticated');
          dispatch(clearError());
          
          // Update Redux store with user data
          dispatch(setUser({
            user_id: data.user.id,
            email: data.user.email!,
            name: data.user.user_metadata?.name || data.user.email!.split('@')[0],
            avatar_url: data.user.user_metadata?.avatar_url,
            created_at: new Date().toISOString(),
          }));

          // Navigate to main app
          router.replace('/(tabs)');
          return;
        }
      }

      // If no access token or session setup failed
      console.error('❌ No access token received or session setup failed');
      router.replace('/auth/login?error=no_tokens');

    } catch (error) {
      console.error('❌ Mobile OAuth callback error:', error);
      router.replace('/auth/login?error=callback_error');
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.text}>Completing authentication...</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
  text: {
    fontSize: 16,
    color: '#666',
  },
});
