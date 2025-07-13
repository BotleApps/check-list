import { supabase } from '../../lib/supabase';
import { BaseOAuthProvider } from './BaseOAuthProvider';
import { OAuthResult, isLocalDevelopment, getBaseUrl } from './types';
import * as WebBrowser from 'expo-web-browser';
import { Platform } from 'react-native';

export class iOSOAuthProvider extends BaseOAuthProvider {
  private getRedirectUrl(): string {
    // For iOS, we need to use a web URL that can then redirect to the app scheme
    // This ensures proper OAuth flow completion
    const baseUrl = getBaseUrl();
    return `${baseUrl}/auth/callback-mobile-web`;
  }

  private isIOSSimulator(): boolean {
    return Platform.OS === 'ios' && __DEV__;
  }

  async signIn(): Promise<OAuthResult> {
    try {
      if (!this.isConfigured()) {
        return {
          success: false,
          error: {
            code: 'not_configured',
            message: 'Google OAuth is not properly configured for iOS'
          }
        };
      }

      if (this.isIOSSimulator()) {
        console.warn('⚠️ Running on iOS Simulator - OAuth may work differently than on device');
        console.warn('📱 For full testing, use a physical iOS device');
      }

      const redirectUrl = this.getRedirectUrl();
      
      console.log('📱 iOS OAuth Configuration:');
      console.log('🔄 Redirect URL:', redirectUrl);
      console.log('📱 Device Type:', this.isIOSSimulator() ? 'iOS Simulator' : 'Physical Device');
      console.log('🏠 Environment:', isLocalDevelopment() ? 'Development' : 'Production');
      
      // For iOS, we need to manually construct the OAuth URL and open it in WebBrowser
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
        'in.botle.checklistapp', // Use the app scheme as the redirect base
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
        
        // The web callback page will handle token extraction and redirect to the app
        // Just return success here - the deep link handler will process the actual tokens
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
      console.error('❌ iOS OAuth error:', error);
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
      console.log('🔄 Handling iOS OAuth callback');
      
      if (params.error) {
        return {
          success: false,
          error: {
            code: params.error,
            message: params.error_description || 'OAuth callback error'
          }
        };
      }

      // For iOS OAuth, the callback is typically handled automatically by the system
      // This method is called for validation/completion
      return {
        success: true,
        user: null // Will be populated by Supabase session
      };
    } catch (error) {
      console.error('❌ iOS OAuth callback error:', error);
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
    console.log('🚪 iOS OAuth sign-out (handled by Supabase)');
    // iOS OAuth sign-out is typically handled by Supabase auth
    // No additional cleanup needed for iOS platform
  }

  debugConfig(): void {
    this.logDebugInfo({
      '🔄 Redirect URL': this.getRedirectUrl(),
      '📱 Device Type': this.isIOSSimulator() ? 'iOS Simulator' : 'Physical Device',
      '🏠 Environment': isLocalDevelopment() ? 'Development' : 'Production',
      '⚠️ Simulator Warning': this.isIOSSimulator() ? 'OAuth may not work on simulator' : 'Physical device - should work normally'
    });
  }

  debugSimulatorIssues(): void {
    if (this.isIOSSimulator()) {
      this.logDebugInfo({
        '📱 iOS Simulator Detected': 'OAuth may not work properly',
        '🔧 Solution': 'Test on a physical iOS device',
        '📝 Note': 'Simulators often have issues with OAuth redirects'
      });
    } else {
      console.log('✅ Physical iOS device detected - OAuth should work normally');
    }
  }
}
