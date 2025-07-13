import { OAuthProviderFactory } from './OAuthProviderFactory';
import { OAuthResult, OAuthError, AuthTokens } from './types';
import { supabase } from '../../lib/supabase';

/**
 * Central OAuth service that manages authentication flow across all platforms
 */
export class OAuthService {
  private static instance: OAuthService;

  private constructor() {}

  public static getInstance(): OAuthService {
    if (!OAuthService.instance) {
      OAuthService.instance = new OAuthService();
    }
    return OAuthService.instance;
  }

  /**
   * Initiate Google OAuth sign-in
   */
  async signInWithGoogle(): Promise<OAuthResult> {
    try {
      const provider = OAuthProviderFactory.getProvider();
      const result = await provider.signIn();

      if (result.success && result.tokens) {
        await this.setSupabaseSession(result.tokens);
      }

      return result;
    } catch (error) {
      console.error('OAuth service error:', error);
      return {
        success: false,
        error: {
          code: 'oauth_service_error',
          message: error instanceof Error ? error.message : 'Unknown OAuth error',
          details: error,
        },
      };
    }
  }

  /**
   * Handle OAuth callback (for web redirects)
   */
  async handleCallback(params: Record<string, string>): Promise<OAuthResult> {
    try {
      const provider = OAuthProviderFactory.getProvider();
      return await provider.handleCallback(params);
    } catch (error) {
      console.error('OAuth callback error:', error);
      return {
        success: false,
        error: {
          code: 'callback_error',
          message: error instanceof Error ? error.message : 'Callback handling failed',
          details: error,
        },
      };
    }
  }

  /**
   * Sign out from OAuth provider and Supabase
   */
  async signOut(): Promise<void> {
    try {
      const provider = OAuthProviderFactory.getProvider();
      await provider.signOut();
      
      // Sign out from Supabase
      await supabase.auth.signOut();
    } catch (error) {
      console.error('OAuth sign-out error:', error);
      // Continue with Supabase sign-out even if provider sign-out fails
      await supabase.auth.signOut();
    }
  }

  /**
   * Get current authentication status
   */
  async getAuthStatus(): Promise<{
    isAuthenticated: boolean;
    hasValidSession: boolean;
    provider?: string;
  }> {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      return {
        isAuthenticated: !!session?.user,
        hasValidSession: !!session && !this.isSessionExpired(session),
        provider: session?.user?.app_metadata?.provider,
      };
    } catch (error) {
      console.error('Error checking auth status:', error);
      return {
        isAuthenticated: false,
        hasValidSession: false,
      };
    }
  }

  /**
   * Refresh the current session
   */
  async refreshSession(): Promise<boolean> {
    try {
      const { data, error } = await supabase.auth.refreshSession();
      
      if (error) {
        console.error('Session refresh failed:', error);
        return false;
      }

      return !!data.session;
    } catch (error) {
      console.error('Error refreshing session:', error);
      return false;
    }
  }

  /**
   * Check if OAuth is available on current platform
   */
  isAvailable(): boolean {
    try {
      const provider = OAuthProviderFactory.getProvider();
      return provider.isAvailable();
    } catch (error) {
      console.error('Error checking OAuth availability:', error);
      return false;
    }
  }

  /**
   * Get current platform type
   */
  getPlatform(): string {
    try {
      const provider = OAuthProviderFactory.getProvider();
      return provider.getPlatform();
    } catch (error) {
      console.error('Error getting platform:', error);
      return 'unknown';
    }
  }

  /**
   * Debug OAuth configuration
   */
  debugConfig(): void {
    try {
      const provider = OAuthProviderFactory.getProvider();
      provider.debugConfig();
    } catch (error) {
      console.error('Error debugging config:', error);
    }
  }

  /**
   * Legacy method for compatibility - use signInWithGoogle instead
   */
  async signIn(): Promise<OAuthResult> {
    return this.signInWithGoogle();
  }

  /**
   * Get debug information for troubleshooting
   */
  getDebugInfo(): Record<string, any> {
    try {
      const provider = OAuthProviderFactory.getProvider();
      return {
        platform: provider.getPlatform(),
        isAvailable: provider.isAvailable(),
        timestamp: new Date().toISOString(),
        supabaseConfigured: !!supabase,
      };
    } catch (error) {
      return {
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString(),
      };
    }
  }

  // Private helper methods

  private async setSupabaseSession(tokens: AuthTokens): Promise<void> {
    try {
      const { data, error } = await supabase.auth.setSession({
        access_token: tokens.accessToken,
        refresh_token: tokens.refreshToken || '',
      });

      if (error) {
        throw new Error(`Failed to set Supabase session: ${error.message}`);
      }
    } catch (error) {
      console.error('Error setting Supabase session:', error);
      throw error;
    }
  }

  private isSessionExpired(session: any): boolean {
    if (!session?.expires_at) return false;
    
    const expiresAt = new Date(session.expires_at * 1000);
    const now = new Date();
    const bufferTime = 5 * 60 * 1000; // 5 minutes buffer
    
    return expiresAt.getTime() - bufferTime <= now.getTime();
  }
}

// Export singleton instance
export const oauthService = OAuthService.getInstance();
