/**
 * Vercel API Client
 * 
 * This client handles all communication with the Vercel-deployed backend API.
 * Authentication uses HTTP-only cookies with JWT tokens.
 */

// Get API URL from environment or use relative path
const getApiBaseUrl = () => {
  if (typeof process !== 'undefined' && process.env.EXPO_PUBLIC_API_URL) {
    return process.env.EXPO_PUBLIC_API_URL;
  }
  // For web, check window location
  if (typeof window !== 'undefined') {
    // In development, use localhost:5001
    if (window.location.hostname === 'localhost') {
      return 'http://localhost:5001/api';
    }
    // In production on Vercel, use the API subdomain or environment variable
    return process.env.EXPO_PUBLIC_API_URL || '/api';
  }
  return '/api';
};

export interface ApiResponse<T> {
  data?: T;
  error?: string;
  message?: string;
}

class VercelApiClient {
  private baseUrl: string;

  constructor() {
    this.baseUrl = getApiBaseUrl();
  }

  async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<ApiResponse<T>> {
    try {
      const headers = new Headers(options.headers ?? {});

      const isFormData = typeof FormData !== 'undefined' && options.body instanceof FormData;
      if (!isFormData && !headers.has('Content-Type')) {
        headers.set('Content-Type', 'application/json');
      }

      const response = await fetch(`${this.baseUrl}${endpoint}`, {
        ...options,
        headers,
        credentials: 'include', // IMPORTANT: Include cookies for JWT auth
      });

      // Handle non-JSON responses
      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        if (!response.ok) {
          return { error: `HTTP ${response.status}: Server returned non-JSON response` };
        }
        return { data: {} as T };
      }

      const data = await response.json();

      if (!response.ok) {
        return {
          error: data.error || data.message || `HTTP ${response.status}`,
        };
      }

      return { data };
    } catch (error) {
      console.error('API request failed:', error);
      return {
        error: error instanceof Error ? error.message : 'Network error',
      };
    }
  }

  // Auth endpoints
  async checkAuthStatus() {
    return this.request<{ isAuthenticated: boolean; user?: any }>('/auth/status', { method: 'GET' });
  }

  async getCurrentUser() {
    return this.request<{ user: any }>('/auth/me', { method: 'GET' });
  }

  async logout() {
    return this.request('/auth/logout', { method: 'POST' });
  }

  // User endpoints
  async getUserProfile() {
    return this.request('/users/profile', { method: 'GET' });
  }

  async updateUserProfile(updates: any) {
    return this.request('/users/profile', {
      method: 'PUT',
      body: JSON.stringify(updates),
    });
  }

  // Bucket endpoints
  async getBuckets() {
    return this.request('/buckets', { method: 'GET' });
  }

  async createBucket(name: string, is_global?: boolean) {
    return this.request('/buckets', {
      method: 'POST',
      body: JSON.stringify({ bucket_name: name, is_global }),
    });
  }

  async updateBucket(bucketId: string, name: string) {
    return this.request(`/buckets/${bucketId}`, {
      method: 'PUT',
      body: JSON.stringify({ bucket_name: name }),
    });
  }

  async deleteBucket(bucketId: string) {
    return this.request(`/buckets/${bucketId}`, { method: 'DELETE' });
  }

  // Tag endpoints
  async getTags() {
    return this.request('/tags', { method: 'GET' });
  }

  async createTag(name: string, color?: string) {
    return this.request('/tags', {
      method: 'POST',
      body: JSON.stringify({ name, color }),
    });
  }

  async deleteTag(tagId: string) {
    return this.request(`/tags/${tagId}`, { method: 'DELETE' });
  }

  // Category endpoints
  async getCategories() {
    return this.request('/categories', { method: 'GET' });
  }

  // Checklist endpoints
  async getChecklists(filters?: { bucket_id?: string; completed?: boolean }) {
    const params = new URLSearchParams();
    if (filters?.bucket_id) params.append('bucket_id', filters.bucket_id);
    if (filters?.completed !== undefined) params.append('completed', filters.completed.toString());
    
    const query = params.toString();
    return this.request(`/checklists${query ? '?' + query : ''}`, { method: 'GET' });
  }

  async getChecklist(checklistId: string) {
    return this.request(`/checklists/${checklistId}`, { method: 'GET' });
  }

  async createChecklist(checklist: {
    title: string;
    description?: string;
    bucket_id?: string;
    category_id?: string;
    target_date?: string;
    tag_ids?: string[];
    items?: { text: string; description?: string }[];
  }) {
    return this.request('/checklists', {
      method: 'POST',
      body: JSON.stringify(checklist),
    });
  }

  async updateChecklist(checklistId: string, updates: any) {
    return this.request(`/checklists/${checklistId}`, {
      method: 'PUT',
      body: JSON.stringify(updates),
    });
  }

  async deleteChecklist(checklistId: string) {
    return this.request(`/checklists/${checklistId}`, { method: 'DELETE' });
  }

  // Checklist items
  async addChecklistItem(checklistId: string, item: {
    title: string;
    description?: string;
    order_index?: number;
  }) {
    return this.request(`/checklists/${checklistId}/items`, {
      method: 'POST',
      body: JSON.stringify(item),
    });
  }

  async updateChecklistItem(checklistId: string, itemId: string, updates: any) {
    return this.request(`/checklists/${checklistId}/items/${itemId}`, {
      method: 'PUT',
      body: JSON.stringify(updates),
    });
  }

  async deleteChecklistItem(checklistId: string, itemId: string) {
    return this.request(`/checklists/${checklistId}/items/${itemId}`, {
      method: 'DELETE',
    });
  }

  // Template endpoints
  async getTemplates(categoryId?: string) {
    const query = categoryId ? `?category_id=${categoryId}` : '';
    return this.request(`/templates${query}`, { method: 'GET' });
  }

  async getTemplate(templateId: string) {
    return this.request(`/templates/${templateId}`, { method: 'GET' });
  }

  async createTemplate(template: {
    title: string;
    description?: string;
    category_id?: string;
    is_public?: boolean;
  }) {
    return this.request('/templates', {
      method: 'POST',
      body: JSON.stringify(template),
    });
  }

  async updateTemplate(templateId: string, updates: any) {
    return this.request(`/templates/${templateId}`, {
      method: 'PUT',
      body: JSON.stringify(updates),
    });
  }

  async deleteTemplate(templateId: string) {
    return this.request(`/templates/${templateId}`, { method: 'DELETE' });
  }

  async instantiateTemplate(templateId: string, params?: {
    bucket_id?: string;
    target_date?: string;
    tag_ids?: string[];
  }) {
    return this.request(`/templates/${templateId}/instantiate`, {
      method: 'POST',
      body: JSON.stringify(params || {}),
    });
  }
}

export const vercelApi = new VercelApiClient();
