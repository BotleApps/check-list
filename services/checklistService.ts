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

    return data || [];
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

    // Get the checklist items
    const { data: items, error: itemsError } = await supabase
      .from('checklist_items')
      .select('*')
      .eq('checklist_id', checklistId)
      .order('order', { ascending: true });

    if (itemsError) {
      throw new Error(itemsError.message);
    }

    return {
      checklist,
      items: items || [],
    };
  }

  async createChecklist(
    userId: string,
    name: string,
    bucketId?: string,
    categoryId?: string,
    tags?: string[],
    fromTemplateId?: string
  ): Promise<ChecklistHeader> {
    const newChecklist = {
      user_id: userId,
      name,
      bucket_id: bucketId,
      category_id: categoryId,
      tags,
      from_template_id: fromTemplateId,
    };

    const { data, error } = await supabase
      .from('checklist_headers')
      .insert(newChecklist)
      .select()
      .single();

    if (error) {
      throw new Error(error.message);
    }

    return data;
  }

  async updateChecklistItem(item: ChecklistItem): Promise<ChecklistItem> {
    const { data, error } = await supabase
      .from('checklist_items')
      .update({
        text: item.text,
        status: item.status,
        notes: item.notes,
        due_date: item.due_date,
        order: item.order,
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
    notes?: string,
    dueDate?: string,
    order?: number
  ): Promise<ChecklistItem> {
    // If no order specified, get the next order number
    if (order === undefined) {
      const { data: existingItems } = await supabase
        .from('checklist_items')
        .select('order')
        .eq('checklist_id', checklistId)
        .order('order', { ascending: false })
        .limit(1);

      order = (existingItems?.[0]?.order || 0) + 1;
    }

    const newItem = {
      checklist_id: checklistId,
      text,
      notes,
      due_date: dueDate,
      order,
      status: 'pending' as const,
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
    tags?: string[]
  ): Promise<ChecklistHeader> {
    const updates: any = { updated_at: new Date().toISOString() };
    if (name !== undefined) updates.name = name;
    if (bucketId !== undefined) updates.bucket_id = bucketId;
    if (categoryId !== undefined) updates.category_id = categoryId;
    if (tags !== undefined) updates.tags = tags;

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