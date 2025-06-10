import { TagMaster } from '../types/database';
import { supabase } from '../lib/supabase';

class TagService {
  async getAllTags(): Promise<TagMaster[]> {
    const { data, error } = await supabase
      .from('tag_master')
      .select('*')
      .order('name', { ascending: true });

    if (error) {
      throw new Error(error.message);
    }

    return data || [];
  }

  async createTag(name: string): Promise<TagMaster> {
    // Get current user
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      throw new Error('User not authenticated');
    }

    // Check if tag already exists
    const { data: existing } = await supabase
      .from('tag_master')
      .select('*')
      .eq('name', name)
      .single();

    if (existing) {
      return existing;
    }

    const newTag = { 
      name,
      created_by: user.id
    };

    const { data, error } = await supabase
      .from('tag_master')
      .insert(newTag)
      .select()
      .single();

    if (error) {
      throw new Error(error.message);
    }

    return data;
  }

  async updateTag(tagId: string, name: string): Promise<TagMaster> {
    const { data, error } = await supabase
      .from('tag_master')
      .update({ name })
      .eq('tag_id', tagId)
      .select()
      .single();

    if (error) {
      throw new Error(error.message);
    }

    return data;
  }

  async deleteTag(tagId: string): Promise<void> {
    const { error } = await supabase
      .from('tag_master')
      .delete()
      .eq('tag_id', tagId);

    if (error) {
      throw new Error(error.message);
    }
  }

  async searchTags(query: string): Promise<TagMaster[]> {
    const { data, error } = await supabase
      .from('tag_master')
      .select('*')
      .ilike('name', `%${query}%`)
      .order('name', { ascending: true });

    if (error) {
      throw new Error(error.message);
    }

    return data || [];
  }
}

export const tagService = new TagService();