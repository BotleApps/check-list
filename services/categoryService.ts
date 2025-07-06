import { CategoryMaster } from '../types/database';
import { supabase } from '../lib/supabase';

class CategoryService {
  async getAllCategories(): Promise<CategoryMaster[]> {
    const { data, error } = await supabase
      .from('category_master')
      .select('*')
      .order('name', { ascending: true });

    if (error) {
      throw new Error(error.message);
    }
    
    // If no categories exist, create default ones
    if (!data || data.length === 0) {
      return await this.createDefaultCategories();
    }

    return data || [];
  }

  private async createDefaultCategories(): Promise<CategoryMaster[]> {
    const defaultCategories = [
      { name: 'Personal' },
      { name: 'Work' },
      { name: 'Shopping' },
      { name: 'Travel' },
      { name: 'Health' },
      { name: 'Finance' }
    ];

    try {
      const { data, error } = await supabase
        .from('category_master')
        .insert(defaultCategories)
        .select();

      if (error) {
        throw new Error(error.message);
      }

      return data || [];
    } catch (error) {
      return [];
    }
  }

  async createCategory(name: string): Promise<CategoryMaster> {
    const newCategory = {
      name,
    };

    const { data, error } = await supabase
      .from('category_master')
      .insert(newCategory)
      .select()
      .single();

    if (error) {
      throw new Error(error.message);
    }

    return data;
  }

  async updateCategory(categoryId: string, name: string): Promise<CategoryMaster> {
    const { data, error } = await supabase
      .from('category_master')
      .update({ name })
      .eq('category_id', categoryId)
      .select()
      .single();

    if (error) {
      throw new Error(error.message);
    }

    return data;
  }

  async deleteCategory(categoryId: string): Promise<void> {
    const { error } = await supabase
      .from('categories_master')
      .delete()
      .eq('category_id', categoryId);

    if (error) {
      throw new Error(error.message);
    }
  }
}

export const categoryService = new CategoryService();