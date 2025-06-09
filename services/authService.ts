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

    // Wait for session to be properly established  
    await this.waitForSession();

    // Get or create user profile
    const user = await this.getUserProfile(data.user.id, data.user.email || email);
    return user;
  }

  async register(email: string, password: string, name: string): Promise<User> {
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
        console.log('Email confirmation required. User created but not confirmed.');
        
        // Return a basic user object - the trigger will have created the profile
        const userProfile: User = {
          user_id: data.user.id,
          email: email,
          name: name,
          created_at: new Date().toISOString(),
        };
        
        console.log('Registration successful, email confirmation pending');
        return userProfile;
      }

      // If we have a session, fetch the profile (created by trigger)
      if (data.session) {
        console.log('Session established, fetching user profile...');
        try {
          const user = await this.getUserProfile(data.user.id, email);
          console.log('User profile fetched successfully');
          return user;
        } catch (profileError) {
          console.log('Profile not found, creating manually...');
          const user = await this.createUserProfile(data.user.id, email, name);
          return user;
        }
      }

      // Fallback: try to wait for session and then get profile
      console.log('Waiting for session...');
      try {
        await this.waitForSession();
        console.log('Session established');
        
        const user = await this.getUserProfile(data.user.id, email);
        console.log('User profile fetched successfully');
        return user;
      } catch (sessionError) {
        console.log('Session timeout, but user created. Returning basic profile.');
        // Even if session times out, the user was created successfully
        const userProfile: User = {
          user_id: data.user.id,
          email: email,
          name: name,
          created_at: new Date().toISOString(),
        };
        return userProfile;
      }
    } catch (error) {
      console.error('Registration failed:', error);
      throw error;
    }
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

      // Verify the user can only access their own profile
      if (session.user.id !== userId) {
        throw new Error('Unauthorized: Cannot access other user profiles');
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

  // Listen to auth state changes
  onAuthStateChange(callback: (event: string, session: any) => void) {
    return supabase.auth.onAuthStateChange(callback);
  }
}

export const authService = new AuthService();