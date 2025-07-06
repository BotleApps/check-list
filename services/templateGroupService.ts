import { supabase } from '../lib/supabase';
import { TemplateGroup, ChecklistTemplateItem, GroupedTemplateItems } from '../types/database';
import { ApiUtils } from '../lib/apiUtils';

class TemplateGroupService {
  /**
   * Create a new template group
   */
  async createTemplateGroup(
    templateId: string,
    name: string,
    description?: string,
    colorCode: string = '#6B7280'
  ): Promise<TemplateGroup | null> {
    try {
      const response = await ApiUtils.executeWithRetry(async () => {
        // Get next order index
        const { data: existingGroups } = await supabase
          .from('template_groups')
          .select('order_index')
          .eq('template_id', templateId)
          .order('order_index', { ascending: false })
          .limit(1);

        const orderIndex = (existingGroups?.[0]?.order_index || 0) + 1;

        const { data, error } = await supabase
          .from('template_groups')
          .insert({
            template_id: templateId,
            name,
            description,
            color_code: colorCode,
            order_index: orderIndex,
          })
          .select()
          .single();

        if (error) {
          throw new Error(error.message);
        }

        return data;
      });

      if (!response.success) {
        console.error('Error creating template group:', response.error);
        return null;
      }

      return response.data;
    } catch (error) {
      console.error('Error creating template group:', error);
      return null;
    }
  }

  /**
   * Get all template groups for a template
   */
  async getTemplateGroups(templateId: string): Promise<TemplateGroup[]> {
    try {
      const response = await ApiUtils.executeWithRetry(async () => {
        const { data, error } = await supabase
          .from('template_groups')
          .select('*')
          .eq('template_id', templateId)
          .order('order_index', { ascending: true });

        if (error) {
          throw new Error(error.message);
        }

        return data || [];
      });

      if (!response.success) {
        console.error('Error fetching template groups:', response.error);
        return [];
      }

      return response.data || [];
    } catch (error) {
      console.error('Error fetching template groups:', error);
      return [];
    }
  }

  /**
   * Get grouped template items
   */
  async getGroupedTemplateItems(templateId: string): Promise<GroupedTemplateItems[]> {
    try {
      console.log('🔍 Service: Getting grouped template items for:', templateId);
      
      const [groups, items] = await Promise.all([
        this.getTemplateGroups(templateId),
        this.getTemplateItems(templateId)
      ]);

      console.log('📋 Service: Template groups:', groups);
      console.log('📝 Service: Template items:', items);

      // Group items by their group_id
      const itemsByGroup = new Map<string | null | undefined, ChecklistTemplateItem[]>();
      
      items.forEach(item => {
        const groupId = item.group_id || null; // Convert undefined to null for consistency
        if (!itemsByGroup.has(groupId)) {
          itemsByGroup.set(groupId, []);
        }
        itemsByGroup.get(groupId)!.push(item);
      });

      // Create grouped template items array
      const groupedItems: GroupedTemplateItems[] = [];

      // Add grouped items (items with group_id)
      groups.forEach(group => {
        const groupItems = itemsByGroup.get(group.group_id) || [];
        groupedItems.push({
          group,
          items: groupItems.sort((a, b) => a.order_index - b.order_index)
        });
      });

      // Add ungrouped items (items without group_id - check both null and undefined)
      const ungroupedItems = [
        ...(itemsByGroup.get(null) || []),
        ...(itemsByGroup.get(undefined) || [])
      ];
      if (ungroupedItems.length > 0) {
        groupedItems.push({
          group: null,
          items: ungroupedItems.sort((a, b) => a.order_index - b.order_index)
        });
      }

      console.log('🎯 Service: Final grouped items:', groupedItems.map(gi => ({
        groupName: gi.group?.name || 'Ungrouped',
        itemCount: gi.items.length,
        items: gi.items.map(item => ({ text: item.text, groupId: item.group_id }))
      })));

      return groupedItems;
    } catch (error) {
      console.error('Error getting grouped template items:', error);
      return [];
    }
  }

  /**
   * Get template items for a template
   */
  private async getTemplateItems(templateId: string): Promise<ChecklistTemplateItem[]> {
    try {
      const response = await ApiUtils.executeWithRetry(async () => {
        const { data, error } = await supabase
          .from('template_items')
          .select('*')
          .eq('template_id', templateId)
          .order('order_index', { ascending: true });

        if (error) {
          throw new Error(error.message);
        }

        return data || [];
      });

      if (!response.success) {
        console.error('Error fetching template items:', response.error);
        return [];
      }

      return response.data || [];
    } catch (error) {
      console.error('Error fetching template items:', error);
      return [];
    }
  }

