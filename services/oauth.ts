import { auth } from '../lib/supabase';
import { btpApi } from '../lib/btpApiClient';

const GOOGLE_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID;

interface OAuthResult {
  success: boolean;
  user?: {
    id: string;
    email: string;
    name?: string;
    avatar_url?: string;
  };
  tokens?: {
    access_token: string;
    id_token: string;
  };
  error?: string | { message: string };
}

class OAuthService {
  /**
   * Sign in with Google OAuth (Web only for now)
   */
  async signInWithGoogle(): Promise<OAuthResult> {
    try {
      if (!GOOGLE_CLIENT_ID) {
        return {
          success: false,
          error: 'Google OAuth is not configured. Please set EXPO_PUBLIC_GOOGLE_CLIENT_ID',
        };
      }

      // For web, use Google Sign-In with popup
      if (typeof window !== 'undefined' && window.google) {
        return await this.signInWithGoogleWeb();
      }

      // Load Google Sign-In library
      return await this.loadGoogleSignIn();
    } catch (error) {
      console.error('Error in signInWithGoogle:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Authentication failed',
      };
    }
  }

  /**
   * Load Google Sign-In library dynamically
   */
  private async loadGoogleSignIn(): Promise<OAuthResult> {
    return new Promise((resolve) => {
      // Check if script already loaded
      if (typeof window !== 'undefined' && window.google) {
        this.signInWithGoogleWeb().then(resolve);
        return;
      }

      // Load Google Sign-In script
      const script = document.createElement('script');
      script.src = 'https://accounts.google.com/gsi/client';
      script.async = true;
      script.defer = true;
      script.onload = () => {
        this.signInWithGoogleWeb().then(resolve);
      };
      script.onerror = () => {
        resolve({
          success: false,
          error: 'Failed to load Google Sign-In library',
        });
      };
      document.head.appendChild(script);
    });
  }

  /**
   * Sign in with Google on web using popup
   */
  private async signInWithGoogleWeb(): Promise<OAuthResult> {
    return new Promise((resolve) => {
      try {
        if (!window.google) {
          resolve({
            success: false,
            error: 'Google Sign-In library not loaded',
          });
          return;
        }

        // Initialize Google Sign-In
        window.google.accounts.id.initialize({
          client_id: GOOGLE_CLIENT_ID!,
          callback: async (response: any) => {
            try {
              // response.credential is the JWT ID token
              const idToken = response.credential;
              
              // Send to backend for validation
              const result = await this.validateGoogleToken(idToken);
              resolve(result);
            } catch (error) {
              console.error('Error handling Google callback:', error);
              resolve({
                success: false,
                error: error instanceof Error ? error.message : 'Authentication failed',
              });
            }
          },
        });

        // Show the One Tap dialog or prompt
        window.google.accounts.id.prompt((notification: any) => {
          if (notification.isNotDisplayed() || notification.isSkippedMoment()) {
            // Fallback to popup if One Tap is not available
            console.log('One Tap not available, using popup');
            this.showGooglePopup().then(resolve);
          }
        });
      } catch (error) {
        console.error('Error in signInWithGoogleWeb:', error);
        resolve({
          success: false,
          error: error instanceof Error ? error.message : 'Authentication failed',
        });
      }
    });
  }

  /**
   * Show Google Sign-In popup as fallback
   */
  private async showGooglePopup(): Promise<OAuthResult> {
    return new Promise((resolve) => {
      const client = window.google?.accounts.oauth2.initCodeClient({
        client_id: GOOGLE_CLIENT_ID!,
        scope: 'email profile openid',
        ux_mode: 'popup',
        callback: async (response: any) => {
          try {
            if (response.error) {
              resolve({
                success: false,
                error: response.error,
              });
              return;
            }

            // Exchange code for tokens (handled by backend)
            const result = await fetch('/api/auth/google-code', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ code: response.code }),
            }).then(r => r.json());

            if (result.error) {
              resolve({ success: false, error: result.error });
            } else {
              resolve({
                success: true,
                user: result.user,
                tokens: result.tokens,
              });
            }
          } catch (error) {
            resolve({
              success: false,
              error: error instanceof Error ? error.message : 'Authentication failed',
            });
          }
        },
      });

      client.requestCode();
    });
  }

  /**
   * Validate Google ID token with backend
   */
  private async validateGoogleToken(idToken: string): Promise<OAuthResult> {
    try {
      // Store token temporarily
      await auth.setToken(idToken);

      // Call backend to validate and create/update user
      const response = await btpApi.request('/auth/google', {
        method: 'POST',
        body: JSON.stringify({ token: idToken }),
      });

      if (response.error) {
        await auth.removeToken();
        return {
          success: false,
          error: response.error,
        };
      }

      // Store user data
      if (response.data && response.data.user) {
        await auth.setUser(response.data.user);
        
        return {
          success: true,
          user: response.data.user,
          tokens: {
            access_token: idToken,
            id_token: idToken,
          },
        };
      }

      return {
        success: false,
        error: 'No user data received from server',
      };
    } catch (error) {
      console.error('Error validating Google token:', error);
      await auth.removeToken();
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Token validation failed',
      };
    }
  }

  /**
   * Sign out
   */
  async signOut(): Promise<void> {
    await auth.removeToken();
    await auth.setUser(null);
    
    // Also revoke Google session if available
    if (typeof window !== 'undefined' && window.google) {
      window.google.accounts.id.disableAutoSelect();
    }
  }
}

export const oauthService = new OAuthService();

// Type definitions for Google Sign-In
declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (config: any) => void;
          prompt: (callback?: (notification: any) => void) => void;
          disableAutoSelect: () => void;
        };
        oauth2: {
          initCodeClient: (config: any) => any;
        };
      };
    };
  }
}
