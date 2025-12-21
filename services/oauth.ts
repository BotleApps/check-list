import { auth } from '../lib/supabase';
import { btpApi } from '../lib/btpApiClient';
import { User } from '../types/database';

const GOOGLE_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID;

export interface OAuthResult {
  success: boolean;
  user?: User;
  tokens?: {
    access_token: string;
    id_token: string;
  };
  error?: string | { message: string };
  isRedirecting?: boolean;
}

class OAuthService {
  /**
   * Sign in with Google OAuth (web) - using redirect flow
   */
  async signInWithGoogle(): Promise<OAuthResult> {
    try {
      if (!GOOGLE_CLIENT_ID) {
        return {
          success: false,
          error: 'Google OAuth is not configured. Please set EXPO_PUBLIC_GOOGLE_CLIENT_ID',
        };
      }

      if (typeof window === 'undefined') {
        return {
          success: false,
          error: 'Google Sign-In is only available in the browser',
        };
      }

      // Use direct OAuth redirect
      const redirectUri = `${window.location.origin}/auth/callback`;
      const state = Math.random().toString(36).substring(7);
      
      // Store state for validation
      sessionStorage.setItem('oauth_state', state);
      
      const authUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth');
      authUrl.searchParams.set('client_id', GOOGLE_CLIENT_ID);
      authUrl.searchParams.set('redirect_uri', redirectUri);
      authUrl.searchParams.set('response_type', 'token');
      authUrl.searchParams.set('scope', 'openid email profile');
      authUrl.searchParams.set('state', state);
      
      console.log('🚀 Redirecting to Google OAuth...');
      console.log('Redirect URI:', redirectUri);
      
      // Redirect to Google OAuth
      window.location.href = authUrl.toString();
      
      // Return redirecting status
      return {
        success: true,
        isRedirecting: true,
      };
    } catch (error) {
      console.error('Error in signInWithGoogle:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Authentication failed',
      };
    }
  }

  /**
   * Handle the OAuth callback
   */
  async handleCallback(accessToken: string): Promise<OAuthResult> {
    return this.validateGoogleToken(accessToken);
  }

  /**
   * Validate Google ID token with backend
   */
  private async validateGoogleToken(accessToken: string): Promise<OAuthResult> {
    try {
      await auth.setToken(accessToken);

      // Try the backend first
      const response = await btpApi.request<{ user: User }>('/auth/google', {
        method: 'POST',
        body: JSON.stringify({ token: accessToken }),
      });

      if (response.error) {
        // Check if it's a network/parsing error (backend not available)
        const errorStr = String(response.error);
        if (errorStr.includes('Unexpected token') || errorStr.includes('<!DOCTYPE') || errorStr.includes('Network error')) {
          console.warn('Backend not available, falling back to Google userinfo API');
          return this.validateWithGoogleDirectly(accessToken);
        }
        
        await auth.removeToken();
        return {
          success: false,
          error: response.error,
        };
      }

      if (response.data?.user) {
        const serverUser = response.data.user;
        await auth.setUser(serverUser);

        return {
          success: true,
          user: serverUser,
          tokens: {
            access_token: accessToken,
            id_token: accessToken,
          },
        };
      }

      await auth.removeToken();
      return {
        success: false,
        error: 'No user data received from server',
      };
    } catch (error) {
      console.error('Error validating Google token:', error);
      
      // Fallback to Google userinfo API for local development
      const errorStr = String(error);
      if (errorStr.includes('Unexpected token') || errorStr.includes('<!DOCTYPE')) {
        console.warn('Backend error, falling back to Google userinfo API');
        return this.validateWithGoogleDirectly(accessToken);
      }
      
      await auth.removeToken();
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Token validation failed',
      };
    }
  }

  /**
   * Fallback: Validate directly with Google's userinfo API (for local development)
   */
  private async validateWithGoogleDirectly(accessToken: string): Promise<OAuthResult> {
    try {
      // Call Google's userinfo endpoint directly
      const response = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to get user info from Google');
      }

      const googleUser = await response.json();
      
      // Create a local user object from Google's response
      const localUser: User = {
        user_id: googleUser.id,
        email: googleUser.email,
        name: googleUser.name,
        avatar_url: googleUser.picture,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      await auth.setUser(localUser);

      console.log('✅ Authenticated with Google directly (local development mode)');

      return {
        success: true,
        user: localUser,
        tokens: {
          access_token: accessToken,
          id_token: accessToken,
        },
      };
    } catch (error) {
      console.error('Error validating with Google directly:', error);
      await auth.removeToken();
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Google validation failed',
      };
    }
  }

  /**
   * Sign out
   */
  async signOut(): Promise<void> {
    await auth.removeToken();
  }
}

export const oauthService = new OAuthService();