  /**
   * Update template group
   */
  async updateTemplateGroup(
    groupId: string,
    updates: Partial<Pick<TemplateGroup, 'name' | 'description' | 'color_code' | 'order_index'>>
  ): Promise<TemplateGroup | null> {
    try {
      const response = await ApiUtils.executeWithRetry(async () => {
        const { data, error } = await supabase
          .from('template_groups')
          .update(updates)
          .eq('group_id', groupId)
          .select()
          .single();

        if (error) {
          throw new Error(error.message);
        }

        return data;
      });

      if (!response.success) {
        console.error('Error updating template group:', response.error);
        return null;
      }

      return response.data;
    } catch (error) {
      console.error('Error updating template group:', error);
      return null;
    }
  }

  /**
   * Delete template group
   */
  async deleteTemplateGroup(groupId: string): Promise<boolean> {
    try {
      const response = await ApiUtils.executeWithRetry(async () => {
        // First, ungroup any items in this group
        await supabase
          .from('template_items')
          .update({ group_id: null })
          .eq('group_id', groupId);

        // Then delete the group
        const { error } = await supabase
          .from('template_groups')
          .delete()
          .eq('group_id', groupId);

        if (error) {
          throw new Error(error.message);
        }

        return true;
      });

      if (!response.success) {
        console.error('Error deleting template group:', response.error);
        return false;
      }

      return response.data || false;
    } catch (error) {
      console.error('Error deleting template group:', error);
      return false;
    }
  }

  /**
   * Assign template item to group
   */
  async assignItemToGroup(itemId: string, groupId: string | null): Promise<boolean> {
    try {
      const response = await ApiUtils.executeWithRetry(async () => {
        const { error } = await supabase
          .from('template_items')
          .update({ group_id: groupId })
          .eq('item_id', itemId);

        if (error) {
          throw new Error(error.message);
        }

        return true;
      });

      if (!response.success) {
        console.error('Error assigning item to group:', response.error);
        return false;
      }

      return response.data || false;
    } catch (error) {
      console.error('Error assigning item to group:', error);
      return false;
    }
  }

  /**
   * Reorder template groups
   */
  async reorderTemplateGroups(templateId: string, groupIds: string[]): Promise<boolean> {
    try {
      const response = await ApiUtils.executeWithRetry(async () => {
        const updates = groupIds.map((groupId, index) => ({
          group_id: groupId,
          order_index: index + 1
        }));

        for (const update of updates) {
          const { error } = await supabase
            .from('template_groups')
            .update({ order_index: update.order_index })
            .eq('group_id', update.group_id);

          if (error) {
            throw new Error(error.message);
          }
        }

        return true;
      });

      if (!response.success) {
        console.error('Error reordering template groups:', response.error);
        return false;
      }

      return response.data || false;
    } catch (error) {
      console.error('Error reordering template groups:', error);
      return false;
    }
  }

  /**
   * Organize existing template items into logical groups
   * This is a utility method for organizing templates that were created before groups were available
   */
  async organizeTemplateIntoGroups(templateId: string): Promise<boolean> {
    try {
      // Get all template items
      const items = await this.getTemplateItems(templateId);
      
      if (items.length === 0) {
        return true; // No items to organize
      }

      // Define common group patterns for bike trip
      const groupDefinitions = [
        {
          name: 'Pre-Trip Preparation',
          color: '#3B82F6', // Blue
          keywords: ['check', 'insurance', 'plan', 'book', 'reserve', 'confirm', 'prepare']
        },
        {
          name: 'Packing',
          color: '#10B981', // Green
          keywords: ['bag', 'pack', 'clothes', 'gear', 'equipment', 'bring']
        },
        {
          name: 'Travel Documents',
          color: '#F59E0B', // Yellow
          keywords: ['document', 'id', 'passport', 'license', 'ticket', 'confirmation']
        },
        {
          name: 'Safety & Emergency',
          color: '#EF4444', // Red
          keywords: ['safety', 'emergency', 'contact', 'medical', 'first aid', 'insurance']
        }
      ];

      // Create groups and organize items
      const createdGroups = new Map<string, string>(); // groupName -> groupId
      
      for (const groupDef of groupDefinitions) {
        // Find items that match this group
        const matchingItems = items.filter(item => 
          groupDef.keywords.some(keyword => 
            item.text.toLowerCase().includes(keyword.toLowerCase()) ||
            (item.description && item.description.toLowerCase().includes(keyword.toLowerCase()))
          )
        );

        if (matchingItems.length > 0) {
          // Create the group
          const group = await this.createTemplateGroup(
            templateId,
            groupDef.name,
            `Auto-organized group for ${groupDef.name.toLowerCase()}`,
            groupDef.color
          );

          if (group) {
            createdGroups.set(groupDef.name, group.group_id);
            
            // Assign matching items to this group
            for (const item of matchingItems) {
              await this.assignItemToGroup(item.item_id, group.group_id);
            }
          }
        }
      }

      // Create a general group for remaining ungrouped items
      const assignedItems = new Set<string>();
      for (const groupDef of groupDefinitions) {
        const matchingItems = items.filter(item => 
          groupDef.keywords.some(keyword => 
            item.text.toLowerCase().includes(keyword.toLowerCase()) ||
            (item.description && item.description.toLowerCase().includes(keyword.toLowerCase()))
          )
        );
        matchingItems.forEach(item => assignedItems.add(item.item_id));
      }

      const unassignedItems = items.filter(item => !assignedItems.has(item.item_id));
      
      if (unassignedItems.length > 0) {
        const generalGroup = await this.createTemplateGroup(
          templateId,
          'General',
          'Items that don\'t fit into specific categories',
          '#6B7280' // Gray
        );

        if (generalGroup) {
          for (const item of unassignedItems) {
            await this.assignItemToGroup(item.item_id, generalGroup.group_id);
          }
        }
      }

      return true;
    } catch (error) {
      console.error('Error organizing template into groups:', error);
      return false;
    }
  }

