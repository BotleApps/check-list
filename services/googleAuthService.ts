import * as Google from 'expo-auth-session/providers/google';
import * as AuthSession from 'expo-auth-session';
import * as WebBrowser from 'expo-web-browser';
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import { supabase } from '../lib/supabase';

// Make sure WebBrowser completes authentication sessions properly
WebBrowser.maybeCompleteAuthSession();

interface GoogleAuthConfig {
  webClientId: string;
  androidClientId: string;
  iosClientId: string;
}

class GoogleAuthService {
  private config: GoogleAuthConfig;

  constructor() {
    this.config = Constants.expoConfig?.extra?.googleOAuth || {
      webClientId: '',
      androidClientId: '',
      iosClientId: ''
    };
  }

  private getClientId(): string {
    if (Platform.OS === 'web') {
      return this.config.webClientId;
    } else if (Platform.OS === 'android') {
      return this.config.androidClientId;
    } else if (Platform.OS === 'ios') {
      // Fallback to web client ID if iOS client ID is not configured
      return this.config.iosClientId && !this.config.iosClientId.includes('REPLACE_WITH') 
        ? this.config.iosClientId 
        : this.config.webClientId;
    }
    return this.config.webClientId; // fallback
  }

  private getBaseUrl(): string {
    if (typeof window !== 'undefined') {
      return window.location.origin;
    }
    
    // Check for Netlify environment variables
    if (typeof process !== 'undefined' && process.env) {
      const netlifyUrl = process.env.REACT_APP_NETLIFY_URL || 
                        process.env.URL || 
                        process.env.DEPLOY_PRIME_URL;
      if (netlifyUrl) {
        return netlifyUrl;
      }
    }
    
    // Final fallback
    return 'http://localhost:3000';
  }

  private getRedirectUri(): string {
    if (Platform.OS === 'web') {
      return `${this.getBaseUrl()}/auth/callback`;
    } else {
      // For mobile, use Expo's proxy
      return AuthSession.makeRedirectUri({
        // @ts-ignore
        useProxy: true,
      });
    }
  }

  // React Native Google Sign-In using hooks (this should be called from a component)
  createGoogleAuthRequest() {
    const clientId = this.getClientId();
    const redirectUri = this.getRedirectUri();

    console.log('Initializing Google auth for platform:', Platform.OS);
    
    return Google.useAuthRequest({
      clientId,
      scopes: ['openid', 'profile', 'email'],
      responseType: AuthSession.ResponseType.Code,
      redirectUri,
    });
  }

  // Process Google authentication result
  async processGoogleAuthResult(response: AuthSession.AuthSessionResult): Promise<{ success: boolean; error?: string; user?: any }> {
    try {
      if (response?.type === 'success') {
        const { code } = response.params;
        
        if (!code) {
          return { 
            success: false, 
            error: 'No authorization code received from Google' 
          };
        }

        // For mobile apps, we need to exchange the code manually
        // since Supabase's signInWithOAuth doesn't handle the code exchange on mobile
        const clientId = this.getClientId();

        // IMPORTANT: The redirect URI for token exchange must match the one used in the auth request.
        const redirectUri = this.getRedirectUri();

        // Exchange authorization code for tokens
        const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: new URLSearchParams({
            client_id: clientId,
            code,
            grant_type: 'authorization_code',
            redirect_uri: redirectUri,
          }).toString(),
        });

        const tokens = await tokenResponse.json();

        if (tokens.error) {
          return { 
            success: false, 
            error: tokens.error_description || 'Failed to exchange authorization code' 
          };
        }

        // Sign in to Supabase with the ID token
        const { data, error } = await supabase.auth.signInWithIdToken({
          provider: 'google',
          token: tokens.id_token,
        });

        if (error) {
          console.error('Supabase sign-in error:', error);
          return { 
            success: false, 
            error: error.message || 'Failed to authenticate with Supabase' 
          };
        }

        return { 
          success: true, 
          user: data.user 
        };
      } else if (response?.type === 'cancel') {
        return { 
          success: false, 
          error: 'Authentication cancelled' 
        };
      } else {
        return { 
          success: false, 
          error: 'Authentication failed' 
        };
      }
    } catch (error) {
      console.error('Google authentication error:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error occurred' 
      };
    }
  }

  // Alternative method using WebBrowser for direct OAuth flow
  async signInWithGoogleWebBrowser(): Promise<{ success: boolean; error?: string; user?: any }> {
    try {
      const clientId = this.getClientId();
      
      if (!clientId) {
        return { 
          success: false, 
          error: 'Google OAuth client ID not configured for this platform' 
        };
      }

      // Generate state parameter for security
      const state = Math.random().toString(36).substring(7);

      // Build OAuth URL
      const redirectUri = AuthSession.makeRedirectUri({
        scheme: 'myapp'
      });

      const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?` +
        `client_id=${encodeURIComponent(clientId)}&` +
        `redirect_uri=${encodeURIComponent(redirectUri)}&` +
        `response_type=code&` +
        `scope=${encodeURIComponent('openid profile email')}&` +
        `state=${encodeURIComponent(state)}`;

      // Open browser for authentication
      const result = await WebBrowser.openAuthSessionAsync(
        authUrl,
        redirectUri
      );

      if (result.type === 'success') {
        const url = new URL(result.url);
        const code = url.searchParams.get('code');
        const returnedState = url.searchParams.get('state');
        
        if (returnedState !== state) {
          return { 
            success: false, 
            error: 'Invalid state parameter' 
          };
        }

        if (!code) {
          return { 
            success: false, 
            error: 'No authorization code received from Google' 
          };
        }

        // Exchange code for tokens
        const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: new URLSearchParams({
            client_id: clientId,
            code,
            grant_type: 'authorization_code',
            redirect_uri: redirectUri,
          }).toString(),
        });

        const tokens = await tokenResponse.json();

        if (tokens.error) {
          return { 
            success: false, 
            error: tokens.error_description || 'Failed to get access token' 
          };
        }

        // Sign in to Supabase with the ID token
        const { data, error } = await supabase.auth.signInWithIdToken({
          provider: 'google',
          token: tokens.id_token,
        });

        if (error) {
          console.error('Supabase Google auth error:', error);
          return { 
            success: false, 
            error: error.message || 'Failed to authenticate with Supabase' 
          };
        }

        return { 
          success: true, 
          user: data.user 
        };
      } else if (result.type === 'cancel') {
        return { 
          success: false, 
          error: 'Authentication cancelled' 
        };
      } else {
        return { 
          success: false, 
          error: 'Authentication failed' 
        };
      }
    } catch (error) {
      console.error('Google authentication error:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error occurred' 
      };
    }
  }

  // Simple Supabase OAuth redirect method (works best for web)
  async signInWithGoogleSupabase(): Promise<{ success: boolean; error?: string }> {
    try {
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: Platform.OS === 'web' 
            ? `${this.getBaseUrl()}/auth/callback`
            : 'myapp://auth/callback'
        }
      });

      if (error) {
        console.error('Supabase Google OAuth error:', error);
        return { 
          success: false, 
          error: error.message || 'Failed to initiate Google authentication' 
        };
      }

      return { success: true };
    } catch (error) {
      console.error('Google authentication error:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error occurred' 
      };
    }
  }

  // Check if Google OAuth is properly configured
  isConfigured(): boolean {
    const clientId = this.getClientId();
    return Boolean(clientId && !clientId.includes('REPLACE_WITH') && clientId.length > 0);
  }

  // Get current platform's client ID for debugging
  getCurrentClientId(): string {
    return this.getClientId();
  }
}

export const googleAuthService = new GoogleAuthService();
