import { auth } from '../lib/supabase';
import { btpApi } from '../lib/btpApiClient';
import { User } from '../types/database';

const GOOGLE_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID;

interface OAuthResult {
  success: boolean;
  user?: User;
  tokens?: {
    access_token: string;
    id_token: string;
  };
  error?: string | { message: string };
}

class OAuthService {
  private googleScriptPromise?: Promise<void>;
  private tokenClient?: google.accounts.oauth2.TokenClient;
  private pendingResolve?: (result: OAuthResult) => void;
  private redirectMessageHandler?: (event: MessageEvent) => void;

  /**
   * Sign in with Google OAuth (web)
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

      await this.ensureTokenClient();

      if (!this.tokenClient) {
        return {
          success: false,
          error: 'Failed to load Google Sign-In client. Please refresh and try again.',
        };
      }

      // Listen for redirect-based fallbacks (3rd-party cookies disabled, etc.)
      this.registerRedirectListener();

      // Trigger the Google prompt when the user clicks the button
      return await new Promise<OAuthResult>((resolve) => {
        this.pendingResolve = resolve;

        try {
          this.tokenClient!.requestAccessToken({ prompt: 'consent' });
        } catch (error) {
          console.error('Google prompt failed:', error);
          this.finish({
            success: false,
            error: error instanceof Error ? error.message : 'Authentication failed',
          });
        }
      });
    } catch (error) {
      console.error('Error in signInWithGoogle:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Authentication failed',
      };
    }
  }

  /**
   * Ensure the Google Identity Services script is loaded and initialized
   */
  private async ensureTokenClient(): Promise<void> {
    await this.loadGoogleScript();

    if (this.tokenClient) {
      return;
    }

    if (!window.google?.accounts?.oauth2) {
      throw new Error('Google OAuth client unavailable');
    }

    this.tokenClient = window.google.accounts.oauth2.initTokenClient({
      client_id: GOOGLE_CLIENT_ID!,
      scope: 'openid email profile',
      prompt: '',
      callback: this.handleTokenResponse,
      error_callback: (error) => {
        console.error('Google token error:', error);
        this.finish({
          success: false,
          error: error?.message || 'Google Sign-In failed',
        });
      },
    });
  }

  /**
   * Load the Google Identity Services script dynamically (singleton)
   */
  private async loadGoogleScript(): Promise<void> {
    if (this.googleScriptPromise) {
      return this.googleScriptPromise;
    }

    this.googleScriptPromise = new Promise((resolve, reject) => {
      if (typeof document === 'undefined') {
        resolve();
        return;
      }

      // Script already available
      if (window.google?.accounts?.oauth2) {
        resolve();
        return;
      }

      const script = document.createElement('script');
      script.src = 'https://accounts.google.com/gsi/client';
      script.async = true;
      script.defer = true;
      script.onload = () => resolve();
      script.onerror = () => reject(new Error('Failed to load Google Identity Services'));
      document.head.appendChild(script);
    });

    return this.googleScriptPromise.catch((error) => {
      console.error('Failed to load Google script:', error);
      // Reset promise so future attempts retry loading
      this.googleScriptPromise = undefined;
      throw error;
    });
  }

  private readonly handleTokenResponse = async (tokenResponse: google.accounts.oauth2.TokenResponse) => {
    const accessToken = tokenResponse?.access_token;

    if (!accessToken) {
      this.finish({
        success: false,
        error: 'Google Sign-In did not return an access token',
      });
      return;
    }

    try {
      const result = await this.processAccessToken(accessToken);
      this.finish(result);
    } catch (error) {
      console.error('Error handling Google token response:', error);
      this.finish({
        success: false,
        error: error instanceof Error ? error.message : 'Authentication failed',
      });
    }
  };

