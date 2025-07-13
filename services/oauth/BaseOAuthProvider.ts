import Constants from 'expo-constants';
import { OAuthProvider, OAuthConfig, OAuthResult, getCurrentPlatform, PlatformType } from './types';

export abstract class BaseOAuthProvider implements OAuthProvider {
  protected config: OAuthConfig;
  protected platform = getCurrentPlatform();

  constructor() {
    this.config = Constants.expoConfig?.extra?.googleOAuth || {
      webClientId: '',
      androidClientId: '',
      iosClientId: ''
    };
  }

  abstract signIn(): Promise<OAuthResult>;
  abstract debugConfig(): void;

  // Default implementations for common methods
  async signOut(): Promise<void> {
    // Base implementation - can be overridden by platform-specific providers
  }

  async handleCallback(params: Record<string, string>): Promise<OAuthResult> {
    // Default implementation - should be overridden for platforms that need it
    return {
      success: false,
      error: {
        code: 'not_implemented',
        message: 'Callback handling not implemented for this platform'
      }
    };
  }

  isAvailable(): boolean {
    return this.isConfigured();
  }

  getPlatform(): PlatformType {
    return this.platform;
  }

  getClientId(): string {
    switch (this.platform) {
      case 'web':
        return this.config.webClientId;
      case 'android':
        return this.config.androidClientId;
      case 'ios':
        const iosClientId = this.config.iosClientId;
        if (iosClientId && !iosClientId.includes('REPLACE_WITH') && iosClientId.length > 0) {
          return iosClientId;
        }
        console.warn('iOS Client ID not configured, falling back to web client ID');
        return this.config.webClientId;
      default:
        return this.config.webClientId;
    }
  }

  isConfigured(): boolean {
    const clientId = this.getClientId();
    return Boolean(clientId && !clientId.includes('REPLACE_WITH') && clientId.length > 0);
  }

  protected logDebugInfo(additionalInfo: Record<string, any> = {}): void {
    console.log('🔍 OAuth Configuration Debug:');
    console.log('📱 Platform:', this.platform);
    console.log('🆔 Client ID:', this.getClientId());
    console.log('✅ Is Configured:', this.isConfigured());
    console.log('✅ Is Available:', this.isAvailable());
    
    Object.entries(additionalInfo).forEach(([key, value]) => {
      console.log(`${key}:`, value);
    });
  }
}
