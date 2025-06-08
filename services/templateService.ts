import { ChecklistTemplateHeader, ChecklistTemplateItem } from '../types/database';

class TemplateService {
  private mockTemplates: ChecklistTemplateHeader[] = [
    {
      template_id: '1',
      user_id: '1',
      name: 'Weekly Grocery Template',
      category_id: '1',
      tags: ['grocery', 'weekly'],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    {
      template_id: '2',
      user_id: '1',
      name: 'Project Kickoff Template',
      category_id: '2',
      tags: ['work', 'project'],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    {
      template_id: '3',
      user_id: '1',
      name: 'Moving Checklist',
      category_id: '3',
      tags: ['home', 'moving'],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
  ];

  private mockTemplateItems: ChecklistTemplateItem[] = [
    {
      item_id: '1',
      template_id: '1',
      text: 'Buy milk and eggs',
      status: 'pending',
      due_days: 2,
      notes: 'Organic if available',
      order: 0,
    },
    {
      item_id: '2',
      template_id: '1',
      text: 'Get fresh vegetables',
      status: 'pending',
      due_days: 1,
      order: 1,
    },
    {
      item_id: '3',
      template_id: '1',
      text: 'Stock up on pantry items',
      status: 'pending',
      due_days: 7,
      order: 2,
    },
    {
      item_id: '4',
      template_id: '2',
      text: 'Set up project repository',
      status: 'pending',
      due_days: 1,
      order: 0,
    },
    {
      item_id: '5',
      template_id: '2',
      text: 'Create project documentation',
      status: 'pending',
      due_days: 3,
      order: 1,
    },
    {
      item_id: '6',
      template_id: '2',
      text: 'Schedule team kickoff meeting',
      status: 'pending',
      due_days: 2,
      order: 2,
    },
  ];

  async getUserTemplates(userId: string): Promise<ChecklistTemplateHeader[]> {
    await new Promise(resolve => setTimeout(resolve, 500));
    return this.mockTemplates.filter(t => t.user_id === userId);
  }

  async getTemplateWithItems(templateId: string): Promise<{ template: ChecklistTemplateHeader; items: ChecklistTemplateItem[] }> {
    await new Promise(resolve => setTimeout(resolve, 500));
    
    const template = this.mockTemplates.find(t => t.template_id === templateId);
    if (!template) {
      throw new Error('Template not found');
    }

    const items = this.mockTemplateItems
      .filter(i => i.template_id === templateId)
      .sort((a, b) => a.order - b.order);

    return { template, items };
  }

  async createTemplate(template: Omit<ChecklistTemplateHeader, 'template_id' | 'created_at' | 'updated_at'>): Promise<ChecklistTemplateHeader> {
    await new Promise(resolve => setTimeout(resolve, 500));
    
    const newTemplate: ChecklistTemplateHeader = {
      ...template,
      template_id: Math.random().toString(36).substr(2, 9),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    this.mockTemplates.push(newTemplate);
    return newTemplate;
  }
}

export const templateService = new TemplateService();