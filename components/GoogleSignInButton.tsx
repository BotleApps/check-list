import React, { useState } from 'react';
import { 
  TouchableOpacity, 
  Text, 
  View, 
  StyleSheet, 
  Alert,
  ActivityIndicator,
  Platform
} from 'react-native';
import { MaterialIcons, AntDesign } from '@expo/vector-icons';
import * as Google from 'expo-auth-session/providers/google';
import { googleAuthService } from '../services/googleAuthService';
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

  // Create Google auth request using the service
  const [request, response, promptAsync] = googleAuthService.createGoogleAuthRequest();

  // Handle the authentication response
  React.useEffect(() => {
    if (response) {
      console.log('Google auth response received:', response.type);
      handleGoogleResponse(response);
    }
  }, [response]);

  const handleGoogleResponse = async (response: any) => {
    console.log('Processing Google auth response:', response.type);
    setIsLoading(true);
    
    try {
      const result = await googleAuthService.processGoogleAuthResult(response);
      console.log('Google auth result:', result.success ? 'success' : 'failed', result.error);
      
      if (result.success) {
        // Get the current user session from Supabase
        console.log('Getting current user from Supabase...');
        const user = await authService.getCurrentUser();
        
        if (user) {
          console.log('User retrieved successfully:', user.user_id);
          dispatch(clearError());
          dispatch(setUser(user));
          onSuccess?.();
        } else {
          console.log('Failed to get user from Supabase');
          const errorMsg = 'Failed to get user information';
          onError?.(errorMsg);
        }
      } else {
        const errorMsg = result.error || 'Google authentication failed';
        console.log('Google auth failed:', errorMsg);
        onError?.(errorMsg);
        Alert.alert('Authentication Error', errorMsg);
      }
    } catch (error) {
      console.error('Error in handleGoogleResponse:', error);
      const errorMsg = error instanceof Error ? error.message : 'Unknown error occurred';
      onError?.(errorMsg);
      Alert.alert('Authentication Error', errorMsg);
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    console.log('Google sign-in initiated');
    
    if (!googleAuthService.isConfigured()) {
      const errorMsg = 'Google OAuth is not properly configured';
      console.log('Google OAuth not configured');
      Alert.alert('Configuration Error', errorMsg);
      onError?.(errorMsg);
      return;
    }

    console.log('Google OAuth is configured, proceeding...');
    setIsLoading(true);
    
    try {
      // Use expo-auth-session method for mobile (iOS/Android)
      if (Platform.OS === 'web') {
        console.log('Using Supabase OAuth for web');
        // For web, use Supabase OAuth redirect
        const result = await googleAuthService.signInWithGoogleSupabase();
        if (!result.success) {
          setIsLoading(false);
          const errorMsg = result.error || 'Failed to initiate Google sign-in';
          console.log('Supabase OAuth failed, trying WebBrowser method:', errorMsg);
          
          // Fallback to WebBrowser method if Supabase OAuth fails
          const webResult = await googleAuthService.signInWithGoogleWebBrowser();
          if (!webResult.success) {
            onError?.(webResult.error || 'Failed to initiate Google sign-in');
            Alert.alert('Authentication Error', webResult.error || 'Failed to initiate Google sign-in');
          }
        }
        // For web, the redirect will happen, so we don't need to handle response here
      } else {
        console.log('Using expo-auth-session for mobile');
        // For mobile, use expo-auth-session
        await promptAsync();
      }
    } catch (error) {
      console.error('Error initiating Google sign-in:', error);
      setIsLoading(false);
      const errorMsg = error instanceof Error ? error.message : 'Failed to initiate Google sign-in';
      onError?.(errorMsg);
      Alert.alert('Authentication Error', errorMsg);
    }
  };

  return (
    <TouchableOpacity
      style={[styles.googleButton, style]}
      onPress={handleGoogleSignIn}
      disabled={isLoading || !request}
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

// Alternative component using WebBrowser method
export const GoogleSignInButtonWebBrowser: React.FC<GoogleSignInButtonProps> = ({
  onSuccess,
  onError,
  style
}) => {
  const [isLoading, setIsLoading] = useState(false);
  const dispatch = useDispatch();

  const handleGoogleSignIn = async () => {
    if (!googleAuthService.isConfigured()) {
      const errorMsg = 'Google OAuth is not properly configured';
      Alert.alert('Configuration Error', errorMsg);
      onError?.(errorMsg);
      return;
    }

    setIsLoading(true);
    
    try {
      const result = await googleAuthService.signInWithGoogleWebBrowser();
      
      if (result.success) {
        // Get the current user session from Supabase
        const user = await authService.getCurrentUser();
        
        if (user) {
          dispatch(clearError());
          dispatch(setUser(user));
          onSuccess?.();
        } else {
          const errorMsg = 'Failed to get user information';
          onError?.(errorMsg);
        }
      } else {
        const errorMsg = result.error || 'Google authentication failed';
        onError?.(errorMsg);
        Alert.alert('Authentication Error', errorMsg);
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error occurred';
      onError?.(errorMsg);
      Alert.alert('Authentication Error', errorMsg);
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
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
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
    fontWeight: '500',
    marginLeft: 8,
  },
});
