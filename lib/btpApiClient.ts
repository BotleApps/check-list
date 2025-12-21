/**
 * API Client
 * 
 * This client handles all communication with the backend API.
 * Authentication is handled using Google OAuth tokens or JWT cookies.
 */

import { auth } from './supabase';

// Get API URL from environment variable or fallback
const getApiBaseUrl = () => {
  // Check for environment variable (works in Expo)
  if (process.env.EXPO_PUBLIC_API_URL) {
    return process.env.EXPO_PUBLIC_API_URL;
  }
  // Fallback for local development
  return 'http://localhost:5001/api';
};

const API_BASE_URL = getApiBaseUrl();

console.log('🔗 API Base URL:', API_BASE_URL);

export interface ApiResponse<T> {
  data?: T;
  error?: string;
  message?: string;
}

class BTPApiClient {
  async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<ApiResponse<T>> {
    try {
      const token = await auth.getToken();
      const headers = new Headers(options.headers ?? {});

      const isFormData = typeof FormData !== 'undefined' && options.body instanceof FormData;
      if (!isFormData && !headers.has('Content-Type')) {
        headers.set('Content-Type', 'application/json');
      }

      if (token) {
        headers.set('Authorization', `Bearer ${token}`);
      }

      const response = await fetch(`${API_BASE_URL}${endpoint}`, {
        ...options,
        headers,
        credentials: 'include', // Include cookies for JWT auth
      });

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
  async createSession() {
    return this.request('/auth/session', { method: 'POST' });
  }

  async getCurrentUser() {
    return this.request('/auth/me', { method: 'GET' });
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

  async updateBucket(bucketId: number, name: string) {
    return this.request(`/buckets/${bucketId}`, {
      method: 'PUT',
      body: JSON.stringify({ bucket_name: name }),
    });
  }

  async deleteBucket(bucketId: number) {
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

  async deleteTag(tagId: number) {
    return this.request(`/tags/${tagId}`, { method: 'DELETE' });
  }

  // Category endpoints
  async getCategories() {
    return this.request('/categories', { method: 'GET' });
  }

  // Checklist endpoints
  async getChecklists(filters?: { bucket_id?: number; completed?: boolean }) {
    const params = new URLSearchParams();
    if (filters?.bucket_id) params.append('bucket_id', filters.bucket_id.toString());
    if (filters?.completed !== undefined) params.append('completed', filters.completed.toString());
    
    const query = params.toString();
    return this.request(`/checklists${query ? '?' + query : ''}`, { method: 'GET' });
  }

  async getChecklist(checklistId: number) {
    return this.request(`/checklists/${checklistId}`, { method: 'GET' });
  }

  async createChecklist(checklist: {
    title: string;
    description?: string;
    bucket_id?: number;
    category_id?: number;
    target_date?: string;
    tag_ids?: number[];
  }) {
    return this.request('/checklists', {
      method: 'POST',
      body: JSON.stringify(checklist),
    });
  }

  async updateChecklist(checklistId: number, updates: any) {
    return this.request(`/checklists/${checklistId}`, {
      method: 'PUT',
      body: JSON.stringify(updates),
    });
  }

  async deleteChecklist(checklistId: number) {
    return this.request(`/checklists/${checklistId}`, { method: 'DELETE' });
  }

  // Checklist items
  async addChecklistItem(checklistId: number, item: {
    title: string;
    description?: string;
    order_index?: number;
  }) {
    return this.request(`/checklists/${checklistId}/items`, {
      method: 'POST',
      body: JSON.stringify(item),
    });
  }

  async updateChecklistItem(checklistId: number, itemId: number, updates: any) {
    return this.request(`/checklists/${checklistId}/items/${itemId}`, {
      method: 'PUT',
      body: JSON.stringify(updates),
    });
  }

  async deleteChecklistItem(checklistId: number, itemId: number) {
    return this.request(`/checklists/${checklistId}/items/${itemId}`, {
      method: 'DELETE',
    });
  }

  // Template endpoints
  async getTemplates(categoryId?: number) {
    const query = categoryId ? `?category_id=${categoryId}` : '';
    return this.request(`/templates${query}`, { method: 'GET' });
  }

  async getTemplate(templateId: number) {
    return this.request(`/templates/${templateId}`, { method: 'GET' });
  }

  async createTemplate(template: {
    title: string;
    description?: string;
    category_id?: number;
    is_public?: boolean;
  }) {
    return this.request('/templates', {
      method: 'POST',
      body: JSON.stringify(template),
    });
  }

  async updateTemplate(templateId: number, updates: any) {
    return this.request(`/templates/${templateId}`, {
      method: 'PUT',
      body: JSON.stringify(updates),
    });
  }

  async deleteTemplate(templateId: number) {
    return this.request(`/templates/${templateId}`, { method: 'DELETE' });
  }

  async instantiateTemplate(templateId: number, params?: {
    bucket_id?: number;
    target_date?: string;
    tag_ids?: number[];
  }) {
    return this.request(`/templates/${templateId}/instantiate`, {
      method: 'POST',
      body: JSON.stringify(params || {}),
    });
  }

  // Template items
  async addTemplateItem(templateId: number, item: {
    title: string;
    description?: string;
    order_index?: number;
  }) {
    return this.request(`/templates/${templateId}/items`, {
      method: 'POST',
      body: JSON.stringify(item),
    });
  }

  async updateTemplateItem(templateId: number, itemId: number, updates: any) {
    return this.request(`/templates/${templateId}/items/${itemId}`, {
      method: 'PUT',
      body: JSON.stringify(updates),
    });
  }

  async deleteTemplateItem(templateId: number, itemId: number) {
    return this.request(`/templates/${templateId}/items/${itemId}`, {
      method: 'DELETE',
    });
  }
}

export const btpApi = new BTPApiClient();
