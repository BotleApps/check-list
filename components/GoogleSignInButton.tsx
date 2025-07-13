import React, { useState } from 'react';
import { 
  TouchableOpacity, 
  Text, 
  View, 
  StyleSheet, 
  ActivityIndicator
} from 'react-native';
import { AntDesign } from '@expo/vector-icons';
import { oauthService } from '../services/oauth';
import { authService } from '../services/authService';
import { useDispatch } from 'react-redux';
import { setUser, clearError } from '../store/slices/authSlice';

interface GoogleSignInButtonProps {
  onSuccess?: () => void;
  onError?: (error: string) => void;
  style?: any;
}

export const GoogleSignInButton: React.FC<GoogleSignInButtonProps> = ({
  onSuccess,
  onError,
  style
}) => {
  const [isLoading, setIsLoading] = useState(false);
  const dispatch = useDispatch();

  const handleGoogleSignIn = async () => {
    console.log('🚀 Google sign-in initiated');
    setIsLoading(true);
    
    try {
      // Use the centralized OAuth service
      console.log(`📱 Using ${oauthService.getPlatform()} OAuth Provider`);
      
      // Perform authentication
      const result = await oauthService.signInWithGoogle();
      
      if (result.success) {
        console.log('✅ OAuth authentication initiated successfully');
        
        // Check if we got user information directly (mobile with tokens in URL)
        if (result.user && result.tokens) {
          console.log('🔑 User information received directly, updating state');
          dispatch(clearError());
          dispatch(setUser({
            user_id: result.user.id,
            email: result.user.email,
            name: result.user.name,
            avatar_url: result.user.avatar_url,
            created_at: new Date().toISOString(),
          }));
          onSuccess?.();
          return;
        }
        
        // For all other cases (web redirect, mobile deep link), 
        // the authentication completion will be handled by callback handlers
        const platform = oauthService.getPlatform();
        console.log(`🌐 ${platform} OAuth redirect initiated - authentication will complete via callback`);
        
        // Don't call onSuccess yet - wait for callback
        return;
      } else {
        console.log('❌ OAuth authentication failed:', result.error);
        const errorMessage = typeof result.error === 'string' 
          ? result.error 
          : result.error?.message || 'Google authentication failed';
        onError?.(errorMessage);
      }
    } catch (error) {
      console.error('❌ Error during Google sign-in:', error);
      const errorMsg = error instanceof Error ? error.message : 'Unknown error occurred';
      onError?.(errorMsg);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <TouchableOpacity
      style={[styles.googleButton, style]}
      onPress={handleGoogleSignIn}
      disabled={isLoading}
    >
      <View style={styles.buttonContent}>
        {isLoading ? (
          <ActivityIndicator color="#fff" size="small" />
        ) : (
          <AntDesign name="google" size={20} color="#fff" />
        )}
        <Text style={styles.googleButtonText}>
          {isLoading ? 'Signing in...' : 'Sign in with Google'}
        </Text>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  googleButton: {
    backgroundColor: '#4285F4',
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderRadius: 12,
    marginVertical: 8,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  buttonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  googleButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
});
