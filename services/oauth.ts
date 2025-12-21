import { auth } from '../lib/supabase';
import { User } from '../types/database';

const GOOGLE_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID;
const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:5001/api';

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
   * Sign in with Google OAuth - Server-side flow (recommended)
   * Redirects to backend which handles the OAuth flow
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

      // Redirect to backend OAuth endpoint - this is the server-side flow
      // The backend will handle the OAuth dance with Google and set cookies
      console.log('🚀 Redirecting to backend OAuth...');
      window.location.href = `${API_URL}/auth/google`;
      
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
   * Check if user is authenticated by calling the backend
   */
  async checkAuthStatus(): Promise<OAuthResult> {
    try {
      const response = await fetch(`${API_URL}/auth/status`, {
        credentials: 'include',
      });

      const data = await response.json();

      if (data.isAuthenticated && data.user) {
        await auth.setUser(data.user);
        return {
          success: true,
          user: data.user as User,
        };
      }

      return {
        success: false,
        error: 'Not authenticated',
      };
    } catch (error) {
      console.error('Error checking auth status:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to check auth status',
      };
    }
  }

  /**
   * Sign out
   */
  async signOut(): Promise<void> {
    try {
      await fetch(`${API_URL}/auth/logout`, {
        method: 'POST',
        credentials: 'include',
      });
    } catch (error) {
      console.error('Error signing out:', error);
    }
    await auth.removeToken();
  }
}

export const oauthService = new OAuthService();
