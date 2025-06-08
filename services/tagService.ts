import { TagMaster } from '../types/database';

class TagService {
  private mockTags: TagMaster[] = [
    {
      tag_id: '1',
      name: 'grocery',
      created_at: new Date().toISOString(),
    },
    {
      tag_id: '2',
      name: 'work',
      created_at: new Date().toISOString(),
    },
    {
      tag_id: '3',
      name: 'personal',
      created_at: new Date().toISOString(),
    },
    {
      tag_id: '4',
      name: 'urgent',
      created_at: new Date().toISOString(),
    },
    {
      tag_id: '5',
      name: 'weekly',
      created_at: new Date().toISOString(),
    },
    {
      tag_id: '6',
      name: 'project',
      created_at: new Date().toISOString(),
    },
  ];

  async getAllTags(): Promise<TagMaster[]> {
    await new Promise(resolve => setTimeout(resolve, 300));
    return this.mockTags;
  }

  async createTag(name: string): Promise<TagMaster> {
    await new Promise(resolve => setTimeout(resolve, 300));
    
    const newTag: TagMaster = {
      tag_id: Math.random().toString(36).substr(2, 9),
      name: name.toLowerCase(),
      created_at: new Date().toISOString(),
    };

    this.mockTags.push(newTag);
    return newTag;
  }
}

export const tagService = new TagService();