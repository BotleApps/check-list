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
    const headers = new Headers(options.headers ?? {});

    if (!headers.has('Content-Type')) {
      headers.set('Content-Type', 'application/json');
    }

    if (token) {
      headers.set('Authorization', `Bearer ${token}`);
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

// Mock query builder for Supabase compatibility
class MockQueryBuilder {
  private tableName: string;
  private queryData: { data: any[] | null; error: any };

  constructor(tableName: string) {
    this.tableName = tableName;
    this.queryData = { data: [], error: null };
  }

  select(_columns?: string) {
    console.warn(`[Mock Supabase] select() called on ${this.tableName} - backend not available, returning empty data`);
    return this;
  }

  insert(_data: any) {
    console.warn(`[Mock Supabase] insert() called on ${this.tableName} - backend not available`);
    this.queryData = { data: null, error: { message: 'Backend not available. Please run the BTP server.' } };
    return this;
  }

  update(_data: any) {
    console.warn(`[Mock Supabase] update() called on ${this.tableName} - backend not available`);
    this.queryData = { data: null, error: { message: 'Backend not available. Please run the BTP server.' } };
    return this;
  }

  delete() {
    console.warn(`[Mock Supabase] delete() called on ${this.tableName} - backend not available`);
    this.queryData = { data: null, error: { message: 'Backend not available. Please run the BTP server.' } };
    return this;
  }

  eq(_column: string, _value: any) {
    return this;
  }

  in(_column: string, _values: any[]) {
    return this;
  }

  order(_column: string, _options?: any) {
    return this;
  }

  limit(_count: number) {
    return this;
  }

  single() {
    return Promise.resolve({ data: null, error: { message: 'Backend not available' } });
  }

  then(resolve: (value: any) => void) {
    resolve(this.queryData);
    return Promise.resolve(this.queryData);
  }
}

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
    async getUser() {
      const user = await auth.getUser();
      return {
        data: {
          user: user ? {
            id: user.user_id || user.id,
            email: user.email,
            user_metadata: {
              name: user.name,
              picture: user.avatar_url,
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
    async resetPasswordForEmail(_email: string) {
      return { error: { message: 'Password reset not supported. Please use Google Sign-In.' } };
    },
    async updateUser(_updates: any) {
      return { error: { message: 'User update not supported in mock mode.' } };
    },
  },
  // Mock database methods
  from(tableName: string) {
    return new MockQueryBuilder(tableName);
  },
  rpc(_functionName: string, _params?: any) {
    console.warn('[Mock Supabase] rpc() called - backend not available');
    return Promise.resolve({ data: null, error: { message: 'Backend not available' } });
  },
};

