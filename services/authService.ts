import { supabase } from '../lib/supabase';
import { User } from '../types/database';

class AuthService {
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
      console.log('User profile retrieved:', userProfile ? 'Success' : 'Failed');
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
    console.log('Getting user profile for:', userId);
    
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('user_id', userId)
        .single();

      console.log('Database query result:', { data, error });

      if (error && error.code !== 'PGRST116') { // PGRST116 = not found
        console.error('Error getting user profile:', error);
        throw new Error(error.message);
      }

      if (!data) {
        console.log('User profile not found, creating one...');
        // User profile doesn't exist, create one
        return await this.createUserProfile(userId, email, email.split('@')[0]);
      }

      console.log('User profile found:', data);
      return data;
    } catch (error) {
      console.error('Unexpected error in getUserProfile:', error);
      throw error;
    }
  }

  private async createUserProfile(userId: string, email: string, name: string): Promise<User> {
    console.log('Creating user profile for:', userId, email, name);
    
    const userProfile: Omit<User, 'created_at'> = {
      user_id: userId,
      email,
      name,
    };

    try {
      const { data, error } = await supabase
        .from('users')
        .insert(userProfile)
        .select()
        .single();

      console.log('User profile creation result:', { data, error });

      if (error) {
        console.error('Error creating user profile:', error);
        throw new Error(error.message);
      }

      console.log('User profile created successfully:', data);
      return data;
    } catch (error) {
      console.error('Unexpected error in createUserProfile:', error);
      throw error;
    }
  }

  // Listen to auth state changes (simplified - just returns the subscription)
  onAuthStateChange(callback: (event: string, session: any) => void) {
    return supabase.auth.onAuthStateChange(callback);
  }
}

export const authService = new AuthService();