import { supabase } from '../lib/supabase';
import { User } from '../types/database';

class AuthService {
  async login(email: string, password: string): Promise<{ user?: User; requiresEmailConfirmation?: boolean; message?: string }> {
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

    // Check if email is confirmed
    if (!data.user.email_confirmed_at) {
      return {
        requiresEmailConfirmation: true,
        message: 'Please check your email and click the confirmation link to access your account.'
      };
    }

    // Wait for session to be properly established  
    await this.waitForSession();

    // Get or create user profile
    const user = await this.getUserProfile(data.user.id, data.user.email || email);
    return { user };
  }

  async register(email: string, password: string, name: string): Promise<{ user?: User; requiresEmailConfirmation?: boolean; message?: string }> {
    try {
      console.log('Starting registration for:', email);
      
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            name,
          },
        },
      });

      console.log('Auth signup result:', { data: data?.user?.id, error });

      if (error) {
        console.error('Auth signup error:', error);
        throw new Error(`Auth signup failed: ${error.message}`);
      }

      if (!data.user) {
        throw new Error('No user data returned from auth signup');
      }

      console.log('Auth user created successfully:', data.user.id);

      // Check if email confirmation is required
      if (!data.session && data.user && !data.user.email_confirmed_at) {
        console.log('Email confirmation required. User created but cannot access app yet.');
        
        return {
          requiresEmailConfirmation: true,
          message: 'Please check your email and click the confirmation link to complete your registration.'
        };
      }

      // If we have a session, user is confirmed and can access the app
      if (data.session) {
        console.log('User confirmed, session established, fetching user profile...');
        try {
          const user = await this.getUserProfile(data.user.id, email);
          console.log('User profile fetched successfully');
          return { user };
        } catch (profileError) {
          console.log('Profile not found, creating manually...');
          const user = await this.createUserProfile(data.user.id, email, name);
          return { user };
        }
      }

      // Fallback: try to wait for session (for auto-confirmed users)
      console.log('Waiting for session...');
      try {
        await this.waitForSession();
        console.log('Session established');
        
        const user = await this.getUserProfile(data.user.id, email);
        console.log('User profile fetched successfully');
        return { user };
      } catch (sessionError) {
        console.log('Session timeout - likely requires email confirmation.');
        return {
          requiresEmailConfirmation: true,
          message: 'Please check your email and click the confirmation link to complete your registration.'
        };
      }
    } catch (error) {
      console.error('Registration failed:', error);
      throw error;
    }
  }

  async logout(): Promise<void> {
    try {
      // Check if there's an active session first
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError) {
        console.warn('Session error during logout check:', sessionError);
      }
      
      if (!session) {
        return; // Already logged out
      }
      
      const { error } = await supabase.auth.signOut();
      
      if (error) {
        // For web, sometimes we get 403 errors on logout when session is already invalid
        if (error.message.includes('session') || error.status === 403) {
             
          // For web, manually clear the session if Supabase can't
          if (typeof window !== 'undefined') {
            try {
              // Clear Supabase session from localStorage
              const supabaseKey = `sb-${process.env.EXPO_PUBLIC_SUPABASE_URL?.split('//')[1]?.split('.')[0]}-auth-token`;
              localStorage.removeItem(supabaseKey);
              
              // Force refresh the auth state
              await supabase.auth.refreshSession();
            } catch (cleanupError) {
              console.warn('⚠️ Local cleanup warning:', cleanupError);
            }
          }
          return; // Treat as successful logout
        }
        
        console.error('Logout error:', error);
        throw new Error(error.message);
      }
    } catch (error) {
      console.error('Unexpected logout error:', error);
      // For web platform, don't throw errors on logout issues - always succeed
      if (typeof window !== 'undefined') {
        console.warn('Web logout error ignored, forcing local logout');
        
        // Force clear local storage on web
        try {
          const supabaseKey = `sb-${process.env.EXPO_PUBLIC_SUPABASE_URL?.split('//')[1]?.split('.')[0]}-auth-token`;
          localStorage.removeItem(supabaseKey);
        } catch (cleanupError) {
          console.warn('Local storage cleanup failed:', cleanupError);
        }
        
        return;
      }
      throw error;
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
      console.log('🔄 getUserProfile called with:', { userId, email });
      
      // Ensure the session is properly established
      console.log('🔄 Getting current session...');
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError) {
        console.error('❌ Session error in getUserProfile:', sessionError);
        throw new Error(`Session error: ${sessionError.message}`);
      }
      
      if (!session) {
        console.error('❌ No active session in getUserProfile');
        throw new Error('No active session');
      }

      console.log('✅ Session verified in getUserProfile');

      // Verify the user can only access their own profile
      if (session.user.id !== userId) {
        console.error('❌ Unauthorized access attempt:', { sessionUserId: session.user.id, requestedUserId: userId });
        throw new Error('Unauthorized: Cannot access other user profiles');
      }
      
      // Query the user profile
      console.log('🔄 Querying user profile from database...');
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('user_id', userId)
        .single();

      console.log('📋 Database query result:', { data: !!data, error: error?.message, errorCode: error?.code });

      if (error && error.code !== 'PGRST116') { // PGRST116 = not found
        console.error('❌ Database error in getUserProfile:', error);
        throw new Error(error.message);
      }

      if (!data) {
        // User profile doesn't exist, create one
        console.log('🔄 User profile not found, creating new profile...');
        return await this.createUserProfile(userId, email, email.split('@')[0]);
      }

      console.log('✅ User profile found and returned');
      return data;
    } catch (error) {
      console.error('Error in getUserProfile:', error);
      throw error;
    }
  }

  async updateUserProfile(userId: string, updates: Partial<User>): Promise<User> {
    try {
      // Verify session before updating profile
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError) {
        throw new Error(`Session error: ${sessionError.message}`);
      }
      
      if (!session) {
        throw new Error('No active session');
      }

      // Verify the user can only update their own profile
      if (session.user.id !== userId) {
        throw new Error('Unauthorized: Cannot update other user profiles');
      }

      const { data, error } = await supabase
        .from('users')
        .update({
          ...updates,
          updated_at: new Date().toISOString(),
        })
        .eq('user_id', userId)
        .select()
        .single();

      if (error) {
        throw new Error(error.message);
      }

      return data;
    } catch (error) {
      console.error('Error updating user profile:', error);
      throw error;
    }
  }

  async resendConfirmation(email: string): Promise<void> {
    const { error } = await supabase.auth.resend({
      type: 'signup',
      email: email,
    });

    if (error) {
      throw new Error(`Failed to resend confirmation: ${error.message}`);
    }
  }

  private async waitForSession(maxAttempts = 20): Promise<void> {
    console.log('Waiting for session establishment...');
    
    for (let i = 0; i < maxAttempts; i++) {
      console.log(`Session check attempt ${i + 1}/${maxAttempts}`);
      
      const { data: { session }, error } = await supabase.auth.getSession();
      
      if (error) {
        console.error('Error getting session:', error);
        await new Promise(resolve => setTimeout(resolve, 500));
        continue;
      }
      
      if (session) {
        console.log('Session established successfully:', session.user.id);
        return;
      }
      
      // Check if there's a user but no session (email confirmation pending)
      const { data: { user } } = await supabase.auth.getUser();
      if (user && !user.email_confirmed_at) {
        console.log('User exists but email not confirmed. Proceeding without session.');
        // For email confirmation cases, we'll create the profile directly
        // using the user ID from the signup response
        return;
      }
      
      await new Promise(resolve => setTimeout(resolve, 500)); // Wait 500ms
    }
    
    console.error('Session establishment timed out');
    throw new Error('Session not established after authentication');
  }

  private async createUserProfile(userId: string, email: string, name: string): Promise<User> {
    try {
      console.log('Creating user profile for:', userId, email);
      
      // Verify session before creating profile
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError) {
        console.error('Session error in createUserProfile:', sessionError);
        throw new Error(`Session error: ${sessionError.message}`);
      }
      
      if (!session) {
        console.error('No active session in createUserProfile');
        throw new Error('No active session');
      }

      console.log('Session verified, auth user ID:', session.user.id);

      // Verify the user can only create their own profile
      if (session.user.id !== userId) {
        console.error('User ID mismatch:', { sessionUserId: session.user.id, requestedUserId: userId });
        throw new Error('Unauthorized: Cannot create profile for other users');
      }

      const userProfile: Omit<User, 'created_at'> = {
        user_id: userId,
        email,
        name,
      };

      console.log('Inserting user profile:', userProfile);

      const { data, error } = await supabase
        .from('users')
        .insert(userProfile)
        .select()
        .single();

      if (error) {
        console.error('Database error creating user profile:', error);
        
        // If it's a constraint error, the user might already exist
        if (error.code === '23505') { // unique constraint violation
          console.log('User already exists, fetching existing profile');
          return await this.getUserProfile(userId, email);
        }
        
        throw new Error(`Database error: ${error.message}`);
      }

      console.log('User profile created successfully:', data);
      return data;
    } catch (error) {
      console.error('Error in createUserProfile:', error);
      throw error;
    }
  }

  /**
   * Get public user information for display purposes (name and avatar)
   * This can be used to show creator information on templates, checklists, etc.
   */
  async getUserPublicInfo(userId: string): Promise<{ name?: string; avatar_url?: string } | null> {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('name, avatar_url')
        .eq('user_id', userId)
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error('Error fetching user public info:', error);
        return null;
      }

      return data || null;
    } catch (error) {
      console.error('Error in getUserPublicInfo:', error);
      return null;
    }
  }

  /**
   * Get public user information for multiple users at once
   */
  async getUsersPublicInfo(userIds: string[]): Promise<Record<string, { name?: string; avatar_url?: string }>> {
    try {
      if (userIds.length === 0) return {};

      const { data, error } = await supabase
        .from('users')
        .select('user_id, name, avatar_url')
        .in('user_id', userIds);

      if (error) {
        console.error('Error fetching users public info:', error);
        return {};
      }

      // Convert array to object with user_id as key
      const result: Record<string, { name?: string; avatar_url?: string }> = {};
      data?.forEach(user => {
        result[user.user_id] = {
          name: user.name,
          avatar_url: user.avatar_url
        };
      });

      return result;
    } catch (error) {
      console.error('Error in getUsersPublicInfo:', error);
      return {};
    }
  }

  // Listen to auth state changes
  onAuthStateChange(callback: (event: string, session: any) => void) {
    return supabase.auth.onAuthStateChange(callback);
  }
}

export const authService = new AuthService();