  /**
   * Resolve the pending promise and reset state
   */
  private finish(result: OAuthResult) {
    if (this.pendingResolve) {
      this.pendingResolve(result);
      this.pendingResolve = undefined;
    }

    if (this.redirectMessageHandler && typeof window !== 'undefined') {
      window.removeEventListener('message', this.redirectMessageHandler);
      this.redirectMessageHandler = undefined;
    }
  }

  private registerRedirectListener() {
    if (typeof window === 'undefined') {
      return;
    }

    if (this.redirectMessageHandler) {
      window.removeEventListener('message', this.redirectMessageHandler);
    }

    this.redirectMessageHandler = async (event: MessageEvent) => {
      try {
        if (event.origin !== window.location.origin) {
          return;
        }

        const data = event.data as
          | undefined
          | {
              type?: string;
              accessToken?: string;
              idToken?: string;
              error?: string;
              errorDescription?: string;
            };

        if (!data || data.type !== 'GOOGLE_OAUTH_TOKEN') {
          return;
        }

        if (data.error) {
          this.finish({
            success: false,
            error: data.errorDescription || data.error,
          });
          return;
        }

        if (!data.accessToken) {
          this.finish({
            success: false,
            error: 'Google Sign-In did not return an access token',
          });
          return;
        }

        const result = await this.processAccessToken(data.accessToken);
        this.finish(result);
      } catch (error) {
        console.error('Error processing redirect message:', error);
        this.finish({
          success: false,
          error: error instanceof Error ? error.message : 'Authentication failed',
        });
      }
    };

    window.addEventListener('message', this.redirectMessageHandler);
  }

  private async processAccessToken(accessToken: string): Promise<OAuthResult> {
    // Fetch the user's profile from Google to enrich backend user data
    const profileResponse = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (!profileResponse.ok) {
      throw new Error(`Failed to fetch Google profile: HTTP ${profileResponse.status}`);
    }

    const profile = await profileResponse.json();

    if (!profile?.email) {
      throw new Error('Google profile response missing email');
    }

    return this.validateGoogleToken(accessToken, profile);
  }

  /**
   * Validate Google ID token with backend
   */
  private async validateGoogleToken(accessToken: string, profile?: Record<string, any>): Promise<OAuthResult> {
    try {
      await auth.setToken(accessToken);

      const response = await btpApi.request<{ user: User }>('/auth/google', {
        method: 'POST',
        body: JSON.stringify({ token: accessToken }),
      });

      if (response.error) {
        await auth.removeToken();
        return {
          success: false,
          error: response.error,
        };
      }

      if (response.data?.user) {
        const serverUser = response.data.user;
        const mergedUser: User = {
          ...serverUser,
          name: serverUser.name ?? profile?.name,
          avatar_url: serverUser.avatar_url ?? profile?.picture,
          created_at: serverUser.created_at ?? new Date().toISOString(),
          updated_at: serverUser.updated_at ?? undefined,
        };

        await auth.setUser(mergedUser);

        return {
          success: true,
          user: mergedUser,
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

    if (typeof window !== 'undefined' && window.google) {
      window.google.accounts.id?.disableAutoSelect?.();
    }
  }
}

export const oauthService = new OAuthService();

declare global {
  namespace google.accounts.oauth2 {
    interface TokenClient {
      requestAccessToken(options?: { prompt?: 'none' | 'consent' | 'select_account' }): void;
    }

    interface TokenResponse {
      access_token?: string;
      expires_in?: number;
      error?: string;
    }

    interface TokenClientConfig {
      client_id: string;
      scope: string;
      prompt?: string;
      callback: (tokenResponse: TokenResponse) => void;
      error_callback?: (error: { type: string; message: string }) => void;
    }

    function initTokenClient(config: TokenClientConfig): TokenClient;
  }

  interface Window {
    google?: {
      accounts: {
        oauth2: {
          initTokenClient: typeof google.accounts.oauth2.initTokenClient;
        };
        id?: {
          disableAutoSelect: () => void;
        };
      };
    };
  }
}
