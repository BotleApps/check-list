import { aiService, AIChecklistRequest, AIGeneratedChecklist, ProgressCallback } from './aiService';
import { checklistService } from './checklistService';
import { taskGroupService } from './taskGroupService';
import { tagService } from './tagService';
import { bucketService } from './bucketService';
import { supabase } from '../lib/supabase';

interface CreateAIChecklistParams {
  request: AIChecklistRequest;
  userId: string;
  bucketId?: string;
  checklistName?: string;
  dueDate?: string;
  tagIds?: string[];
  onProgress?: ProgressCallback;
}

interface CreatedChecklistResult {
  checklistId: string;
  name: string;
  groupsCreated: number;
  itemsCreated: number;
}

class AIChecklistService {
  /**
   * Generate and create a checklist using AI (optimized version)
   */
  async generateAndCreateChecklist(params: CreateAIChecklistParams): Promise<CreatedChecklistResult> {
    const { request, userId, bucketId, checklistName, dueDate: providedDueDate, tagIds, onProgress } = params;

    try {
      // Step 1: Generate checklist using AI
      const aiChecklist = await aiService.generateChecklist(request, onProgress);
      
      // Step 2: Prepare groups data for batch creation
      onProgress?.({
        step: 'organizing',
        message: 'Organizing groups and items for database...',
        progress: 75
      });

      // Use provided tags or ensure AI-suggested tags exist
      let tagNames: string[] = [];
      if (tagIds && tagIds.length > 0) {
        // Get tag names from provided IDs
        const { data: tags } = await supabase
          .from('tag_master')
          .select('name')
          .in('tag_id', tagIds);
        tagNames = tags?.map(tag => tag.name) || [];
      } else {
        // Use AI-suggested tags
        tagNames = await this.ensureTagsExist(aiChecklist.metadata.tags, userId);
      }
      
      // Use provided due date or calculate from AI estimation
      let finalDueDate: string | undefined = providedDueDate;
      if (!finalDueDate && aiChecklist.estimatedDuration) {
        const calculatedDate = this.calculateDueDate(aiChecklist.estimatedDuration);
        finalDueDate = calculatedDate ? calculatedDate.toISOString() : undefined;
      }

      // Prepare groups with items for batch creation
      const groupsWithItems = aiChecklist.groups.map(group => ({
        name: group.name,
        description: group.description,
        color: group.color,
        order: group.order,
        items: group.items.map(item => ({
          text: item.text,
          description: item.description,
          order: item.order
        }))
      }));

      // Step 3: Create everything in optimized batches
      onProgress?.({
        step: 'finalizing',
        message: 'Creating checklist in database...',
        progress: 90
      });

      const result = await checklistService.createChecklistWithGroupsAndItems(
        userId,
        checklistName || aiChecklist.title,
        groupsWithItems,
        bucketId,
        undefined, // categoryId
        tagNames,
        undefined, // fromTemplateId
        finalDueDate
      );
      
      onProgress?.({
        step: 'complete',
        message: 'Checklist created successfully!',
        progress: 100
      });

      return {
        checklistId: result.checklist.checklist_id,
        name: result.checklist.name,
        groupsCreated: result.groupsCreated,
        itemsCreated: result.itemsCreated,
      };
    } catch (error) {
      console.error('AI Checklist Creation Error:', error);
      throw new Error('Failed to create AI-generated checklist');
    }
  }

  /**
   * Generate checklist preview without creating it
   */
  async generateChecklistPreview(
    request: AIChecklistRequest, 
    onProgress?: ProgressCallback
  ): Promise<AIGeneratedChecklist> {
    return await aiService.generateChecklist(request, onProgress);
  }

  /**
   * Create the main checklist header
   */
  private async createChecklistHeader(aiChecklist: AIGeneratedChecklist, userId: string, bucketId?: string) {
    // Ensure we have tags created
    const tagNames = await this.ensureTagsExist(aiChecklist.metadata.tags, userId);
    
    // Calculate due date if estimated duration is provided
    let dueDate: string | undefined;
    if (aiChecklist.estimatedDuration) {
      const calculatedDate = this.calculateDueDate(aiChecklist.estimatedDuration);
      dueDate = calculatedDate ? calculatedDate.toISOString() : undefined;
    }

    return await checklistService.createChecklist(
      userId,
      aiChecklist.title,
      bucketId,
      undefined, // categoryId
      tagNames,
      undefined, // fromTemplateId
      dueDate
    );
  }

