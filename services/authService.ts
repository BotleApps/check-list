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
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError) {
        console.error('Error getting session:', sessionError);
        return null;
      }

      if (!session?.user) {
        return null;
      }

      const userProfile = await this.getUserProfile(session.user.id, session.user.email || '');
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
    try {
      // Ensure the session is properly established
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError) {
        throw new Error(`Session error: ${sessionError.message}`);
      }
      
      if (!session) {
        throw new Error('No active session');
      }
      
      // Query the user profile
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (error && error.code !== 'PGRST116') { // PGRST116 = not found
        throw new Error(error.message);
      }

      if (!data) {
        // User profile doesn't exist, create one
        return await this.createUserProfile(userId, email, email.split('@')[0]);
      }

      return data;
    } catch (error) {
      console.error('Error in getUserProfile:', error);
      throw error;
    }
  }

  private async createUserProfile(userId: string, email: string, name: string): Promise<User> {
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

      if (error) {
        // If it's a constraint error, the user might already exist
        if (error.code === '23505') { // unique constraint violation
          return await this.getUserProfile(userId, email);
        }
        
        throw new Error(error.message);
      }

      return data;
    } catch (error) {
      console.error('Error in createUserProfile:', error);
      throw error;
    }
  }

  // Listen to auth state changes
  onAuthStateChange(callback: (event: string, session: any) => void) {
    return supabase.auth.onAuthStateChange(callback);
  }
}

export const authService = new AuthService();