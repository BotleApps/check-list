import { btpApi } from '../lib/btpApiClient';
import { auth } from '../lib/supabase';
import { User } from '../types/database';

type AuthResult = {
  user?: User;
  requiresEmailConfirmation?: boolean;
  message?: string;
};

class AuthService {
  async login(_email: string, _password: string): Promise<AuthResult> {
    throw new Error('Email/password login is no longer supported. Please use Google Sign-In.');
  }

  async register(_email: string, _password: string, _name: string): Promise<AuthResult> {
    throw new Error('Email registration is no longer supported. Please use Google Sign-In.');
  }

  async logout(): Promise<void> {
    await auth.removeToken();
  }

  async forgotPassword(_email: string): Promise<void> {
    throw new Error('Password reset is managed through your Google account recovery.');
  }

  async getCurrentUser(): Promise<User | null> {
    try {
      const storedUser = await auth.getUser();
      if (storedUser) {
        return storedUser as User;
      }

      const token = await auth.getToken();
      if (!token) {
        return null;
      }

      const response = await btpApi.getCurrentUser();
      if (response.error) {
        if (/unauthorized|token/i.test(response.error)) {
          await auth.removeToken();
        }
        return null;
      }

      const payload = response.data as { user?: User } | User | undefined;
      let resolvedUser: User | null = null;

      if (payload) {
        if ('user' in payload && payload.user) {
          resolvedUser = payload.user;
        } else if ((payload as User).user_id) {
          resolvedUser = payload as User;
        }
      }

      if (resolvedUser) {
        await auth.setUser(resolvedUser);
        return resolvedUser;
      }

      return null;
    } catch (error) {
      console.error('Failed to resolve current user:', error);
      return null;
    }
  }

  async getUserProfile(userId: string, _email?: string): Promise<User> {
    const currentUser = await this.getCurrentUser();
    if (!currentUser) {
      throw new Error('Not authenticated');
    }

    if (currentUser.user_id !== userId) {
      throw new Error('Unauthorized: Cannot access other user profiles');
    }

    const response = await btpApi.getUserProfile();
    if (response.error) {
      throw new Error(response.error);
    }

    if (!response.data) {
      throw new Error('User profile not found');
    }

    const user = response.data as User;
    await auth.setUser(user);
    return user;
  }

  async updateUserProfile(userId: string, updates: Partial<User>): Promise<User> {
    const currentUser = await this.getCurrentUser();
    if (!currentUser) {
      throw new Error('Not authenticated');
    }

    if (currentUser.user_id !== userId) {
      throw new Error('Unauthorized: Cannot update other user profiles');
    }

    const response = await btpApi.updateUserProfile(updates);
    if (response.error) {
      throw new Error(response.error);
    }

    if (!response.data) {
      throw new Error('User profile not found');
    }

    const updatedUser = response.data as User;
    await auth.setUser(updatedUser);
    return updatedUser;
  }

  async updatePassword(_newPassword: string): Promise<void> {
    throw new Error('Password updates are handled by your Google account settings.');
  }

  async resendConfirmation(_email: string): Promise<void> {
    throw new Error('Email confirmation is not required when using Google Sign-In.');
  }

  async getUserPublicInfo(userId: string): Promise<{ name?: string; avatar_url?: string } | null> {
    const currentUser = await this.getCurrentUser();
    if (currentUser?.user_id === userId) {
      return { name: currentUser.name, avatar_url: currentUser.avatar_url };
    }
    return null;
  }

  async getUsersPublicInfo(userIds: string[]): Promise<Record<string, { name?: string; avatar_url?: string }>> {
    const result: Record<string, { name?: string; avatar_url?: string }> = {};
    const currentUser = await this.getCurrentUser();
    if (currentUser && userIds.includes(currentUser.user_id)) {
      result[currentUser.user_id] = {
        name: currentUser.name,
        avatar_url: currentUser.avatar_url,
      };
    }
    return result;
  }

  onAuthStateChange(callback: (event: string, session: any) => void) {
    let unsubscribed = false;

    (async () => {
      const token = await auth.getToken();
      const user = await this.getCurrentUser();

      if (unsubscribed) {
        return;
      }

      if (token && user) {
        callback('INITIAL_SESSION', {
          access_token: token,
          user,
        });
      } else {
        callback('SIGNED_OUT', null);
      }
    })();

    return {
      data: {
        subscription: {
          unsubscribe: () => {
            unsubscribed = true;
          },
        },
      },
    };
  }
}

export const authService = new AuthService();