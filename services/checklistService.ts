import { ChecklistHeader, ChecklistItem } from '../types/database';
import { supabase } from '../lib/supabase';

class ChecklistService {
  async getUserChecklists(userId: string): Promise<ChecklistHeader[]> {
    const { data, error } = await supabase
      .from('checklist_headers')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      throw new Error(error.message);
    }

    if (!data) return [];

    // Convert tag IDs back to tag names for display
    const checklists = await Promise.all(
      data.map(async (checklist) => {
        if (checklist.tags && checklist.tags.length > 0) {
          const { data: tagData } = await supabase
            .from('tag_master')
            .select('name')
            .in('tag_id', checklist.tags);
          
          return {
            ...checklist,
            tags: tagData?.map(tag => tag.name) || []
          };
        }
        return {
          ...checklist,
          tags: []
        };
      })
    );

    return checklists;
  }

  async getUserChecklistsWithStats(userId: string): Promise<(ChecklistHeader & {
    total_items: number;
    completed_items: number;
  })[]> {
    // Get checklists with item counts using a more efficient query
    const { data, error } = await supabase
      .from('checklist_headers')
      .select(`
        *,
        checklist_items (
          item_id,
          is_completed
        )
      `)
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      throw new Error(error.message);
    }

    if (!data) return [];

    // Process the data to include statistics and convert tag IDs to names
    const checklistsWithStats = await Promise.all(
      data.map(async (checklist: any) => {
        const items = checklist.checklist_items || [];
        const total_items = items.length;
        const completed_items = items.filter((item: any) => item.is_completed).length;

        // Convert tag IDs to tag names for display
        let tags: string[] = [];
        if (checklist.tags && checklist.tags.length > 0) {
          const { data: tagData } = await supabase
            .from('tag_master')
            .select('name')
            .in('tag_id', checklist.tags);
          
          tags = tagData?.map(tag => tag.name) || [];
        }

        // Remove the nested checklist_items from the result and add our computed stats
        const { checklist_items, ...checklistData } = checklist;
        
        return {
          ...checklistData,
          tags,
          total_items,
          completed_items,
        };
      })
    );

    return checklistsWithStats;
  }

  async getChecklistWithItems(checklistId: string): Promise<{
    checklist: ChecklistHeader;
    items: ChecklistItem[];
  }> {
    // Get the checklist
    const { data: checklist, error: checklistError } = await supabase
      .from('checklist_headers')
      .select('*')
      .eq('checklist_id', checklistId)
      .single();

    if (checklistError) {
      throw new Error(checklistError.message);
    }

    // Convert tag IDs to tag names for display
    let checklistWithTagNames = checklist;
    if (checklist.tags && checklist.tags.length > 0) {
      const { data: tagData } = await supabase
        .from('tag_master')
        .select('name')
        .in('tag_id', checklist.tags);
      
      checklistWithTagNames = {
        ...checklist,
        tags: tagData?.map(tag => tag.name) || []
      };
    } else {
      checklistWithTagNames = {
        ...checklist,
        tags: []
      };
    }

    // Get the checklist items
    const { data: items, error: itemsError } = await supabase
      .from('checklist_items')
      .select('*')
      .eq('checklist_id', checklistId)
      .order('order_index', { ascending: true });

    if (itemsError) {
      throw new Error(itemsError.message);
    }

    return {
      checklist: checklistWithTagNames,
      items: items || [],
    };
  }

  async createChecklist(
    userId: string,
    name: string,
    bucketId?: string,
    categoryId?: string,
    tags?: string[],
    fromTemplateId?: string,
    targetDate?: string
  ): Promise<ChecklistHeader> {
    console.log('Creating checklist with tags:', tags);
    
    // Convert tag names to tag IDs if tags are provided
    let tagIds: string[] = [];
    if (tags && tags.length > 0) {
      console.log('Converting tag names to IDs...');
      
      // Get all existing tags that match the provided names
      const { data: existingTags, error: tagsError } = await supabase
        .from('tag_master')
        .select('tag_id, name')
        .in('name', tags);

      if (tagsError) {
        console.error('Error fetching tags:', tagsError);
        throw new Error(`Failed to fetch tags: ${tagsError.message}`);
      }

      console.log('Found existing tags:', existingTags);
      tagIds = existingTags?.map(tag => tag.tag_id) || [];
      
      // Check if all tags were found
      const foundTagNames = existingTags?.map(tag => tag.name) || [];
      const missingTags = tags.filter(tagName => !foundTagNames.includes(tagName));
      
      if (missingTags.length > 0) {
        console.warn('Some tags were not found:', missingTags);
        // For now, we'll just ignore missing tags
        // In the future, we could create them automatically
      }
    }

    const newChecklist = {
      user_id: userId,
      name,
      bucket_id: bucketId,
      category_id: categoryId,
      due_date: targetDate,
      tags: tagIds, // Use tag IDs instead of names
      from_template_id: fromTemplateId,
    };

    console.log('Inserting checklist with tag IDs:', newChecklist);

    const { data, error } = await supabase
      .from('checklist_headers')
      .insert(newChecklist)
      .select()
      .single();

    if (error) {
      console.error('Error inserting checklist:', error);
      throw new Error(error.message);
    }

    console.log('Checklist created successfully:', data);
    return data;
  }

  async createChecklistWithItems(
    userId: string,
    name: string,
    items: Array<{ text: string; completed?: boolean; description?: string }>,
    bucketId?: string,
    categoryId?: string,
    tags?: string[],
    fromTemplateId?: string,
    targetDate?: string
  ): Promise<{ checklist: ChecklistHeader; items: ChecklistItem[] }> {
    // First create the checklist header
    const checklist = await this.createChecklist(
      userId,
      name,
      bucketId,
      categoryId,
      tags,
      fromTemplateId,
      targetDate
    );

    // Then create all the items
    const createdItems: ChecklistItem[] = [];
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      const createdItem = await this.addChecklistItem(
        checklist.checklist_id,
        item.text,
        item.description,
        i + 1
      );
      
      // If the item should be completed, update its status
      if (item.completed) {
        const updatedItem = await this.updateChecklistItem({
          ...createdItem,
          is_completed: true
        });
        createdItems.push(updatedItem);
      } else {
        createdItems.push(createdItem);
      }
    }

    return { checklist, items: createdItems };
  }

  async updateChecklistItem(item: ChecklistItem): Promise<ChecklistItem> {
    const { data, error } = await supabase
      .from('checklist_items')
      .update({
        text: item.text,
        description: item.description,
        is_completed: item.is_completed,
        completed_at: item.is_completed ? new Date().toISOString() : null,
        order_index: item.order_index,
        is_required: item.is_required,
        tags: item.tags,
      })
      .eq('item_id', item.item_id)
      .select()
      .single();

    if (error) {
      throw new Error(error.message);
    }

    return data;
  }

  async addChecklistItem(
    checklistId: string,
    text: string,
    description?: string,
    orderIndex?: number
  ): Promise<ChecklistItem> {
    // If no order specified, get the next order number
    if (orderIndex === undefined) {
      const { data: existingItems } = await supabase
        .from('checklist_items')
        .select('order_index')
        .eq('checklist_id', checklistId)
        .order('order_index', { ascending: false })
        .limit(1);

      orderIndex = (existingItems?.[0]?.order_index || 0) + 1;
    }

    const newItem = {
      checklist_id: checklistId,
      text,
      description,
      order_index: orderIndex,
      is_completed: false,
      is_required: false,
      tags: [],
    };

    const { data, error } = await supabase
      .from('checklist_items')
      .insert(newItem)
      .select()
      .single();

    if (error) {
      throw new Error(error.message);
    }

    return data;
  }

  async deleteChecklistItem(itemId: string): Promise<void> {
    const { error } = await supabase
      .from('checklist_items')
      .delete()
      .eq('item_id', itemId);

    if (error) {
      throw new Error(error.message);
    }
  }

  async deleteChecklist(checklistId: string): Promise<void> {
    // Delete checklist items first (if not handled by cascade)
    await supabase
      .from('checklist_items')
      .delete()
      .eq('checklist_id', checklistId);

    // Delete the checklist
    const { error } = await supabase
      .from('checklist_headers')
      .delete()
      .eq('checklist_id', checklistId);

    if (error) {
      throw new Error(error.message);
    }
  }

  async updateChecklist(
    checklistId: string,
    name?: string,
    bucketId?: string,
    categoryId?: string,
    tags?: string[],
    dueDate?: string
  ): Promise<ChecklistHeader> {
    const updates: any = { updated_at: new Date().toISOString() };
    if (name !== undefined) updates.name = name;
    if (bucketId !== undefined) updates.bucket_id = bucketId;
    if (categoryId !== undefined) updates.category_id = categoryId;
    if (tags !== undefined) updates.tags = tags;
    if (dueDate !== undefined) updates.due_date = dueDate;

    const { data, error } = await supabase
      .from('checklist_headers')
      .update(updates)
      .eq('checklist_id', checklistId)
      .select()
      .single();

    if (error) {
      throw new Error(error.message);
    }

    return data;
  }
}

export const checklistService = new ChecklistService();