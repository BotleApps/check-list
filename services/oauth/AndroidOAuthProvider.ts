import { supabase } from '../../lib/supabase';
import { BaseOAuthProvider } from './BaseOAuthProvider';
import { OAuthResult, isLocalDevelopment, getBaseUrl } from './types';
import * as WebBrowser from 'expo-web-browser';
import { Platform } from 'react-native';

export class AndroidOAuthProvider extends BaseOAuthProvider {
  private getRedirectUrl(): string {
    // For Android, use the app scheme so the browser can redirect back to the app
    return 'in.botle.checklistapp://auth/callback';
  }

  private isAndroidEmulator(): boolean {
    return Platform.OS === 'android' && __DEV__;
  }

  async signIn(): Promise<OAuthResult> {
    try {
      if (!this.isConfigured()) {
        return {
          success: false,
          error: {
            code: 'not_configured',
            message: 'Google OAuth is not properly configured for Android'
          }
        };
      }

      if (this.isAndroidEmulator()) {
        console.warn('⚠️ Running on Android Emulator - OAuth may require additional setup');
        console.warn('📱 For full testing, use a physical Android device');
      }

      const redirectUrl = this.getRedirectUrl();
      
      console.log('🤖 Android OAuth Configuration:');
      console.log('🔄 Redirect URL:', redirectUrl);
      console.log('📱 Device Type:', this.isAndroidEmulator() ? 'Android Emulator' : 'Physical Device');
      console.log('🏠 Environment:', isLocalDevelopment() ? 'Development' : 'Production');
      
      // For Android, we need to manually construct the OAuth URL and open it in WebBrowser
      const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
      
      if (!supabaseUrl) {
        return {
          success: false,
          error: {
            code: 'configuration_error',
            message: 'Supabase URL not configured'
          }
        };
      }
      
      // Construct Google OAuth URL through Supabase
      const oauthUrl = `${supabaseUrl}/auth/v1/authorize?provider=google&redirect_to=${encodeURIComponent(redirectUrl)}&access_type=offline&prompt=consent`;
      
      console.log('🌐 Opening OAuth URL:', oauthUrl);
      
      // Open the OAuth URL in system browser
      const result = await WebBrowser.openAuthSessionAsync(
        oauthUrl,
        redirectUrl,
        {
          showInRecents: false,
        }
      );
      
      console.log('📱 WebBrowser result:', result);
      
      if (result.type === 'cancel') {
        return {
          success: false,
          error: {
            code: 'user_cancelled',
            message: 'Google sign-in was cancelled. Please try again and complete the authentication process.'
          }
        };
      }
      
      if (result.type === 'success') {
        console.log('✅ OAuth browser session completed successfully');
        
        // Extract tokens from the result URL if available
        if (result.url) {
          console.log('🔗 OAuth result URL:', result.url);
          
          // Parse the URL to extract tokens
          const url = new URL(result.url);
          const access_token = url.searchParams.get('access_token');
          const refresh_token = url.searchParams.get('refresh_token');
          
          if (access_token) {
            console.log('🔑 Tokens found in result URL, setting session');
            
            try {
              // Set session directly if we have the tokens
              const { data, error } = await supabase.auth.setSession({
                access_token,
                refresh_token: refresh_token || '',
              });
              
              if (error) {
                console.error('❌ Failed to set session from tokens:', error);
                return {
                  success: false,
                  error: {
                    code: 'session_error',
                    message: 'Failed to establish session with OAuth tokens'
                  }
                };
              }
              
              if (data.session && data.user) {
                console.log('✅ Session established successfully from OAuth tokens');
                return {
                  success: true,
                  user: {
                    id: data.user.id,
                    email: data.user.email!,
                    name: data.user.user_metadata?.name || data.user.email!.split('@')[0],
                    avatar_url: data.user.user_metadata?.avatar_url,
                  },
                  tokens: {
                    accessToken: access_token,
                    refreshToken: refresh_token || '',
                  }
                };
              }
            } catch (sessionError) {
              console.error('❌ Error setting session:', sessionError);
            }
          }
        }
        
        // If no direct tokens, the deep link handler will process the callback
        return { success: true };
      }
      
      return {
        success: false,
        error: {
          code: 'oauth_initiation_failed',
          message: 'Failed to open OAuth browser session'
        }
      };
    } catch (error) {
      console.error('❌ Android OAuth error:', error);
      return {
        success: false,
        error: {
          code: 'unknown_error',
          message: error instanceof Error ? error.message : 'Unknown error occurred'
        }
      };
    }
  }

  async handleCallback(params: Record<string, string>): Promise<OAuthResult> {
    try {
      console.log('🔄 Handling Android OAuth callback');
      
      if (params.error) {
        return {
          success: false,
          error: {
            code: params.error,
            message: params.error_description || 'OAuth callback error'
          }
        };
      }

      // For Android OAuth, the callback is typically handled automatically by the system
      // This method is called for validation/completion
      return {
        success: true,
        user: null // Will be populated by Supabase session
      };
    } catch (error) {
      console.error('❌ Android OAuth callback error:', error);
      return {
        success: false,
        error: {
          code: 'callback_error',
          message: error instanceof Error ? error.message : 'Callback handling failed'
        }
      };
    }
  }

  async signOut(): Promise<void> {
    console.log('🚪 Android OAuth sign-out (handled by Supabase)');
    // Android OAuth sign-out is typically handled by Supabase auth
    // No additional cleanup needed for Android platform
  }

  debugConfig(): void {
    this.logDebugInfo({
      '🔄 Redirect URL': this.getRedirectUrl(),
      '📱 Device Type': this.isAndroidEmulator() ? 'Android Emulator' : 'Physical Device',
      '🏠 Environment': isLocalDevelopment() ? 'Development' : 'Production',
      '⚠️ Emulator Note': this.isAndroidEmulator() ? 'Emulator may need additional setup' : 'Physical device - should work normally'
    });
  }

  debugEmulatorIssues(): void {
    if (this.isAndroidEmulator()) {
      this.logDebugInfo({
        '🤖 Android Emulator Detected': 'OAuth may need additional configuration',
        '🔧 Solution': 'Test on a physical Android device or configure emulator properly',
        '📝 Note': 'Emulators may have issues with OAuth redirects'
      });
    } else {
      console.log('✅ Physical Android device detected - OAuth should work normally');
    }
  }
}