  /**
   * Copy groups from any checklist to template (for fixing existing templates)
   */
  async copyGroupsFromAnyChecklist(templateId: string, sourceChecklistId: string): Promise<boolean> {
    try {
      // Get task groups from the source checklist
      const { data: taskGroups, error: groupsError } = await supabase
        .from('task_groups')
        .select('*')
        .eq('checklist_id', sourceChecklistId)
        .order('order_index', { ascending: true });

      if (groupsError) {
        console.error('Error fetching task groups:', groupsError);
        return false;
      }

      if (!taskGroups || taskGroups.length === 0) {
        console.log('No groups found in source checklist');
        return false;
      }

      // Get checklist items to understand the group mapping
      const { data: checklistItems, error: itemsError } = await supabase
        .from('checklist_items')
        .select('*')
        .eq('checklist_id', sourceChecklistId);

      if (itemsError) {
        console.error('Error fetching checklist items:', itemsError);
        return false;
      }

      // Get template items
      const { data: templateItems, error: templateItemsError } = await supabase
        .from('template_items')
        .select('*')
        .eq('template_id', templateId);

      if (templateItemsError) {
        console.error('Error fetching template items:', templateItemsError);
        return false;
      }

      // Create template groups based on task groups
      const groupIdMap = new Map<string, string>(); // old group_id -> new group_id

      for (const taskGroup of taskGroups) {
        const templateGroup = await this.createTemplateGroup(
          templateId,
          taskGroup.name,
          taskGroup.description,
          taskGroup.color_code
        );

        if (templateGroup) {
          groupIdMap.set(taskGroup.group_id, templateGroup.group_id);
        }
      }

      // Map template items to groups based on matching text with checklist items
      for (const templateItem of templateItems || []) {
        // Find matching checklist item by text
        const matchingChecklistItem = checklistItems?.find(ci => 
          ci.text.trim().toLowerCase() === templateItem.text.trim().toLowerCase()
        );

        if (matchingChecklistItem && matchingChecklistItem.group_id) {
          const newGroupId = groupIdMap.get(matchingChecklistItem.group_id);
          if (newGroupId) {
            await this.assignItemToGroup(templateItem.item_id, newGroupId);
          }
        }
      }

      return true;
    } catch (error) {
      console.error('Error copying groups from checklist:', error);
      return false;
    }
  }

  /**
   * Copy groups from checklist to template
   */
  async copyGroupsFromChecklist(templateId: string, checklistId: string): Promise<Map<string, string>> {
    console.log('🔄 Starting copyGroupsFromChecklist...', { templateId, checklistId });
    const groupIdMap = new Map<string, string>(); // old group_id -> new group_id

    try {
      // Get task groups from the checklist
      console.log('📋 Fetching task groups from checklist...');
      const { data: taskGroups, error: groupsError } = await supabase
        .from('task_groups')
        .select('*')
        .eq('checklist_id', checklistId)
        .order('order_index', { ascending: true });

      if (groupsError) {
        console.error('❌ Error fetching task groups:', groupsError);
        return groupIdMap;
      }

      console.log('📊 Found task groups:', taskGroups?.length || 0, taskGroups);

      // Create corresponding template groups
      for (const taskGroup of taskGroups || []) {
        console.log('🏗️ Creating template group for:', taskGroup.name);
        const templateGroup = await this.createTemplateGroup(
          templateId,
          taskGroup.name,
          taskGroup.description,
          taskGroup.color_code
        );

        if (templateGroup) {
          groupIdMap.set(taskGroup.group_id, templateGroup.group_id);
          console.log('✅ Created template group mapping:', {
            oldId: taskGroup.group_id,
            newId: templateGroup.group_id,
            name: taskGroup.name
          });
        } else {
          console.error('❌ Failed to create template group for:', taskGroup.name);
        }
      }

      console.log('🎯 Final group ID mapping:', Array.from(groupIdMap.entries()));
      return groupIdMap;
    } catch (error) {
      console.error('❌ Error copying groups from checklist:', error);
      return groupIdMap;
    }
  }
}

export const templateGroupService = new TemplateGroupService();
