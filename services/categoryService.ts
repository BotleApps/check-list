import { CategoryMaster } from '../types/database';

class CategoryService {
  private mockCategories: CategoryMaster[] = [
    {
      category_id: '1',
      name: 'Personal',
      user_id: '1',
      created_at: new Date().toISOString(),
    },
    {
      category_id: '2',
      name: 'Work',
      user_id: '1',
      created_at: new Date().toISOString(),
    },
    {
      category_id: '3',
      name: 'Home',
      user_id: '1',
      created_at: new Date().toISOString(),
    },
    {
      category_id: '4',
      name: 'Travel',
      user_id: '1',
      created_at: new Date().toISOString(),
    },
  ];

  async getUserCategories(userId: string): Promise<CategoryMaster[]> {
    await new Promise(resolve => setTimeout(resolve, 300));
    return this.mockCategories.filter(c => c.user_id === userId);
  }

  async createCategory(name: string, userId: string): Promise<CategoryMaster> {
    await new Promise(resolve => setTimeout(resolve, 300));
    
    const newCategory: CategoryMaster = {
      category_id: Math.random().toString(36).substr(2, 9),
      name,
      user_id: userId,
      created_at: new Date().toISOString(),
    };

    this.mockCategories.push(newCategory);
    return newCategory;
  }
}

export const categoryService = new CategoryService();