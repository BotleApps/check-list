import Constants from 'expo-constants';

// Google OAuth configuration
export const GOOGLE_OAUTH_CONFIG = {
  webClientId: Constants.expoConfig?.extra?.googleOAuth?.webClientId || '',
  androidClientId: Constants.expoConfig?.extra?.googleOAuth?.androidClientId || '',
  iosClientId: Constants.expoConfig?.extra?.googleOAuth?.iosClientId || '',
};

// Supabase configuration
export const SUPABASE_CONFIG = {
  url: Constants.expoConfig?.extra?.supabaseUrl || '',
  anonKey: Constants.expoConfig?.extra?.supabaseAnonKey || '',
};

// Development/Debug settings
export const DEBUG_CONFIG = {
  enableDebugLogging: Constants.expoConfig?.extra?.enableDebugLogging || false,
  logLevel: Constants.expoConfig?.extra?.logLevel || 'info',
};

// App configuration
export const APP_CONFIG = {
  scheme: Constants.expoConfig?.scheme || 'myapp',
  name: Constants.expoConfig?.name || 'CheckList App',
  version: Constants.expoConfig?.version || '1.0.0',
};

// OAuth redirect URIs
export const OAUTH_REDIRECT_URIS = {
  google: {
    development: `${APP_CONFIG.scheme}://auth/google`,
    production: `${APP_CONFIG.scheme}://auth/google`,
    web: typeof window !== 'undefined' ? `${window.location.origin}/auth/google` : '',
  },
};

// Environment checks
export const IS_DEV = __DEV__;
export const IS_WEB = typeof window !== 'undefined';
export const IS_NATIVE = !IS_WEB;

// Validation helpers
export const isGoogleOAuthConfigured = (): boolean => {
  return Boolean(
    GOOGLE_OAUTH_CONFIG.webClientId && 
    !GOOGLE_OAUTH_CONFIG.webClientId.includes('REPLACE_WITH')
  );
};

export const isSupabaseConfigured = (): boolean => {
  return Boolean(
    SUPABASE_CONFIG.url && 
    SUPABASE_CONFIG.anonKey &&
    !SUPABASE_CONFIG.url.includes('REPLACE_WITH') &&
    !SUPABASE_CONFIG.anonKey.includes('REPLACE_WITH')
  );
};

// Debug logging helper
export const debugLog = (message: string, data?: any) => {
  if (DEBUG_CONFIG.enableDebugLogging || IS_DEV) {
    console.log(`[DEBUG] ${message}`, data || '');
  }
};

export const errorLog = (message: string, error?: any) => {
  console.error(`[ERROR] ${message}`, error || '');
};
