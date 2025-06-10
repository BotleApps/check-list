import { CategoryMaster } from '../types/database';
import { supabase } from '../lib/supabase';

class CategoryService {
  async getAllCategories(): Promise<CategoryMaster[]> {
    console.log('🏷️ CategoryService: Fetching all global categories...');
    
    const { data, error } = await supabase
      .from('category_master')
      .select('*')
      .order('name', { ascending: true });

    if (error) {
      console.error('❌ CategoryService: Error fetching categories:', error);
      throw new Error(error.message);
    }

    console.log('✅ CategoryService: Global categories fetched successfully:', data?.length || 0);
    
    // If no categories exist, create default ones
    if (!data || data.length === 0) {
      console.log('🌱 CategoryService: No categories found, creating defaults...');
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
        console.error('❌ CategoryService: Error creating default categories:', error);
        throw new Error(error.message);
      }

      console.log('✅ CategoryService: Default categories created successfully:', data?.length || 0);
      return data || [];
    } catch (error) {
      console.error('❌ CategoryService: Failed to create default categories:', error);
      return [];
    }
  }

  async createCategory(name: string): Promise<CategoryMaster> {
    console.log('🏷️ CategoryService: Creating global category:', name);
    
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