import { supabase } from '../lib/supabase';
import { TaskGroup, ChecklistItem, GroupedTasks } from '../types/database';
import { ApiUtils } from '../lib/apiUtils';

class TaskGroupService {
  /**
   * Create a new task group
   */
  async createTaskGroup(
    checklistId: string,
    name: string,
    description?: string,
    targetDate?: string,
    colorCode: string = '#6B7280'
  ): Promise<TaskGroup | null> {
    try {
      const response = await ApiUtils.executeWithRetry(async () => {
        // Get next order index
        const { data: existingGroups } = await supabase
          .from('task_groups')
          .select('order_index')
          .eq('checklist_id', checklistId)
          .order('order_index', { ascending: false })
          .limit(1);

        const orderIndex = (existingGroups?.[0]?.order_index || 0) + 1;

        const { data, error } = await supabase
          .from('task_groups')
          .insert({
            checklist_id: checklistId,
            name,
            description,
            target_date: targetDate,
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
        console.error('Error creating task group:', response.error);
        return null;
      }

      return response.data;
    } catch (error) {
      console.error('Error in createTaskGroup:', error);
      throw error;
    }
  }

  /**
   * Get all task groups for a checklist
   */
  async getChecklistGroups(checklistId: string): Promise<TaskGroup[]> {
    try {
      const response = await ApiUtils.executeWithRetry(async () => {
        const { data, error } = await supabase
          .from('task_groups')
          .select('*')
          .eq('checklist_id', checklistId)
          .order('order_index', { ascending: true });

        if (error) {
          throw new Error(error.message);
        }

        return data || [];
      }, { requireNetwork: false }); // Skip external network check for database operations

      if (!response.success) {
        console.error('Error fetching task groups:', response.error);
        return [];
      }

      return response.data || [];
    } catch (error) {
      console.error('Error in getChecklistGroups:', error);
      return [];
    }
  }

  /**
   * Update a task group
   */
  async updateTaskGroup(
    groupId: string,
    updates: Partial<Omit<TaskGroup, 'group_id' | 'checklist_id' | 'created_at' | 'updated_at'>>
  ): Promise<TaskGroup | null> {
    try {
      const response = await ApiUtils.executeWithRetry(async () => {
        const { data, error } = await supabase
          .from('task_groups')
          .update({
            ...updates,
            updated_at: new Date().toISOString(),
          })
          .eq('group_id', groupId)
          .select()
          .single();

        if (error) {
          throw new Error(error.message);
        }

        return data;
      });

      if (!response.success) {
        console.error('Error updating task group:', response.error);
        return null;
      }

      return response.data;
    } catch (error) {
      console.error('Error in updateTaskGroup:', error);
      throw error;
    }
  }

  /**
   * Delete a task group (tasks will be moved to ungrouped)
   */
  async deleteTaskGroup(groupId: string): Promise<boolean> {
    try {
      const response = await ApiUtils.executeWithRetry(async () => {
        const { error } = await supabase
          .from('task_groups')
          .delete()
          .eq('group_id', groupId);

        if (error) {
          throw new Error(error.message);
        }

        return true;
      });

      if (!response.success) {
        console.error('Error deleting task group:', response.error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Error in deleteTaskGroup:', error);
      throw error;
    }
  }

  /**
   * Move a task to a group (or remove from group if groupId is null)
   */
  async moveTaskToGroup(taskId: string, groupId?: string): Promise<boolean> {
    try {
      const response = await ApiUtils.executeWithRetry(async () => {
        const { error } = await supabase
          .from('checklist_items')
          .update({ 
            group_id: groupId || null,
            updated_at: new Date().toISOString()
          })
          .eq('item_id', taskId);

        if (error) {
          throw new Error(error.message);
        }

        return true;
      });

      if (!response.success) {
        console.error('Error moving task to group:', response.error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Error in moveTaskToGroup:', error);
      throw error;
    }
  }

  /**
   * Reorder task groups
   */
  async reorderTaskGroups(groupUpdates: { group_id: string; order_index: number }[]): Promise<boolean> {
    try {
      const response = await ApiUtils.executeWithRetry(async () => {
        const promises = groupUpdates.map(update =>
          supabase
            .from('task_groups')
            .update({ 
              order_index: update.order_index,
              updated_at: new Date().toISOString()
            })
            .eq('group_id', update.group_id)
        );

        const results = await Promise.all(promises);
        
        // Check if any operation failed
        for (const result of results) {
          if (result.error) {
            throw new Error(result.error.message);
          }
        }

        return true;
      });

      if (!response.success) {
        console.error('Error reordering task groups:', response.error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Error in reorderTaskGroups:', error);
      throw error;
    }
  }

  /**
   * Get tasks grouped by their groups for a checklist
   */
  async getGroupedTasks(checklistId: string): Promise<GroupedTasks[]> {
    try {
      const response = await ApiUtils.executeWithRetry(async () => {
        // Get all groups for this checklist
        const { data: groups, error: groupsError } = await supabase
          .from('task_groups')
          .select('*')
          .eq('checklist_id', checklistId)
          .order('order_index', { ascending: true });

        if (groupsError) {
          throw new Error(groupsError.message);
        }

        // Get all tasks for this checklist
        const { data: tasks, error: tasksError } = await supabase
          .from('checklist_items')
          .select('*')
          .eq('checklist_id', checklistId)
          .order('order_index', { ascending: true });

        if (tasksError) {
          throw new Error(tasksError.message);
        }

        return { groups: groups || [], tasks: tasks || [] };
      });

      if (!response.success) {
        console.error('Error fetching grouped tasks:', response.error);
        return [];
      }

      const { groups, tasks } = response.data!;
      const result: GroupedTasks[] = [];

      // Group tasks with their groups
      for (const group of groups) {
        const groupTasks = tasks.filter(task => task.group_id === group.group_id);
        const completedCount = groupTasks.filter(task => task.is_completed).length;
        
        result.push({
          group,
          tasks: groupTasks,
          completedCount,
          totalCount: groupTasks.length,
          progressPercentage: groupTasks.length > 0 ? Math.round((completedCount / groupTasks.length) * 100) : 0
        });
      }

      // Add ungrouped tasks
      const ungroupedTasks = tasks.filter(task => !task.group_id);
      if (ungroupedTasks.length > 0) {
        const completedCount = ungroupedTasks.filter(task => task.is_completed).length;
        
        result.push({
          group: null,
          tasks: ungroupedTasks,
          completedCount,
          totalCount: ungroupedTasks.length,
          progressPercentage: ungroupedTasks.length > 0 ? Math.round((completedCount / ungroupedTasks.length) * 100) : 0
        });
      }

      return result;
    } catch (error) {
      console.error('Error in getGroupedTasks:', error);
      return [];
    }
  }

  /**
   * Toggle group collapsed state
   */
  async toggleGroupCollapsed(groupId: string, isCollapsed: boolean): Promise<boolean> {
    try {
      const response = await ApiUtils.executeWithRetry(async () => {
        const { error } = await supabase
          .from('task_groups')
          .update({ 
            is_collapsed: isCollapsed,
            updated_at: new Date().toISOString()
          })
          .eq('group_id', groupId);

        if (error) {
          throw new Error(error.message);
        }

        return true;
      });

      if (!response.success) {
        console.error('Error toggling group collapsed state:', response.error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Error in toggleGroupCollapsed:', error);
      throw error;
    }
  }

  /**
   * Get task group statistics
   */
  async getGroupStatistics(groupId: string): Promise<{
    totalTasks: number;
    completedTasks: number;
    progressPercentage: number;
    overdueTasks: number;
  } | null> {
    try {
      const response = await ApiUtils.executeWithRetry(async () => {
        const { data: tasks, error } = await supabase
          .from('checklist_items')
          .select('is_completed')
          .eq('group_id', groupId);

        if (error) {
          throw new Error(error.message);
        }

        return tasks || [];
      });

      if (!response.success) {
        console.error('Error fetching group statistics:', response.error);
        return null;
      }

      const tasks = response.data!;
      const totalTasks = tasks.length;
      const completedTasks = tasks.filter(task => task.is_completed).length;
      const progressPercentage = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

      return {
        totalTasks,
        completedTasks,
        progressPercentage,
        overdueTasks: 0, // TODO: Calculate based on due dates if needed
      };
    } catch (error) {
      console.error('Error in getGroupStatistics:', error);
      return null;
    }
  }
}

export const taskGroupService = new TaskGroupService();
