import { Platform } from 'react-native';
import { WebOAuthProvider } from './WebOAuthProvider';
import { iOSOAuthProvider } from './iOSOAuthProvider';
import { AndroidOAuthProvider } from './AndroidOAuthProvider';
import { BaseOAuthProvider } from './BaseOAuthProvider';
import { isWeb } from './types';

export class OAuthProviderFactory {
  private static instance: BaseOAuthProvider | null = null;

  static getProvider(): BaseOAuthProvider {
    if (!this.instance) {
      this.instance = this.createProvider();
    }
    return this.instance;
  }

  private static createProvider(): BaseOAuthProvider {
    if (isWeb()) {
      return new WebOAuthProvider();
    } else if (Platform.OS === 'ios') {
      return new iOSOAuthProvider();
    } else if (Platform.OS === 'android') {
      return new AndroidOAuthProvider();
    } else {
      console.warn('Unknown platform, defaulting to Web OAuth Provider');
      return new WebOAuthProvider();
    }
  }

  // Reset the instance (useful for testing or when switching environments)
  static reset(): void {
    this.instance = null;
  }

  // Get current platform info for debugging
  static getPlatformInfo(): string {
    if (isWeb()) return 'Web';
    if (Platform.OS === 'ios') return 'iOS';
    if (Platform.OS === 'android') return 'Android';
    return 'Unknown';
  }
}
