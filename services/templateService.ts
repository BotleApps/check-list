import { ChecklistTemplateHeader, ChecklistTemplateItem } from '../types/database';
import { supabase } from '../lib/supabase';

class TemplateService {
  async getUserTemplates(userId: string): Promise<ChecklistTemplateHeader[]> {
    const { data, error } = await supabase
      .from('templates')
      .select('*')
      .eq('created_by', userId)
      .order('created_at', { ascending: false });

    if (error) {
      throw new Error(error.message);
    }

    return data || [];
  }

  async getPublicTemplates(): Promise<ChecklistTemplateHeader[]> {
    const { data, error } = await supabase
      .from('templates')
      .select(`
        *,
        category_master (
          category_id,
          name
        )
      `)
      .eq('is_public', true)
      .eq('is_active', true)
      .order('created_at', { ascending: false });

    if (error) {
      throw new Error(error.message);
    }

    return data || [];
  }

  async getPublicTemplatesWithPreview(): Promise<(ChecklistTemplateHeader & {
    preview_items: { text: string; is_required: boolean }[];
    item_count: number;
  })[]> {
    const { data: templates, error } = await supabase
      .from('templates')
      .select(`
        *,
        category_master (
          category_id,
          name
        )
      `)
      .eq('is_public', true)
      .eq('is_active', true)
      .order('created_at', { ascending: false });

    if (error) {
      throw new Error(error.message);
    }

    if (!templates || templates.length === 0) {
      return [];
    }

    // For each template, get the first 2 items and total count
    const templatesWithPreview = await Promise.all(
      templates.map(async (template) => {
        try {
          // Get first 2 items for preview
          const { data: previewItems } = await supabase
            .from('template_items')
            .select('text, is_required')
            .eq('template_id', template.template_id)
            .order('order_index', { ascending: true })
            .limit(2);

          // Get total item count
          const { count } = await supabase
            .from('template_items')
            .select('*', { count: 'exact', head: true })
            .eq('template_id', template.template_id);

          return {
            ...template,
            preview_items: previewItems || [],
            item_count: count || 0,
          };
        } catch (error) {
          console.error(`Error fetching items for template ${template.template_id}:`, error);
          // Return template with empty preview if items fail to load
          return {
            ...template,
            preview_items: [],
            item_count: 0,
          };
        }
      })
    );

    return templatesWithPreview;
  }

  async getTemplateWithItems(templateId: string): Promise<{
    template: ChecklistTemplateHeader;
    items: ChecklistTemplateItem[];
  }> {
    // Get the template
    const { data: template, error: templateError } = await supabase
      .from('templates')
      .select('*')
      .eq('template_id', templateId)
      .single();

    if (templateError) {
      throw new Error(templateError.message);
    }

    // Get the template items
    const { data: items, error: itemsError } = await supabase
      .from('template_items')
      .select('*')
      .eq('template_id', templateId)
      .order('order_index', { ascending: true });

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
    description?: string
  ): Promise<ChecklistTemplateHeader> {
    const newTemplate = {
      created_by: userId,
      name,
      category_id: categoryId,
      description,
      is_public: false,
      is_active: true
    };

    const { data, error } = await supabase
      .from('templates')
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
    description?: string
  ): Promise<ChecklistTemplateHeader> {
    const updates = {
      name,
      category_id: categoryId,
      description,
      updated_at: new Date().toISOString(),
    };

    const { data, error } = await supabase
      .from('templates')
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
    // Delete the template (template_items will be cascade deleted)
    const { error } = await supabase
      .from('templates')
      .delete()
      .eq('template_id', templateId);

    if (error) {
      throw new Error(error.message);
    }
  }

  async addTemplateItem(
    templateId: string,
    text: string,
    description?: string,
    isRequired?: boolean,
    order?: number
  ): Promise<ChecklistTemplateItem> {
    // If no order specified, get the next order number
    if (order === undefined) {
      const { data: existingItems } = await supabase
        .from('template_items')
        .select('order_index')
        .eq('template_id', templateId)
        .order('order_index', { ascending: false })
        .limit(1);

      order = (existingItems?.[0]?.order_index || 0) + 1;
    }

    const newItem = {
      template_id: templateId,
      text,
      description,
      order_index: order,
      is_required: isRequired || false,
    };

    const { data, error } = await supabase
      .from('template_items')
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
    description?: string,
    isRequired?: boolean,
    order?: number
  ): Promise<ChecklistTemplateItem> {
    const updates: any = {};
    if (text !== undefined) updates.text = text;
    if (description !== undefined) updates.description = description;
    if (isRequired !== undefined) updates.is_required = isRequired;
    if (order !== undefined) updates.order_index = order;

    const { data, error } = await supabase
      .from('template_items')
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
      .from('template_items')
      .delete()
      .eq('item_id', itemId);

    if (error) {
      throw new Error(error.message);
    }
  }

  async createChecklistFromTemplate(
    templateId: string,
    userId: string,
    bucketId?: string,
    tags?: string[]
  ): Promise<{ checklist_id: string; name: string }> {
    // Get the template with all its items
    const { template, items } = await this.getTemplateWithItems(templateId);

    // Create the checklist header
    const checklistData = {
      user_id: userId,
      name: `${template.name} (from template)`,
      bucket_id: bucketId || null,
      tags: tags || [],
      target_date: null, // User can set this later if needed
      is_completed: false,
    };

    const { data: newChecklist, error: checklistError } = await supabase
      .from('checklist_headers')
      .insert(checklistData)
      .select()
      .single();

    if (checklistError) {
      throw new Error(checklistError.message);
    }

    // Create the checklist items from template items
    if (items && items.length > 0) {
      const checklistItems = items.map((item, index) => ({
        checklist_id: newChecklist.checklist_id,
        text: item.text,
        description: item.description,
        is_completed: false,
        due_days: null, // Template items don't have due_days
        notes: null,
        order_index: item.order_index || index,
      }));

      const { error: itemsError } = await supabase
        .from('checklist_items')
        .insert(checklistItems);

      if (itemsError) {
        // Cleanup: delete the checklist header if items failed
        await supabase
          .from('checklist_headers')
          .delete()
          .eq('checklist_id', newChecklist.checklist_id);
        
        throw new Error(itemsError.message);
      }
    }

    return {
      checklist_id: newChecklist.checklist_id,
      name: newChecklist.name,
    };
  }
}

export const templateService = new TemplateService();