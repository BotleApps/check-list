import { User } from '../types/database';

// Mock implementation - replace with actual API calls
class AuthService {
  private mockUsers: User[] = [
    {
      user_id: '1',
      email: 'demo@example.com',
      name: 'Demo User',
      created_at: new Date().toISOString(),
    },
  ];

  async login(email: string, password: string): Promise<User> {
    // Simulate API call delay
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    const user = this.mockUsers.find(u => u.email === email);
    if (!user || password !== 'demo123') {
      throw new Error('Invalid credentials');
    }
    
    return user;
  }

  async register(email: string, password: string, name: string): Promise<User> {
    // Simulate API call delay
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    if (this.mockUsers.find(u => u.email === email)) {
      throw new Error('User already exists');
    }

    const newUser: User = {
      user_id: Math.random().toString(36).substr(2, 9),
      email,
      name,
      created_at: new Date().toISOString(),
    };

    this.mockUsers.push(newUser);
    return newUser;
  }

  async logout(): Promise<void> {
    // Simulate API call delay
    await new Promise(resolve => setTimeout(resolve, 500));
  }

  async forgotPassword(email: string): Promise<void> {
    await new Promise(resolve => setTimeout(resolve, 1000));
    // Mock implementation
  }
}

export const authService = new AuthService();