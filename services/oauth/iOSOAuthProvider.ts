import { supabase } from '../../lib/supabase';
import { BaseOAuthProvider } from './BaseOAuthProvider';
import { OAuthResult, isLocalDevelopment, getBaseUrl } from './types';
import * as WebBrowser from 'expo-web-browser';
import { Platform } from 'react-native';

export class iOSOAuthProvider extends BaseOAuthProvider {
  private getRedirectUrl(): string {
    // For iOS, use the app scheme directly for proper handoff back to the app
    return 'in.botle.checklistapp://auth/callback';
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

      const redirectUrl = this.getRedirectUrl();
      
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
      
      // Open the OAuth URL in system browser with app scheme redirect
      const result = await WebBrowser.openAuthSessionAsync(
        oauthUrl,
        redirectUrl,
        {
          showInRecents: false,
        }
      );
      
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
        // Extract tokens from the result URL if available
        if (result.url) {
          // Parse the URL to extract tokens from fragment
          let access_token: string | null = null;
          let refresh_token: string | null = null;
          
          try {
            const url = new URL(result.url);
            
            // Check fragment first (tokens after #)
            if (url.hash) {
              const fragmentParams = new URLSearchParams(url.hash.substring(1));
              access_token = fragmentParams.get('access_token');
              refresh_token = fragmentParams.get('refresh_token');
            }
            
            // If not in fragment, check query params
            if (!access_token && url.search) {
              access_token = url.searchParams.get('access_token');
              refresh_token = url.searchParams.get('refresh_token');
            }
            
            if (access_token) {
              // Set session directly with the tokens
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
                    message: `Failed to establish session: ${error.message}`
                  }
                };
              }
              
              if (data.session && data.user) {
                return {
                  success: true,
                  user: {
                    id: data.user.id,
                    email: data.user.email!,
                    name: data.user.user_metadata?.name || data.user.user_metadata?.full_name || data.user.email!.split('@')[0],
                    avatar_url: data.user.user_metadata?.avatar_url || data.user.user_metadata?.picture,
                  },
                  tokens: {
                    accessToken: access_token,
                    refreshToken: refresh_token || '',
                  }
                };
              } else {
                return {
                  success: false,
                  error: {
                    code: 'session_invalid',
                    message: 'Session was set but user data is missing'
                  }
                };
              }
            } else {
              return {
                success: false,
                error: {
                  code: 'no_tokens',
                  message: 'No authentication tokens received'
                }
              };
            }
          } catch (urlError) {
            console.error('❌ Error parsing OAuth result URL:', urlError);
            return {
              success: false,
              error: {
                code: 'url_parse_error',
                message: 'Failed to parse OAuth result URL'
              }
            };
          }
        } else {
          return {
            success: false,
            error: {
              code: 'no_result_url',
              message: 'OAuth completed but no result URL received'
            }
          };
        }
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
      if (params.error) {
        return {
          success: false,
          error: {
            code: params.error,
            message: params.error_description || 'OAuth callback error'
          }
        };
      }

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
