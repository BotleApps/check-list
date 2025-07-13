import { supabase } from '../../lib/supabase';
import { BaseOAuthProvider } from './BaseOAuthProvider';
import { OAuthResult, getBaseUrl, isLocalDevelopment } from './types';

export class WebOAuthProvider extends BaseOAuthProvider {
  private getRedirectUrl(): string {
    const baseUrl = getBaseUrl();
    return `${baseUrl}/auth/callback`;
  }

  async signIn(): Promise<OAuthResult> {
    try {
      if (!this.isConfigured()) {
        return {
          success: false,
          error: {
            code: 'not_configured',
            message: 'Google OAuth is not properly configured for web'
          }
        };
      }

      const redirectUrl = this.getRedirectUrl();
      
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
          error: {
            code: 'oauth_initiation_failed',
            message: error.message || 'Failed to initiate Google authentication'
          }
        };
      }

      return { success: true };
    } catch (error) {
      console.error('Web OAuth error:', error);
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
      if (params.error) {
        return {
          success: false,
          error: {
            code: params.error,
            message: params.error_description || 'OAuth callback error'
          }
        };
      }

      // For web OAuth, the tokens are typically handled by Supabase directly
      // This method is called for validation/completion
      return {
        success: true,
        user: null // Will be populated by Supabase session
      };
    } catch (error) {
      console.error('Web OAuth callback error:', error);
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
    // Web OAuth sign-out is typically handled by Supabase auth
    // No additional cleanup needed for web platform
  }

  debugConfig(): void {
    this.logDebugInfo({
      '🔄 Redirect URL': this.getRedirectUrl(),
      '🌍 Environment': isLocalDevelopment() ? 'Local Development' : 'Production',
      '📍 Base URL': getBaseUrl()
    });
  }
}
