import { Platform } from 'react-native';

export interface OAuthError {
  code: string;
  message: string;
  details?: any;
}

export interface OAuthResult {
  success: boolean;
  error?: OAuthError;
  user?: any;
  tokens?: AuthTokens;
}

export interface OAuthProvider {
  signIn(): Promise<OAuthResult>;
  signOut(): Promise<void>;
  handleCallback(params: Record<string, string>): Promise<OAuthResult>;
  isConfigured(): boolean;
  isAvailable(): boolean;
  getClientId(): string;
  getPlatform(): PlatformType;
  debugConfig(): void;
}

export interface OAuthConfig {
  webClientId: string;
  androidClientId: string;
  iosClientId: string;
}

export type PlatformType = 'web' | 'ios' | 'android';

export interface AuthTokens {
  accessToken: string;
  refreshToken?: string;
  expiresAt?: string;
}

export interface OAuthCallbackData {
  tokens?: AuthTokens;
  error?: string;
  platform: PlatformType;
}

// Utility to get current platform
export const getCurrentPlatform = (): PlatformType => {
  if (Platform.OS === 'web') return 'web';
  if (Platform.OS === 'ios') return 'ios';
  if (Platform.OS === 'android') return 'android';
  return 'web'; // fallback
};

// Platform detection utilities
export const isWeb = (): boolean => {
  return Platform.OS === 'web';
};

export const isMobile = (): boolean => {
  return Platform.OS === 'ios' || Platform.OS === 'android';
};

// Environment detection utilities
export const isLocalDevelopment = (): boolean => {
  if (typeof window !== 'undefined') {
    const origin = window.location.origin;
    return origin.includes('localhost') || origin.includes('127.0.0.1');
  }
  
  return process.env.NODE_ENV === 'development' || 
         process.env.EXPO_PUBLIC_ENV === 'development';
};

export const getBaseUrl = (): string => {
  if (typeof window !== 'undefined') {
    return window.location.origin;
  }
  
  if (isLocalDevelopment()) {
    return 'http://localhost:3000';
  }
  
  // Production environment variables
  const netlifyUrl = process.env.REACT_APP_NETLIFY_URL || 
                    process.env.URL || 
                    process.env.DEPLOY_PRIME_URL ||
                    process.env.EXPO_PUBLIC_SITE_URL;
  
  return netlifyUrl || 'http://localhost:3000';
};
