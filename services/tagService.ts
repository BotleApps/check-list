import { TagMaster } from '../types/database';
import { supabase } from '../lib/supabase';

class TagService {
  /**
   * Get all tags for the current user
   */
  async getAllTags(): Promise<TagMaster[]> {
    // Get current user
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      throw new Error('User not authenticated');
    }

    const { data, error } = await supabase
      .from('tag_master')
      .select('*')
      .eq('created_by', user.id)
      .order('name', { ascending: true });

    if (error) {
      throw new Error(error.message);
    }

    return data || [];
  }

  /**
   * Create a new tag for the current user
   */
  async createTag(name: string): Promise<TagMaster> {
    // Get current user
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      throw new Error('User not authenticated');
    }

    // Check if tag already exists for this user
    const { data: existing } = await supabase
      .from('tag_master')
      .select('*')
      .eq('name', name)
      .eq('created_by', user.id)
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

  /**
   * Update a tag (only if user owns it)
   */
  async updateTag(tagId: string, name: string): Promise<TagMaster> {
    // Get current user
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      throw new Error('User not authenticated');
    }

    // First verify the user owns this tag
    const { data: existingTag, error: fetchError } = await supabase
      .from('tag_master')
      .select('*')
      .eq('tag_id', tagId)
      .eq('created_by', user.id)
      .single();

    if (fetchError || !existingTag) {
      throw new Error('Tag not found or you do not have permission to edit it');
    }

    // Check if another tag with the same name already exists for this user
    const { data: duplicate } = await supabase
      .from('tag_master')
      .select('*')
      .eq('name', name)
      .eq('created_by', user.id)
      .neq('tag_id', tagId)
      .single();

    if (duplicate) {
      throw new Error('A tag with this name already exists');
    }

    const { data, error } = await supabase
      .from('tag_master')
      .update({ name })
      .eq('tag_id', tagId)
      .eq('created_by', user.id)
      .select()
      .single();

    if (error) {
      throw new Error(error.message);
    }

    return data;
  }

  /**
   * Delete a tag (only if user owns it)
   */
  async deleteTag(tagId: string): Promise<void> {
    // Get current user
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      throw new Error('User not authenticated');
    }

    // First verify the user owns this tag
    const { data: existingTag, error: fetchError } = await supabase
      .from('tag_master')
      .select('*')
      .eq('tag_id', tagId)
      .eq('created_by', user.id)
      .single();

    if (fetchError || !existingTag) {
      throw new Error('Tag not found or you do not have permission to delete it');
    }

    const { error } = await supabase
      .from('tag_master')
      .delete()
      .eq('tag_id', tagId)
      .eq('created_by', user.id);

    if (error) {
      throw new Error(error.message);
    }
  }

  /**
   * Search tags for the current user
   */
  async searchTags(query: string): Promise<TagMaster[]> {
    // Get current user
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      throw new Error('User not authenticated');
    }

    const { data, error } = await supabase
      .from('tag_master')
      .select('*')
      .eq('created_by', user.id)
      .ilike('name', `%${query}%`)
      .order('name', { ascending: true });

    if (error) {
      throw new Error(error.message);
    }

    return data || [];
  }
}

export const tagService = new TagService();