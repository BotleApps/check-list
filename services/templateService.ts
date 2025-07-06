import { ChecklistTemplateHeader, ChecklistTemplateItem } from '../types/database';
import { supabase } from '../lib/supabase';
import { templateGroupService } from './templateGroupService';
import { taskGroupService } from './taskGroupService';

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

  async deleteTemplate(templateId: string, userId?: string): Promise<void> {
    // If userId is provided, verify ownership
    if (userId) {
      const { data: template, error: fetchError } = await supabase
        .from('templates')
        .select('created_by')
        .eq('template_id', templateId)
        .single();

      if (fetchError) {
        throw new Error('Template not found');
      }

      if (template.created_by !== userId) {
        throw new Error('You can only delete your own templates');
      }
    }

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

  async createTemplateFromChecklist(
    checklistId: string,
    userId: string,
    templateName: string,
    templateDescription?: string,
    categoryId?: string,
    isPublic: boolean = false
  ): Promise<ChecklistTemplateHeader> {
    try {
      // First, get the checklist header
      const { data: checklist, error: checklistError } = await supabase
        .from('checklist_headers')
        .select('*')
        .eq('checklist_id', checklistId)
        .single();

      if (checklistError) {
        throw new Error(`Failed to fetch checklist: ${checklistError.message}`);
      }

      // Verify ownership
      if (checklist.user_id !== userId) {
        throw new Error('You can only create templates from your own checklists');
      }

      // Create the template header
      const templateData = {
        created_by: userId,
        name: templateName,
        description: templateDescription,
        category_id: categoryId,
        is_public: isPublic,
        is_active: true,
      };

      const { data: newTemplate, error: templateError } = await supabase
        .from('templates')
        .insert(templateData)
        .select()
        .single();

      if (templateError) {
        throw new Error(`Failed to create template: ${templateError.message}`);
      }

      // Copy groups from checklist to template
      console.log('🔄 Copying groups from checklist to template...', {
        templateId: newTemplate.template_id,
        checklistId
      });
      
      const groupIdMap = await templateGroupService.copyGroupsFromChecklist(
        newTemplate.template_id,
        checklistId
      );
      
      console.log('✅ Group copying complete. Group ID mapping:', groupIdMap);
      console.log('📊 Number of groups copied:', groupIdMap.size);

      // Get the checklist items
      const { data: checklistItems, error: itemsError } = await supabase
        .from('checklist_items')
        .select('*')
        .eq('checklist_id', checklistId)
        .order('order_index', { ascending: true });

      if (itemsError) {
        // Cleanup: delete the template if items failed
        await supabase
          .from('templates')
          .delete()
          .eq('template_id', newTemplate.template_id);
        
        throw new Error(`Failed to fetch checklist items: ${itemsError.message}`);
      }

      // Create template items from checklist items
      if (checklistItems && checklistItems.length > 0) {
        console.log('📝 Creating template items from checklist items...', {
          itemCount: checklistItems.length,
          checklistItems: checklistItems.map(item => ({
            id: item.item_id,
            text: item.text,
            groupId: item.group_id
          }))
        });
        
        const templateItems = checklistItems.map((item) => ({
          template_id: newTemplate.template_id,
          group_id: item.group_id ? groupIdMap.get(item.group_id) || null : null,
          text: item.text,
          description: item.description,
          order_index: item.order_index,
          is_required: true, // Default to required for template items
          tags: [], // Could be enhanced to copy tags from checklist items if they exist
        }));

        console.log('✨ Template items to insert:', templateItems.map(item => ({
          text: item.text,
          originalGroupId: checklistItems.find(ci => ci.text === item.text)?.group_id,
          mappedGroupId: item.group_id
        })));

        const { error: templateItemsError } = await supabase
          .from('template_items')
          .insert(templateItems);

        if (templateItemsError) {
          console.error('❌ Failed to create template items:', templateItemsError);
          // Cleanup: delete the template if items failed
          await supabase
            .from('templates')
            .delete()
            .eq('template_id', newTemplate.template_id);
          
          throw new Error(`Failed to create template items: ${templateItemsError.message}`);
        }
        
        console.log('✅ Template items created successfully');
      }

      return newTemplate;
    } catch (error) {
      console.error('Error creating template from checklist:', error);
      throw error;
    }
  }

  async createChecklistFromTemplate(
    templateId: string,
    userId: string,
    bucketId?: string,
    tags?: string[]
  ): Promise<{ checklist_id: string; name: string }> {
    try {
      // Get the template with all its items
      const { template, items } = await this.getTemplateWithItems(templateId);

      // Create the checklist header
      const checklistData = {
        user_id: userId,
        name: `${template.name} (from template)`,
        bucket_id: bucketId || null,
        tags: tags || [],
        due_date: null, // User can set this later if needed
        status: 'active',
      };

      const { data: newChecklist, error: checklistError } = await supabase
        .from('checklist_headers')
        .insert(checklistData)
        .select()
        .single();

      if (checklistError) {
        throw new Error(checklistError.message);
      }

      // Get template groups and create corresponding task groups
      const templateGroups = await templateGroupService.getTemplateGroups(templateId);
      const groupIdMap = new Map<string, string>(); // template group_id -> task group_id

      for (const templateGroup of templateGroups) {
        const taskGroup = await taskGroupService.createTaskGroup(
          newChecklist.checklist_id,
          templateGroup.name,
          templateGroup.description,
          undefined, // target_date - user can set this later
          templateGroup.color_code
        );

        if (taskGroup) {
          groupIdMap.set(templateGroup.group_id, taskGroup.group_id);
        }
      }

      // Create the checklist items from template items
      if (items && items.length > 0) {
        const checklistItems = items.map((item, index) => ({
          checklist_id: newChecklist.checklist_id,
          group_id: item.group_id ? groupIdMap.get(item.group_id) || null : null,
          text: item.text,
          description: item.description,
          is_completed: false,
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
    } catch (error) {
      console.error('Error creating checklist from template:', error);
      throw error;
    }
  }
}

export const templateService = new TemplateService();