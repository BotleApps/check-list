import { supabase } from '../lib/supabase';
import { User } from '../types/database';

class AuthService {
  constructor() {
    // Test Supabase connection on service initialization
    this.testConnection();
  }

  private async testConnection() {
    try {
      console.log('🔧 Testing Supabase connection...');
      console.log('🔧 Supabase URL configured:', !!process.env.EXPO_PUBLIC_SUPABASE_URL);
      console.log('🔧 Supabase Anon Key configured:', !!process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY);
      
      const { data, error } = await supabase.from('users').select('count').limit(1);
      if (error) {
        console.error('❌ Supabase connection test failed:', error);
      } else {
        console.log('✅ Supabase connection test successful');
      }
    } catch (error) {
      console.error('💥 Supabase connection test error:', error);
    }
  }
  async login(email: string, password: string): Promise<User> {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      throw new Error(error.message);
    }

    if (!data.user) {
      throw new Error('No user data returned');
    }

    // Get or create user profile
    const user = await this.getUserProfile(data.user.id, data.user.email || email);
    return user;
  }

  async register(email: string, password: string, name: string): Promise<User> {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          name,
        },
      },
    });

    if (error) {
      throw new Error(error.message);
    }

    if (!data.user) {
      throw new Error('No user data returned');
    }

    // Create user profile
    const user = await this.createUserProfile(data.user.id, email, name);
    return user;
  }

  async logout(): Promise<void> {
    const { error } = await supabase.auth.signOut();
    if (error) {
      throw new Error(error.message);
    }
  }

  async forgotPassword(email: string): Promise<void> {
    const { error } = await supabase.auth.resetPasswordForEmail(email);

    if (error) {
      throw new Error(error.message);
    }
  }

  async getCurrentUser(): Promise<User | null> {
    try {
      console.log('Getting current user...');
      // First try to get the session
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError) {
        console.error('Error getting session:', sessionError);
        return null;
      }

      if (!session?.user) {
        console.log('No session or user found');
        return null;
      }

      console.log('Session found, getting user profile for:', session.user.id);
      
      // Get the user profile
      const userProfile = await this.getUserProfile(session.user.id, session.user.email || '');
      console.log('User profile retrieved successfully:', { 
        name: userProfile?.name, 
        email: userProfile?.email, 
        user_id: userProfile?.user_id 
      });
      return userProfile;
    } catch (error) {
      console.error('Error getting current user:', error);
      return null;
    }
  }

  async updatePassword(newPassword: string): Promise<void> {
    const { error } = await supabase.auth.updateUser({
      password: newPassword,
    });

    if (error) {
      throw new Error(error.message);
    }
  }

  async getUserProfile(userId: string, email: string): Promise<User> {
    console.log('🔍 getUserProfile called with:', { userId, email });
    
    try {
      // First, ensure the session is properly established in Supabase
      console.log('� Ensuring Supabase session is ready...');
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError) {
        console.error('❌ Session error:', sessionError);
        throw new Error(`Session error: ${sessionError.message}`);
      }
      
      if (!session) {
        console.error('❌ No session found');
        throw new Error('No active session');
      }
      
      console.log('✅ Session confirmed, proceeding with database query...');
      console.log('📡 Making database query to users table...');
      const queryStart = Date.now();
      
      // Now make the actual database query
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('user_id', userId)
        .single();

      const queryTime = Date.now() - queryStart;
      console.log(`⏱️ Database query completed in ${queryTime}ms`);
      console.log('📊 Database query result:', { 
        data: data ? { ...data, user_id: data.user_id?.substring(0, 8) + '...' } : null, 
        error: error ? { code: error.code, message: error.message } : null 
      });

      if (error && error.code !== 'PGRST116') { // PGRST116 = not found
        console.error('❌ Error getting user profile:', error);
        throw new Error(error.message);
      }

      if (!data) {
        console.log('👤 User profile not found, creating one...');
        // User profile doesn't exist, create one
        return await this.createUserProfile(userId, email, email.split('@')[0]);
      }

      console.log('✅ User profile found successfully:', { 
        name: data.name, 
        email: data.email, 
        user_id: data.user_id?.substring(0, 8) + '...',
        created_at: data.created_at 
      });
      return data;
    } catch (error) {
      console.error('💥 Unexpected error in getUserProfile:', error);
      if (error instanceof Error) {
        console.error('💥 Error details:', { name: error.name, message: error.message, stack: error.stack });
      }
      throw error;
    }
  }

  private async createUserProfile(userId: string, email: string, name: string): Promise<User> {
    console.log('🆕 createUserProfile called with:', { userId: userId.substring(0, 8) + '...', email, name });
    
    const userProfile: Omit<User, 'created_at'> = {
      user_id: userId,
      email,
      name,
    };

    try {
      console.log('📡 Inserting new user profile into database...');
      const insertStart = Date.now();
      
      // First, let's try to insert with explicit user_id
      const { data, error } = await supabase
        .from('users')
        .insert(userProfile)
        .select()
        .single();

      const insertTime = Date.now() - insertStart;
      console.log(`⏱️ User profile insertion completed in ${insertTime}ms`);
      console.log('📊 User profile creation result:', { 
        data: data ? { ...data, user_id: data.user_id?.substring(0, 8) + '...' } : null, 
        error: error ? { code: error.code, message: error.message, details: error.details } : null 
      });

      if (error) {
        console.error('❌ Error creating user profile:', error);
        
        // If it's a constraint error, the user might already exist
        if (error.code === '23505') { // unique constraint violation
          console.log('🔄 User already exists, trying to fetch existing profile...');
          return await this.getUserProfile(userId, email);
        }
        
        throw new Error(error.message);
      }

      console.log('✅ User profile created successfully:', { 
        name: data.name, 
        email: data.email, 
        user_id: data.user_id?.substring(0, 8) + '...' 
      });
      return data;
    } catch (error) {
      console.error('💥 Unexpected error in createUserProfile:', error);
      if (error instanceof Error) {
        console.error('💥 Error details:', { name: error.name, message: error.message, stack: error.stack });
      }
      throw error;
    }
  }

  // Listen to auth state changes (simplified - just returns the subscription)
  onAuthStateChange(callback: (event: string, session: any) => void) {
    return supabase.auth.onAuthStateChange(callback);
  }
}

export const authService = new AuthService();