import { supabase } from './supabase';
import { ApiUtils, ApiResponse, ApiConfig } from './apiUtils';

export interface SupabaseQueryOptions extends ApiConfig {
  throwOnError?: boolean;
}

export class SupabaseApiWrapper {
  private static readonly DEFAULT_CONFIG: ApiConfig = {
    timeout: 15000, // 15 seconds for Supabase operations
    retries: 2,
    retryDelay: 1000,
    requireNetwork: true,
  };

  /**
   * Execute a Supabase query with robust error handling
   */
  static async executeQuery<T>(
    queryFn: () => Promise<{ data: T | null; error: any }>,
    options: SupabaseQueryOptions = {}
  ): Promise<ApiResponse<T | null>> {
    const config = { ...this.DEFAULT_CONFIG, ...options };

    return ApiUtils.executeWithRetry(async () => {
      const result = await queryFn();
      
      if (result.error) {
        throw new Error(result.error.message || 'Database operation failed');
      }
      
      return result.data;
    }, config);
  }

  /**
   * Execute a Supabase auth operation
   */
  static async executeAuth<T>(
    authFn: () => Promise<{ data: T; error: any } | any>,
    options: SupabaseQueryOptions = {}
  ): Promise<ApiResponse<T>> {
    const config = { 
      ...this.DEFAULT_CONFIG, 
      retries: 1, // Auth operations should not be retried aggressively
      ...options 
    };

    return ApiUtils.executeWithRetry(async () => {
      const result = await authFn();
      
      if (result.error) {
        throw new Error(result.error.message || 'Authentication operation failed');
      }
      
      return result.data;
    }, config);
  }

  /**
   * Get data from a table with robust error handling
   */
  static async select<T>(
    table: string,
    query?: (q: any) => any,
    options: SupabaseQueryOptions = {}
  ): Promise<ApiResponse<T[] | null>> {
    return this.executeQuery(async () => {
      let supabaseQuery = supabase.from(table).select('*');
      
      if (query) {
        supabaseQuery = query(supabaseQuery);
      }
      
      return supabaseQuery;
    }, options);
  }

  /**
   * Insert data into a table
   */
  static async insert<T>(
    table: string,
    data: Partial<T> | Partial<T>[],
    options: SupabaseQueryOptions = {}
  ): Promise<ApiResponse<T[] | null>> {
    return this.executeQuery(async () => {
      return supabase
        .from(table)
        .insert(data)
        .select();
    }, options);
  }

  /**
   * Update data in a table
   */
  static async update<T>(
    table: string,
    data: Partial<T>,
    query: (q: any) => any,
    options: SupabaseQueryOptions = {}
  ): Promise<ApiResponse<T[] | null>> {
    return this.executeQuery(async () => {
      const supabaseQuery = supabase
        .from(table)
        .update(data);
      
      return query(supabaseQuery).select();
    }, options);
  }

  /**
   * Delete data from a table
   */
  static async delete<T>(
    table: string,
    query: (q: any) => any,
    options: SupabaseQueryOptions = {}
  ): Promise<ApiResponse<T[] | null>> {
    return this.executeQuery(async () => {
      const supabaseQuery = supabase.from(table).delete();
      return query(supabaseQuery).select();
    }, options);
  }

  /**
   * Get a single record
   */
  static async selectSingle<T>(
    table: string,
    query: (q: any) => any,
    options: SupabaseQueryOptions = {}
  ): Promise<ApiResponse<T | null>> {
    return this.executeQuery(async () => {
      const supabaseQuery = supabase.from(table).select('*');
      return query(supabaseQuery).single();
    }, options);
  }

  /**
   * Execute RPC (stored procedure) call
   */
  static async rpc<T>(
    functionName: string,
    params?: Record<string, any>,
    options: SupabaseQueryOptions = {}
  ): Promise<ApiResponse<T | null>> {
    return this.executeQuery(async () => {
      return supabase.rpc(functionName, params);
    }, options);
  }

  /**
   * Sign in with email and password
   */
  static async signInWithPassword(
    email: string,
    password: string,
    options: SupabaseQueryOptions = {}
  ): Promise<ApiResponse<any>> {
    return this.executeAuth(async () => {
      return await supabase.auth.signInWithPassword({ email, password });
    }, options);
  }

  /**
   * Sign up with email and password
   */
  static async signUp(
    email: string,
    password: string,
    metadata?: Record<string, any>,
    options: SupabaseQueryOptions = {}
  ): Promise<ApiResponse<any>> {
    return this.executeAuth(async () => {
      return await supabase.auth.signUp({
        email,
        password,
        options: { data: metadata },
      });
    }, options);
  }

  /**
   * Sign out
   */
  static async signOut(options: SupabaseQueryOptions = {}): Promise<ApiResponse<void>> {
    return this.executeAuth(async () => {
      const result = await supabase.auth.signOut();
      return { data: undefined, error: result.error };
    }, options);
  }

  /**
   * Reset password
   */
  static async resetPassword(
    email: string,
    options: SupabaseQueryOptions = {}
  ): Promise<ApiResponse<void>> {
    return this.executeAuth(async () => {
      const result = await supabase.auth.resetPasswordForEmail(email);
      return { data: undefined, error: result.error };
    }, options);
  }

  /**
   * Get current session
   */
  static async getSession(options: SupabaseQueryOptions = {}): Promise<ApiResponse<any>> {
    return this.executeAuth(async () => {
      return await supabase.auth.getSession();
    }, { ...options, retries: 0 }); // Don't retry session checks
  }

  /**
   * Update user password
   */
  static async updateUser(
    updates: Record<string, any>,
    options: SupabaseQueryOptions = {}
  ): Promise<ApiResponse<any>> {
    return this.executeAuth(async () => {
      return await supabase.auth.updateUser(updates);
    }, options);
  }
}
