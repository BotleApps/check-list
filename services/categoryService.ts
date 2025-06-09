import { CategoryMaster } from '../types/database';
import { supabase } from '../lib/supabase';

class CategoryService {
  async getUserCategories(userId: string): Promise<CategoryMaster[]> {
    const { data, error } = await supabase
      .from('category_master')
      .select('*')
      .eq('user_id', userId)
      .order('name', { ascending: true });

    if (error) {
      throw new Error(error.message);
    }

    return data || [];
  }

  async createCategory(userId: string, name: string): Promise<CategoryMaster> {
    const newCategory = {
      user_id: userId,
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
      .from('category_master')
      .delete()
      .eq('category_id', categoryId);

    if (error) {
      throw new Error(error.message);
    }
  }
}

export const categoryService = new CategoryService();