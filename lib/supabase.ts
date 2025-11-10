// Google OAuth Configuration for BTP Backend
import AsyncStorage from '@react-native-async-storage/async-storage';

const GOOGLE_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID;
// Use relative URL - BTP destination handles routing
const API_BASE_URL = '/api';

if (!GOOGLE_CLIENT_ID) {
  console.warn(
    'Missing Google OAuth configuration. Please set EXPO_PUBLIC_GOOGLE_CLIENT_ID in your .env file.'
  );
}

// Storage keys
const AUTH_TOKEN_KEY = 'google_auth_token';
const USER_KEY = 'user_data';

// Simple auth client for Google OAuth + BTP backend
export const auth = {
  // Store Google token
  async setToken(token: string) {
    await AsyncStorage.setItem(AUTH_TOKEN_KEY, token);
  },

  // Get stored token
  async getToken(): Promise<string | null> {
    return await AsyncStorage.getItem(AUTH_TOKEN_KEY);
  },

  // Remove token (logout)
  async removeToken() {
    await AsyncStorage.removeItem(AUTH_TOKEN_KEY);
    await AsyncStorage.removeItem(USER_KEY);
  },

  // Store user data
  async setUser(user: any) {
    await AsyncStorage.setItem(USER_KEY, JSON.stringify(user));
  },

  // Get stored user
  async getUser(): Promise<any | null> {
    const data = await AsyncStorage.getItem(USER_KEY);
    return data ? JSON.parse(data) : null;
  },
};

// API client that includes auth token
export const apiClient = {
  async fetch(endpoint: string, options: RequestInit = {}) {
    const token = await auth.getToken();
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      ...options.headers,
    };

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const url = endpoint.startsWith('http') ? endpoint : `${API_BASE_URL}${endpoint}`;
    const response = await fetch(url, {
      ...options,
      headers,
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Request failed' }));
      throw new Error(error.error || `HTTP ${response.status}`);
    }

    return response.json();
  },
};

export const GOOGLE_CONFIG = {
  clientId: GOOGLE_CLIENT_ID,
  redirectUri: typeof window !== 'undefined' ? `${window.location.origin}/auth/callback` : '',
};

// For backwards compatibility with existing code
export const supabase = {
  auth: {
    async signInWithPassword() {
      throw new Error('Password login not supported. Please use Google Sign-In.');
    },
    async signUp() {
      throw new Error('Email registration not supported. Please use Google Sign-In.');
    },
    async signOut() {
      await auth.removeToken();
      return { error: null };
    },
    async getSession() {
      const token = await auth.getToken();
      const user = await auth.getUser();
      return {
        data: {
          session: token && user ? {
            access_token: token,
            user: {
              id: user.user_id || user.id,
              email: user.email,
              user_metadata: {
                name: user.name,
                picture: user.avatar_url,
              },
            },
          } : null,
        },
        error: null,
      };
    },
    onAuthStateChange(callback: (event: string, session: any) => void) {
      // Simple implementation - check for existing session on mount
      setTimeout(async () => {
        const token = await auth.getToken();
        const user = await auth.getUser();
        if (token && user) {
          callback('INITIAL_SESSION', {
            access_token: token,
            user: {
              id: user.user_id || user.id,
              email: user.email,
              user_metadata: {
                name: user.name,
                picture: user.avatar_url,
              },
            },
          });
        }
      }, 0);
      
      return {
        data: { subscription: { unsubscribe: () => {} } },
      };
    },
  },
};