  /**
   * Create task groups from AI-generated groups
   */
  private async createTaskGroups(
    aiGroups: AIGeneratedChecklist['groups'], 
    checklistId: string, 
    userId: string
  ): Promise<Record<string, string>> {
    const groupMapping: Record<string, string> = {};

    // Sort groups by order
    const sortedGroups = [...aiGroups].sort((a, b) => a.order - b.order);

    for (const aiGroup of sortedGroups) {
      try {
        const taskGroup = await taskGroupService.createTaskGroup(
          checklistId,
          aiGroup.name,
          aiGroup.description,
          undefined, // target_date - can be set later by user
          aiGroup.color
        );

        if (taskGroup) {
          // Use AI group order as the key for mapping
          groupMapping[aiGroup.order.toString()] = taskGroup.group_id;
        }
      } catch (error) {
        console.error(`Failed to create task group: ${aiGroup.name}`, error);
        // Continue with other groups even if one fails
      }
    }

    return groupMapping;
  }

  /**
   * Create checklist items from AI-generated items
   */
  private async createChecklistItems(
    aiGroups: AIGeneratedChecklist['groups'], 
    checklistId: string, 
    groupMapping: Record<string, string>
  ): Promise<number> {
    let totalItemsCreated = 0;

    for (const aiGroup of aiGroups) {
      const groupId = groupMapping[aiGroup.order.toString()];
      
      // Sort items by order within each group
      const sortedItems = [...aiGroup.items].sort((a, b) => a.order - b.order);

      for (const aiItem of sortedItems) {
        try {
          await checklistService.addChecklistItem(
            checklistId,
            aiItem.text,
            aiItem.description,
            aiItem.order,
            groupId // Pass the group ID to properly assign items to groups
          );
          totalItemsCreated++;
        } catch (error) {
          console.error(`Failed to create checklist item: ${aiItem.text}`, error);
          // Continue with other items even if one fails
        }
      }
    }

    return totalItemsCreated;
  }

  /**
   * Ensure tags exist, create them if they don't
   */
  private async ensureTagsExist(tagNames: string[], userId: string): Promise<string[]> {
    if (!tagNames || tagNames.length === 0) return [];

    const resultTagNames: string[] = [];

    for (const tagName of tagNames) {
      try {
        // Try to find existing tag
        const allTags = await tagService.getAllTags();
        const existingTag = allTags.find((tag: any) => 
          tag.name.toLowerCase() === tagName.toLowerCase()
        );

        if (existingTag) {
          resultTagNames.push(existingTag.name);
        } else {
          // Create new tag
          const newTag = await tagService.createTag(tagName);
          if (newTag) {
            resultTagNames.push(newTag.name);
          }
        }
      } catch (error) {
        console.error(`Failed to ensure tag exists: ${tagName}`, error);
        // Continue with other tags
      }
    }

    return resultTagNames;
  }

  /**
   * Calculate due date based on estimated duration
   */
  private calculateDueDate(estimatedDuration: string): Date | undefined {
    try {
      const now = new Date();
      const duration = estimatedDuration.toLowerCase();

      // Parse common duration formats
      if (duration.includes('hour')) {
        const hours = this.extractNumber(duration);
        if (hours) {
          return new Date(now.getTime() + hours * 60 * 60 * 1000);
        }
      } else if (duration.includes('day')) {
        const days = this.extractNumber(duration);
        if (days) {
          return new Date(now.getTime() + days * 24 * 60 * 60 * 1000);
        }
      } else if (duration.includes('week')) {
        const weeks = this.extractNumber(duration);
        if (weeks) {
          return new Date(now.getTime() + weeks * 7 * 24 * 60 * 60 * 1000);
        }
      } else if (duration.includes('month')) {
        const months = this.extractNumber(duration);
        if (months) {
          const futureDate = new Date(now);
          futureDate.setMonth(futureDate.getMonth() + months);
          return futureDate;
        }
      }

      // Default to 1 week if we can't parse
      return new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    } catch (error) {
      console.error('Failed to calculate due date:', error);
      return undefined;
    }
  }

  /**
   * Extract number from duration string
   */
  private extractNumber(text: string): number | null {
    const match = text.match(/(\d+)/);
    return match ? parseInt(match[1], 10) : null;
  }

  /**
   * Test AI connection
   */
  async testAIConnection(): Promise<boolean> {
    return await aiService.testConnection();
  }
}

export const aiChecklistService = new AIChecklistService();
