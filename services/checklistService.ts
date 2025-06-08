import { ChecklistHeader, ChecklistItem } from '../types/database';

class ChecklistService {
  private mockChecklists: ChecklistHeader[] = [
    {
      checklist_id: '1',
      user_id: '1',
      name: 'Weekly Grocery Shopping',
      target_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      bucket_id: '1',
      tags: ['grocery', 'weekly'],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    {
      checklist_id: '2',
      user_id: '1',
      name: 'Project Alpha Deliverables',
      target_date: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
      bucket_id: '2',
      tags: ['work', 'project'],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    {
      checklist_id: '3',
      user_id: '1',
      name: 'Home Renovation Checklist',
      target_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      bucket_id: '3',
      tags: ['home', 'renovation'],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
  ];

  private mockItems: ChecklistItem[] = [
    {
      item_id: '1',
      checklist_id: '1',
      text: 'Buy milk and eggs',
      due_date: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(),
      status: 'pending',
      due_days: 2,
      notes: 'Organic if available',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      order: 0,
    },
    {
      item_id: '2',
      checklist_id: '1',
      text: 'Get fresh vegetables',
      status: 'pending',
      due_days: 1,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      order: 1,
    },
    {
      item_id: '3',
      checklist_id: '1',
      text: 'Pick up dry cleaning',
      status: 'completed',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      order: 2,
    },
    {
      item_id: '4',
      checklist_id: '2',
      text: 'Complete technical documentation',
      due_date: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString(),
      status: 'pending',
      due_days: 5,
      notes: 'Include API specifications',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      order: 0,
    },
    {
      item_id: '5',
      checklist_id: '2',
      text: 'Review code with team',
      status: 'pending',
      due_days: 3,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      order: 1,
    },
    {
      item_id: '6',
      checklist_id: '3',
      text: 'Get contractor quotes',
      status: 'completed',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      order: 0,
    },
    {
      item_id: '7',
      checklist_id: '3',
      text: 'Select paint colors',
      status: 'pending',
      due_days: 7,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      order: 1,
    },
  ];

  async getUserChecklists(userId: string): Promise<ChecklistHeader[]> {
    await new Promise(resolve => setTimeout(resolve, 500));
    return this.mockChecklists.filter(c => c.user_id === userId);
  }

  async getChecklistWithItems(checklistId: string): Promise<{ checklist: ChecklistHeader; items: ChecklistItem[] }> {
    await new Promise(resolve => setTimeout(resolve, 500));
    
    const checklist = this.mockChecklists.find(c => c.checklist_id === checklistId);
    if (!checklist) {
      throw new Error('Checklist not found');
    }

    const items = this.mockItems
      .filter(i => i.checklist_id === checklistId)
      .sort((a, b) => a.order - b.order);

    return { checklist, items };
  }

  async createChecklist(checklist: Omit<ChecklistHeader, 'checklist_id' | 'created_at' | 'updated_at'>): Promise<ChecklistHeader> {
    await new Promise(resolve => setTimeout(resolve, 500));
    
    const newChecklist: ChecklistHeader = {
      ...checklist,
      checklist_id: Math.random().toString(36).substr(2, 9),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    this.mockChecklists.push(newChecklist);
    return newChecklist;
  }

  async updateChecklistItem(item: ChecklistItem): Promise<ChecklistItem> {
    await new Promise(resolve => setTimeout(resolve, 300));
    
    const index = this.mockItems.findIndex(i => i.item_id === item.item_id);
    if (index === -1) {
      throw new Error('Item not found');
    }

    const updatedItem = {
      ...item,
      updated_at: new Date().toISOString(),
    };

    this.mockItems[index] = updatedItem;
    return updatedItem;
  }

  async createChecklistItem(item: Omit<ChecklistItem, 'item_id' | 'created_at' | 'updated_at'>): Promise<ChecklistItem> {
    await new Promise(resolve => setTimeout(resolve, 300));
    
    const newItem: ChecklistItem = {
      ...item,
      item_id: Math.random().toString(36).substr(2, 9),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    this.mockItems.push(newItem);
    return newItem;
  }

  async deleteChecklistItem(itemId: string): Promise<void> {
    await new Promise(resolve => setTimeout(resolve, 300));
    
    const index = this.mockItems.findIndex(i => i.item_id === itemId);
    if (index === -1) {
      throw new Error('Item not found');
    }

    this.mockItems.splice(index, 1);
  }

  async reorderItems(checklistId: string, items: ChecklistItem[]): Promise<void> {
    await new Promise(resolve => setTimeout(resolve, 300));
    
    items.forEach((item, index) => {
      const existingIndex = this.mockItems.findIndex(i => i.item_id === item.item_id);
      if (existingIndex !== -1) {
        this.mockItems[existingIndex] = {
          ...item,
          order: index,
          updated_at: new Date().toISOString(),
        };
      }
    });
  }
}

export const checklistService = new ChecklistService();