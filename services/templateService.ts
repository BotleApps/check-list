import { ChecklistTemplateHeader, ChecklistTemplateItem } from '../types/database';
import { supabase } from '../lib/supabase';

class TemplateService {
  async getUserTemplates(userId: string): Promise<ChecklistTemplateHeader[]> {
    const { data, error } = await supabase
      .from('checklist_templates')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      throw new Error(error.message);
    }

    return data || [];
  }

  async getTemplateWithItems(templateId: string): Promise<{
    template: ChecklistTemplateHeader;
    items: ChecklistTemplateItem[];
  }> {
    // Get the template
    const { data: template, error: templateError } = await supabase
      .from('checklist_templates')
      .select('*')
      .eq('template_id', templateId)
      .single();

    if (templateError) {
      throw new Error(templateError.message);
    }

    // Get the template items
    const { data: items, error: itemsError } = await supabase
      .from('checklist_template_items')
      .select('*')
      .eq('template_id', templateId)
      .order('order', { ascending: true });

    if (itemsError) {
      throw new Error(itemsError.message);
    }

    return {
      template,
      items: items || [],
    };
  }

  async createTemplate(
    userId: string,
    name: string,
    categoryId?: string,
    tags?: string[]
  ): Promise<ChecklistTemplateHeader> {
    const newTemplate = {
      user_id: userId,
      name,
      category_id: categoryId,
      tags,
    };

    const { data, error } = await supabase
      .from('checklist_templates')
      .insert(newTemplate)
      .select()
      .single();

    if (error) {
      throw new Error(error.message);
    }

    return data;
  }

  async updateTemplate(
    templateId: string,
    name: string,
    categoryId?: string,
    tags?: string[]
  ): Promise<ChecklistTemplateHeader> {
    const updates = {
      name,
      category_id: categoryId,
      tags,
      updated_at: new Date().toISOString(),
    };

    const { data, error } = await supabase
      .from('checklist_templates')
      .update(updates)
      .eq('template_id', templateId)
      .select()
      .single();

    if (error) {
      throw new Error(error.message);
    }

    return data;
  }

  async deleteTemplate(templateId: string): Promise<void> {
    // Delete template items first (if not handled by cascade)
    await supabase
      .from('checklist_template_items')
      .delete()
      .eq('template_id', templateId);

    // Delete the template
    const { error } = await supabase
      .from('checklist_templates')
      .delete()
      .eq('template_id', templateId);

    if (error) {
      throw new Error(error.message);
    }
  }

  async addTemplateItem(
    templateId: string,
    text: string,
    notes?: string,
    dueDays?: number,
    order?: number
  ): Promise<ChecklistTemplateItem> {
    // If no order specified, get the next order number
    if (order === undefined) {
      const { data: existingItems } = await supabase
        .from('checklist_template_items')
        .select('order')
        .eq('template_id', templateId)
        .order('order', { ascending: false })
        .limit(1);

      order = (existingItems?.[0]?.order || 0) + 1;
    }

    const newItem = {
      template_id: templateId,
      text,
      notes,
      due_days: dueDays,
      order,
      status: 'pending' as const,
    };

    const { data, error } = await supabase
      .from('checklist_template_items')
      .insert(newItem)
      .select()
      .single();

    if (error) {
      throw new Error(error.message);
    }

    return data;
  }

  async updateTemplateItem(
    itemId: string,
    text?: string,
    notes?: string,
    dueDays?: number,
    order?: number
  ): Promise<ChecklistTemplateItem> {
    const updates: any = {};
    if (text !== undefined) updates.text = text;
    if (notes !== undefined) updates.notes = notes;
    if (dueDays !== undefined) updates.due_days = dueDays;
    if (order !== undefined) updates.order = order;

    const { data, error } = await supabase
      .from('checklist_template_items')
      .update(updates)
      .eq('item_id', itemId)
      .select()
      .single();

    if (error) {
      throw new Error(error.message);
    }

    return data;
  }

  async deleteTemplateItem(itemId: string): Promise<void> {
    const { error } = await supabase
      .from('checklist_template_items')
      .delete()
      .eq('item_id', itemId);

    if (error) {
      throw new Error(error.message);
    }
  }
}

export const templateService = new TemplateService();