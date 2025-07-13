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
      // For iOS, use the iOS client ID specifically
      const iosClientId = this.config.iosClientId;
      console.log('iOS Client ID:', iosClientId);
      
      if (iosClientId && !iosClientId.includes('REPLACE_WITH') && iosClientId.length > 0) {
        return iosClientId;
      } else {
        console.warn('iOS Client ID not configured, falling back to web client ID');
        return this.config.webClientId;
      }
    }
    return this.config.webClientId; // fallback
  }

  private getBaseUrl(): string {
    if (typeof window !== 'undefined') {
      const currentOrigin = window.location.origin;
      console.log('Current window origin:', currentOrigin);
      
      // If we're on localhost, use localhost
      if (currentOrigin.includes('localhost') || currentOrigin.includes('127.0.0.1')) {
        console.log('Detected localhost environment');
        return currentOrigin;
      }
      
      // Otherwise use the current origin (production)
      return currentOrigin;
    }
    
    // Check for environment variables (fallback)
    if (typeof process !== 'undefined' && process.env) {
      // Check if we're in development mode
      const isDev = process.env.NODE_ENV === 'development' || 
                   process.env.EXPO_PUBLIC_ENV === 'development';
      
      if (isDev) {
        console.log('Development environment detected, using localhost');
        return 'http://localhost:3000';
      }
      
      // Production environment variables
      const netlifyUrl = process.env.REACT_APP_NETLIFY_URL || 
                        process.env.URL || 
                        process.env.DEPLOY_PRIME_URL ||
                        process.env.EXPO_PUBLIC_SITE_URL;
      if (netlifyUrl) {
        console.log('Using environment URL:', netlifyUrl);
        return netlifyUrl;
      }
    }
    
    // Final fallback - check if we're likely in development
    return 'http://localhost:3000';
  }

  private getRedirectUri(): string {
    if (Platform.OS === 'web') {
      return `${this.getBaseUrl()}/auth/callback`;
    } else {
      // For mobile (iOS/Android), use bundle/package identifier
      // iOS: Google automatically expects {bundleId}:/oauth
      // Android: Uses package name similarly
      let redirectUri: string;
      
      if (Platform.OS === 'ios') {
        // iOS uses bundle identifier for OAuth redirect
        redirectUri = 'in.botle.checklistapp:/oauth';
      } else {
        // Android uses package name
        redirectUri = 'in.botle.checklistapp://oauth';
      }
      
      console.log(`${Platform.OS} redirect URI:`, redirectUri);
      return redirectUri;
    }
  }

  // Check if running on iOS simulator
  private isIOSSimulator(): boolean {
    if (Platform.OS !== 'ios') return false;
    
    // In Expo/React Native, we can check if it's a simulator
    // Constants.isDevice is false on simulator
    return !Constants.isDevice;
  }

  // Debug method for simulator-specific issues
  debugSimulatorIssues(): void {
    if (Platform.OS === 'ios') {
      console.log('🔍 iOS Simulator Debug:');
      console.log('📱 Is Real Device:', Constants.isDevice);
      console.log('🖥️ Is Simulator:', this.isIOSSimulator());
      
      if (this.isIOSSimulator()) {
        console.log('⚠️ SIMULATOR DETECTED - OAuth issues expected:');
        console.log('   1. Redirect URI handling may be inconsistent');
        console.log('   2. URL scheme launching may fail');
        console.log('   3. "invalid_grant" errors are common in simulator');
        console.log('   4. Consider testing on real iOS device');
        console.log('🔧 Try using signInWithGoogleSupabase() method for simulator');
      } else {
        console.log('✅ Real device detected - OAuth should work properly');
      }
    }
  }

  // React Native Google Sign-In using hooks (this should be called from a component)
  createGoogleAuthRequest() {
    const clientId = this.getClientId();
    const redirectUri = this.getRedirectUri();

    console.log('🚀 Initializing Google auth for platform:', Platform.OS);
    console.log('📱 Client ID:', clientId);
    console.log('🔄 Redirect URI:', redirectUri);
    console.log('🔧 URL Schemes in app.json should include:', Platform.OS === 'ios' ? 'bundle ID and reversed iOS client ID' : 'package name and reversed client ID');
    
    if (!clientId || clientId.includes('REPLACE_WITH')) {
      console.error('❌ Client ID not configured for platform:', Platform.OS);
      return null;
    }
    
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
      console.log('🔄 Processing Google auth result:', response?.type);
      console.log('📱 Platform:', Platform.OS);
      
      if (response?.type === 'success') {
        console.log('✅ OAuth response success, extracting code...');
        const { code } = response.params;
        
        if (!code) {
          console.error('❌ No authorization code in response params:', response.params);
          return { 
            success: false, 
            error: 'No authorization code received from Google' 
          };
        }

        console.log('✅ Authorization code received, exchanging for tokens...');
        const clientId = this.getClientId();
        const redirectUri = this.getRedirectUri();

        console.log('🔄 Token exchange - Client ID:', clientId);
        console.log('🔄 Token exchange - Redirect URI:', redirectUri);
        console.log('🔄 Token exchange - Platform:', Platform.OS);
        console.log('🔄 Token exchange - Is Simulator:', this.isIOSSimulator());

        // For iOS simulator, add additional debugging
        if (this.isIOSSimulator()) {
          console.log('⚠️ iOS Simulator detected - this may cause invalid_grant errors');
          console.log('🔧 If you get invalid_grant, try testing on a real device');
        }

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
        console.log('🎫 Token response:', tokens.error ? 'ERROR' : 'SUCCESS');

        if (tokens.error) {
          console.error('❌ Token exchange error:', tokens.error, tokens.error_description);
          
          // Special handling for iOS simulator invalid_grant error
          if (tokens.error === 'invalid_grant' && this.isIOSSimulator()) {
            console.error('🔧 iOS Simulator Issue: invalid_grant is common in simulator');
            console.error('💡 Solution: Test on a real iOS device for accurate OAuth flow');
            return { 
              success: false, 
              error: 'OAuth failed in iOS simulator - please test on real device' 
            };
          }
          
          return { 
            success: false, 
            error: tokens.error_description || 'Failed to exchange authorization code' 
          };
        }

        console.log('✅ Tokens received, signing in to Supabase...');
        // Sign in to Supabase with the ID token
        const { data, error } = await supabase.auth.signInWithIdToken({
          provider: 'google',
          token: tokens.id_token,
        });

        if (error) {
          console.error('❌ Supabase sign-in error:', error);
          return { 
            success: false, 
            error: error.message || 'Failed to authenticate with Supabase' 
          };
        }

        console.log('✅ Successfully signed in to Supabase');
        return { 
          success: true, 
          user: data.user 
        };
      } else if (response?.type === 'cancel') {
        console.log('⚠️ User cancelled authentication');
        return { 
          success: false, 
          error: 'Authentication cancelled' 
        };
      } else {
        console.error('❌ Unknown response type:', response?.type);
        console.error('❌ Full response:', response);
        return { 
          success: false, 
          error: `Authentication failed: ${response?.type || 'unknown error'}` 
        };
      }
    } catch (error) {
      console.error('❌ Google authentication error:', error);
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
      const redirectUri = this.getRedirectUri();

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
      const baseUrl = this.getBaseUrl();
      const redirectUrl = Platform.OS === 'web' 
        ? `${baseUrl}/auth/callback`
        : this.getRedirectUri();
        
      console.log('🔄 Google OAuth Configuration:');
      console.log('📍 Base URL:', baseUrl);
      console.log('🔄 Redirect URL:', redirectUrl);
      console.log('🌍 Environment:', typeof window !== 'undefined' && window.location.origin.includes('localhost') ? 'Local Development' : 'Production');
      
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: redirectUrl,
          queryParams: {
            access_type: 'offline',
            prompt: 'consent',
          }
        }
      });

      if (error) {
        console.error('Supabase Google OAuth error:', error);
        return { 
          success: false, 
          error: error.message || 'Failed to initiate Google authentication' 
        };
      }

      console.log('✅ Google OAuth initiated successfully');
      return { success: true };
    } catch (error) {
      console.error('Google authentication error:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error occurred' 
      };
    }
  }

  // Alternative method specifically for iOS simulator testing
  async signInWithGoogleForSimulator(): Promise<{ success: boolean; error?: string; user?: any }> {
    try {
      console.log('🔧 Using simulator-friendly Google OAuth...');
      
      if (Platform.OS !== 'ios' || !this.isIOSSimulator()) {
        return {
          success: false,
          error: 'This method is only for iOS simulator testing'
        };
      }

      // Use the Supabase OAuth method which handles redirects differently
      const redirectUrl = 'in.botle.checklistapp://auth/callback';
      
      console.log('🔄 Simulator OAuth redirect URL:', redirectUrl);
      
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: redirectUrl,
          queryParams: {
            access_type: 'offline',
            prompt: 'consent',
          }
        }
      });

      if (error) {
        console.error('❌ Supabase Google OAuth error:', error);
        return { 
          success: false, 
          error: error.message || 'Failed to initiate Google authentication' 
        };
      }

      console.log('✅ OAuth initiated for simulator');
      return { success: true };
    } catch (error) {
      console.error('❌ Simulator Google authentication error:', error);
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

  // Debug method specifically for iOS configuration
  debugiOSConfig(): void {
    if (Platform.OS === 'ios') {
      console.log('🍎 iOS Google OAuth Debug:');
      console.log('📱 iOS Client ID:', this.config.iosClientId);
      console.log('🔄 iOS Redirect URI:', this.getRedirectUri());
      console.log('📋 Bundle ID in app.json: in.botle.checklistapp');
      console.log('🔧 Expected URL Schemes in app.json:');
      console.log('   - in.botle.checklistapp (bundle identifier)');
      console.log('   - com.googleusercontent.apps.13192300053-fvf13qac2j650m93crtlpl4o61pu3gvd (reversed client ID)');
      console.log('🌐 Google Cloud Console iOS OAuth Client Configuration:');
      console.log('   - Application Type: iOS');
      console.log('   - Bundle ID: in.botle.checklistapp');
      console.log('   - NO redirect URI field (auto-generated from bundle ID)');
      console.log('📝 iOS redirect URI is automatically: {bundleId}:/oauth');
      
      // Simulator check
      if (this.isIOSSimulator()) {
        console.log('⚠️ SIMULATOR WARNING: OAuth may not work properly in simulator');
        console.log('🔧 Recommendation: Test on real iOS device for accurate results');
      }
      
      // Check if the iOS client ID looks correct
      const iosClientId = this.config.iosClientId;
      if (iosClientId && iosClientId.endsWith('.apps.googleusercontent.com')) {
        console.log('✅ iOS Client ID format looks correct');
      } else {
        console.log('❌ iOS Client ID format looks incorrect');
      }
      
      // Check redirect URI
      const redirectUri = this.getRedirectUri();
      if (redirectUri === 'in.botle.checklistapp:/oauth') {
        console.log('✅ Redirect URI matches bundle ID pattern');
      } else {
        console.log('❌ Redirect URI should be in.botle.checklistapp:/oauth, currently:', redirectUri);
      }
    }
  }

  // Debug utility to check OAuth configuration
  debugOAuthConfig(): void {
    console.log('🔍 Google OAuth Configuration Debug:');
    console.log('Platform:', Platform.OS);
    console.log('Client ID:', this.getClientId());
    console.log('Redirect URI:', this.getRedirectUri());
    console.log('Is Configured:', this.isConfigured());
  }
}

export const googleAuthService = new GoogleAuthService();
